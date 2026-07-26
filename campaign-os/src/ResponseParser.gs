var ResponseParser = {

  parse: function(responseText, workerName) {
    var workerConfig = CONFIG.WORKERS[workerName];

    if (!workerConfig) {
      throw new Error('Unknown worker for parsing: ' + workerName);
    }

    Logger.log('PARSER_RAW_RESPONSE | First 500 chars: ' + responseText.substring(0, 500));

    var cleaned = this._cleanResponseText(responseText);
    var json = this._extractJSON(cleaned);

    if (!json) {
      Logger.log('PARSER_JSON_FAILED | Could not extract JSON');
      throw new Error(
        'Failed to extract JSON from AI response. ' +
        'Response starts with: ' + cleaned.substring(0, 200)
      );
    }

    Logger.log('PARSER_EXTRACTED_JSON | Keys: ' + Object.keys(json).join(', '));

    var validated = this._validateFields(json, workerConfig, workerName);

    Logger.log('PARSER_VALIDATED_VALUES | Values: ' + JSON.stringify(validated.values).substring(0, 500));
    Logger.log('PARSER_WARNINGS | Warnings: ' + validated.warnings.join('; '));

    return {
      values: validated.values,
      warnings: validated.warnings,
      deviations: validated.deviations || [],
      isPartial: validated.warnings.length > 0
    };
  },

  _cleanResponseText: function(text) {
    var cleaned = text.trim();

    if (cleaned.startsWith('```json')) {
      cleaned = cleaned.substring(7);
    } else if (cleaned.startsWith('```')) {
      cleaned = cleaned.substring(3);
    }

    if (cleaned.endsWith('```')) {
      cleaned = cleaned.substring(0, cleaned.length - 3);
    }

    var firstBrace = cleaned.indexOf('{');
    var lastBrace = cleaned.lastIndexOf('}');

    if (firstBrace !== -1 && lastBrace > firstBrace) {
      cleaned = cleaned.substring(firstBrace, lastBrace + 1);
    }

    return cleaned.trim();
  },

  _extractJSON: function(text) {
    try {
      return JSON.parse(text);
    } catch (e) {
    }

    var firstBrace = text.indexOf('{');
    var lastBrace = text.lastIndexOf('}');

    if (firstBrace !== -1 && lastBrace > firstBrace) {
      var candidate = text.substring(firstBrace, lastBrace + 1);

      try {
        return JSON.parse(candidate);
      } catch (e) {
      }
    }

    return null;
  },

  _validateFields: function(json, workerConfig, workerName) {
    var outputFields = workerConfig.outputFields;
    var values = {};
    var warnings = [];
    var deviations = [];

    for (var fieldName in outputFields) {
      var fieldType = outputFields[fieldName];

      if (!json.hasOwnProperty(fieldName)) {
        warnings.push('Missing field: ' + fieldName);
        values[fieldName] = '';
        continue;
      }

      var rawValue = String(json[fieldName]).trim();

      if (rawValue === '' || rawValue === 'null' || rawValue === 'undefined') {
        warnings.push('Empty field: ' + fieldName);
        values[fieldName] = '';
        continue;
      }

      if (fieldType === 'controlled') {
        var corrected = this._validateControlledField(fieldName, rawValue);

        if (corrected.wasCorrected) {
          warnings.push(
            'Corrected "' + fieldName + '": "' +
            rawValue + '" -> "' + corrected.value + '"'
          );
        } else if (corrected.isOutOfVocabulary) {
          // Accepted as-is. The vocabulary is treated as guidance, not as a gate:
          // a value nobody anticipated is production evidence, not a reason to stop.
          warnings.push(
            'Out-of-vocabulary "' + fieldName + '": "' + corrected.value + '" (accepted)'
          );
          deviations.push({
            field: fieldName,
            value: corrected.value,
            vocabulary: CONFIG.CONTROLLED_VOCABULARY[fieldName] || []
          });
        }

        values[fieldName] = corrected.value;
      } else {
        values[fieldName] = rawValue;
      }
    }

    return {
      values: values,
      warnings: warnings,
      deviations: deviations,
      worker: workerName
    };
  },

  _validateControlledField: function(fieldName, value) {
    var vocabulary = CONFIG.CONTROLLED_VOCABULARY[fieldName];

    if (!vocabulary) {
      return { value: value, wasCorrected: false };
    }

    if (vocabulary.indexOf(value) !== -1) {
      return { value: value, wasCorrected: false };
    }

    var normalizedInput = value.toLowerCase().trim();

    for (var i = 0; i < vocabulary.length; i++) {
      if (vocabulary[i].toLowerCase() === normalizedInput) {
        return { value: vocabulary[i], wasCorrected: true };
      }
    }

    var bestMatch = this._findBestMatch(normalizedInput, vocabulary);

    if (bestMatch) {
      return { value: bestMatch, wasCorrected: true };
    }

    // No match and no near-match. Keep the worker's value and flag it.
    return { value: value, wasCorrected: false, isOutOfVocabulary: true };
  },

  _findBestMatch: function(input, options) {
    var bestScore = 0;
    var bestMatch = null;

    for (var i = 0; i < options.length; i++) {
      var option = options[i].toLowerCase();
      var score = 0;

      if (option.indexOf(input) !== -1 || input.indexOf(option) !== -1) {
        score = 0.8;
      } else {
        score = this._similarity(input, option);
      }

      if (score > bestScore && score > 0.6) {
        bestScore = score;
        bestMatch = options[i];
      }
    }

    return bestMatch;
  },

  _similarity: function(a, b) {
    var longer = a.length > b.length ? a : b;
    var shorter = a.length > b.length ? b : a;

    if (longer.length === 0) return 1.0;

    var longerLength = longer.length;
    var distance = this._editDistance(longer, shorter);

    return (longerLength - distance) / longerLength;
  },

  _editDistance: function(a, b) {
    var matrix = [];

    for (var i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }

    for (var j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }

    for (var i = 1; i <= b.length; i++) {
      for (var j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[b.length][a.length];
  }
};
