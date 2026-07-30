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

    try {
      return this._callProvider(provider, prompt, options);

    } catch (e) {
      var alternate = this._alternateTo(provider);

      // Failover covers the failures that actually happen. 15 rows failed to a
      // deprecated model, 16 to quota and 13 to overload — 31 of them while a
      // working second provider sat configured and unused. A model that
      // vanishes from one vendor is not a reason to lose the row.
      // (Audit A, §1 and finding F12.)
      if (!alternate || !this.isConfigured(alternate)) {
        throw e;
      }

      Logger.log(
        'PROVIDER_FAILOVER | ' + provider + ' failed (' + e.toString() + ') | ' +
        'retrying on ' + alternate
      );

      var failoverOptions = {};
      for (var key in options) {
        failoverOptions[key] = options[key];
      }
      failoverOptions.provider = alternate;

      // The model name belongs to the provider that failed. Left in place it
      // would be sent to the alternate, which rejects it — turning one failure
      // into two and hiding the original cause.
      delete failoverOptions.model;

      var result = this._callProvider(alternate, prompt, failoverOptions);
      result.failedOver = provider + ' → ' + alternate;
      return result;
    }
  },

  _callProvider: function(provider, prompt, options) {
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

  _alternateTo: function(provider) {
    if (provider === 'gemini') return 'claude';
    if (provider === 'claude') return 'gemini';
    return null;
  },

  // One log fragment describing what this call took from cache, correct for
  // either provider.
  //
  // Share cached depends on which token convention the response carries:
  // Gemini's promptTokenCount already includes the cached prefix, Anthropic's
  // input_tokens does not. Dividing by (cached + inputTokens) is right for
  // Anthropic and understates Gemini by roughly half — on precisely the number
  // the whole caching effort is judged by. Written once, here, so the two call
  // sites cannot disagree.
  cacheSummary: function(response) {
    var cached = (response && response.cachedTokens) || 0;
    var cacheWrite = (response && response.cacheWriteTokens) || 0;
    var input = (response && response.inputTokens) || 0;

    if (!cached && !cacheWrite) {
      return 'Cached: 0';
    }

    var total = response && response.inputIncludesCached
      ? input
      : input + cached;

    var share = total ? Math.round((cached / total) * 100) : 0;
    var summary = 'Cached: ' + cached + ' (' + share + '% of input)';

    if (cacheWrite) {
      summary += ' | Cache written: ' + cacheWrite;
    }

    return summary;
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

    // Anthropic caching is a prefix match from byte zero and it is opt-in: the
    // request must mark where the reusable part ends. Splitting the prompt into
    // two text blocks does not change a single byte the model reads — the blocks
    // are concatenated in order — but it gives the API the breakpoint it needs.
    //
    // Without this, removing the timestamp bought nothing on this provider: the
    // prefix was cacheable and nothing ever asked for it to be cached.
    // A cache read bills ~0.1x input; the write ~1.25x. The Creative Director
    // sends ~20,130 input tokens a row, ~90% of it identical row to row.
    var split = this._splitOnPrefix(prompt, options.cachePrefix);

    if (split) {
      content.push({
        type: 'text',
        text: split.prefix,
        cache_control: { type: 'ephemeral' }
      });
      content.push({ type: 'text', text: split.rest });
    } else {
      content.push({ type: 'text', text: prompt });
    }

    var payload = {
      model: model,
      max_tokens: maxTokens,
      messages: [{ role: 'user', content: content }]
    };

    // temperature is deliberately not forwarded. The Claude 5 family rejects
    // temperature, top_p and top_k with HTTP 400 on any non-default value, and
    // every worker declares one — so sending it fails the row three times and
    // stops the batch. Steering on this provider is done through the prompt.
    if (options.temperature != null) {
      Logger.log(
        'CLAUDE | temperature ' + options.temperature + ' not sent — ' +
        'rejected by ' + model + '. Steer via the prompt instead.'
      );
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

  // Returns the prompt cut into a cacheable prefix and the rest, or null when
  // the split cannot be made safely.
  //
  // The prefix is verified to actually be a prefix of the prompt rather than
  // trusted. If ContextBuilder and the caller ever disagree about where the
  // static part ends, this returns null and the call proceeds uncached — a
  // missed discount, not a corrupted prompt.
  //
  // Anthropic will not cache a prefix below its per-model minimum (1024 tokens
  // on the Claude 5 family). Marking a short prefix is not an error, it simply
  // does nothing, so the floor here is a rough character equivalent used only to
  // avoid spending a breakpoint on something that cannot pay.
  _splitOnPrefix: function(prompt, prefix) {
    if (!prefix || typeof prefix !== 'string') {
      return null;
    }

    if (prefix.length < 4000 || prefix.length >= prompt.length) {
      return null;
    }

    if (prompt.substring(0, prefix.length) !== prefix) {
      Logger.log(
        'CLAUDE_CACHE | prefix did not match the prompt — sending uncached. ' +
        'ContextBuilder.staticPrefixFor and buildContext have diverged.'
      );
      return null;
    }

    return { prefix: prefix, rest: prompt.substring(prefix.length) };
  },

  _parseResponse: function(body) {
    var parsed = JSON.parse(body);

    // The Claude 5 family thinks by default, and thinking is charged against
    // max_tokens alongside the answer. A package that runs out of budget
    // returns valid JSON containing truncated JSON — which fails in the parser
    // as "could not extract", naming the wrong cause. Say what happened.
    if (parsed.stop_reason === 'max_tokens') {
      throw new Error(
        'Claude hit max_tokens (' + CONFIG.CLAUDE_MAX_OUTPUT_TOKENS + ') before ' +
        'finishing. The output is truncated. Raise CLAUDE_MAX_OUTPUT_TOKENS.'
      );
    }

    if (parsed.stop_reason === 'refusal') {
      throw new Error(
        'Claude declined this request (stop_reason: refusal). Nothing was ' +
        'written. Review the row content before re-running.'
      );
    }

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

    // totalTokens is not in the Anthropic response; sum it so a caller reading
    // the return value gets the same shape from either provider.
    //
    // cachedTokens is what tells us whether the caching work paid. Anthropic
    // reports reads and writes separately and prices them differently — a read
    // is ~0.1x input, a write ~1.25x — so both are surfaced.
    return {
      text: text,
      provider: 'claude',
      finishReason: parsed.stop_reason || '',
      inputTokens: usage.input_tokens || 0,
      // input_tokens excludes anything read from cache; Gemini's equivalent
      // includes it. See the note on the Gemini return.
      inputIncludesCached: false,
      outputTokens: usage.output_tokens || 0,
      totalTokens: (usage.input_tokens || 0) + (usage.output_tokens || 0),
      cachedTokens: usage.cache_read_input_tokens || 0,
      cacheWriteTokens: usage.cache_creation_input_tokens || 0
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

    // cachedContentTokenCount is how many input tokens were served from cache.
    // Until the timestamp was removed from the prompt header it was structurally
    // always zero; logging it is what makes the caching work measurable instead
    // of assumed. (Audit A, finding F5, and §9 Phase 0 step 2.)
    // promptTokenCount is the whole prompt, cached part included — unlike
    // Anthropic, where input_tokens counts only what was not served from cache.
    // A caller computing "share cached" has to know which convention it is
    // holding, so the provider is named in the result rather than guessed at.
    return {
      text: text.trim(),
      provider: 'gemini',
      inputTokens: usageMetadata.promptTokenCount || 0,
      inputIncludesCached: true,
      outputTokens: usageMetadata.candidatesTokenCount || 0,
      totalTokens: usageMetadata.totalTokenCount || 0,
      cachedTokens: usageMetadata.cachedContentTokenCount || 0,
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
