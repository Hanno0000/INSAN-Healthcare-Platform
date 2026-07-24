function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('AI Workers')
    .addItem('Production Control Center', 'showControlCenter')
    .addSeparator()
    .addSubMenu(SpreadsheetApp.getUi()
      .createMenu('Content Team')
      .addItem('Strategy Worker', 'runContentStrategyWorker')
      .addItem('Content Creator', 'runContentCreationWorker')
      .addItem('Creative Director', 'runCreativeDirectorWorker')
      .addSeparator()
      .addItem('Run Full Content Pipeline', 'runFullContentPipeline'))
    .addSubMenu(SpreadsheetApp.getUi()
      .createMenu('Visual Team')
      .addItem('Visual Planner', 'runVisualPlannerWorker')
      .addItem('Media Generation', 'runMediaGenerationService')
      .addItem('Visual QA', 'runVisualQAWorker')
      .addSeparator()
      .addItem('Run Full Visual Pipeline', 'runFullVisualPipeline'))
    .addSeparator()
    .addItem('Resume Last Run', 'resumeLastRun')
    .addSeparator()
    .addItem('Refresh Cache', 'refreshCache')
    .addItem('System Status', 'systemStatus')
    .addToUi();
}


function systemStatus() {
  var lines = [];

  lines.push('Gemini Model: ' + CONFIG.GEMINI_MODEL);

  var apiKey = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
  lines.push('Gemini API: ' + (apiKey ? '✅ Configured' : '❌ Not configured'));

  try {
    DriveApp.getFolderById(CONFIG.DOCS_FOLDER_ID);
    lines.push('Google Drive: ✅ Connected');
  } catch (e) {
    lines.push('Google Drive: ❌ ' + e.message);
  }

  var cache = CacheService.getScriptCache();
  var testKey = 'statusTest';
  cache.put(testKey, '1', 1);
  var cacheReady = cache.get(testKey) === '1';
  cache.remove(testKey);
  lines.push('Prompt Cache: ' + (cacheReady ? 'Ready' : 'Unavailable'));

  lines.push('Registered Workers: ' + Object.keys(CONFIG.WORKERS).length);

  lines.push('\nLast Checkpoints:');
  var workerNames = Object.keys(CONFIG.WORKERS);
  for (var i = 0; i < workerNames.length; i++) {
    var row = getCheckpoint(workerNames[i]);
    lines.push('  ' + toDisplayName(workerNames[i]) + ': ' +
      (row ? 'Row ' + row : 'None'));
  }

  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    lines.push('\nSpreadsheet: ' + ss.getName());
  } catch (e) {
    lines.push('\nSpreadsheet: ❌ Cannot access');
  }

  lines.push('\nStatus: Ready');

  Browser.msgBox('System Status', lines.join('\n'), Browser.Buttons.OK);
}


var DISPLAY_NAME_OVERRIDES = {
  'VISUAL_PLANNER_WORKER': 'Visual Planner',
  'VISUAL_QA_WORKER': 'Visual QA',
  'CONTENT_STRATEGY_WORKER': 'Strategy Worker',
  'CONTENT_CREATION_WORKER': 'Content Creator',
  'CREATIVE_DIRECTOR_WORKER': 'Creative Director'
};

function toDisplayName(key) {
  if (DISPLAY_NAME_OVERRIDES[key]) {
    return DISPLAY_NAME_OVERRIDES[key];
  }
  return key.replace('_WORKER', '').replace(/_/g, ' ')
    .toLowerCase().replace(/\b\w/g, function(c) { return c.toUpperCase(); });
}


// ================================
// CONTENT TEAM FUNCTIONS
// ================================

var CONTENT_TEAM_WORKERS = [
  'CONTENT_STRATEGY_WORKER',
  'CONTENT_CREATION_WORKER',
  'CREATIVE_DIRECTOR_WORKER'
];

function runContentStrategyWorker() {
  runTeamWorker('CONTENT_STRATEGY_WORKER');
}

function runContentCreationWorker() {
  runTeamWorker('CONTENT_CREATION_WORKER');
}

function runCreativeDirectorWorker() {
  runTeamWorker('CREATIVE_DIRECTOR_WORKER');
}

function runFullContentPipeline() {
  runTeamPipeline(CONTENT_TEAM_WORKERS, 'Content Pipeline');
}

