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

    for (var i = 0; i < numberOfImages; i++) {
      var payload = {
        contents: [
          {
            parts: [
              { text: prompt }
            ]
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
