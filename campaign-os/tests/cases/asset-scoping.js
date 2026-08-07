// Photographs are filed per hospital, and looked up per hospital.
//
// `business/Media` was reorganised on 2026-08-06 into Insan/, Future/, Delta/.
// That is correct: a ward photograph belongs to the hospital it was taken in, and
// Delta's ICU does not look like Future's. But every domain path in CONFIG was
// written against the previous flat layout, so all fifteen resolved to null and
// every row fell back to AI generation with no reference photograph.
//
// It failed silently, which is why it needs a check rather than a reading. An
// absent domain folder legitimately means "no reference images for this domain",
// and that is indistinguishable from a folder that moved — the run succeeds, the
// artwork is generated, and nothing says the photographs were never consulted.
//
// The stake if scoping is wrong in the other direction is worse than a missed
// photograph: serving Future's operating theatre as Delta's puts one real
// hospital's facility on another's page.

module.exports = {
  name: 'asset scoping',

  run(t, fx) {
    // --- the domains are configured as paths, not folder names ---
    const domains = CONFIG.PROJECT_ASSETS.DOMAINS || [];
    t.ok(domains.length >= 10, `the photo domains are configured — ${domains.length}`);

    t.ok(domains.every((d) => d.folder && d.key),
      'every domain names a folder and a key');

    // --- the lookup takes a hospital, and tries it first ---
    const asked = [];
    const savedDrive = global.DriveApp;

    try {
      // A Drive whose only existing path is Future's. Delta's ICU folder does
      // not exist, which is the real state: Delta/Services is empty.
      const PRESENT = ['Future', 'Services', 'Intensive Care Unit'];

      const folder = (name, depth) => ({
        _name: name,
        getName: () => name,
        getFoldersByName: (child) => {
          asked.push((depth ? PRESENT.slice(0, depth).join('/') + '/' : '') + child);
          const expected = PRESENT[depth];
          const hasIt = expected === child;
          let handed = false;
          return {
            hasNext: () => hasIt && !handed,
            next: () => { handed = true; return folder(child, depth + 1); }
          };
        }
      });

      global.DriveApp = { getFolderById: () => folder('Media', 0) };

      // Future's ICU photographs exist, and are found under Future/.
      const found = DriveLoader._assetSubfolder('Services/Intensive Care Unit', 'Future');
      t.ok(found, 'Future\'s ICU domain resolves');
      t.is(found.getName(), 'Intensive Care Unit', 'to the ICU folder itself');
      t.ok(asked.indexOf('Future') !== -1,
        'and the hospital was tried FIRST — the whole point of scoping');

      // Delta's do not exist. It must come back with nothing rather than
      // falling through to Future's.
      asked.length = 0;
      const delta = DriveLoader._assetSubfolder('Services/Intensive Care Unit', 'Delta');
      t.notOk(delta,
        'Delta\'s ICU domain resolves to nothing — Delta has no photographs yet, ' +
        'and serving Future\'s theatre as Delta\'s would put one real hospital\'s ' +
        'facility on another\'s page');

      // A blank hospital still looks, at the root, rather than refusing.
      // Rows planned before Hospital Brand was written carry a blank.
      asked.length = 0;
      DriveLoader._assetSubfolder('Services/Intensive Care Unit', '');
      t.ok(asked.length > 0 && asked[0] === 'Services',
        'a row with no hospital falls back to the bare path instead of finding ' +
        'nothing — rows planned before Hospital Brand existed carry a blank');

      // The fallback exists for shared material that is genuinely not per
      // hospital, so the hospital attempt must not be the only attempt.
      asked.length = 0;
      DriveLoader._assetSubfolder('Brand Identity/Png', 'Delta');
      t.ok(asked.indexOf('Delta') !== -1 && asked.indexOf('Brand Identity') !== -1,
        'a path that does not exist under the hospital is retried at the root, ' +
        'which is what keeps shared assets reachable');

    } finally {
      global.DriveApp = savedDrive;
    }

    // --- the readers pass the hospital through ---
    // A scoped resolver nothing passes a hospital to is a resolver that does
    // nothing, and every test above would still pass.
    const core = fx.srcSection('DriveLoader');
    t.includes(core, 'listProjectAssets: function(domain, hospital)',
      'listProjectAssets accepts a hospital');
    t.includes(core, 'loadProjectAssets: function(domain, maxImages, hospital)',
      'and so does loadProjectAssets');

    const visual = fx.srcSection('VisualPlan');
    t.ok(/listProjectAssets\(domain, rowData\['Hospital Brand'\]\)/.test(visual),
      'the production-mode decision passes the row\'s hospital');

    // The reference BYTES are loaded in ServiceRunner, not MediaDesigner — the
    // designer composes the prompt, the runner fetches what it composes against.
    const service = fx.srcSection('ServiceRunner');
    t.ok(/loadProjectAssets\(\s*assetDomain, null, rowData\['Hospital Brand'\]\)/
      .test(service),
      'and so does the call that loads the actual reference bytes, which is the ' +
      'one that decides which hospital\'s facility appears in the artwork');

    const runner = fx.srcSection('WorkerRunner');
    t.ok(/listProjectAssets\(\s*plannerDomain, rowData\['Hospital Brand'\]\)/.test(runner),
      'and the availability told to the Visual Planner is the availability for ' +
      'that row\'s hospital, not for any hospital');
  }
};
