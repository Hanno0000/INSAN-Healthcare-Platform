// The Google identifiers — fourteen ids that decide where everything lives.
//
// None of them can be validated offline: proving an id opens a folder needs
// Drive. What CAN be checked is the part that went wrong in practice.
//
// Three of the five visual-asset folders were stale between 2026-07-25 and
// 2026-08-02 and nobody noticed, because only `generated` had ever been written
// to. A stale id fails at the moment a file is filed — after the artwork has
// been paid for — and not before.
//
// So this suite checks shape and completeness, and pins the values so that a
// change is a deliberate edit to a test rather than a silent drift. Maintenance
// → Deployment Identifiers is the live counterpart, and it needs the sheet.

module.exports = {
  name: 'identifiers',

  run(t, fx) {
    // A Drive folder or file id: 25+ characters of the URL-safe alphabet. This
    // will not catch a valid-looking id pointing at the wrong folder, and does
    // not pretend to.
    const looksLikeId = (v) => typeof v === 'string' && /^[A-Za-z0-9_-]{25,}$/.test(v);

    const ids = {
      'DOCS_FOLDER_ID':             CONFIG.DOCS_FOLDER_ID,
      'PROMPTS_FOLDER_ID':          CONFIG.PROMPTS_FOLDER_ID,
      'VISUAL_PROMPTS_FOLDER_ID':   CONFIG.VISUAL_PROMPTS_FOLDER_ID,
      'KNOWLEDGE_FOLDER_ID':        CONFIG.KNOWLEDGE_FOLDER_ID,
      'PLANNING_PROMPTS_FOLDER_ID': CONFIG.PLANNING_PROMPTS_FOLDER_ID,
      'ADS_PROMPTS_FOLDER_ID':      CONFIG.ADS_PROMPTS_FOLDER_ID,
      'PROJECT_ASSETS_FOLDER_ID':   CONFIG.PROJECT_ASSETS.FOLDER_ID,
      'VISUAL_ASSETS_GENERATED':    CONFIG.VISUAL_ASSETS.generated,
      'VISUAL_ASSETS_APPROVED':     CONFIG.VISUAL_ASSETS.approved,
      'VISUAL_ASSETS_REJECTED':     CONFIG.VISUAL_ASSETS.rejected,
      'VISUAL_ASSETS_PUBLISHED':    CONFIG.VISUAL_ASSETS.published,
      'VISUAL_ASSETS_ARCHIVE':      CONFIG.VISUAL_ASSETS.archive,
      'OVERLAY_TEMPLATE_1_1':       (CONFIG.TEXT_OVERLAY.TEMPLATES || {})['1:1'],
      'OVERLAY_TEMPLATE_9_16':      (CONFIG.TEXT_OVERLAY.TEMPLATES || {})['9:16']
    };

    for (const name of Object.keys(ids)) {
      t.ok(looksLikeId(ids[name]),
        `${name} is set and shaped like a Google id — got ${JSON.stringify(ids[name])}`);
    }

    // --- no two point at the same place ---
    // `approved` and `rejected` sharing an id would file refused artwork into
    // the reuse library, and nothing downstream would question it.
    const seen = {};
    const shared = [];

    for (const name of Object.keys(ids)) {
      const id = ids[name];
      if (seen[id]) shared.push(`${seen[id]} and ${name}`);
      else seen[id] = name;
    }

    t.is(shared, [],
      'no two identifiers point at the same folder — approved and rejected ' +
      'sharing one would file refused artwork into the reuse library');

    // --- every one of them is overridable ---
    // A deployment that cannot be reconfigured without editing code is a fork.
    // This is finding F17; the check is that no id was added afterwards without
    // being wired into the resolver.
    const map = ConfigResolver.MAP;

    for (const name of Object.keys(ids)) {
      t.ok(Object.prototype.hasOwnProperty.call(map, name),
        `${name} can be overridden from Script Properties`);
    }

    t.is(Object.keys(map).length, Object.keys(ids).length,
      'the resolver maps exactly these ids and no others — a name here with no ' +
      'id, or an id with no name, is a configuration nobody can set');

    // --- the values, pinned ---
    // Confirmed against Drive by the operator on 2026-08-02. Pinned so that
    // changing one is an edit to this file, made on purpose, rather than a
    // difference nobody sees until a file is filed into the wrong folder.
    const confirmed = {
      'DOCS_FOLDER_ID':             '1jV62YARsYyAED7hIg6HVpe6Swj8wtaVH',
      'KNOWLEDGE_FOLDER_ID':        '1fwd_BX_rGfc2954FG52fZKzCW_Q6yizS',
      'PLANNING_PROMPTS_FOLDER_ID': '1wIpi1lCRYPs0tTmanIrCADlxVb6L92x4',
      'ADS_PROMPTS_FOLDER_ID':      '1YTwCq10ijTWale06kPG9p7SwGAD2LY6j',
      'VISUAL_ASSETS_APPROVED':     '16DcH4XW5uYsA7zgpn0MWMygHeDCGvgnu',
      'VISUAL_ASSETS_REJECTED':     '1jUJ76XU0Y2WlmGM6fntf5No4XnAeL9uK',
      'VISUAL_ASSETS_PUBLISHED':    '1tebmGSwrKFYkAFtON5_LSSP_e4xrq6Rd'
    };

    for (const name of Object.keys(confirmed)) {
      t.is(ids[name], confirmed[name], `${name} is the id the operator confirmed`);
    }

    // --- the knowledge folder in particular ---
    // It had no fallback at all until 2026-08-02: unset, W1 could not find a
    // single file, and the whole card-building path was dead on a fresh
    // deployment with no way to tell from the code that a step was missing.
    t.ok(CONFIG.KNOWLEDGE_FOLDER_ID,
      'the knowledge folder has a working default, so W1 is not dead until ' +
      'someone remembers to set a Script Property');

    const cardBuilder = fx.srcSection('CardBuilder');
    t.includes(cardBuilder, 'CONFIG.KNOWLEDGE_FOLDER_ID',
      'and the code actually falls back to it');
  }
};
