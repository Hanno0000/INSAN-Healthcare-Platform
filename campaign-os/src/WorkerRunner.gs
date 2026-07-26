// ================================
// EXECUTION BUDGET
// One allowance per invocation, shared by every worker in it.
//
// Previously each batch started its own 300s timer, so a three-worker pipeline
// could plan for 900 seconds inside an execution the platform kills at 360.
// Work never stopped voluntarily — it was terminated mid-row, which is why
// Visual QA silently never ran.
// ================================

var ExecutionBudget = {
  _start: null,
  _samples: {},

  begin: function() {
    this._start = new Date().getTime();
    this._samples = {};
  },

  elapsed: function() {
    return this._start === null ? 0 : new Date().getTime() - this._start;
  },

  remaining: function() {
    var usable = CONFIG.EXECUTION.HARD_LIMIT_MS - CONFIG.EXECUTION.SAFETY_MARGIN_MS;
    return Math.max(0, usable - this.elapsed());
  },

  // Rolling average of how long a row of this worker actually takes, so the
  // estimate reflects the model and row size in front of us rather than a guess.
  record: function(key, ms) {
    var s = this._samples[key] || { total: 0, count: 0 };
    s.total += ms;
    s.count += 1;
    this._samples[key] = s;
  },

  estimateFor: function(key) {
    var s = this._samples[key];
    if (!s || !s.count) {
      return CONFIG.EXECUTION.DEFAULT_ROW_ESTIMATE_MS;
    }
    // Bias upward: overrunning the ceiling loses the checkpoint entirely,
    // while stopping one row early costs only a resume.
    return Math.round((s.total / s.count) * 1.25);
  },

  canFitAnother: function(key) {
    return this.remaining() > this.estimateFor(key);
  },

  summary: function() {
    return Math.round(this.elapsed() / 1000) + 's used, ~' +
      Math.round(this.remaining() / 1000) + 's left';
  }
};


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
    .addSubMenu(SpreadsheetApp.getUi()
      .createMenu('Maintenance')
      .addItem('Preflight Check', 'preflightCheck')
      .addItem('Unblock Dropdowns (run once)', 'relaxDataValidation')
      .addItem('Review Vocabulary Gaps', 'showVocabularyGaps')
      .addSeparator()
      .addItem('Background Job Status', 'showJobStatus')
      .addItem('Cancel Background Job', 'cancelActiveJob'))
    .addSeparator()
    .addItem('Refresh Cache', 'refreshCache')
    .addItem('System Status', 'systemStatus')
    .addToUi();
}


function showJobStatus() {
  var ui = SpreadsheetApp.getUi();
  var job = _loadJob();

  if (!job) {
    ui.alert('Background Job', 'No job is running.', ui.ButtonSet.OK);
    return;
  }

  var pending = job.workers.filter(function(w) {
    return job.completed.indexOf(w) === -1;
  });

  var lines = [
    'Rows ' + job.start + ' to ' + job.end,
    'Pass ' + (job.passes || 1) + ' of at most ' + MAX_JOB_PASSES,
    '',
    'Done: ' + (job.completed.length ? job.completed.map(toDisplayName).join(', ') : 'none yet'),
    'Pending: ' + pending.map(toDisplayName).join(', '),
    '',
    'It continues on its own about a minute after each pass.',
    'You do not need to keep the sheet open.'
  ];

  ui.alert('Background Job', lines.join('\n'), ui.ButtonSet.OK);
}


function cancelActiveJob() {
  var ui = SpreadsheetApp.getUi();
  var job = _loadJob();

  if (!job) {
    _removeContinuationTriggers();
    ui.alert('Background Job', 'Nothing to cancel.', ui.ButtonSet.OK);
    return;
  }

  var answer = ui.alert(
    'Cancel Background Job',
    'Stop the job on rows ' + job.start + '–' + job.end + '?\n\n' +
    'Work already written to the sheet is kept. Row checkpoints are kept too, ' +
    'so "Resume Last Run" can still pick up where it stopped.',
    ui.ButtonSet.YES_NO
  );

  if (answer !== ui.Button.YES) {
    return;
  }

  _clearJob();
  ui.alert('Background Job', 'Cancelled. Automatic continuation is off.', ui.ButtonSet.OK);
}


