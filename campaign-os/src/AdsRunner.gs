// ================================
// W10 — PAID ADS WORKER
//
// Drafts an ad specification for a post that is already live.
//
// It does not spend money. It creates no campaign, touches no ad account and
// holds no ad credentials — it writes a row a human reads, edits and executes.
// That boundary is the design and not a phase: automating spend before the
// chain has a production track record would put a model in charge of the only
// irreversible thing more expensive than publishing.
//
// What it is actually for is the gap Audit B measured. The campaign card
// carries Target Audience and Primary KPI on every campaign, and nothing
// downstream has ever read them — 88% of finished posts sit in one funnel stage
// and none is built to convert. This worker is where the card's audience and
// KPI finally have to become something specific enough to buy against.
// ================================

var AdsRunner = {

  WORKER_NAME: 'PAID_ADS_WORKER',

  _config: function() {
    return CONFIG.PAID_ADS || {};
  },

  // ------------------------------------------------------------------ sheet

  // Created on first use rather than by hand. A missing column is the failure
  // mode this system already has a trap for — SheetWriter skips it, logs one
  // line and reports success — so the tab is built from the same list the
  // writer uses.
  ensureSheet: function() {
    var config = this._config();
    var name = config.SHEET_NAME;
    var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = spreadsheet.getSheetByName(name);

    if (!sheet) {
      sheet = spreadsheet.insertSheet(name);
      sheet.appendRow(config.COLUMNS);

      var header = sheet.getRange(1, 1, 1, config.COLUMNS.length);
      header.setFontWeight('bold');
      header.setBackground('#1a73e8');
      header.setFontColor('#ffffff');
      sheet.setFrozenRows(1);

      Logger.log('ADS | created "' + name + '" with ' + config.COLUMNS.length + ' columns');
      return sheet;
    }

    // An existing tab may predate a column being added here. Append what is
    // missing rather than assuming the shape.
    var width = Math.max(sheet.getLastColumn(), 1);
    var existing = sheet.getRange(1, 1, 1, width).getValues()[0]
      .map(function(h) { return String(h).trim(); });

    for (var i = 0; i < config.COLUMNS.length; i++) {
      if (existing.indexOf(config.COLUMNS[i]) === -1) {
        sheet.getRange(1, sheet.getLastColumn() + 1).setValue(config.COLUMNS[i]);
        Logger.log('ADS | added missing column "' + config.COLUMNS[i] + '"');
      }
    }

    return sheet;
  },

  _columnMap: function(sheet) {
    var width = Math.max(sheet.getLastColumn(), 1);
    var header = sheet.getRange(1, 1, 1, width).getValues()[0];
    var map = {};

    for (var i = 0; i < header.length; i++) {
      var name = String(header[i]).trim();
      if (name) {
        map[name] = i + 1;
      }
    }

    return map;
  },

  // ------------------------------------------------------------------ batch

  // Every published row that has no draft yet. Publishing is the trigger: an ad
  // specification for a post that does not exist has nothing to point at.
  run: function(startRow, endRow) {
    var sheetName = CONFIG.VISUAL_PIPELINE.SHEET_NAME;
    var lastRow = SheetSchema.getLastRow(sheetName);

    startRow = Math.max(startRow, CONFIG.DATA_START_ROW);
    endRow = Math.min(endRow, lastRow);

    var sheet = this.ensureSheet();
    var drafted = {};
    var existing = this._existingContentIds(sheet);

    var batchStart = new Date().getTime();
    var runStart = RunControl.runStart(batchStart);
    var timeoutMs = (CONFIG.BATCH_TIMEOUT_SECONDS || 300) * 1000;

    var written = 0;
    var skipped = 0;
    var failed = 0;
    var interrupted = false;
    var nextRow = startRow;

    for (var row = startRow; row <= endRow; row++) {
      if (RunControl.stopRequested(runStart)) {
        interrupted = true;
        RunControl.clear();
        Logger.log('OPERATOR_STOP | PAID_ADS | stopped before row ' + row);
        break;
      }

      nextRow = row + 1;

      try {
        var visual = SheetSchema.getRowData(row, sheetName);
        var contentId = String(visual[CONFIG.COLUMN_NAMES.CONTENT_ID] || '').trim();
        var liveUrl = String(visual['Live Post URL'] || '').trim();

        if (!contentId || !liveUrl) {
          skipped++;
          continue;
        }

        if (existing[contentId] || drafted[contentId]) {
          skipped++;
          continue;
        }

        this.draft(visual, contentId, liveUrl, sheet);
        drafted[contentId] = true;
        written++;

      } catch (e) {
        failed++;
        Logger.logFailure(this.WORKER_NAME, row, 0, e.message || e.toString());
      }

      if (row < endRow && (new Date().getTime() - batchStart) >= timeoutMs) {
        interrupted = true;
        break;
      }
    }

    Logger.logExecution({
      worker: this.WORKER_NAME,
      row: startRow + '-' + (nextRow - 1),
      status: interrupted ? 'TIMEOUT' : (failed === 0 ? 'SUCCESS' : 'PARTIAL'),
      runtime: new Date().getTime() - batchStart,
      details: written + ' drafted, ' + skipped + ' skipped, ' + failed + ' failed' +
        (interrupted ? ' (resume from row ' + nextRow + ')' : '')
    });

    return {
      drafted: written, skipped: skipped, failed: failed,
      interrupted: interrupted, nextRow: interrupted ? nextRow : null
    };
  },

  // A draft already written is not rewritten. The operator edits these rows —
  // budget, targeting, the launch decision — and a second run that overwrote
  // them would delete a human's work with a model's guess.
  _existingContentIds: function(sheet) {
    var map = this._columnMap(sheet);
    var idCol = map['Content ID'];
    var lastRow = sheet.getLastRow();
    var seen = {};

    if (!idCol || lastRow < 2) {
      return seen;
    }

    var values = sheet.getRange(2, idCol, lastRow - 1, 1).getValues();

    for (var i = 0; i < values.length; i++) {
      var id = String(values[i][0] || '').trim();
      if (id) {
        seen[id] = true;
      }
    }

    return seen;
  },

  // ------------------------------------------------------------------ draft

  draft: function(visual, contentId, liveUrl, sheet) {
    var startTime = new Date().getTime();
    var config = this._config();

    var campaignName = String(visual['Campaign Name'] || '').trim();
    var card = this._campaignCard(campaignName);
    var editorial = this._editorialRow(contentId);

    var built = this._buildPrompt(card, editorial, visual, liveUrl);

    var response = AIProvider.call(built.text, {
      temperature: config.temperature,
      provider: config.provider,
      model: config.model,
      cachePrefix: built.staticPart
    });

    var parsed = this._parse(response.text);

    var values = {
      'Content ID': contentId,
      'Campaign Name': campaignName,
      'Page': String(editorial['Publishing Page'] || '').trim(),
      'Live Post URL': liveUrl,
      'Drafted At': new Date()
    };

    for (var field in config.OUTPUT_FIELDS) {
      values[field] = parsed[field] || '';
    }

    this._append(sheet, values);

    Logger.logSuccess(
      this.WORKER_NAME, contentId, new Date().getTime() - startTime,
      response.inputTokens, response.outputTokens,
      'Drafted an ad specification for ' + campaignName +
      ' | Objective: ' + (parsed['Objective'] || '(none)') +
      ' | Budget and launch left to the operator' +
      ' | ' + AIProvider.cacheSummary(response)
    );

    return values;
  },

  _append: function(sheet, values) {
    var map = this._columnMap(sheet);
    var width = sheet.getLastColumn();
    var row = new Array(width);

    for (var column in values) {
      var index = map[column];
      if (index) {
        row[index - 1] = values[column];
      }
    }

    for (var i = 0; i < row.length; i++) {
      if (row[i] === undefined) {
        row[i] = '';
      }
    }

    sheet.appendRow(row);
  },

  // ---------------------------------------------------------------- inputs

  _campaignCard: function(campaignName) {
    var sheetName = CONFIG.CAMPAIGN_CARDS_SHEET_NAME;
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);

    if (!sheet || !campaignName) {
      throw new Error(
        'No campaign card is reachable for "' + campaignName + '". The card ' +
        'carries the audience and the KPI, which is the whole input to an ad ' +
        'specification.'
      );
    }

    var nameCol = SheetSchema._getColumnMap(sheetName)['Campaign Name'];
    var lastRow = sheet.getLastRow();

    if (!nameCol || lastRow < CONFIG.DATA_START_ROW) {
      throw new Error('Campaign Cards has no readable Campaign Name column.');
    }

    var names = sheet
      .getRange(CONFIG.DATA_START_ROW, nameCol, lastRow - CONFIG.DATA_START_ROW + 1, 1)
      .getValues();

    var wanted = campaignName.trim().toLowerCase();

    for (var i = 0; i < names.length; i++) {
      if (String(names[i][0]).trim().toLowerCase() === wanted) {
        return SheetSchema.getRowData(CONFIG.DATA_START_ROW + i, sheetName);
      }
    }

    // Refusal, not a default. A generic audience spends real money on the wrong
    // people, and it does it silently — the ad runs, the numbers look like
    // numbers, and nothing says the targeting was invented.
    throw new Error(
      'No campaign card named "' + campaignName + '". Build it first: an ad ' +
      'drafted without the card would be targeting invented from a post.'
    );
  },

  _editorialRow: function(contentId) {
    var sheetName = CONFIG.SHEET_NAME;
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
    var idCol = sheet ? SheetSchema._getColumnMap(sheetName)[CONFIG.COLUMN_NAMES.CONTENT_ID] : null;
    var lastRow = sheet ? sheet.getLastRow() : 0;

    if (!idCol || lastRow < CONFIG.DATA_START_ROW) {
      return {};
    }

    var ids = sheet
      .getRange(CONFIG.DATA_START_ROW, idCol, lastRow - CONFIG.DATA_START_ROW + 1, 1)
      .getValues();

    for (var i = 0; i < ids.length; i++) {
      if (String(ids[i][0]).trim() === contentId) {
        return SheetSchema.getRowData(CONFIG.DATA_START_ROW + i, sheetName);
      }
    }

    return {};
  },

  // ---------------------------------------------------------------- prompt

  // Returns { text, staticPart }. The static part is the manual, the brand
  // documents and the vocabulary — identical on every row, and where the cache
  // breakpoint goes.
  _buildPrompt: function(card, editorial, visual, liveUrl) {
    var config = this._config();
    var folderId = PropertiesService.getScriptProperties()
      .getProperty('ADS_PROMPTS_FOLDER_ID') || CONFIG.PROMPTS_FOLDER_ID;

    var manual = DriveLoader.loadMarkdown(config.promptFile, folderId);

    if (!manual) {
      throw new Error(
        'Could not load ' + config.promptFile + '. Put it in the prompts ' +
        'folder, or set ADS_PROMPTS_FOLDER_ID in Script Properties.'
      );
    }

    var docs = [];
    for (var d = 0; d < (config.docs || []).length; d++) {
      var content = DriveLoader.loadMarkdown(config.docs[d], CONFIG.DOCS_FOLDER_ID);
      if (content) {
        docs.push('## ' + config.docs[d] + '\n\n' + content);
      }
    }

    var vocabulary = [];
    for (var field in config.OUTPUT_FIELDS) {
      if (config.OUTPUT_FIELDS[field] === 'controlled' &&
          CONFIG.CONTROLLED_VOCABULARY[field]) {
        vocabulary.push(field + ': ' + CONFIG.CONTROLLED_VOCABULARY[field].join(' | '));
      }
    }

    var schemaLines = [];
    for (var out in config.OUTPUT_FIELDS) {
      schemaLines.push('  "' + out + '": "..."');
    }

    var staticPart = [
      'You are executing inside the INSAN Healthcare AI Operating System.',
      'Worker: PAID ADS',
      '',
      'You draft an advertising specification. You do not spend money, you do',
      'not launch anything, and a human reads and edits everything you write.',
      '',
      '=== YOUR TRAINING MANUAL ===',
      '',
      manual,
      '',
      '=== END OF TRAINING MANUAL ===',
      '',
      docs.length ? '=== PROJECT DOCUMENTATION ===\n\n' +
        docs.join('\n\n---\n\n') + '\n\n=== END OF PROJECT DOCUMENTATION ===' : '',
      '',
      vocabulary.length ? '=== CONTROLLED VOCABULARY (EXACT VALUES ONLY) ===\n\n' +
        vocabulary.join('\n') + '\n\n=== END OF CONTROLLED VOCABULARY ===' : ''
    ].filter(function(s) { return s; }).join('\n');

    var cardFields = [
      'Campaign Name', 'Service Level', 'Business Goal', 'Marketing Goal',
      'Core Message', 'Trust Promise', 'CTA Strategy', 'Primary KPI',
      'Target Audience', 'Core Positioning', 'Human Insight',
      'Non-Negotiable Rules'
    ];

    var lines = ['=== THE CAMPAIGN THIS POST BELONGS TO ===', ''];

    for (var c = 0; c < cardFields.length; c++) {
      var value = String(card[cardFields[c]] || '').trim();
      lines.push(cardFields[c] + ': ' + (value || '[EMPTY]'));
    }

    lines.push('', '=== THE POST, AS PUBLISHED ===', '');
    lines.push('Live post: ' + liveUrl);
    lines.push('Page: ' + String(editorial['Publishing Page'] || '').trim());
    lines.push('Content Format: ' + String(visual['Content Format'] || '').trim());
    lines.push('Content Funnel Stage: ' + String(editorial['Content Funnel Stage'] || '').trim());
    lines.push('Content Objective: ' + String(editorial['Content Objective'] || '').trim());
    lines.push('');
    lines.push('Published copy:');
    lines.push(String(editorial['Creative Director Post Copy'] || '').trim());

    lines.push('', '=== WHAT YOU RETURN ===', '');
    lines.push('Valid JSON, nothing before or after it, no markdown fence:');
    lines.push('');
    lines.push('{');
    lines.push(schemaLines.join(',\n'));
    lines.push('}');
    lines.push('');
    lines.push('Budget is not yours to set and is not in the schema. Neither is');
    lines.push('Ad Status, Ad ID or Results — those record what a human did after');
    lines.push('reading this. Filling them would be reporting a spend that never');
    lines.push('happened.');
    lines.push('');
    lines.push('Targeting must be derivable from the campaign card above. If the');
    lines.push('card does not support a choice, say so in that field rather than');
    lines.push('inventing an interest list that will be paid for.');

    var dynamic = lines.join('\n');

    return { text: staticPart + '\n\n' + dynamic, staticPart: staticPart };
  },

  _parse: function(text) {
    var json = ResponseParser._extractJSON(ResponseParser._cleanResponseText(text));

    if (!json) {
      throw new Error(
        'The Paid Ads worker did not return valid JSON. First 300 characters: ' +
        String(text || '').substring(0, 300)
      );
    }

    var config = this._config();
    var values = {};

    for (var field in config.OUTPUT_FIELDS) {
      var value = String(json[field] === undefined ? '' : json[field]).trim();

      // Out-of-vocabulary values are recorded and kept, never silently
      // corrected: a wrong objective a human can see beats a plausible one
      // this worker chose on its behalf.
      if (config.OUTPUT_FIELDS[field] === 'controlled' && value &&
          CONFIG.CONTROLLED_VOCABULARY[field] &&
          CONFIG.CONTROLLED_VOCABULARY[field].indexOf(value) === -1) {
        Logger.logVocabularyDeviation(
          this.WORKER_NAME, 0, field, value, CONFIG.CONTROLLED_VOCABULARY[field]
        );
      }

      values[field] = value;
    }

    return values;
  }
};
