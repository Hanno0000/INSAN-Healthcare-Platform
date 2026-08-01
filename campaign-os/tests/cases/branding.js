// Branding — the marks and the numbers that go on finished artwork.
//
// Two things here are unrecoverable once published: the wrong hospital's logo,
// and a placeholder phone number. Both get a check that fails loudly rather
// than a default that looks reasonable.

module.exports = {
  name: 'branding',

  run(t, fx) {
    const B = CONFIG.BRANDING;

    // --- which marks, per brand ---
    // From the brand architecture: a hospital carries the platform that governs
    // it, the company that manages it, and its own mark.
    t.is(Branding.marksFor('INSAN'), ['INSAN'],
      'the platform page carries the platform mark alone');
    t.is(Branding.marksFor('Future'), ['INSAN', 'WEDGE', 'FUTURE'],
      'Future carries INSAN, Wedge Group who manage it, and its own');
    t.is(Branding.marksFor('Delta'), ['INSAN', 'LVENIR', 'DELTA'],
      "Delta carries INSAN, L'Venir who manage it, and its own");

    t.is(Branding.marksFor('future'), ['INSAN', 'WEDGE', 'FUTURE'],
      'the column is operator-typed, so matching is case-insensitive');

    // INSAN first, every time. A hierarchy that reorders is not one.
    for (const brand of ['INSAN', 'Future', 'Delta']) {
      t.is(Branding.marksFor(brand)[0], 'INSAN',
        `${brand} leads with the platform mark`);
    }

    // --- an unknown brand gets NOTHING ---
    // Not a default set. Putting one hospital's logo on another's post is not a
    // degraded result, it is a false statement about who provided the care, and
    // it cannot be withdrawn after publication.
    t.is(Branding.marksFor('Delta International Hospital'), [],
      'a brand that is not an exact match gets no marks rather than a guess');
    t.is(Branding.marksFor(''), [], 'a blank brand gets no marks');
    t.is(Branding.marksFor(null), [], 'a missing brand gets no marks');
    t.is(Branding.marksFor('Cairo Hospital'), [], 'an unknown brand gets no marks');

    // --- the brand set matches the calendar's own vocabulary ---
    const pages = CONFIG.CONTROLLED_VOCABULARY['Publishing Page'];
    for (const page of pages) {
      t.ok(Branding.marksFor(page).length > 0,
        `every publishable page has a logo set — ${page}`);
    }

    // --- the logo files ---
    // Only the Transparent set. The `* White.png` files have no alpha channel:
    // compositing one lays a solid white rectangle over the artwork.
    const files = Object.values(B.LOGOS);

    t.is(files.filter((f) => /White\.png$/i.test(f)), [],
      'no White.png is used — those files have no alpha and composite as a ' +
      'solid rectangle');

    t.is(files.length, new Set(files).size,
      'no two brands share a logo file');

    for (const key of ['INSAN', 'FUTURE', 'DELTA', 'WEDGE', 'LVENIR']) {
      t.ok(B.LOGOS[key], `a file is configured for ${key}`);
    }

    // Every mark named in a set has a file behind it.
    const named = new Set();
    for (const set of Object.values(B.BRAND_SETS)) {
      for (const key of set) named.add(key);
    }
    const unfiled = [...named].filter((k) => !B.LOGOS[k]);
    t.is(unfiled, [], 'every mark in a brand set has a configured file');

    // --- the files exist on disk, with alpha ---
    // Checked against the repository rather than assumed: a filename that does
    // not resolve is a post that ships unbranded.
    const missing = [];
    const opaque = [];

    for (const [key, name] of Object.entries(B.LOGOS)) {
      const rel = 'business/Media/' + B.LOGO_FOLDER + '/' + name;

      if (!fx.exists(rel)) {
        missing.push(key + ' → ' + name);
        continue;
      }

      // PNG IHDR colour type is byte 25. 6 = RGBA, 4 = grey+alpha.
      const bytes = fx.repoBytes(rel);
      const colourType = bytes[25];

      if (colourType !== 6 && colourType !== 4) {
        opaque.push(key + ' → ' + name + ' (colour type ' + colourType + ')');
      }
    }

    t.is(missing, [], 'every configured logo file is present');
    t.is(opaque, [], 'every configured logo has an alpha channel');

    // --- contact numbers ---
    for (const page of pages) {
      const line = Branding.contactLine(page);
      t.ok(line, `${page} has a contact line`);
      t.includes(line, 'للتواصل', `${page}'s line is labelled`);
      t.is((line.match(/01\d{9}/g) || []).length, 2,
        `${page} shows exactly two numbers`);
    }

    t.is(Branding.contactLine('Nowhere'), '',
      'a page with no numbers gets no strip — a placeholder on a published ' +
      'post is worse than an absent line');
    t.is(Branding.contactLine(''), '', 'a blank page gets no strip');

    // Every configured number is a plausible Egyptian mobile.
    const bad = [];
    for (const entry of Object.values(B.CONTACT)) {
      for (const phone of entry.phones) {
        if (!/^01[0125]\d{8}$/.test(phone)) bad.push(phone);
      }
    }
    t.is(bad, [], 'every configured number is a well-formed Egyptian mobile');

    // 01500668657 is deliberately on two pages. Reported, not failed — which
    // page would lose a number is not a decision code should make.
    const all = Object.values(B.CONTACT).flatMap((c) => c.phones);
    const shared = all.filter((p, i) => all.indexOf(p) !== i);
    t.is(shared, ['01500668657'],
      'exactly one number is shared between pages, and it is the known one');

    // --- the Meta text budget ---
    // Meta retired the automatic rejection at 20% in 2020; it remains guidance
    // that affects delivery, and every post here is intended for promotion.
    const budget = Branding.assertTextBudget();

    t.ok(budget.total <= budget.limit,
      `the headline and contact bands cover ${Math.round(budget.total * 100)}%, ` +
      `within the ${Math.round(budget.limit * 100)}% budget`);
    t.ok(B.MAX_TEXT_BAND_PCT <= 0.20,
      'the budget itself is at or under 20%');
    t.ok(CONFIG.TEXT_OVERLAY.BAND_HEIGHT_PCT < 0.22,
      'the headline band was reduced from the 0.22 that was already over the line');

    // --- placement ---
    const square = Branding.layout(3, 1080, 1080, 'top-left');
    t.is(square.boxes.length, 3, 'three marks produce three boxes');
    t.ok(square.boxes.every((b) => b.left >= 0 && b.top >= 0),
      'nothing is placed off the top or left edge');
    t.ok(square.boxes.every((b) => b.left + b.size <= 1080 && b.top + b.size <= 1080),
      'nothing overflows the frame');

    // Marks must not overlap each other.
    const sorted = square.boxes.slice().sort((a, b) => (a.left - b.left) || (a.top - b.top));
    let overlaps = 0;
    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1];
      const cur = sorted[i];
      const apart = (cur.left >= prev.left + prev.size) || (cur.top >= prev.top + prev.size);
      if (!apart) overlaps++;
    }
    t.is(overlaps, 0, 'marks do not overlap each other');

    // A bottom corner clears the headline band rather than sitting on it.
    const bandTop = 1080 * (1 - CONFIG.TEXT_OVERLAY.BAND_HEIGHT_PCT -
      B.CONTACT_BAND.HEIGHT_PCT);
    const bottom = Branding.layout(3, 1080, 1080, 'bottom-left');
    t.ok(bottom.boxes.every((b) => b.top + b.size <= bandTop),
      'a bottom corner is lifted clear of the text band — two things in one ' +
      'place is how a logo ends up sitting on a word');

    // A tall frame lays the marks out down the side, not across it.
    const story = Branding.layout(3, 1080, 1920, 'top-right');
    t.is(story.horizontal, false, 'a vertical asset stacks the marks vertically');
    t.ok(story.boxes.every((b) => b.left + b.size <= 1080),
      'and keeps them inside the narrow frame');

    t.is(Branding.layout(0, 1080, 1080, 'top-left').boxes, [],
      'no marks produce no boxes');

    // --- which corner ---
    t.is(Branding.cornerFor({ 'Reserved Logo Corner': 'bottom-right' }), 'bottom-right',
      "the Media Designer's reserved corner is used");
    t.is(Branding.cornerFor({}), B.PLACEMENT.FALLBACK_CORNER,
      'a row with no reserved corner falls back to the configured one');
    t.is(Branding.cornerFor({ 'Reserved Logo Corner': 'middle' }),
      B.PLACEMENT.FALLBACK_CORNER,
      'an unrecognised corner falls back rather than being trusted');
  }
};