function runTeamWorker(workerName) {
  var lastRow = SheetSchema.getLastRow();

  var range = askForRowRange();
  if (!range) return;

  var confirm = Browser.msgBox(
    'Confirm ' + toDisplayName(workerName),
    'Rows: ' + range.start + ' to ' + range.end +
    ' (' + (range.end - range.start + 1) + ' rows)' +
    '\n\nProceed?',
    Browser.Buttons.YES_NO
  );

  if (confirm !== 'yes') return;

  var startTime = new Date().getTime();
  var result = runWorkerBatch(workerName, range.start, range.end);
  var endTime = new Date().getTime();
  var durationSec = ((endTime - startTime) / 1000).toFixed(1);

  var msg = 'Worker: ' + toDisplayName(workerName) +
    '\nRows: ' + range.start + ' to ' + range.end;

  if (result.interrupted) {
    msg += '\nProcessed: ' + result.totalRows + ' rows' +
      '\nSuccess: ' + result.success +
      '\nFailed: ' + result.failed +
      '\n\nStopped: execution time limit approaching.' +
      '\nResume from row ' + result.nextRow + '.';
  } else {
    msg += '\nRows Processed: ' + result.totalRows +
      '\nSuccess: ' + result.success +
      '\nFailed: ' + result.failed +
      '\nDuration: ' + durationSec + ' seconds';
  }

  Browser.msgBox('Result', msg, Browser.Buttons.OK);
}

function runTeamPipeline(workerNames, pipelineName) {
  var range = askForRowRange();
  if (!range) return;

  var confirm = Browser.msgBox(
    'Confirm ' + pipelineName,
    'Workers: ' + workerNames.map(toDisplayName).join(' → ') +
    '\nRows: ' + range.start + ' to ' + range.end +
    ' (' + (range.end - range.start + 1) + ' rows)' +
    '\n\nProceed?',
    Browser.Buttons.YES_NO
  );

  if (confirm !== 'yes') return;

  var pipelineStart = new Date().getTime();
  var summary = [];

  for (var i = 0; i < workerNames.length; i++) {
    var displayName = toDisplayName(workerNames[i]);
    var resumeRow = getCheckpoint(workerNames[i]);
    var actualStart = (resumeRow && resumeRow >= range.start && resumeRow <= range.end)
      ? resumeRow : range.start;

    if (actualStart > range.end) {
      summary.push(displayName + ': skipped (already complete)');
      continue;
    }

    var startTime = new Date().getTime();
    var result = runWorkerBatch(workerNames[i], actualStart, range.end);
    var endTime = new Date().getTime();
    var durationSec = ((endTime - startTime) / 1000).toFixed(1);

    var line = displayName + ': ' + result.success + ' success, ' +
      result.failed + ' failed (' + durationSec + 's)';
    if (result.interrupted) {
      line += ' [timeout - resume from row ' + result.nextRow + ']';
    }
    summary.push(line);

    if (result.interrupted) {
      var remaining = workerNames.slice(i + 1);
      if (remaining.length > 0) {
        summary.push('\nRemaining workers skipped (timeout):');
        for (var j = 0; j < remaining.length; j++) {
          summary.push('  ' + toDisplayName(remaining[j]) + ': pending');
        }
      }
      break;
    }
  }

  var pipelineEnd = new Date().getTime();
  var totalDuration = ((pipelineEnd - pipelineStart) / 1000).toFixed(1);

  Browser.msgBox(
    pipelineName + ' Complete',
    summary.join('\n') +
    '\n\nTotal Duration: ' + totalDuration + ' seconds',
    Browser.Buttons.OK
  );
}


// ================================
// VISUAL TEAM FUNCTIONS
// ================================

var VISUAL_TEAM_WORKERS = [
  'VISUAL_PLANNER_WORKER',
  'VISUAL_QA_WORKER'
];

function runVisualPlannerWorker() {
  runVisualWorker('VISUAL_PLANNER_WORKER');
}

function runMediaGenerationService() {
  var config = CONFIG.SERVICES.MEDIA_GENERATION;
  var sheetName = config.sheetName;

  var range = askForRowRange(sheetName);
  if (!range) return;

  var confirm = Browser.msgBox(
    'Confirm Media Generation',
    'Service: Media Generation' +
    '\nSheet: ' + sheetName +
    '\nRows: ' + range.start + ' to ' + range.end +
    ' (' + (range.end - range.start + 1) + ' rows)' +
    '\n\nProceed?',
    Browser.Buttons.YES_NO
  );

  if (confirm !== 'yes') return;

  var startTime = new Date().getTime();
  var result = ServiceRunner.runMediaGeneration(range.start, range.end);
  var endTime = new Date().getTime();
  var durationSec = ((endTime - startTime) / 1000).toFixed(1);

  var msg = 'Service: Media Generation' +
    '\nSheet: ' + sheetName +
    '\nRows: ' + range.start + ' to ' + range.end;

  if (result.interrupted) {
    msg += '\nProcessed: ' + result.totalRows + ' rows' +
      '\nSuccess: ' + result.success +
      '\nFailed: ' + result.failed +
      '\n\nStopped: execution time limit approaching.' +
      '\nResume from row ' + result.nextRow + '.';
  } else {
    msg += '\nRows Processed: ' + result.totalRows +
      '\nSuccess: ' + result.success +
      '\nFailed: ' + result.failed +
      '\nDuration: ' + durationSec + ' seconds';
  }

  Browser.msgBox('Result', msg, Browser.Buttons.OK);
}

