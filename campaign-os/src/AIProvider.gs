// Shared transient-failure handling for every outbound API call.
// Previously each provider retried once on 429 with a fixed sleep, and treated
// 500/502/503 as permanent — so a momentary upstream blip failed the row and
// discarded whatever had already been paid for.
var RetryPolicy = {

  isRetryable: function(httpCode) {
    return CONFIG.RETRY.RETRYABLE_HTTP.indexOf(httpCode) !== -1;
  },

  // Exponential with jitter. Jitter matters when a carousel fires several calls
  // in sequence — without it, every retry lands in the same window.
  delayFor: function(attemptIndex) {
    var delays = CONFIG.RETRY.DELAYS_MS;
    var base = delays[Math.min(attemptIndex, delays.length - 1)];
    return base + Math.floor(Math.random() * 500);
  },

  // fetchFn must return an HTTPResponse (muteHttpExceptions enabled).
  // Returns the last response; the caller decides what a non-200 means.
  fetch: function(fetchFn, label) {
    var maxAttempts = CONFIG.RETRY.MAX_ATTEMPTS;
    var response = null;
    var lastError = null;

    for (var attempt = 0; attempt < maxAttempts; attempt++) {
      if (attempt > 0) {
        var wait = this.delayFor(attempt - 1);
        Logger.log(
          'RETRY | ' + label + ' | attempt ' + (attempt + 1) + '/' + maxAttempts +
          ' after ' + wait + 'ms'
        );
        Utilities.sleep(wait);
      }

      try {
        response = fetchFn();
        lastError = null;

        var code = response.getResponseCode();

        if (!this.isRetryable(code)) {
          return response;
        }

        Logger.log('RETRY_TRIGGERED | ' + label + ' | HTTP ' + code);

      } catch (e) {
        // Network-level failure: no response object at all.
        lastError = e;
        Logger.log('RETRY_TRIGGERED | ' + label + ' | ' + e.toString());
      }
    }

    if (lastError) {
      throw new Error(
        label + ' failed after ' + maxAttempts + ' attempts: ' + lastError.toString()
      );
    }

    return response;
  }
};


var AIProvider = {

  // Per-worker overrides take precedence over the global default, so a worker
  // whose task suits a different model can use one without moving the rest.
  // Configure in CONFIG.WORKERS[NAME].provider / .model — omit both to inherit.
  call: function(prompt, options) {
    options = options || {};

    var provider = options.provider || CONFIG.AI_PROVIDER;

    switch (provider) {
      case 'gemini':
        return GeminiProvider.call(prompt, options);
      case 'claude':
        return ClaudeProvider.call(prompt, options);
      default:
        throw new Error(
          'Unknown AI provider: "' + provider + '". Available: ' +
          this.getAvailableProviders().join(', ')
        );
    }
  },

  getProviderName: function() {
    return CONFIG.AI_PROVIDER;
  },

  getAvailableProviders: function() {
    return ['gemini', 'claude'];
  },

  // A provider is only usable once its key is present.
  isConfigured: function(provider) {
    var keyName = provider === 'claude' ? 'ANTHROPIC_API_KEY' : 'GEMINI_API_KEY';
    var key = PropertiesService.getScriptProperties().getProperty(keyName);
    return !!(key && String(key).trim());
  }
};


// Dormant until ANTHROPIC_API_KEY is set in Script Properties and a worker is
// pointed at it. Present so switching a worker is configuration, not a code
// change — and so a Gemini outage is not a total production stop.
var ClaudeProvider = {

  API_URL: 'https://api.anthropic.com/v1/messages',
  API_VERSION: '2023-06-01',

  call: function(prompt, options) {
    options = options || {};

    var apiKey = PropertiesService.getScriptProperties().getProperty('ANTHROPIC_API_KEY');

    if (!apiKey) {
      throw new Error(
        'ANTHROPIC_API_KEY not found in Script Properties. ' +
        'Add it, or set the worker back to the gemini provider.'
      );
    }

    var model = options.model || CONFIG.CLAUDE_MODEL;
    var maxTokens = options.maxOutputTokens || CONFIG.CLAUDE_MAX_OUTPUT_TOKENS;
    var content = [];

    // Images first, matching the Gemini path: vision workers rely on the
    // artwork preceding the instruction.
    var images = options.images || [];
    for (var i = 0; i < images.length; i++) {
      content.push({
        type: 'image',
        source: {
          type: 'base64',
          media_type: images[i].mimeType || 'image/jpeg',
          data: images[i].base64
        }
      });
    }

    content.push({ type: 'text', text: prompt });

    var payload = {
      model: model,
      max_tokens: maxTokens,
      messages: [{ role: 'user', content: content }]
    };

    if (options.temperature != null) {
      payload.temperature = options.temperature;
    }

    var requestOptions = {
      method: 'post',
      contentType: 'application/json',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': this.API_VERSION
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };

    var response = RetryPolicy.fetch(function() {
      return UrlFetchApp.fetch(ClaudeProvider.API_URL, requestOptions);
    }, 'Claude ' + model);

    var code = response.getResponseCode();
    var body = response.getContentText();

    if (code !== 200) {
      throw new Error('Claude API error (HTTP ' + code + '): ' +
        this._extractErrorMessage(body));
    }

    return this._parseResponse(body);
  },

  _parseResponse: function(body) {
    var parsed = JSON.parse(body);

    if (!parsed.content || !parsed.content.length) {
      throw new Error('Claude returned no content');
    }

    var text = parsed.content
      .filter(function(b) { return b.type === 'text'; })
      .map(function(b) { return b.text; })
      .join('');

    if (!text) {
      throw new Error('Claude returned no text content');
    }

    var usage = parsed.usage || {};

    return {
      text: text,
      finishReason: parsed.stop_reason || '',
      inputTokens: usage.input_tokens || 0,
      outputTokens: usage.output_tokens || 0
    };
  },

  _extractErrorMessage: function(body) {
    try {
      var parsed = JSON.parse(body);
      if (parsed.error && parsed.error.message) {
        return parsed.error.message;
      }
    } catch (e) {
    }
    return String(body).substring(0, 500);
  }
};


