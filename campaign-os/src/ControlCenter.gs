// ================================
// PRODUCTION CONTROL CENTER
// Server-side functions for the UI.
// This file only serves data and executes
// existing functions. No business logic here.
// ================================


function showControlCenter() {
  var html = HtmlService.createHtmlOutputFromFile('ControlCenter')
    .setTitle('Production Control Center')
    .setWidth(420)
    .setHeight(640);
  SpreadsheetApp.getUi().showSidebar(html);
}


function getDashboardData() {
  var data = {
    system: getSystemStatus(),
    checkpoints: getCheckpoints(),
    contentRows: getContentRowStatus(),
    visualRows: getVisualRowStatus(),
    lastExecution: getLastExecution(),
    recentLogs: getRecentLogEntries(8)
  };
  return data;
}


function getSystemStatus() {
  var status = {
    model: CONFIG.GEMINI_MODEL,
    imageModel: CONFIG.MEDIA_MODELS.IMAGE,
    videoModel: CONFIG.MEDIA_MODELS.VIDEO,
    apiKey: false,
    drive: false,
    cache: false,
    workerCount: Object.keys(CONFIG.WORKERS).length
  };

  try {
    var apiKey = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
    status.apiKey = !!apiKey;
  } catch (e) {}

  try {
    DriveApp.getFolderById(CONFIG.DOCS_FOLDER_ID);
    status.drive = true;
  } catch (e) {}

  try {
    var cache = CacheService.getScriptCache();
    cache.put('_test', '1', 1);
    status.cache = cache.get('_test') === '1';
    cache.remove('_test');
  } catch (e) {}

  return status;
}


function getCheckpoints() {
  var workers = Object.keys(CONFIG.WORKERS);
  var checkpoints = [];

  for (var i = 0; i < workers.length; i++) {
    var row = getCheckpoint(workers[i]);
    if (row) {
      var config = CONFIG.WORKERS[workers[i]];
      checkpoints.push({
        worker: workers[i],
        displayName: toDisplayName(workers[i]),
        row: row,
        sheet: config.sheetName || CONFIG.SHEET_NAME
      });
    }
  }

  return checkpoints;
}


function getContentRowStatus() {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEET_NAME);
    if (!sheet) return { total: 0, ready: 0, processing: 0, completed: 0, failed: 0 };

    var lastRow = sheet.getLastRow();
    if (lastRow < CONFIG.DATA_START_ROW) return { total: 0, ready: 0, processing: 0, completed: 0, failed: 0 };

    var total = lastRow - CONFIG.DATA_START_ROW + 1;
    var aiWorkerCol = SheetSchema._getColumnMap(CONFIG.SHEET_NAME)['AI Worker'];

    var ready = 0;
    var processing = 0;
    var completed = 0;
    var failed = 0;

    if (aiWorkerCol) {
      var data = sheet.getRange(CONFIG.DATA_START_ROW, aiWorkerCol, total, 1).getValues();
      for (var i = 0; i < data.length; i++) {
        var val = String(data[i][0]).trim();
        if (!val) {
          ready++;
        } else if (val === 'FAILED') {
          failed++;
        } else {
          completed++;
        }
      }
    } else {
      ready = total;
    }

    return { total: total, ready: ready, processing: processing, completed: completed, failed: failed };
  } catch (e) {
    return { total: 0, ready: 0, processing: 0, completed: 0, failed: 0 };
  }
}


function getVisualRowStatus() {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.VISUAL_PIPELINE.SHEET_NAME);
    if (!sheet) return { total: 0, ready: 0, planning: 0, generating: 0, qa: 0, publishing: 0, completed: 0, failed: 0 };

    var lastRow = sheet.getLastRow();
    if (lastRow < CONFIG.DATA_START_ROW) return { total: 0, ready: 0, planning: 0, generating: 0, qa: 0, publishing: 0, completed: 0, failed: 0 };

    var total = lastRow - CONFIG.DATA_START_ROW + 1;
    var stageCol = SheetSchema._getColumnMap(CONFIG.VISUAL_PIPELINE.SHEET_NAME)['VISUAL_STAGE'];

    var counts = { ready: 0, planning: 0, generating: 0, qa: 0, publishing: 0, completed: 0, failed: 0 };

    if (stageCol) {
      var data = sheet.getRange(CONFIG.DATA_START_ROW, stageCol, total, 1).getValues();
      for (var i = 0; i < data.length; i++) {
        var val = String(data[i][0]).trim().toUpperCase();
        switch (val) {
          case 'READY': counts.ready++; break;
          case 'PLANNING': counts.planning++; break;
          case 'GENERATING': counts.generating++; break;
          case 'QA': counts.qa++; break;
          case 'PUBLISHING': counts.publishing++; break;
          case 'COMPLETED': counts.completed++; break;
          case 'FAILED': counts.failed++; break;
          default: counts.ready++; break;
        }
      }
    } else {
      counts.ready = total;
    }

    return { total: total, ready: counts.ready, planning: counts.planning, generating: counts.generating, qa: counts.qa, publishing: counts.publishing, completed: counts.completed, failed: counts.failed };
  } catch (e) {
    return { total: 0, ready: 0, planning: 0, generating: 0, qa: 0, publishing: 0, completed: 0, failed: 0 };
  }
}


