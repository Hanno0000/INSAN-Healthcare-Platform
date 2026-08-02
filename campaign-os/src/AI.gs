// ===========================================================================
// AI.gs
//
// The model providers, the context assembled for them, and everything that
// turns a decision into artwork.
//
// Merged from 11 source files on 2026-08-02. Apps Script has no
// modules: every .gs is evaluated into one shared scope before anything is
// called, so which file a definition sits in has never affected what runs.
// They were split for reading and merged because the operator pastes each
// file into the editor by hand.
//
// The BEGIN/END banners below are load-bearing for the tests, which read a
// section by name — see tests/run.js, fixtures.srcSection.
//
// Contents:
//   AIProvider.gs
//   ImageProvider.gs
//   ContextBuilder.gs
//   AdPolicy.gs
//   MediaDesigner.gs
//   TextOverlay.gs
//   Branding.gs
//   AssetIntegrity.gs
//   AssetLibrary.gs
//   VisualPlan.gs
//   ServiceRunner.gs
// ===========================================================================


// ---------------------------------------------------------------------------
// BEGIN SOURCE FILE: AIProvider.gs
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// END SOURCE FILE: AIProvider.gs
// ---------------------------------------------------------------------------


// ---------------------------------------------------------------------------
// BEGIN SOURCE FILE: ImageProvider.gs
// ---------------------------------------------------------------------------
var ImageProvider = {

  generate: function(prompt, options) {
    options = options || {};

    var model = options.model || CONFIG.MEDIA_MODELS.IMAGE;
    var aspectRatio = options.aspectRatio || '1:1';
    var numberOfImages = options.numberOfImages || 1;

    var apiKey = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');

    if (!apiKey) {
      throw new Error(
        'GEMINI_API_KEY not found in Script Properties. ' +
        'Set it via: PropertiesService.getScriptProperties().setProperty("GEMINI_API_KEY", "your-key-here")'
      );
    }

    var url = 'https://generativelanguage.googleapis.com/v1beta/models/' +
      model + ':generateContent?key=' + apiKey;

    var images = [];
    var failures = [];

    // Real photographs of the facility, supplied ahead of the instruction so the
    // model treats them as the visual ground truth rather than as decoration.
    var referenceImages = options.referenceImages || [];
    var parts = [];

    for (var ref = 0; ref < referenceImages.length; ref++) {
      parts.push({
        inlineData: {
          mimeType: referenceImages[ref].mimeType || 'image/jpeg',
          data: referenceImages[ref].base64
        }
      });
    }

    parts.push({ text: prompt });

    for (var i = 0; i < numberOfImages; i++) {
      var payload = {
        contents: [
          {
            parts: parts
          }
        ],
        generationConfig: {
          responseModalities: ['TEXT', 'IMAGE'],
          imageConfig: {
            aspectRatio: aspectRatio
          }
        }
      };

      var requestOptions = {
        method: 'post',
        contentType: 'application/json',
        payload: JSON.stringify(payload),
        muteHttpExceptions: true
      };

      // A failure on asset 3 must not discard assets 1 and 2 — those are already
      // generated and already paid for. Record the failure, keep what worked,
      // and let the caller decide whether a partial set is usable.
      try {
        var response = RetryPolicy.fetch(function() {
          return UrlFetchApp.fetch(url, requestOptions);
        }, 'Image ' + model + ' (asset ' + (i + 1) + '/' + numberOfImages + ')');

        var responseCode = response.getResponseCode();
        var responseBody = response.getContentText();

        if (responseCode !== 200) {
          throw new Error(
            'HTTP ' + responseCode + ': ' + this._extractErrorMessage(responseBody)
          );
        }

        images.push(this._extractImage(responseBody));

      } catch (e) {
        failures.push('asset ' + (i + 1) + ': ' + e.toString());
        Logger.log(
          'IMAGE_ASSET_FAILED | asset ' + (i + 1) + '/' + numberOfImages +
          ' | ' + e.toString()
        );
      }
    }

    if (!images.length) {
      throw new Error(
        'Image generation produced nothing. ' + failures.join(' | ')
      );
    }

    return {
      images: images,
      count: images.length,
      requested: numberOfImages,
      failures: failures,
      isPartial: images.length < numberOfImages
    };
  },

  _extractImage: function(responseBody) {
    var parsed = JSON.parse(responseBody);

    if (!parsed.candidates || !parsed.candidates.length) {
      throw new Error('Image API returned no candidates');
    }

    var parts = parsed.candidates[0].content && parsed.candidates[0].content.parts;

    if (!parts || !parts.length) {
      throw new Error('Image API returned no content parts');
    }

    for (var i = 0; i < parts.length; i++) {
      var part = parts[i];

      if (part.inlineData && part.inlineData.data) {
        return {
          base64: part.inlineData.data,
          mimeType: part.inlineData.mimeType || 'image/png'
        };
      }
    }

    throw new Error('Image API returned no image data');
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

// ---------------------------------------------------------------------------
// END SOURCE FILE: ImageProvider.gs
// ---------------------------------------------------------------------------


// ---------------------------------------------------------------------------
// BEGIN SOURCE FILE: ContextBuilder.gs
// ---------------------------------------------------------------------------
var ContextBuilder = {

  // rowNumber is the row being written. Creative memory needs it to look
  // backwards from the current position; without it the window cannot be
  // anchored anywhere meaningful. See _recentApprovedRows.
  buildContext: function(workerName, rowData, rowNumber) {
    var workerConfig = CONFIG.WORKERS[workerName];

    if (!workerConfig) {
      throw new Error('Unknown worker: ' + workerName);
    }

    var dynamic = [
      this._buildRowData(workerConfig, rowData),
      this._buildStandingHashtags(workerName, rowData),
      this._buildCreativeMemory(workerName, rowData, rowNumber),
      this._buildOutputFormat(workerConfig)
    ].filter(function(s) { return s; }).join('\n\n');

    var prefix = this.staticPrefixFor(workerName);

    return dynamic ? prefix + '\n\n' + dynamic : prefix;
  },

  // The part of the prompt that is identical on every row for a given worker:
  // the header, the training manual and the project documents — roughly 90% of
  // the input, and about 9.7M of the 10.8M tokens a 132-row plan spends.
  //
  // Built here rather than inline in buildContext so there is exactly one
  // definition of where the static part ends. A cache breakpoint computed from
  // a second, parallel definition would drift from the prompt it is meant to
  // describe, and the failure mode of that is silent: a 100% miss rate that
  // looks like caching simply not working.
  staticPrefixFor: function(workerName) {
    var workerConfig = CONFIG.WORKERS[workerName];

    if (!workerConfig) {
      throw new Error('Unknown worker: ' + workerName);
    }

    return [
      this._buildHeader(workerName),
      this._buildAdPolicy(workerName),
      this._buildWorkerPrompt(workerName),
      this._buildProjectDocs(workerName),
      this._buildControlledVocabulary(workerConfig)
    ].filter(function(s) { return s; }).join('\n\n');
  },

  // Meta's advertising rules, for every worker that shapes what a post says or
  // shows. Every post here runs as a paid ad, so these constrain the writing
  // rather than being checked afterwards.
  //
  // Placed high — directly after the header, before the worker's own manual —
  // because it overrides the creative documents where they disagree, and a
  // constraint stated after the thing it constrains reads as an afterthought.
  //
  // Part of the CACHED prefix: identical for every row and every worker, so it
  // is paid for once rather than per row. It comes from code rather than a
  // Drive document on purpose — a document can go unuploaded, be edited by
  // anyone, or sit stale in a six-hour cache, and a hard rule that silently
  // fails to load is worse than no rule because everything still looks fine.
  _buildAdPolicy: function(workerName) {
    if (!AdPolicy.appliesTo(workerName)) {
      return '';
    }

    return AdPolicy.block();
  },

  // A short fingerprint of the cacheable prefix, logged per call.
  //
  // A stale cache is the one genuine quality risk in this work: a prompt edited
  // in Drive while the cache still holds the old text produces rows from the old
  // prompt with no error and no warning. Prompts are cached for six hours, so
  // this is not hypothetical. The hash makes the drift visible — when it changes,
  // the prompt changed; when cached tokens stay high across a hash change,
  // something is serving text nobody edited.
  staticPrefixHash: function(prefixText) {
    try {
      var bytes = Utilities.computeDigest(
        Utilities.DigestAlgorithm.MD5, prefixText, Utilities.Charset.UTF_8
      );
      var hex = '';

      for (var i = 0; i < 4; i++) {
        var b = (bytes[i] + 256) % 256;
        hex += (b < 16 ? '0' : '') + b.toString(16);
      }

      return hex;

    } catch (e) {
      return 'nohash';
    }
  },

  // The writing prompts have always instructed workers to learn from earlier
  // Creative Director feedback and to avoid repeating previous openings. Neither
  // was possible: each row was processed in isolation with no sight of any other.
  // Two posts consequently opened with the identical line.
  //
  // This supplies the missing history — recent notes to learn from, and recent
  // openings to avoid repeating.
  // The hashtags this page already carries on every post.
  //
  // Dynamic, not part of the cached prefix: it varies by page, and putting it
  // in the prefix would give three pages three different prefixes and cut the
  // cache hit rate by two thirds for the sake of four lines.
  //
  // The writer is shown these so it does not restate them. It never assembles
  // the final list — PostFooter does, in code — so a model that ignores this
  // block costs a duplicate tag, not a missing brand.
  _buildStandingHashtags: function(workerName, rowData) {
    if (workerName !== 'CONTENT_CREATION_WORKER') {
      return '';
    }

    var brief = PostFooter.briefFor(rowData['Publishing Page']);

    if (!brief) {
      return '';
    }

    return '## STANDING HASHTAGS FOR THIS PAGE\n\n' + brief;
  },

  _buildCreativeMemory: function(workerName, rowData, rowNumber) {
    if (workerName !== 'CONTENT_CREATION_WORKER' &&
        workerName !== 'CREATIVE_DIRECTOR_WORKER') {
      return '';
    }

    var history = this._recentApprovedRows(rowData, 4, rowNumber);

    if (!history.length) {
      return '';
    }

    var lines = [
      '## CREATIVE MEMORY',
      '',
      'Recent approved work from this ecosystem. Use it to keep improving and to',
      'stay distinct — never to copy.',
      ''
    ];

    var openings = [];
    var notes = [];

    for (var i = 0; i < history.length; i++) {
      var opening = String(history[i].opening || '').trim();
      var note = String(history[i].notes || '').trim();

      if (opening) {
        openings.push('- "' + opening.substring(0, 90) + '"');
      }
      if (note) {
        notes.push('- ' + note.replace(/\s+/g, ' ').substring(0, 300));
      }
    }

    if (openings.length) {
      lines.push('### Openings already used — do not reuse these images');
      lines.push('');
      lines.push(openings.join('\n'));
      lines.push('');
      lines.push('Your opening must not repeat any of the above, nor a close variation');
      lines.push('of one. A distinctive opening stops being distinctive on its second use.');
      lines.push('');
    }

    if (notes.length) {
      lines.push('### Creative Director feedback on recent work');
      lines.push('');
      lines.push(notes.join('\n'));
      lines.push('');
      lines.push('Look for the recurring observation. Apply the lesson; do not imitate');
      lines.push('the wording it referred to.');
    }

    return lines.join('\n');
  },

  // Reads a small window of earlier rows from the Content Pipeline. Kept cheap
  // and failure-tolerant: creative memory is an enhancement, and a problem here
  // must never stop a row from being produced.
  //
  // The window is anchored to the row being written, not to the bottom of the
  // sheet. getLastRow() reports ~1000 here because validation and formulas
  // extend that far, while every finished row sits at the top — so a window of
  // lastRow-24 scanned rows 976-1000 on every call and found nothing, always.
  // The feature never once returned a result. (Audit B, finding B2.)
  _recentApprovedRows: function(rowData, limit, rowNumber) {
    try {
      var sheetName = CONFIG.SHEET_NAME;
      var currentId = String(rowData[CONFIG.COLUMN_NAMES.CONTENT_ID] || '').trim();

      // Earlier rows only. Later rows are either unwritten or belong to work
      // this row must not learn from — it precedes them.
      var anchor = rowNumber
        ? rowNumber - 1
        : SheetSchema.getLastRow(sheetName);

      if (anchor < CONFIG.DATA_START_ROW) {
        return [];
      }

      var columnMap = SheetSchema._getColumnMap(sheetName);
      var copyCol = columnMap['Creative Director Post Copy'];
      var draftCol = columnMap['Post Copy (AI)'];
      var notesCol = columnMap['Creative Director Notes'];
      var idCol = columnMap[CONFIG.COLUMN_NAMES.CONTENT_ID];

      if (!copyCol && !draftCol) {
        return [];
      }

      var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
      var scanFrom = Math.max(CONFIG.DATA_START_ROW, anchor - 24);
      var height = anchor - scanFrom + 1;
      var width = sheet.getLastColumn();
      var block = sheet.getRange(scanFrom, 1, height, width).getValues();

      var found = [];

      // Newest first — recent work is the most relevant.
      for (var r = block.length - 1; r >= 0 && found.length < limit; r--) {
        var row = block[r];
        var copy = copyCol ? String(row[copyCol - 1] || '').trim() : '';

        // The pipeline runs a worker across every row before the next worker
        // starts, so when the Content Creation Worker reaches row N the
        // Creative Director has not written any row yet — and its own drafts
        // for rows 2..N-1 are the only openings that exist for this plan. The
        // approved copy is preferred where it exists; the draft is what stops
        // W4 from being blind to the plan it is halfway through writing.
        if (!copy && draftCol) {
          copy = String(row[draftCol - 1] || '').trim();
        }

        if (!copy) {
          continue;
        }

        if (idCol && currentId && String(row[idCol - 1] || '').trim() === currentId) {
          continue;
        }

        found.push({
          opening: copy.split('\n')[0],
          notes: notesCol ? row[notesCol - 1] : ''
        });
      }

      return found;

    } catch (e) {
      Logger.log('CREATIVE_MEMORY | unavailable: ' + e.toString());
      return [];
    }
  },

  // Deliberately contains nothing that changes between calls. Every caching
  // mechanism — Gemini implicit, Gemini explicit, Anthropic cache_control —
  // matches a prefix from byte zero, so a timestamp on the third line of the
  // prompt held the cacheable prefix to two lines and made ~9.7M of 10.8M
  // input tokens per plan unavoidably fresh. Nothing ever read it.
  // (Audit A, findings F5 and F18.)
  _buildHeader: function(workerName) {
    return [
      'You are executing inside the INSAN Healthcare AI Operating System.',
      'Worker: ' + workerName,
      '',
      'Follow your training instructions exactly.',
      'Read all project documentation before making decisions.',
      'Use only approved controlled vocabulary for dropdown fields.',
      'Return your output as valid JSON matching the schema provided.'
    ].join('\n');
  },

  _buildWorkerPrompt: function(workerName) {
    var prompt = DriveLoader.loadPrompt(workerName);

    if (!prompt) {
      throw new Error(
        'Could not load prompt for worker: ' + workerName +
        '. Check PROMPTS_FOLDER_ID and the prompt file exists.'
      );
    }

    return [
      '=== YOUR TRAINING MANUAL ===',
      '',
      prompt,
      '',
      '=== END OF TRAINING MANUAL ==='
    ].join('\n');
  },

  _buildProjectDocs: function(workerName) {
    var docs = DriveLoader.loadProjectDocs(workerName);

    if (!docs) {
      return '=== PROJECT DOCUMENTATION ===\n[No documentation loaded]\n=== END ===';
    }

    return [
      '=== PROJECT DOCUMENTATION ===',
      '',
      docs,
      '',
      '=== END OF PROJECT DOCUMENTATION ==='
    ].join('\n');
  },

  _buildControlledVocabulary: function(workerConfig) {
    var outputFields = workerConfig.outputFields;
    var controlledFields = [];

    for (var fieldName in outputFields) {
      if (outputFields[fieldName] === 'controlled') {
        var vocabulary = CONFIG.CONTROLLED_VOCABULARY[fieldName];

        if (vocabulary) {
          controlledFields.push(
            fieldName + ':\n  Allowed values: ' + vocabulary.join(', ')
          );
        }
      }
    }

    if (controlledFields.length === 0) {
      return '';
    }

    return [
      '=== CONTROLLED VOCABULARY (USE EXACT VALUES) ===',
      '',
      'The following fields MUST use only the exact values listed.',
      'No synonyms. No rewording. No creative variations.',
      '',
      controlledFields.join('\n\n'),
      '',
      '=== END OF CONTROLLED VOCABULARY ==='
    ].join('\n');
  },

  _buildRowData: function(workerConfig, rowData) {
    var readColumns = workerConfig.readColumns;
    var lines = [];

    for (var i = 0; i < readColumns.length; i++) {
      var colName = readColumns[i];
      var value = rowData[colName];

      if (value === undefined || value === null) {
        value = '[EMPTY]';
      } else if (value instanceof Date) {
        value = Utilities.formatDate(
          value, Session.getScriptTimeZone(), 'yyyy-MM-dd'
        );
      } else {
        value = String(value).trim();
      }

      if (value === '') {
        value = '[EMPTY]';
      }

      lines.push(colName + ': ' + value);
    }

    var sheetName = workerConfig.sheetName || CONFIG.SHEET_NAME;

    return [
      '=== CURRENT ROW DATA (' + sheetName + ') ===',
      '',
      'Read every field below carefully.',
      'Pre-filled fields are strategic context. Never rewrite them.',
      'Use them to understand the campaign, audience, and strategy.',
      '',
      lines.join('\n'),
      '',
      '=== END OF ROW DATA ==='
    ].join('\n');
  },

  _buildOutputFormat: function(workerConfig) {
    var outputFields = workerConfig.outputFields;
    var fieldNames = [];

    for (var fieldName in outputFields) {
      fieldNames.push(fieldName);
    }

    var hints = workerConfig.outputHints || {};
    var schemaLines = [];

    for (var j = 0; j < fieldNames.length; j++) {
      var fname = fieldNames[j];
      var ftype = outputFields[fname];

      // A per-field hint from CONFIG wins over the generic wording. It is how a
      // new output field gets specific direction without editing a tuned
      // prompt file.
      var description = hints[fname]
        ? '(' + hints[fname] + ')'
        : (ftype === 'controlled'
            ? '(use EXACT value from controlled vocabulary)'
            : '(free text - be creative and specific)');

      schemaLines.push('  "' + fname + '": "...' + description + '..."');
    }

    var schema = '{\n' + schemaLines.join(',\n') + '\n}';

    return [
      '=== OUTPUT FORMAT ===',
      '',
      'Return your output as a single valid JSON object.',
      'Do NOT include markdown code fences.',
      'Do NOT include any text before or after the JSON.',
      'Do NOT add fields that are not in the schema below.',
      'Do NOT omit any field from the schema below.',
      '',
      'JSON Schema:',
      schema,
      '',
      'IMPORTANT:',
      '- For controlled vocabulary fields: use ONLY the exact allowed values.',
      '- For free text fields: write in the language specified in Language Style.',
      '- Every field must be filled. No field may be empty or null.',
      '- Return ONLY the JSON object. Nothing else.',
      '',
      '=== END OF OUTPUT FORMAT ==='
    ].join('\n');
  }
};

// ---------------------------------------------------------------------------
// END SOURCE FILE: ContextBuilder.gs
// ---------------------------------------------------------------------------


// ---------------------------------------------------------------------------
// BEGIN SOURCE FILE: AdPolicy.gs
// ---------------------------------------------------------------------------
// ================================
// META ADVERTISING POLICY — HARD RULES
//
// Every post this system produces is intended for paid promotion. That makes
// Meta's advertising policies a constraint on the WRITING, not a step someone
// checks afterwards — a rejected ad is discovered days later, and a pattern of
// rejections restricts the ad account itself.
//
// ------------------------------------------------------------------------
// WHY THIS IS A BLOCK OF TEXT AND NOT ONE SENTENCE
//
// "Comply with Facebook's advertising policies" is not enough. A model knows
// them approximately, and approximately is exactly where this fails: the rules
// that bite are specific, they are phrased in ways that do not survive
// translation into Arabic, and a near-miss reads as perfectly good copy.
//
// Pasting the whole policy is not the answer either. It runs to tens of
// thousands of words, most of it about cryptocurrency, weapons, dating and
// politics, and it changes faster than a cached prompt does.
//
// So this is the subset that actually applies to Arabic healthcare content on
// a Facebook page, written as rules rather than as a summary.
//
// ------------------------------------------------------------------------
// WHERE IT LIVES
//
// In code, injected into the static prefix of every worker that shapes what a
// post says or shows. Not a Drive document: a document can be edited by anyone,
// cached for six hours, or simply not uploaded — and a hard rule that silently
// fails to load is worse than no rule, because everything still looks fine.
//
// ------------------------------------------------------------------------
// THE ONE THE BRAND DOCUMENTS DO NOT COVER
//
// AI_CREATIVE_CONSTITUTION already forbids most of what Meta forbids: no fear
// marketing, no unproven claims, no "best hospital", no guarantees. The overlap
// is large and that is a good sign.
//
// It does not cover PERSONAL ATTRIBUTES, and that is the single most common
// reason healthcare ads are rejected. The rule is grammatical, not editorial:
// addressing the reader as though you know their condition. "Do you suffer from
// diabetes?" is refused; "care for people with diabetes" is not. Nothing in the
// brand documents would stop a writer producing the first one — and the ICU
// knowledge base, whose whole emotional strategy is families in distress, leans
// toward exactly that phrasing.
// ================================

var AdPolicy = {

  VERSION: '2026-08-02',

  // Workers that decide what a post says or shows. A worker not on this list
  // does not shape published content — the planner picks dates, the publisher
  // moves finished text.
  APPLIES_TO: [
    'CONTENT_STRATEGY_WORKER',
    'CONTENT_CREATION_WORKER',
    'CREATIVE_DIRECTOR_WORKER',
    'MEDIA_DESIGNER',
    'PAID_ADS_WORKER'
  ],

  appliesTo: function(workerName) {
    return this.APPLIES_TO.indexOf(String(workerName || '').toUpperCase()) !== -1;
  },

  // The block, as it appears in the prompt.
  block: function() {
    return [
      '=== META ADVERTISING POLICY — HARD RULES ===',
      '',
      'Every post produced here runs as a paid Facebook ad. These are not style',
      'preferences. An ad that breaks them is rejected, and a pattern of',
      'rejections restricts the advertising account itself.',
      '',
      'Where these and the creative documents disagree, these win.',
      '',
      '## 1. Personal attributes — the one that catches healthcare',
      '',
      'Never assert or imply that you know something about the reader: their',
      'health, condition, body, age, finances, or circumstances. This is about',
      'GRAMMAR, not tone. Addressing a condition in the second person breaks it',
      'even when the sentence is kind.',
      '',
      '  REFUSED   هل تعاني من آلام الظهر؟',
      '  REFUSED   علاجك من السكري يبدأ هنا',
      '  REFUSED   لأنك مريض بالقلب، نحن هنا',
      '  REFUSED   Do you suffer from diabetes?',
      '',
      '  ACCEPTED  رعاية متخصصة لمرضى السكري',
      '  ACCEPTED  مركز القلب يقدم رعاية متكاملة',
      '  ACCEPTED  آلام الظهر لها أسباب كثيرة — والتشخيص الصحيح يبدأ بالفحص',
      '',
      'The test: rewrite the sentence in the third person. If it still says what',
      'you meant, use the third person. If it only works in the second person,',
      'it is claiming to know the reader.',
      '',
      'This applies to the FAMILY as well. "عندما يدخل والدك العناية المركزة"',
      'assumes a fact about the reader. "عندما تدخل الأسرة إلى العناية المركزة"',
      'does not.',
      '',
      '## 2. No guaranteed or implied outcomes',
      '',
      'No cure, no recovery, no result, no timeframe — stated or implied.',
      'No "شفاء مضمون", no "نتائج مؤكدة", no "خلال أسبوع".',
      'Describe the care and the process. Never the outcome.',
      '',
      '## 3. No before-and-after, and no idealised bodies',
      '',
      'No before/after pairing of any kind, in copy or image. No implied',
      'transformation of a body. No imagery that presents a body as a problem to',
      'be fixed. This is refused outright and is the most common image rejection',
      'in healthcare.',
      '',
      '## 4. Nothing shocking, graphic or distressing',
      '',
      'No blood, wounds, surgery in progress, exposed anatomy, needles entering',
      'skin, patients in visible pain or fear, or medical imagery a person would',
      'not want to meet while scrolling. Clinical environments are fine; clinical',
      'distress is not.',
      '',
      '## 5. No unverifiable superlatives',
      '',
      'No "الأفضل", "الأول", "الأكبر", "الأشهر", "رقم واحد" without a stated,',
      'checkable source. Absent a source, the claim is refused — and this one is',
      'also a Strict Red Line in AI_CREATIVE_CONSTITUTION.',
      '',
      '## 6. Do not name or promote prescription medicines',
      '',
      'No drug names, no dosages, no pharmaceutical products. Treatments may be',
      'described as categories of care, not as products.',
      '',
      '## 7. Nothing that exploits fear',
      '',
      'No implied consequence of not acting. No countdown, no scarcity, no',
      '"قبل فوات الأوان". Urgency around health is read as exploitation of a',
      'vulnerable state, and it is refused whether or not it is true.',
      '',
      '## 8. Text on the image',
      '',
      'The system composites the headline and the contact strip and holds them',
      'inside the allowed share of the frame. Do not ask the image for further',
      'text, and do not write copy that only works if more text is drawn on it.',
      '',
      '=== END OF META ADVERTISING POLICY ==='
    ].join('\n');
  },

  // ------------------------------------------------------------- detection
  //
  // A cheap pass over finished Arabic or English copy for the patterns that are
  // mechanically detectable. It finds the shapes, not the meaning: a clean
  // result is not a guarantee of compliance, and it is reported rather than
  // used to block a row.
  //
  // Only the personal-attribute and guarantee patterns are reliable enough to
  // check this way. The rest need a reader.
  // JavaScript defines \b on [A-Za-z0-9_], so it never matches at the edge of
  // an Arabic word — /\bنضمن/ matches nothing, silently, and the check reports
  // all clear. This is the same defect START_HERE §7 records against the
  // portfolio critic, and writing these patterns reproduced it: three of the
  // four rules below were dead on arrival.
  //
  // The boundary that works is "not another Arabic letter".
  _AR_END: '(?![\\u0600-\\u06FF])',

  _ar: function(alternatives) {
    return new RegExp('(?:' + alternatives.join('|') + ')' + this._AR_END);
  },

  scan: function(text) {
    var value = String(text || '');

    if (!value.trim()) {
      return [];
    }

    var findings = [];

    var patterns = [
      {
        rule: 'personal attributes',
        why: 'addresses the reader as though their condition is known',
        tests: [
          /هل\s+(?:تعاني|تشكو|تشعر|تخاف|تبحث عن علاج)/,
          /(?:تعاني|تشكو)\s+من/,
          /لأنك\s+(?:مريض|تعاني|مصاب)/,
          this._ar(['مرضك', 'حالتك المرضية', 'علاجك', 'أعراضك', 'ألمك',
                    'وجعك', 'تعبك']),
          /\bdo you (?:suffer|have|struggle with)\b/i,
          /\byour (?:diabetes|cancer|condition|illness|symptoms|pain|disease)\b/i,
          /\bare you (?:diabetic|overweight|struggling)\b/i
        ]
      },
      {
        rule: 'guaranteed outcome',
        why: 'promises a medical result',
        tests: [
          /(?:شفاء|نتائج|علاج)\s+(?:مضمون|مضمونة|أكيد|مؤكدة)/,
          /نضمن\s+(?:لك|لكم|الشفاء|النتيجة)/,
          /\bguaranteed\s+(?:results?|recovery|cure)\b/i,
          /\b100%\s*(?:نجاح|شفاء|success|cure)/i
        ]
      },
      {
        rule: 'unverifiable superlative',
        why: 'a ranking claim with no stated source',
        tests: [
          // Both the article-prefixed and bare forms. Real copy says
          // "أفضل مستشفى" at least as often as "المستشفى الأفضل", and a
          // pattern that only knew the first would have passed it.
          this._ar(['الأفضل', 'أفضل', 'الأول', 'الأكبر', 'الأشهر', 'الأقوى',
                    'رقم\\s*1', 'رقم\\s*واحد']),
          /\b(?:best|number one|#1|leading)\s+hospital\b/i
        ]
      },
      {
        rule: 'fear or urgency',
        why: 'pressure around a health decision',
        tests: [
          /قبل\s+فوات\s+الأوان/,
          this._ar(['احجز الآن', 'احجز فوراً', 'سارع', 'لا تفوت', 'العرض ينتهي',
                    'آخر فرصة', 'لا تتأخر']),
          /\bbefore it(?:'| i)?s too late\b/i
        ]
      }
    ];

    for (var p = 0; p < patterns.length; p++) {
      for (var i = 0; i < patterns[p].tests.length; i++) {
        var match = patterns[p].tests[i].exec(value);

        if (match) {
          findings.push({
            rule: patterns[p].rule,
            why: patterns[p].why,
            found: match[0]
          });
          break;
        }
      }
    }

    return findings;
  },

  // Reports what the scan found. Never throws and never blocks: this catches
  // shapes, and a shape is evidence rather than proof. A row stopped by a
  // regex that misread a sentence costs a rewrite for nothing, while a row
  // flagged in the log costs a glance.
  report: function(workerName, rowNumber, values) {
    var fields = ['Creative Director Post Copy', 'Post Copy (AI)', 'Hook',
                  'Text On Design', 'Alternative Opening'];
    var seen = {};
    var all = [];

    for (var f = 0; f < fields.length; f++) {
      var findings = this.scan(values[fields[f]]);

      for (var i = 0; i < findings.length; i++) {
        var key = findings[i].rule + '|' + findings[i].found;

        if (seen[key]) {
          continue;
        }

        seen[key] = true;
        all.push(fields[f] + ': "' + findings[i].found + '" — ' +
          findings[i].rule + ', ' + findings[i].why);
      }
    }

    if (all.length) {
      Logger.log(
        'AD_POLICY | ' + workerName + ' | Row ' + rowNumber + ' | ' +
        all.length + ' possible breach(es). These posts run as paid ads and a ' +
        'pattern of rejections restricts the account:\n   ' + all.join('\n   ')
      );
    }

    return all;
  }
};

// ---------------------------------------------------------------------------
// END SOURCE FILE: AdPolicy.gs
// ---------------------------------------------------------------------------


// ---------------------------------------------------------------------------
// BEGIN SOURCE FILE: MediaDesigner.gs
// ---------------------------------------------------------------------------
// ================================
// MEDIA DESIGNER
//
// Makes MEDIA_GENERATION_SERVICE.md executable.
//
// That document describes a Senior Visual Designer who reviews an execution
// against a paid-campaign standard, rejects what is generic, and refines until
// the work is worth publishing. None of it ran. Media Generation lived under
// CONFIG.SERVICES, which has no promptFile, so DriveLoader never loaded the
// file and no language model existed anywhere in the image path. The prompt was
// assembled by string concatenation in ServiceRunner: four overlapping
// descriptions of the same scene welded together, a hardcoded style line that
// contradicted the Creative Director, and 1,781 characters of prohibitions —
// 40% of the prompt. A carousel received one identical prompt per card.
//
// Concatenation cannot do what the document asks. It can strip the word
// "cinematic" with a regular expression; it cannot notice that an idea is dull.
//
// This runs the document as its own worker: it receives the approved package,
// composes one coherent prompt per asset through the eight production layers,
// and applies its own quality standard before returning. The silent review the
// document specifies stays silent — nothing here asks the model to expose it.
// ================================

var MediaDesigner = {

  WORKER_NAME: 'MEDIA_GENERATION',

  // Returns { prompts: [...], blocked: bool, blockedReason: '', usage: {...} }.
  //
  // One prompt per asset, in order. A carousel gets genuinely different scenes
  // because the designer is asked for them, not because a "|" was split.
  compose: function(rowData, assetCount, options) {
    options = options || {};

    var built = this._buildContext(rowData, assetCount, options);

    Logger.log(
      'MEDIA_DESIGNER | composing ' + assetCount + ' prompt(s) | context ' +
      built.text.length + ' chars (~' + Math.round(built.text.length / 4) + ' tokens)'
    );

    var response = AIProvider.call(built.text, {
      temperature: this._config().temperature,
      provider: this._config().provider,

      // The manual is 11,074 tokens and is re-sent for every row. Without a
      // breakpoint the Anthropic path pays all of it fresh each time, and this
      // worker is a candidate to move there — the visual manual is the second
      // largest prompt in the system. Gemini ignores the marker and matches
      // implicitly. (Audit A, finding F5.)
      cachePrefix: built.staticPart
    });

    var parsed = this._parse(response.text, assetCount);

    // Handed back so the caller can put it in the Execution Log. This is the
    // only inference in the image path, and it was logged as zero tokens on
    // every row — which is what made the whole visual path invisible to the
    // cost and caching measurement the content workers are judged by.
    parsed.usage = response;

    if (parsed.blocked) {
      Logger.log('MEDIA_DESIGNER | blocked: ' + parsed.blockedReason);
    }

    return parsed;
  },

  _config: function() {
    var service = (CONFIG.SERVICES && CONFIG.SERVICES.MEDIA_GENERATION) || {};
    return service.designer || {};
  },

  // Returns { text, staticPart }. The static part — header, manual, project
  // docs — is identical on every row and is where the cache breakpoint goes.
  // Split here rather than recomputed by the caller so there is one definition
  // of where the reusable part ends; a second, parallel one would drift, and
  // the failure mode of that is a silent 100% cache miss.
  _buildContext: function(rowData, assetCount, options) {
    // The image is half of what an ad is judged on, and the rejections it
    // causes — before/after pairings, distressing clinical imagery, bodies
    // presented as problems — are image rejections, not copy ones. This worker
    // builds its own context rather than going through ContextBuilder, so the
    // block is added here too; leaving it out would exempt the half that gets
    // refused most.
    var staticSections = [
      this._header(),
      AdPolicy.block(),
      this._trainingManual()
    ];

    var docs = this._projectDocs();
    if (docs) {
      staticSections.push(docs);
    }

    var staticPart = staticSections.filter(function(s) { return s; }).join('\n\n');

    var dynamic = [
      this._brief(rowData),
      this._contract(rowData, assetCount, options)
    ].filter(function(s) { return s; }).join('\n\n');

    return {
      text: dynamic ? staticPart + '\n\n' + dynamic : staticPart,
      staticPart: staticPart
    };
  },

  // No per-call values here — see ContextBuilder._buildHeader. This header
  // reproduced the same cache blocker; the manual behind it is 11,074 tokens
  // and is re-sent on every asset. (Audit A, finding F18.)
  _header: function() {
    return [
      'You are executing inside the INSAN Healthcare AI Operating System.',
      'Worker: MEDIA GENERATION SERVICE',
      '',
      'Your training manual follows. Follow it exactly.'
    ].join('\n');
  },

  _trainingManual: function() {
    var prompt = DriveLoader.loadPrompt(this.WORKER_NAME);

    if (!prompt) {
      throw new Error(
        'Could not load MEDIA_GENERATION_SERVICE.md. Check ' +
        'CONFIG.VISUAL_PROMPTS_FOLDER_ID and that the file exists in that folder.'
      );
    }

    return [
      '=== YOUR TRAINING MANUAL ===',
      '',
      prompt,
      '',
      '=== END OF TRAINING MANUAL ==='
    ].join('\n');
  },

  _projectDocs: function() {
    var names = this._config().docs || [];

    if (!names.length) {
      return '';
    }

    var sections = [];

    for (var i = 0; i < names.length; i++) {
      var content = DriveLoader.loadMarkdown(names[i], CONFIG.DOCS_FOLDER_ID);
      if (content) {
        sections.push('## ' + names[i] + '\n\n' + content);
      }
    }

    if (!sections.length) {
      return '';
    }

    return [
      '=== PROJECT DOCUMENTATION ===',
      '',
      sections.join('\n\n---\n\n'),
      '',
      '=== END OF PROJECT DOCUMENTATION ==='
    ].join('\n');
  },

  // The approved package, field by field and unmerged. The old assembly
  // flattened these into one run-on paragraph, which is why the same scene
  // arrived described four times.
  _brief: function(rowData) {
    var fields = [
      'Content ID', 'Content Format', 'Hospital Brand',
      'Creative Director Design Prompt', 'Visual Concept', 'Visual Focus',
      'Visual Priority', 'Design Mood', 'Composition', 'Visual Elements',
      'Do NOT Show', 'Design Notes', 'Reference Asset Package'
    ];

    var lines = ['=== PRODUCTION EXECUTION BRIEF ===', ''];

    for (var i = 0; i < fields.length; i++) {
      var value = String(rowData[fields[i]] || '').trim();
      if (value) {
        lines.push('### ' + fields[i]);
        lines.push(value);
        lines.push('');
      }
    }

    lines.push('=== END OF PRODUCTION EXECUTION BRIEF ===');

    return lines.join('\n');
  },

  // The manual defers its Inputs and Outputs to "the current Worker Contract".
  // This is that contract — the part that changes with the pipeline rather than
  // with the craft, which is why it lives here and not in the document.
  _contract: function(rowData, assetCount, options) {
    var lines = [
      '=== WORKER CONTRACT ===',
      '',
      '## What you are producing',
      '',
      'Text only. You do not generate the image — you write the prompt that will',
      'be sent to the image model, exactly as it will be sent.',
      ''
    ];

    if (assetCount > 1) {
      lines.push(
        '## This is a ' + assetCount + '-card carousel',
        '',
        'Write ' + assetCount + ' prompts. Each card is a distinct moment that',
        'advances one story — a different scene, a different camera position, a',
        'different beat. Cards that describe the same picture from the same angle',
        'are a production failure: the reader swipes and nothing happens.',
        '',
        'Hold the art direction constant across the set — the same palette,',
        'lighting character and rendering treatment — so the cards read as one',
        'family. Vary the scene, never the style.',
        ''
      );
    } else {
      lines.push('## This is a single image', '', 'Write 1 prompt.', '');
    }

    // Layer 7 of the manual assumes the image model sets the approved wording.
    // It no longer does. Arabic needs contextual shaping and RTL ordering, which
    // a diffusion model reproduces by luck: one run produced a headline in
    // disconnected reversed glyphs, a second corrupted copy of the same line on
    // one card, and the prompt's own quotation marks drawn as artwork. The
    // wording is now set as real type after generation.
    var wording = String(rowData['Text On Design'] || '').trim();
    var overlayOn = (CONFIG.TEXT_OVERLAY || {}).ENABLED;

    if (wording && overlayOn) {
      var atTop = String((CONFIG.TEXT_OVERLAY || {}).POSITION || 'bottom')
        .toLowerCase() === 'top';

      lines.push(
        '## Visible text — read this carefully, it overrides Layer 7',
        '',
        'Do not ask for any text, lettering or numerals in the artwork. Not the',
        'approved wording, not signage, not labels, not readable documents or',
        'screens. The image model cannot set Arabic type, and every attempt has',
        'produced malformed or duplicated script.',
        '',
        'The approved wording is composited onto the finished artwork as real',
        'typography, downstream of you:',
        '',
        '  "' + wording + '"',
        '',
        'Your job is to leave it somewhere to live. Compose so the ' +
          (atTop ? 'upper' : 'lower') + ' third',
        'carries no face, no hand and no critical detail — quiet tone, uncluttered.',
        'Treat it as reserved space in the composition, not as wasted frame.',
        ''
      );
    } else {
      lines.push(
        '## Visible text',
        '',
        'This asset carries no visible wording. Ask for no text, lettering or',
        'numerals of any kind.',
        ''
      );
    }

    if (options.usingReference) {
      lines.push(
        '## Project photographs are attached',
        '',
        'Real photographs of this facility will be supplied to the image model',
        'alongside your prompt. Write the prompt so it complements them: the',
        'architecture, finishes, equipment and uniforms come from the',
        'photographs, not from your description. Do not describe an environment',
        'from scratch, and do not ask for any person or any text visible in them',
        'to be reproduced.',
        ''
      );
    }

    lines.push(
      '## Your authority',
      '',
      'You own the execution, as your manual sets out under Creative Ownership:',
      'composition, camera placement, framing, focal emphasis, depth, lighting',
      'refinement, rhythm and spacing are yours. Do not wait for the brief to',
      'specify them, and do not settle for its first suggestion where a stronger',
      'execution of the same idea exists. If adding something the brief never',
      'mentioned makes the approved idea land harder, add it.',
      '',
      'What you may not do is change the idea, the message or the strategy, or',
      'contradict Do NOT Show, the Non-Negotiable Rules, or the Production Safety',
      'rules in your manual.',
      '',
      '## The standard',
      '',
      'This artwork runs as paid social advertising with real budget behind it.',
      'Apply your Internal Quality Check before you answer. If the execution is',
      'merely acceptable — generic, templated, stock-like, emotionally flat,',
      'or the kind of image a viewer scrolls past — rewrite it before returning.',
      'Do not return the review, or any explanation. Return the finished work.',
      '',
      '## If the brief cannot produce publishable work',
      '',
      'Only when the brief is genuinely unusable — internally contradictory, or',
      'missing what the image would have to be about — set "blocked" and say what',
      'is missing in one sentence. The row returns to the Creative Director. Do',
      'not use this because the brief is thin; a thin brief is what your',
      'execution authority is for.',
      '',
      '## Output',
      '',
      'Valid JSON, nothing before or after it, no markdown fence:',
      '',
      '{',
      '  "prompts": [' + this._exampleSlots(assetCount) + '],',
      '  "reserved_corner": "top-left",',
      '  "blocked": false,',
      '  "blocked_reason": ""',
      '}',
      '',
      'Exactly ' + assetCount + ' string(s) in "prompts". Each is a complete,',
      'self-contained prompt in English, written for an image model, following',
      'the eight production layers of your manual in order. No card numbers, no',
      'labels, no commentary.',
      '',
      '"reserved_corner" is where the brand marks will be composited after',
      'generation — one of top-left, top-right, bottom-left, bottom-right. Name',
      'the corner your composition leaves quietest, and write the prompts so it',
      'stays that way. You are the only thing that knows what is in each corner',
      'before the image exists; nothing downstream can move a logo off a face.',
      'Prefer a top corner: the bottom of the frame already carries the headline.',
      '',
      '=== END OF WORKER CONTRACT ==='
    );

    return lines.join('\n');
  },

  _exampleSlots: function(assetCount) {
    var slots = [];
    for (var i = 0; i < assetCount; i++) {
      slots.push('"<prompt ' + (i + 1) + '>"');
    }
    return slots.join(', ');
  },

  _parse: function(responseText, assetCount) {
    var json = ResponseParser._extractJSON(
      ResponseParser._cleanResponseText(responseText)
    );

    if (!json) {
      throw new Error(
        'The Media Designer did not return valid JSON. First 300 characters: ' +
        String(responseText || '').substring(0, 300)
      );
    }

    if (json.blocked === true) {
      return {
        prompts: [],
        blocked: true,
        blockedReason: String(json.blocked_reason || 'No reason given.').trim()
      };
    }

    var prompts = json.prompts;

    if (!prompts || !prompts.length) {
      throw new Error('The Media Designer returned no prompts.');
    }

    // A short count means cards would silently share a prompt, which is the
    // defect this worker exists to remove. Fail instead.
    if (prompts.length < assetCount) {
      throw new Error(
        'The Media Designer returned ' + prompts.length + ' prompt(s) for ' +
        assetCount + ' assets. Generating would repeat a card.'
      );
    }

    var cleaned = [];
    for (var i = 0; i < assetCount; i++) {
      var prompt = String(prompts[i] || '').trim();

      if (!prompt) {
        throw new Error('The Media Designer returned an empty prompt at position ' + (i + 1) + '.');
      }

      cleaned.push(prompt);
    }

    // Where the brand marks go. Validated against the four names rather than
    // trusted: an unrecognised value falls back to the configured corner, which
    // is a plain logo placement, where passing it through would be a logo
    // positioned at a coordinate nobody defined.
    var corners = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];
    var reserved = String(json.reserved_corner || '').trim().toLowerCase();

    if (reserved && corners.indexOf(reserved) === -1) {
      Logger.log(
        'MEDIA_DESIGNER | reserved_corner was "' + reserved + '", which is not ' +
        'one of ' + corners.join(', ') + '. Falling back to the configured corner.'
      );
      reserved = '';
    }

    return {
      prompts: cleaned,
      reservedCorner: reserved,
      blocked: false,
      blockedReason: ''
    };
  }
};

// ---------------------------------------------------------------------------
// END SOURCE FILE: MediaDesigner.gs
// ---------------------------------------------------------------------------


// ---------------------------------------------------------------------------
// BEGIN SOURCE FILE: TextOverlay.gs
// ---------------------------------------------------------------------------
// ================================
// TEXT OVERLAY
//
// Arabic headlines are composited onto the artwork after generation instead of
// being asked of the image model.
//
// The model cannot render Arabic. Across one five-asset run it produced: a
// tablet headline in disconnected, reversed glyphs; a headline drawn twice on
// one card, the second copy corrupted ("مش مش مجرد افردي"); the prompt's own
// quotation marks drawn as artwork; and "PATICHT" on a patient file. These are
// not prompt failures — Arabic needs contextual letter shaping and RTL ordering,
// which a diffusion model reproduces by luck.
//
// Asking for text also poisons the rest of the frame. "The only text anywhere
// is X" sits in the same prompt as "a document covered in Arabic text", and the
// model resolves the contradiction by inventing scribble.
//
// So generation is told to produce no text at all, and the approved wording is
// set here as real type: correct shaping, exact wording, once, legible at mobile
// size, in a known font at a known position.
// ================================

// One-time setup. Creates the two blank presentations the overlay copies, and
// prints exactly what to do with them.
//
// The page size still has to be set by hand: there is no API for it anywhere —
// not at creation, not in batchUpdate, not in SlidesApp. Copying is the only
// operation that carries a page size, so these two files exist to be copied.
function setUpOverlayTemplates() {
  var wanted = [
    { key: '1:1', label: 'Square 1080 x 1080 (Static, Carousel)', w: 1080, h: 1080 },
    { key: '9:16', label: 'Vertical 1080 x 1920 (Story, Reel)', w: 1080, h: 1920 }
  ];

  var lines = [
    '',
    '=====================================================',
    ' OVERLAY TEMPLATE SETUP',
    '=====================================================',
    '',
    'Two blank presentations have been created. For each one:',
    '',
    '  1. Open the link below.',
    '  2. File > Page setup > Custom.',
    '  3. Choose Pixels, enter the size, click Apply.',
    '  4. Delete anything on the slide. Leave it completely blank.',
    '  5. Close it. Do not rename it.',
    '',
    'Then paste the IDs into CONFIG.TEXT_OVERLAY.TEMPLATES and run',
    'testTextOverlay().',
    ''
  ];

  var ids = {};

  for (var i = 0; i < wanted.length; i++) {
    var spec = wanted[i];
    var presentation = SlidesApp.create('INSAN Overlay Template ' + spec.key);
    var id = presentation.getId();
    ids[spec.key] = id;

    lines.push('--- ' + spec.label + ' ---');
    lines.push('  Set page size to: ' + spec.w + ' x ' + spec.h + ' pixels');
    lines.push('  Open:  https://docs.google.com/presentation/d/' + id + '/edit');
    lines.push('  ID:    ' + id);
    lines.push('');
  }

  lines.push('CONFIG.TEXT_OVERLAY.TEMPLATES should read:');
  lines.push('');
  lines.push('    TEMPLATES: {');
  lines.push("      '1:1': '" + ids['1:1'] + "',");
  lines.push("      '9:16': '" + ids['9:16'] + "'");
  lines.push('    },');
  lines.push('');
  lines.push('=====================================================');

  var message = lines.join('\n');
  Logger.log(message);

  try {
    var ui = SpreadsheetApp.getUi();
    ui.alert('Overlay Template Setup', message, ui.ButtonSet.OK);
  } catch (noUi) {
    // Running from the editor. The log above is the result.
  }

  return ids;
}


// Run this once from the Apps Script editor after adding the presentations
// scope. It composes a caption over a plain test image and drops the result in
// the generated-assets folder, so the Slides round trip is proven in seconds
// rather than discovered part-way through a paid batch.
function testTextOverlay() {
  var swatch = Utilities.newBlob(
    Utilities.base64Decode(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAABzenr0AAAADUlEQVR42mNk' +
      'YPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
    ),
    'image/png',
    'overlay-test'
  );

  var composed = TextOverlay.apply(
    swatch, 'القرار الطبي مش مجرد اجتهاد فردي.', 1080, 1080
  );

  var file = DriveApp.getFolderById(CONFIG.VISUAL_ASSETS.generated)
    .createFile(composed.setName('TEXT_OVERLAY_TEST.png'));

  // The first run of this test reported success while writing a blank 16:9
  // image, because nothing checked the shape of what came back. A square asset
  // that exports 16:9 means the template's page size was never set.
  var bytes = composed.getBytes();
  var width = ((bytes[16] & 255) << 24) | ((bytes[17] & 255) << 16) |
              ((bytes[18] & 255) << 8) | (bytes[19] & 255);
  var height = ((bytes[20] & 255) << 24) | ((bytes[21] & 255) << 16) |
               ((bytes[22] & 255) << 8) | (bytes[23] & 255);

  if (width !== height) {
    throw new Error(
      'The overlay produced a ' + width + ' x ' + height + ' image for a ' +
      'square asset. The 1:1 template still has the default widescreen page ' +
      'size — open it, File > Page setup > Custom, 1080 x 1080 pixels. ' +
      'The test file was still written so you can see it: ' + file.getUrl()
    );
  }

  var message = 'Overlay test written to: ' + file.getUrl() + '\n' +
    'Output: ' + width + ' x ' + height + '\n' +
    'Check TEXT_OVERLAY_TEST.png:\n' +
    '- the Arabic reads right to left and the letters are joined\n' +
    '- the wording is exactly: القرار الطبي مش مجرد اجتهاد فردي.\n' +
    '- it sits in the lower band, legible against the scrim\n' +
    'Delete the file afterwards.';

  Logger.log(message);

  // This is meant to be run from the editor, where there is no container UI.
  // Reporting through the dialog when one exists is a convenience; failing on
  // its absence would report a passing test as an error, which is exactly what
  // it did on the first real run.
  try {
    var ui = SpreadsheetApp.getUi();
    ui.alert('Text Overlay Test', 'It worked.\n\n' + message, ui.ButtonSet.OK);
  } catch (noUi) {
    // Running from the editor. The log above is the result.
  }
}


var TextOverlay = {

  // Slides is the only rasteriser available to Apps Script. The sequence is:
  // copy a template at the asset's page size, lay the artwork in full-bleed,
  // set the type over it, then export the page as an image.
  SLIDES_API: 'https://slides.googleapis.com/v1/presentations',

  // Returns a new blob with the wording set over the artwork, or null when
  // there is nothing to add. Throws only on a genuine failure, so the caller
  // can decide whether an untyped asset is still worth keeping.
  // `rowData` is optional and carries the branding: which hospital's marks go
  // on this asset, and which page's numbers. Passing it composites the logos
  // and the contact strip in this same Slides pass — the pass is a
  // copy-export-trash per asset and doing it twice to add two small pictures
  // would double the most expensive step in the visual path.
  apply: function(imageBlob, text, widthPx, heightPx, rowData) {
    var wording = String(text || '').trim();
    var branding = rowData || null;

    // Artwork with no headline still needs its marks. Returning early here is
    // what would have shipped an unbranded post.
    if (!wording && !branding) {
      return null;
    }

    var cfg = CONFIG.TEXT_OVERLAY || {};
    var scratchId = null;

    try {
      scratchId = this._openScratch(widthPx, heightPx);

      var presentation = SlidesApp.openById(scratchId);

      // Read the page back rather than assuming it. The first version computed
      // its layout from the size it had asked for, and when that request was
      // ignored every coordinate was wrong: the type was positioned past the
      // bottom edge of a page 270pt shorter than expected, and exported blank.
      var pageW = presentation.getPageWidth();
      var pageH = presentation.getPageHeight();

      var slide = presentation.getSlides()[0];

      // Full-bleed. insertImage takes the blob directly, which avoids handing
      // Slides a Drive URL it may not be able to fetch.
      var image = slide.insertImage(imageBlob);
      image.setLeft(0).setTop(0).setWidth(pageW).setHeight(pageH);

      if (wording) {
        this._setType(slide, wording, pageW, pageH, cfg);
      }

      // After the type, so the marks sit above the scrim rather than under it,
      // and so a bottom corner can be lifted clear of the band that now exists.
      if (branding) {
        Branding.apply(slide, branding, pageW, pageH);
      }

      var pageObjectId = slide.getObjectId();
      presentation.saveAndClose();

      return this._exportPage(scratchId, pageObjectId, imageBlob.getName());

    } finally {
      // The copy is scaffolding. Leaving it behind would put one presentation
      // in the operator's Drive per generated asset.
      if (scratchId) {
        try {
          DriveApp.getFileById(scratchId).setTrashed(true);
        } catch (cleanupErr) {
          Logger.log('TEXT_OVERLAY | could not trash scratch presentation: ' +
            cleanupErr.toString());
        }
      }
    }
  },

  // A presentation's page size cannot be set through the API at all: it is
  // ignored by presentations.create ("other fields in the request are
  // ignored"), there is no batchUpdate request for it, and SlidesApp has no
  // setter. A new presentation is always 10 x 5.63in widescreen, which would
  // export a 1:1 asset as 16:9 with the artwork stretched.
  //
  // Copying a presentation does carry its page size, so the size is set once by
  // hand in the Slides UI and every asset is a copy of that. Run
  // setUpOverlayTemplates() for the instructions.
  _openScratch: function(widthPx, heightPx) {
    var key = this._aspectKey(widthPx, heightPx);
    var templates = (CONFIG.TEXT_OVERLAY || {}).TEMPLATES || {};
    var templateId = templates[key];

    if (!templateId || !String(templateId).trim()) {
      throw new Error(
        'No overlay template configured for ' + key + ' assets. Run ' +
        'setUpOverlayTemplates() from the Apps Script editor — it prints the ' +
        'one-time setup, which takes about a minute — then put the ' +
        'presentation ID in CONFIG.TEXT_OVERLAY.TEMPLATES["' + key + '"].'
      );
    }

    try {
      return DriveApp.getFileById(templateId)
        .makeCopy('insan-overlay-scratch')
        .getId();
    } catch (e) {
      throw new Error(
        'Could not copy the ' + key + ' overlay template (' + templateId + '): ' +
        e.toString() + ' Check the ID in CONFIG.TEXT_OVERLAY.TEMPLATES.'
      );
    }
  },

  _aspectKey: function(widthPx, heightPx) {
    if (widthPx === heightPx) {
      return '1:1';
    }
    return heightPx > widthPx ? '9:16' : '16:9';
  },

  _setType: function(slide, wording, pageW, pageH, cfg) {
    var marginPct = cfg.MARGIN_PCT || 0.07;
    var bandPct = cfg.BAND_HEIGHT_PCT || 0.3;
    var atTop = String(cfg.POSITION || 'bottom').toLowerCase() !== 'bottom';

    var margin = pageW * marginPct;
    var boxW = pageW - (margin * 2);
    var boxH = pageH * bandPct;
    var boxTop = atTop ? margin : pageH - boxH - margin;

    // A scrim, not a decoration. Generated artwork has no reserved space for
    // type, so contrast against whatever the model happened to put there
    // cannot be assumed. Without this the headline is legible on some assets
    // and invisible on others, which is worse than consistently plain.
    //
    // It hugs the type. Padding the band by a full margin on both sides put it
    // across 44% of the frame, which swallows the photography the generation
    // was paid for.
    if (cfg.SCRIM_ALPHA > 0) {
      var pad = margin * 0.5;
      var scrimH = boxH + pad;
      var scrimTop = atTop ? 0 : pageH - scrimH;

      var scrim = slide.insertShape(
        SlidesApp.ShapeType.RECTANGLE, 0, scrimTop, pageW, scrimH
      );
      scrim.getFill().setSolidFill(cfg.SCRIM_COLOR || '#0d1b2a', cfg.SCRIM_ALPHA);
      scrim.getBorder().setTransparent();
    }

    var box = slide.insertTextBox(wording, margin, boxTop, boxW, boxH);
    var range = box.getText();

    range.getTextStyle()
      .setFontFamily(cfg.FONT_FAMILY || 'Cairo')
      .setFontSize(this._fontSizeFor(wording, boxW, cfg))
      .setForegroundColor(cfg.TEXT_COLOR || '#ffffff')
      .setBold(cfg.BOLD !== false);

    // Arabic set left-to-right reorders the words, so the direction has to be
    // stated. The alignment is START, not END: both are relative to the text
    // direction, so in right-to-left text END means the left edge. Setting END
    // left-aligned the headline — invisible on a first line that happens to
    // fill the width, obvious the moment it wrapped and "فردي." sat alone on
    // the left.
    var paragraphs = range.getParagraphs();
    for (var i = 0; i < paragraphs.length; i++) {
      var style = paragraphs[i].getRange().getParagraphStyle();
      style.setTextDirection(SlidesApp.TextDirection.RIGHT_TO_LEFT);
      style.setParagraphAlignment(SlidesApp.ParagraphAlignment.START);
    }

    box.setContentAlignment(atTop
      ? SlidesApp.ContentAlignment.TOP
      : SlidesApp.ContentAlignment.BOTTOM);
  },

  // Long headlines were the other half of the legibility problem: one asset
  // carried two dense lines across the top fifth of the frame, which is a
  // caption rather than a headline and unreadable on a phone. Scaling down
  // keeps long wording inside the band; it does not make it good copy, so the
  // caller is warned separately.
  _fontSizeFor: function(wording, boxW, cfg) {
    var max = cfg.MAX_FONT_PT || 44;
    var min = cfg.MIN_FONT_PT || 20;

    // Roughly how wide the wording wants to be, in points, at the maximum size.
    var perChar = max * 0.52;
    var wanted = wording.length * perChar;
    var lines = Math.max(1, Math.ceil(wanted / boxW));

    if (lines <= 2) {
      return max;
    }

    return Math.max(min, Math.round(max * (2 / lines)));
  },

  _exportPage: function(presentationId, pageObjectId, sourceName) {
    var url = this.SLIDES_API + '/' + presentationId + '/pages/' +
      pageObjectId + '/thumbnail' +
      '?thumbnailProperties.mimeType=PNG' +
      '&thumbnailProperties.thumbnailSize=LARGE';

    var response = UrlFetchApp.fetch(url, {
      headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() },
      muteHttpExceptions: true
    });

    if (response.getResponseCode() !== 200) {
      throw new Error(
        'Could not export the composed asset (HTTP ' +
        response.getResponseCode() + '): ' +
        response.getContentText().substring(0, 300)
      );
    }

    var contentUrl = JSON.parse(response.getContentText()).contentUrl;
    var composed = UrlFetchApp.fetch(contentUrl, { muteHttpExceptions: true });

    if (composed.getResponseCode() !== 200) {
      throw new Error('Composed asset URL returned HTTP ' + composed.getResponseCode());
    }

    var name = String(sourceName || 'asset').replace(/\.(png|jpg|jpeg)$/i, '');

    return composed.getBlob().setName(name + '.png');
  }
};

// ---------------------------------------------------------------------------
// END SOURCE FILE: TextOverlay.gs
// ---------------------------------------------------------------------------


// ---------------------------------------------------------------------------
// BEGIN SOURCE FILE: Branding.gs
// ---------------------------------------------------------------------------
// ================================
// BRANDING OVERLAY
//
// Logos and contact numbers, composited onto finished artwork.
//
// This runs inside TextOverlay's Slides pass rather than as a worker of its
// own. That pass is a copy-export-trash per asset and it is the most expensive
// step in the visual path; a second pass would double it to add two small
// pictures and a line of type.
//
// ------------------------------------------------------------------------
// WHICH MARKS APPEAR
//
// From the row's `Hospital Brand`, following the brand architecture: a
// hospital carries the platform that governs it, the company that manages it,
// and its own mark.
//
//   INSAN   →  INSAN
//   Future  →  INSAN · Wedge Group · Future Specialized Hospital
//   Delta   →  INSAN · L'Venir Medical Service · Delta International Hospital
//
// INSAN is always first. The hierarchy reads the same way every time or it is
// not a hierarchy.
//
// ------------------------------------------------------------------------
// THE TEXT BUDGET
//
// Every post here is intended for paid promotion. Meta retired the automatic
// rejection at 20% text in 2020, but it remains guidance that affects delivery,
// so the headline band and the contact strip together are held under
// BRANDING.MAX_TEXT_BAND_PCT. Band height is a deliberately conservative proxy:
// the bands include their scrim, so the glyphs are always well inside it.
//
// Logos are artwork, not text, and are not counted against the budget — but
// they are kept small for the same reason, because three marks stacked in a
// corner is an endorsement line rather than a second headline.
// ================================

var Branding = {

  _config: function() {
    return CONFIG.BRANDING || {};
  },

  // ------------------------------------------------------------- the budget

  // Checked before anything is drawn. A band that is too tall is a
  // configuration mistake, and the place to find out is here rather than from
  // a campaign that under-delivered.
  assertTextBudget: function() {
    var cfg = this._config();
    var headline = (CONFIG.TEXT_OVERLAY || {}).BAND_HEIGHT_PCT || 0;
    var contact = (cfg.CONTACT_BAND || {}).HEIGHT_PCT || 0;
    var limit = cfg.MAX_TEXT_BAND_PCT || 0.20;
    var total = headline + contact;

    if (total > limit + 1e-9) {
      throw new Error(
        'The text bands cover ' + Math.round(total * 100) + '% of the image ' +
        '(headline ' + Math.round(headline * 100) + '%, contact ' +
        Math.round(contact * 100) + '%), over the ' + Math.round(limit * 100) +
        '% budget. Lower CONFIG.TEXT_OVERLAY.BAND_HEIGHT_PCT or ' +
        'CONFIG.BRANDING.CONTACT_BAND.HEIGHT_PCT.'
      );
    }

    return { headline: headline, contact: contact, total: total, limit: limit };
  },

  // -------------------------------------------------------------- the marks

  // The logo keys for a row, or [] when the brand is unknown.
  //
  // An unknown brand produces no marks rather than a default set: putting the
  // wrong hospital's logo on a post is worse than putting none, and it is not
  // recoverable once published.
  marksFor: function(hospitalBrand) {
    var sets = this._config().BRAND_SETS || {};
    var wanted = String(hospitalBrand || '').trim();

    if (!wanted) {
      return [];
    }

    if (sets[wanted]) {
      return sets[wanted];
    }

    // Case-insensitive second pass. The column is operator-typed.
    for (var key in sets) {
      if (key.toLowerCase() === wanted.toLowerCase()) {
        return sets[key];
      }
    }

    return [];
  },

  // Loads each mark as a blob. A mark that cannot be loaded is reported and
  // skipped — one missing file must not cost the whole asset.
  loadMarks: function(keys) {
    var cfg = this._config();
    var files = cfg.LOGOS || {};
    var out = [];
    var missing = [];

    for (var i = 0; i < keys.length; i++) {
      var name = files[keys[i]];

      if (!name) {
        missing.push(keys[i] + ' (no filename configured)');
        continue;
      }

      try {
        var blob = DriveLoader.loadProjectAsset(cfg.LOGO_FOLDER, name);

        if (!blob) {
          missing.push(keys[i] + ' (' + name + ' not found)');
          continue;
        }

        out.push({ key: keys[i], blob: blob });

      } catch (e) {
        missing.push(keys[i] + ' (' + e.toString() + ')');
      }
    }

    if (missing.length) {
      Logger.log('BRANDING | could not load: ' + missing.join(', '));
    }

    return { marks: out, missing: missing };
  },

  // ------------------------------------------------------------- placement

  // Where the marks sit. `auto` uses the corner the Media Designer reserved
  // when it wrote the image prompt — the only thing that knew what was going to
  // be in each corner before the image existed.
  cornerFor: function(rowData) {
    var placement = this._config().PLACEMENT || {};
    var configured = String(placement.CORNER || 'auto').toLowerCase();

    if (configured !== 'auto') {
      return configured;
    }

    var reserved = String((rowData || {})['Reserved Logo Corner'] || '')
      .trim().toLowerCase();

    var known = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];

    if (known.indexOf(reserved) !== -1) {
      return reserved;
    }

    return String(placement.FALLBACK_CORNER || 'top-left').toLowerCase();
  },

  // Lays the marks out inside the chosen corner. Returns one rectangle per
  // mark, in points, already inside the margin.
  //
  // The headline band owns the bottom of the frame, so a bottom corner is
  // lifted clear of it rather than overlapping — two things in one place is
  // how a logo ends up sitting on a word.
  layout: function(markCount, pageW, pageH, corner) {
    var placement = this._config().PLACEMENT || {};
    var margin = Math.min(pageW, pageH) * (placement.MARGIN_PCT || 0.05);
    var gap = Math.min(pageW, pageH) * (placement.GAP_PCT || 0.02);
    var size = Math.max(pageW, pageH) * (placement.LOGO_SCALE || 0.11);

    var horizontal = String(placement.DIRECTION || 'auto').toLowerCase() === 'row' ||
      (String(placement.DIRECTION || 'auto').toLowerCase() === 'auto' && pageW >= pageH);

    var span = markCount * size + (markCount - 1) * gap;

    // Keep the row or column inside the frame even at a large LOGO_SCALE.
    var available = (horizontal ? pageW : pageH) - (margin * 2);

    if (span > available && markCount > 0) {
      var shrink = available / span;
      size = size * shrink;
      gap = gap * shrink;
      span = markCount * size + (markCount - 1) * gap;
    }

    var atTop = corner.indexOf('top') === 0;
    var atLeft = corner.indexOf('left') !== -1;

    // The bottom band plus its scrim padding. Anything in a bottom corner
    // clears it.
    var bandH = pageH * ((CONFIG.TEXT_OVERLAY || {}).BAND_HEIGHT_PCT || 0) +
      pageH * ((this._config().CONTACT_BAND || {}).HEIGHT_PCT || 0);
    var bandTop = pageH - bandH - margin;

    var startX = atLeft ? margin : pageW - margin - (horizontal ? span : size);
    var startY = atTop ? margin : bandTop - (horizontal ? size : span) - gap;

    if (startY < margin) {
      startY = margin;
    }

    var boxes = [];

    for (var i = 0; i < markCount; i++) {
      boxes.push({
        left: horizontal ? startX + i * (size + gap) : startX,
        top: horizontal ? startY : startY + i * (size + gap),
        size: size
      });
    }

    return { boxes: boxes, size: size, horizontal: horizontal, corner: corner };
  },

  // ------------------------------------------------------------ the strip

  // "للتواصل  •  01500668657  •  01100755556"
  //
  // Returns '' when the page has no numbers configured, and the caller draws
  // nothing. A placeholder on a published post is worse than an absent line.
  contactLine: function(page) {
    var cfg = this._config();
    var contacts = cfg.CONTACT || {};
    var wanted = String(page || '').trim();
    var entry = contacts[wanted];

    if (!entry) {
      for (var key in contacts) {
        if (key.toLowerCase() === wanted.toLowerCase()) {
          entry = contacts[key];
          break;
        }
      }
    }

    if (!entry || !entry.phones || !entry.phones.length) {
      return '';
    }

    var parts = [];

    if (entry.label) {
      parts.push(entry.label);
    }

    for (var i = 0; i < entry.phones.length; i++) {
      var phone = String(entry.phones[i] || '').trim();

      if (phone) {
        parts.push(phone);
      }
    }

    if (parts.length < 2) {
      return '';
    }

    return parts.join((cfg.CONTACT_BAND || {}).SEPARATOR || '  •  ');
  },

  // -------------------------------------------------------------- drawing

  // Called from inside TextOverlay's Slides pass, after the headline is set.
  // Never throws: artwork with no logo is a fixable problem, and a row failed
  // at this point has already paid for its generation.
  apply: function(slide, rowData, pageW, pageH) {
    var cfg = this._config();

    if (cfg.ENABLED === false) {
      return { marks: 0, contact: false };
    }

    var drawn = 0;
    var contactDrawn = false;

    try {
      var keys = this.marksFor(rowData['Hospital Brand']);

      if (!keys.length) {
        Logger.log(
          'BRANDING | no logo set for Hospital Brand "' +
          String(rowData['Hospital Brand'] || '') + '" — nothing placed. An ' +
          'unrecognised brand gets no marks rather than the wrong ones.'
        );
      } else {
        var loaded = this.loadMarks(keys);
        var corner = this.cornerFor(rowData);
        var plan = this.layout(loaded.marks.length, pageW, pageH, corner);

        for (var i = 0; i < loaded.marks.length; i++) {
          var box = plan.boxes[i];
          var image = slide.insertImage(loaded.marks[i].blob);

          image.setLeft(box.left).setTop(box.top)
            .setWidth(box.size).setHeight(box.size);

          drawn++;
        }
      }

    } catch (e) {
      Logger.log('BRANDING | logo placement failed: ' + e.toString());
    }

    try {
      contactDrawn = this._drawContact(slide, rowData, pageW, pageH);
    } catch (e) {
      Logger.log('BRANDING | contact strip failed: ' + e.toString());
    }

    return { marks: drawn, contact: contactDrawn };
  },

  _drawContact: function(slide, rowData, pageW, pageH) {
    var cfg = this._config();
    var band = cfg.CONTACT_BAND || {};
    var page = rowData['Publishing Page'] || rowData['Page'] ||
      rowData['Hospital Brand'];
    var line = this.contactLine(page);

    if (!line) {
      Logger.log(
        'BRANDING | no contact numbers configured for page "' +
        String(page || '') + '" — the strip is left off rather than printed ' +
        'with a placeholder.'
      );
      return false;
    }

    var overlay = CONFIG.TEXT_OVERLAY || {};
    var margin = pageW * (overlay.MARGIN_PCT || 0.07);
    var bandH = pageH * (band.HEIGHT_PCT || 0.03);

    // Directly under the headline, inside the same scrim, so the two read as
    // one reserved zone rather than two separate intrusions.
    var top = pageH - bandH - (margin * 0.35);

    var box = slide.insertTextBox(line, margin, top, pageW - (margin * 2), bandH);
    var range = box.getText();

    range.getTextStyle()
      .setFontFamily(band.FONT_FAMILY || 'Cairo')
      .setFontSize(band.FONT_PT || 18)
      .setForegroundColor(band.TEXT_COLOR || '#ffffff')
      .setBold(false);

    var paragraphs = range.getParagraphs();

    for (var i = 0; i < paragraphs.length; i++) {
      var style = paragraphs[i].getRange().getParagraphStyle();
      style.setTextDirection(SlidesApp.TextDirection.RIGHT_TO_LEFT);
      style.setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
    }

    box.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);

    return true;
  }
};