var GeminiProvider = {

  API_BASE: 'https://generativelanguage.googleapis.com/v1beta/models/',

  call: function(prompt, options) {
    options = options || {};

    var model = options.model || CONFIG.GEMINI_MODEL;
    var temperature = options.temperature != null
      ? options.temperature
      : CONFIG.GEMINI_TEMPERATURE;
    var maxOutputTokens = options.maxOutputTokens || CONFIG.GEMINI_MAX_OUTPUT_TOKENS;
    var apiKey = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');

    if (!apiKey) {
      throw new Error(
        'GEMINI_API_KEY not found in Script Properties. ' +
        'Set it via: PropertiesService.getScriptProperties().setProperty("GEMINI_API_KEY", "your-key-here")'
      );
    }

    var url = this.API_BASE + model + ':generateContent?key=' + apiKey;

    // Multimodal input: images precede the instruction so the model grounds its
    // answer in what it can see rather than in the surrounding text.
    var parts = [];
    var images = options.images || [];

    for (var i = 0; i < images.length; i++) {
      if (images[i] && images[i].base64) {
        parts.push({
          inlineData: {
            mimeType: images[i].mimeType || 'image/png',
            data: images[i].base64
          }
        });
      }
    }

    parts.push({ text: prompt });

    var payload = {
      contents: [
        {
          parts: parts
        }
      ],
      generationConfig: {
        temperature: temperature,
        maxOutputTokens: maxOutputTokens,
        topP: 1,
        topK: 1
      },
      safetySettings: [
        { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' }
      ]
    };

    var requestOptions = {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };

    var response = RetryPolicy.fetch(function() {
      return UrlFetchApp.fetch(url, requestOptions);
    }, 'Gemini ' + model);

    var responseCode = response.getResponseCode();
    var responseBody = response.getContentText();

    if (responseCode !== 200) {
      throw new Error(
        'Gemini API error (HTTP ' + responseCode + '): ' +
        this._extractErrorMessage(responseBody)
      );
    }

    return this._parseResponse(responseBody);
  },

  _parseResponse: function(responseBody) {
    var parsed = JSON.parse(responseBody);

    if (!parsed.candidates || !parsed.candidates.length) {
      if (parsed.promptFeedback) {
        throw new Error(
          'Gemini blocked response: ' +
          JSON.stringify(parsed.promptFeedback)
        );
      }
      throw new Error('Gemini returned no candidates');
    }

    var candidate = parsed.candidates[0];

    if (candidate.finishReason === 'SAFETY') {
      throw new Error('Gemini response blocked by safety filter');
    }

    if (!candidate.content || !candidate.content.parts) {
      throw new Error('Gemini candidate has no content parts');
    }

    var text = '';
    for (var i = 0; i < candidate.content.parts.length; i++) {
      text += candidate.content.parts[i].text || '';
    }

    if (!text.trim()) {
      throw new Error('Gemini returned empty text');
    }

    var usageMetadata = parsed.usageMetadata || {};

    return {
      text: text.trim(),
      inputTokens: usageMetadata.promptTokenCount || 0,
      outputTokens: usageMetadata.candidatesTokenCount || 0,
      totalTokens: usageMetadata.totalTokenCount || 0,
      finishReason: candidate.finishReason || 'UNKNOWN'
    };
  },

  _extractErrorMessage: function(responseBody) {
    try {
      var parsed = JSON.parse(responseBody);

      if (parsed.error && parsed.error.message) {
        return parsed.error.message;
      }
    } catch (e) {
    }

    return responseBody.substring(0, 500);
  }
};