// Cheap sanity check on the strategic inputs before spending a run.
//
// A column-offset in the Content Pipeline transfer formula silently fed every
// worker the wrong field for months: Target Audience received a number, and
// Emotional Trigger received a psychological barrier. Nothing failed loudly —
// the output was simply built on scrambled inputs. This catches that class of
// problem in seconds instead of after a paid run.
function preflightCheck() {
  var ui = SpreadsheetApp.getUi();

  try {
    var sheetName = CONFIG.SHEET_NAME;
    var lastRow = SheetSchema.getLastRow(sheetName);
    var problems = [];
    var checked = 0;

    for (var row = CONFIG.DATA_START_ROW; row <= Math.min(lastRow, 20); row++) {
      var data = SheetSchema.getRowData(row, sheetName);

      if (!data['Campaign Name'] && !data['Content Angle']) {
        continue;
      }

      checked++;

      var audience = String(data['Target Audience'] || '').trim();
      if (!audience) {
        problems.push('Row ' + row + ': Target Audience is empty');
      } else if (/^\d+([.,]\d+)?$/.test(audience)) {
        problems.push('Row ' + row + ': Target Audience contains a number ("' +
          audience + '") — the transfer formula is almost certainly off by a column');
      }

      var kpi = String(data['Primary KPI'] || '').trim();
      if (/primary\s*:/i.test(kpi) || /secondary\s*:/i.test(kpi)) {
        problems.push('Row ' + row + ': Primary KPI holds audience data ("' +
          kpi.substring(0, 60) + '") — columns are shifted');
      }

      var cta = String(data['CTA Strategy'] || '').trim();
      if (cta && CONFIG.CONTROLLED_VOCABULARY['CTA Strategy'].indexOf(cta) === -1 &&
          cta.indexOf('|') === -1) {
        problems.push('Row ' + row + ': CTA Strategy is "' + cta.substring(0, 40) +
          '", which is not a CTA');
      }

      // A format nobody can produce still consumes strategy, copy and creative
      // direction before failing at the last step.
      var format = String(data['Content Format'] || '').trim();
      if (format && CONFIG.IMPLEMENTED_FORMATS.indexOf(format) === -1) {
        problems.push('Row ' + row + ': Content Format is "' + format +
          '", which the pipeline cannot generate yet. Supported: ' +
          CONFIG.IMPLEMENTED_FORMATS.join(', '));
      }
    }

    var lines;

    if (!problems.length) {
      lines = [
        'Checked ' + checked + ' row(s). No input problems detected.',
        '',
        'Strategic inputs look correctly aligned.'
      ];
    } else {
      lines = ['Checked ' + checked + ' row(s). Found ' + problems.length + ' problem(s):', ''];
      for (var i = 0; i < Math.min(problems.length, 15); i++) {
        lines.push('• ' + problems[i]);
      }
      if (problems.length > 15) {
        lines.push('… and ' + (problems.length - 15) + ' more.');
      }
      lines.push('');
      lines.push('If columns are shifted, check the transfer formula in the first');
      lines.push('Campaign-Cards-sourced column of Content Pipeline. Fix the data');
      lines.push('before running workers — they cannot detect scrambled inputs.');
    }

    ui.alert('Preflight Check', lines.join('\n'), ui.ButtonSet.OK);

  } catch (e) {
    ui.alert('Preflight Check', 'Failed: ' + e.toString(), ui.ButtonSet.OK);
  }
}


