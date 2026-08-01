// ================================
// ARCHIVE
//
// A finished plan is still weight. Every cycle adds rows to four tabs and none
// of them ever shrink, so the workbook a year from now carries every post ever
// made in the tabs the workers read on every run.
//
// One row of a post's life is spread across four tabs — what was scheduled,
// what was written, what was produced, what was advertised. Archiving joins
// those four into ONE row in ONE sheet, then removes them from the working
// tabs.
//
// The join is on identity, not position:
//
//   Content Calendar ──Calendar ID──▶ Content Pipeline
//   Content Pipeline ──Content ID───▶ Visual Pipeline ──Content ID──▶ Ads Pipeline
//
// Columns that appear in more than one tab — Calendar ID, Campaign Name,
// Content Format and the rest — are written once. A joined row is the post's
// whole history read left to right, not four copies of its name.
//
// ------------------------------------------------------------------------
// THIS IS SAFE ONLY BECAUSE THE TRANSFERS ARE NOW CODE
//
// While the tabs were joined by position-bound formulas — two array formulas
// anchored in Content Pipeline row 2, and 2,244 individual cell references in
// the Visual Pipeline — deleting any row silently re-pointed every formula
// below it. Row 2 could not be deleted at all without destroying the transfer.
//
// Transfer.gs replaced that with values written once and joined by key, which
// is what makes a row independent enough to remove. See its header for the
// defect in full. If those formulas are ever put back, this becomes unsafe
// again — `assertNoTransferFormulas` below refuses to run when it finds them.
// ================================

