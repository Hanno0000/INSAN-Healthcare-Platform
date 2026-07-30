var SheetWriter = {

  _getSheet: function(sheetName) {
    var targetSheet = sheetName || CONFIG.SHEET_NAME;
    return SpreadsheetApp.getActiveSpreadsheet()
      .getSheetByName(targetSheet);
  },

  _getVisualSheet: function() {
    return this._getSheet(CONFIG.VISUAL_PIPELINE.SHEET_NAME);
  },

  // Sheets coerces some written values ("4.0" -> 4, collapsed whitespace,
  // trimmed newlines). Those are successful writes, not failures.
  _valuesMatch: function(expected, actual) {
    if (expected instanceof Date && actual instanceof Date) {
      return expected.getTime() === actual.getTime();
    }

    var e = String(expected).trim();
    var a = String(actual).trim();

    if (e === a) {
      return true;
    }

    var eNum = parseFloat(e);
    var aNum = parseFloat(a);
    if (!isNaN(eNum) && !isNaN(aNum) && eNum === aNum) {
      return true;
    }

    return e.replace(/\s+/g, ' ') === a.replace(/\s+/g, ' ');
  },

  // Keeps the dropdown, but stops it rejecting input. This is preferred over
  // clearDataValidations(), which destroys the dropdown permanently and quietly
  // degrades the sheet one cell at a time.
  _relaxValidation: function(range) {
    try {
      var rule = range.getDataValidation();

      if (!rule) {
        return false;
      }

      range.setDataValidation(rule.copy().setAllowInvalid(true).build());
      return true;

    } catch (e) {
      return false;
    }
  },

  _safeClearValidation: function(range) {
    try {
      range.clearDataValidations();
      return true;
    } catch (e) {
      return false;
    }
  },

  // A worker must never halt because a value is missing from the controlled
  // vocabulary. Deviations are written through and recorded, so the vocabulary
  // can be corrected later from real production evidence.
  _writeCellSafe: function(range, value, rowNumber, colName, colIndex) {
    var attempt = function() {
      range.setValue(value);
      SpreadsheetApp.flush();
    };

    try {
      attempt();

    } catch (e) {
      // Error text is locale-dependent, so never branch on its wording.
      // Any write failure is treated as potentially validation-related.
      var recovered = false;

      if (this._relaxValidation(range)) {
        try {
          attempt();
          recovered = true;
          Logger.logValidationBypass(
            rowNumber, colName, value, 'relaxed to warn-only (dropdown kept)'
          );
        } catch (relaxErr) {
          recovered = false;
        }
      }

      if (!recovered && this._safeClearValidation(range)) {
        try {
          attempt();
          recovered = true;
          Logger.logValidationBypass(
            rowNumber, colName, value, 'validation cleared on this cell'
          );
        } catch (clearErr) {
          recovered = false;
        }
      }

      if (!recovered) {
        Logger.log(
          'WRITE_FAILED | Row: ' + rowNumber + ' | Column: ' + colName +
          ' (col ' + colIndex + ') | ' + e.toString()
        );
        return false;
      }
    }

    var actualRaw = range.getValue();
    var match = this._valuesMatch(value, actualRaw);

    Logger.log(
      'VERIFY_WRITE | Row: ' + rowNumber +
      ' | Column: ' + colName +
      ' | Expected: [' + String(value).substring(0, 100) + ']' +
      ' | Actual: [' + String(actualRaw).substring(0, 100) + ']' +
      ' | Match: ' + match
    );

    if (!match) {
      // Report it, do not throw. A mismatched cell is a data issue to review
      // later; it is not a reason to abort the run.
      Logger.log(
        'WRITE_VERIFICATION_MISMATCH | Row: ' + rowNumber +
        ' | Column: ' + colName +
        ' | Expected: [' + String(value).substring(0, 200) + ']' +
        ' | Actual: [' + String(actualRaw).substring(0, 200) + ']'
      );
      return false;
    }

    Logger.log('WRITE_SUCCESS | Row: ' + rowNumber + ' | Column: ' + colName);
    return true;
  },

  writeToRow: function(rowNumber, columnValues, workerName) {
    var workerConfig = CONFIG.WORKERS[workerName];

    if (!workerConfig) {
      throw new Error('Unknown worker for writing: ' + workerName);
    }

    var sheetName = workerConfig.sheetName || CONFIG.SHEET_NAME;

    Logger.log('WRITER_INCOMING_PAYLOAD | Row: ' + rowNumber + ' | Worker: ' + workerName + ' | Sheet: ' + sheetName + ' | Keys: ' + Object.keys(columnValues).join(', '));

    var allowedColumns = {};
    for (var i = 0; i < workerConfig.writeColumns.length; i++) {
      allowedColumns[workerConfig.writeColumns[i]] = true;
    }

    var sheet = this._getSheet(sheetName);
    var columnMap = SheetSchema._getColumnMap(sheetName);

    var written = [];
    var skipped = [];

    for (var colName in columnValues) {
      if (!allowedColumns[colName]) {
        Logger.log('WRITER_SKIPPED_NOT_ALLOWED | Column: ' + colName);
        skipped.push(colName);
        continue;
      }

      var colIndex = columnMap[colName];

      if (!colIndex) {
        Logger.log('WRITER_SKIPPED_NO_COLUMN | Column: ' + colName + ' | NOT FOUND in header map');
        skipped.push(colName + ' (column not found in sheet)');
        continue;
      }

      var value = columnValues[colName];

      if (value === undefined || value === null) {
        value = '';
      }

      Logger.log(
        'WRITE_ATTEMPT | Row: ' + rowNumber +
        ' | Column: ' + colName +
        ' | ColIndex: ' + colIndex +
        ' | ValueLength: ' + String(value).length +
        ' | Value: ' + String(value).substring(0, 100)
      );

      var range = sheet.getRange(rowNumber, colIndex);
      var writeOk = this._writeCellSafe(range, String(value), rowNumber, colName, colIndex);
      if (writeOk) {
        written.push(colName);
      } else {
        Logger.log('WRITE_FAILED_SILENTLY | Row: ' + rowNumber + ' | Column: ' + colName);
        skipped.push(colName + ' (write failed)');
      }
    }

    Logger.log('WRITER_SUMMARY | Row: ' + rowNumber + ' | Written: ' + written.join(', ') + ' | Skipped: ' + skipped.join(', '));

    return {
      written: written,
      skipped: skipped,
      rowNumber: rowNumber
    };
  },

  writeAIWorkerTag: function(rowNumber, workerName, sheetName) {
    var targetSheet = sheetName || CONFIG.SHEET_NAME;
    var colIndex = SheetSchema.getColumnIndex(CONFIG.COLUMN_NAMES.AI_WORKER, targetSheet);

    if (colIndex === -1) return;

    var sheet = this._getSheet(targetSheet);
    var cell = sheet.getRange(rowNumber, colIndex);
    var current = cell.getValue();
    var tag = workerName.replace('_WORKER', '');

    if (current && String(current).trim() !== '') {
      tag = String(current).trim() + ' + ' + tag;
    }

    this._writeCellSafe(cell, tag, rowNumber, 'AI Worker', colIndex);
  },

  writeTimestamp: function(rowNumber, columnName, sheetName) {
    var targetSheet = sheetName || CONFIG.SHEET_NAME;
    var colIndex = SheetSchema.getColumnIndex(columnName, targetSheet);

    if (colIndex === -1) return;

    var sheet = this._getSheet(targetSheet);
    var cell = sheet.getRange(rowNumber, colIndex);

    if (!cell.getValue()) {
      this._writeCellSafe(cell, new Date(), rowNumber, columnName, colIndex);
    }
  },

  clearWorkerOutput: function(rowNumber, workerName) {
    var workerConfig = CONFIG.WORKERS[workerName];

    if (!workerConfig) return;

    var sheetName = workerConfig.sheetName || CONFIG.SHEET_NAME;
    var sheet = this._getSheet(sheetName);
    var columnMap = SheetSchema._getColumnMap(sheetName);

    for (var i = 0; i < workerConfig.writeColumns.length; i++) {
      var colName = workerConfig.writeColumns[i];
      var colIndex = columnMap[colName];

      if (colIndex) {
        this._writeCellSafe(
          sheet.getRange(rowNumber, colIndex), '',
          rowNumber, colName, colIndex
        );
      }
    }
  },

  // Resolves the columns a stage owns, for both workers and services.
  _stageWriteColumns: function(stageName) {
    if (CONFIG.WORKERS[stageName]) {
      return {
        columns: CONFIG.WORKERS[stageName].writeColumns || [],
        sheet: CONFIG.WORKERS[stageName].sheetName || CONFIG.SHEET_NAME
      };
    }

    if (CONFIG.SERVICES[stageName]) {
      return {
        columns: CONFIG.SERVICES[stageName].writeColumns || [],
        sheet: CONFIG.SERVICES[stageName].sheetName || CONFIG.SHEET_NAME
      };
    }

    return null;
  },

  // Wipes everything produced after `stageName` in the same pipeline.
  //
  // A worker overwrites its own columns on every run — the parser emits every
  // output field, blank when the model omitted one. What it never touched was
  // the output of *later* stages, which is derived from inputs this run just
  // replaced. Re-planning a row therefore left the previous run's generated
  // images and its "Approved" QA verdict sitting beside a brand-new brief:
  // a row that reads as approved and publishable, whose assets came from a
  // brief that no longer exists.
  //
  // Clearing is the honest state. A blank QA verdict says "not yet judged",
  // which is true; a stale one asserts something false about work that has
  // since been redone.
  clearDownstreamOutput: function(rowNumber, stageName) {
    var pipelines = CONFIG.STAGE_ORDER || {};
    var cleared = [];

    for (var key in pipelines) {
      var stages = pipelines[key];
      var position = stages.indexOf(stageName);

      if (position === -1) {
        continue;
      }

      // Some columns have more than one writer by design: the Creative
      // Director refines the same 18 strategy fields the Content Strategy
      // Worker proposes, so those names appear in *both* stages' writeColumns.
      //
      // Appearing in a later stage's writeColumns does not make a column that
      // stage's output. It belongs to the earliest stage that writes it, and
      // that stage has already run. Treating it as downstream deletes work
      // this very execution just produced — which is exactly what happened:
      // the Content Creation Worker wiped every strategy field on each row it
      // touched, because all 18 sit in the Creative Director's writeColumns.
      //
      // So protect every column written at or before this stage, not just the
      // caller's own. What remains is genuinely downstream: derived from
      // inputs this run replaced, and safe to clear.
      var protectedCols = {};
      for (var p = 0; p <= position; p++) {
        var upstream = this._stageWriteColumns(stages[p]);

        if (!upstream) {
          continue;
        }

        for (var u = 0; u < upstream.columns.length; u++) {
          protectedCols[upstream.columns[u]] = true;
        }
      }

      for (var i = position + 1; i < stages.length; i++) {
        var target = this._stageWriteColumns(stages[i]);

        if (!target || !target.columns.length) {
          continue;
        }

        var sheet = this._getSheet(target.sheet);
        var columnMap = SheetSchema._getColumnMap(target.sheet);

        if (!sheet) {
          continue;
        }

        for (var c = 0; c < target.columns.length; c++) {
          var colName = target.columns[c];

          if (protectedCols[colName]) {
            continue;
          }

          var colIndex = columnMap[colName];

          if (!colIndex) {
            continue;
          }

          var cell = sheet.getRange(rowNumber, colIndex);

          // Only touch cells that actually hold something — avoids pointless
          // writes and keeps the log readable.
          if (String(cell.getValue() || '').trim() === '') {
            continue;
          }

          this._writeCellSafe(cell, '', rowNumber, colName, colIndex);
          cleared.push(colName);
        }
      }
    }

    if (cleared.length) {
      Logger.log(
        'STALE_CLEARED | Row: ' + rowNumber + ' | Re-ran: ' + stageName +
        ' | Cleared downstream: ' + cleared.join(', ')
      );
    }

    return cleared;
  },

  batchWrite: function(rowsData, workerName) {
    var results = [];

    for (var i = 0; i < rowsData.length; i++) {
      var result = this.writeToRow(
        rowsData[i].rowNumber,
        rowsData[i].values,
        workerName
      );
      results.push(result);
    }

    return results;
  },

  writeCell: function(rowNumber, columnName, value, sheetName) {
    var resolvedSheet = sheetName || CONFIG.SHEET_NAME;
    var sheet = this._getSheet(resolvedSheet);
    var columnMap = SheetSchema._getColumnMap(resolvedSheet);
    var col = columnMap[columnName];

    if (!col) {
      Logger.log('WRITE_CELL_SKIPPED | Column not found: ' + columnName +
        ' in sheet "' + resolvedSheet + '"');
      return false;
    }

    return this._writeCellSafe(
      sheet.getRange(rowNumber, col), value, rowNumber, columnName, col
    );
  },

  // Writes the machine state. Deliberately not "Workflow Status" — that column
  // is the operator's editorial workflow and shares only one value with this
  // state machine, so every write here used to be rejected by its dropdown.
  // (Audit A, finding F4.)
  writePipelineState: function(rowNumber, state, sheetName) {
    var resolvedSheet = sheetName || CONFIG.SHEET_NAME;
    return this.writeCell(
      rowNumber, CONFIG.COLUMN_NAMES.PIPELINE_STATE, state, resolvedSheet
    );
  },

  // One-time repair: converts every "reject input" dropdown on a sheet into a
  // "show warning" dropdown. The list still appears for human editors and the
  // cell is still flagged when it holds an unexpected value — but a worker can
  // no longer be blocked from writing.
  //
  // This is the root-cause fix. _writeCellSafe is the per-cell safety net for
  // anything added to the sheet afterwards.
  relaxSheetValidation: function(sheetName) {
    var resolvedSheet = sheetName || CONFIG.SHEET_NAME;
    var sheet = this._getSheet(resolvedSheet);

    if (!sheet) {
      return { sheet: resolvedSheet, error: 'Sheet not found' };
    }

    var lastRow = Math.max(sheet.getLastRow(), CONFIG.DATA_START_ROW);
    var lastCol = sheet.getLastColumn();

    if (lastRow < 1 || lastCol < 1) {
      return { sheet: resolvedSheet, relaxed: 0, scanned: 0 };
    }

    var range = sheet.getRange(1, 1, lastRow, lastCol);
    var rules = range.getDataValidations();
    var relaxed = 0;
    var scanned = 0;
    var changed = false;

    for (var r = 0; r < rules.length; r++) {
      for (var c = 0; c < rules[r].length; c++) {
        var rule = rules[r][c];

        if (!rule) {
          continue;
        }

        scanned++;

        if (rule.getAllowInvalid()) {
          continue;
        }

        rules[r][c] = rule.copy().setAllowInvalid(true).build();
        relaxed++;
        changed = true;
      }
    }

    if (changed) {
      range.setDataValidations(rules);
      SpreadsheetApp.flush();
    }

    Logger.log(
      'VALIDATION_RELAXED | Sheet: ' + resolvedSheet +
      ' | Rules scanned: ' + scanned + ' | Converted to warn-only: ' + relaxed
    );

    return { sheet: resolvedSheet, relaxed: relaxed, scanned: scanned };
  },

  relaxAllPipelineValidation: function() {
    return [
      this.relaxSheetValidation(CONFIG.SHEET_NAME),
      this.relaxSheetValidation(CONFIG.VISUAL_PIPELINE.SHEET_NAME)
    ];
  },

  // Rebuilds one sheet's dropdowns from CONFIG.CONTROLLED_VOCABULARY, making
  // this file the single vocabulary source. Four fields disagreed between code
  // and sheet — the worker produced exactly what the code asked for and the
  // dropdown refused it, 19 times. (Audit A, finding F4.)
  //
  // Every rule is written allowInvalid, so a value outside the list is flagged
  // for review rather than blocking a worker mid-run. Columns absent from the
  // sheet are reported, never created — a missing dropdown column is a schema
  // question, and guessing where it belongs is how a positional VLOOKUP breaks.
  syncSheetValidation: function(sheetName) {
    var sheet = this._getSheet(sheetName);

    if (!sheet) {
      return { sheet: sheetName, error: 'Sheet not found' };
    }

    var columnMap = SheetSchema._getColumnMap(sheetName);
    var lastRow = Math.max(sheet.getLastRow(), CONFIG.DATA_START_ROW);
    var applied = [];
    var absent = [];

    for (var columnName in CONFIG.CONTROLLED_VOCABULARY) {
      var col = columnMap[columnName];

      if (!col) {
        absent.push(columnName);
        continue;
      }

      var values = CONFIG.CONTROLLED_VOCABULARY[columnName];

      var rule = SpreadsheetApp.newDataValidation()
        .requireValueInList(values, true)
        .setAllowInvalid(true)
        .setHelpText(
          columnName + ' — allowed values come from CONFIG.gs. ' +
          'Anything else is recorded in the Execution Log for review.'
        )
        .build();

      sheet
        .getRange(CONFIG.DATA_START_ROW, col, lastRow - CONFIG.DATA_START_ROW + 1, 1)
        .setDataValidation(rule);

      applied.push(columnName);
    }

    SpreadsheetApp.flush();

    Logger.log(
      'VOCABULARY_SYNCED | Sheet: ' + sheetName +
      ' | Columns written: ' + applied.length +
      ' | Not present on this sheet: ' + absent.length
    );

    return { sheet: sheetName, applied: applied, absent: absent };
  },

  syncAllValidationFromConfig: function() {
    return [
      this.syncSheetValidation(CONFIG.SHEET_NAME),
      this.syncSheetValidation(CONFIG.VISUAL_PIPELINE.SHEET_NAME),
      this.syncSheetValidation(CONFIG.CAMPAIGN_CARDS_SHEET_NAME)
    ];
  },

  // Creates the columns code writes but cannot invent. writeCell skips a
  // missing column with nothing but a log line, so a renamed or freshly copied
  // sheet loses those writes silently — which is exactly how the machine state
  // ended up in the operator's Workflow Status column.
  //
  // Appends only. Never inserts: Campaign Cards O:Z is addressed positionally
  // by the Content Pipeline VLOOKUP, and an insert before column Z moves every
  // strategy field out from under it.
  ensureManagedColumns: function() {
    var results = [];
    var managed = CONFIG.MANAGED_COLUMNS || [];

    for (var i = 0; i < managed.length; i++) {
      var spec = managed[i];
      var sheet = this._getSheet(spec.sheet);

      if (!sheet) {
        results.push({
          sheet: spec.sheet, column: spec.column, status: 'sheet not found'
        });
        continue;
      }

      if (SheetSchema._getColumnMap(spec.sheet)[spec.column]) {
        results.push({
          sheet: spec.sheet, column: spec.column, status: 'already present'
        });
        continue;
      }

      var newCol = sheet.getLastColumn() + 1;
      sheet.getRange(CONFIG.HEADER_ROW, newCol).setValue(spec.column);

      // The column map is cached for six hours. Without this, every write to
      // the new column for the rest of the day resolves against a map that
      // predates it and is skipped.
      SheetSchema.invalidateColumnMap(spec.sheet);

      results.push({
        sheet: spec.sheet,
        column: spec.column,
        status: 'created in column ' + newCol
      });

      Logger.log(
        'MANAGED_COLUMN_CREATED | Sheet: ' + spec.sheet +
        ' | Column: ' + spec.column + ' | Position: ' + newCol
      );
    }

    return results;
  }
};