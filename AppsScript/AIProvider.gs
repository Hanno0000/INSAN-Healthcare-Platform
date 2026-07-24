var AIProvider = {

  call: function(prompt, options) {
    var provider = CONFIG.AI_PROVIDER;

    switch (provider) {
      case 'gemini':
        return GeminiProvider.call(prompt, options);
      default:
        throw new Error('Unknown AI provider: ' + provider);
    }
  },

  getProviderName: function() {
    return CONFIG.AI_PROVIDER;
  },

  getAvailableProviders: function() {
    return ['gemini'];
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

    var payload = {
      contents: [
        {
          parts: [
            { text: prompt }
          ]
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

    var response = UrlFetchApp.fetch(url, requestOptions);
    var responseCode = response.getResponseCode();
    var responseBody = response.getContentText();

    if (responseCode === 429) {
      Utilities.sleep(3000);
      response = UrlFetchApp.fetch(url, requestOptions);
      responseCode = response.getResponseCode();
      responseBody = response.getContentText();
    }

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
