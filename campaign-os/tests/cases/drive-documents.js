// The documents the workers load from Drive, and the copies that exist because
// of how Drive is reached.
//
// `DriveLoader.loadMarkdown(name, folderId)` looks a document up BY FILENAME in
// ONE folder and does not recurse. Every worker document therefore has to sit
// directly inside the folder `DOCS_FOLDER_ID` points at — which, since the repo
// became a synced Drive folder, is `business/brand`.
//
// Four of them live somewhere else in the repo for good reasons: PROJECT_STRUCTURE
// and PROJECT_DECISIONS belong to the business strategy, and the visual spec and
// the constants belong to campaign-os. They were copied into `business/brand` on
// 2026-08-02 so the loader can find them.
//
// A copy is a second source of truth. Edit one, forget the other, and a worker
// obeys a document nobody thinks is current — which is Audit A's F15 in a new
// place. This suite makes that a failing check instead of a discovery.

const COPIES = [
  ['business/brand/PROJECT_STRUCTURE.md',        'business/strategy/PROJECT_STRUCTURE.md'],
  ['business/brand/PROJECT_DECISIONS.md',        'business/strategy/PROJECT_DECISIONS.md'],
  ['business/brand/INSAN_VISUAL_LANGUAGE_SPEC.md',
   'campaign-os/docs/architecture/INSAN_VISUAL_LANGUAGE_SPEC.md'],
  ['business/brand/SYSTEM_CONSTANTS.md',         'campaign-os/docs/constants/SYSTEM_CONSTANTS.md']
];

module.exports = {
  name: 'drive documents',

  run(t, fx) {
    // --- every document a worker names is where the loader will look ---
    //
    // Collected from the workers' own `docs` lists rather than from a list kept
    // here, so a document added to a prompt is covered without anyone
    // remembering to add it.
    const named = new Set();
    const collect = (o) => { if (o && o.docs) o.docs.forEach((d) => named.add(d)); };

    for (const key in CONFIG.WORKERS) collect(CONFIG.WORKERS[key]);
    for (const key in (CONFIG.SERVICES || {})) collect(CONFIG.SERVICES[key]);
    collect(CONFIG.CARD_BUILDER);
    collect(CONFIG.CAMPAIGN_PLANNER);
    collect(CONFIG.PORTFOLIO_CRITIC);
    collect(CONFIG.PAID_ADS);

    // EntityRegistry loads its file from the same folder, by name.
    named.add(EntityRegistry.FILE_NAME);

    t.ok(named.size >= 7,
      `the documents the workers load are readable from CONFIG — ${named.size} of them`);

    const missing = [...named].sort()
      .filter((d) => !fx.exists('business/brand/' + d));

    t.is(missing, [],
      'every document a worker loads sits directly in business/brand — ' +
      'DriveLoader looks it up by filename in one folder and does not recurse, ' +
      'so one that is missing is a worker failing on the document it was ' +
      'written to obey');

    // Mutation: the scan must notice a document that is not there.
    t.is(['NO_SUCH_DOCUMENT.md'].filter((d) => !fx.exists('business/brand/' + d)),
      ['NO_SUCH_DOCUMENT.md'],
      'and a document that is absent is reported — proving the check can fail');

    // --- the copies have not drifted ---
    for (const [copy, original] of COPIES) {
      t.ok(fx.exists(copy), `${copy} exists`);
      t.ok(fx.exists(original), `${original} exists`);

      if (!fx.exists(copy) || !fx.exists(original)) continue;

      // Compared with line endings normalised. Git rewrites those on checkout
      // and a CRLF difference is not a difference in what the worker reads.
      const norm = (s) => s.replace(/\r\n/g, '\n').replace(/\n*$/, '\n');

      t.is(norm(fx.repoFile(copy)) === norm(fx.repoFile(original)), true,
        `${copy} is identical to ${original} — they are two copies of one ` +
        'document, and a worker reads the first while everyone edits the second');
    }

    // --- and the list of copies is complete ---
    // A fifth copy made later and not recorded here would drift unwatched.
    const tracked = new Set(COPIES.map(([copy]) => copy.split('/').pop()));
    const inBrand = [...named].filter((d) => {
      // A document that exists in business/brand AND somewhere else, but is not
      // in COPIES, is an unwatched duplicate.
      if (tracked.has(d)) return false;
      return fx.exists('business/strategy/' + d) ||
             fx.exists('campaign-os/docs/architecture/' + d) ||
             fx.exists('campaign-os/docs/constants/' + d);
    });

    t.is(inBrand, [],
      'every document that exists in two places is listed in COPIES above and ' +
      'checked for drift');
  }
};