function runVisualQAWorker() {
  runVisualWorker('VISUAL_QA_WORKER');
}

function runFullVisualPipeline() {
  runVisualPipeline();
}

function runVisualWorker(workerName) {
  var lastRow = SheetSchema.getVisualLastRow();

  var range = askForRowRange(CONFIG.VISUAL_PIPELINE.SHEET_NAME);
  if (!range) return;

  var confirm = Browser.msgBox(
    'Confirm ' + toDisplayName(workerName),
    'Sheet: ' + CONFIG.VISUAL_PIPELINE.SHEET_NAME +
    '\nRows: ' + range.start + ' to ' + range.end +
    ' (' + (range.end - range.start + 1) + ' rows)' +
    '\n\nProceed?',
    Browser.Buttons.YES_NO
  );

  if (confirm !== 'yes') return;

  var startTime = new Date().getTime();
  var result = runVisualWorkerBatch(workerName, range.start, range.end);
  var endTime = new Date().getTime();
  var durationSec = ((endTime - startTime) / 1000).toFixed(1);

  var msg = 'Worker: ' + toDisplayName(workerName) +
    '\nSheet: ' + CONFIG.VISUAL_PIPELINE.SHEET_NAME +
    '\nRows: ' + range.start + ' to ' + range.end;

  if (result.interrupted) {
    msg += '\nProcessed: ' + result.totalRows + ' rows' +
      '\nSuccess: ' + result.success +
      '\nFailed: ' + result.failed +
      '\n\nStopped: execution time limit approaching.' +
      '\nResume from row ' + result.nextRow + '.';
  } else {
    msg += '\nRows Processed: ' + result.totalRows +
      '\nSuccess: ' + result.success +
      '\nFailed: ' + result.failed +
      '\nDuration: ' + durationSec + ' seconds';
  }

  Browser.msgBox('Result', msg, Browser.Buttons.OK);
}

function runVisualPipeline() {
  var range = askForRowRange(CONFIG.VISUAL_PIPELINE.SHEET_NAME);
  if (!range) return;

  var pipelineSteps = 'Visual Planner → Media Generation → Visual QA';

  var confirm = Browser.msgBox(
    'Confirm Visual Pipeline',
    'Steps: ' + pipelineSteps +
    '\nSheet: ' + CONFIG.VISUAL_PIPELINE.SHEET_NAME +
    '\nRows: ' + range.start + ' to ' + range.end +
    ' (' + (range.end - range.start + 1) + ' rows)' +
    '\n\nProceed?',
    Browser.Buttons.YES_NO
  );

  if (confirm !== 'yes') return;

  var pipelineStart = new Date().getTime();
  var summary = [];
  var pipelineFailed = false;

  // Step 1: Visual Planner (Worker)
  var plannerName = 'VISUAL_PLANNER_WORKER';
  var plannerResume = getCheckpoint(plannerName);
  var plannerStart = (plannerResume && plannerResume >= range.start && plannerResume <= range.end)
    ? plannerResume : range.start;

  if (plannerStart <= range.end) {
    var startTime = new Date().getTime();
    var result = runVisualWorkerBatch(plannerName, plannerStart, range.end);
    var endTime = new Date().getTime();
    var durationSec = ((endTime - startTime) / 1000).toFixed(1);

    var line = 'Visual Planner: ' + result.success + ' success, ' +
      result.failed + ' failed (' + durationSec + 's)';
    if (result.interrupted) {
      line += ' [timeout - resume from row ' + result.nextRow + ']';
    }
    summary.push(line);

    if (result.failed > 0 || result.interrupted) {
      pipelineFailed = true;
    }
  } else {
    summary.push('Visual Planner: skipped (already complete)');
  }

  // Step 2: Media Generation (Service)
  if (!pipelineFailed) {
    var startTime = new Date().getTime();
    var genResult = ServiceRunner.runMediaGeneration(range.start, range.end);
    var endTime = new Date().getTime();
    var durationSec = ((endTime - startTime) / 1000).toFixed(1);

    var genLine = 'Media Generation: ' + genResult.success + ' success, ' +
      genResult.failed + ' failed (' + durationSec + 's)';
    if (genResult.interrupted) {
      genLine += ' [timeout - resume from row ' + genResult.nextRow + ']';
    }
    summary.push(genLine);

    if (genResult.failed > 0 || genResult.interrupted || genResult.success === 0) {
      pipelineFailed = true;
      summary.push('Pipeline stopped: Media Generation failed');
    }
  } else {
    summary.push('Media Generation: skipped (previous step failed)');
  }

  // Step 3: Visual QA (Worker)
  if (!pipelineFailed) {
    var qaName = 'VISUAL_QA_WORKER';
    var qaResume = getCheckpoint(qaName);
    var qaStart = (qaResume && qaResume >= range.start && qaResume <= range.end)
      ? qaResume : range.start;

    if (qaStart <= range.end) {
      var startTime = new Date().getTime();
      var result = runVisualWorkerBatch(qaName, qaStart, range.end);
      var endTime = new Date().getTime();
      var durationSec = ((endTime - startTime) / 1000).toFixed(1);

      var line = 'Visual QA: ' + result.success + ' success, ' +
        result.failed + ' failed (' + durationSec + 's)';
      if (result.interrupted) {
        line += ' [timeout - resume from row ' + result.nextRow + ']';
      }
      summary.push(line);
    } else {
      summary.push('Visual QA: skipped (already complete)');
    }
  } else {
    summary.push('Visual QA: skipped (previous step failed)');
  }

  var pipelineEnd = new Date().getTime();
  var totalDuration = ((pipelineEnd - pipelineStart) / 1000).toFixed(1);

  Browser.msgBox(
    pipelineFailed ? 'Visual Pipeline Failed' : 'Visual Pipeline Complete',
    summary.join('\n') +
    '\n\nTotal Duration: ' + totalDuration + ' seconds',
    Browser.Buttons.OK
  );
}


