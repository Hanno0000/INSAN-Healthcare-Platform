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
    // so a link is a line beginning with `.name(`. The handler bodies are
    // indented inside their own arguments and do not start a line that way.
    // Read from the source rather than from a hand-kept list, so a call added
    // tomorrow is covered without anyone remembering to add it here.
    const serverCalls = (text) => [...new Set(
      [...text.matchAll(/^[ \t]*\.([a-zA-Z_$][\w$]*)\(/gm)]
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
  }
};