var Archive = {

  SHEET_NAME: 'Archive',
  STAMP: 'Archived At',

  // Deleted in this order: furthest downstream first. Nothing references a row
  // that has already been removed, so no stale key is ever left pointing at a
  // row that no longer exists.
  ORDER: ['ADS', 'VISUAL', 'PIPELINE', 'CALENDAR'],

  _sheets: function() {
    return {
      CALENDAR: (CONFIG.CAMPAIGN_PLANNER || {}).CALENDAR_SHEET_NAME || 'Content Calendar',
      PIPELINE: CONFIG.SHEET_NAME,
      VISUAL:   CONFIG.VISUAL_PIPELINE.SHEET_NAME,
      ADS:      CONFIG.PAID_ADS.SHEET_NAME
    };
  },

  // ------------------------------------------------------------- the guard

  // Refuses to run while any tab still transfers by formula. A single array
  // formula left in place makes every row position load-bearing again, and the
  // corruption that follows a delete is silent.
  assertNoTransferFormulas: function() {
    var sheets = this._sheets();
    var offenders = [];
    var watched = [sheets.PIPELINE, sheets.VISUAL];

    for (var i = 0; i < watched.length; i++) {
      var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(watched[i]);

      if (!sheet) {
        continue;
      }

      var lastRow = Math.min(sheet.getLastRow(), 400);
      var lastColumn = sheet.getLastColumn();

      if (lastRow < CONFIG.DATA_START_ROW || !lastColumn) {
        continue;
      }

      var formulas = sheet
        .getRange(CONFIG.DATA_START_ROW, 1,
          lastRow - CONFIG.DATA_START_ROW + 1, lastColumn)
        .getFormulas();
      var found = 0;

      for (var r = 0; r < formulas.length; r++) {
        for (var c = 0; c < formulas[r].length; c++) {
          if (formulas[r][c]) {
            found++;
          }
        }
      }

      if (found) {
        offenders.push(watched[i] + ' (' + found + ' formula cells)');
      }
    }

    if (offenders.length) {
      throw new Error(
        'Archiving is refused while these tabs still pull their rows by ' +
        'formula: ' + offenders.join(', ') + '.\n\n' +
        'A formula binds a row to its POSITION. Deleting a row above it makes ' +
        'every formula below silently read a different post\'s data — no ' +
        '#REF!, no error, nothing to notice.\n\n' +
        'Replace them with AI Workers → Planning → Transfer Rows Forward, ' +
        'which writes the same values keyed on Calendar ID and Content ID. ' +
        'Then archiving is safe.'
      );
    }
  },

  // ------------------------------------------------------------- readiness

  progress: function(batch) {
    var sheets = this._sheets();
    var visual = Batches.rowsIn(batch, sheets.VISUAL);
    var published = 0;

    for (var i = 0; i < visual.rows.length; i++) {
      var data = SheetSchema.getRowData(visual.rows[i], sheets.VISUAL);

      if (String(data['Live Post URL'] || '').trim()) {
        published++;
      }
    }

    return {
      planned: batch.count,
      inVisual: visual.rows.length,
      published: published,
      unpublished: visual.rows.length - published,
      neverReachedVisual: batch.count - visual.rows.length,
      finished: batch.count > 0 &&
        visual.rows.length === batch.count &&
        published === batch.count
    };
  },

  // Batches safe to archive, newest first. A batch still in production is not
  // offered — archiving work in progress takes it out from under the workers.
  candidates: function() {
    var out = [];
    var all = Batches.all();

    for (var i = 0; i < all.length; i++) {
      if (all[i].unstamped) {
        // Rows planned before Batch ID existed have no boundary anyone can
        // trust. Archiving them would mean archiving "everything before some
        // point nobody wrote down".
        continue;
      }

      var state = this.progress(all[i]);

      if (state.finished) {
        out.push({ batch: all[i], progress: state });
      }
    }

    return out;
  },

  // --------------------------------------------------------- the joined row

  // Reads a batch out of all four tabs and joins it into one record per post.
  //
  // Column names are namespaced by the tab they came from ONLY where two tabs
  // use the same name for different things. Where a column is genuinely the
  // same fact — Calendar ID, Campaign Name — it is written once.
  collect: function(batch) {
    var sheets = this._sheets();
    var calendarRows = {};
    var order = [];

    // --- the calendar: one entry per scheduled post ---
    for (var i = 0; i < batch.rows.length; i++) {
      var row = SheetSchema.getRowData(batch.rows[i], sheets.CALENDAR);
      var calendarId = String(row['Calendar ID'] || '').trim();

      if (!calendarId) {
        continue;
      }

      calendarRows[calendarId] = { calendar: row, row: batch.rows[i] };
      order.push(calendarId);
    }

    // --- the pipeline, joined on Calendar ID ---
    var pipeline = Batches.rowsIn(batch, sheets.PIPELINE);
    var byContentId = {};

    for (var p = 0; p < pipeline.rows.length; p++) {
      var pipelineRow = SheetSchema.getRowData(pipeline.rows[p], sheets.PIPELINE);
      var key = String(pipelineRow['Calendar ID'] || '').trim();

      if (calendarRows[key]) {
        calendarRows[key].pipeline = pipelineRow;

        var contentId = String(pipelineRow['Content ID'] || '').trim();

        if (contentId) {
          byContentId[contentId] = calendarRows[key];
        }
      }
    }

    // --- the visual and ads tabs, joined on Content ID ---
    var joins = [
      { key: 'visual', sheet: sheets.VISUAL },
      { key: 'ads', sheet: sheets.ADS }
    ];

    for (var j = 0; j < joins.length; j++) {
      var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(joins[j].sheet);

      if (!sheet) {
        continue;
      }

      var lastRow = sheet.getLastRow();

      for (var r = CONFIG.DATA_START_ROW; r <= lastRow; r++) {
        var data = SheetSchema.getRowData(r, joins[j].sheet);
        var id = String(data['Content ID'] || '').trim();

        if (id && byContentId[id]) {
          byContentId[id][joins[j].key] = data;
          byContentId[id][joins[j].key + 'Row'] = r;
        }
      }
    }

    var records = [];

    for (var o = 0; o < order.length; o++) {
      records.push(calendarRows[order[o]]);
    }

    return records;
  },

  // The archive's own column order. Built from what each tab contributes that
  // nothing before it already said, so the same fact is never stored twice.
  columns: function() {
    var seen = {};
    var out = [];
    var sheets = this._sheets();
    var sources = [
      { prefix: '', sheet: sheets.CALENDAR },
      { prefix: '', sheet: sheets.PIPELINE },
      { prefix: '', sheet: sheets.VISUAL },
      { prefix: 'Ad ', sheet: sheets.ADS }
    ];

    for (var s = 0; s < sources.length; s++) {
      var sheet = SpreadsheetApp.getActiveSpreadsheet()
        .getSheetByName(sources[s].sheet);

      if (!sheet || !sheet.getLastColumn()) {
        continue;
      }

      var header = sheet
        .getRange(CONFIG.HEADER_ROW, 1, 1, sheet.getLastColumn())
        .getValues()[0];

      for (var c = 0; c < header.length; c++) {
        var name = String(header[c] || '').trim();

        if (!name) {
          continue;
        }

        // The ads tab repeats identity columns it was given. Those are the same
        // fact, so they are skipped rather than prefixed into a near-duplicate.
        var label = seen[name] && sources[s].prefix
          ? sources[s].prefix + name
          : name;

        if (seen[label]) {
          continue;
        }

        seen[label] = true;
        out.push({ label: label, from: sources[s].sheet, column: name });
      }
    }

    out.push({ label: this.STAMP, from: null, column: null });

    return out;
  },

  _mirror: function(columns) {
    var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = spreadsheet.getSheetByName(this.SHEET_NAME);
    var header = columns.map(function(c) { return c.label; });

    if (!sheet) {
      sheet = spreadsheet.insertSheet(this.SHEET_NAME);
      sheet.getRange(1, 1, 1, header.length).setValues([header]);
      sheet.getRange(1, 1, 1, header.length).setFontWeight('bold');
      sheet.setFrozenRows(1);
      sheet.hideSheet();

      Logger.log('ARCHIVE | created "' + this.SHEET_NAME + '" with ' +
        header.length + ' columns');
      return sheet;
    }

    // A working tab may have gained a column since the archive was made.
    if (sheet.getLastColumn() < header.length) {
      sheet.getRange(1, 1, 1, header.length).setValues([header]);
    }

    return sheet;
  },

  // -------------------------------------------------------------- the plan

  preview: function(batchId) {
    var batch = Batches.byId(batchId);

    if (!batch) {
      throw new Error('No batch called "' + batchId + '".');
    }

    var sheets = this._sheets();
    var records = this.collect(batch);
    var plan = [];
    var total = 0;

    for (var i = 0; i < this.ORDER.length; i++) {
      var key = this.ORDER[i];
      var rows = [];

      for (var r = 0; r < records.length; r++) {
        if (key === 'CALENDAR') {
          rows.push(records[r].row);
        } else if (key === 'PIPELINE' && records[r].pipeline) {
          rows.push(records[r].pipeline._row || null);
        } else if (key === 'VISUAL' && records[r].visualRow) {
          rows.push(records[r].visualRow);
        } else if (key === 'ADS' && records[r].adsRow) {
          rows.push(records[r].adsRow);
        }
      }

      rows = rows.filter(function(n) { return n; });

      plan.push({ key: key, sheet: sheets[key], rows: rows, count: rows.length });
      total += rows.length;
    }

    return {
      batch: batch,
      progress: this.progress(batch),
      records: records,
      plan: plan,
      total: total
    };
  },

  // ------------------------------------------------------------- the move

  run: function(batchId) {
    this.assertNoTransferFormulas();

    var preview = this.preview(batchId);
    var columns = this.columns();
    var stampedAt = new Date();
    var sheet = this._mirror(columns);

    // --- phase one: write the joined rows, and count them ---
    var payload = [];

    for (var i = 0; i < preview.records.length; i++) {
      var record = preview.records[i];
      var source = {
        calendar: record.calendar,
        pipeline: record.pipeline,
        visual: record.visual,
        ads: record.ads
      };
      var sheets = this._sheets();
      var line = [];

      for (var c = 0; c < columns.length; c++) {
        var column = columns[c];

        if (column.label === this.STAMP) {
          line.push(stampedAt);
          continue;
        }

        var from =
          column.from === sheets.CALENDAR ? source.calendar :
          column.from === sheets.PIPELINE ? source.pipeline :
          column.from === sheets.VISUAL   ? source.visual :
          column.from === sheets.ADS      ? source.ads : null;

        line.push(from && from[column.column] !== undefined ? from[column.column] : '');
      }

      payload.push(line);
    }

    if (!payload.length) {
      throw new Error('Nothing to archive: ' + batchId + ' resolved to no rows.');
    }

    var at = sheet.getLastRow() + 1;
    sheet.getRange(at, 1, payload.length, columns.length).setValues(payload);
    SpreadsheetApp.flush();

    var landed = sheet.getLastRow() - at + 1;

    if (landed !== payload.length) {
      throw new Error(
        'Archiving stopped before deleting anything. ' + payload.length +
        ' rows were meant to be written and ' + landed + ' landed. Nothing has ' +
        'been removed from the working tabs. The partial write is at the bottom ' +
        'of the "' + this.SHEET_NAME + '" sheet and can be deleted by hand.'
      );
    }

    // --- phase two: delete, furthest downstream first ---
    var removed = 0;
    var report = [];

    for (var j = 0; j < preview.plan.length; j++) {
      var step = preview.plan[j];

      if (!step.count) {
        report.push({ sheet: step.sheet, removed: 0 });
        continue;
      }

      var target = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(step.sheet);
      var ordered = step.rows.slice().sort(function(a, b) { return b - a; });

      for (var d = 0; d < ordered.length; d++) {
        target.deleteRow(ordered[d]);
        removed++;
      }

      SpreadsheetApp.flush();
      report.push({ sheet: step.sheet, removed: ordered.length });
    }

    Logger.log(
      'ARCHIVE | ' + batchId + ' | ' + landed + ' joined rows written, ' +
      removed + ' rows removed | ' + report.map(function(r) {
        return r.sheet + ':' + r.removed;
      }).join(' ')
    );

    return { batchId: batchId, archived: landed, removed: removed, sheets: report };
  }
};


