// ===========================================================================
// App.gs
//
// The entry points. onOpen and every function the menu binds to by name,
// plus the Control Center sidebar.
//
// Merged from 2 source files on 2026-08-02. Apps Script has no
// modules: every .gs is evaluated into one shared scope before anything is
// called, so which file a definition sits in has never affected what runs.
// They were split for reading and merged because the operator pastes each
// file into the editor by hand.
//
// The BEGIN/END banners below are load-bearing for the tests, which read a
// section by name — see tests/run.js, fixtures.srcSection.
//
// Contents:
//   WorkerRunner.gs
//   ControlCenter.gs
// ===========================================================================


// ---------------------------------------------------------------------------
// BEGIN SOURCE FILE: WorkerRunner.gs
// ---------------------------------------------------------------------------
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


// ================================
// OPERATOR STOP
// A run in progress had no off switch. The only ways out were to let it finish
// or to close the tab — and closing the tab does not stop the server, it just
// stops you seeing it. On a batch that is producing bad output, or one launched
// against the wrong rows, every remaining row is a paid mistake.
//
// The sidebar issues the stop as its own request while the run is still going;
// Apps Script runs the two concurrently, so the flag lands in the property
// store where the running loop reads it between rows. Nothing is interrupted
// mid-row: the row in flight is finished and written, then the batch stops the
// way it stops for a spent time budget — checkpoint saved, resumable.
// ================================

var RunControl = {
  PROPERTY: 'STOP_REQUESTED',

  // Stop means stop — including the parts that would restart on their own.
  // A long job schedules its own continuation about a minute after each pass,
  // so halting only the execution in flight would look like it worked and then
  // quietly resume. The scheduled trigger goes with it.
  requestStop: function() {
    var now = new Date().getTime();
    PropertiesService.getScriptProperties().setProperty(this.PROPERTY, String(now));

    var hadJob = !!_loadJob();
    _clearJob();

    Logger.log(
      'STOP_REQUESTED | operator asked the current run to stop' +
      (hadJob ? ' | background continuation cancelled' : '')
    );

    return { requestedAt: now, jobCancelled: hadJob };
  },

  clear: function() {
    PropertiesService.getScriptProperties().deleteProperty(this.PROPERTY);
  },

  // A stop applies only to a run that was already going when the button was
  // pressed. Comparing the request against the run's own start time means a
  // flag left behind by an earlier run — one that finished before the loop
  // noticed, or died mid-row — can never kill the next run. So no entry point
  // has to remember to clear the flag first, and there is no window in which
  // clearing it races the request.
  stopRequested: function(runStartMs) {
    var raw = PropertiesService.getScriptProperties().getProperty(this.PROPERTY);

    if (!raw) {
      return false;
    }

    var requestedAt = parseInt(raw, 10);

    if (isNaN(requestedAt)) {
      return false;
    }

    return requestedAt >= (runStartMs || 0);
  },

  // The start time every loop in this execution measures a stop request
  // against. ExecutionBudget.begin() runs once per invocation, so its start is
  // the outermost run's start even when a pipeline spans several batches —
  // which is what makes a stop pressed during step 1 still stop step 2.
  runStart: function(fallbackMs) {
    return ExecutionBudget._start === null ? fallbackMs : ExecutionBudget._start;
  }
};


function onOpen() {
  ConfigResolver.apply();

  SpreadsheetApp.getUi()
    .createMenu('AI Workers')
    .addItem('Production Control Center', 'showControlCenter')
    .addSeparator()
    .addSubMenu(SpreadsheetApp.getUi()
      .createMenu('Planning')
      .addItem('Build Campaign Card from Knowledge File', 'runCardBuilder')
      .addItem('Check Knowledge File', 'checkKnowledgeFile')
      .addSeparator()
      .addItem('Plan a Cycle', 'runCampaignPlanner')
      .addItem('Transfer Rows Forward', 'transferRowsForward')
      .addItem('What Is Coming', 'showUpcomingEvents')
      .addItem('Review Plan Before Production', 'runPortfolioCritic'))
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
      .addItem('Reuse An Approved Asset', 'reuseApprovedAsset')
      .addItem('Run Full Visual Pipeline', 'runFullVisualPipeline'))
    .addSubMenu(SpreadsheetApp.getUi()
      .createMenu('Publishing & Ads')
      .addItem('Publish Approved Rows', 'runPublishingWorker')
      .addItem('Draft Paid Ads', 'runPaidAdsWorker'))
    .addSeparator()
    .addItem('Resume Last Run', 'resumeLastRun')
    .addSeparator()
    .addSubMenu(SpreadsheetApp.getUi()
      .createMenu('Maintenance')
      .addItem('Preflight Check', 'preflightCheck')
      .addItem('Check Project Assets', 'checkProjectAssets')
      .addItem('Check Visual Asset Folders', 'checkVisualAssetFolders')
      .addItem('Create Managed Columns (run once)', 'createManagedColumns')
      .addItem('Sync Dropdowns from CONFIG (run once)', 'syncVocabularyFromConfig')
      .addItem('Unblock Dropdowns (run once)', 'relaxDataValidation')
      .addItem('Review Vocabulary Gaps', 'showVocabularyGaps')
      .addItem('Deployment Identifiers', 'showDeploymentIdentifiers')
      .addItem('Check Entity Registry', 'checkEntityRegistry')
      .addItem('Archive A Finished Plan', 'archiveFinishedPlan')
      .addSeparator()
      .addItem('Background Job Status', 'showJobStatus')
      .addItem('Cancel Background Job', 'cancelActiveJob'))
    .addSeparator()
    .addItem('Stop Current Run', 'stopCurrentRun')
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


