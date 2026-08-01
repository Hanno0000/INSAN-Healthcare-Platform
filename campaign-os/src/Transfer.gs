// ================================
// TRANSFER
//
// Moves a row from one tab to the next by key, as values.
//
// ------------------------------------------------------------------------
// WHY THIS EXISTS — the defect it replaces
//
// The workbook moved rows between tabs with position-bound formulas:
//
//   Content Pipeline  B2 = IF('Content Calendar'!D2:D1000="","",
//                            'Content Calendar'!D2:H1000)
//   Content Pipeline  G2 = IF('Campaign Cards'!O2:O1000="","",
//                            'Campaign Cards'!O2:Z1000)
//   Visual Pipeline   2,244 individual cells, each 'Content Pipeline'!<cell>
//
// Two array formulas anchored in row 2 fed the whole Content Pipeline, and the
// Visual Pipeline read the Content Pipeline one cell reference at a time.
//
// That makes ROW POSITION load-bearing across tabs, and it fails in the worst
// possible way — silently:
//
//   delete Content Calendar rows 2–50
//     → the array in Content Pipeline B2 re-renders from the new source range
//     → Content Pipeline row 2 now shows what used to be calendar row 51
//     → but S:AX on row 2 — everything the workers wrote — never moved
//     → every post's strategy is now paired with a different post's copy
//
// No #REF!. No error. Nothing in the sheet looks wrong. And deleting row 2
// itself destroys the array formula outright, so the transfer stops for good.
//
// The same coupling makes ordinary editing dangerous: a single row deleted by
// hand does this, with no code involved at all.
//
// ------------------------------------------------------------------------
// WHAT REPLACES IT
//
// Each tab owns its rows. A row is written once, as values, and is joined to
// its neighbours by a key it carries in a column:
//
//   Content Calendar ──Calendar ID──▶ Content Pipeline
//   Content Pipeline ──Content ID───▶ Visual Pipeline
//   Visual Pipeline  ──Content ID───▶ Ads Pipeline        (already like this)
//
// Ads Pipeline has always worked this way — written by AdsRunner, keyed on
// Content ID, no formulas. It is the only tab in the workbook with no
// positional coupling, and it is the model the others now follow.
//
// Transfers are idempotent: a row whose key is already present downstream is
// skipped, never duplicated. Running twice is a no-op, which is what makes it
// safe to run on a schedule or after every plan.
// ================================

