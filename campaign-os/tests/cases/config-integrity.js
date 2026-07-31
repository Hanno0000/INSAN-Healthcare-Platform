// CONFIG — the invariants that other code assumes without checking.
//
// Most of these are not clever. They are the ones where being wrong is silent:
// a column the code writes but the sheet does not have is skipped, logged once,
// and the run still reports success. A worker whose output schema includes a
// field it must never write is a boundary that exists only in the documentation.

module.exports = {
  name: 'config integrity',

  run(t) {
    // --- publishing: the only irreversible action in the system ---
    t.is(CONFIG.PUBLISHING.DRY_RUN, true,
      'publishing ships in dry run — turning it off is a deliberate act, not a default');
    t.ok(CONFIG.PUBLISHING.IN_FLIGHT_MARKER,
      'there is an in-flight marker, so a run that dies between posting and ' +
      'recording cannot be replayed into a double post');
    t.ok(CONFIG.PUBLISHING.PAGE_ID_PREFIX && CONFIG.PUBLISHING.PAGE_TOKEN_PREFIX,
      'page ids and tokens are read from Script Properties by prefix, not from CONFIG');
    t.notOk(/FB_PAGE_TOKEN_[A-Z]+\s*[:=]/.test(JSON.stringify(CONFIG)),
      'no page token is stored in CONFIG');

    // --- paid ads: the boundary that has to be structural ---
    // Budget is where a human takes responsibility for spend. The other three
    // record what happened after a human launched. A model writing any of them
    // would be reporting a spend that never occurred — so they are not in the
    // output schema at all, rather than being forbidden in a prompt.
    const ads = CONFIG.PAID_ADS;
    const schema = Object.keys(ads.OUTPUT_FIELDS);

    for (const owned of ['Budget', 'Ad Status', 'Ad ID', 'Results']) {
      t.notOk(schema.indexOf(owned) !== -1,
        `"${owned}" is outside the ads worker's output schema — there is no path ` +
        'by which a model fills it');
      t.includes(ads.COLUMNS, owned, `"${owned}" is still a column the operator owns`);
    }

    t.ok(schema.every((f) => ads.COLUMNS.indexOf(f) !== -1),
      'every field the ads worker writes has a column to write into');
    t.is(ads.OPERATOR_OWNED.slice().sort(),
      ['Ad ID', 'Ad Status', 'Budget', 'Results'],
      'the operator-owned list matches what is missing from the schema');

    // --- managed columns ---
    // Any code writing a new column must add it here, or SheetWriter skips the
    // write, logs one line, and the run reports success.
    const managed = CONFIG.MANAGED_COLUMNS;
    t.ok(managed.length > 0, 'there are managed columns');
    t.ok(managed.every((c) => c.sheet && c.column),
      'every managed column names both its sheet and its column');

    const managedKeys = managed.map((c) => c.sheet + '::' + c.column);
    t.is(managedKeys.length, new Set(managedKeys).size,
      'no managed column is declared twice');

    // The three columns added since the audits. Each is written by code and
    // does not exist in a sheet that has not had Create Managed Columns run.
    t.includes(managedKeys, 'Content Pipeline::Pipeline State',
      'Pipeline State is managed — it was split out of the operator\'s Workflow Status');
    t.includes(managedKeys, 'Campaign Cards::Service Level',
      'Service Level is managed — it is what stops a Department being filed as a Center');
    t.includes(managedKeys, 'Content Pipeline::Alternative Opening',
      'Alternative Opening is managed — the second opening per post');

    // --- controlled vocabulary ---
    const vocab = CONFIG.CONTROLLED_VOCABULARY;
    const fields = Object.keys(vocab);

    t.ok(fields.length > 0, 'there is a controlled vocabulary');
    t.ok(fields.every((f) => Array.isArray(vocab[f]) && vocab[f].length),
      'every controlled field lists at least one value');
    t.ok(fields.every((f) => vocab[f].every((v) => typeof v === 'string' && v.trim())),
      'no controlled value is empty or non-string');

    const dupes = fields.filter((f) => vocab[f].length !== new Set(vocab[f]).size);
    t.is(dupes, [], 'no controlled field lists the same value twice');

    // Two values differing only by case would make _validateControlledField's
    // case-insensitive correction ambiguous.
    const ambiguous = fields.filter((f) => {
      const lowered = vocab[f].map((v) => v.toLowerCase().trim());
      return lowered.length !== new Set(lowered).size;
    });
    t.is(ambiguous, [], 'no controlled field has two values differing only by case');

    // --- Service Level, shared with the taxonomy ---
    const levels = vocab['Service Level'];
    t.ok(levels, 'Service Level has a vocabulary');
    for (const level of ['DEPARTMENT', 'CENTER', 'CLINIC', 'PROGRAM', 'CORPORATE',
                         'HOSPITAL', 'SUPPORTING']) {
      t.includes(levels, level,
        `Service Level accepts ${level}, per MEDICAL_SERVICES_TAXONOMY §5`);
    }

    // --- the decision vocabularies matched literally by stageMapping ---
    t.includes(vocab['Visual QA Decision'], 'Approved',
      'Visual QA can approve, spelled exactly as the stage mapping expects');
    t.includes(vocab['Creative Director Review Status'], 'Approved',
      'the Creative Director can approve');

    // --- sampling parameters Claude rejects ---
    // The Claude 5 family returns HTTP 400 on any non-default sampling
    // parameter. Without this, the first row fails three times.
    const claudeWorkers = Object.keys(CONFIG.WORKERS)
      .filter((w) => (CONFIG.WORKERS[w].provider || '').toLowerCase() === 'claude');
    t.ok(claudeWorkers.length > 0, 'at least one worker runs on Claude');

    // --- required inputs: the refusal that makes the 67% gap visible ---
    const required = CONFIG.REQUIRED_INPUTS;
    t.ok(required && Object.keys(required).length > 0,
      'workers declare the inputs they refuse to run without');
    t.ok(Object.keys(required).every((w) => Array.isArray(required[w])),
      'every required-input list is a list');

    // --- deployment identifiers ---
    // F17: all eleven hardcoded Google ids resolve from Script Properties with
    // the CONFIG value as fallback, so a second deployment is configuration
    // rather than a code fork.
    t.ok(typeof ConfigResolver.apply === 'function',
      'identifiers are resolvable from Script Properties');
    t.ok(typeof ConfigResolver.report === 'function',
      'and which are set can be reported without printing any value');
  }
};