// ---------------------------------------------------------------------------
// END SOURCE FILE: Branding.gs
// ---------------------------------------------------------------------------


// ---------------------------------------------------------------------------
// BEGIN SOURCE FILE: AssetIntegrity.gs
// ---------------------------------------------------------------------------
// ================================
// ASSET INTEGRITY
//
// Deterministic checks on generated assets, run before Visual QA sees them.
//
// Visual QA is a vision model, and it grades what it was taught to grade. On
// one carousel it wrote "Package Deviations: None. Style and narrative align
// perfectly with the brief" and scored it A — while every one of the four cards
// was 1600x900 instead of square, showing only the top half of its composition
// with the subjects cut off at the chest. The description was accurate. Nobody
// had told it that a picture has dimensions.
//
// That is the shape of the problem: a model asked to judge composition judges
// composition. Properties that are true or false by arithmetic should be
// decided by arithmetic, before a token is spent — not left to whether the
// grader happens to think of them.
//
// Everything here is checked from the image bytes and the row, never inferred.
// ================================

var AssetIntegrity = {

  // Returns { passed: bool, failures: [string], notes: [string] }.
  //
  // `images` are the decoded assets as loaded for QA: { base64, mimeType }.
  check: function(images, rowData) {
    var cfg = CONFIG.ASSET_INTEGRITY || {};
    var failures = [];
    var notes = [];

    if (!images || !images.length) {
      return {
        passed: false,
        failures: ['No readable assets were supplied.'],
        notes: notes
      };
    }

    var measured = [];

    for (var i = 0; i < images.length; i++) {
      var size = this._measure(images[i]);

      if (!size) {
        // An unreadable header is not a judgement call — the file is not an
        // image this pipeline produced.
        failures.push('Asset ' + (i + 1) + ': dimensions could not be read.');
        continue;
      }

      measured.push(size);
    }

    if (!measured.length) {
      return { passed: false, failures: failures, notes: notes };
    }

    this._checkTextApplied(rowData, failures);
    this._checkAssetCount(images, rowData, failures, notes);
    this._checkAspect(measured, rowData, failures, cfg);
    this._checkResolution(measured, failures, cfg);
    this._checkUniform(measured, failures);
    this._checkNotBlank(images, failures, cfg);
    this._checkNotDuplicated(images, failures);

    return { passed: failures.length === 0, failures: failures, notes: notes };
  },

  // The overlay keeps the artwork when it cannot set the wording — the image is
  // sound and was paid for. But the row then holds assets missing their
  // headline, and a grader has no way to know one was ever approved: it sees a
  // clean image and says so. Generation Status carries the marker; this is
  // where it stops being a log line nobody reads.
  _checkTextApplied: function(rowData, failures) {
    var marker = (typeof ServiceRunner !== 'undefined' && ServiceRunner.TEXT_MISSING_MARKER)
      ? ServiceRunner.TEXT_MISSING_MARKER
      : '[TEXT NOT APPLIED]';

    var status = String(rowData['Generation Status'] || '');

    if (status.indexOf(marker) !== -1) {
      failures.push(
        'The approved wording was never set over the artwork — the overlay ' +
        'failed for this row. The images are usable but carry no headline. ' +
        'Check the log for TEXT_OVERLAY_FAILED and re-run Media Generation.'
      );
    }
  },

  // The set that reaches QA must be the set that was asked for. A four-card
  // carousel that generated three is written as PARTIAL (3/4) and then graded,
  // approved and published as though it were whole, because nothing downstream
  // reads that status.
  _checkAssetCount: function(images, rowData, failures, notes) {
    var declared = parseInt(rowData['Asset Count'], 10);

    if (isNaN(declared) || declared < 1) {
      return;
    }

    if (images.length < declared) {
      failures.push(
        'Incomplete set: ' + images.length + ' readable asset(s) for a declared ' +
        'Asset Count of ' + declared + '. Publishing a short carousel breaks the ' +
        'sequence the copy refers to.'
      );
    } else if (images.length > declared) {
      notes.push(
        images.length + ' assets found but Asset Count says ' + declared + '.'
      );
    }
  },

  // Aspect, not exact dimensions. Assets legitimately arrive at more than one
  // size — the image model returns its own, and the text overlay re-exports at
  // the rasteriser's size — but the shape must always match the placement the
  // format was planned for.
  _checkAspect: function(measured, rowData, failures, cfg) {
    var spec = this._specFor(rowData['Content Format']);

    if (!spec || !spec.width || !spec.height) {
      return;
    }

    var wanted = spec.width / spec.height;
    var tolerance = cfg.ASPECT_TOLERANCE || 0.03;

    for (var i = 0; i < measured.length; i++) {
      var actual = measured[i].width / measured[i].height;
      var drift = Math.abs(actual - wanted) / wanted;

      if (drift > tolerance) {
        failures.push(
          'Asset ' + (i + 1) + ' is ' + measured[i].width + 'x' + measured[i].height +
          ' (' + actual.toFixed(3) + ':1) but ' + rowData['Content Format'] +
          ' requires ' + spec.width + 'x' + spec.height + ' (' + wanted.toFixed(3) +
          ':1). The artwork is cropped or stretched, not merely resized.'
        );
      }
    }
  },

  // Feed placements upscale whatever they are given. An asset well under the
  // planned size arrives soft on a phone screen, which no amount of art
  // direction recovers.
  _checkResolution: function(measured, failures, cfg) {
    var minEdge = cfg.MIN_LONG_EDGE || 1000;

    for (var i = 0; i < measured.length; i++) {
      var longest = Math.max(measured[i].width, measured[i].height);

      if (longest < minEdge) {
        failures.push(
          'Asset ' + (i + 1) + ' is ' + measured[i].width + 'x' + measured[i].height +
          '. The long edge must be at least ' + minEdge + 'px for a paid placement.'
        );
      }
    }
  },

  // A carousel is swiped. Cards of different sizes jump under the reader's
  // thumb, and it reads as a production error before the content is read at all.
  _checkUniform: function(measured, failures) {
    if (measured.length < 2) {
      return;
    }

    var first = measured[0];

    for (var i = 1; i < measured.length; i++) {
      if (measured[i].width !== first.width || measured[i].height !== first.height) {
        failures.push(
          'Cards are not the same size: asset 1 is ' + first.width + 'x' +
          first.height + ', asset ' + (i + 1) + ' is ' + measured[i].width + 'x' +
          measured[i].height + '.'
        );
        return;
      }
    }
  },

  // A blank or near-blank render compresses to almost nothing. This is a floor,
  // not a quality measure: it catches the failed generation and the composite
  // that lost its artwork, both of which describe well enough to be approved.
  _checkNotBlank: function(images, failures, cfg) {
    var floor = cfg.MIN_BYTES || 15000;

    for (var i = 0; i < images.length; i++) {
      var bytes = Math.floor(String(images[i].base64 || '').length * 0.75);

      if (bytes < floor) {
        failures.push(
          'Asset ' + (i + 1) + ' is only ' + Math.round(bytes / 1024) + 'KB. An ' +
          'image this small is blank or a failed render, whatever it appears to show.'
        );
      }
    }
  },

  // Identical cards were the visible symptom of the carousel receiving one
  // prompt N times. That cause is fixed, but the check is a byte comparison
  // costing nothing, and it fails the one defect a grader is least likely to
  // report — each card looks fine on its own.
  _checkNotDuplicated: function(images, failures) {
    for (var i = 0; i < images.length; i++) {
      for (var j = i + 1; j < images.length; j++) {
        if (images[i].base64 === images[j].base64) {
          failures.push(
            'Assets ' + (i + 1) + ' and ' + (j + 1) + ' are the same image.'
          );
          return;
        }
      }
    }
  },

  _specFor: function(contentFormat) {
    var format = String(contentFormat || '').trim().toLowerCase();
    var specs = CONFIG.MEDIA_SPECS || {};

    if (format === 'story') return specs.STORY;
    if (format === 'reel') return specs.REEL;
    if (format === 'carousel') return specs.CAROUSEL;
    if (format === 'video' || format === 'motion graphic') return specs.SHORT_VIDEO;

    return specs.STATIC_IMAGE;
  },

  // Dimensions from the file header. PNG carries them at a fixed offset; JPEG
  // requires walking the segment chain to a start-of-frame marker.
  _measure: function(image) {
    try {
      var bytes = Utilities.base64Decode(image.base64);

      if (this._isPng(bytes)) {
        return {
          width: this._readUInt32(bytes, 16),
          height: this._readUInt32(bytes, 20)
        };
      }

      if ((bytes[0] & 255) === 0xFF && (bytes[1] & 255) === 0xD8) {
        return this._measureJpeg(bytes);
      }

      return null;

    } catch (e) {
      Logger.log('ASSET_INTEGRITY | could not measure an asset: ' + e.toString());
      return null;
    }
  },

  _isPng: function(bytes) {
    return (bytes[0] & 255) === 0x89 && (bytes[1] & 255) === 0x50 &&
           (bytes[2] & 255) === 0x4E && (bytes[3] & 255) === 0x47;
  },

  _measureJpeg: function(bytes) {
    var i = 2;

    while (i < bytes.length - 9) {
      if ((bytes[i] & 255) !== 0xFF) {
        i++;
        continue;
      }

      var marker = bytes[i + 1] & 255;

      // Start-of-frame markers carry the dimensions. C4, C8 and CC are tables
      // and definitions that happen to sit in the same range.
      var isSof = marker >= 0xC0 && marker <= 0xCF &&
        marker !== 0xC4 && marker !== 0xC8 && marker !== 0xCC;

      if (isSof) {
        return {
          height: this._readUInt16(bytes, i + 5),
          width: this._readUInt16(bytes, i + 7)
        };
      }

      i += 2 + this._readUInt16(bytes, i + 2);
    }

    return null;
  },

  _readUInt16: function(bytes, offset) {
    return ((bytes[offset] & 255) << 8) | (bytes[offset + 1] & 255);
  },

  _readUInt32: function(bytes, offset) {
    return ((bytes[offset] & 255) * 16777216) +
           ((bytes[offset + 1] & 255) << 16) +
           ((bytes[offset + 2] & 255) << 8) +
           (bytes[offset + 3] & 255);
  }
};

