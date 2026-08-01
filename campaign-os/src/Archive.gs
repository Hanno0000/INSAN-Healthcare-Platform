// ================================
// ARCHIVE
//
// A finished plan is still weight. Every cycle adds its rows to three sheets
// and none of them ever shrink, so the workbook a year from now carries every
// post ever made in the tabs the workers read on every run.
//
// Archiving moves a completed batch out of the three working sheets into three
// mirrors of them. Nothing is deleted in the sense of being lost — every row
// exists, in a sheet with the same columns, and can be read or copied back.
//
// ------------------------------------------------------------------------
// WHY THIS IS THE MOST DANGEROUS CODE IN THE SYSTEM
//
// The Visual Pipeline reads the Content Pipeline through **2,244 direct cell
// references** — `'Content Pipeline'!AB100`, one per cell, not a lookup. That
// makes row position load-bearing across sheets:
//
//   delete Content Pipeline row 100
//     → every Visual Pipeline formula pointing INTO it becomes #REF!
//     → every formula pointing BELOW it silently re-points one row up
//
// The second half is the dangerous one. It does not fail; it quietly starts
// reading a different post's data, and nothing in the sheet looks wrong.
//
// So deletion happens in dependency order — Visual Pipeline first, then Content
// Pipeline, then Content Calendar. A referencing row is always removed before
// the row it references, so no #REF! is ever created and no surviving formula
// is ever left pointing at a row that moved under it.
//
// And it happens only after the copy is written AND counted. A copy that did
// not fully land must never be followed by a delete.
// ================================