var Transfer = {

  // ------------------------------------------------------------- plumbing

  _sheet: function(name) {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);

    if (!sheet) {
      throw new Error('Sheet "' + name + '" not found.');
    }

    return sheet;
  },

  // Every value already present in one column, as a lookup. Read in a single
  // call: asking row by row across a few hundred rows is what makes a transfer
  // outlast the execution budget.
  _existingKeys: function(sheetName, columnName) {
    var sheet = this._sheet(sheetName);
    var lastRow = sheet.getLastRow();
    var seen = {};

    if (lastRow < CONFIG.DATA_START_ROW) {
      return seen;
    }

    var map = SheetSchema._getColumnMap(sheetName);
    var column = map[columnName];

    if (!column) {
      throw new Error(
        'Sheet "' + sheetName + '" has no "' + columnName + '" column. ' +
        'Run Maintenance → Create Managed Columns.'
      );
    }

    var values = sheet
      .getRange(CONFIG.DATA_START_ROW, column, lastRow - CONFIG.DATA_START_ROW + 1, 1)
      .getValues();

    for (var i = 0; i < values.length; i++) {
      var key = String(values[i][0] || '').trim();

      if (key) {
        seen[key] = CONFIG.DATA_START_ROW + i;
      }
    }

    return seen;
  },

  // Reads a whole sheet once, as objects keyed by column name.
  _readAll: function(sheetName) {
    var sheet = this._sheet(sheetName);
    var lastRow = sheet.getLastRow();
    var lastColumn = sheet.getLastColumn();

    if (lastRow < CONFIG.DATA_START_ROW) {
      return [];
    }

    var header = sheet.getRange(CONFIG.HEADER_ROW, 1, 1, lastColumn).getValues()[0];
    var body = sheet
      .getRange(CONFIG.DATA_START_ROW, 1, lastRow - CONFIG.DATA_START_ROW + 1, lastColumn)
      .getValues();
    var out = [];

    for (var r = 0; r < body.length; r++) {
      var row = { _row: CONFIG.DATA_START_ROW + r };

      for (var c = 0; c < header.length; c++) {
        var name = String(header[c] || '').trim();

        if (name) {
          row[name] = body[r][c];
        }
      }

      out.push(row);
    }

    return out;
  },

  // Appends rows in one write. Column names are resolved against the target's
  // own header, so a column that has moved is still written to the right place
  // and a column the target does not have is reported rather than dropped.
  _append: function(sheetName, records) {
    if (!records.length) {
      return { written: 0, unknown: [] };
    }

    var sheet = this._sheet(sheetName);
    var lastColumn = sheet.getLastColumn();
    var header = sheet.getRange(CONFIG.HEADER_ROW, 1, 1, lastColumn).getValues()[0];
    var index = {};
    var unknown = {};

    for (var c = 0; c < header.length; c++) {
      var name = String(header[c] || '').trim();

      if (name) {
        index[name] = c;
      }
    }

    var payload = [];

    for (var i = 0; i < records.length; i++) {
      var line = new Array(lastColumn).fill('');

      for (var key in records[i]) {
        if (index[key] === undefined) {
          unknown[key] = true;
          continue;
        }

        line[index[key]] = records[i][key];
      }

      payload.push(line);
    }

    var at = sheet.getLastRow() + 1;

    if (at < CONFIG.DATA_START_ROW) {
      at = CONFIG.DATA_START_ROW;
    }

    sheet.getRange(at, 1, payload.length, lastColumn).setValues(payload);
    SpreadsheetApp.flush();

    return { written: payload.length, unknown: Object.keys(unknown), startRow: at };
  },

  // ------------------------------------------ calendar → content pipeline

  // What the Content Pipeline takes from the Content Calendar, and what it
  // takes from the campaign's card. Together these replace the two array
  // formulas that used to anchor the whole tab in row 2.
  CALENDAR_TO_PIPELINE: {
    'Day': 'Publishing Date',
    'Calendar ID': 'Calendar ID',
    'Page': 'Publishing Page',
    'Campaign Group': 'Campaign Group',
    'Campaign Name': 'Campaign Name',
    'Hospital Brand': 'Hospital Brand'
  },

  // Campaign Cards O:Z — the twelve strategy fields, copied per row because the
  // Content Strategy Worker reads them off the row it is given.
  CARD_STRATEGY: [
    'Campaign Philosophy', 'Trust Platform', 'Core Message', 'Trust Promise',
    'Emotional Trigger', 'Psychological Barrier', 'Content Pillars',
    'Approved Content Angles', 'Non-Negotiable Rules', 'CTA Strategy',
    'Primary KPI', 'Target Audience'
  ],

  calendarToPipeline: function() {
    ConfigResolver.apply();

    var calendarName = (CONFIG.CAMPAIGN_PLANNER || {}).CALENDAR_SHEET_NAME ||
      'Content Calendar';
    var pipelineName = CONFIG.SHEET_NAME;

    var calendar = this._readAll(calendarName);
    var already = this._existingKeys(pipelineName, 'Calendar ID');

    // The card carries the strategy. A row whose campaign has no card is the
    // 67% blank-strategy defect, so it is refused by name rather than
    // transferred empty — the whole point of W1 was to stop that arriving
    // silently.
    var cards = {};
    var cardRows = this._readAll(CONFIG.CAMPAIGN_CARDS_SHEET_NAME);

    for (var c = 0; c < cardRows.length; c++) {
      var cardName = String(cardRows[c]['Campaign Name'] || '').trim();

      if (cardName) {
        cards[cardName] = cardRows[c];
      }
    }

    var records = [];
    var skipped = 0;
    var noCard = {};

    for (var i = 0; i < calendar.length; i++) {
      var row = calendar[i];
      var calendarId = String(row['Calendar ID'] || '').trim();
      var campaign = String(row['Campaign Name'] || '').trim();

      if (!calendarId || !campaign) {
        continue;
      }

      if (already[calendarId]) {
        skipped++;
        continue;
      }

      var record = {};

      for (var from in this.CALENDAR_TO_PIPELINE) {
        record[this.CALENDAR_TO_PIPELINE[from]] = row[from] === undefined ? '' : row[from];
      }

      var card = cards[campaign];

      if (!card) {
        noCard[campaign] = (noCard[campaign] || 0) + 1;
      } else {
        for (var s = 0; s < this.CARD_STRATEGY.length; s++) {
          var field = this.CARD_STRATEGY[s];
          record[field] = card[field] === undefined ? '' : card[field];
        }
      }

      // Identity for everything downstream. Generated here because this is
      // where the row starts existing.
      record['Content ID'] = 'CNT-' + calendarId;
      record['Batch ID'] = row['Batch ID'] === undefined ? '' : row['Batch ID'];

      records.push(record);
    }

    var result = this._append(pipelineName, records);

    Logger.log(
      'TRANSFER | calendar → pipeline | ' + result.written + ' new, ' +
      skipped + ' already present' +
      (result.unknown.length ? ' | no column for: ' + result.unknown.join(', ') : '')
    );

    return {
      written: result.written,
      skipped: skipped,
      startRow: result.startRow,
      noCard: noCard,
      unknownColumns: result.unknown
    };
  },

  // -------------------------------------- content pipeline → visual pipeline

  // The Creative Package — Visual Pipeline A:Q. What the visual team is given
  // and may not change. The Creative Director's final copy and design prompt
  // win over the drafts, because approval is what makes them final.
  PIPELINE_TO_VISUAL: [
    'Content ID', 'Calendar ID', 'Campaign Name', 'Hospital Brand',
    'Content Type', 'Content Format', 'Visual Concept', 'Visual Focus',
    'Visual Priority', 'Design Mood', 'Composition', 'Visual Elements',
    'Do NOT Show', 'Text On Design', 'Design Notes'
  ],

  pipelineToVisual: function() {
    ConfigResolver.apply();

    var pipelineName = CONFIG.SHEET_NAME;
    var visualName = CONFIG.VISUAL_PIPELINE.SHEET_NAME;

    var pipeline = this._readAll(pipelineName);
    var already = this._existingKeys(visualName, 'Content ID');

    var records = [];
    var skipped = 0;
    var notApproved = 0;

    for (var i = 0; i < pipeline.length; i++) {
      var row = pipeline[i];
      var contentId = String(row['Content ID'] || '').trim();

      if (!contentId) {
        continue;
      }

      // Approval is the gate. A row the Creative Director has not passed is not
      // a creative package; sending it to the visual team would spend
      // generation on copy that may still change.
      if (String(row['Creative Director Review Status'] || '').trim() !== 'Approved') {
        notApproved++;
        continue;
      }

      if (already[contentId]) {
        skipped++;
        continue;
      }

      var record = {};

      for (var f = 0; f < this.PIPELINE_TO_VISUAL.length; f++) {
        var field = this.PIPELINE_TO_VISUAL[f];
        record[field] = row[field] === undefined ? '' : row[field];
      }

      // The approved versions win over the drafts.
      record['Post Copy (AI)'] = row['Creative Director Post Copy'] ||
        row['Post Copy (AI)'] || '';
      record['Creative Director Design Prompt'] =
        row['Creative Director Design Prompt'] || row['Design Prompt (AI)'] || '';

      record['Batch ID'] = row['Batch ID'] === undefined ? '' : row['Batch ID'];
      record['VISUAL_STAGE'] = 'PLANNING';

      records.push(record);
    }

    var result = this._append(visualName, records);

    Logger.log(
      'TRANSFER | pipeline → visual | ' + result.written + ' new, ' +
      skipped + ' already present, ' + notApproved + ' not approved' +
      (result.unknown.length ? ' | no column for: ' + result.unknown.join(', ') : '')
    );

    return {
      written: result.written,
      skipped: skipped,
      notApproved: notApproved,
      startRow: result.startRow,
      unknownColumns: result.unknown
    };
  }
};