function resumeLastRun() {
  var workerNames = Object.keys(CONFIG.WORKERS);
  var checkpoints = [];

  for (var i = 0; i < workerNames.length; i++) {
    var row = getCheckpoint(workerNames[i]);
    if (row) {
      var workerConfig = CONFIG.WORKERS[workerNames[i]];
      var sheetName = workerConfig.sheetName || CONFIG.SHEET_NAME;
      checkpoints.push({ worker: workerNames[i], row: row, sheet: sheetName });
    }
  }

  if (checkpoints.length === 0) {
    Browser.msgBox('Info', 'No saved progress to resume.', Browser.Buttons.OK);
    return;
  }

  var menu = 'Saved progress found:\n\n';
  for (var i = 0; i < checkpoints.length; i++) {
    menu += (i + 1) + '. ' + toDisplayName(checkpoints[i].worker) +
      ' (from row ' + checkpoints[i].row + ') [' + checkpoints[i].sheet + ']\n';
  }

  var selection = Browser.inputBox(
    'INSAN AI - Resume',
    menu + '\nEnter number (1-' + checkpoints.length + '):',
    Browser.Buttons.OK_CANCEL
  );

  if (selection === 'cancel' || !selection) return;

  var index = parseInt(selection, 10);
  if (isNaN(index) || index < 1 || index > checkpoints.length) {
    Browser.msgBox('Error', 'Invalid selection', Browser.Buttons.OK);
    return;
  }

  var target = checkpoints[index - 1];
  var lastRow = SheetSchema.getLastRow(target.sheet);

  var endStr = Browser.inputBox(
    'INSAN AI - End Row',
    'Resuming ' + toDisplayName(target.worker) + ' from row ' + target.row +
    '\nSheet: ' + target.sheet +
    '\nLast data row: ' + lastRow +
    '\n\nEnter end row:',
    Browser.Buttons.OK_CANCEL
  );

  if (endStr === 'cancel' || !endStr) return;

  var endRow = parseInt(endStr, 10);
  if (isNaN(endRow) || endRow < target.row) {
    Browser.msgBox('Error', 'Invalid end row', Browser.Buttons.OK);
    return;
  }
  endRow = Math.min(endRow, lastRow);

  var confirm = Browser.msgBox(
    'Confirm Resume',
    'Worker: ' + toDisplayName(target.worker) +
    '\nSheet: ' + target.sheet +
    '\nResume from row ' + target.row + ' to ' + endRow +
    '\n\nProceed?',
    Browser.Buttons.YES_NO
  );

  if (confirm !== 'yes') return;

  var startTime = new Date().getTime();
  var result = runWorkerBatch(target.worker, target.row, endRow);
  var endTime = new Date().getTime();
  var durationSec = ((endTime - startTime) / 1000).toFixed(1);

  var msg = 'Worker: ' + toDisplayName(target.worker) +
    '\nSheet: ' + target.sheet +
    '\nRows: ' + target.row + ' to ' + endRow;

  if (result.interrupted) {
    msg += '\nProcessed: ' + result.totalRows + ' rows' +
      '\nSuccess: ' + result.success +
      '\nFailed: ' + result.failed +
      '\n\nStopped: execution time limit approaching.' +
      '\nResume from row ' + result.nextRow + '.';
  } else {
    msg += '\nRows Processed: ' + result.totalRows +
      '\nSuccess: ' + result.success +
      '\nFailed: ' + result.failed +
      '\nDuration: ' + durationSec + ' seconds';
  }

  Browser.msgBox('Result', msg, Browser.Buttons.OK);
}