// ---------------------------------------------------------------------------
// END SOURCE FILE: AssetIntegrity.gs
// ---------------------------------------------------------------------------


// ---------------------------------------------------------------------------
// BEGIN SOURCE FILE: AssetLibrary.gs
// ---------------------------------------------------------------------------
// ================================
// APPROVED ASSET LIBRARY  (improvement I4)
//
// Every post generates its images from scratch. `CONFIG.VISUAL_ASSETS.approved`
// has existed since the beginning and no code has ever read from it or written
// to it — so an image that passed QA is indistinguishable from one that failed,
// and the most expensive line in the system is paid again for a picture the
// ecosystem already owns.
//
// Two halves:
//
//   PROMOTE — when Visual QA approves a row, its assets move into the approved
//   folder under a name that says what they are. Drive file IDs survive a move,
//   so every URL already written to the sheet keeps resolving.
//
//   REUSE   — before generating, the operator can ask what the library already
//   holds for this kind of row, and use it instead.
//
// Reuse is deliberately operator-driven. An automatic substitution would put a
// previously-approved image behind copy nobody checked it against, and a wrong
// image on a real hospital's page costs more than a generation. The candidate
// list is the automation; the choice is not.
// ================================

var AssetLibrary = {

  // LIB__<domain>__<aspect>__<contentId>__<n>.<ext>
  //
  // The filename carries the metadata rather than an index sheet. A separate
  // index is a second source of truth that drifts the first time somebody moves
  // a file by hand — and in a Drive-backed system somebody always does.
  PREFIX: 'LIB',
  SEPARATOR: '__',

  _folderId: function(which) {
    return (CONFIG.VISUAL_ASSETS || {})[which];
  },

  // ------------------------------------------------------------ filing

  // Every asset a row produces ends up in exactly one folder, and which folder
  // it is in *is* its status:
  //
  //   generated  it exists and nobody has judged it
  //   approved   QA passed it — and it is a reuse candidate
  //   rejected   QA failed it
  //   published  it went live on a page
  //
  // Before this, only `generated` and `approved` were ever written to. A
  // rejected image stayed in `generated` alongside artwork nobody had looked at
  // yet, so the folder that should mean "not yet judged" quietly meant "some
  // mixture of not yet judged and already refused".
  //
  // Never throws. A library that cannot file an asset must not fail a row that
  // QA has just decided on, or a post that is already live on a real page.
  _fileInto: function(rowNumber, sheetName, spec) {
    try {
      var folderId = this._folderId(spec.folder);

      if (!folderId || !String(folderId).trim()) {
        return { moved: 0, reason: 'no ' + spec.folder + ' folder configured' };
      }

      var row = SheetSchema.getRowData(rowNumber, sheetName);
      var urls = String(row[spec.column] || '').trim();

      if (!urls) {
        return { moved: 0, reason: 'no ' + spec.column };
      }

      var domain = this._domainKey(row);
      var aspect = this._aspectKey(row['Content Format']);
      var contentId = String(row[CONFIG.COLUMN_NAMES.CONTENT_ID] || 'unknown').trim();

      var folder;
      try {
        folder = DriveApp.getFolderById(folderId);
      } catch (folderErr) {
        // The id is set but does not open. Silence here is what leaves approved
        // artwork sitting in `generated` with nothing to say why.
        Logger.log(
          'ASSET_LIBRARY | the "' + spec.folder + '" folder id is set but does ' +
          'not resolve — row ' + rowNumber + ' was not filed and its assets are ' +
          'still where they were. Run Maintenance → Check Visual Asset Folders. ' +
          folderErr.toString()
        );
        return { moved: 0, error: 'folder does not resolve', folder: spec.folder };
      }

      var refs = urls.split(',');
      var moved = 0;

      for (var i = 0; i < refs.length; i++) {
        var ref = refs[i].trim();

        if (!ref) {
          continue;
        }

        var idMatch = ref.match(/[-\w]{25,}/);
        var fileId = idMatch ? idMatch[0] : ref;

        try {
          var file = DriveApp.getFileById(fileId);

          // Renaming is for the folders whose contents are looked up by name.
          // A published asset already carries its library name and keeps it —
          // renaming it would strip the metadata reuse matches on.
          if (spec.prefix) {
            var extension = (file.getName().match(/\.(png|jpg|jpeg)$/i) || ['', 'png'])[1];

            file.setName([
              spec.prefix, domain, aspect, contentId, (i + 1)
            ].join(this.SEPARATOR) + '.' + extension.toLowerCase());
          }

          // Moving keeps the file id, so every URL already written to the sheet
          // still resolves. moveTo replaces all parents.
          file.moveTo(folder);
          moved++;

        } catch (fileErr) {
          Logger.log(
            'ASSET_LIBRARY | could not file asset ' + (i + 1) + ' of row ' +
            rowNumber + ' into ' + spec.folder + ': ' + fileErr.toString()
          );
        }
      }

      if (moved) {
        Logger.log(
          'ASSET_LIBRARY | filed ' + moved + ' asset(s) from row ' + rowNumber +
          ' into ' + spec.folder + ' | domain "' + domain + '" | ' + aspect
        );
      }

      return { moved: moved, domain: domain, aspect: aspect, folder: spec.folder };

    } catch (e) {
      Logger.log(
        'ASSET_LIBRARY | filing into ' + spec.folder + ' failed for row ' +
        rowNumber + ': ' + e.toString()
      );
      return { moved: 0, error: e.toString(), folder: spec.folder };
    }
  },

  // QA approved. The artwork becomes library material, so it is renamed to
  // carry what it is — the filename is the index.
  promote: function(rowNumber, sheetName) {
    return this._fileInto(rowNumber, sheetName, {
      folder: 'approved',
      column: 'Final Asset URL',
      prefix: this.PREFIX
    });
  },

  // QA rejected. Read from `Generated Assets`, because `Final Asset URL` is
  // only written on approval — on a rejection it is empty, and reading it would
  // file nothing while reporting success.
  //
  // Named `REJ`, which `_parseName` does not accept: a rejected image must not
  // become a reuse candidate even if somebody later drags it into `approved`.
  reject: function(rowNumber, sheetName) {
    return this._fileInto(rowNumber, sheetName, {
      folder: 'rejected',
      column: 'Generated Assets',
      prefix: 'REJ'
    });
  },

  // W9 put it on a page. No rename: it keeps its library name, and `published`
  // is searched for reuse alongside `approved` — artwork that actually ran is
  // the most proven thing the library holds, not the least.
  markPublished: function(rowNumber, sheetName) {
    return this._fileInto(rowNumber, sheetName, {
      folder: 'published',
      column: 'Final Asset URL',
      prefix: null
    });
  },

  // ------------------------------------------------------------ verifying

  // Opens every configured folder and reports what is actually there. Nothing
  // else in the system checks these ids, so a folder that was renamed, moved to
  // another Drive, or never created at all is invisible until artwork silently
  // fails to file — and the failure is a log line nobody reads.
  verifyFolders: function() {
    ConfigResolver.apply();

    var configured = CONFIG.VISUAL_ASSETS || {};
    var out = [];

    for (var key in configured) {
      var id = String(configured[key] || '').trim();

      if (!id) {
        out.push({ key: key, id: '', ok: false, reason: 'not set' });
        continue;
      }

      try {
        var folder = DriveApp.getFolderById(id);
        var files = folder.getFiles();
        var count = 0;

        while (files.hasNext()) {
          files.next();
          count++;
        }

        out.push({
          key: key, id: id, ok: true, name: folder.getName(), files: count
        });

      } catch (e) {
        out.push({
          key: key, id: id, ok: false,
          reason: 'does not open — wrong id, deleted, or not shared with this script'
        });
      }
    }

    return out;
  },

  // ------------------------------------------------------------------ reuse

  // What the library holds that would fit this row. Matching is deterministic
  // and narrow: the same visual domain and the same shape. Anything looser
  // would offer a corridor photograph for a cardiac post.
  //
  // Searches `approved` AND `published`. Artwork moves out of `approved` when
  // it goes live, and artwork that actually ran on a page is the most proven
  // thing here — searching only `approved` would leave the library holding the
  // sets that passed QA and were never used, which is exactly backwards.
  //
  // Returns [{ name, url, id, contentId, index }], newest first.
  candidatesFor: function(rowData) {
    var domain = this._domainKey(rowData);
    var aspect = this._aspectKey(rowData['Content Format']);
    var ownContentId = String(rowData[CONFIG.COLUMN_NAMES.CONTENT_ID] || '').trim();

    if (domain === 'none') {
      // Without a resolvable domain there is nothing to match on, and matching
      // on shape alone would offer any square image ever approved.
      return [];
    }

    var out = [];
    var searched = ['approved', 'published'];

    for (var f = 0; f < searched.length; f++) {
      var folderId = this._folderId(searched[f]);

      if (!folderId || !String(folderId).trim()) {
        continue;
      }

      try {
        var files = DriveApp.getFolderById(folderId).getFiles();

        while (files.hasNext()) {
          var file = files.next();
          var parsed = this._parseName(file.getName());

          if (!parsed || parsed.domain !== domain || parsed.aspect !== aspect) {
            continue;
          }

          // A row's own previously-approved assets are not a reuse candidate for
          // itself; that is a regeneration, not reuse.
          if (ownContentId && parsed.contentId === ownContentId) {
            continue;
          }

          out.push({
            name: file.getName(),
            url: file.getUrl(),
            id: file.getId(),
            contentId: parsed.contentId,
            index: parsed.index,
            updated: file.getLastUpdated(),
            wentLive: searched[f] === 'published'
          });
        }

      } catch (e) {
        Logger.log(
          'ASSET_LIBRARY | could not read the ' + searched[f] + ' folder: ' + e.toString()
        );
      }
    }

    out.sort(function(a, b) { return b.updated.getTime() - a.updated.getTime(); });

    return out;
  },

  // Groups candidates by the row they came from, because a carousel is reused
  // as a set or not at all — three cards from three different posts is not a
  // sequence, it is three pictures.
  candidateSets: function(rowData) {
    var candidates = this.candidatesFor(rowData);
    var sets = {};
    var order = [];

    for (var i = 0; i < candidates.length; i++) {
      var id = candidates[i].contentId;

      if (!sets[id]) {
        sets[id] = {
          contentId: id, assets: [], newest: candidates[i].updated, wentLive: false
        };
        order.push(sets[id]);
      }

      sets[id].assets.push(candidates[i]);

      // Worth surfacing when the operator picks: a set that already ran on a
      // page has been judged by more than QA.
      if (candidates[i].wentLive) {
        sets[id].wentLive = true;
      }
    }

    for (var s = 0; s < order.length; s++) {
      order[s].assets.sort(function(a, b) { return a.index - b.index; });
    }

    return order;
  },

  // Puts a chosen set onto a row and sends it to QA. Generation is skipped
  // entirely — but QA is not, because the question reuse raises is exactly the
  // one QA answers: does this artwork suit this post?
  applySet: function(rowNumber, set, sheetName) {
    var urls = [];

    for (var i = 0; i < set.assets.length; i++) {
      urls.push(set.assets[i].url);
    }

    SheetWriter.writeCell(rowNumber, 'Generated Assets', urls.join(', '), sheetName);
    SheetWriter.writeCell(rowNumber, 'Generation Status',
      'REUSED from ' + set.contentId, sheetName);
    SheetWriter.writeCell(rowNumber, 'Generation Timestamp', new Date(), sheetName);

    // Clears any stale QA verdict, then hands it to QA as a fresh set.
    SheetWriter.clearDownstreamOutput(rowNumber, 'MEDIA_GENERATION');
    _transitionVisualStage(rowNumber, 'QA', sheetName);
    SpreadsheetApp.flush();

    Logger.logSuccess(
      'ASSET_LIBRARY', rowNumber, 0, 0, 0,
      'Reused ' + set.assets.length + ' approved asset(s) from ' + set.contentId +
      ' — generation skipped, QA still required'
    );

    return { assets: set.assets.length, from: set.contentId };
  },

  // ------------------------------------------------------------------ keys

  _domainKey: function(rowData) {
    try {
      var domain = DriveLoader.resolveAssetDomain(rowData);
      return domain && domain.key ? domain.key : 'none';
    } catch (e) {
      return 'none';
    }
  },

  // Shape, not size. The library is matched on what a placement needs.
  _aspectKey: function(contentFormat) {
    var format = String(contentFormat || '').trim().toLowerCase();
    return (format === 'story' || format === 'reel') ? '9x16' : '1x1';
  },

  _parseName: function(name) {
    var base = String(name || '').replace(/\.(png|jpg|jpeg)$/i, '');
    var parts = base.split(this.SEPARATOR);

    if (parts.length !== 5 || parts[0] !== this.PREFIX) {
      return null;
    }

    return {
      domain: parts[1],
      aspect: parts[2],
      contentId: parts[3],
      index: parseInt(parts[4], 10) || 1
    };
  }
};


