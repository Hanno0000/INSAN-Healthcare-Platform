// Hospital Brand — the column that decides whether artwork carries any logos.
//
// It travels a long way for a value nothing used to write. The planner creates
// a calendar row; Transfer copies Hospital Brand into the Content Pipeline and
// then into the Visual Pipeline; `Branding.marksFor` reads it there and picks
// the logo set.
//
// An unrecognised brand gets NO marks rather than a default set — putting the
// wrong hospital's logo on a real hospital's post is worse than putting none.
// That is the right rule, and it is exactly what made the gap invisible: with
// nothing writing the column, every post came out unbranded and the only
// evidence was one line in the log.
//
// Measured 2026-08-02 against the live workbook: Content Calendar column H is
// Hospital Brand, it carries no formula, and `PlannerRunner.write` did not
// write it.

module.exports = {
  name: 'brand routing',

  run(t) {
    const sets = (CONFIG.BRANDING || {}).BRAND_SETS || {};
    const pages = (CONFIG.CONTROLLED_VOCABULARY || {})['Publishing Page'] || [];

    t.ok(pages.length >= 3, `the publishing pages are known — ${pages.join(', ')}`);
    t.ok(Object.keys(sets).length >= 3,
      `the brand sets are known — ${Object.keys(sets).join(', ')}`);

    // --- every page can be branded ---
    // This is the assumption the default rests on. If a page is ever added
    // without a matching brand set, this fails rather than quietly producing
    // unbranded posts for it.
    for (const page of pages) {
      t.is(PlannerRunner.brandFor(page), page,
        `a post on ${page} defaults to the ${page} brand, so its artwork gets marks`);
      t.ok(Branding.marksFor(PlannerRunner.brandFor(page)).length > 0,
        `and ${page} resolves to a real logo set`);
    }

    // --- the resolution is forgiving about case, and nothing else ---
    // The page vocabulary and the brand sets are maintained in two places.
    t.is(PlannerRunner.brandFor('delta'), 'Delta', 'case does not cost a post its logos');
    t.is(PlannerRunner.brandFor('  Future  '), 'Future', 'nor does a stray space');

    // --- but it never guesses ---
    t.is(PlannerRunner.brandFor('Nowhere Hospital'), '',
      'a page with no brand set returns blank rather than a guessed brand — ' +
      'the wrong hospital\'s logo on a real hospital\'s post is worse than none');
    t.is(PlannerRunner.brandFor(''), '', 'and so does an empty page');
    t.is(PlannerRunner.brandFor(null), '', 'and a missing one');

    // --- the column is actually written ---
    // The whole point. Checked by driving SheetWriter rather than by reading
    // the source: a check that greps for the string would pass on a commented
    // line.
    const written = {};
    const savedWrite = SheetWriter.writeCell;
    const savedNewId = Batches.newId;
    const savedDateFor = PlannerRunner._dateFor;
    const savedSheet = global.SpreadsheetApp;
    const savedUtilities = global.Utilities;
    const savedSession = global.Session;

    try {
      SheetWriter.writeCell = (row, column, value) => {
        written[column] = value;
      };
      Batches.newId = () => 'BATCH-TEST';
      PlannerRunner._dateFor = () => new Date(2026, 7, 3);
      global.SpreadsheetApp = {
        getActiveSpreadsheet: () => ({
          getSheetByName: () => ({ getLastRow: () => 1 })
        })
      };
      global.Utilities = { formatDate: () => '20260803' };
      global.Session = { getScriptTimeZone: () => 'UTC' };

      PlannerRunner.write(
        [{ day: 1, slot: 1, page: 'Delta', campaign: 'ICU Center', group: 'Medical' }],
        { startDate: new Date(2026, 7, 3) });

      t.is(written['Hospital Brand'], 'Delta',
        'planning a row writes Hospital Brand — without it Transfer carries a ' +
        'blank to the Visual Pipeline and every post comes out with no logos');

      // The rest of the row, so a future edit cannot drop one of these while
      // this suite is watching only the new column.
      for (const column of ['Day', 'Post Slot', 'Status', 'Calendar ID', 'Page',
                            'Campaign Name', 'Campaign Group', Batches.COLUMN]) {
        t.ok(written[column] !== undefined, `planning writes ${column}`);
      }

      t.is(written['Page'], 'Delta', 'the page is what was asked for');

      // A page with no brand set still plans — it just plans unbranded, and
      // says so. Refusing the row would be worse: the plan is fine, only the
      // marks are unknown.
      const second = {};
      SheetWriter.writeCell = (row, column, value) => { second[column] = value; };

      PlannerRunner.write(
        [{ day: 1, slot: 1, page: 'Nowhere', campaign: 'X' }],
        { startDate: new Date(2026, 7, 3) });

      t.is(second['Hospital Brand'], '',
        'an unknown page plans with a blank brand rather than a guessed one');
      t.is(second['Page'], 'Nowhere', 'and the row is still written');

    } finally {
      SheetWriter.writeCell = savedWrite;
      Batches.newId = savedNewId;
      PlannerRunner._dateFor = savedDateFor;
      global.SpreadsheetApp = savedSheet;
      global.Utilities = savedUtilities;
      global.Session = savedSession;
    }

    // --- and it survives the journey ---
    t.includes(Object.keys(Transfer.CALENDAR_TO_PIPELINE), 'Hospital Brand',
      'Transfer carries Hospital Brand from the calendar into the pipeline');
    t.includes(Transfer.PIPELINE_TO_VISUAL, 'Hospital Brand',
      'and from the pipeline into the Visual Pipeline, where Branding reads it');

    // --- the rule Branding enforces at the far end ---
    t.is(Branding.marksFor('Nowhere Hospital'), [],
      'an unrecognised brand gets no marks');
    t.is(Branding.marksFor(''), [], 'and neither does a blank one');
    t.ok(Branding.marksFor('Future').length > Branding.marksFor('INSAN').length,
      'a hospital carries more marks than the platform alone — INSAN plus its ' +
      'manager plus itself');
  }
};