function runWorker(workerName, rowNumber) {
  var startTime = new Date().getTime();
  var upperName = workerName.toUpperCase().trim();

  if (!CONFIG.WORKERS[upperName]) {
    var available = Object.keys(CONFIG.WORKERS).join(', ');
    var msg = 'Unknown worker: ' + workerName + '. Available: ' + available;
    Logger.logFailure(upperName, rowNumber, 0, msg);
    throw new Error(msg);
  }

  var workerConfig = CONFIG.WORKERS[upperName];
  var sheetName = workerConfig.sheetName || CONFIG.SHEET_NAME;
  var lastRow = SheetSchema.getLastRow(sheetName);

  if (rowNumber < CONFIG.DATA_START_ROW || rowNumber > lastRow) {
    var msg = 'Row ' + rowNumber + ' is out of range (' +
      CONFIG.DATA_START_ROW + '-' + lastRow + ')';
    Logger.logFailure(upperName, rowNumber, 0, msg);
    throw new Error(msg);
  }

  var isContentPipeline = !workerConfig.sheetName;

  try {
    if (isContentPipeline) {
      SheetWriter.writeWorkflowStatus(rowNumber, 'PROCESSING', sheetName);
    }

    var rowData = SheetSchema.getRowData(rowNumber, sheetName);

    if (upperName === 'CONTENT_CREATION_WORKER') {
      var existingContentId = rowData[CONFIG.COLUMN_NAMES.CONTENT_ID];
      if (!existingContentId || String(existingContentId).trim() === '') {
        var contentId = _generateContentId(rowNumber);
        SheetWriter.writeCell(rowNumber, CONFIG.COLUMN_NAMES.CONTENT_ID, contentId, sheetName);
        rowData[CONFIG.COLUMN_NAMES.CONTENT_ID] = contentId;
      }
    }

    if (upperName === 'CREATIVE_DIRECTOR_WORKER') {
      var existingRevision = rowData[CONFIG.COLUMN_NAMES.REVISION_NUMBER];
      if (!existingRevision || String(existingRevision).trim() === '') {
        SheetWriter.writeCell(rowNumber, CONFIG.COLUMN_NAMES.REVISION_NUMBER, 1, sheetName);
        rowData[CONFIG.COLUMN_NAMES.REVISION_NUMBER] = 1;
      } else {
        var newRevision = parseInt(existingRevision, 10) + 1;
        SheetWriter.writeCell(rowNumber, CONFIG.COLUMN_NAMES.REVISION_NUMBER, newRevision, sheetName);
        rowData[CONFIG.COLUMN_NAMES.REVISION_NUMBER] = newRevision;
      }
    }

    var context = ContextBuilder.buildContext(upperName, rowData);

    var aiResponse = AIProvider.call(context, {
      temperature: workerConfig.temperature
    });

    var parsed = ResponseParser.parse(aiResponse.text, upperName);

    var writeResult = SheetWriter.writeToRow(
      rowNumber,
      parsed.values,
      upperName
    );

    var sheetForTag = workerConfig.sheetName || CONFIG.SHEET_NAME;
    SheetWriter.writeAIWorkerTag(rowNumber, upperName, sheetForTag);
    SheetWriter.writeTimestamp(rowNumber, CONFIG.COLUMN_NAMES.PUBLISHING_DATE, sheetForTag);

    if (upperName === 'VISUAL_PLANNER_WORKER') {
      _applyVisualPlannerStageMapping(rowNumber, parsed.values, sheetForTag);
    }

    if (upperName === 'VISUAL_QA_WORKER') {
      _applyVisualStageMapping(rowNumber, parsed.values, sheetForTag);
    }

    if (isContentPipeline) {
      SheetWriter.writeWorkflowStatus(rowNumber, 'COMPLETED', sheetName);
    }

    var endTime = new Date().getTime();
    var runtime = endTime - startTime;

    var details = 'Written: ' + writeResult.written.join(', ');

    if (parsed.warnings.length > 0) {
      details += ' | Warnings: ' + parsed.warnings.join('; ');
    }

    details += ' | AI: ' + aiResponse.finishReason;

    if (parsed.isPartial) {
      Logger.logPartial(upperName, rowNumber, runtime, details);
    } else {
      Logger.logSuccess(
        upperName, rowNumber, runtime,
        aiResponse.inputTokens, aiResponse.outputTokens,
        details
      );
    }

    return {
      success: true,
      row: rowNumber,
      worker: upperName,
      values: parsed.values,
      written: writeResult.written,
      warnings: parsed.warnings,
      runtime: runtime,
      tokens: {
        input: aiResponse.inputTokens,
        output: aiResponse.outputTokens,
        total: aiResponse.totalTokens
      }
    };

  } catch (e) {
    var endTime = new Date().getTime();
    var runtime = endTime - startTime;

    if (isContentPipeline) {
      try {
        SheetWriter.writeWorkflowStatus(rowNumber, 'FAILED', sheetName);
      } catch (writeErr) {
        Logger.log('Failed to write FAILED status: ' + writeErr.toString());
      }
    }

    Logger.logFailure(upperName, rowNumber, runtime, e.toString());

    return {
      success: false,
      row: rowNumber,
      worker: upperName,
      error: e.toString(),
      runtime: runtime
    };
  }
}


