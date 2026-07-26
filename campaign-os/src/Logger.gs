var Logger = {

  log: function(message) {
    console.log(message);
  },

  _getLogSheet: function() {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(CONFIG.LOG_SHEET_NAME);

    if (!sheet) {
      sheet = ss.insertSheet(CONFIG.LOG_SHEET_NAME);
      sheet.appendRow([
        'Timestamp', 'Worker', 'Row', 'Status',
        'Runtime (ms)', 'Input Tokens', 'Output Tokens',
        'Error Message', 'Details'
      ]);
      var headerRange = sheet.getRange(1, 1, 1, 9);
      headerRange.setFontWeight('bold');
      headerRange.setBackground('#1a73e8');
      headerRange.setFontColor('#ffffff');
      sheet.setFrozenRows(1);
      sheet.setColumnWidth(1, 180);
      sheet.setColumnWidth(2, 220);
      sheet.setColumnWidth(3, 70);
      sheet.setColumnWidth(4, 100);
      sheet.setColumnWidth(5, 110);
      sheet.setColumnWidth(6, 110);
      sheet.setColumnWidth(7, 110);
      sheet.setColumnWidth(8, 300);
      sheet.setColumnWidth(9, 400);
    }

    return sheet;
  },

  logExecution: function(data) {
    try {
      var sheet = this._getLogSheet();
      var timestamp = new Date();
      var worker = data.worker || '';
      var row = data.row || '';
      var status = data.status || 'UNKNOWN';
      var runtime = data.runtime || 0;
      var inputTokens = data.inputTokens || '';
      var outputTokens = data.outputTokens || '';
      var error = data.error || '';
      var details = data.details || '';

      sheet.appendRow([
        timestamp, worker, row, status,
        runtime, inputTokens, outputTokens,
        error, details
      ]);

      var lastRow = sheet.getLastRow();
      var statusCell = sheet.getRange(lastRow, 4);

      if (status === 'SUCCESS') {
        statusCell.setBackground('#0d652d');
        statusCell.setFontColor('#ffffff');
      } else if (status === 'PARTIAL') {
        statusCell.setBackground('#e37400');
        statusCell.setFontColor('#ffffff');
      } else {
        statusCell.setBackground('#c5221f');
        statusCell.setFontColor('#ffffff');
      }

    } catch (e) {
      Logger.log('Logger itself failed: ' + e.toString());
    }
  },

  logSuccess: function(worker, row, runtime, inputTokens, outputTokens, details) {
    this.logExecution({
      worker: worker,
      row: row,
      status: 'SUCCESS',
      runtime: runtime,
      inputTokens: inputTokens,
      outputTokens: outputTokens,
      details: details
    });
  },

  logFailure: function(worker, row, runtime, error, details) {
    this.logExecution({
      worker: worker,
      row: row,
      status: 'FAILURE',
      runtime: runtime,
      error: error,
      details: details
    });
  },

  logPartial: function(worker, row, runtime, details) {
    this.logExecution({
      worker: worker,
      row: row,
      status: 'PARTIAL',
      runtime: runtime,
      details: details
    });
  },

  // A worker produced a value the sheet's data validation refused. The value is
  // written anyway; this records it so the controlled vocabulary can be widened
  // later from real production evidence instead of guesswork.
  logValidationBypass: function(row, columnName, value, action) {
    this.logExecution({
      worker: 'DATA_VALIDATION',
      row: row,
      status: 'PARTIAL',
      details: 'Value rejected by sheet validation and written anyway | Column: ' +
        columnName + ' | Value: "' + String(value).substring(0, 200) + '" | ' +
        'Recovery: ' + action
    });
  },

  // A controlled field came back with a value outside CONTROLLED_VOCABULARY.
  // Logged rather than blocked, so the run continues and the vocabulary gap is
  // visible afterwards.
  logVocabularyDeviation: function(worker, row, columnName, value, vocabulary) {
    this.logExecution({
      worker: worker,
      row: row,
      status: 'PARTIAL',
      details: 'Out-of-vocabulary value accepted | Column: ' + columnName +
        ' | Produced: "' + String(value).substring(0, 120) + '"' +
        ' | Allowed: ' + (vocabulary || []).join(' / ')
    });
  },

  // Collects every out-of-vocabulary value seen so far, grouped by column, so a
  // production run can be turned into concrete SYSTEM_CONSTANTS updates.
  getVocabularyDeviations: function() {
    var sheet = this._getLogSheet();
    var lastRow = sheet.getLastRow();

    if (lastRow < 2) {
      return {};
    }

    var rows = sheet.getRange(2, 1, lastRow - 1, 9).getValues();
    var grouped = {};

    for (var i = 0; i < rows.length; i++) {
      var details = String(rows[i][8] || '');

      if (details.indexOf('Out-of-vocabulary value accepted') === -1 &&
          details.indexOf('rejected by sheet validation') === -1) {
        continue;
      }

      var colMatch = details.match(/Column:\s*([^|]+)/);
      var valMatch = details.match(/(?:Produced|Value):\s*"([^"]*)"/);

      if (!colMatch || !valMatch) {
        continue;
      }

      var column = colMatch[1].trim();
      var value = valMatch[1].trim();

      if (!grouped[column]) {
        grouped[column] = {};
      }

      grouped[column][value] = (grouped[column][value] || 0) + 1;
    }

    return grouped;
  },

  getExecutionLog: function(limit) {
    var sheet = this._getLogSheet();
    var lastRow = sheet.getLastRow();

    if (lastRow <= 1) return [];

    var numRows = Math.min(limit || 20, lastRow - 1);
    var startRow = lastRow - numRows + 1;
    var data = sheet.getRange(startRow, 1, numRows, 9).getValues();

    var entries = [];
    for (var i = data.length - 1; i >= 0; i--) {
      entries.push({
        timestamp: data[i][0],
        worker: data[i][1],
        row: data[i][2],
        status: data[i][3],
        runtime: data[i][4],
        inputTokens: data[i][5],
        outputTokens: data[i][6],
        error: data[i][7],
        details: data[i][8]
      });
    }

    return entries;
  },

  clearLog: function() {
    var sheet = this._getLogSheet();
    var lastRow = sheet.getLastRow();

    if (lastRow > 1) {
      sheet.deleteRows(2, lastRow - 1);
    }
  }
};