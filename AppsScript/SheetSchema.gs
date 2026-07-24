var SheetSchema = {

  _getSheet: function(sheetName) {
    var targetSheet = sheetName || CONFIG.SHEET_NAME;
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(targetSheet);

    if (!sheet) {
      sheet = ss.getSheets()[0];
    }

    return sheet;
  },

  _getVisualSheet: function() {
    return this._getSheet(CONFIG.VISUAL_PIPELINE.SHEET_NAME);
  },

  _getColumnMap: function(sheetName) {
    var targetSheet = sheetName || CONFIG.SHEET_NAME;
    var cacheKey = 'colMap_' + targetSheet;
    var cached = CacheService.getScriptCache().get(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    var sheet = this._getSheet(targetSheet);
    var headerRow = sheet.getRange(CONFIG.HEADER_ROW, 1, 1, sheet.getLastColumn()).getValues()[0];

    var map = {};
    for (var i = 0; i < headerRow.length; i++) {
      var name = String(headerRow[i]).trim();
      if (name !== '') {
        map[name] = i + 1;
      }
    }

    CacheService.getScriptCache().put(cacheKey, JSON.stringify(map), CONFIG.CACHE_DURATION);
    return map;
  },

  _getVisualColumnMap: function() {
    return this._getColumnMap(CONFIG.VISUAL_PIPELINE.SHEET_NAME);
  },

  invalidateColumnMap: function(sheetName) {
    var targetSheet = sheetName || CONFIG.SHEET_NAME;
    var cacheKey = 'colMap_' + targetSheet;
    CacheService.getScriptCache().remove(cacheKey);
  },

  getColumnIndex: function(columnName, sheetName) {
    var map = this._getColumnMap(sheetName);
    return map[columnName] || -1;
  },

  getColumnNames: function(sheetName) {
    var map = this._getColumnMap(sheetName);
    var names = [];
    var indices = [];

    for (var name in map) {
      names.push(name);
      indices.push(map[name]);
    }

    var sorted = names.sort(function(a, b) {
      return map[a] - map[b];
    });

    return sorted;
  },

  getRowData: function(rowNumber, sheetName) {
    var sheet = this._getSheet(sheetName);
    var lastCol = sheet.getLastColumn();

    if (lastCol <= 0) return {};

    var values = sheet.getRange(rowNumber, 1, 1, lastCol).getValues()[0];
    var map = this._getColumnMap(sheetName);
    var rowData = {};

    var columnName;
    for (columnName in map) {
      var colIndex = map[columnName];
      rowData[columnName] = values[colIndex - 1] || '';
    }

    return rowData;
  },

  getVisualRowData: function(rowNumber) {
    return this.getRowData(rowNumber, CONFIG.VISUAL_PIPELINE.SHEET_NAME);
  },

  getColumnsByName: function(rowNumber, columnNames, sheetName) {
    var allData = this.getRowData(rowNumber, sheetName);
    var result = {};

    for (var i = 0; i < columnNames.length; i++) {
      var name = columnNames[i];
      if (allData.hasOwnProperty(name)) {
        result[name] = allData[name];
      }
    }

    return result;
  },

  getHeaders: function(sheetName) {
    var sheet = this._getSheet(sheetName);
    var lastCol = sheet.getLastColumn();

    if (lastCol <= 0) return [];

    return sheet.getRange(CONFIG.HEADER_ROW, 1, 1, lastCol).getValues()[0];
  },

  getLastRow: function(sheetName) {
    var sheet = this._getSheet(sheetName);
    return sheet.getLastRow();
  },

  getVisualLastRow: function() {
    return this.getLastRow(CONFIG.VISUAL_PIPELINE.SHEET_NAME);
  },

  validateColumnExists: function(columnName, sheetName) {
    var index = this.getColumnIndex(columnName, sheetName);
    return index !== -1;
  },

  validateColumnsExist: function(columnNames, sheetName) {
    var missing = [];

    for (var i = 0; i < columnNames.length; i++) {
      if (!this.validateColumnExists(columnNames[i], sheetName)) {
        missing.push(columnNames[i]);
      }
    }

    return {
      valid: missing.length === 0,
      missing: missing
    };
  }
};