function runWorkerBatch(workerName, startRow, endRow) {
  var upperName = workerName.toUpperCase().trim();

  if (!CONFIG.WORKERS[upperName]) {
    Logger.logFailure(upperName, '?', 0, 'Unknown worker: ' + workerName);
    throw new Error('Unknown worker: ' + workerName);
  }

  var lastRow = SheetSchema.getLastRow();
  endRow = Math.min(endRow, lastRow);
  startRow = Math.max(startRow, CONFIG.DATA_START_ROW);

  var timeoutMs = (CONFIG.BATCH_TIMEOUT_SECONDS || 300) * 1000;
  var batchStart = new Date().getTime();
  var results = [];
  var successCount = 0;
  var failCount = 0;
  var interrupted = false;

  for (var row = startRow; row <= endRow; row++) {
    var result = runWorker(upperName, row);

    results.push(result);

    if (result.success) {
      successCount++;
      saveCheckpoint(upperName, row + 1);
    } else {
      failCount++;
    }

    if (row < endRow) {
      var elapsed = new Date().getTime() - batchStart;
      if (elapsed >= timeoutMs) {
        interrupted = true;
        break;
      }
      Utilities.sleep(1500);
    }
  }

  if (!interrupted) {
    clearCheckpoint(upperName);
  }

  var status = interrupted ? 'TIMEOUT' : (failCount === 0 ? 'SUCCESS' : 'PARTIAL');

  Logger.logExecution({
    worker: upperName,
    row: startRow + '-' + (interrupted ? results[results.length - 1].row : endRow),
    status: status,
    runtime: new Date().getTime() - batchStart,
    details: 'Batch: ' + successCount + ' success, ' + failCount + ' failed' +
      (interrupted ? ' (timeout - resume from row ' + results[results.length - 1].row + ')' : '')
  });

  return {
    totalRows: results.length,
    success: successCount,
    failed: failCount,
    interrupted: interrupted,
    nextRow: interrupted ? results[results.length - 1].row + 1 : null,
    results: results
  };
}


function saveCheckpoint(workerName, nextRow) {
  var props = PropertiesService.getScriptProperties();
  props.setProperty('RESUME_' + workerName, String(nextRow));
  return nextRow;
}


function getCheckpoint(workerName) {
  var val = PropertiesService.getScriptProperties().getProperty('RESUME_' + workerName);
  if (!val) return null;
  var row = parseInt(val, 10);
  return (isNaN(row) || row < CONFIG.DATA_START_ROW) ? null : row;
}


function clearCheckpoint(workerName) {
  PropertiesService.getScriptProperties().deleteProperty('RESUME_' + workerName);
}


function listWorkers() {
  var workers = Object.keys(CONFIG.WORKERS);

  for (var i = 0; i < workers.length; i++) {
    var config = CONFIG.WORKERS[workers[i]];
    Logger.log(
      workers[i] +
      ' | Prompt: ' + config.promptFile +
      ' | Reads: ' + config.readColumns.length + ' cols' +
      ' | Writes: ' + config.writeColumns.length + ' cols' +
      ' | Temp: ' + config.temperature
    );
  }

  return workers;
}


function getRecentLogs(count) {
  var logs = Logger.getExecutionLog(count || 10);

  for (var i = 0; i < logs.length; i++) {
    var e = logs[i];
    Logger.log(
      e.timestamp + ' | ' + e.worker + ' | Row ' + e.row +
      ' | ' + e.status + ' | ' + e.runtime + 'ms' +
      (e.error ? ' | ERR: ' + e.error : '')
    );
  }

  return logs;
}


