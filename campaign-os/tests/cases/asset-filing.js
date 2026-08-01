// AssetLibrary — which folder an asset ends up in, and what that means.
//
// Five folders have been configured since 2026-07-25. Until 2026-07-31 only two
// were ever written to: generation wrote `generated`, QA approval wrote
// `approved`. A rejected image stayed in `generated` next to artwork nobody had
// looked at yet, so the folder that should mean "not yet judged" quietly meant
// "some mixture of not yet judged and already refused".
//
// The rules that have to hold:
//   - a rejection reads Generated Assets, not Final Asset URL (which is only
//     written on approval, so reading it would file nothing and report success)
//   - a rejected file is named REJ, which _parseName refuses, so it can never
//     become a reuse candidate
//   - a published file is NOT renamed, so it keeps the library name reuse
//     matches on
//   - reuse searches approved AND published, or artwork that actually ran
//     disappears from the library the moment it proves itself

module.exports = {
  name: 'asset filing',

  run(t) {
    const V = CONFIG.VISUAL_ASSETS;

    // --- the five folders ---
    for (const key of ['generated', 'approved', 'rejected', 'published', 'archive']) {
      t.ok(V[key] && String(V[key]).trim(), `a folder id is configured for "${key}"`);
    }

    const ids = Object.keys(V).map((k) => V[k]);
    t.is(ids.length, new Set(ids).size,
      'no two statuses point at the same folder — that would erase the distinction');

    // --- every folder is reachable from Script Properties ---
    // A second deployment must be a configuration exercise, not a code fork.
    const mapped = Object.keys(V).filter((k) =>
      JSON.stringify(ConfigResolver).indexOf('VISUAL_ASSETS.' + k) !== -1);
    t.is(mapped.sort(), Object.keys(V).sort(),
      'every asset folder can be overridden by a Script Property');

    // --- naming: what may and may not be reused ---
    const parse = (name) => AssetLibrary._parseName(name);

    t.is(parse('LIB__icu__1x1__CNT-042__1.png'),
      { domain: 'icu', aspect: '1x1', contentId: 'CNT-042', index: 1 },
      'an approved library asset parses into its metadata');

    t.is(parse('LIB__nicu__9x16__CNT-007__3.jpg'),
      { domain: 'nicu', aspect: '9x16', contentId: 'CNT-007', index: 3 },
      'aspect and index are read, whatever the extension');

    t.is(parse('REJ__icu__1x1__CNT-042__1.png'), null,
      'a REJECTED asset never parses — it cannot become a reuse candidate even ' +
      'if somebody drags it into the approved folder by hand');

    t.is(parse('IMG_20260731_113045.png'), null,
      'an unnamed generated file is not a reuse candidate');
    t.is(parse('LIB__icu__1x1__CNT-042.png'), null, 'a short name is refused');
    t.is(parse(''), null, 'an empty name is refused');
    t.is(parse(null), null, 'a missing name is refused');

    // --- the shape key ---
    t.is(AssetLibrary._aspectKey('Story'), '9x16', 'a story is vertical');
    t.is(AssetLibrary._aspectKey('Reel'), '9x16', 'a reel is vertical');
    t.is(AssetLibrary._aspectKey('Static'), '1x1', 'a static post is square');
    t.is(AssetLibrary._aspectKey('Carousel'), '1x1', 'a carousel is square');
    t.is(AssetLibrary._aspectKey(''), '1x1', 'an unset format is square');
    t.is(AssetLibrary._aspectKey('  story  '), '9x16', 'padding and case do not matter');

    // A vertical asset must never be offered for a square placement.
    t.ok(AssetLibrary._aspectKey('Story') !== AssetLibrary._aspectKey('Static'),
      'vertical and square are different keys, so reuse cannot cross them');

    // --- the filing entry points exist and are distinct ---
    for (const fn of ['promote', 'reject', 'markPublished', 'verifyFolders']) {
      t.is(typeof AssetLibrary[fn], 'function', `AssetLibrary.${fn} exists`);
    }

    // --- what each entry point reads and writes ---
    // Checked by inspecting the spec each one passes, because calling them
    // needs Drive. The column each reads is the defect worth pinning: reading
    // Final Asset URL on a rejection would file nothing and report success.
    const specs = {};
    const captured = AssetLibrary._fileInto;

    AssetLibrary._fileInto = function (rowNumber, sheetName, spec) {
      specs[spec.folder] = spec;
      return { moved: 0, captured: true };
    };

    try {
      AssetLibrary.promote(1, 'x');
      AssetLibrary.reject(1, 'x');
      AssetLibrary.markPublished(1, 'x');
    } finally {
      AssetLibrary._fileInto = captured;
    }

    t.is(specs.approved.column, 'Final Asset URL',
      'approval files the final artwork');
    t.is(specs.approved.prefix, AssetLibrary.PREFIX,
      'and renames it into the library, because the filename is the index');

    t.is(specs.rejected.column, 'Generated Assets',
      'rejection reads Generated Assets — Final Asset URL is only written on ' +
      'approval, so reading it would move nothing and report success');
    t.is(specs.rejected.prefix, 'REJ',
      'and marks it REJ, which the reuse parser refuses');

    t.is(specs.published.column, 'Final Asset URL',
      'publishing files the artwork that went live');
    t.is(specs.published.prefix, null,
      'and does NOT rename it — renaming would strip the metadata reuse matches on');

    // --- reuse searches both approved and published ---
    const source = require('fs').readFileSync(
      require('path').join(__dirname, '..', '..', 'src', 'AssetLibrary.gs'), 'utf8');

    const searchLine = /var searched = \[([^\]]+)\]/.exec(source);
    t.ok(searchLine, 'candidatesFor declares which folders it searches');
    t.ok(searchLine && searchLine[1].indexOf('approved') !== -1,
      'reuse searches approved');
    t.ok(searchLine && searchLine[1].indexOf('published') !== -1,
      'reuse also searches published — artwork that actually ran is the most ' +
      'proven thing the library holds, not the least');
    t.ok(searchLine && searchLine[1].indexOf('rejected') === -1,
      'reuse never searches rejected');
    t.ok(searchLine && searchLine[1].indexOf('generated') === -1,
      'reuse never searches generated — nothing there has been judged');
  }
};
