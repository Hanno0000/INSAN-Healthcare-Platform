// The Control Center sidebar — what it calls, and what it claims about health.
//
// Two separate risks live here.
//
// The first is the same one the menu has. The sidebar reaches the server by
// method name on a proxy:
//
//   google.script.run.withSuccessHandler(...).executeWorker(name, start, end)
//
// Nothing resolves `executeWorker` until the click. A renamed server function
// gives a button that spins and fails, and no earlier signal at all.
//
// The second is worse, because it is a wrong answer rather than no answer. The
// panel reports health, and the operator reads it to decide whether the system
// is ready to run. A health check that reports on something other than what it
// says is checking is more dangerous than no health check, because it is
// believed.

module.exports = {
  name: 'control center',

  run(t, fx) {
    const html = fx.repoFile('campaign-os/src/ControlCenter.html');
    const server = fx.srcSection('ControlCenter');

    // --- every server call the sidebar makes resolves ---
    //
    // The chain is written one link per line:
    //
    //   google.script.run
    //     .withSuccessHandler(function (r) { ... })
    //     .withFailureHandler(...)
    //     .executeStop();
    //
    // The server call is always the last link: a line that begins with `.name(`
    // AND closes the statement on the same line. Matching every line-initial
    // `.name(` instead picked up the `.replace()` chain inside esc(), which is
    // formatted the same way and is not a server call.
    //
    // Read from the source rather than from a hand-kept list, so a call added
    // tomorrow is covered without anyone remembering to add it here.
    const serverCalls = (text) => [...new Set(
      [...text.matchAll(/^[ \t]*\.([a-zA-Z_$][\w$]*)\([^()]*\);[ \t]*$/gm)]
        .map((m) => m[1])
        .filter((n) => n !== 'withSuccessHandler' && n !== 'withFailureHandler')
    )].sort();

    const targets = serverCalls(html);

    t.ok(targets.length >= 4,
      `the sidebar's server calls are readable — found ${targets.length}: ` +
      `${targets.join(', ')}. A pattern matching none would report them all healthy`);

    const broken = targets.filter((n) => typeof global[n] !== 'function');
    t.is(broken, [],
      'every function the sidebar calls exists — google.script.run resolves the ' +
      'name when the button is clicked and at no point before');

    // Mutation: the audit must notice a call that goes nowhere.
    const probe = html +
      '\n      google.script.run\n        .noSuchServerFn_probe();\n';
    const probeBroken = serverCalls(probe).filter((n) => typeof global[n] !== 'function');

    t.is(probeBroken, ['noSuchServerFn_probe'],
      'a server call whose function does not exist is reported — proving the ' +
      'assertion above is capable of failing');

    // --- the health check reports on what it says it reports on ---
    //
    // It used to read GEMINI_API_KEY alone and label the result "API". The
    // Creative Director runs on Claude and does NOT fall back to Gemini — it
    // fails on every row, by name. So the panel showed green while the most
    // expensive worker in the chain could not make a single call.
    const claudeWorkers = Object.keys(CONFIG.WORKERS)
      .filter((w) => CONFIG.WORKERS[w].provider === 'claude');

    t.ok(claudeWorkers.length > 0,
      `at least one worker runs on Claude — ${claudeWorkers.join(', ')}. ` +
      'Without one, the rest of this section is checking nothing');

    // Checked by behaviour below rather than by scanning the source for a key
    // name: a hardcoded read would turn the Gemini-only case green again, and
    // that case is asserted directly.
    const saved = global.PropertiesService;
    const withKeys = (props) => {
      global.PropertiesService = {
        getScriptProperties: () => ({ getProperty: (k) => props[k] || null })
      };
      return getSystemStatus();
    };

    try {
      // Both keys: ready.
      const both = withKeys({ GEMINI_API_KEY: 'g', ANTHROPIC_API_KEY: 'a' });
      t.ok(both.apiKey, 'with both keys set, the API light is green');
      t.is(both.missingProviders, [], 'and nothing is reported missing');

      // Gemini only — the case that used to read green.
      const geminiOnly = withKeys({ GEMINI_API_KEY: 'g' });
      t.notOk(geminiOnly.apiKey,
        'with only the Gemini key, the API light is NOT green — the Creative ' +
        'Director would fail on every row, and this is the exact state that ' +
        'used to report healthy');
      t.is(geminiOnly.missingProviders, ['claude'],
        'and the missing provider is named, because "API" does not tell the ' +
        'operator which key to go and set');

      // Claude only.
      const claudeOnly = withKeys({ ANTHROPIC_API_KEY: 'a' });
      t.notOk(claudeOnly.apiKey, 'with only the Claude key, it is not green either');
      t.is(claudeOnly.missingProviders, ['gemini'],
        'and Gemini is named — most of the workers are on it');

      // Neither.
      const neither = withKeys({});
      t.notOk(neither.apiKey, 'with no keys at all, it is not green');
      t.is(neither.missingProviders.sort(), ['claude', 'gemini'],
        'and both are named');

      // An empty string is not a key. Apps Script hands back '' for a property
      // that was set and then cleared, and `!!''` is false — but a check written
      // as `getProperty(k) !== null` would call it configured.
      const blank = withKeys({ GEMINI_API_KEY: '   ', ANTHROPIC_API_KEY: 'a' });
      t.is(blank.missingProviders, ['gemini'],
        'a blank key is a missing key, not a set one');

      // Every provider is reported, including one no worker uses — visible, but
      // never a fault.
      t.ok(both.providers.length >= 2, 'every known provider is listed');
      t.ok(both.providers.every((p) => typeof p.required === 'boolean'),
        'each says whether a worker actually needs it, so a spare key is shown ' +
        'without failing the check');
    } finally {
      global.PropertiesService = saved;
    }

    // --- the panel names the missing key ---
    t.includes(html, 'missingProviders',
      'the sidebar reads the named list, so the bar can say which key is ' +
      'missing instead of showing a bare red "API"');

    // --- every card drives its own inputs ---
    //
    // getRows used to read `section === 'content' ? 'c' : 'v'`, so any card that
    // was not content silently drove the Media Team's row fields. A Delivery
    // card added without touching that line would have published whatever range
    // the Media Team card happened to be showing — no error, wrong rows, and
    // publishing is the one action that cannot be undone.
    const sectionsBlock = /var SECTIONS = \{([\s\S]*?)\};/.exec(html);
    t.ok(sectionsBlock, 'the cards and their input prefixes are declared in one place');

    const declared = [...(sectionsBlock ? sectionsBlock[1] : '')
      .matchAll(/(\w+):\s*\{\s*prefix:\s*'(\w+)'/g)]
      .map((m) => ({ section: m[1], prefix: m[2] }));

    t.ok(declared.length >= 3,
      `every card is declared — found ${declared.length}: ` +
      declared.map((d) => d.section).join(', '));

    // Each card's toggle target, its two input groups and its four fields must
    // all exist, or the card silently falls back to another card's values.
    for (const { section, prefix } of declared) {
      t.includes(html, `id="section-${section}"`, `${section} has a collapsible body`);
      t.includes(html, `id="${section}-count"`, `${section} has a row-count group`);
      t.includes(html, `id="${section}-range"`, `${section} has a row-range group`);

      for (const field of ['start', 'count', 'rs', 're']) {
        t.includes(html, `id="${prefix}-${field}"`,
          `${section} owns its own ${prefix}-${field} input`);
      }
    }

    // No two cards share a prefix — that is the failure above, written down.
    const prefixes = declared.map((d) => d.prefix);
    t.is(prefixes.filter((p, i) => prefixes.indexOf(p) !== i), [],
      'no two cards read the same input fields');

    // Every card that offers a row selector must have an entry. Operations and
    // Recent Activity have none and need none; a card with the toggle and no
    // entry would throw on the first click.
    const withRowInputs = [...new Set(
      [...html.matchAll(/setMode\('(\w+)'/g)].map((m) => m[1]))];

    t.ok(withRowInputs.length >= 3,
      `the cards offering a row selector are readable — ${withRowInputs.join(', ')}`);

    for (const s of withRowInputs) {
      t.includes(declared.map((d) => d.section), s,
        `the ${s} card is declared in SECTIONS`);
    }

    // --- publishing says which mode it is in, before the click ---
    //
    // The menu path only tells the operator inside the dialog that follows the
    // click. On the one irreversible action in the system, the state belongs on
    // the button.
    t.is(typeof getPublishingMode, 'function',
      'the sidebar can ask whether publishing would post for real');

    const savedConfig = CONFIG.PUBLISHING;
    try {
      CONFIG.PUBLISHING = { DRY_RUN: true };
      t.is(getPublishingMode(), { dryRun: true }, 'dry run is reported as dry run');

      CONFIG.PUBLISHING = { DRY_RUN: false };
      t.is(getPublishingMode(), { dryRun: false }, 'and live as live');

      // Absent is not the same as safe. A missing flag must not produce the
      // reassuring answer.
      CONFIG.PUBLISHING = {};
      t.notOk(getPublishingMode().dryRun,
        'a missing DRY_RUN reads as live, not as dry run — unknown is not safe');
    } finally {
      CONFIG.PUBLISHING = savedConfig;
    }

    t.ok(/publishDryRun === true/.test(html),
      'the button distinguishes dry run from both live and unknown, rather ' +
      'than treating anything that is not true as safe');
    t.includes(html, 'Publish — DRY RUN', 'the dry-run label names the mode');
    t.includes(html, 'Publish — LIVE', 'and the live label names it too');
    t.includes(html, 'Publish — mode unknown',
      'and there is a third label, because a flag that could not be read is ' +
      'neither of the other two');

    // --- delivery reaches the end of the chain ---
    t.is(typeof executeDelivery, 'function',
      'publishing and paid ads are reachable from the sidebar — they are not ' +
      'entries in CONFIG.WORKERS, so executeWorker cannot reach them');

    t.is(executeDelivery('nonsense', 2, 3).success, false,
      'an unknown delivery step is refused rather than guessed at');

    t.is(typeof executeTransfer, 'function',
      'and Transfer Rows Forward, which sits between the two pipelines');

    // The result shape the existing success handler already renders. A delivery
    // result missing one of these renders as a blank count and reads like a run
    // that did nothing.
    //
    // Called rather than scanned. The first version of this check searched the
    // source from `function _deliveryResult` to the end of the section, which
    // included executeService and executePipeline — so it found every field in
    // a neighbour's code and passed with the field deleted. It could not fail.
    const delivered = _deliveryResult(
      'Publishing (DRY RUN)',
      { published: 3, skipped: 2, failed: 0, interrupted: false, nextRow: null },
      3, 2, 7, new Date().getTime(), { dryRun: true, skippedCount: 2 });

    for (const field of ['success', 'worker', 'startRow', 'endRow', 'totalRows',
                         'successCount', 'failedCount', 'interrupted', 'stopped',
                         'nextRow', 'duration']) {
      t.ok(Object.prototype.hasOwnProperty.call(delivered, field),
        `a delivery result carries ${field}, like every other run result`);
    }

    t.is(delivered.successCount, 3, 'the published count is what the panel shows');
    t.is(delivered.totalRows, 5, 'and skipped rows are counted in the total');
    t.is(delivered.failedCount, 0, 'but never counted as failures');
    t.ok(delivered.success, 'a run with no failures succeeded');
    t.ok(delivered.dryRun, 'and the dry-run flag survives to the panel');

    const withFailures = _deliveryResult(
      'Publishing', { published: 1, skipped: 0, failed: 2, interrupted: false },
      1, 2, 4, new Date().getTime(), {});
    t.notOk(withFailures.success, 'a run with failures did not succeed');

    const interrupted = _deliveryResult(
      'Publishing', { published: 1, skipped: 0, failed: 0, interrupted: true, nextRow: 9 },
      1, 2, 9, new Date().getTime(), {});
    t.notOk(interrupted.success,
      'and neither did one that ran out of time — the rows past nextRow were ' +
      'never attempted, and reporting success would say they were');
    t.is(interrupted.nextRow, 9, 'the row to resume from is carried back');

    // --- the panel's own script holds together ---
    //
    // None of this proves the sidebar works — it has never been opened. It
    // proves the cheap failures are absent: the ones that make a button do
    // nothing, throw on the first click, or render an element that is not there.
    const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
    t.is(scripts.length, 1, 'the panel has one script block');

    const js = scripts.join('\n');

    // A syntax error anywhere in it kills every handler in the panel, and the
    // sheet gives no indication beyond a sidebar where nothing responds.
    let parsed = true;
    try { new Function(js); } catch (e) { parsed = false; }
    t.ok(parsed, 'the sidebar script parses');

    const scriptFns = new Set(
      [...js.matchAll(/function\s+([A-Za-z_$][\w$]*)\s*\(/g)].map((m) => m[1]));

    const handlers = [...new Set(
      [...html.matchAll(/on(?:click|change|input)="([A-Za-z_$][\w$]*)\(/g)]
        .map((m) => m[1]))];

    t.ok(handlers.length >= 12,
      `the inline handlers are readable — found ${handlers.length}`);
    t.is(handlers.filter((h) => !scriptFns.has(h)), [],
      'every onclick calls a function the script declares — a missing one is a ' +
      'button that throws on the first click and looks like a dead control');

    // Mutation: the scan must notice a handler that goes nowhere.
    t.is([...new Set([...(html + '\n<button onclick="noSuchHandler_probe()">x</button>')
      .matchAll(/on(?:click|change|input)="([A-Za-z_$][\w$]*)\(/g)]
      .map((m) => m[1]))].filter((h) => !scriptFns.has(h)),
      ['noSuchHandler_probe'],
      'and reports one that does not exist — proving the check can fail');

    const ids = new Set([...html.matchAll(/id="([A-Za-z0-9_-]+)"/g)].map((m) => m[1]));
    const looked = [...new Set(
      [...js.matchAll(/getElementById\('([A-Za-z0-9_-]+)'\)/g)].map((m) => m[1]))];

    t.ok(looked.length >= 20, `element lookups are readable — found ${looked.length}`);
    t.is(looked.filter((i) => !ids.has(i)), [],
      'every getElementById target exists — either in the markup or in the ' +
      'markup the script builds');

    for (const cls of [...new Set(
      [...js.matchAll(/querySelectorAll\('\.([A-Za-z0-9_-]+)'\)/g)].map((m) => m[1]))]) {
      t.includes(html, cls, `.${cls} is queried and exists`);
    }

    // --- planning is reachable, and refuses before it spends ---
    for (const fn of ['getPlanningContext', 'executeCheckKnowledgeFile',
                      'executeCardBuilder', 'executeCampaignPlanner',
                      'executePortfolioCritic', 'getUpcomingEvents']) {
      t.is(typeof global[fn], 'function', `${fn} is reachable from the sidebar`);
    }

    t.is(_normaliseKnowledgeName('HOSPITAL_DELTA'), 'HOSPITAL_DELTA.md',
      'a filename typed without .md still resolves');
    t.is(_normaliseKnowledgeName('  HOSPITAL_DELTA.md  '), 'HOSPITAL_DELTA.md',
      'and one with stray spaces');
    t.is(_normaliseKnowledgeName(''), null, 'an empty name is refused, not searched for');
    t.is(executeCheckKnowledgeFile('').success, false, 'and refused by the caller');
    t.is(executeCardBuilder(null).success, false, 'including the build path');

    // The brief is validated before anything is read or written. All of these
    // return before PlannerRunner is reached, which is why they can be checked
    // with every Apps Script service stubbed to throw.
    const planner = (brief) => executeCampaignPlanner(brief);
    const pages = (CONFIG.CONTROLLED_VOCABULARY || {})['Publishing Page'] || [];

    t.ok(pages.length >= 2, `the publishing pages are known — ${pages.join(', ')}`);

    t.is(planner({ days: 0, pages: pages, postsPerDay: 1 }).success, false,
      'zero days is refused');
    t.is(planner({ days: 7, pages: [], postsPerDay: 1 }).success, false,
      'no pages is refused');
    t.is(planner({ days: 7, pages: pages, postsPerDay: 0 }).success, false,
      'zero posts a day is refused');

    // Named, not dropped. A page the vocabulary does not know would be planned
    // into rows nothing downstream can publish.
    const unknownPage = planner({ days: 1, pages: ['Nowhere Hospital'], postsPerDay: 1 });
    t.is(unknownPage.success, false, 'an unknown publishing page is refused');
    t.includes(unknownPage.error, 'Nowhere Hospital', 'and named in the refusal');

    // The ceiling is enforced on the server, not only in the form. A browser
    // can be made to send anything, and PROJECT_DECISIONS §4 is a decision
    // about the business rather than a form validation.
    const ceiling = (CONFIG.CAMPAIGN_PLANNER || {}).MAX_POSTS_PER_DAY || 3;
    const over = planner({ days: 7, pages: pages, postsPerDay: ceiling + 1 });

    t.is(over.success, false, 'a plan above the daily ceiling is refused');
    t.ok(over.overCeiling, 'and says why, so the panel can offer to confirm');
    t.is(over.ceiling, ceiling, 'reporting the ceiling it applied');

    // With the operator's confirmation it proceeds past the ceiling — and then
    // fails on the sheet, which is stubbed to throw here. That is the correct
    // place to stop: it means the ceiling was not what refused it.
    const overridden = planner({
      days: 7, pages: pages, postsPerDay: ceiling + 1, overrideCeiling: true
    });
    t.notOk(overridden.overCeiling,
      'and with the override it is no longer the ceiling that refuses');

    // --- nothing here throws at the caller ---
    // google.script.run reports a thrown server function as a failure handler
    // with a stack trace in it. Every one of these returns a refusal instead.
    for (const call of [() => getPlanningContext(),
                        () => getUpcomingEvents(90),
                        () => executePortfolioCritic(2, 5),
                        () => executeTransfer(),
                        () => executeDelivery('publishing', 2, 3)]) {
      let threw = false;
      try { call(); } catch (e) { threw = true; }
      t.notOk(threw,
        'the call returns a result rather than throwing — a thrown server ' +
        'function reaches the operator as a stack trace');
    }

    // getPlanningContext reads four separate things and must not let one
    // failure empty the others. Every source throws here, so all four are
    // reported.
    const context = getPlanningContext();
    t.ok(context.problems.length > 0,
      'a source it could not read is reported by name rather than returned as ' +
      'an empty list — an empty batch picker and a broken one look identical');
    t.ok(Array.isArray(context.knowledgeFiles) && Array.isArray(context.batches),
      'and the shape the panel expects survives the failure');
  }
};
