// The global namespace — the only interface the sources have with each other.
//
// Apps Script has no `import` and no modules. Every `.gs` file is evaluated
// into one shared scope, in an order the platform chooses, before anything is
// called. `var CONFIG = {...}` in one file and `CONFIG.SERVICES` in another are
// joined by nothing except that shared scope.
//
// Two consequences, and this suite exists for both.
//
// The first is that regrouping the sources into different files cannot change
// what runs, provided the set of names is unchanged. That is what makes the
// 31-files-into-5 consolidation a text move rather than a refactor — but it is
// a claim, and `GLOBALS.txt` is what turns it into a measurement.
//
// The second is that the namespace is easy to pollute by accident. An
// assignment that lost its `var` inside a function creates a global at call
// time; a second file declaring a name a first file already owns silently wins.
// Neither produces an error. Pinning the list means both have to be deliberate.

module.exports = {
  name: 'namespace',

  run(t, fx) {
    const manifest = fx.repoFile('campaign-os/tests/GLOBALS.txt')
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith('#'))
      .sort();

    const actual = fx.sourceGlobals;

    // Guard before comparing. Both sides are lists, and two empty lists are
    // equal — a fixture that stopped collecting would report a perfect match.
    t.ok(manifest.length > 100,
      `GLOBALS.txt carries the manifest — ${manifest.length} names`);
    t.ok(actual.length > 100,
      `the sources were loaded and observed — ${actual.length} names`);

    // Named rather than counted. "expected 136, got 134" sends you looking;
    // "Transfer, Archive" tells you a section was dropped.
    const missing = manifest.filter((n) => actual.indexOf(n) === -1);
    const added = actual.filter((n) => manifest.indexOf(n) === -1);

    t.is(missing, [],
      'every name the manifest records is still defined — a name that vanished ' +
      'is a section dropped from a file, and nothing else in the suite would ' +
      'necessarily notice');

    t.is(added, [],
      'and nothing new appeared unannounced — an unexpected global is usually ' +
      'an assignment that lost its var. If it is deliberate, regenerate the ' +
      'manifest in the same commit that introduces it');

    // --- the names the rest of the system reaches for by string ---
    // These are not merely present in the manifest, they are callable. The menu
    // resolves its functions this way (see cases/menu.js) and the workers
    // resolve their services the same way.
    for (const name of ['CONFIG', 'Logger', 'SheetWriter', 'DriveLoader',
                        'ResponseParser', 'AIProvider', 'ServiceRunner',
                        'AdPolicy', 'Transfer', 'Archive', 'PostFooter',
                        'Branding', 'Batches']) {
      t.ok(typeof global[name] === 'object' || typeof global[name] === 'function',
        `${name} resolves in the shared scope`);
    }

    // --- no name is owned by two files ---
    // A duplicate `var X` does not throw. The last file loaded wins, and which
    // file that is depends on the order the platform picks — so the failure can
    // differ between the editor and this harness.
    const files = fx.srcFiles();
    const owners = {};

    for (const [file, text] of Object.entries(files)) {
      // Declarations at column 0 only. Anything indented is inside something.
      for (const m of text.matchAll(/^(?:var|function)\s+([A-Za-z_$][\w$]*)/gm)) {
        (owners[m[1]] = owners[m[1]] || new Set()).add(file);
      }
    }

    t.ok(Object.keys(owners).length > 100,
      `top-level declarations are readable — found ${Object.keys(owners).length}`);

    const shared = Object.entries(owners)
      .filter(([, set]) => set.size > 1)
      .map(([name, set]) => `${name} in ${[...set].sort().join(' and ')}`);

    t.is(shared, [],
      'no global is declared by two files — one would silently overwrite the ' +
      'other, and which one wins depends on load order');

    // --- what the operator actually pastes ---
    // There is no deployment step here. Every file under src/ is copied into the
    // Apps Script editor by hand, and copied again after every change, so the
    // number of them is a running cost rather than a matter of taste.
    const gs = Object.keys(files).sort();

    t.is(gs, ['AI.gs', 'App.gs', 'Core.gs', 'Delivery.gs', 'Planning.gs'],
      'five .gs files, which is what the operator pastes');

    // The sections inside them are the units this repository is written and
    // reviewed in, and the units the checks above read.
    // 31 original sources, plus EnablementRunner and EnablementChannel added
    // 2026-08-07. The count is pinned rather than the names alone because a
    // section silently absorbed into a neighbour keeps every name defined while
    // losing the boundary the reviews and `fx.srcSection` depend on.
    const sections = Object.keys(fx.srcSections()).sort();
    t.is(sections.length, 33,
      `31 original sources plus the two Enablement sections — found ${sections.length}`);

    // ControlCenter.html is looked up BY NAME at runtime:
    //
    //   HtmlService.createHtmlOutputFromFile('ControlCenter')
    //
    // It is not a `.gs` and cannot be merged into one. Absorbed or renamed, the
    // sidebar fails when the operator opens it and at no point before.
    t.ok(fx.exists('campaign-os/src/ControlCenter.html'),
      'ControlCenter.html is still a file of its own, because HtmlService ' +
      'resolves it by name at the moment the sidebar is opened');

    t.includes(fx.srcSection('ControlCenter'),
      "createHtmlOutputFromFile('ControlCenter')",
      'and that is still how the sidebar is built — the name in the call and ' +
      'the filename have to agree');

    // Every section is claimed by exactly one file. `srcSections` throws on a
    // duplicate, so reaching here at all is the check; this states the count so
    // the reason is visible when it does throw.
    t.ok(sections.length === new Set(sections).size,
      'no source section is claimed by two files');
  }
};