// ================================
// MENU — AI Workers → Maintenance → Check Visual Asset Folders
//
// Five folder ids have been configured since 2026-07-25 and nothing has ever
// verified that they open. Three of them had no code reading or writing them at
// all, so a wrong id would have stayed invisible until artwork silently failed
// to file — and that failure is a log line.
// ================================

function checkVisualAssetFolders() {
  var ui = SpreadsheetApp.getUi();

  try {
    var results = AssetLibrary.verifyFolders();
    var purpose = {
      generated: 'where every generated image lands, before anyone judges it',
      approved:  'QA passed it — and it is offered for reuse',
      rejected:  'QA failed it',
      published: 'it went live on a page — also offered for reuse',
      archive:   'no code reads or writes this folder'
    };

    var lines = ['One folder per status. Which folder a file sits in is its status.', ''];
    var broken = 0;

    for (var i = 0; i < results.length; i++) {
      var r = results[i];

      if (r.ok) {
        lines.push('OK      ' + r.key);
        lines.push('        "' + r.name + '" — ' + r.files + ' file(s)');
      } else {
        broken++;
        lines.push('BROKEN  ' + r.key);
        lines.push('        ' + r.reason);
        lines.push('        id: ' + (r.id || '(empty)'));
      }

      lines.push('        ' + purpose[r.key]);
      lines.push('');
    }

    if (broken) {
      lines.push('─────────────────────────────');
      lines.push(broken + ' folder(s) do not open.');
      lines.push('');
      lines.push('Nothing breaks immediately: filing never fails a row, so a post');
      lines.push('still gets approved and still gets published. What is lost is the');
      lines.push('sorting — the artwork stays where it was, and the folders stop');
      lines.push('telling you anything.');
      lines.push('');
      lines.push('Either create the folder in Drive and put its id in CONFIG.gs, or');
      lines.push('set the matching Script Property — VISUAL_ASSETS_APPROVED,');
      lines.push('VISUAL_ASSETS_REJECTED, VISUAL_ASSETS_PUBLISHED.');
    } else {
      lines.push('─────────────────────────────');
      lines.push('All five open.');
    }

    ui.alert('Visual Asset Folders', lines.join('\n'), ui.ButtonSet.OK);

  } catch (e) {
    ui.alert('Visual Asset Folders', e.message || e.toString(), ui.ButtonSet.OK);
  }
}


