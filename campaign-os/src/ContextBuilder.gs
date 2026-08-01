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
      this._buildWorkerPrompt(workerName),
      this._buildProjectDocs(workerName),
      this._buildControlledVocabulary(workerConfig)
    ].filter(function(s) { return s; }).join('\n\n');
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