// Converts every "reject input" dropdown in both pipelines into a "show warning"
// dropdown, so a worker is never blocked from writing a value that is missing
// from the controlled vocabulary. The list stays visible for human editors.
function relaxDataValidation() {
  var ui = SpreadsheetApp.getUi();

  try {
    var results = SheetWriter.relaxAllPipelineValidation();
    var lines = ['Dropdowns converted to warn-only:', ''];
    var total = 0;

    for (var i = 0; i < results.length; i++) {
      var r = results[i];
      if (r.error) {
        lines.push('• ' + r.sheet + ' — ' + r.error);
        continue;
      }
      lines.push('• ' + r.sheet + ' — ' + r.relaxed + ' of ' + r.scanned + ' rules changed');
      total += r.relaxed;
    }

    lines.push('');
    lines.push(total > 0
      ? 'Workers can no longer be blocked by a missing vocabulary value. ' +
        'Out-of-vocabulary values are recorded in the Execution Log for review.'
      : 'Nothing to change — no rejecting dropdowns were found.');

    ui.alert('Data Validation', lines.join('\n'), ui.ButtonSet.OK);

  } catch (e) {
    ui.alert('Data Validation', 'Failed: ' + e.toString(), ui.ButtonSet.OK);
  }
}


// Lists every value a worker produced that was outside the controlled
// vocabulary, grouped by column — the raw material for updating SYSTEM_CONSTANTS.
function showVocabularyGaps() {
  var ui = SpreadsheetApp.getUi();

  try {
    var grouped = Logger.getVocabularyDeviations();
    var columns = Object.keys(grouped);

    if (!columns.length) {
      ui.alert('Vocabulary Gaps',
        'No out-of-vocabulary values recorded yet.', ui.ButtonSet.OK);
      return;
    }

    var lines = ['Values produced that are missing from SYSTEM_CONSTANTS:', ''];

    for (var i = 0; i < columns.length; i++) {
      var col = columns[i];
      lines.push(col + ':');

      var values = grouped[col];
      for (var value in values) {
        lines.push('   "' + value + '"  (seen ' + values[value] + 'x)');
      }
      lines.push('');
    }

    lines.push('Add the values worth keeping to SYSTEM_CONSTANTS and CONFIG.gs.');

    ui.alert('Vocabulary Gaps', lines.join('\n'), ui.ButtonSet.OK);

  } catch (e) {
    ui.alert('Vocabulary Gaps', 'Failed: ' + e.toString(), ui.ButtonSet.OK);
  }
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

  ExecutionBudget.begin();

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
      var remaining = workerNames.slice(i);
      _saveJob({
        workers: workerNames,
        completed: workerNames.slice(0, i),
        start: range.start,
        end: range.end,
        passes: 1,
        stalls: 0
      });
      _scheduleContinuation(1);

      summary.push('\nTime budget reached — this is expected on larger ranges.');
      summary.push('The job will continue automatically in about a minute.');
      summary.push('You can close the sheet; progress is checkpointed.');
      if (remaining.length > 0) {
        summary.push('\nStill pending: ' + remaining.map(toDisplayName).join(', '));
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

  ExecutionBudget.begin();

  var pipelineStart = new Date().getTime();
  var summary = [];
  // Only an exhausted time budget halts the pipeline. Row-level failures are
  // reported and stepped over: a Video row that cannot be generated must not
  // prevent QA from ever seeing the four rows that generated fine.
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

    if (result.interrupted) {
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

    if (genResult.interrupted) {
      pipelineFailed = true;
      summary.push('Pipeline paused: time budget reached during generation');
    } else if (genResult.success === 0) {
      pipelineFailed = true;
      summary.push('Pipeline stopped: no assets were generated for any row');
    } else if (genResult.failed > 0) {
      summary.push('  (' + genResult.failed + ' row(s) failed generation — QA will run on the rest)');
    }
  } else {
    summary.push('Media Generation: skipped (time budget reached)');
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
    summary.push('Visual QA: NOT RUN — resume the pipeline to complete it');
  }

  // The visual pipeline interleaves a service between two workers, so it is
  // resumed as a whole rather than worker by worker.
  if (pipelineFailed) {
    _saveJob({
      workers: ['VISUAL_PLANNER_WORKER', 'MEDIA_GENERATION', 'VISUAL_QA_WORKER'],
      completed: [],
      start: range.start,
      end: range.end,
      passes: 1,
      stalls: 0
    });
    _scheduleContinuation(1);
    summary.push('\nThe remaining rows will be picked up automatically in about a minute.');
  }

  var pipelineEnd = new Date().getTime();
  var totalDuration = ((pipelineEnd - pipelineStart) / 1000).toFixed(1);

  Browser.msgBox(
    pipelineFailed ? 'Visual Pipeline Paused' : 'Visual Pipeline Complete',
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


// Appends the approved hashtags to the final post copy as one publish-ready
// block. Any hashtag block the model already added is removed first, so running
// this twice — or on a row where the writer improvised — cannot duplicate them.
function _composeFinalPostCopy(values) {
  var copy = String(values['Creative Director Post Copy'] || '').trim();

  if (!copy) {
    return;
  }

  // Strip trailing lines that are purely hashtags. Hashtags used mid-sentence
  // are left alone; only the closing block is managed here.
  var lines = copy.split('\n');
  while (lines.length) {
    var last = lines[lines.length - 1].trim();
    if (last === '' || /^(#[^\s#]+)(\s+#[^\s#]+)*$/.test(last)) {
      lines.pop();
    } else {
      break;
    }
  }

  var body = lines.join('\n').trim();
  var tags = [];

  ['Primary Hashtags', 'Secondary Hashtags'].forEach(function(field) {
    var raw = String(values[field] || '').trim();
    if (raw) {
      tags.push(raw.replace(/\s+/g, ' '));
    }
  });

  values['Creative Director Post Copy'] = tags.length
    ? body + '\n\n' + tags.join('\n')
    : body;
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

    // The Visual Planner owns the Production Mode decision but has no way to
    // look inside a Drive folder. Tell it what actually exists, so the decision
    // reflects reality instead of being a guess that nothing acts on.
    if (upperName === 'VISUAL_PLANNER_WORKER') {
      var plannerDomain = DriveLoader.resolveAssetDomain(rowData);
      var availableAssets = DriveLoader.listProjectAssets(plannerDomain);

      context += '\n\n## PROJECT ASSET AVAILABILITY\n\n';

      if (availableAssets.length) {
        context += 'Real photographs of this facility are available for the "' +
          plannerDomain.folder + '" domain:\n' +
          availableAssets.slice(0, 20).map(function(n) { return '- ' + n; }).join('\n') +
          '\n\nProduction Mode must be PROJECT_ASSET. These photographs will be ' +
          'supplied to the generation model as visual reference. Write the brief ' +
          'so it complements them rather than describing an environment from ' +
          'scratch — the architecture, finishes and equipment come from the ' +
          'photographs.\n';
      } else {
        context += 'No project photographs are available for this row' +
          (plannerDomain ? ' (domain "' + plannerDomain.folder + '" is empty or unavailable)' : '') +
          '. Production Mode must be AI_GENERATED. Describe the environment fully ' +
          'in the brief, since nothing visual will be supplied.\n';
      }
    }

    var callOptions = {
      temperature: workerConfig.temperature
    };

    // Visual QA evaluates artwork, so it must receive the artwork. Without this
    // it only ever saw the Drive URL as text and graded the brief, not the image.
    if (upperName === 'VISUAL_QA_WORKER') {
      var qaImages = DriveLoader.loadImagesFromCell(rowData['Generated Assets']);

      if (!qaImages.length) {
        throw new Error(
          'Visual QA cannot run: no readable image found in "Generated Assets" ' +
          'for row ' + rowNumber + '. QA must never grade an asset it cannot see.'
        );
      }

      callOptions.images = qaImages;
      context += '\n\n=== GENERATED ASSETS ===\n\n' +
        qaImages.length + ' generated image(s) are attached above. ' +
        'Evaluate ONLY what is visibly present in those images. ' +
        'Do not restate or paraphrase the Creative Package as if it were an ' +
        'observation. Every statement in your evaluation must describe something ' +
        'you can actually see in the attached artwork.\n\n' +
        '=== END OF GENERATED ASSETS ===';
    }

    var aiResponse = AIProvider.call(context, callOptions);

    var parsed = ResponseParser.parse(aiResponse.text, upperName);

    // Vocabulary gaps are recorded, never fatal. Reviewing these after a run is
    // how SYSTEM_CONSTANTS gets corrected from evidence instead of assumption.
    if (parsed.deviations && parsed.deviations.length) {
      for (var d = 0; d < parsed.deviations.length; d++) {
        Logger.logVocabularyDeviation(
          upperName, rowNumber,
          parsed.deviations[d].field,
          parsed.deviations[d].value,
          parsed.deviations[d].vocabulary
        );
      }
    }

    // Hashtags live in their own columns, but a post is published as one block
    // of text. Composing it here rather than asking the model to do it makes the
    // result deterministic: the same hashtags, in the same place, every time —
    // and it fixes the inconsistency where one row carried them inline and the
    // rest did not.
    if (upperName === 'CREATIVE_DIRECTOR_WORKER') {
      _composeFinalPostCopy(parsed.values);
    }

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

  if (ExecutionBudget._start === null) {
    ExecutionBudget.begin();
  }

  var batchStart = new Date().getTime();
  var results = [];
  var successCount = 0;
  var failCount = 0;
  var interrupted = false;

  for (var row = startRow; row <= endRow; row++) {
    // Decide before spending, not after. Stopping one row early costs a resume;
    // being killed mid-row loses the checkpoint and the work in flight.
    if (row > startRow && !ExecutionBudget.canFitAnother(upperName)) {
      interrupted = true;
      saveCheckpoint(upperName, row);
      Logger.log(
        'BUDGET_STOP | ' + upperName + ' | stopping before row ' + row +
        ' | ' + ExecutionBudget.summary()
      );
      break;
    }

    var rowStart = new Date().getTime();
    var result = runWorker(upperName, row);
    ExecutionBudget.record(upperName, new Date().getTime() - rowStart);

    results.push(result);

    // A failed row is recorded and the batch moves on. One bad row must never
    // decide the fate of the rows behind it.
    if (result.success) {
      successCount++;
      saveCheckpoint(upperName, row + 1);
    } else {
      failCount++;
    }

    if (row < endRow) {
      Utilities.sleep(CONFIG.EXECUTION.INTER_ROW_PAUSE_MS);
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
// UNATTENDED CONTINUATION
//
// Apps Script cannot run longer than ~6 minutes, so a 20-row job is
// necessarily several executions. Rather than asking the operator to press
// Resume for each one, an interrupted job stores what remains and installs a
// one-shot trigger to pick it up a minute later. The job finishes on its own.
//
// Guards: only one continuation trigger may exist at a time, and a job that
// stops making progress is abandoned rather than rescheduled forever.
// ================================

var JOB_KEY = 'ACTIVE_JOB';
var CONTINUATION_HANDLER = 'continueActiveJob';
var MAX_JOB_PASSES = 25;

function _saveJob(job) {
  PropertiesService.getScriptProperties().setProperty(JOB_KEY, JSON.stringify(job));
}

function _loadJob() {
  var raw = PropertiesService.getScriptProperties().getProperty(JOB_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

function _clearJob() {
  PropertiesService.getScriptProperties().deleteProperty(JOB_KEY);
  _removeContinuationTriggers();
}

function _removeContinuationTriggers() {
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === CONTINUATION_HANDLER) {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }
}

function _scheduleContinuation(delayMinutes) {
  _removeContinuationTriggers();
  ScriptApp.newTrigger(CONTINUATION_HANDLER)
    .timeBased()
    .after((delayMinutes || 1) * 60 * 1000)
    .create();
}

// Entry point for the trigger. Never opens a dialog — nobody is watching.
function continueActiveJob() {
  var job = _loadJob();

  if (!job) {
    _removeContinuationTriggers();
    return;
  }

  job.passes = (job.passes || 0) + 1;

  if (job.passes > MAX_JOB_PASSES) {
    Logger.logFailure('ORCHESTRATOR', job.start, 0,
      'Job abandoned after ' + MAX_JOB_PASSES + ' passes without completing. ' +
      'Resume manually once the cause is understood.');
    _clearJob();
    return;
  }

  ExecutionBudget.begin();

  var progressed = false;

  try {
    for (var i = 0; i < job.workers.length; i++) {
      var worker = job.workers[i];
      var resume = (worker === 'MEDIA_GENERATION') ? null : getCheckpoint(worker);
      var from = (resume && resume >= job.start && resume <= job.end) ? resume : job.start;

      if (job.completed.indexOf(worker) !== -1 || from > job.end) {
        continue;
      }

      if (!ExecutionBudget.canFitAnother(worker)) {
        break;
      }

      var result;

      if (worker === 'MEDIA_GENERATION') {
        // A service, not a worker: no prompt, no checkpoint of its own.
        var gen = ServiceRunner.runMediaGeneration(job.start, job.end);
        result = {
          success: gen.success,
          failed: gen.failed,
          interrupted: !!gen.interrupted
        };
      } else {
        var isVisual = !!(CONFIG.WORKERS[worker] && CONFIG.WORKERS[worker].sheetName);
        result = isVisual
          ? runVisualWorkerBatch(worker, from, job.end)
          : runWorkerBatch(worker, from, job.end);
      }

      if (result.success > 0 || result.failed > 0) {
        progressed = true;
      }

      if (result.interrupted) {
        break;
      }

      job.completed.push(worker);
    }
  } catch (e) {
    Logger.logFailure('ORCHESTRATOR', job.start, 0,
      'Continuation pass failed: ' + e.toString());
  }

  var remaining = job.workers.filter(function(w) {
    return job.completed.indexOf(w) === -1;
  });

  if (!remaining.length) {
    Logger.logSuccess('ORCHESTRATOR', job.start + '-' + job.end, 0, 0, 0,
      'Job complete after ' + job.passes + ' pass(es): ' + job.workers.join(' → '));
    _clearJob();
    return;
  }

  // No progress twice running means something is stuck, not slow.
  if (!progressed) {
    job.stalls = (job.stalls || 0) + 1;
    if (job.stalls >= 2) {
      Logger.logFailure('ORCHESTRATOR', job.start, 0,
        'Job made no progress on two consecutive passes. Stopping. ' +
        'Pending: ' + remaining.join(', '));
      _clearJob();
      return;
    }
  } else {
    job.stalls = 0;
  }

  _saveJob(job);
  _scheduleContinuation(1);

  Logger.logPartial('ORCHESTRATOR', job.start + '-' + job.end, 0,
    'Pass ' + job.passes + ' done. Continuing automatically in ~1 min. Pending: ' +
    remaining.join(', '));
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

  if (ExecutionBudget._start === null) {
    ExecutionBudget.begin();
  }

  var batchStart = new Date().getTime();
  var results = [];
  var successCount = 0;
  var failCount = 0;
  var interrupted = false;

  for (var row = startRow; row <= endRow; row++) {
    // Decide before spending, not after. Stopping one row early costs a resume;
    // being killed mid-row loses the checkpoint and the work in flight.
    if (row > startRow && !ExecutionBudget.canFitAnother(upperName)) {
      interrupted = true;
      saveCheckpoint(upperName, row);
      Logger.log(
        'BUDGET_STOP | ' + upperName + ' | stopping before row ' + row +
        ' | ' + ExecutionBudget.summary()
      );
      break;
    }

    var rowStart = new Date().getTime();
    var result = runWorker(upperName, row);
    ExecutionBudget.record(upperName, new Date().getTime() - rowStart);

    results.push(result);

    // A failed row is recorded and the batch moves on. One bad row must never
    // decide the fate of the rows behind it.
    if (result.success) {
      successCount++;
      saveCheckpoint(upperName, row + 1);
    } else {
      failCount++;
    }

    if (row < endRow) {
      Utilities.sleep(CONFIG.EXECUTION.INTER_ROW_PAUSE_MS);
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

// Revision cycles are counted per Content ID in Script Properties so the cap
// survives separate menu invocations without requiring a new sheet column.
function _revisionKey(contentId) {
  return 'visual_revision_' + String(contentId || '').trim();
}

function _getRevisionCount(contentId) {
  if (!contentId) return 0;
  var raw = PropertiesService.getScriptProperties().getProperty(_revisionKey(contentId));
  var count = parseInt(raw, 10);
  return isNaN(count) ? 0 : count;
}

function _bumpRevisionCount(contentId) {
  if (!contentId) return 0;
  var next = _getRevisionCount(contentId) + 1;
  PropertiesService.getScriptProperties()
    .setProperty(_revisionKey(contentId), String(next));
  return next;
}

function _clearRevisionCount(contentId) {
  if (!contentId) return;
  PropertiesService.getScriptProperties().deleteProperty(_revisionKey(contentId));
}

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

  var qaRowData = SheetSchema.getRowData(rowNumber, sheetName);
  var qaContentId = qaRowData[CONFIG.COLUMN_NAMES.CONTENT_ID];
  var maxCycles = CONFIG.VISUAL_PIPELINE.MAX_REVISION_CYCLES || 3;

  if (qaDecision === 'Revision Required') {
    var cycles = _bumpRevisionCount(qaContentId);

    if (cycles >= maxCycles) {
      _clearRevisionCount(qaContentId);
      _transitionVisualStage(rowNumber, 'FAILED', sheetName);
      SpreadsheetApp.flush();

      Logger.logFailure('VISUAL_QA_WORKER', rowNumber, 0,
        'Revision limit reached (' + cycles + '/' + maxCycles + ') for ' +
        qaContentId + '. Stopped at FAILED instead of regenerating again. ' +
        'Creative Director review required.');
      return;
    }

    Logger.logSuccess('VISUAL_QA_WORKER', rowNumber, 0, 0, 0,
      'Revision cycle ' + cycles + '/' + maxCycles + ' for ' + qaContentId);
  } else {
    _clearRevisionCount(qaContentId);
  }

  _transitionVisualStage(rowNumber, nextStage, sheetName);

  if (qaDecision === 'Approved') {
    var generatedAssets = qaRowData['Generated Assets'];
    if (generatedAssets) {
      SheetWriter.writeCell(rowNumber, 'Final Asset URL', generatedAssets, sheetName);
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
  var columnMap = SheetSchema._getColumnMap(sheetName);
  var stageCol = columnMap['VISUAL_STAGE'];

  if (!stageCol) {
    Logger.logFailure('ORCHESTRATOR', rowNumber, 0,
      'VISUAL_STAGE column not found in sheet: ' + sheetName);
    return false;
  }

  // Routed through the safe writer: a dropdown on VISUAL_STAGE that refuses a
  // value would otherwise halt the entire state machine.
  var ok = SheetWriter.writeCell(rowNumber, 'VISUAL_STAGE', nextStage, sheetName);

  if (!ok) {
    Logger.logFailure('ORCHESTRATOR', rowNumber, 0,
      'Failed to write VISUAL_STAGE = "' + nextStage + '" on row ' + rowNumber +
      '. The row is stranded at its previous stage and needs manual review.');
  }

  return ok;
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