// ================================
// MENU — AI Workers → Visual Team → Reuse An Approved Asset
// ================================

function reuseApprovedAsset() {
  var ui = SpreadsheetApp.getUi();
  var sheetName = CONFIG.VISUAL_PIPELINE.SHEET_NAME;

  ConfigResolver.apply();

  var response = ui.prompt(
    'Reuse An Approved Asset',
    'Which Visual Pipeline row?',
    ui.ButtonSet.OK_CANCEL
  );

  if (response.getSelectedButton() !== ui.Button.OK) {
    return;
  }

  var rowNumber = parseInt(response.getResponseText(), 10);

  if (isNaN(rowNumber) || rowNumber < CONFIG.DATA_START_ROW) {
    ui.alert('Reuse An Approved Asset', 'That is not a data row.', ui.ButtonSet.OK);
    return;
  }

  try {
    var rowData = SheetSchema.getRowData(rowNumber, sheetName);
    var sets = AssetLibrary.candidateSets(rowData);

    if (!sets.length) {
      ui.alert(
        'Reuse An Approved Asset',
        'Nothing in the library matches this row.\n\n' +
        'Matching is on visual domain and shape, and both have to agree — a ' +
        'square ICU image is not offered for a vertical dental post. An empty ' +
        'result usually means either the library has not accumulated anything ' +
        'for this domain yet, or the row has no resolvable domain.',
        ui.ButtonSet.OK
      );
      return;
    }

    var lines = [
      'Approved sets that match this row:',
      ''
    ];

    for (var i = 0; i < Math.min(sets.length, 8); i++) {
      lines.push(
        (i + 1) + ')  ' + sets[i].assets.length + ' asset(s) from ' +
        sets[i].contentId + (sets[i].wentLive ? '   [went live]' : '')
      );
      lines.push('     ' + sets[i].assets[0].url);
    }

    lines.push('');
    lines.push('Enter a number to use that set, or Cancel.');
    lines.push('');
    lines.push('The row will skip generation and go straight to Visual QA —');
    lines.push('reuse changes what the artwork costs, not whether it is checked.');

    var choice = ui.prompt('Reuse An Approved Asset', lines.join('\n'), ui.ButtonSet.OK_CANCEL);

    if (choice.getSelectedButton() !== ui.Button.OK) {
      return;
    }

    var index = parseInt(choice.getResponseText(), 10);

    if (isNaN(index) || index < 1 || index > Math.min(sets.length, 8)) {
      ui.alert('Reuse An Approved Asset', 'No set with that number.', ui.ButtonSet.OK);
      return;
    }

    var applied = AssetLibrary.applySet(rowNumber, sets[index - 1], sheetName);

    ui.alert(
      'Reuse An Approved Asset',
      applied.assets + ' asset(s) reused from ' + applied.from + '.\n\n' +
      'Row ' + rowNumber + ' is now at QA. Generation was skipped.',
      ui.ButtonSet.OK
    );

  } catch (e) {
    ui.alert('Reuse An Approved Asset', e.message || e.toString(), ui.ButtonSet.OK);
  }
}