function getLastExecution() {
  try {
    var logs = Logger.getExecutionLog(1);
    if (logs.length === 0) return null;

    var entry = logs[0];
    return {
      timestamp: entry.timestamp ? Utilities.formatDate(entry.timestamp, Session.getScriptTimeZone(), 'MMM dd, HH:mm:ss') : '-',
      worker: toDisplayName(entry.worker),
      row: entry.row,
      status: entry.status,
      runtime: entry.runtime ? (entry.runtime / 1000).toFixed(1) + 's' : '-'
    };
  } catch (e) {
    return null;
  }
}


function getRecentLogEntries(count) {
  try {
    var logs = Logger.getExecutionLog(count || 8);
    var entries = [];

    for (var i = 0; i < logs.length; i++) {
      var e = logs[i];
      entries.push({
        timestamp: e.timestamp ? Utilities.formatDate(e.timestamp, Session.getScriptTimeZone(), 'HH:mm:ss') : '-',
        worker: toDisplayName(e.worker),
        row: e.row,
        status: e.status,
        runtime: e.runtime ? (e.runtime / 1000).toFixed(1) + 's' : '-'
      });
    }

    return entries;
  } catch (e) {
    return [];
  }
}


function getWorkerLastRow(workerName) {
  try {
    var config = CONFIG.WORKERS[workerName];
    var sheetName = config.sheetName || CONFIG.SHEET_NAME;
    return SheetSchema.getLastRow(sheetName);
  } catch (e) {
    return 0;
  }
}


// ================================
// EXECUTION FUNCTIONS
// These call existing WorkerRunner functions.
// ================================


var PIPELINE_STEPS = [
  { type: 'worker', key: 'VISUAL_PLANNER_WORKER', name: 'Visual Planner' },
  { type: 'service', key: 'MEDIA_GENERATION', name: 'Media Generation' },
  { type: 'worker', key: 'VISUAL_QA_WORKER', name: 'Visual QA' }
];


function executeWorker(workerName, startRow, endRow) {
  var upperName = workerName.toUpperCase().trim();
  var config = CONFIG.WORKERS[upperName];

  if (!config) {
    Logger.logFailure(workerName.toUpperCase(), '?', 0, 'Unknown worker: ' + workerName);
    return { success: false, worker: workerName, error: 'Unknown worker: ' + workerName };
  }

  var startTime = new Date().getTime();

  try {
    var result;
    var isVisual = !!config.sheetName;

    if (isVisual) {
      result = runVisualWorkerBatch(upperName, startRow, endRow);
    } else {
      result = runWorkerBatch(upperName, startRow, endRow);
    }

    var endTime = new Date().getTime();

    var stepSuccess = result.failed === 0 && !result.interrupted;

    return {
      success: stepSuccess,
      worker: toDisplayName(upperName),
      startRow: startRow,
      endRow: endRow,
      totalRows: result.totalRows,
      successCount: result.success,
      failedCount: result.failed,
      interrupted: result.interrupted,
      nextRow: result.nextRow,
      duration: formatDuration(endTime - startTime)
    };
  } catch (e) {
    var endTime = new Date().getTime();

    Logger.logFailure(upperName, startRow + '-' + endRow, endTime - startTime, e.toString());

    return {
      success: false,
      worker: toDisplayName(upperName),
      error: e.toString(),
      duration: formatDuration(endTime - startTime)
    };
  }
}


function executeService(serviceName, startRow, endRow) {
  var startTime = new Date().getTime();

  try {
    var result = ServiceRunner.runMediaGeneration(startRow, endRow);

    var endTime = new Date().getTime();

    var stepSuccess = result.failed === 0 && !result.interrupted && result.success > 0;

    return {
      success: stepSuccess,
      worker: 'Media Generation',
      startRow: startRow,
      endRow: endRow,
      totalRows: result.totalRows,
      successCount: result.success,
      failedCount: result.failed,
      interrupted: result.interrupted,
      nextRow: result.nextRow,
      duration: formatDuration(endTime - startTime)
    };
  } catch (e) {
    var endTime = new Date().getTime();

    Logger.logFailure('MEDIA_GENERATION_SERVICE', startRow + '-' + endRow, endTime - startTime, e.toString());

    return {
      success: false,
      worker: 'Media Generation',
      error: e.toString(),
      duration: formatDuration(endTime - startTime)
    };
  }
}