// ================================
// MENU — AI Workers → Planning → Transfer Rows Forward
// ================================

function transferRowsForward() {
  var ui = SpreadsheetApp.getUi();

  try {
    var toPipeline = Transfer.calendarToPipeline();
    var toVisual = Transfer.pipelineToVisual();

    var lines = [
      'Content Calendar → Content Pipeline',
      '   ' + toPipeline.written + ' new row(s)' +
        (toPipeline.skipped ? ', ' + toPipeline.skipped + ' already there' : ''),
      '',
      'Content Pipeline → Visual Pipeline',
      '   ' + toVisual.written + ' new row(s)' +
        (toVisual.skipped ? ', ' + toVisual.skipped + ' already there' : '') +
        (toVisual.notApproved ? ', ' + toVisual.notApproved +
          ' waiting on the Creative Director' : '')
    ];

    var campaigns = Object.keys(toPipeline.noCard);

    if (campaigns.length) {
      lines.push('');
      lines.push('─────────────────────────────');
      lines.push('Transferred with NO strategy — these campaigns have no card:');

      for (var i = 0; i < campaigns.length; i++) {
        lines.push('   ' + campaigns[i] + ' (' + toPipeline.noCard[campaigns[i]] + ' rows)');
      }

      lines.push('');
      lines.push('The workers will refuse these rows rather than invent a strategy');
      lines.push('for them. Build the cards, then run this again — the rows already');
      lines.push('transferred are not duplicated.');
    }

    var unknown = toPipeline.unknownColumns.concat(toVisual.unknownColumns);

    if (unknown.length) {
      lines.push('');
      lines.push('No column exists for: ' + unknown.join(', '));
      lines.push('Run Maintenance → Create Managed Columns.');
    }

    ui.alert('Transfer Rows Forward', lines.join('\n'), ui.ButtonSet.OK);

  } catch (e) {
    ui.alert('Transfer Rows Forward', e.message || e.toString(), ui.ButtonSet.OK);
  }
}