function refreshCache() {
  DriveLoader.invalidateAllCache();
  SheetSchema.invalidateColumnMap();
  SheetSchema.invalidateColumnMap(CONFIG.VISUAL_PIPELINE.SHEET_NAME);
  Logger.log('System cache cleared at ' + new Date().toISOString());
}


function listAvailableModels() {
  var apiKey = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
  var url = 'https://generativelanguage.googleapis.com/v1beta/models?key=' + apiKey;

  var response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
  var data = JSON.parse(response.getContentText());

  if (data.models) {
    for (var i = 0; i < data.models.length; i++) {
      Logger.log(data.models[i].name);
    }
  } else {
    Logger.log('No models returned. Response: ' + response.getContentText().substring(0, 500));
  }
}


// ================================
// VISUAL WORKER BATCH EXECUTION
// ================================

function runVisualWorkerBatch(workerName, startRow, endRow) {
  var upperName = workerName.toUpperCase().trim();

  if (!CONFIG.WORKERS[upperName]) {
    Logger.logFailure(upperName, '?', 0, 'Unknown worker: ' + workerName);
    throw new Error('Unknown worker: ' + workerName);
  }

  var workerConfig = CONFIG.WORKERS[upperName];
  var sheetName = workerConfig.sheetName || CONFIG.VISUAL_PIPELINE.SHEET_NAME;
  var lastRow = SheetSchema.getLastRow(sheetName);
  endRow = Math.min(endRow, lastRow);
  startRow = Math.max(startRow, CONFIG.DATA_START_ROW);

  var timeoutMs = (CONFIG.BATCH_TIMEOUT_SECONDS || 300) * 1000;
  var batchStart = new Date().getTime();
  var results = [];
  var successCount = 0;
  var failCount = 0;
  var interrupted = false;

  for (var row = startRow; row <= endRow; row++) {
    var result = runWorker(upperName, row);

    results.push(result);

    if (result.success) {
      successCount++;
      saveCheckpoint(upperName, row + 1);
    } else {
      failCount++;
    }

    if (row < endRow) {
      var elapsed = new Date().getTime() - batchStart;
      if (elapsed >= timeoutMs) {
        interrupted = true;
        break;
      }
      Utilities.sleep(1500);
    }
  }

  if (!interrupted) {
    clearCheckpoint(upperName);
  }

  var status = interrupted ? 'TIMEOUT' : (failCount === 0 ? 'SUCCESS' : 'PARTIAL');

  Logger.logExecution({
    worker: upperName,
    row: startRow + '-' + (interrupted ? results[results.length - 1].row : endRow),
    status: status,
    runtime: new Date().getTime() - batchStart,
    details: 'Batch: ' + successCount + ' success, ' + failCount + ' failed' +
      (interrupted ? ' (timeout - resume from row ' + results[results.length - 1].row + ')' : '')
  });

  return {
    totalRows: results.length,
    success: successCount,
    failed: failCount,
    interrupted: interrupted,
    nextRow: interrupted ? results[results.length - 1].row + 1 : null,
    results: results
  };
}


// ================================
// ROW RANGE WITH SHEET SUPPORT
// ================================

function askForRowRange(sheetName) {
  var targetSheet = sheetName || CONFIG.SHEET_NAME;
  var lastRow = SheetSchema.getLastRow(targetSheet);

  var startStr = Browser.inputBox(
    'INSAN AI - Start Row',
    'Sheet: ' + targetSheet +
    '\nData starts at row ' + CONFIG.DATA_START_ROW +
    '. Last data row: ' + lastRow +
    '\n\nEnter start row:',
    Browser.Buttons.OK_CANCEL
  );
  if (startStr === 'cancel' || !startStr) return null;

  var startRow = parseInt(startStr, 10);
  if (isNaN(startRow) || startRow < CONFIG.DATA_START_ROW || startRow > lastRow) {
    Browser.msgBox('Error', 'Invalid start row: ' + startStr, Browser.Buttons.OK);
    return null;
  }

  var modeStr = Browser.inputBox(
    'INSAN AI - Processing Mode',
    'Start row: ' + startRow +
    '\n\nProcessing Mode:\n\n1. Number of Rows\n2. End Row',
    Browser.Buttons.OK_CANCEL
  );
  if (modeStr === 'cancel' || !modeStr) return null;

  var mode = parseInt(modeStr, 10);
  if (mode !== 1 && mode !== 2) {
    Browser.msgBox('Error', 'Select 1 or 2', Browser.Buttons.OK);
    return null;
  }

  if (mode === 1) {
    var countStr = Browser.inputBox(
      'INSAN AI - Number of Rows',
      'Start row: ' + startRow + '\nLast data row: ' + lastRow +
      '\n\nHow many rows to process?',
      Browser.Buttons.OK_CANCEL
    );
    if (countStr === 'cancel' || !countStr) return null;

    var count = parseInt(countStr, 10);
    if (isNaN(count) || count < 1) {
      Browser.msgBox('Error', 'Invalid number: ' + countStr, Browser.Buttons.OK);
      return null;
    }

    return { start: startRow, end: Math.min(startRow + count - 1, lastRow) };
  } else {
    var endStr = Browser.inputBox(
      'INSAN AI - End Row',
      'Start row: ' + startRow + '\nLast data row: ' + lastRow +
      '\n\nEnter end row:',
      Browser.Buttons.OK_CANCEL
    );
    if (endStr === 'cancel' || !endStr) return null;

    var endRow = parseInt(endStr, 10);
    if (isNaN(endRow) || endRow < startRow) {
      Browser.msgBox('Error', 'Invalid end row', Browser.Buttons.OK);
      return null;
    }

    return { start: startRow, end: Math.min(endRow, lastRow) };
  }
}