// ---------------------------------------------------------------------------
// END SOURCE FILE: AssetLibrary.gs
// ---------------------------------------------------------------------------


// ---------------------------------------------------------------------------
// BEGIN SOURCE FILE: VisualPlan.gs
// ---------------------------------------------------------------------------
// DETERMINISTIC VISUAL PLAN — I3
//
// The Visual Planner writes exactly three columns, at 6,584 input tokens a row:
//
//   Asset Count              derivable from Content Format
//   Production Mode          already computed by DriveLoader.resolveAssetDomain
//   Reference Asset Package  largely restates the Creative Director's Design Prompt
//
// Two of three outputs are deterministic and the third duplicates upstream work.
// (VERDICT_AND_IMPROVEMENTS.md, improvement I3.)
//
// On Asset Count this is not merely cheaper, it is more accurate. A carousel's
// real asset count is the number of scenes the Creative Director actually wrote,
// and ServiceRunner throws when the two disagree — a row planned for five cards
// against a prompt describing three fails at generation, after strategy, copy
// and creative direction have all been paid for. Counting the scenes cannot
// disagree with them.
//
// Off by default. The visual pipeline has never completed a production run
// (Audit A, finding F19), and changing it before verifying it means verifying
// something other than what has been running. Verify first, then set
// CONFIG.VISUAL_PLAN.ENABLED to true.