var Archive = {

  SUFFIX: ' Archive',
  STAMP: 'Archived At',

  // Deleted in this order. Each sheet is removed before the sheet it is
  // referenced BY is reached — see the note above.
  ORDER: ['VISUAL', 'PIPELINE', 'CALENDAR'],

  _sheets: function() {
    return {
      VISUAL:   CONFIG.VISUAL_PIPELINE.SHEET_NAME,
      PIPELINE: CONFIG.SHEET_NAME,
      CALENDAR: (CONFIG.CAMPAIGN_PLANNER || {}).CALENDAR_SHEET_NAME || 'Content Calendar'
    };
  },

  // ------------------------------------------------------------- readiness

  // How far through production a batch is.
  //
  // "Finished" means every calendar row reached the Visual Pipeline and carries
  // a Live Post URL. Anything short of that is still work, and archiving work
  // in progress removes it from under the workers that are mid-way through it.
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

  // Batches that are safe to archive, newest first. A batch still in production
  // is not offered — the operator can still force one, but not by accident.
  candidates: function() {
    var out = [];
    var all = Batches.all();

    for (var i = 0; i < all.length; i++) {
      if (all[i].unstamped) {
        // The rows planned before Batch ID existed have no boundary anyone can
        // trust. Archiving them would be archiving "everything before some
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

  // ------------------------------------------------------------ the mirror

  // The archive sheet for a working sheet, created on demand with the same
  // header, plus a column recording when the row was archived.
  _mirror: function(sheetName) {
    var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    var live = spreadsheet.getSheetByName(sheetName);

    if (!live) {
      throw new Error('Sheet "' + sheetName + '" not found.');
    }

    var mirrorName = sheetName + this.SUFFIX;
    var mirror = spreadsheet.getSheetByName(mirrorName);
    var width = live.getLastColumn();
    var header = live.getRange(CONFIG.HEADER_ROW, 1, 1, width).getValues()[0];

    if (!mirror) {
      mirror = spreadsheet.insertSheet(mirrorName);
      mirror.getRange(1, 1, 1, width).setValues([header]);
      mirror.getRange(1, width + 1).setValue(this.STAMP);
      mirror.getRange(1, 1, 1, width + 1).setFontWeight('bold');
      mirror.setFrozenRows(1);
      mirror.hideSheet();

      Logger.log('ARCHIVE | created "' + mirrorName + '"');
      return mirror;
    }

    // The working sheet may have gained a column since the mirror was made.
    // Widening keeps the two shapes comparable; narrowing never happens.
    if (mirror.getLastColumn() < width + 1) {
      mirror.getRange(1, 1, 1, width).setValues([header]);
      mirror.getRange(1, width + 1).setValue(this.STAMP);
    }

    return mirror;
  },

  // Copies rows into the mirror and returns how many landed. Values only —
  // a formula copied into an archive would keep pointing at the live sheet and
  // change meaning the moment anything moved.
  _copy: function(sheetName, rows, stampedAt) {
    if (!rows.length) {
      return 0;
    }

    var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    var live = spreadsheet.getSheetByName(sheetName);
    var mirror = this._mirror(sheetName);
    var width = live.getLastColumn();
    var payload = [];

    for (var i = 0; i < rows.length; i++) {
      var values = live.getRange(rows[i], 1, 1, width).getValues()[0];
      values.push(stampedAt);
      payload.push(values);
    }

    var at = mirror.getLastRow() + 1;
    mirror.getRange(at, 1, payload.length, width + 1).setValues(payload);
    SpreadsheetApp.flush();

    // Counted, not assumed. A copy that did not fully land must never be
    // followed by a delete.
    var landed = mirror.getLastRow() - at + 1;

    return landed;
  },

  // Removes rows bottom-up. Top-down deletion shifts every row under the one
  // being removed, so the second index in the list is already wrong.
  _remove: function(sheetName, rows) {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
    var ordered = rows.slice().sort(function(a, b) { return b - a; });
    var removed = 0;

    for (var i = 0; i < ordered.length; i++) {
      sheet.deleteRow(ordered[i]);
      removed++;
    }

    SpreadsheetApp.flush();
    return removed;
  },

  // -------------------------------------------------------------- the plan

  // What archiving this batch would do, without doing any of it. Every number
  // the confirmation shows comes from here, so the operator is confirming the
  // same figures the run will act on.
  preview: function(batchId) {
    var batch = Batches.byId(batchId);

    if (!batch) {
      throw new Error('No batch called "' + batchId + '".');
    }

    var sheets = this._sheets();
    var state = this.progress(batch);
    var plan = [];
    var total = 0;

    for (var i = 0; i < this.ORDER.length; i++) {
      var key = this.ORDER[i];
      var sheetName = sheets[key];
      var resolved = key === 'CALENDAR'
        ? { rows: batch.rows, contiguous: true }
        : Batches.rowsIn(batch, sheetName);

      plan.push({
        key: key,
        sheet: sheetName,
        rows: resolved.rows,
        count: resolved.rows.length
      });

      total += resolved.rows.length;
    }

    return { batch: batch, progress: state, plan: plan, total: total };
  },

  // ------------------------------------------------------------- the move

  // Copy every sheet, verify every count, and only then delete anything.
  //
  // Returns { copied, removed, sheets: [...] }. Throws before touching the
  // working sheets if any copy is short.
  run: function(batchId) {
    var preview = this.preview(batchId);
    var stampedAt = new Date();
    var copied = 0;
    var report = [];

    // --- phase one: copy everything, verify everything ---
    for (var i = 0; i < preview.plan.length; i++) {
      var step = preview.plan[i];

      if (!step.count) {
        report.push({ sheet: step.sheet, copied: 0, removed: 0 });
        continue;
      }

      var landed = this._copy(step.sheet, step.rows, stampedAt);

      if (landed !== step.count) {
        throw new Error(
          'Archiving stopped before deleting anything. ' + step.sheet + ': ' +
          step.count + ' rows were meant to be copied and ' + landed +
          ' landed. Nothing has been removed from the working sheets. The ' +
          'partial copy is in "' + step.sheet + this.SUFFIX + '" and can be ' +
          'deleted by hand.'
        );
      }

      copied += landed;
      report.push({ sheet: step.sheet, copied: landed, removed: 0 });
    }

    // --- phase two: delete, in dependency order ---
    //
    // Visual Pipeline first. It holds 2,244 direct references into the Content
    // Pipeline, so a referencing row must always go before the row it points
    // at — otherwise the survivors silently re-point one row up.
    var removed = 0;

    for (var j = 0; j < preview.plan.length; j++) {
      var target = preview.plan[j];

      if (!target.count) {
        continue;
      }

      var gone = this._remove(target.sheet, target.rows);
      removed += gone;
      report[j].removed = gone;
    }

    Logger.log(
      'ARCHIVE | ' + batchId + ' | copied ' + copied + ' rows, removed ' +
      removed + ' | ' + report.map(function(r) {
        return r.sheet + ':' + r.removed;
      }).join(' ')
    );

    return { batchId: batchId, copied: copied, removed: removed, sheets: report };
  }
};


// ================================
// MENU — AI Workers → Maintenance → Archive A Finished Plan
// ================================

function archiveFinishedPlan() {
  var ui = SpreadsheetApp.getUi();

  try {
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
      'This will move ' + preview.total + ' rows out of three sheets:',
      ''
    ];

    for (var p = 0; p < preview.plan.length; p++) {
      detail.push('   ' + preview.plan[p].count + ' from ' + preview.plan[p].sheet);
    }

    detail.push('');
    detail.push('They are copied into hidden "... Archive" sheets first, and the');
    detail.push('copy is counted before anything is removed. If a copy is short,');
    detail.push('nothing is deleted.');
    detail.push('');
    detail.push('This is the only operation in the system that removes rows from a');
    detail.push('working sheet. Type the batch id to confirm:');
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
      result.copied + ' rows archived, ' + result.removed + ' removed from the ' +
      'working sheets.\n\n' +
      'They are in the hidden "... Archive" sheets. Unhide them from the sheet ' +
      'tab menu if you want to read them.',
      ui.ButtonSet.OK
    );

  } catch (e) {
    ui.alert('Archive A Finished Plan', e.message || e.toString(), ui.ButtonSet.OK);
  }
}
