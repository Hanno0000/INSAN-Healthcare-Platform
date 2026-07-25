var ContextBuilder = {

  buildContext: function(workerName, rowData) {
    var workerConfig = CONFIG.WORKERS[workerName];

    if (!workerConfig) {
      throw new Error('Unknown worker: ' + workerName);
    }

    var sections = [];

    sections.push(this._buildHeader(workerName));
    sections.push(this._buildWorkerPrompt(workerName));
    sections.push(this._buildProjectDocs(workerName));
    sections.push(this._buildControlledVocabulary(workerConfig));
    sections.push(this._buildRowData(workerConfig, rowData));
    sections.push(this._buildOutputFormat(workerConfig));

    return sections.join('\n\n');
  },

  _buildHeader: function(workerName) {
    return [
      'You are executing inside the INSAN Healthcare AI Operating System.',
      'Worker: ' + workerName,
      'Time: ' + new Date().toISOString(),
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

    var schemaLines = [];
    for (var j = 0; j < fieldNames.length; j++) {
      var fname = fieldNames[j];
      var ftype = outputFields[fname];
      var description = ftype === 'controlled'
        ? '(use EXACT value from controlled vocabulary)'
        : '(free text - be creative and specific)';

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