// ================================
// VISUAL QA STAGE MAPPING
// ================================

function _applyVisualStageMapping(rowNumber, parsedValues, sheetName) {
  var qaDecision = parsedValues['Visual QA Decision'];
  if (!qaDecision) {
    Logger.logFailure('VISUAL_QA_WORKER', rowNumber, 0,
      'No Visual QA Decision found in parsed values');
    return;
  }

  var stageMapping = CONFIG.WORKERS.VISUAL_QA_WORKER.stageMapping;
  var nextStage = stageMapping[qaDecision];

  if (!nextStage) {
    Logger.logFailure('VISUAL_QA_WORKER', rowNumber, 0,
      'Unknown QA Decision: "' + qaDecision + '". Expected: ' +
      Object.keys(stageMapping).join(', '));
    return;
  }

  _transitionVisualStage(rowNumber, nextStage, sheetName);

  if (qaDecision === 'Approved') {
    var rowData = SheetSchema.getRowData(rowNumber, sheetName);
    var generatedAssets = rowData['Generated Assets'];
    if (generatedAssets) {
      var columnMap = SheetSchema._getColumnMap(sheetName);
      var finalAssetCol = columnMap['Final Asset URL'];
      if (finalAssetCol) {
        var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
        sheet.getRange(rowNumber, finalAssetCol).setValue(generatedAssets);
      }
    }
  }

  SpreadsheetApp.flush();

  Logger.logSuccess('VISUAL_QA_WORKER', rowNumber, 0, 0, 0,
    'Stage mapped: ' + qaDecision + ' → ' + nextStage);
}


// ================================
// VISUAL STAGE TRANSITIONS
// Single authoritative state machine
// ================================

function _transitionVisualStage(rowNumber, nextStage, sheetName) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  var columnMap = SheetSchema._getColumnMap(sheetName);
  var stageCol = columnMap['VISUAL_STAGE'];

  if (!stageCol) {
    Logger.logFailure('ORCHESTRATOR', rowNumber, 0,
      'VISUAL_STAGE column not found in sheet: ' + sheetName);
    return;
  }

  sheet.getRange(rowNumber, stageCol).setValue(nextStage);
}


function _applyVisualPlannerStageMapping(rowNumber, parsedValues, sheetName) {
  var assetCount = parsedValues['Asset Count'];
  if (assetCount && parseInt(assetCount, 10) > 0) {
    _transitionVisualStage(rowNumber, 'GENERATING', sheetName);
    SpreadsheetApp.flush();
    Logger.logSuccess('VISUAL_PLANNER_WORKER', rowNumber, 0, 0, 0,
      'Stage transition: READY/PLANNING → GENERATING');
  }
}


function _applyMediaGenerationStageMapping(rowNumber, success, sheetName) {
  var nextStage = success ? 'QA' : 'FAILED';
  _transitionVisualStage(rowNumber, nextStage, sheetName);
  SpreadsheetApp.flush();
  Logger.logSuccess('MEDIA_GENERATION_SERVICE', rowNumber, 0, 0, 0,
    'Stage transition: GENERATING → ' + nextStage);
}


// ================================
// CONTENT ID GENERATION
// ================================

function _generateContentId(rowNumber) {
  var props = PropertiesService.getScriptProperties();
  var lastId = parseInt(props.getProperty('LAST_CONTENT_ID') || '0', 10);
  var newId = lastId + 1;
  props.setProperty('LAST_CONTENT_ID', String(newId));

  var padded = ('000000' + newId).slice(-6);
  return 'CNT-' + padded;
}
