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