// ================================
// MENU — AI Workers → Maintenance → Archive A Finished Plan
// ================================

function archiveFinishedPlan() {
  var ui = SpreadsheetApp.getUi();

  try {
    Archive.assertNoTransferFormulas();

    var candidates = Archive.candidates();

    if (!candidates.length) {
      var all = Batches.all().filter(function(b) { return !b.unstamped; });

      if (!all.length) {
        ui.alert('Archive A Finished Plan',
          'No batch has been planned yet. Rows planned before Batch ID existed ' +
          'are not archivable — there is no recorded boundary to trust.',
          ui.ButtonSet.OK);
        return;
      }

      var lines = ['No plan is finished yet.', ''];

      for (var i = 0; i < Math.min(all.length, 5); i++) {
        var p = Archive.progress(all[i]);
        lines.push(all[i].id + ' — ' + p.published + ' of ' + p.planned +
          ' published' +
          (p.neverReachedVisual ? ', ' + p.neverReachedVisual +
            ' never reached the Visual Pipeline' : ''));
      }

      lines.push('');
      lines.push('A plan is archivable when every one of its rows is live.');
      lines.push('Archiving work in progress takes it out from under the workers.');

      ui.alert('Archive A Finished Plan', lines.join('\n'), ui.ButtonSet.OK);
      return;
    }

    var pick = ['Finished plans:', ''];

    for (var c = 0; c < Math.min(candidates.length, 9); c++) {
      pick.push((c + 1) + ')  ' + Batches.describe(candidates[c].batch));
    }

    pick.push('');
    pick.push('Enter a number.');

    var choice = ui.prompt('Archive A Finished Plan', pick.join('\n'),
      ui.ButtonSet.OK_CANCEL);

    if (choice.getSelectedButton() !== ui.Button.OK) {
      return;
    }

    var index = parseInt(choice.getResponseText(), 10);

    if (isNaN(index) || index < 1 || index > Math.min(candidates.length, 9)) {
      ui.alert('Archive A Finished Plan', 'No plan with that number.', ui.ButtonSet.OK);
      return;
    }

    var batchId = candidates[index - 1].batch.id;
    var preview = Archive.preview(batchId);
    var detail = [
      preview.records.length + ' posts will be joined into one row each in the ' +
        '"' + Archive.SHEET_NAME + '" sheet — what was scheduled, written, ' +
        'produced and advertised, read left to right.',
      '',
      'Then ' + preview.total + ' rows are removed:'
    ];

    for (var p = 0; p < preview.plan.length; p++) {
      if (preview.plan[p].count) {
        detail.push('   ' + preview.plan[p].count + ' from ' + preview.plan[p].sheet);
      }
    }

    detail.push('');
    detail.push('The joined rows are written and counted first. If the write is');
    detail.push('short, nothing is deleted.');
    detail.push('');
    detail.push('This is the only operation in the system that removes rows from a');
    detail.push('working tab. Type the batch id to confirm:');
    detail.push('');
    detail.push(batchId);

    var confirm = ui.prompt('Archive A Finished Plan', detail.join('\n'),
      ui.ButtonSet.OK_CANCEL);

    if (confirm.getSelectedButton() !== ui.Button.OK) {
      return;
    }

    if (String(confirm.getResponseText()).trim() !== batchId) {
      ui.alert('Archive A Finished Plan',
        'That did not match the batch id. Nothing was moved.', ui.ButtonSet.OK);
      return;
    }

    var result = Archive.run(batchId);

    ui.alert(
      'Archive A Finished Plan',
      result.archived + ' posts archived, ' + result.removed + ' rows removed ' +
      'from the working tabs.\n\n' +
      'They are in the hidden "' + Archive.SHEET_NAME + '" sheet. Unhide it ' +
      'from the sheet tab menu if you want to read them.',
      ui.ButtonSet.OK
    );

  } catch (e) {
    ui.alert('Archive A Finished Plan', e.message || e.toString(), ui.ButtonSet.OK);
  }
}
