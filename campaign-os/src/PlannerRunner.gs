// W2 — CAMPAIGN PLANNER
//
// Turns an operator brief into Content Calendar rows.
//
// The Content Calendar currently schedules 41 distinct campaigns. Campaign Cards
// covers 16. Nothing checked, so 89 of 132 rows (67%) reached the pipeline with
// every strategy field blank and the workers wrote strategy for all of them.
// (Audit A, findings F1 and F8.)
//
// This worker's most important behaviour is therefore not planning. It is
// refusing: a campaign with no card cannot be scheduled, and saying so before
// the plan exists is the only point at which that gap is cheap to fix.
//
// It also asks before it assumes. An operator brief is short and the questions
// it leaves open — which pages, what mix, whether a campaign that has no card
// should be dropped or built first — are exactly the questions that produced a
// silently broken plan last time. (Improvement I6.)

var PlannerRunner = {

  WORKER_NAME: 'CAMPAIGN_PLANNER',

  _config: function() {
    return CONFIG.CAMPAIGN_PLANNER || {};
  },

  // ------------------------------------------------------------ what exists

  // Every campaign with a card, and whether that card carries a strategy. A row
  // in Campaign Cards is not the same thing as a usable card: 15 of 16 existing
  // cards have empty depth columns, and a card with no Core Message transfers
  // nothing.
  readCards: function() {
    var sheetName = CONFIG.CAMPAIGN_CARDS_SHEET_NAME;
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);

    if (!sheet) {
      throw new Error('Sheet "' + sheetName + '" not found.');
    }

    var lastRow = sheet.getLastRow();
    var cards = {};

    if (lastRow < CONFIG.DATA_START_ROW) {
      return cards;
    }

    for (var row = CONFIG.DATA_START_ROW; row <= lastRow; row++) {
      var data = SheetSchema.getRowData(row, sheetName);
      var name = String(data['Campaign Name'] || '').trim();

      if (!name) {
        continue;
      }

      // The twelve strategy fields are what the Content Pipeline actually looks
      // up. A card missing them is a name, not a strategy.
      var strategyFields = [
        'Campaign Philosophy', 'Core Message', 'Trust Promise',
        'Content Pillars', 'Target Audience', 'CTA Strategy'
      ];
      var filled = 0;

      for (var f = 0; f < strategyFields.length; f++) {
        if (String(data[strategyFields[f]] || '').trim()) {
          filled++;
        }
      }

      cards[name.toLowerCase()] = {
        name: name,
        row: row,
        status: String(data['Status'] || '').trim(),
        serviceLevel: String(data['Service Level'] || '').trim(),
        group: String(data['Umbrella Campaign'] || '').trim(),
        subBrand: String(data['Sub-Brand'] || '').trim(),
        targetPosts: parseInt(data['Target Posts'], 10) || null,
        priority: String(data['Priority'] || '').trim(),
        knowledgeSource: String(data['Knowledge Source'] || '').trim(),
        strategyFilled: filled,
        strategyTotal: strategyFields.length,
        usable: filled >= 4
      };
    }

    return cards;
  },

  // -------------------------------------------------------------- the guard

  // Runs before anything is planned. This is the check whose absence produced
  // the 67% defect: a campaign named in a brief but absent from Campaign Cards
  // used to be scheduled anyway, and the failure only became visible three
  // workers later as invented strategy.
  checkCampaigns: function(names, cards) {
    var missing = [];
    var thin = [];
    var inactive = [];
    var ready = [];

    for (var i = 0; i < names.length; i++) {
      var name = String(names[i]).trim();

      if (!name) {
        continue;
      }

      var card = cards[name.toLowerCase()];

      if (!card) {
        missing.push(name);
        continue;
      }

      if (card.status && card.status.toLowerCase() !== 'active') {
        inactive.push(name + ' (Status: ' + card.status + ')');
        continue;
      }

      if (!card.usable) {
        thin.push(name + ' (' + card.strategyFilled + ' of ' +
          card.strategyTotal + ' strategy fields)');
        continue;
      }

      ready.push(card);
    }

    return { ready: ready, missing: missing, thin: thin, inactive: inactive };
  },

  // ------------------------------------------------------------- the brief

  // What the brief leaves open. Asked before planning rather than resolved by
  // assumption — the assumption is what produced a plan nobody could use.
  openQuestions: function(brief, check) {
    var questions = [];

    if (!brief.days) {
      questions.push('How many days should the plan cover?');
    }

    if (!brief.pages || !brief.pages.length) {
      questions.push('Which pages — INSAN, Future, Delta, or some of them?');
    }

    if (!brief.postsPerDay) {
      questions.push('How many posts per page per day? ' +
        'PROJECT_DECISIONS caps this at 3 and recommends 1.5–2.');
    }

    if (check.missing.length) {
      questions.push(
        check.missing.length + ' campaign' +
        (check.missing.length === 1 ? ' has' : 's have') + ' no card: ' +
        check.missing.join(', ') + '. Build the card first, or drop ' +
        (check.missing.length === 1 ? 'it' : 'them') + ' from this plan?'
      );
    }

    if (check.thin.length) {
      questions.push(
        'Cards with almost no strategy: ' + check.thin.join(', ') +
        '. Scheduling these produces posts written from nothing. ' +
        'Rebuild the cards first, or plan around them?'
      );
    }

    if (!brief.objective) {
      questions.push('What is this cycle for — awareness, bookings, trust, ' +
        'recruitment? It decides the funnel mix.');
    }

    return questions;
  },

  // -------------------------------------------------------------- planning

  _dateFor: function(startDate, dayIndex) {
    var d = new Date(startDate.getTime());
    d.setDate(d.getDate() + dayIndex);
    return d;
  },

  _buildPrompt: function(brief, check, existing) {
    var config = this._config();
    var folderId = PropertiesService.getScriptProperties()
      .getProperty('PLANNING_PROMPTS_FOLDER_ID') || CONFIG.PROMPTS_FOLDER_ID;

    var manual = DriveLoader.loadMarkdown(config.promptFile, folderId);

    if (!manual) {
      throw new Error(
        'Could not load ' + config.promptFile + '. Put it in the prompts ' +
        'folder, or set PLANNING_PROMPTS_FOLDER_ID in Script Properties.'
      );
    }

    var decisions = DriveLoader.loadMarkdown('PROJECT_DECISIONS.md',
      CONFIG.DOCS_FOLDER_ID) || '[not loaded]';
    var structure = DriveLoader.loadMarkdown('PROJECT_STRUCTURE.md',
      CONFIG.DOCS_FOLDER_ID) || '[not loaded]';

    var staticPart = [
      'You are executing inside the INSAN Healthcare AI Operating System.',
      'Worker: ' + this.WORKER_NAME,
      '',
      'You turn an operator brief into a publishing calendar.',
      'You schedule only campaigns that have a usable card. That has already',
      'been checked — every campaign you are given is eligible.',
      '',
      '=== YOUR TRAINING MANUAL ===',
      '',
      manual,
      '',
      '=== END OF TRAINING MANUAL ===',
      '',
      '=== PROJECT DOCUMENT: PROJECT_DECISIONS.md ===',
      decisions,
      '',
      '=== PROJECT DOCUMENT: PROJECT_STRUCTURE.md ===',
      structure,
      '',
      '=== END OF PROJECT DOCUMENTATION ==='
    ].join('\n');

    var campaignLines = [];
    for (var i = 0; i < check.ready.length; i++) {
      var c = check.ready[i];
      campaignLines.push(
        '- ' + c.name +
        ' | level: ' + (c.serviceLevel || 'unspecified') +
        ' | group: ' + (c.group || 'unspecified') +
        ' | sub-brand: ' + (c.subBrand || 'any') +
        (c.targetPosts ? ' | target posts: ' + c.targetPosts : '') +
        (c.priority ? ' | priority: ' + c.priority : '')
      );
    }

    var existingLines = [];
    for (var e = 0; e < Math.min(existing.length, 40); e++) {
      existingLines.push('- ' + existing[e]);
    }

    var dynamicPart = [
      '=== THE BRIEF ===',
      '',
      'duration      : ' + brief.days + ' days, starting ' + brief.startText,
      'pages         : ' + brief.pages.join(', '),
      'posts per day : ' + brief.postsPerDay + ' per page',
      'total slots   : ' + (brief.days * brief.pages.length * brief.postsPerDay),
      'objective     : ' + (brief.objective || 'not stated'),
      'emphasis      : ' + (brief.emphasis || 'none stated'),
      '',
      '=== CAMPAIGNS YOU MAY SCHEDULE ===',
      '',
      'These all have a usable card. Nothing else may appear in the plan.',
      '',
      campaignLines.join('\n'),
      '',
      '=== ALREADY SCHEDULED ===',
      '',
      existingLines.length
        ? 'Recently scheduled, so the plan does not repeat them immediately:\n' +
          existingLines.join('\n')
        : 'Nothing scheduled yet.',
      '',
      '=== OUTPUT FORMAT ===',
      '',
      'Return a single valid JSON object. No markdown fences, no text around it.',
      '',
      '{',
      '  "plan": [',
      '    {',
      '      "day": 1,',
      '      "slot": 1,',
      '      "page": "INSAN | Future | Delta",',
      '      "campaign": "exact campaign name from the list above",',
      '      "reason": "one short clause on why here"',
      '    }',
      '  ],',
      '  "notes": "anything the operator should know about this plan"',
      '}',
      '',
      'Produce exactly ' + (brief.days * brief.pages.length * brief.postsPerDay) +
        ' entries — one per slot.',
      'Use only campaign names from the list. A name not on the list is a',
      'campaign with no strategy behind it, and scheduling it is the defect',
      'this worker exists to prevent.',
      '',
      '=== END OF OUTPUT FORMAT ==='
    ].join('\n');

    return { prompt: staticPart + '\n\n' + dynamicPart, staticPart: staticPart };
  },

  // Recent calendar entries, so a plan does not immediately repeat what was
  // just published.
  readRecent: function(limit) {
    var sheetName = (this._config().CALENDAR_SHEET_NAME) || 'Content Calendar';
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);

    if (!sheet) {
      return [];
    }

    var lastRow = sheet.getLastRow();

    if (lastRow < CONFIG.DATA_START_ROW) {
      return [];
    }

    var from = Math.max(CONFIG.DATA_START_ROW, lastRow - (limit || 40) + 1);
    var recent = [];

    for (var row = from; row <= lastRow; row++) {
      var data = SheetSchema.getRowData(row, sheetName);
      var campaign = String(data['Campaign Name'] || '').trim();

      if (campaign) {
        recent.push(campaign + ' on ' + String(data['Page'] || '').trim());
      }
    }

    return recent;
  },

  // --------------------------------------------------------------- writing

  write: function(plan, brief) {
    var sheetName = (this._config().CALENDAR_SHEET_NAME) || 'Content Calendar';
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);

    if (!sheet) {
      throw new Error('Sheet "' + sheetName + '" not found.');
    }

    var startRow = Math.max(sheet.getLastRow() + 1, CONFIG.DATA_START_ROW);
    var written = 0;

    for (var i = 0; i < plan.length; i++) {
      var entry = plan[i];
      var row = startRow + i;
      var day = parseInt(entry.day, 10) || 1;

      SheetWriter.writeCell(row, 'Day',
        this._dateFor(brief.startDate, day - 1), sheetName);
      SheetWriter.writeCell(row, 'Post Slot', entry.slot || 1, sheetName);
      SheetWriter.writeCell(row, 'Status', 'Planned', sheetName);
      SheetWriter.writeCell(row, 'Calendar ID',
        'CAL-' + Utilities.formatDate(this._dateFor(brief.startDate, day - 1),
          Session.getScriptTimeZone(), 'yyyyMMdd') + '-' + (entry.slot || 1) +
        '-' + String(entry.page || '').substring(0, 3).toUpperCase(), sheetName);
      SheetWriter.writeCell(row, 'Page', entry.page, sheetName);
      SheetWriter.writeCell(row, 'Campaign Name', entry.campaign, sheetName);

      if (entry.group) {
        SheetWriter.writeCell(row, 'Campaign Group', entry.group, sheetName);
      }

      written++;
    }

    return { startRow: startRow, written: written };
  },

  // -------------------------------------------------------------- the entry

  plan: function(brief) {
    var startTime = new Date().getTime();
    var config = this._config();

    var cards = this.readCards();
    var check = this.checkCampaigns(brief.campaigns || Object.keys(cards)
      .map(function(k) { return cards[k].name; }), cards);

    if (!check.ready.length) {
      throw new Error(
        'Nothing can be scheduled. No campaign in this brief has a usable card.\n\n' +
        (check.missing.length ? 'No card at all: ' + check.missing.join(', ') + '\n' : '') +
        (check.thin.length ? 'Card with almost no strategy: ' + check.thin.join(', ') + '\n' : '') +
        (check.inactive.length ? 'Not Active: ' + check.inactive.join(', ') + '\n' : '') +
        '\nBuild the cards first — AI Workers → Planning → Build Campaign Card.'
      );
    }

    var built = this._buildPrompt(brief, check, this.readRecent(40));

    var response = AIProvider.call(built.prompt, {
      temperature: config.temperature,
      provider: config.provider || undefined,
      model: config.model || undefined,
      cachePrefix: built.staticPart
    });

    var parsed = this._parse(response.text);
    var plan = parsed.plan || [];

    // The model was told to use only eligible names. Verified rather than
    // trusted — this is the guard, and a guard that is not enforced in code is
    // a request.
    var allowed = {};
    for (var a = 0; a < check.ready.length; a++) {
      allowed[check.ready[a].name.toLowerCase()] = check.ready[a];
    }

    var rejected = [];
    var accepted = [];

    for (var p = 0; p < plan.length; p++) {
      var card = allowed[String(plan[p].campaign || '').trim().toLowerCase()];

      if (!card) {
        rejected.push(plan[p].campaign);
        continue;
      }

      plan[p].group = card.group;
      accepted.push(plan[p]);
    }

    var result = this.write(accepted, brief);
    var runtime = new Date().getTime() - startTime;

    Logger.logSuccess(
      this.WORKER_NAME, result.startRow, runtime,
      response.inputTokens, response.outputTokens,
      'Planned ' + accepted.length + ' slots from row ' + result.startRow +
      ' | Eligible campaigns: ' + check.ready.length +
      (check.missing.length ? ' | Refused (no card): ' + check.missing.join(', ') : '') +
      (rejected.length ? ' | Dropped ineligible: ' + rejected.join(', ') : '')
    );

    return {
      startRow: result.startRow,
      written: accepted.length,
      rejected: rejected,
      check: check,
      notes: parsed.notes || ''
    };
  },

  _parse: function(text) {
    var cleaned = String(text).trim();

    if (cleaned.indexOf('```') === 0) {
      cleaned = cleaned.replace(/^```(json)?/, '').replace(/```$/, '').trim();
    }

    var first = cleaned.indexOf('{');
    var last = cleaned.lastIndexOf('}');

    if (first === -1 || last <= first) {
      throw new Error(
        'The planner returned no JSON. Response began: ' + cleaned.substring(0, 200)
      );
    }

    return JSON.parse(cleaned.substring(first, last + 1));
  }
};