function executePipeline(steps, startRow, endRow) {
  var pipelineStart = new Date().getTime();
  var summary = [];
  var totalSuccess = 0;
  var totalFailed = 0;
  var pipelineFailed = false;

  for (var i = 0; i < steps.length; i++) {
    var step = steps[i];
    var upperName = step.key.toUpperCase().trim();

    if (pipelineFailed) {
      summary.push(step.name + ': skipped (previous step failed)');
      continue;
    }

    if (step.type === 'service') {
      var svcStartTime = new Date().getTime();
      var result = executeService(step.key, startRow, endRow);
      var svcEndTime = new Date().getTime();

      totalSuccess += result.successCount || 0;
      totalFailed += result.failedCount || 0;

      var svcLine = step.name + ': ' +
        (result.successCount || 0) + ' success, ' +
        (result.failedCount || 0) + ' failed';

      if (result.interrupted) {
        svcLine += ' [timeout - resume from row ' + result.nextRow + ']';
      }

      summary.push(svcLine);

      if (!result.success) {
        pipelineFailed = true;
        summary.push('Pipeline stopped: ' + step.name + ' failed');
      }

      if (result.interrupted) {
        var remaining = steps.slice(i + 1);
        for (var j = 0; j < remaining.length; j++) {
          summary.push(remaining[j].name + ': pending (timeout)');
        }
        break;
      }

      continue;
    }

    var config = CONFIG.WORKERS[upperName];

    if (!config) {
      summary.push(step.name + ': skipped (unknown)');
      continue;
    }

    var resumeRow = getCheckpoint(upperName);
    var actualStart = (resumeRow && resumeRow >= startRow && resumeRow <= endRow)
      ? resumeRow : startRow;

    if (actualStart > endRow) {
      summary.push(step.name + ': skipped (complete)');
      continue;
    }

    var startTime = new Date().getTime();
    var result = executeWorker(upperName, actualStart, endRow);
    var endTime = new Date().getTime();

    totalSuccess += result.successCount || 0;
    totalFailed += result.failedCount || 0;

    var line = step.name + ': ' +
      (result.successCount || 0) + ' success, ' +
      (result.failedCount || 0) + ' failed';

    if (result.interrupted) {
      line += ' [timeout - resume from row ' + result.nextRow + ']';
    }

    summary.push(line);

    if (!result.success) {
      pipelineFailed = true;
      summary.push('Pipeline stopped: ' + step.name + ' failed');
    }

    if (result.interrupted) {
      var remaining = steps.slice(i + 1);
      for (var j = 0; j < remaining.length; j++) {
        summary.push(remaining[j].name + ': pending (timeout)');
      }
      break;
    }
  }

  var pipelineEnd = new Date().getTime();

  return {
    success: !pipelineFailed,
    summary: summary,
    totalSuccess: totalSuccess,
    totalFailed: totalFailed,
    totalDuration: formatDuration(pipelineEnd - pipelineStart)
  };
}


function executeResume() {
  try {
    var workers = Object.keys(CONFIG.WORKERS);
    var checkpoints = [];

    for (var i = 0; i < workers.length; i++) {
      var row = getCheckpoint(workers[i]);
      if (row) {
        var config = CONFIG.WORKERS[workers[i]];
        checkpoints.push({
          worker: workers[i],
          displayName: toDisplayName(workers[i]),
          row: row,
          sheet: config.sheetName || CONFIG.SHEET_NAME
        });
      }
    }

    if (checkpoints.length === 0) {
      return { success: false, error: 'No saved progress to resume.' };
    }

    return {
      success: true,
      checkpoints: checkpoints
    };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}


function resumeCheckpoint(workerName, endRow) {
  var upperName = workerName.toUpperCase().trim();
  var checkpointRow = getCheckpoint(upperName);

  if (!checkpointRow) {
    return { success: false, error: 'No checkpoint found for ' + workerName };
  }

  return executeWorker(upperName, checkpointRow, endRow);
}


function executeRefreshCache() {
  try {
    refreshCache();
    return { success: true };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}


function formatDuration(ms) {
  var totalSec = Math.floor(ms / 1000);
  var hours = Math.floor(totalSec / 3600);
  var minutes = Math.floor((totalSec % 3600) / 60);
  var seconds = totalSec % 60;

  if (hours > 0) {
    return padZero(hours) + ':' + padZero(minutes) + ':' + padZero(seconds);
  }
  return padZero(minutes) + ':' + padZero(seconds);
}


function padZero(n) {
  return n < 10 ? '0' + n : '' + n;
}