// The menu equivalent of the sidebar's Stop button. A menu item opened from the
// same sheet runs as its own execution, so this returns while the run it stops
// is still going — the same way the sidebar call does.
function stopCurrentRun() {
  var ui = SpreadsheetApp.getUi();
  var outcome = RunControl.requestStop();

  ui.alert(
    'Stop Requested',
    'The run will stop after the row it is working on finishes.\n\n' +
    'That row is written first — nothing is abandoned half-done. Work already ' +
    'in the sheet is kept, and checkpoints are saved, so "Resume Last Run" ' +
    'picks up from where it stopped.' +
    (outcome.jobCancelled
      ? '\n\nThe scheduled background continuation has been cancelled too.'
      : ''),
    ui.ButtonSet.OK
  );
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


// Reports what the project asset folders actually contain, per domain.
//
// The whole reference-image path degrades silently by design — a missing or
// empty folder simply falls back to AI generation. That is right at runtime and
// unhelpful when setting it up: without this, the only way to find out whether
// the wiring works is to pay for a run and inspect the output.
function checkProjectAssets() {
  var ui = SpreadsheetApp.getUi();
  var cfg = CONFIG.PROJECT_ASSETS || {};

  if (!cfg.FOLDER_ID || !String(cfg.FOLDER_ID).trim()) {
    ui.alert('Project Assets',
      'CONFIG.PROJECT_ASSETS.FOLDER_ID is empty.\n\n' +
      'Every row will generate without photographic reference.',
      ui.ButtonSet.OK);
    return;
  }

  try {
    var rootName;

    try {
      rootName = DriveApp.getFolderById(cfg.FOLDER_ID).getName();
    } catch (e) {
      ui.alert('Project Assets',
        'Cannot open the folder in FOLDER_ID.\n\n' +
        'Either the ID is wrong, or the account running this script has no ' +
        'access to it.\n\n' + e.toString(),
        ui.ButtonSet.OK);
      return;
    }

    var lines = ['Root folder: ' + rootName, ''];
    var domains = cfg.DOMAINS || [];
    var withImages = 0;
    var totalImages = 0;

    for (var i = 0; i < domains.length; i++) {
      var domain = domains[i];
      var folder = DriveLoader._assetSubfolder(domain.folder);

      if (!folder) {
        lines.push('✗  ' + domain.folder + '  — folder not found');
        continue;
      }

      var names = DriveLoader.listProjectAssets(domain);

      if (!names.length) {
        lines.push('○  ' + domain.folder + '  — folder exists, no images');
        continue;
      }

      withImages++;
      totalImages += names.length;
      lines.push('✓  ' + domain.folder + '  — ' + names.length + ' image(s)');
    }

    lines.push('');

    if (withImages === 0) {
      lines.push('No domain has usable images yet, so every row still');
      lines.push('generates without reference. Add photographs to the folders');
      lines.push('above and re-run this check.');
    } else {
      lines.push(withImages + ' of ' + domains.length + ' domains ready — ' +
        totalImages + ' image(s) total.');
      lines.push('');
      lines.push('Rows matching a ready domain will use PROJECT_ASSET mode.');
      lines.push('Rows matching an empty one fall back to AI generation.');
    }

    lines.push('');
    lines.push('Supported types: ' + (cfg.SUPPORTED_IMAGE_TYPES || []).join(', '));
    lines.push('Up to ' + (cfg.MAX_REFERENCE_IMAGES || 3) + ' images are sent per row.');

    ui.alert('Project Assets', lines.join('\n'), ui.ButtonSet.OK);

  } catch (e) {
    ui.alert('Project Assets', 'Check failed: ' + e.toString(), ui.ButtonSet.OK);
  }
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

    // A column code writes but the sheet does not have is the quietest failure
    // in the system: writeCell logs one line and returns false, and the run
    // reports success. Check the schema before checking the data.
    var managed = CONFIG.MANAGED_COLUMNS || [];
    for (var m = 0; m < managed.length; m++) {
      var spec = managed[m];

      if (!SheetSchema.validateColumnExists(spec.column, spec.sheet)) {
        problems.push(
          'Column "' + spec.column + '" is missing from ' + spec.sheet +
          ' — every write to it is silently skipped. ' +
          'Run Maintenance → Create Managed Columns.'
        );
      }
    }

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


// ================================
// W2 — CAMPAIGN PLANNER
// ================================

// The brief is collected as a conversation, not a form — and the questions it
// leaves open are asked before anything is planned rather than resolved by
// assumption. Assumption is what produced a calendar naming 41 campaigns
// against 16 cards.
function runCampaignPlanner() {
  var ui = SpreadsheetApp.getUi();

  try {
    var cards = PlannerRunner.readCards();
    var names = [];

    for (var key in cards) {
      names.push(cards[key].name);
    }

    if (!names.length) {
      ui.alert('Campaign Planner',
        'Campaign Cards is empty. Build at least one card before planning:\n' +
        'AI Workers → Planning → Build Campaign Card from Knowledge File.',
        ui.ButtonSet.OK);
      return;
    }

    var check = PlannerRunner.checkCampaigns(names, cards);

    // What can be scheduled, stated before anything is asked. An operator
    // planning against campaigns that cannot be used is the failure this
    // worker exists to stop, and it is cheapest to stop here.
    var summary = [
      'Ready to schedule: ' + check.ready.length + ' campaign(s).',
      ''
    ];

    if (check.thin.length) {
      summary.push('Card exists but carries almost no strategy — scheduling');
      summary.push('these produces posts written from nothing:');
      for (var t = 0; t < check.thin.length; t++) {
        summary.push('   ' + check.thin[t]);
      }
      summary.push('');
    }

    if (check.inactive.length) {
      summary.push('Not Active, so excluded: ' + check.inactive.join(', '));
      summary.push('');
    }

    summary.push('Continue?');

    if (ui.alert('Campaign Planner', summary.join('\n'), ui.ButtonSet.OK_CANCEL) !==
        ui.Button.OK) {
      return;
    }

    var brief = _collectPlanningBrief(ui, check);

    if (!brief) {
      return;
    }

    var confirm = ui.alert(
      'Confirm Plan',
      brief.days + ' days × ' + brief.pages.length + ' page(s) × ' +
      brief.postsPerDay + ' post(s) = ' +
      (brief.days * brief.pages.length * brief.postsPerDay) + ' calendar rows.\n\n' +
      'Starting ' + brief.startText + '.\n' +
      'Pages: ' + brief.pages.join(', ') + '\n' +
      'Objective: ' + (brief.objective || 'not stated') + '\n\n' +
      'Rows are appended to Content Calendar. Proceed?',
      ui.ButtonSet.YES_NO
    );

    if (confirm !== ui.Button.YES) {
      return;
    }

    var result = PlannerRunner.plan(brief);
    var lines = [
      result.written + ' calendar rows written, from row ' + result.startRow + '.',
      '',
      'This plan is ' + result.batchId + '.',
      'The critic and the archiver identify it by that, not by row number.',
      ''
    ];

    // A new cycle is the natural moment to ask about the last one — but only
    // about plans that are actually finished. Offering to archive work still in
    // production would take it out from under the workers mid-way through.
    _offerToArchive(ui);

    if (result.check.missing.length) {
      lines.push('Refused — no card: ' + result.check.missing.join(', '));
      lines.push('');
    }

    if (result.rejected.length) {
      lines.push('Dropped — the planner named a campaign that is not eligible: ' +
        result.rejected.join(', '));
      lines.push('');
    }

    if (result.notes) {
      lines.push(result.notes);
      lines.push('');
    }

    lines.push('Next: check the transfer formula has pulled strategy into');
    lines.push('Content Pipeline, then run Planning → Review Plan Before');
    lines.push('Production before spending anything on it.');

    ui.alert('Campaign Planner', lines.join('\n'), ui.ButtonSet.OK);

  } catch (e) {
    ui.alert('Campaign Planner', e.message || e.toString(), ui.ButtonSet.OK);
  }
}


// Asks only what it cannot work out, and states the constraint each answer sits
// inside so the operator is choosing rather than guessing.
function _collectPlanningBrief(ui, check) {
  var config = CONFIG.CAMPAIGN_PLANNER || {};

  var daysResponse = ui.prompt('Campaign Planner — 1 of 5',
    'How many days should this plan cover?\n\nExample: 7',
    ui.ButtonSet.OK_CANCEL);

  if (daysResponse.getSelectedButton() !== ui.Button.OK) return null;

  var days = parseInt(daysResponse.getResponseText(), 10);
  if (!days || days < 1) {
    ui.alert('Campaign Planner', 'That is not a number of days.', ui.ButtonSet.OK);
    return null;
  }

  var pagesResponse = ui.prompt('Campaign Planner — 2 of 5',
    'Which pages? Comma-separated.\n\n' +
    // One source. A second hardcoded page list here would drift from the
    // dropdown the same way four vocabularies drifted from the sheet.
    'Available: ' + (CONFIG.CONTROLLED_VOCABULARY['Publishing Page'] || []).join(', ') +
    '\n\nExample: INSAN, Future, Delta',
    ui.ButtonSet.OK_CANCEL);

  if (pagesResponse.getSelectedButton() !== ui.Button.OK) return null;

  var pages = String(pagesResponse.getResponseText()).split(',')
    .map(function(p) { return p.trim(); })
    .filter(function(p) { return p; });

  if (!pages.length) {
    ui.alert('Campaign Planner', 'No pages given.', ui.ButtonSet.OK);
    return null;
  }

  var perDayResponse = ui.prompt('Campaign Planner — 3 of 5',
    'Posts per page per day?\n\n' +
    'PROJECT_DECISIONS caps this at ' + (config.MAX_POSTS_PER_DAY || 3) +
    ' across all pages and recommends an average of 1.5–2.\n' +
    'Consistency over volume.\n\nExample: 1',
    ui.ButtonSet.OK_CANCEL);

  if (perDayResponse.getSelectedButton() !== ui.Button.OK) return null;

  var postsPerDay = parseInt(perDayResponse.getResponseText(), 10);
  if (!postsPerDay || postsPerDay < 1) {
    ui.alert('Campaign Planner', 'That is not a number of posts.', ui.ButtonSet.OK);
    return null;
  }

  var dailyTotal = postsPerDay * pages.length;

  if (dailyTotal > (config.MAX_POSTS_PER_DAY || 3)) {
    var over = ui.alert('Above the agreed ceiling',
      postsPerDay + ' per page across ' + pages.length + ' pages is ' +
      dailyTotal + ' posts a day.\n\n' +
      'PROJECT_DECISIONS §4 caps the ecosystem at ' +
      (config.MAX_POSTS_PER_DAY || 3) + ' a day, averaging 1.5–2, on the ' +
      'principle of consistency over volume.\n\n' +
      'Plan it anyway?',
      ui.ButtonSet.YES_NO);

    if (over !== ui.Button.YES) return null;
  }

  var objectiveResponse = ui.prompt('Campaign Planner — 4 of 5',
    'What is this cycle for?\n\n' +
    'It decides the funnel mix and the CTA balance.\n' +
    'Example: build trust for Delta, and bookings for the outpatient clinics',
    ui.ButtonSet.OK_CANCEL);

  if (objectiveResponse.getSelectedButton() !== ui.Button.OK) return null;

  // How the cycle should be weighted across campaigns.
  //
  // The planner's prompt has always been sent an `emphasis` line and both
  // callers hardcoded it to '', so it read "none stated" on every run: the
  // channel existed and nothing ever filled it. Without it the model weights a
  // plan from Priority and Target Posts on the cards, which describe the
  // campaign in general — not what this cycle should lean on.
  //
  // Free text on purpose. "40% ICU and Emergency, 40% the six centers, 20% the
  // rest" is a sentence the operator can write and the model can act on;
  // turning it into per-campaign percentage inputs would mean one prompt per
  // eligible campaign, which is unusable at ten and absurd at forty.
  var emphasisResponse = ui.prompt('Campaign Planner — 5 of 5',
    'Any campaign to lean on, or hold back? Optional — leave blank for an ' +
    'even spread.\n\n' +
    'Plain language works:\n' +
    '  "40% ICU and Emergency, 40% the medical centers, 20% everything else"\n' +
    '  "heavy on Kabarona, light on corporate"\n' +
    '  "no more than two posts on any one campaign"\n\n' +
    'The cards\' Priority and Target Posts are already visible to the planner; ' +
    'this overrides them for this cycle only.',
    ui.ButtonSet.OK_CANCEL);

  if (emphasisResponse.getSelectedButton() !== ui.Button.OK) return null;

  var start = new Date();
  start.setDate(start.getDate() + 1);

  return {
    days: days,
    pages: pages,
    postsPerDay: postsPerDay,
    objective: String(objectiveResponse.getResponseText()).trim(),
    emphasis: String(emphasisResponse.getResponseText()).trim(),
    campaigns: check.ready.map(function(c) { return c.name; }),
    startDate: start,
    startText: Utilities.formatDate(start, Session.getScriptTimeZone(), 'yyyy-MM-dd')
  };
}


// Reads the whole plan and reports what no single-row worker can see.
// Costs one call. Run it before production, and again after the content team
// has written copy — the first pass catches the shape of the plan, the second
// catches what the writing actually converged on.
function runPortfolioCritic() {
  var ui = SpreadsheetApp.getUi();

  // Scoped by batch, not by row number. The critic measures repetition across
  // the rows it is given, so handing it two campaigns at once makes it report
  // variety as inconsistency — and the operator was the one holding the row
  // numbers in their head.
  var range = _askForBatchRange();

  if (!range) {
    return;
  }

  try {
    var result = PortfolioCritic.review(range.start, range.end);
    var m = result.measured;
    var review = result.review;
    var lines = [];

    lines.push(review.verdict || '');
    lines.push('');
    lines.push('Measured across ' + m.total + ' rows (' + m.written +
      ' with copy written):');
    lines.push('   openings using a known formula: ' + m.formulaicShare + '%');
    lines.push('   near-identical openings: ' + m.duplicates.length);
    lines.push('   same campaign twice on a page in a day: ' + m.clashes.length);

    var findings = review.findings || [];

    if (findings.length) {
      lines.push('');
      lines.push('─────────────────────────────');

      for (var i = 0; i < findings.length; i++) {
        var f = findings[i];
        lines.push('');
        lines.push('[' + String(f.severity || '').toUpperCase() + '] ' + f.what);
        if (f.where) {
          lines.push('   where: ' + f.where);
        }
        if (f.fix) {
          lines.push('   fix:   ' + f.fix);
        }
      }
    } else {
      lines.push('');
      lines.push('No portfolio-level problems found.');
    }

    if (review.strongest) {
      lines.push('');
      lines.push('─────────────────────────────');
      lines.push('If you change one thing: ' + review.strongest);
    }

    ui.alert('Plan Review', lines.join('\n'), ui.ButtonSet.OK);

  } catch (e) {
    ui.alert('Plan Review', e.message || e.toString(), ui.ButtonSet.OK);
  }
}


// ================================
// W1 — CAMPAIGN CARD BUILDER
// ================================

function _askForKnowledgeFile(title) {
  var ui = SpreadsheetApp.getUi();

  var response = ui.prompt(
    title,
    'Knowledge file name, exactly as it appears in Drive.\n\n' +
    'Examples:\n' +
    '  MEDICAL_SERVICE_EMERGENCY.md\n' +
    '  SUPPORTING_MEET_OUR_DOCTORS.md\n' +
    '  HOSPITAL_DELTA.md\n\n' +
    'Subfolders are searched automatically.',
    ui.ButtonSet.OK_CANCEL
  );

  if (response.getSelectedButton() !== ui.Button.OK) {
    return null;
  }

  // Same rule as the sidebar's, and the same code, so the two cannot come to
  // disagree about what counts as a filename. The filename is the join key.
  return _normaliseKnowledgeName(response.getResponseText());
}


// Reads a knowledge file and reports whether a card can be built from it —
// without spending an inference. Run this while writing a file.
function checkKnowledgeFile() {
  var ui = SpreadsheetApp.getUi();
  var fileName = _askForKnowledgeFile('Check Knowledge File');

  if (!fileName) {
    return;
  }

  try {
    var file = CardBuilder.findKnowledgeFile(fileName);
    var check = CardBuilder.validate(file.content, fileName);
    var lines = [fileName + '  (' + file.folder + ')', ''];

    var campaignName = CardBuilder.campaignNameFor(check.frontMatter);

    if (check.ok) {
      lines.push('Ready. A card can be built from this file.');
      lines.push('');
      lines.push('entity:   ' + check.frontMatter.entity_name_en);
      lines.push('campaign: ' + campaignName);
      lines.push('level:    ' + check.frontMatter.service_level);
    } else {
      lines.push('Not ready — ' +
        (check.problems.length + check.gaps.length) + ' item(s) outstanding:');
      lines.push('');

      for (var i = 0; i < check.problems.length; i++) {
        lines.push('• ' + check.problems[i]);
      }

      for (var g = 0; g < check.gaps.length; g++) {
        lines.push('• line ' + check.gaps[g].line + ' — "' +
          check.gaps[g].section + '" needs you' +
          (check.gaps[g].note ? ': ' + check.gaps[g].note : ''));
      }
    }

    // Whether a card under this name would be joined to anything. A file can
    // pass every structural check and still produce a card no scheduled row
    // looks up, and that failure is invisible in the card itself. Reported here
    // because this check costs no inference — the point of it is to be run
    // before the build, not after.
    var usage = CardBuilder.calendarUsage(campaignName);

    if (usage) {
      lines.push('');
      if (usage.slots) {
        lines.push('Calendar: serves ' + usage.slots + ' scheduled slot(s) as "' +
          campaignName + '".');
      } else {
        lines.push('Calendar: NO row is named "' + campaignName + '" — a card ' +
          'built now would be joined to nothing.');
        if (usage.near.length) {
          lines.push('Close names in the calendar: ' + usage.near.join(', '));
          lines.push('Set campaign_name in the front matter to the one you mean.');
        }
      }
    }

    ui.alert('Knowledge File', lines.join('\n'), ui.ButtonSet.OK);

  } catch (e) {
    ui.alert('Knowledge File', e.message || e.toString(), ui.ButtonSet.OK);
  }
}


function runCardBuilder() {
  var ui = SpreadsheetApp.getUi();
  var fileName = _askForKnowledgeFile('Build Campaign Card');

  if (!fileName) {
    return;
  }

  try {
    var result = CardBuilder.build(fileName);
    var lines = [
      'Card ' + (result.existed ? 'rebuilt' : 'created') +
        ' on row ' + result.row + '.',
      '',
      result.written.length + ' fields written from ' + result.fileName + '.'
    ];

    if (result.preserved.length) {
      lines.push('');
      lines.push('Kept your planning decisions, unchanged:');
      for (var p = 0; p < result.preserved.length; p++) {
        lines.push('   ' + result.preserved[p]);
      }
    }

    if (result.insufficient.length) {
      lines.push('');
      lines.push('Left blank — the knowledge file does not support them:');
      for (var i = 0; i < result.insufficient.length; i++) {
        lines.push('   ' + result.insufficient[i]);
      }
      lines.push('');
      lines.push('Add the material to the knowledge file and rebuild. Filling');
      lines.push('these in the card by hand loses the fix on the next rebuild.');
    }

    ui.alert('Campaign Card', lines.join('\n'), ui.ButtonSet.OK);

  } catch (e) {
    ui.alert('Campaign Card', e.message || e.toString(), ui.ButtonSet.OK);
  }
}


// Creates the columns code writes but cannot invent. Run this before syncing
// dropdowns, so a newly created column gets its validation in the same session.
function createManagedColumns() {
  var ui = SpreadsheetApp.getUi();

  try {
    var results = SheetWriter.ensureManagedColumns();
    var lines = ['Columns code writes:', ''];

    for (var i = 0; i < results.length; i++) {
      lines.push('• ' + results[i].sheet + ' — ' + results[i].column +
        ': ' + results[i].status);
    }

    lines.push('');
    lines.push('New columns are appended at the end of the sheet, never');
    lines.push('inserted — every column here is resolved by its header text at');
    lines.push('read time (SheetSchema._getColumnMap), not by position, so a');
    lines.push('column may be reordered freely without breaking a write.');

    ui.alert('Managed Columns', lines.join('\n'), ui.ButtonSet.OK);

  } catch (e) {
    ui.alert('Managed Columns', 'Failed: ' + e.toString(), ui.ButtonSet.OK);
  }
}


// Rewrites every dropdown in the three sheets from CONFIG.CONTROLLED_VOCABULARY,
// making CONFIG.gs the single vocabulary source. Four fields disagreed between
// code and sheet and cost 19 rejected writes; this is the root-cause fix.
function syncVocabularyFromConfig() {
  var ui = SpreadsheetApp.getUi();

  var confirm = ui.alert(
    'Sync Dropdowns from CONFIG?',
    'Every dropdown listed in CONFIG.CONTROLLED_VOCABULARY will be rewritten ' +
    'on Content Pipeline, Visual Pipeline and Campaign Cards.\n\n' +
    'Values you added to a dropdown by hand and did not add to CONFIG.gs will ' +
    'be dropped from the list. Existing cell contents are never changed — a ' +
    'value outside the new list stays in place and is flagged for review.\n\n' +
    'Proceed?',
    ui.ButtonSet.YES_NO
  );

  if (confirm !== ui.Button.YES) {
    return;
  }

  try {
    var results = SheetWriter.syncAllValidationFromConfig();
    var lines = [];

    for (var i = 0; i < results.length; i++) {
      var r = results[i];

      if (r.error) {
        lines.push('• ' + r.sheet + ' — ' + r.error);
        continue;
      }

      lines.push('• ' + r.sheet + ' — ' + r.applied.length + ' dropdowns written');

      if (r.absent.length) {
        lines.push('   not on this sheet: ' + r.absent.join(', '));
      }
    }

    lines.push('');
    lines.push('Reel, Video and Motion Graphic are gone from Content Format —');
    lines.push('the pipeline has no generation path for them, and choosing one');
    lines.push('spent strategy, copy and creative direction before failing.');

    ui.alert('Vocabulary Sync', lines.join('\n'), ui.ButtonSet.OK);

  } catch (e) {
    ui.alert('Vocabulary Sync', 'Failed: ' + e.toString(), ui.ButtonSet.OK);
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

  // Every provider some worker is configured to use — not just Gemini.
  //
  // This read GEMINI_API_KEY alone and labelled the line "Gemini API", which was
  // true and useless: the Creative Director runs on Claude and does NOT fall
  // back, so it fails on every row without ANTHROPIC_API_KEY. An operator
  // checking this screen before their first run saw one configured key and
  // concluded the system was ready.
  //
  // The sidebar's getSystemStatus was fixed on 2026-08-02 and this was missed —
  // two functions answering the same question, one of them still wrong. Same
  // rule as there: a provider no worker uses is shown but never fails the check.
  var needed = {};

  for (var workerName in CONFIG.WORKERS) {
    if (!CONFIG.WORKERS.hasOwnProperty(workerName)) continue;
    needed[CONFIG.WORKERS[workerName].provider || 'gemini'] = true;
  }

  var providers = AIProvider.getAvailableProviders();
  var missing = [];

  for (var p = 0; p < providers.length; p++) {
    var provider = providers[p];
    var configured = AIProvider.isConfigured(provider);
    var required = !!needed[provider];
    var label = provider.charAt(0).toUpperCase() + provider.slice(1);

    lines.push(label + ' API: ' +
      (configured
        ? (required ? '✅ Configured' : '✅ Configured (no worker uses it)')
        : (required ? '❌ KEY MISSING — its workers fail on every row'
                    : '— not set (unused)')));

    if (required && !configured) missing.push(label);
  }

  if (missing.length) {
    lines.push('');
    lines.push('⚠️  Set ' + missing.join(' and ') + ' in Script Properties before running.');
  }

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

// Asked after the run is confirmed, before any work starts.
//
// The cache holds the prompt and doc files read from Drive, for six hours. It
// only goes stale when one of those files is edited — which is something the
// operator did and a timer cannot know about. So the question is asked at the
// one moment the answer is knowable, and answering it clears the cache once for
// the whole run rather than repeatedly during it.
//
// Returns false only if the refresh itself failed, so the caller can abandon a
// run that would otherwise use exactly the prompts the operator asked to
// replace — and produce plausible output from them.
function offerCacheRefresh() {
  var answer = Browser.msgBox(
    'Refresh Prompt Cache?',
    'Prompts and docs are cached for six hours.\n\n' +
    'Choose Yes if you have edited any prompt or doc on Drive since the last ' +
    'run — otherwise the workers read the previous version.\n\n' +
    'It costs a few seconds at the start of the run.',
    Browser.Buttons.YES_NO
  );

  if (answer !== 'yes') {
    return true;
  }

  try {
    refreshCache();
    return true;
  } catch (e) {
    Browser.msgBox(
      'Cache Refresh Failed',
      'The cache could not be cleared:\n' + e.toString() +
      '\n\nThe run was not started — it would have used the old prompts.',
      Browser.Buttons.OK
    );
    return false;
  }
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

  if (!offerCacheRefresh()) return;

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

  if (!offerCacheRefresh()) return;

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
      line += result.stopped
        ? ' [stopped - resume from row ' + result.nextRow + ']'
        : ' [timeout - resume from row ' + result.nextRow + ']';
    }
    summary.push(line);

    // A stop must stay stopped. Falling through to the timeout branch would
    // schedule an automatic continuation, and the run the operator just halted
    // would restart by itself about a minute later.
    if (result.stopped) {
      _clearJob();
      summary.push('\nStopped at your request. Nothing is scheduled to continue.');
      summary.push('Work already written to the sheet is kept, and checkpoints');
      summary.push('are saved — "Resume Last Run" picks up from row ' + result.nextRow + '.');
      if (workerNames.slice(i + 1).length > 0) {
        summary.push('\nNot started: ' + workerNames.slice(i + 1).map(toDisplayName).join(', '));
      }
      break;
    }

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

  if (!offerCacheRefresh()) return;

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

// ================================
// W9 / W10 — PUBLISHING AND PAID ADS
// ================================

function runPublishingWorker() {
  var ui = SpreadsheetApp.getUi();
  var dryRun = !!(CONFIG.PUBLISHING || {}).DRY_RUN;

  var range = askForRowRange(CONFIG.VISUAL_PIPELINE.SHEET_NAME);
  if (!range) return;

  // Publishing is the only irreversible action in this system, so the
  // confirmation says what will actually happen rather than "Proceed?". In dry
  // run it says that too — an operator who thinks they are testing and is not
  // is the failure this text exists to prevent.
  var confirm = Browser.msgBox(
    dryRun ? 'Publish — DRY RUN' : 'Publish — LIVE',
    'Rows: ' + range.start + ' to ' + range.end + '\n\n' +
    (dryRun
      ? 'DRY RUN is on. Every row will be resolved in full — page, token,\n' +
        'copy and assets — and nothing will be posted.\n\n' +
        'Turn it off in CONFIG.PUBLISHING.DRY_RUN when you are ready.'
      : 'LIVE. Approved rows in this range will be POSTED to real Facebook\n' +
        'pages. This cannot be undone from the sheet.') +
    '\n\nProceed?',
    Browser.Buttons.YES_NO
  );

  if (confirm !== 'yes') return;

  var result = PublishingRunner.run(range.start, range.end);

  ui.alert(
    'Publishing',
    (result.dryRun ? 'DRY RUN — nothing was posted.\n\n' : '') +
    'Published: ' + result.published + '\n' +
    'Skipped:   ' + result.skipped + '\n' +
    'Failed:    ' + result.failed +
    (result.interrupted
      ? '\n\nStopped early — resume from row ' + result.nextRow
      : '') +
    '\n\nThe Execution Log carries the reason for every skip.',
    ui.ButtonSet.OK
  );
}


function runPaidAdsWorker() {
  var ui = SpreadsheetApp.getUi();

  var range = askForRowRange(CONFIG.VISUAL_PIPELINE.SHEET_NAME);
  if (!range) return;

  var confirm = Browser.msgBox(
    'Draft Paid Ads',
    'Rows: ' + range.start + ' to ' + range.end + '\n\n' +
    'Drafts one Ads Pipeline row per published post that does not have one.\n' +
    'No money is spent, nothing is launched, and budget is left blank for\n' +
    'you to set.' +
    '\n\nProceed?',
    Browser.Buttons.YES_NO
  );

  if (confirm !== 'yes') return;

  if (!offerCacheRefresh()) return;

  try {
    var result = AdsRunner.run(range.start, range.end);

    ui.alert(
      'Paid Ads',
      'Drafted: ' + result.drafted + '\n' +
      'Skipped: ' + result.skipped + '  (not published, or already drafted)\n' +
      'Failed:  ' + result.failed +
      (result.interrupted
        ? '\n\nStopped early — resume from row ' + result.nextRow
        : '') +
      '\n\nEvery row needs a budget and a human before it goes anywhere.',
      ui.ButtonSet.OK
    );

  } catch (e) {
    ui.alert('Paid Ads', e.message || e.toString(), ui.ButtonSet.OK);
  }
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

  if (!offerCacheRefresh()) return;

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

  if (!offerCacheRefresh()) return;

  ExecutionBudget.begin();

  var pipelineStart = new Date().getTime();
  var summary = [];
  // Only an exhausted time budget halts the pipeline. Row-level failures are
  // reported and stepped over: a Video row that cannot be generated must not
  // prevent QA from ever seeing the four rows that generated fine.
  var pipelineFailed = false;
  var pipelineStopped = false;

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
      line += result.stopped
        ? ' [stopped - resume from row ' + result.nextRow + ']'
        : ' [timeout - resume from row ' + result.nextRow + ']';
    }
    summary.push(line);

    if (result.interrupted) {
      pipelineFailed = true;
      pipelineStopped = !!result.stopped;
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
      genLine += genResult.stopped
        ? ' [stopped - resume from row ' + genResult.nextRow + ']'
        : ' [timeout - resume from row ' + genResult.nextRow + ']';
    }
    summary.push(genLine);

    if (genResult.stopped) {
      pipelineFailed = true;
      pipelineStopped = true;
      summary.push('Generation stopped at your request');
    } else if (genResult.interrupted) {
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
        line += result.stopped
          ? ' [stopped - resume from row ' + result.nextRow + ']'
          : ' [timeout - resume from row ' + result.nextRow + ']';
        pipelineStopped = pipelineStopped || !!result.stopped;
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
  if (pipelineStopped) {
    _clearJob();
    summary.push('\nStopped at your request. Nothing is scheduled to continue.');
    summary.push('Checkpoints are kept — "Resume Last Run" picks up where it stopped.');
  } else if (pipelineFailed) {
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
    pipelineStopped ? 'Visual Pipeline Stopped'
      : (pipelineFailed ? 'Visual Pipeline Paused' : 'Visual Pipeline Complete'),
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

  if (!offerCacheRefresh()) return;

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


// An independent second opinion on the Creative Director's own grade.
//
// One inference that both writes the package and scores it has an obvious
// conflict, and the production evidence bore it out: five different campaigns,
// five identical A grades. This pass only re-scores — it never rewrites — so it
// costs a fraction of a generation instead of doubling it.
//
// Opt-in via CONFIG.CREATIVE_CRITIC.ENABLED. Any failure leaves the original
// score untouched: a second opinion is an improvement, never a dependency.
function _applyCreativeCritic(values, rowNumber) {
  var cfg = CONFIG.CREATIVE_CRITIC || {};

  if (!cfg.ENABLED) {
    return;
  }

  try {
    var prompt = [
      'You are reviewing a finished creative package for an Egyptian healthcare',
      'brand. You did not write it. Your only task is to grade it honestly.',
      '',
      'Start at A+ and deduct one full grade for each of the following that is',
      'true. Be literal — check, do not assume.',
      '',
      '- The post copy opens with a claim, question or quote rather than a scene',
      '- Any Modern Standard Arabic marker survives: الذي التي هذا هذه ليس سوف يتم حيث لماذا الآن',
      '- The emoji count does not match the Emoji Style field',
      '- The copy names its own audience (e.g. "المستثمر الذكي")',
      '- The copy asserts quality instead of showing it',
      '- The brand appears in the first half, or three or more times',
      '- Visual Concept describes a place or specialty rather than a human moment',
      '- Any visual field contains Arabic text',
      '- Text On Design contains a slide or card label',
      '',
      'Two or more deductions cannot score above B+. Four or more is Needs Rewrite.',
      '',
      'Return ONLY this JSON, nothing else:',
      '{"score":"A+|A|B+|B|C|Needs Rewrite","deductions":["..."],"reason":"one sentence"}',
      '',
      '--- EMOJI STYLE ---',
      String(values['Emoji Style'] || '(not set)'),
      '',
      '--- POST COPY ---',
      String(values['Creative Director Post Copy'] || ''),
      '',
      '--- VISUAL CONCEPT ---',
      String(values['Visual Concept'] || ''),
      '',
      '--- VISUAL ELEMENTS ---',
      String(values['Visual Elements'] || ''),
      '',
      '--- TEXT ON DESIGN ---',
      String(values['Text On Design'] || '')
    ].join('\n');

    var response = AIProvider.call(prompt, {
      provider: cfg.provider || undefined,
      model: cfg.model || undefined,
      temperature: cfg.temperature,
      maxOutputTokens: 1024
    });

    var match = String(response.text || '').match(/\{[\s\S]*\}/);

    if (!match) {
      Logger.log('CRITIC | row ' + rowNumber + ' | no JSON returned, keeping original score');
      return;
    }

    var verdict = JSON.parse(match[0]);
    var allowed = CONFIG.CONTROLLED_VOCABULARY['Creative Director Quality Score'] || [];

    if (!verdict.score || allowed.indexOf(verdict.score) === -1) {
      Logger.log('CRITIC | row ' + rowNumber + ' | unusable score "' + verdict.score + '"');
      return;
    }

    var original = values['Creative Director Quality Score'];

    if (verdict.score === original) {
      Logger.log('CRITIC | row ' + rowNumber + ' | independent pass agrees: ' + original);
      return;
    }

    values['Creative Director Quality Score'] = verdict.score;

    var deductions = (verdict.deductions || []).join('; ');
    values['Creative Director Notes'] =
      String(values['Creative Director Notes'] || '').trim() +
      '\n\n[Independent review: ' + original + ' → ' + verdict.score +
      (deductions ? '. ' + deductions : '') + ']';

    Logger.logPartial('CREATIVE_DIRECTOR_WORKER', rowNumber, 0,
      'Critic adjusted score ' + original + ' → ' + verdict.score +
      (verdict.reason ? ' (' + verdict.reason + ')' : ''));

  } catch (e) {
    // Never let a second opinion cost the row its output.
    Logger.log('CRITIC | row ' + rowNumber + ' | skipped: ' + e.toString());
  }
}


// Checking required inputs in code costs nothing and gives an exact answer;
// asking a language model to notice an empty cell costs a full inference and
// gives a probable one. The per-worker lists live in CONFIG.REQUIRED_INPUTS.
//
// "None" and "N/A" count as empty. They appear in the sheet where a field was
// answered rather than filled, and a worker reading them as content produces
// strategy about the absence of strategy.
function _missingRequiredInputs(workerName, rowData) {
  var required = (CONFIG.REQUIRED_INPUTS || {})[workerName] || [];
  var missing = [];

  for (var i = 0; i < required.length; i++) {
    var field = required[i];
    var value = String(rowData[field] || '').trim();
    var lowered = value.toLowerCase();

    if (!value || lowered === 'none' || lowered === 'n/a' || lowered === '[empty]') {
      missing.push(field);
    }
  }

  return missing;
}


// A refusal is only useful if it says where the gap came from. Each worker sits
// downstream of a different producer, so "empty input" means a different repair
// in each case.
function _refusalRemedy(workerName) {
  switch (workerName) {
    case 'CONTENT_STRATEGY_WORKER':
      return 'These arrive from Campaign Cards via Transfer Rows Forward — the ' +
             'campaign has no card, or the card has no strategy. Build the card ' +
             'first, then run Transfer Rows Forward again.';
    case 'CONTENT_CREATION_WORKER':
      return 'Run the Strategy Worker on this row first.';
    case 'CREATIVE_DIRECTOR_WORKER':
      return 'Run the Content Creator on this row first.';
    case 'VISUAL_PLANNER_WORKER':
      return 'Return the row to the Creative Director.';
    default:
      return 'Fill them before re-running.';
  }
}


// Appends the footer to the final post copy as one publish-ready block: the
// page's standing hashtags merged with this post's own, then the hotline, then
// the WhatsApp link.
//
// Any hashtag block the model already added is removed first, so running this
// twice — or on a row where the writer improvised — cannot duplicate them.
function _composeFinalPostCopy(values, page) {
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

  // The page decides the standing hashtags and the contact lines. Merged here
  // rather than asked of the writer: a model reproducing six fixed tags gets it
  // right nineteen times and drops one on the twentieth, and nobody reads
  // twenty published posts looking for a missing brand tag.
  var footer = PostFooter.build(
    page,
    values['Primary Hashtags'],
    values['Secondary Hashtags']
  );

  values['Creative Director Post Copy'] = footer
    ? body + '\n\n' + footer
    : body;
}


function runWorker(workerName, rowNumber) {
  ConfigResolver.apply();

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
      SheetWriter.writePipelineState(rowNumber, 'PROCESSING', sheetName);
    }

    var rowData = SheetSchema.getRowData(rowNumber, sheetName);

    // Required inputs are checked before anything is written or loaded. A
    // deterministic check on empty cells costs milliseconds and names the exact
    // fields; a model asked to notice them costs a full inference and returns a
    // probable answer. Checked here rather than after the context is assembled
    // so a refused row neither reads Drive nor bumps its revision counter.
    //
    // This is what makes input starvation visible. Two thirds of rows reached
    // the Content Strategy Worker with every strategy field blank and it wrote
    // a strategy for all of them — the workers were not failing, they were
    // inventing, because nothing had been said. (Audit A, findings F1 and F2.)
    var missing = _missingRequiredInputs(upperName, rowData);

    if (missing.length) {
      throw new Error(
        toDisplayName(upperName) + ' refused row ' + rowNumber + ': ' +
        missing.length + ' required input' + (missing.length === 1 ? '' : 's') +
        ' empty — ' + missing.join(', ') + '. ' +
        _refusalRemedy(upperName)
      );
    }

    // The Visual Planner's three outputs are computable. When the deterministic
    // path is enabled the model is not called at all — 6,584 input tokens a row
    // spent deciding things the code already knows. The completeness gate above
    // still runs, because an incomplete creative package must still be refused.
    if (upperName === 'VISUAL_PLANNER_WORKER' &&
        typeof VisualPlan !== 'undefined' && VisualPlan.isEnabled()) {

      var computed = VisualPlan.plan(rowData);
      var computedWritten = [];

      for (var field in computed) {
        if (SheetWriter.writeCell(rowNumber, field, computed[field], sheetName)) {
          computedWritten.push(field);
        }
      }

      SheetWriter.writeAIWorkerTag(rowNumber, 'VISUAL_PLAN (deterministic)', sheetName);
      _applyVisualPlannerStageMapping(rowNumber, computed, sheetName);

      var computedRuntime = new Date().getTime() - startTime;

      Logger.logSuccess(
        upperName, rowNumber, computedRuntime, 0, 0,
        'Computed without a model call | Written: ' + computedWritten.join(', ') +
        ' | Asset Count: ' + computed['Asset Count'] +
        ' | Mode: ' + computed['Production Mode'] +
        ' | Saved ~6,584 input tokens'
      );

      return {
        success: true,
        row: rowNumber,
        worker: upperName,
        values: computed,
        written: computedWritten,
        warnings: [],
        runtime: computedRuntime,
        deterministic: true,
        tokens: { input: 0, output: 0, total: 0 }
      };
    }

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

    var context = ContextBuilder.buildContext(upperName, rowData, rowNumber);

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

    // Where the reusable part of this prompt ends. Passed to the provider so
    // Anthropic can be given a cache breakpoint; Gemini ignores it and relies on
    // implicit prefix caching, which needs no marker.
    var cachePrefix = ContextBuilder.staticPrefixFor(upperName);
    callOptions.cachePrefix = cachePrefix;

    // Logged every call so a prompt edited in Drive is visible as a changed
    // fingerprint. Prompts are cached for six hours: without this, an edit that
    // has not reached the workers looks exactly like an edit that has.
    var prefixHash = ContextBuilder.staticPrefixHash(cachePrefix);

    // Per-worker provider and model, when the worker declares them. Absent
    // both, the global defaults apply and nothing changes.
    if (workerConfig.provider) {
      callOptions.provider = workerConfig.provider;
    }
    if (workerConfig.model) {
      callOptions.model = workerConfig.model;
    }

    // Visual QA evaluates artwork, so it must receive the artwork. Without this
    // it only ever saw the Drive URL as text and graded the brief, not the image.
    if (upperName === 'VISUAL_QA_WORKER') {
      // Load as many assets as the row declares. loadImagesFromCell defaults to
      // four, and the integrity gate below compares what was loaded against
      // Asset Count — so a five- to ten-card carousel (CONFIG allows ten) had
      // its sixth card onwards silently dropped and then failed as an
      // "incomplete set". That failure throws by design and tells the operator
      // to re-run Media Generation, which regenerates the same complete set and
      // fails the same way: a dead end reachable by any carousel over four.
      var declaredAssets = parseInt(rowData['Asset Count'], 10);
      var qaImages = DriveLoader.loadImagesFromCell(
        rowData['Generated Assets'],
        (!isNaN(declaredAssets) && declaredAssets > 0) ? declaredAssets : null
      );

      if (!qaImages.length) {
        throw new Error(
          'Visual QA cannot run: no readable image found in "Generated Assets" ' +
          'for row ' + rowNumber + '. QA must never grade an asset it cannot see.'
        );
      }

      // Arithmetic before judgement. These are properties that are true or
      // false by measurement — shape, resolution, count, duplication — and a
      // grader asked about composition reports on composition. A set that is
      // structurally wrong fails here in milliseconds at no token cost, rather
      // than being described accurately and approved.
      //
      // This throws rather than requesting a revision on purpose. Every defect
      // it catches is systemic — a template at the wrong page size, a format
      // mapped to the wrong spec, a short generation — and regenerating would
      // produce the same wrong output at the same price. It needs an operator,
      // not another attempt.
      if ((CONFIG.ASSET_INTEGRITY || {}).ENABLED) {
        var integrity = AssetIntegrity.check(qaImages, rowData);

        for (var n = 0; n < integrity.notes.length; n++) {
          Logger.log('ASSET_INTEGRITY | Row ' + rowNumber + ' | ' + integrity.notes[n]);
        }

        if (!integrity.passed) {
          throw new Error(
            'Assets failed integrity checks before QA (row ' + rowNumber + '): ' +
            integrity.failures.join(' ') +
            ' Fix the cause and re-run Media Generation for this row.'
          );
        }
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

    // Everything produced after this stage was derived from inputs this run has
    // just replaced. Clear it before writing, so the row never shows fresh work
    // beside a stale verdict about work that no longer exists.
    SheetWriter.clearDownstreamOutput(rowNumber, upperName);

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
      _composeFinalPostCopy(parsed.values, rowData['Publishing Page']);
      _applyCreativeCritic(parsed.values, rowNumber);

      // The last point where the published wording exists and nothing has been
      // spent on it yet. Reports; never blocks. The scan finds shapes, and a
      // shape is evidence rather than proof — a row stopped by a regex that
      // misread a sentence costs a rewrite for nothing, while a row flagged in
      // the log costs a glance.
      AdPolicy.report(upperName, rowNumber, parsed.values);
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
      SheetWriter.writePipelineState(rowNumber, 'COMPLETED', sheetName);
    }

    var endTime = new Date().getTime();
    var runtime = endTime - startTime;

    var details = 'Written: ' + writeResult.written.join(', ');

    if (parsed.warnings.length > 0) {
      details += ' | Warnings: ' + parsed.warnings.join('; ');
    }

    details += ' | AI: ' + aiResponse.finishReason;

    // Cache performance, per call. Roughly 9.7M of 10.8M input tokens per plan
    // are byte-identical across rows, so this number is the measure of whether
    // the caching work is doing anything. Zero on every row means it is not.
    details += ' | ' + AIProvider.cacheSummary(aiResponse);

    details += ' | Prompt: ' + prefixHash;

    if (aiResponse.failedOver) {
      details += ' | FAILOVER: ' + aiResponse.failedOver;
    }

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
        SheetWriter.writePipelineState(rowNumber, 'FAILED', sheetName);
      } catch (writeErr) {
        Logger.log('Failed to write FAILED state: ' + writeErr.toString());
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
  var runStart = RunControl.runStart(batchStart);
  var results = [];
  var successCount = 0;
  var failCount = 0;
  var interrupted = false;
  var stopped = false;
  var lastProcessedRow = null;

  // The first row not yet done, and so the row a resume has to start from.
  var nextRow = startRow;

  for (var row = startRow; row <= endRow; row++) {
    // Checked before the budget, and without the `row > startRow` guard the
    // budget needs: a batch must always attempt one row to make progress, but
    // an operator asking it to stop wants it stopped, not one row later.
    if (RunControl.stopRequested(runStart)) {
      interrupted = true;
      stopped = true;
      saveCheckpoint(upperName, row);
      RunControl.clear();
      Logger.log('OPERATOR_STOP | ' + upperName + ' | stopped before row ' + row);
      break;
    }

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
    lastProcessedRow = row;
    nextRow = row + 1;

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

  var status = interrupted
    ? (stopped ? 'STOPPED' : 'TIMEOUT')
    : (failCount === 0 ? 'SUCCESS' : 'PARTIAL');

  Logger.logExecution({
    worker: upperName,
    row: startRow + '-' + (interrupted
      ? (lastProcessedRow === null ? startRow : lastProcessedRow)
      : endRow),
    status: status,
    runtime: new Date().getTime() - batchStart,
    // The row to resume from is the first one *not* done — the same value
    // returned as nextRow below. Logging the last completed row instead told
    // an operator resuming by hand to re-run a row that had already been paid
    // for, and to overwrite good output with a second generation of it.
    details: 'Batch: ' + successCount + ' success, ' + failCount + ' failed' +
      (interrupted
        ? (stopped
            ? ' (stopped by operator - resume from row ' + nextRow + ')'
            : ' (timeout - resume from row ' + nextRow + ')')
        : '')
  });

  return {
    totalRows: results.length,
    success: successCount,
    failed: failCount,
    interrupted: interrupted,
    stopped: stopped,
    nextRow: interrupted ? nextRow : null,
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
  var stoppedByOperator = false;

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
          interrupted: !!gen.interrupted,
          stopped: !!gen.stopped
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

      if (result.stopped) {
        stoppedByOperator = true;
        break;
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

  // Scheduling the next pass here is what makes a long job finish unattended.
  // It is also the one thing that would undo a stop: the operator halts the
  // pass, and a minute later it starts again. Checked before anything else.
  if (stoppedByOperator) {
    Logger.logPartial('ORCHESTRATOR', job.start + '-' + job.end, 0,
      'Stopped at operator request on pass ' + job.passes +
      '. Automatic continuation is off; checkpoints are kept.');
    _clearJob();
    return;
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
  var runStart = RunControl.runStart(batchStart);
  var results = [];
  var successCount = 0;
  var failCount = 0;
  var interrupted = false;
  var stopped = false;
  var lastProcessedRow = null;

  // The first row not yet done, and so the row a resume has to start from.
  var nextRow = startRow;

  for (var row = startRow; row <= endRow; row++) {
    // Checked before the budget, and without the `row > startRow` guard the
    // budget needs: a batch must always attempt one row to make progress, but
    // an operator asking it to stop wants it stopped, not one row later.
    if (RunControl.stopRequested(runStart)) {
      interrupted = true;
      stopped = true;
      saveCheckpoint(upperName, row);
      RunControl.clear();
      Logger.log('OPERATOR_STOP | ' + upperName + ' | stopped before row ' + row);
      break;
    }

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
    lastProcessedRow = row;
    nextRow = row + 1;

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

  var status = interrupted
    ? (stopped ? 'STOPPED' : 'TIMEOUT')
    : (failCount === 0 ? 'SUCCESS' : 'PARTIAL');

  Logger.logExecution({
    worker: upperName,
    row: startRow + '-' + (interrupted
      ? (lastProcessedRow === null ? startRow : lastProcessedRow)
      : endRow),
    status: status,
    runtime: new Date().getTime() - batchStart,
    // The row to resume from is the first one *not* done — the same value
    // returned as nextRow below. Logging the last completed row instead told
    // an operator resuming by hand to re-run a row that had already been paid
    // for, and to overwrite good output with a second generation of it.
    details: 'Batch: ' + successCount + ' success, ' + failCount + ' failed' +
      (interrupted
        ? (stopped
            ? ' (stopped by operator - resume from row ' + nextRow + ')'
            : ' (timeout - resume from row ' + nextRow + ')')
        : '')
  });

  return {
    totalRows: results.length,
    success: successCount,
    failed: failCount,
    interrupted: interrupted,
    stopped: stopped,
    nextRow: interrupted ? nextRow : null,
    results: results
  };
}


// ================================
// ROW RANGE WITH SHEET SUPPORT
// ================================

// Offered after a new plan lands. Silent when there is nothing finished to
// archive — a prompt that appears every cycle and usually has no answer trains
// the operator to dismiss it without reading, which is how the one time it
// matters gets dismissed too.
//
// Never throws. A plan that was written successfully must not report failure
// because the archive check could not run.
function _offerToArchive(ui) {
  try {
    var candidates = Archive.candidates();

    if (!candidates.length) {
      return;
    }

    var lines = [
      candidates.length + ' earlier plan' + (candidates.length === 1 ? ' is' : 's are') +
        ' finished — every row live on a page:',
      ''
    ];

    for (var i = 0; i < Math.min(candidates.length, 5); i++) {
      lines.push('   ' + Batches.describe(candidates[i].batch));
    }

    lines.push('');
    lines.push('Move them out of the working sheets? They are copied into hidden');
    lines.push('archive sheets first and nothing is deleted until the copy is');
    lines.push('counted.');
    lines.push('');
    lines.push('You can also do this later: Maintenance → Archive A Finished Plan.');

    var answer = ui.alert('Archive Finished Plans', lines.join('\n'),
      ui.ButtonSet.YES_NO);

    if (answer !== ui.Button.YES) {
      return;
    }

    // One at a time, each with its own typed confirmation. Archiving several
    // plans on a single yes is the kind of convenience that removes a hundred
    // rows the operator had not pictured.
    archiveFinishedPlan();

  } catch (e) {
    Logger.log('ARCHIVE | could not offer archiving: ' + e.toString());
  }
}


// Picks a planning batch and resolves it to Content Pipeline rows.
//
// The operator has been reading row numbers off the sheet to answer this, which
// is both tedious and the kind of thing that goes wrong quietly — a range one
// batch too wide makes the critic compare two different campaigns and report
// the difference between them as a fault.
//
// Falls back to the row prompt, because a batch is not always the question:
// sometimes you want the last twenty rows regardless of which plan they are in.
function _askForBatchRange() {
  var ui = SpreadsheetApp.getUi();
  var batches;

  try {
    batches = Batches.all();
  } catch (e) {
    Logger.log('BATCHES | could not read the calendar: ' + e.toString());
    return askForRowRange();
  }

  if (!batches.length) {
    return askForRowRange();
  }

  var lines = ['Which plan should the critic read?', ''];
  var shown = Math.min(batches.length, 9);

  for (var i = 0; i < shown; i++) {
    lines.push((i + 1) + ')  ' + Batches.describe(batches[i]));
  }

  lines.push('');
  lines.push('0)  enter row numbers instead');
  lines.push('');
  lines.push('The critic measures repetition across the rows it is given, so a');
  lines.push('range covering two plans reports their difference as a fault.');

  var choice = ui.prompt('Review Plan Before Production', lines.join('\n'),
    ui.ButtonSet.OK_CANCEL);

  if (choice.getSelectedButton() !== ui.Button.OK) {
    return null;
  }

  var picked = parseInt(choice.getResponseText(), 10);

  if (picked === 0) {
    return askForRowRange();
  }

  if (isNaN(picked) || picked < 1 || picked > shown) {
    ui.alert('Review Plan Before Production', 'No plan with that number.',
      ui.ButtonSet.OK);
    return null;
  }

  var batch = batches[picked - 1];
  var resolved;

  try {
    resolved = Batches.rowsIn(batch, CONFIG.SHEET_NAME);
  } catch (e) {
    ui.alert('Review Plan Before Production',
      'Could not resolve this plan onto the Content Pipeline: ' +
      (e.message || e.toString()), ui.ButtonSet.OK);
    return null;
  }

  if (!resolved.rows.length) {
    ui.alert(
      'Review Plan Before Production',
      'None of this plan\'s rows have reached the Content Pipeline yet.\n\n' +
      'The calendar rows exist; the transfer to the pipeline has not run for ' +
      'them. There is nothing written to review.',
      ui.ButtonSet.OK
    );
    return null;
  }

  // Row ranges are contiguous in practice because the transfer preserves order.
  // When they are not — a row deleted by hand shifts one sheet and not the
  // other — say so rather than quietly measuring the rows in between.
  if (!resolved.contiguous) {
    var proceed = ui.alert(
      'Review Plan Before Production',
      'This plan\'s rows are not contiguous in the Content Pipeline ' +
      '(' + resolved.rows.length + ' rows between ' + resolved.startRow +
      ' and ' + resolved.endRow + ').\n\n' +
      'Reviewing the whole span would include rows from another plan. ' +
      'Continue anyway?',
      ui.ButtonSet.YES_NO
    );

    if (proceed !== ui.Button.YES) {
      return null;
    }
  }

  if (resolved.missing > 0) {
    ui.alert(
      'Review Plan Before Production',
      resolved.missing + ' of this plan\'s ' + batch.count + ' calendar rows ' +
      'have no Content Pipeline row yet. Reviewing what has arrived.',
      ui.ButtonSet.OK
    );
  }

  return { start: resolved.startRow, end: resolved.endRow, batch: batch };
}


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

  // Filing follows the verdict. Which folder an asset sits in is its status, so
  // leaving a refused image in `generated` makes that folder mean two different
  // things at once — "not yet judged" and "already refused" — and the operator
  // cannot tell them apart by looking.
  //
  // Both calls are deliberately incapable of throwing. A library that cannot
  // move a file must not fail a row QA has just decided on.
  if (qaDecision === 'Approved') {
    var generatedAssets = qaRowData['Generated Assets'];
    if (generatedAssets) {
      SheetWriter.writeCell(rowNumber, 'Final Asset URL', generatedAssets, sheetName);
      SpreadsheetApp.flush();

      // File the approved artwork so it can be found again. Drive file ids
      // survive a move, so the URL just written keeps resolving.
      // (Improvement I4 — CONFIG.VISUAL_ASSETS.approved existed and nothing
      // ever wrote to it.)
      var promoted = AssetLibrary.promote(rowNumber, sheetName);

      if (promoted.error) {
        Logger.log(
          'VISUAL_QA_WORKER | row ' + rowNumber + ' was approved but its artwork ' +
          'was not filed: ' + promoted.error + '. The row is fine; the library is not.'
        );
      }
    }

  } else if (qaDecision === 'Rejected') {
    // Read from Generated Assets: Final Asset URL is only written on approval,
    // so on a rejection it is empty and there would be nothing to move.
    var refused = AssetLibrary.reject(rowNumber, sheetName);

    if (refused.error) {
      Logger.log(
        'VISUAL_QA_WORKER | row ' + rowNumber + ' was rejected but its artwork ' +
        'was not filed: ' + refused.error + '. It is still in the generated folder.'
      );
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

// The next Content ID, continuing from the highest one that actually exists.
//
// The counter used to live only in Script Properties, which drifts from the
// sheet the moment anything happens outside this function: a property store
// reset, a row typed in by hand, a sheet copied from another workbook. When it
// drifts low the next run re-issues IDs that are already in use, and a Content
// ID that identifies two different rows breaks every join built on it — the
// Visual Pipeline lookup, the revision counter, the asset folders.
//
// Reading the sheet makes the highest ID present the floor. The property is
// still consulted and still the higher of the two wins, so IDs are never reused
// after a row is deleted either.
var _contentIdFloor = null;

function _generateContentId(rowNumber) {
  var props = PropertiesService.getScriptProperties();

  // Script globals reset with each execution, so the sheet is read once per
  // run rather than once per row.
  if (_contentIdFloor === null) {
    var stored = parseInt(props.getProperty('LAST_CONTENT_ID') || '0', 10);
    if (isNaN(stored)) {
      stored = 0;
    }

    var inSheet = _highestContentIdInSheet();
    _contentIdFloor = Math.max(stored, inSheet);

    if (inSheet > stored) {
      Logger.log(
        'CONTENT_ID | Counter was at ' + stored + ' but the sheet already holds ' +
        'CNT-' + ('000000' + inSheet).slice(-6) + '. Continuing from the sheet.'
      );
    }
  }

  var newId = _contentIdFloor + 1;
  _contentIdFloor = newId;
  props.setProperty('LAST_CONTENT_ID', String(newId));

  return 'CNT-' + ('000000' + newId).slice(-6);
}


// Highest numeric suffix among the Content IDs already in the Content Pipeline.
// Anything that is not a CNT-nnnnnn is ignored rather than guessed at.
function _highestContentIdInSheet() {
  try {
    var sheetName = CONFIG.SHEET_NAME;
    var sheet = SheetSchema._getSheet(sheetName);
    var column = SheetSchema.getColumnIndex(CONFIG.COLUMN_NAMES.CONTENT_ID, sheetName);
    var lastRow = sheet.getLastRow();

    if (column < 1 || lastRow < CONFIG.DATA_START_ROW) {
      return 0;
    }

    var values = sheet
      .getRange(CONFIG.DATA_START_ROW, column, lastRow - CONFIG.DATA_START_ROW + 1, 1)
      .getValues();

    var highest = 0;

    for (var i = 0; i < values.length; i++) {
      var match = String(values[i][0]).trim().match(/^CNT-(\d+)$/i);

      if (!match) {
        continue;
      }

      var value = parseInt(match[1], 10);

      if (!isNaN(value) && value > highest) {
        highest = value;
      }
    }

    return highest;
  } catch (e) {
    // Falling back to the stored counter is the old behaviour, which is worse
    // but not broken. Silently returning 0 without saying so would not be.
    Logger.log('CONTENT_ID | Could not read existing IDs: ' + e.toString());
    return 0;
  }
}

// ---------------------------------------------------------------------------
// END SOURCE FILE: WorkerRunner.gs
// ---------------------------------------------------------------------------


// ---------------------------------------------------------------------------
// BEGIN SOURCE FILE: ControlCenter.gs
// ---------------------------------------------------------------------------
// ================================
// PRODUCTION CONTROL CENTER
// Server-side functions for the UI.
// This file only serves data and executes
// existing functions. No business logic here.
// ================================


// Opened as a modeless dialog, not a sidebar.
//
// A Google Sheets sidebar is fixed at roughly 300px and IGNORES setWidth —
// that method only applies to dialogs. This called setWidth(420) and had done
// nothing since the day it was written: the operator got 300px, read the panel
// as cramped, and was right.
//
// Modeless keeps the sheet usable underneath, which a modal would not: the
// operator watches rows fill in while a run is going.
function showControlCenter() {
  var html = HtmlService.createHtmlOutputFromFile('ControlCenter')
    .setTitle('Production Control Center')
    .setWidth(900)
    .setHeight(720);
  SpreadsheetApp.getUi().showModelessDialog(html, 'Production Control Center');
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
    providers: [],
    missingProviders: [],
    drive: false,
    cache: false,
    workerCount: Object.keys(CONFIG.WORKERS).length
  };

  // Every provider some worker is actually configured to use — not just Gemini.
  //
  // This dot used to read one key and label the result "API". The Creative
  // Director runs on Claude and does NOT fall back when its key is missing: it
  // fails on every row, by name. So the panel showed a green light at precisely
  // the moment the operator was deciding whether the system was ready to run,
  // and the most expensive worker in the chain could not make a single call.
  //
  // The question the light answers now is the one worth asking: can the workers
  // this deployment actually has make their calls?
  try {
    var needed = {};

    for (var name in CONFIG.WORKERS) {
      if (!CONFIG.WORKERS.hasOwnProperty(name)) continue;
      needed[CONFIG.WORKERS[name].provider || 'gemini'] = true;
    }

    var all = AIProvider.getAvailableProviders();

    for (var i = 0; i < all.length; i++) {
      var provider = all[i];
      var configured = AIProvider.isConfigured(provider);

      status.providers.push({
        name: provider,
        configured: configured,
        // A provider no worker uses is worth showing but must not fail the
        // check — Claude with no Claude worker is a spare, not a fault.
        required: !!needed[provider]
      });

      if (needed[provider] && !configured) status.missingProviders.push(provider);
    }

    status.apiKey = status.providers.length > 0 && status.missingProviders.length === 0;
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
      stopped: !!result.stopped,
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


// ================================
// PLANNING, FOR THE SIDEBAR
//
// The start of the chain. These take a filename, a written brief and a batch —
// not a row range — which is why they were the last part of the menu to reach
// the panel and why each needs its own input rather than a button.
//
// Every one of them returns data. The menu versions build their own text and
// hand it to ui.alert; formatting inside a function the panel also calls would
// mean the panel rendering a block of plain text with newlines in it.
// ================================

// One round trip for everything the card needs to draw itself. Four separate
// calls on open would be four sheet reads before the operator has clicked
// anything.
function getPlanningContext() {
  var context = {
    knowledgeFiles: [],
    pages: [],
    maxPostsPerDay: 3,
    batches: [],
    campaigns: { ready: [], thin: [], inactive: [] },
    problems: []
  };

  try {
    context.pages = (CONFIG.CONTROLLED_VOCABULARY || {})['Publishing Page'] || [];
    context.maxPostsPerDay = (CONFIG.CAMPAIGN_PLANNER || {}).MAX_POSTS_PER_DAY || 3;
  } catch (e) {
    context.problems.push('Could not read CONFIG: ' + e.toString());
  }

  // Each source is tried on its own. A knowledge folder that does not resolve
  // must not also empty the batch picker — one broken Script Property should
  // disable one control, not the card.
  try {
    context.knowledgeFiles = CardBuilder.listKnowledgeFiles();
    if (!context.knowledgeFiles.length) {
      context.problems.push(
        'No knowledge files found. Check KNOWLEDGE_FOLDER_ID in Script Properties.');
    }
  } catch (e) {
    context.problems.push('Knowledge folder: ' + (e.message || e.toString()));
  }

  try {
    var batches = Batches.all();
    for (var i = 0; i < batches.length; i++) {
      context.batches.push({
        id: batches[i].id,
        label: Batches.describe(batches[i]),
        start: batches[i].start,
        end: batches[i].end
      });
    }
  } catch (e) {
    context.problems.push('Batches: ' + (e.message || e.toString()));
  }

  try {
    var cards = PlannerRunner.readCards();
    var names = [];

    for (var key in cards) {
      if (cards.hasOwnProperty(key)) names.push(cards[key].name);
    }

    if (names.length) {
      var check = PlannerRunner.checkCampaigns(names, cards);
      context.campaigns = {
        ready: check.ready.map(function(c) { return c.name; }),
        thin: check.thin,
        inactive: check.inactive
      };
    }
  } catch (e) {
    context.problems.push('Campaign Cards: ' + (e.message || e.toString()));
  }

  return context;
}


// Reads a knowledge file and reports whether a card can be built from it,
// without spending an inference.
function executeCheckKnowledgeFile(fileName) {
  try {
    var name = _normaliseKnowledgeName(fileName);
    if (!name) return { success: false, error: 'No file name given.' };

    var file = CardBuilder.findKnowledgeFile(name);
    var check = CardBuilder.validate(file.content, name);
    var campaignName = CardBuilder.campaignNameFor(check.frontMatter);

    // Whether a card under this name would be joined to anything. A file can
    // pass every structural check and still produce a card no scheduled row
    // looks up, and that failure is invisible in the card itself.
    var usage = null;
    try {
      usage = CardBuilder.calendarUsage(campaignName);
    } catch (e) {}

    return {
      success: true,
      fileName: name,
      folder: file.folder,
      ready: !!check.ok,
      entity: check.frontMatter.entity_name_en,
      campaignName: campaignName,
      level: check.frontMatter.service_level,
      problems: check.problems || [],
      gaps: (check.gaps || []).map(function(g) {
        return { line: g.line, section: g.section, note: g.note || '' };
      }),
      slots: usage ? usage.slots : null,
      nearNames: usage ? usage.near : []
    };

  } catch (e) {
    return { success: false, error: e.message || e.toString() };
  }
}


function executeCardBuilder(fileName) {
  try {
    var name = _normaliseKnowledgeName(fileName);
    if (!name) return { success: false, error: 'No file name given.' };

    var result = CardBuilder.build(name);

    return {
      success: true,
      fileName: result.fileName,
      row: result.row,
      existed: !!result.existed,
      written: result.written || [],
      preserved: result.preserved || [],
      insufficient: result.insufficient || []
    };

  } catch (e) {
    return { success: false, error: e.message || e.toString() };
  }
}


// One rule for both entry points. The menu prompt calls this too: the filename
// is the join key, and a menu that accepted "HOSPITAL_DELTA" while the panel
// required "HOSPITAL_DELTA.md" would be two different systems.
function _normaliseKnowledgeName(fileName) {
  var name = String(fileName == null ? '' : fileName).trim();
  if (!name) return null;
  return /\.md$/i.test(name) ? name : name + '.md';
}


// The brief comes from the panel as one object rather than four prompts. The
// ceiling is checked here and not only in the form: a browser can be made to
// send anything, and PROJECT_DECISIONS §4 is a decision about the business.
function executeCampaignPlanner(brief) {
  try {
    var days = parseInt(brief && brief.days, 10);
    var postsPerDay = parseInt(brief && brief.postsPerDay, 10);
    var pages = (brief && brief.pages) || [];
    var objective = String((brief && brief.objective) || '').trim();
    var emphasis = String((brief && brief.emphasis) || '').trim();

    if (!days || days < 1) return { success: false, error: 'Days must be at least 1.' };
    if (!postsPerDay || postsPerDay < 1) {
      return { success: false, error: 'Posts per page per day must be at least 1.' };
    }
    if (!pages.length) return { success: false, error: 'No pages given.' };

    var known = (CONFIG.CONTROLLED_VOCABULARY || {})['Publishing Page'] || [];
    var unknown = pages.filter(function(p) { return known.indexOf(p) === -1; });

    // Refused by name rather than dropped. A page the vocabulary does not know
    // would be planned into rows nothing downstream can publish.
    if (unknown.length) {
      return { success: false, error: 'Not a known publishing page: ' + unknown.join(', ') };
    }

    var ceiling = (CONFIG.CAMPAIGN_PLANNER || {}).MAX_POSTS_PER_DAY || 3;
    var dailyTotal = postsPerDay * pages.length;

    if (dailyTotal > ceiling && !(brief && brief.overrideCeiling)) {
      return {
        success: false,
        overCeiling: true,
        dailyTotal: dailyTotal,
        ceiling: ceiling,
        error: postsPerDay + ' per page across ' + pages.length + ' pages is ' +
          dailyTotal + ' posts a day. PROJECT_DECISIONS §4 caps the ecosystem ' +
          'at ' + ceiling + ' a day, averaging 1.5–2, on the principle of ' +
          'consistency over volume.'
      };
    }

    var cards = PlannerRunner.readCards();
    var names = [];

    for (var key in cards) {
      if (cards.hasOwnProperty(key)) names.push(cards[key].name);
    }

    if (!names.length) {
      return {
        success: false,
        error: 'Campaign Cards is empty. Build at least one card before planning.'
      };
    }

    var check = PlannerRunner.checkCampaigns(names, cards);

    var start = new Date();
    start.setDate(start.getDate() + 1);

    var result = PlannerRunner.plan({
      days: days,
      pages: pages,
      postsPerDay: postsPerDay,
      objective: objective,
      emphasis: emphasis,
      campaigns: check.ready.map(function(c) { return c.name; }),
      startDate: start,
      startText: Utilities.formatDate(start, Session.getScriptTimeZone(), 'yyyy-MM-dd')
    });

    return {
      success: true,
      written: result.written,
      startRow: result.startRow,
      batchId: result.batchId,
      startText: Utilities.formatDate(start, Session.getScriptTimeZone(), 'yyyy-MM-dd'),
      missing: (result.check && result.check.missing) || [],
      rejected: result.rejected || [],
      notes: result.notes || ''
    };

  } catch (e) {
    return { success: false, error: e.message || e.toString() };
  }
}


// Scoped by batch, not by row number. The critic measures repetition across the
// rows it is given, so a range covering two plans reports their difference as a
// fault — which is why the panel offers the batch list first.
function executePortfolioCritic(startRow, endRow) {
  try {
    var result = PortfolioCritic.review(startRow, endRow);
    var m = result.measured;
    var review = result.review;

    return {
      success: true,
      verdict: review.verdict || '',
      strongest: review.strongest || '',
      measured: {
        total: m.total,
        written: m.written,
        formulaicShare: m.formulaicShare,
        duplicates: m.duplicates.length,
        clashes: m.clashes.length
      },
      findings: (review.findings || []).map(function(f) {
        return {
          severity: String(f.severity || '').toUpperCase(),
          what: f.what,
          where: f.where || '',
          fix: f.fix || ''
        };
      })
    };

  } catch (e) {
    return { success: false, error: e.message || e.toString() };
  }
}


// What falls inside — or just before — the window being planned. Never
// estimates a Hijri date: a year with no entry is reported missing.
function getUpcomingEvents(horizon) {
  try {
    var days = parseInt(horizon, 10) || 90;
    var result = EventsCalendar.upcoming(days);

    return {
      success: true,
      horizon: days,
      events: result.events.map(function(e) {
        return {
          name: e.name,
          state: e.state,
          startText: e.startText,
          endText: e.endText,
          daysUntilStart: e.daysUntilStart,
          weight: e.weight
        };
      }),
      missing: result.missing.map(function(m) {
        return { name: m.name, year: m.year };
      })
    };

  } catch (e) {
    return { success: false, error: e.message || e.toString() };
  }
}


// The end of the chain, for the sidebar.
//
// Publishing and paid ads are not entries in CONFIG.WORKERS — they are their own
// runners, with their own result shapes — so `executeWorker` cannot reach them.
// Until this existed the sidebar covered W3 to W8 and stopped: the operator ran
// the middle of the chain here and its last two steps from the menu.
//
// The return shape is deliberately the one `executeWorker` returns, so the
// existing success handler renders it without a second code path.
function executeDelivery(kind, startRow, endRow) {
  var startTime = new Date().getTime();

  try {
    var result;
    var label;

    if (kind === 'publishing') {
      result = PublishingRunner.run(startRow, endRow);

      // `published` counts posts that went out; in dry run it counts the ones
      // that would have. Skipped rows are not failures — a row refused for
      // being unapproved is the guard doing its job — so they are reported
      // separately rather than folded into either total.
      label = 'Publishing' + (result.dryRun ? ' (DRY RUN)' : '');

      return _deliveryResult(label, result, result.published, startRow, endRow, startTime, {
        dryRun: !!result.dryRun,
        skippedCount: result.skipped
      });
    }

    if (kind === 'ads') {
      result = AdsRunner.run(startRow, endRow);
      label = 'Paid Ads';

      return _deliveryResult(label, result, result.drafted, startRow, endRow, startTime, {
        skippedCount: result.skipped
      });
    }

    return { success: false, worker: 'Delivery', error: 'Unknown delivery step: ' + kind };

  } catch (e) {
    var failedAt = new Date().getTime();
    Logger.logFailure(String(kind).toUpperCase(), startRow + '-' + endRow,
      failedAt - startTime, e.toString());

    return {
      success: false,
      worker: kind === 'ads' ? 'Paid Ads' : 'Publishing',
      error: e.message || e.toString(),
      duration: formatDuration(failedAt - startTime)
    };
  }
}


function _deliveryResult(label, result, successCount, startRow, endRow, startTime, extra) {
  var endTime = new Date().getTime();

  var out = {
    success: result.failed === 0 && !result.interrupted,
    worker: label,
    startRow: startRow,
    endRow: endRow,
    totalRows: (result.published || result.drafted || 0) + (result.skipped || 0) +
               (result.failed || 0),
    successCount: successCount || 0,
    failedCount: result.failed || 0,
    interrupted: !!result.interrupted,
    stopped: !!result.stopped,
    nextRow: result.nextRow,
    duration: formatDuration(endTime - startTime)
  };

  for (var k in extra) {
    if (extra.hasOwnProperty(k)) out[k] = extra[k];
  }

  return out;
}


// Whether publishing would post for real, so the sidebar can say so on the
// button rather than in a dialog after the click. The menu path only tells the
// operator once they have already reached for it.
function getPublishingMode() {
  try {
    return { dryRun: !!(CONFIG.PUBLISHING || {}).DRY_RUN };
  } catch (e) {
    // Unknown is not the same as safe. A panel that cannot read the flag must
    // not draw the reassuring label.
    return { dryRun: false, unknown: true };
  }
}


// Move rows to the next tab. Not a row range: it transfers everything that is
// ready and skips whatever is already downstream, so running it twice is a
// no-op. The counts are what the operator needs back.
function executeTransfer() {
  try {
    var toPipeline = Transfer.calendarToPipeline();
    var toVisual = Transfer.pipelineToVisual();

    return {
      success: true,
      toPipeline: {
        written: toPipeline.written,
        skipped: toPipeline.skipped,
        noCard: toPipeline.noCard || {}
      },
      toVisual: {
        written: toVisual.written,
        skipped: toVisual.skipped,
        notApproved: toVisual.notApproved || 0
      },
      unknownColumns: (toPipeline.unknownColumns || [])
        .concat(toVisual.unknownColumns || [])
    };

  } catch (e) {
    return { success: false, error: e.message || e.toString() };
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
      stopped: !!result.stopped,
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
  var pipelineStopped = false;

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
        svcLine += result.stopped
          ? ' [stopped - resume from row ' + result.nextRow + ']'
          : ' [timeout - resume from row ' + result.nextRow + ']';
      }

      summary.push(svcLine);

      // A stop is an instruction that was carried out, not a failure. Reporting
      // it as one sends the operator to the Execution Log to find out what went
      // wrong with something they did on purpose.
      if (result.stopped) {
        pipelineStopped = true;
        summary.push('Stopped at your request — resume from row ' + result.nextRow);
        for (var s = i + 1; s < steps.length; s++) {
          summary.push(steps[s].name + ': not started');
        }
        break;
      }

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
      line += result.stopped
        ? ' [stopped - resume from row ' + result.nextRow + ']'
        : ' [timeout - resume from row ' + result.nextRow + ']';
    }

    summary.push(line);

    if (result.stopped) {
      pipelineStopped = true;
      summary.push('Stopped at your request — resume from row ' + result.nextRow);
      for (var k = i + 1; k < steps.length; k++) {
        summary.push(steps[k].name + ': not started');
      }
      break;
    }

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
    success: !pipelineFailed && !pipelineStopped,
    stopped: pipelineStopped,
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


// Called by the sidebar while a run is still going. Apps Script serves it as a
// separate execution, so it returns immediately — it does not wait for the run
// it is stopping. The running batch picks the flag up between rows.
function executeStop() {
  try {
    var outcome = RunControl.requestStop();

    return {
      success: true,
      jobCancelled: outcome.jobCancelled
    };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
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

// ---------------------------------------------------------------------------
// END SOURCE FILE: ControlCenter.gs
// ---------------------------------------------------------------------------