var VisualPlan = {

  _config: function() {
    return CONFIG.VISUAL_PLAN || {};
  },

  isEnabled: function() {
    return !!this._config().ENABLED;
  },

  // ------------------------------------------------------------ asset count

  // For a carousel, the Creative Director's scene count is the answer. It is not
  // an estimate of what the row needs — it is what the row has direction for.
  assetCount: function(rowData) {
    var format = String(rowData['Content Format'] || '').trim().toLowerCase();
    var specs = this._specsFor(format);

    if (format !== 'carousel') {
      return specs.assetCount;
    }

    var scenes = this._sceneCount(rowData['Creative Director Design Prompt']) ||
      this._sceneCount(rowData['Design Prompt (AI)']);

    if (!scenes) {
      // No per-scene direction was written. Returning the default here would
      // hand the generator N copies of one paragraph; ServiceRunner refuses
      // that and sends the row back, which is the correct place for it to fail.
      return specs.assetCount;
    }

    return Math.max(
      specs.minAssetCount || 2,
      Math.min(scenes, specs.maxAssetCount || 10)
    );
  },

  // Mirrors ServiceRunner._segmentByAsset without importing its stripping: this
  // only needs to know how many scenes there are, not what they say.
  _sceneCount: function(designPrompt) {
    var raw = String(designPrompt || '');

    if (!raw.trim()) {
      return 0;
    }

    if (raw.indexOf('|') !== -1) {
      var pieces = raw.split('|').filter(function(p) { return p.trim(); });
      return pieces.length > 1 ? pieces.length : 0;
    }

    var markerRe = /(?:^|[\s.;,\-–—(])(?:slide|card|panel|frame|شريحة|كارت|لوحة)\s*#?\s*(\d+)\s*[:\-–—.)]/gi;
    var count = 0;

    while (markerRe.exec(raw) !== null) {
      count++;
    }

    return count > 1 ? count : 0;
  },

  _specsFor: function(format) {
    var specs = CONFIG.MEDIA_SPECS || {};

    switch (format) {
      case 'carousel':   return specs.CAROUSEL   || { assetCount: 3 };
      case 'story':      return specs.STORY      || { assetCount: 1 };
      case 'reel':       return specs.REEL       || { assetCount: 1 };
      case 'video':      return specs.SHORT_VIDEO || { assetCount: 1 };
      default:           return specs.STATIC_IMAGE || { assetCount: 1 };
    }
  },

  // --------------------------------------------------------- production mode

  // The decision was always deterministic: either photographs of this facility
  // exist for the row's domain or they do not. The Visual Planner was asked to
  // decide it from a folder listing the code had already read for it.
  productionMode: function(rowData) {
    try {
      var domain = DriveLoader.resolveAssetDomain(rowData);
      var assets = DriveLoader.listProjectAssets(domain);

      return {
        mode: assets.length ? 'PROJECT_ASSET' : 'AI_GENERATED',
        domain: domain ? domain.folder : null,
        assets: assets
      };

    } catch (e) {
      // A folder that cannot be read is not a reason to fail a row. Generating
      // is always possible; referencing is not.
      Logger.log('VISUAL_PLAN | asset lookup failed, defaulting to AI_GENERATED: ' +
        e.toString());
      return { mode: 'AI_GENERATED', domain: null, assets: [] };
    }
  },

  // ------------------------------------------------------------- the package

  // The Reference Asset Package tells the Media Designer what it is working
  // with. The creative direction it needs was already written by the Creative
  // Director; what it does not have is the production context — how many assets,
  // at what shape, against which photographs.
  //
  // So this composes the context and points at the direction, rather than
  // paraphrasing direction that already exists. A paraphrase is a second, worse
  // copy of the brief that can drift from the first.
  referencePackage: function(rowData, count, production) {
    var format = String(rowData['Content Format'] || 'Static').trim();
    var specs = this._specsFor(format.toLowerCase());
    var lines = [];

    lines.push(format + ' — ' + count + ' asset' + (count === 1 ? '' : 's') +
      ' at ' + (specs.aspectRatio || '1:1') +
      ' (' + (specs.width || 1080) + '×' + (specs.height || 1080) + ')');

    if (production.mode === 'PROJECT_ASSET') {
      lines.push('');
      lines.push('Production mode: PROJECT_ASSET.');
      lines.push('Real photographs of this facility are supplied as visual ' +
        'reference from the "' + production.domain + '" domain:');

      for (var i = 0; i < Math.min(production.assets.length, 12); i++) {
        lines.push('  - ' + production.assets[i]);
      }

      if (production.assets.length > 12) {
        lines.push('  … and ' + (production.assets.length - 12) + ' more');
      }

      lines.push('');
      lines.push('Architecture, finishes and equipment come from the ' +
        'photographs. Complement them rather than describing an environment ' +
        'from scratch.');
    } else {
      lines.push('');
      lines.push('Production mode: AI_GENERATED.');
      lines.push('No project photographs are available' +
        (production.domain ? ' for the "' + production.domain + '" domain' : '') +
        '. Describe the environment fully — nothing visual is supplied.');
    }

    if (count > 1) {
      var scenes = this._sceneCount(rowData['Creative Director Design Prompt']);
      lines.push('');
      lines.push(scenes
        ? 'The Creative Director Design Prompt carries ' + scenes +
          ' distinct scenes. One asset per scene, in order.'
        : 'The Creative Director Design Prompt is not segmented per scene. ' +
          'This row needs per-card direction before it can be produced.');
    }

    lines.push('');
    lines.push('Creative direction: use the Creative Director Design Prompt as ' +
      'written. It is the approved brief and is not restated here.');

    return lines.join('\n');
  },

  // --------------------------------------------------------------- the entry

  // Returns the three values the Visual Planner would have written, computed.
  plan: function(rowData) {
    var production = this.productionMode(rowData);
    var count = this.assetCount(rowData);

    return {
      'Asset Count': count,
      'Production Mode': production.mode,
      'Reference Asset Package': this.referencePackage(rowData, count, production)
    };
  }
};

// ---------------------------------------------------------------------------
// END SOURCE FILE: VisualPlan.gs
// ---------------------------------------------------------------------------


// ---------------------------------------------------------------------------
// BEGIN SOURCE FILE: ServiceRunner.gs
// ---------------------------------------------------------------------------
var ServiceRunner = {

  // Written into Generation Status when the approved wording could not be set
  // over the artwork. AssetIntegrity reads it and holds the row back.
  TEXT_MISSING_MARKER: '[TEXT NOT APPLIED]',

  // Set per row by _composeVisibleText.
  _textMissing: false,

  runMediaGeneration: function(startRow, endRow) {
    // Identifiers from Script Properties where set, CONFIG.gs otherwise.
    // Idempotent; see ConfigResolver (Audit A, F17).
    ConfigResolver.apply();

    var config = CONFIG.SERVICES.MEDIA_GENERATION;
    var sheetName = config.sheetName;
    var lastRow = SheetSchema.getLastRow(sheetName);

    startRow = Math.max(startRow, CONFIG.DATA_START_ROW);
    endRow = Math.min(endRow, lastRow);

    var timeoutMs = (CONFIG.BATCH_TIMEOUT_SECONDS || 300) * 1000;
    var batchStart = new Date().getTime();
    var runStart = RunControl.runStart(batchStart);
    var results = [];
    var successCount = 0;
    var failCount = 0;
    var interrupted = false;
    var stopped = false;
    var lastProcessedRow = null;
    var nextRow = startRow;

    for (var row = startRow; row <= endRow; row++) {
      // Generation is the expensive step — one call per asset — so an operator
      // who wants it stopped is usually watching money leave. Checked before
      // the row, not after.
      if (RunControl.stopRequested(runStart)) {
        interrupted = true;
        stopped = true;
        RunControl.clear();
        Logger.log('OPERATOR_STOP | MEDIA_GENERATION | stopped before row ' + row);
        break;
      }

      var result = this._processMediaGenerationRow(row);

      results.push(result);
      lastProcessedRow = row;
      nextRow = row + 1;

      if (result.success) {
        successCount++;
      } else {
        failCount++;
      }

      if (row < endRow) {
        var elapsed = new Date().getTime() - batchStart;
        if (elapsed >= timeoutMs) {
          interrupted = true;
          break;
        }
        Utilities.sleep(2000);
      }
    }

    var status = interrupted
      ? (stopped ? 'STOPPED' : 'TIMEOUT')
      : (failCount === 0 ? 'SUCCESS' : 'PARTIAL');

    Logger.logExecution({
      worker: 'MEDIA_GENERATION_SERVICE',
      row: startRow + '-' + (interrupted
        ? (lastProcessedRow === null ? startRow : lastProcessedRow)
        : endRow),
      status: status,
      runtime: new Date().getTime() - batchStart,
      details: 'Batch: ' + successCount + ' success, ' + failCount + ' failed' +
        (interrupted
          ? (stopped
              ? ' (stopped by operator - resume from row ' + nextRow + ')'
              : ' (timeout - resume from row ' + nextRow + ')')
          : '')
    });

    return {
      totalRows: results.length,
      success: successCount,
      failed: failCount,
      interrupted: interrupted,
      stopped: stopped,
      nextRow: interrupted ? nextRow : null,
      results: results
    };
  },

  _processMediaGenerationRow: function(rowNumber) {
    var startTime = new Date().getTime();
    var config = CONFIG.SERVICES.MEDIA_GENERATION;
    var sheetName = config.sheetName;

    try {
      var rowData = SheetSchema.getRowData(rowNumber, sheetName);

      var currentStage = rowData['VISUAL_STAGE'];
      if (currentStage !== 'GENERATING') {
        var runtime = new Date().getTime() - startTime;
        Logger.logFailure('MEDIA_GENERATION_SERVICE', rowNumber, runtime,
          'Skipping row ' + rowNumber + ': VISUAL_STAGE is "' +
          currentStage + '", expected "GENERATING"');
        return {
          success: false,
          row: rowNumber,
          error: 'Skipping row ' + rowNumber + ': VISUAL_STAGE is "' +
            currentStage + '", expected "GENERATING"',
          runtime: runtime
        };
      }

      var contentFormat = rowData['Content Format'];

      if (this._isVideoFormat(contentFormat)) {
        var runtime = new Date().getTime() - startTime;
        Logger.logFailure('MEDIA_GENERATION_SERVICE', rowNumber, runtime,
          'Video generation not yet implemented. Format: ' + contentFormat);
        return {
          success: false,
          row: rowNumber,
          error: 'Video generation not yet implemented. Format: ' + contentFormat,
          runtime: runtime
        };
      }

      var specs = this._getMediaSpecs(contentFormat);
      var assetCount = this._getAssetCount(rowData);

      // A previous run's QA verdict describes images that are about to be
      // replaced. Clear it before generating, not after.
      SheetWriter.clearDownstreamOutput(rowNumber, 'MEDIA_GENERATION');

      // Resolved once per row so every asset in a carousel carries the same
      // version — they are one attempt, not several.
      var assetVersion = this._resolveAssetVersion(rowData['Content ID']);

      var allUrls = [];
      var assetFailures = [];

      // Reset per row: this is a script global, and a stale true would hold
      // back a row whose overlay worked.
      this._textMissing = false;

      // Mode A: if real photographs of this facility exist, they become the
      // visual reference. Previously the Production Mode column was written by
      // the Visual Planner and then read by nothing at all, so every asset was
      // invented from a text description with no photographic ground truth.
      var assetDomain = DriveLoader.resolveAssetDomain(rowData);
      var referenceImages = DriveLoader.loadProjectAssets(assetDomain);
      var usingReference = referenceImages.length > 0;

      if (usingReference) {
        Logger.log(
          'MEDIA_GENERATION | Row ' + rowNumber + ' | PROJECT_ASSET mode | domain "' +
          assetDomain.key + '" | ' + referenceImages.length + ' reference image(s)'
        );
      } else if (assetDomain) {
        Logger.log(
          'MEDIA_GENERATION | Row ' + rowNumber + ' | domain "' + assetDomain.key +
          '" matched but no usable images found — generating without reference'
        );
      }

      // The Media Designer composes every prompt for the row in one pass, so it
      // can hold the whole carousel in view and make the cards a sequence
      // rather than three independent attempts at one picture.
      var composed = this._composePrompts(rowData, assetCount, usingReference, rowNumber);

      for (var i = 0; i < assetCount; i++) {
        var slidePrompt = composed[i];

        // One failed asset must not discard the assets already generated for
        // this row. Keep going, and report the shortfall rather than claiming
        // a clean SUCCESS on an incomplete set.
        try {
          var imageResult = ImageProvider.generate(slidePrompt, {
            aspectRatio: specs.aspectRatio,
            referenceImages: referenceImages
          });

          // The wording is set as type over the finished artwork rather than
          // requested from the image model. Generation above was told to
          // produce no text at all.
          imageResult.images = this._composeVisibleText(
            imageResult.images, rowData, i, assetCount, specs, rowNumber
          );

          var fileUrl = this._storeGeneratedImages(
            imageResult.images,
            rowData['Content ID'] + (assetCount > 1 ? '_S' + (i + 1) : ''),
            assetVersion
          );

          allUrls.push(fileUrl);

        } catch (assetErr) {
          assetFailures.push('asset ' + (i + 1) + ': ' + assetErr.toString());
          Logger.log(
            'ASSET_GENERATION_FAILED | Row: ' + rowNumber +
            ' | asset ' + (i + 1) + '/' + assetCount + ' | ' + assetErr.toString()
          );
        }
      }

      if (!allUrls.length) {
        throw new Error(
          'No assets were generated for this row. ' + assetFailures.join(' | ')
        );
      }

      var finalUrls = allUrls.join(', ');
      var isPartial = allUrls.length < assetCount;

      var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
      var columnMap = SheetSchema._getColumnMap(sheetName);

      var status = isPartial
        ? 'PARTIAL (' + allUrls.length + '/' + assetCount + ')'
        : 'SUCCESS';

      if (this._textMissing) {
        status += ' ' + this.TEXT_MISSING_MARKER;
      }

      this._writeResult(sheet, columnMap, rowNumber, {
        'Generated Assets': finalUrls,
        'Generation Status': status,
        'Generation Timestamp': new Date()
      });

      if (isPartial) {
        Logger.logPartial('MEDIA_GENERATION_SERVICE', rowNumber, 0,
          assetVersion + ': generated ' + allUrls.length + ' of ' + assetCount +
          ' assets. ' + assetFailures.join(' | '));
      }

      Logger.log(
        'ASSET_VERSION | Row: ' + rowNumber + ' | ' + rowData['Content ID'] +
        ' | ' + assetVersion + ' | ' + allUrls.length + ' asset(s)'
      );

      SheetWriter.writeAIWorkerTag(rowNumber, 'MEDIA_GENERATION_SERVICE', sheetName);

      _applyMediaGenerationStageMapping(rowNumber, true, sheetName);

      var endTime = new Date().getTime();
      var runtime = endTime - startTime;

      Logger.logSuccess(
        'MEDIA_GENERATION_SERVICE', rowNumber, runtime, 0, 0,
        assetVersion + ': generated ' + allUrls.length +
        ' image(s) [' + contentFormat + ']'
      );

      return {
        success: true,
        row: rowNumber,
        imagesGenerated: allUrls.length,
        fileUrl: finalUrls,
        runtime: runtime
      };

    } catch (e) {
      var endTime = new Date().getTime();
      var runtime = endTime - startTime;

      this._writeGenerationFailure(rowNumber, e.toString());

      _applyMediaGenerationStageMapping(rowNumber, false, sheetName);

      Logger.logFailure(
        'MEDIA_GENERATION_SERVICE', rowNumber, runtime, e.toString()
      );

      return {
        success: false,
        row: rowNumber,
        error: e.toString(),
        runtime: runtime
      };
    }
  },

  // Production terminology that must never reach the image model as renderable
  // text. Column data still carries it (Creative Director writes "Slide 1:" /
  // "شريحة 1:" inside Design Prompt and Text On Design), so it is stripped here.
  _INTERNAL_LABEL_RE: /(?:^|[\s.;,\-–—(])\s*(?:slide|card|panel|frame|شريحة|كارت|لوحة)\s*#?\s*\d+\s*(?:of\s*\d+\s*)?[:\-–—.)]?\s*/gi,

  _stripInternalLabels: function(text) {
    if (!text) {
      return '';
    }
    return String(text)
      .replace(this._INTERNAL_LABEL_RE, ' ')
      .replace(/\s{2,}/g, ' ')
      .trim();
  },

  // Per-asset segmentation. The Creative Director now separates multi-asset
  // direction with "|". Legacy rows still carry "Slide 1:" / "شريحة 1:" style
  // numbering, so both shapes are supported and both are stripped of labels.
  // Returns { preamble, segments } or null when the text is not segmented.
  _segmentByAsset: function(text) {
    var raw = String(text || '');

    if (!raw.trim()) {
      return null;
    }

    if (raw.indexOf('|') !== -1) {
      var piped = [];
      var pieces = raw.split('|');

      for (var p = 0; p < pieces.length; p++) {
        var piece = this._stripInternalLabels(pieces[p]);
        if (piece) {
          piped.push(piece);
        }
      }

      return piped.length > 1 ? { preamble: '', segments: piped } : null;
    }

    var markerRe = /(?:^|[\s.;,\-–—(])(?:slide|card|panel|frame|شريحة|كارت|لوحة)\s*#?\s*(\d+)\s*[:\-–—.)]/gi;
    var marks = [];
    var m;

    while ((m = markerRe.exec(raw)) !== null) {
      marks.push({ start: m.index, end: markerRe.lastIndex });
    }

    if (marks.length < 2) {
      return null;
    }

    var segments = [];
    for (var i = 0; i < marks.length; i++) {
      var sliceEnd = (i + 1 < marks.length) ? marks[i + 1].start : raw.length;
      var body = this._stripInternalLabels(raw.substring(marks[i].end, sliceEnd));
      if (body) {
        segments.push(body);
      }
    }

    if (!segments.length) {
      return null;
    }

    return {
      preamble: this._stripInternalLabels(raw.substring(0, marks[0].start)),
      segments: segments
    };
  },

  // Each carousel asset gets its own scene instead of N copies of one prompt.
  //
  // Falling back to the whole prompt when it is not segmented was the quiet
  // failure: a three-card carousel whose Creative Director wrote one paragraph
  // received one byte-identical prompt three times, and the resulting cards were
  // three attempts at the same picture. It looked like the image model refusing
  // to vary. It was the assembly handing it nothing to vary.
  //
  // Throwing instead sends the row back to the Creative Director, where the
  // missing per-card direction actually belongs. Three identical generations
  // cost three generations.
  _extractSlideSegment: function(designPrompt, index, assetCount) {
    var text = String(designPrompt || '');

    if (assetCount <= 1) {
      return this._stripInternalLabels(text);
    }

    var split = this._segmentByAsset(text);

    if (!split) {
      throw new Error(
        'Carousel of ' + assetCount + ' cards has no per-card direction. The ' +
        'Creative Director Design Prompt must separate each card with "|" — ' +
        'one distinct scene per card. Generating without it produces ' +
        assetCount + ' copies of the same image. Re-run the Creative Director.'
      );
    }

    if (split.segments.length < assetCount) {
      throw new Error(
        'Carousel needs ' + assetCount + ' distinct scenes but the Creative ' +
        'Director Design Prompt describes only ' + split.segments.length +
        '. Re-run the Creative Director, or set Asset Count to ' +
        split.segments.length + '.'
      );
    }

    var segment = split.segments[index];
    return split.preamble ? (split.preamble + ' ' + segment) : segment;
  },

  // Approved visible text for this asset. Carousel Text On Design is often
  // enumerated per slide; each asset renders only its own line.
  _resolveVisibleText: function(rowData, index, assetCount) {
    var raw = rowData['Text On Design'];

    if (!raw) {
      return '';
    }

    var text = String(raw).trim();

    if (!text || /^none$/i.test(text) || text === 'لا يوجد') {
      return '';
    }

    if (assetCount <= 1) {
      return this._stripInternalLabels(text);
    }

    var split = this._segmentByAsset(text);

    if (!split) {
      return this._stripInternalLabels(text);
    }

    return split.segments[Math.min(index, split.segments.length - 1)];
  },

  // The Reference Asset Package is written for the production system, not for an
  // image model: it carries ALL-CAPS section headers and status lines that would
  // otherwise be candidates for rendering as artwork text.
  _sanitizeBrief: function(text) {
    var brief = String(text || '').trim();

    if (!brief) {
      return '';
    }

    return brief
      // Status/meta sections carry no visual direction.
      .replace(/PRODUCTION\s+READINESS\s*:[\s\S]*$/i, ' ')
      .replace(/PRODUCTION\s+MODE\s*:\s*(?:AI_GENERATED|PROJECT_ASSET)?/gi, ' ')
      // Keep the body of remaining sections, drop the shouted header.
      .replace(/\b[A-Z][A-Z_ ]{3,}\s*:/g, ' ')
      // Numbered constraint lists read as slide numbering to an image model.
      .replace(/(?:^|\s)\d+\s*[.)]\s+/g, ' ')
      .replace(/\bAI_GENERATED\b|\bPROJECT_ASSET\b/g, ' ')
      .replace(/\s{2,}/g, ' ')
      .replace(/\s+([.,;])/g, '$1')
      .trim();
  },

  _buildGenerationPrompt: function(rowData, index, assetCount, usingReference) {
    index = index || 0;
    assetCount = assetCount || 1;

    var parts = [];

    // Stated first so the attached photographs are read as the environment to
    // reproduce, not as loose inspiration.
    if (usingReference) {
      parts.push(
        'Use the attached photographs as the visual reference for the real ' +
        'environment: match the architecture, interior finishes, equipment, ' +
        'uniforms and lighting character shown in them. Reproduce this specific ' +
        'facility rather than a generic hospital. Do not copy any person from ' +
        'the references, and do not reproduce any text, signage or logo visible ' +
        'in them'
      );
    }

    var scene = this._extractSlideSegment(
      rowData['Creative Director Design Prompt'], index, assetCount
    );
    if (scene) {
      parts.push(scene);
    }

    var concept = this._stripInternalLabels(rowData['Visual Concept']);
    if (concept) {
      parts.push(concept);
    }

    var elements = this._stripInternalLabels(rowData['Visual Elements']);
    if (elements) {
      parts.push(elements);
    }

    var focus = rowData['Visual Focus'];
    var composition = rowData['Composition'];
    if (focus || composition) {
      var framing = [];
      if (focus) {
        framing.push('the ' + String(focus).trim().toLowerCase() +
          ' is the primary subject and focal point');
      }
      if (composition) {
        framing.push(String(composition).trim().toLowerCase() + ' framing');
      }
      parts.push(framing.join(', '));
    }

    // Visual Planner's Reference Asset Package is the approved production brief.
    // Previously written to the sheet and never read.
    var brief = this._sanitizeBrief(rowData['Reference Asset Package']);
    if (brief) {
      parts.push(brief);
    }

    if (assetCount > 1) {
      parts.push(
        'This is one image in a set of ' + assetCount +
        ' that must read as a single visual family: identical art direction, ' +
        'colour grading, lighting and rendering style across the set, with a ' +
        'distinct scene and camera framing in each'
      );
    }

    // Light and mood are stated positively, without naming a medium. This used
    // to assert "clearly crafted artwork rather than a photograph" here, after
    // the Creative Director's own Design Prompt had already stated a style
    // ratio — on one row, literally "Photographic style... 30% editorial
    // photography" followed two sentences later by a flat instruction that it
    // was not a photograph. A model handed two contradictory style directions
    // does not average them; it picks one, and B6/B7 (cold photorealism,
    // full cartoon) were both that model resolving a contradiction this
    // function created. The Design Prompt's own style words are the only
    // style instruction now; this line only adds the mood a bare fallback
    // brief may be missing.
    parts.push(
      'Warm, light-filled interior with soft directional daylight, gentle ' +
      'shadows and a warm neutral palette. Natural unposed human expression'
    );

    // No text is ever requested. The headline is composited afterwards by
    // TextOverlay, so asking for it here would put a second, misspelled copy on
    // the artwork — which is exactly what happened when both ran.
    //
    // Reserving the band it will occupy is the one thing generation still has
    // to do: the model cannot be told the wording, but it can be told to leave
    // the area quiet so real type has somewhere to sit.
    var cfg = CONFIG.TEXT_OVERLAY || {};
    var willOverlay = cfg.ENABLED &&
      !!this._resolveVisibleText(rowData, index, assetCount);

    parts.push('The image contains no text, lettering, numerals or captions of any kind');

    if (willOverlay) {
      parts.push(
        'Leave the ' + (String(cfg.POSITION || 'bottom').toLowerCase() === 'top'
          ? 'upper' : 'lower') +
        ' third of the frame visually quiet — no faces, hands or key detail ' +
        'there. Keep the subject and the point of interest clear of that band'
      );
    }

    parts.push(this._buildExclusions(rowData['Do NOT Show']));

    return this._stripProductionValueLanguage(
      parts.join('. ').replace(/\.\s*\./g, '.')
    ) + '.';
  },

  // Production-value adjectives describe budget, not imagery. A model cannot
  // draw "high-end", and their presence displaces words that carry an actual
  // picture. Four of five concepts in production opened with one of these.
  _stripProductionValueLanguage: function(text) {
    return String(text || '')
      .replace(
        /\b(?:high[-\s]?production|high[-\s]?end|cinematic|premium|state[-\s]?of[-\s]?the[-\s]?art|world[-\s]?class|stunning|breathtaking|luxurious|top[-\s]?tier|cutting[-\s]?edge)\b/gi,
        ' '
      )
      .replace(/\s{2,}/g, ' ')
      .replace(/\s+([,.;])/g, '$1')
      .trim();
  },

  // Image models follow trailing exclusion clauses far more reliably than
  // negation woven through the descriptive body.
  _buildExclusions: function(doNotShow) {
    // Each line here corresponds to a defect observed in generated output, not
    // to a general preference. Wording is deliberately concrete: the model
    // ignored "no mockups" while producing contact sheets, so the specific
    // shapes it actually produced are named.
    var banned = [
      // Layout defects — B3
      'one single full-frame image only',
      'no grids, collages, contact sheets, split panels, thumbnails or inset sub-images',
      'no mockups, device frames, presentation boards, mood boards or concept sheets',
      'no borders, frames, crop marks, registration marks, blueprint overlays or margin guides',

      // Text defects — B4, B5
      'no duplicated or repeated text; each approved line appears exactly once',
      'no text anywhere except the approved wording',
      'screens, monitors, tablets and phones must be switched off, blank, ' +
        'showing plain colour, or thrown far out of focus — never legible text, ' +
        'interfaces, charts or dashboards',
      'no signage, wall text, badges, labels or documents bearing readable writing',
      'no logos, brand marks, hospital names, platform names or watermarks',
      'no slide numbers, card numbers, page numbers or production labels',
      'no placeholder or lorem ipsum text, no UI chrome, no file names',

      // Human presence — B8
      'no rows of people posed facing the camera, no line-ups, no team portraits, ' +
        'no group photographs; subjects are engaged in the moment, not presenting to camera',

      // Style — B7. Not "no photorealistic photography": that line asserted a
      // medium regardless of what the Design Prompt had already specified, and
      // directly contradicted a brief that had asked for editorial photography.
      // Only the failure modes at either extreme are excluded; the medium
      // itself is the brief's decision, not this function's.
      'no cartoon, anime, Pixar or comic-book styling',
      'no uncanny faces, plastic skin or visible AI artifacts',
      'no cold, dim, desaturated or clinical-blue grading; keep it warm and light-filled',

      // Concept — the clichés that arrived from three unrelated campaigns
      'no generic stock-photography situations',
      'nobody merely standing, posing or looking professional without an action',
      'no groups gathered around a screen, dashboard, tablet or monitor',
      'no empty gleaming rooms where nothing is happening'
    ];

    var campaign = String(doNotShow || '').trim();
    if (campaign) {
      banned.push(campaign);
    }

    return 'Deliver final publish-ready artwork. Strictly exclude: ' + banned.join('; ');
  },

  _getAspectRatio: function(contentFormat) {
    var format = String(contentFormat).trim().toLowerCase();

    if (format === 'story' || format === 'reel') {
      return '9:16';
    }

    if (format === 'carousel') {
      return '1:1';
    }

    return '1:1';
  },

  _getMediaSpecs: function(contentFormat) {
    var format = String(contentFormat).trim().toLowerCase();

    if (format === 'story') {
      return CONFIG.MEDIA_SPECS.STORY;
    }

    if (format === 'reel') {
      return CONFIG.MEDIA_SPECS.REEL;
    }

    if (format === 'carousel') {
      return CONFIG.MEDIA_SPECS.CAROUSEL;
    }

    if (format === 'video' || format === 'motion graphic') {
      return CONFIG.MEDIA_SPECS.SHORT_VIDEO;
    }

    return CONFIG.MEDIA_SPECS.STATIC_IMAGE;
  },

  _isVideoFormat: function(contentFormat) {
    var format = String(contentFormat).trim().toLowerCase();
    return format === 'video' || format === 'motion graphic';
  },

  _getAssetCount: function(rowData) {
    var contentFormat = String(rowData['Content Format']).trim().toLowerCase();
    var specs = this._getMediaSpecs(contentFormat);

    var assetCount = parseInt(rowData['Asset Count'], 10);

    if (isNaN(assetCount)) {
      return specs.assetCount;
    }

    if (contentFormat === 'carousel') {
      if (assetCount < specs.minAssetCount) {
        return specs.minAssetCount;
      }
      if (assetCount > specs.maxAssetCount) {
        return specs.maxAssetCount;
      }
    }

    return assetCount;
  },

  // Which attempt this is for the row. Every regeneration was previously named
  // V1, so a folder holding three attempts at the same card gave no way to tell
  // them apart except by cross-referencing timestamps against the execution log.
  //
  // The revision counter already exists — WorkerRunner keeps it per Content ID
  // to enforce MAX_REVISION_CYCLES. Reading it here costs nothing.
  //
  // Note: the counter is cleared when QA approves or rejects, so a manual
  // re-generation of an already-settled row starts again at V1. That is correct
  // — it is a new attempt, not a continuation of a closed revision cycle — and
  // the timestamp still keeps the filenames distinct.
  _resolveAssetVersion: function(contentId) {
    if (typeof _getRevisionCount !== 'function' || !contentId) {
      return 'V1';
    }

    try {
      return 'V' + (_getRevisionCount(contentId) + 1);
    } catch (e) {
      Logger.log('ASSET_VERSION | falling back to V1: ' + e.toString());
      return 'V1';
    }
  },

  // One prompt per asset, from the Media Designer when it is enabled and from
  // the legacy code-built assembly when it is not.
  //
  // A designer failure falls back rather than losing the row: the concatenated
  // prompt produces weaker work, but weaker work beats a batch that stops
  // because one model call returned malformed JSON. The fallback is logged
  // loudly — silently producing the output this worker was built to replace
  // would leave the operator judging the designer by results it never produced.
  _composePrompts: function(rowData, assetCount, usingReference, rowNumber) {
    var designer = ((CONFIG.SERVICES || {}).MEDIA_GENERATION || {}).designer || {};

    if (designer.ENABLED) {
      try {
        var result = MediaDesigner.compose(rowData, assetCount, {
          usingReference: usingReference
        });

        if (result.blocked) {
          throw new Error(
            'Media Designer will not produce publishable work from this brief: ' +
            result.blockedReason + ' Re-run the Creative Director for this row.'
          );
        }

        Logger.log(
          'MEDIA_DESIGNER | Row ' + rowNumber + ' | composed ' +
          result.prompts.length + ' prompt(s)'
        );

        // Its own line in the Execution Log. The generation entry below reports
        // zero tokens because generating an image spends none — but composing
        // the prompt does, ~11k of manual per row, and it was recorded nowhere.
        // The image path was the one part of the system whose cost and cache
        // behaviour could not be read off the log at all.
        var usage = result.usage || {};
        Logger.logSuccess(
          'MEDIA_DESIGNER', rowNumber, 0,
          usage.inputTokens || 0, usage.outputTokens || 0,
          'Composed ' + result.prompts.length + ' prompt(s) | ' +
          AIProvider.cacheSummary(usage) +
          (usage.failedOver ? ' | FAILOVER: ' + usage.failedOver : '')
        );

        // Carried on the row so the overlay can place the marks where the
        // Designer kept the composition quiet. Written onto rowData rather than
        // returned separately because the overlay reads the row, and a second
        // channel for one value is a second thing to keep in step.
        if (result.reservedCorner) {
          rowData['Reserved Logo Corner'] = result.reservedCorner;
        }

        return result.prompts;

      } catch (designerErr) {
        // A blocked brief is a decision, not a malfunction. It must reach the
        // caller instead of being quietly downgraded to a legacy generation.
        if (String(designerErr.message || '').indexOf('will not produce publishable') !== -1) {
          throw designerErr;
        }

        Logger.log(
          'MEDIA_DESIGNER_FAILED | Row ' + rowNumber + ' | falling back to the ' +
          'code-built prompt for this row | ' + designerErr.toString()
        );
      }
    }

    var prompts = [];
    for (var i = 0; i < assetCount; i++) {
      prompts.push(this._buildGenerationPrompt(rowData, i, assetCount, usingReference));
    }
    return prompts;
  },

  // Sets the approved wording over each generated image and returns the images
  // with their base64 replaced by the composed versions.
  //
  // A failure here keeps the untyped artwork rather than discarding the asset.
  // The image itself is sound and the wording can be added by hand; throwing it
  // away would mean paying for the generation twice to fix a caption. The
  // shortfall is logged rather than left to be noticed.
  _composeVisibleText: function(images, rowData, index, assetCount, specs, rowNumber) {
    var cfg = CONFIG.TEXT_OVERLAY || {};

    if (!cfg.ENABLED) {
      return images;
    }

    var wording = this._resolveVisibleText(rowData, index, assetCount);
    var branding = (CONFIG.BRANDING || {}).ENABLED !== false;

    // An asset with no headline still needs its logos and its contact numbers.
    // Returning here on the wording alone is what would have published an
    // unbranded post every time a row had no Text On Design.
    if (!wording && !branding) {
      return images;
    }

    if (wording && wording.length > (cfg.LONG_HEADLINE_CHARS || 90)) {
      Logger.log(
        'TEXT_OVERLAY | Row ' + rowNumber + ' | asset ' + (index + 1) +
        ' | headline is ' + wording.length + ' characters. It will be set at a ' +
        'reduced size, but this length reads as a caption rather than a ' +
        'headline on a phone. Shorten it in Text On Design.'
      );
    }

    for (var i = 0; i < images.length; i++) {
      try {
        var source = Utilities.newBlob(
          Utilities.base64Decode(images[i].base64),
          images[i].mimeType,
          'asset'
        );

        var composed = TextOverlay.apply(
          source, wording, specs.width, specs.height,
          branding ? rowData : null
        );

        if (composed) {
          images[i] = {
            base64: Utilities.base64Encode(composed.getBytes()),
            mimeType: 'image/png'
          };
        }

      } catch (overlayErr) {
        // The artwork is kept — it is sound and was paid for — but the row now
        // carries assets missing their headline, and nothing downstream could
        // tell. A post published without its approved wording is a worse
        // outcome than a row held back, so the shortfall is recorded on the
        // row where the integrity gate will see it.
        this._textMissing = true;

        Logger.log(
          'TEXT_OVERLAY_FAILED | Row ' + rowNumber + ' | asset ' + (index + 1) +
          ' | keeping the artwork without wording | ' + overlayErr.toString()
        );
      }
    }

    return images;
  },

  _storeGeneratedImages: function(images, nameStem, version) {
    var folderId = CONFIG.VISUAL_ASSETS.generated;

    if (!folderId) {
      throw new Error(
        'Generated assets folder not configured. ' +
        'Set CONFIG.VISUAL_ASSETS.generated'
      );
    }

    var folder = DriveApp.getFolderById(folderId);
    var urls = [];
    var timestamp = this._formatTimestamp(new Date());
    var contentId = nameStem;

    version = version || 'V1';

    for (var i = 0; i < images.length; i++) {
      var image = images[i];
      var extension = image.mimeType === 'image/jpeg' ? 'jpg' : 'png';
      var fileName = contentId + '_' + version +
        '_' + timestamp + '_' + (i + 1) + '.' + extension;

      var blob = Utilities.newBlob(
        Utilities.base64Decode(image.base64),
        image.mimeType,
        fileName
      );

      var file = folder.createFile(blob);
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

      urls.push(file.getUrl());
    }

    return urls.join(', ');
  },

  _formatTimestamp: function(date) {
    var y = date.getFullYear();
    var m = ('0' + (date.getMonth() + 1)).slice(-2);
    var d = ('0' + date.getDate()).slice(-2);
    var h = ('0' + date.getHours()).slice(-2);
    var min = ('0' + date.getMinutes()).slice(-2);
    var s = ('0' + date.getSeconds()).slice(-2);
    return y + m + d + '_' + h + min + s;
  },

  _writeResult: function(sheet, columnMap, rowNumber, values) {
    for (var colName in values) {
      var colIndex = columnMap[colName];
      if (colIndex === undefined || colIndex === null) continue;

      var value = values[colName];
      if (value === undefined || value === null) {
        value = '';
      }

      // Routed through the safe writer so a dropdown on Generation Status
      // cannot silently drop the result of a completed generation.
      var ok = SheetWriter._writeCellSafe(
        sheet.getRange(rowNumber, colIndex), value, rowNumber, colName, colIndex
      );

      if (!ok) {
        Logger.log(
          'MEDIA_GENERATION_WRITE_FAILED | Row: ' + rowNumber +
          ' | Column: ' + colName + ' | Value: ' + String(value).substring(0, 100)
        );
      }
    }
  },

  _writeGenerationFailure: function(rowNumber, error) {
    try {
      var config = CONFIG.SERVICES.MEDIA_GENERATION;
      var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(config.sheetName);
      var columnMap = SheetSchema._getColumnMap(config.sheetName);

      this._writeResult(sheet, columnMap, rowNumber, {
        'Generation Status': 'FAILED: ' + error.substring(0, 100)
      });
    } catch (e) {
      Logger.log('Failed to write generation failure: ' + e.toString());
    }
  }
};

// ---------------------------------------------------------------------------
// END SOURCE FILE: ServiceRunner.gs
// ---------------------------------------------------------------------------

