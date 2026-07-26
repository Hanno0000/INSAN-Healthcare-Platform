var SheetWriter = {

  _getSheet: function(sheetName) {
    var targetSheet = sheetName || CONFIG.SHEET_NAME;
    return SpreadsheetApp.getActiveSpreadsheet()
      .getSheetByName(targetSheet);
  },

  _getVisualSheet: function() {
    return this._getSheet(CONFIG.VISUAL_PIPELINE.SHEET_NAME);
  },

  _isValidationError: function(e) {
    var msg = e.message || '';
    var str = e.toString() || '';
    var combined = (msg + ' ' + str).toLowerCase();
    return combined.indexOf('data validation') !== -1;
  },

  _safeClearValidation: function(range) {
    try {
      range.clearDataValidations();
    } catch (e) {
    }
  },

  _writeCellSafe: function(range, value, rowNumber, colName, colIndex) {
    try {
      range.setValue(value);
      SpreadsheetApp.flush();
      var actualRaw = range.getValue();
      var expectedTime, actualTime, isDateComparison = false;
      if (value instanceof Date && actualRaw instanceof Date) {
        expectedTime = value.getTime();
        actualTime = actualRaw.getTime();
        isDateComparison = true;
      }
      var match = isDateComparison
        ? (expectedTime === actualTime)
        : (String(actualRaw) === String(value));
      Logger.log(
        'VERIFY_WRITE | Row: ' + rowNumber +
        ' | Column: ' + colName +
        ' | Expected: [' + String(value).substring(0, 100) + ']' +
        ' | Actual: [' + String(actualRaw).substring(0, 100) + ']' +
        ' | Match: ' + match
      );
      if (!match) {
        throw new Error(
          'WRITE_VERIFICATION_FAILED | Row: ' + rowNumber +
          ' | Column: ' + colName +
          ' | Expected: [' + String(value).substring(0, 200) + ']' +
          ' | Actual: [' + String(actualRaw).substring(0, 200) + ']'
        );
      }
      Logger.log('WRITE_SUCCESS | Row: ' + rowNumber + ' | Column: ' + colName);
      return true;
    } catch (e) {
      if (this._isValidationError(e)) {
        this._safeClearValidation(range);
        try {
          range.setValue(value);
          Logger.log(
            'DATA_VALIDATION_BYPASSED | Row: ' + rowNumber +
            ' | Column: ' + colName + ' (col ' + colIndex + ')' +
            ' | Value: ' + String(value).substring(0, 100)
          );
          return true;
        } catch (retryError) {
          return false;
        }
      } else {
        throw e;
      }
    }
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
      throw new Error('Column not found: ' + columnName);
    }

    var range = sheet.getRange(rowNumber, col);
    this._writeCellSafe(range, value, rowNumber, columnName, col);
  },

  writeWorkflowStatus: function(rowNumber, status, sheetName) {
    var resolvedSheet = sheetName || CONFIG.SHEET_NAME;
    this.writeCell(rowNumber, CONFIG.COLUMN_NAMES.WORKFLOW_STATUS, status, resolvedSheet);
  }
};