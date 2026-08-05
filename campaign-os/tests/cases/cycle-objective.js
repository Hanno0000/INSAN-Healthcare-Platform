// What a cycle is FOR, as distinct from what a campaign IS.
//
// The operator plans the same campaign again months apart for different reasons:
// one cycle builds awareness, the next announces a new clinic, a third drives
// bookings before a season. The campaign card does not change between them —
// it describes the campaign permanently. The objective is what changes.
//
// Until 2026-08-05 there was nowhere to put it. The planner ASKED for an
// objective, used it to choose slots, and then dropped it: it was written to no
// column, so it never reached the Content Strategy Worker, which decided each
// row's Content Objective from the card alone — the same answer every month,
// whatever the operator had asked for.
//
// The path spans four files and no single one of them shows it works, which is
// why this suite exists: planner writes it → Transfer carries it → W3 reads it
// → the prompt tells W3 what to do with it. A break anywhere is silent, because
// a blank objective is legal.

module.exports = {
  name: 'cycle objective',

  run(t, fx) {
    // --- 1. the planner writes it on every row of the batch ---
    const written = [];
    const savedWrite = SheetWriter.writeCell;
    const savedNewId = Batches.newId;
    const savedDateFor = PlannerRunner._dateFor;
    const savedSheet = global.SpreadsheetApp;
    const savedUtilities = global.Utilities;
    const savedSession = global.Session;

    try {
      SheetWriter.writeCell = (row, column, value) => {
        written.push({ row, column, value });
        return true;
      };
      Batches.newId = () => 'BATCH-TEST';
      PlannerRunner._dateFor = () => new Date(2026, 7, 6);
      global.SpreadsheetApp = {
        getActiveSpreadsheet: () => ({ getSheetByName: () => ({ getLastRow: () => 1 }) })
      };
      global.Utilities = { formatDate: () => '20260806' };
      global.Session = { getScriptTimeZone: () => 'UTC' };

      PlannerRunner.write(
        [
          { day: 1, slot: 1, page: 'INSAN', campaign: 'ICU Center' },
          { day: 1, slot: 1, page: 'Delta', campaign: 'ICU Center' },
          { day: 2, slot: 1, page: 'Future', campaign: 'ICU Center' }
        ],
        { startDate: new Date(2026, 7, 6), objective: 'announce the new clinic' });

      const objectives = written.filter((w) => w.column === 'Cycle Objective');

      t.is(objectives.length, 3,
        'every row of the batch carries the objective — a row travels alone, ' +
        'and W3 reads one row at a time and never sees its batch');
      t.ok(objectives.every((o) => o.value === 'announce the new clinic'),
        'and every one carries the objective the operator actually stated');

      // A row must not be refused or left half-written when no objective was
      // given — planning without one is legal.
      written.length = 0;
      PlannerRunner.write(
        [{ day: 1, slot: 1, page: 'INSAN', campaign: 'ICU Center' }],
        { startDate: new Date(2026, 7, 6) });

      const blank = written.filter((w) => w.column === 'Cycle Objective');
      t.is(blank.length, 1, 'a plan with no objective still writes the column');
      t.is(blank[0].value, '', 'as an empty string, not the word "undefined"');

    } finally {
      SheetWriter.writeCell = savedWrite;
      Batches.newId = savedNewId;
      PlannerRunner._dateFor = savedDateFor;
      global.SpreadsheetApp = savedSheet;
      global.Utilities = savedUtilities;
      global.Session = savedSession;
    }

    // --- 2. Transfer carries it into the pipeline ---
    t.is(Transfer.CALENDAR_TO_PIPELINE['Cycle Objective'], 'Cycle Objective',
      'Transfer carries it forward under the same name');

    // --- 3. the Content Strategy Worker reads it ---
    const w3 = CONFIG.WORKERS.CONTENT_STRATEGY_WORKER;

    t.includes(w3.readColumns, 'Cycle Objective',
      'the Content Strategy Worker reads it — without this the whole path ends ' +
      'in a column nothing opens');

    // It must NOT be a required input. Every row planned before this existed
    // has a blank one, and those rows must still be workable.
    t.notOk((CONFIG.REQUIRED_INPUTS.CONTENT_STRATEGY_WORKER || [])
      .indexOf('Cycle Objective') !== -1,
      'and does not refuse a row that has none — rows planned before this ' +
      'existed carry a blank, and a blank objective is legal');

    // --- 4. both columns exist wherever the value has to land ---
    const managed = (CONFIG.MANAGED_COLUMNS || [])
      .filter((m) => m.column === 'Cycle Objective')
      .map((m) => m.sheet)
      .sort();

    t.is(managed, ['Content Calendar', 'Content Pipeline'],
      'Create Managed Columns makes the column on both sheets — writeCell skips ' +
      'a missing column with only a log line, so an unmanaged column is a value ' +
      'that vanishes without an error');

    // --- 5. the prompt tells the worker what to do with it ---
    // A column the worker receives and has no instruction about is a column it
    // will ignore, and the whole path would still measure as connected.
    const prompt = fx.repoFile('campaign-os/prompts/content/CONTENT_STRATEGY_WORKER.md');

    t.includes(prompt, 'Cycle Objective',
      'the worker prompt names the field');
    t.ok(/does \*\*not\*\* override the card|card wins/i.test(prompt),
      'and states that the card still wins — the objective selects within the ' +
      'campaign\'s permitted strategy rather than replacing it');
    t.ok(/empty/i.test(prompt),
      'and says what to do when it is empty, rather than leaving the worker to ' +
      'invent an objective from nothing');

    // --- the emphasis channel, which had the same shape of defect ---
    //
    // The planner's prompt has always been sent an `emphasis` line, and both
    // callers hardcoded it to '' — the channel existed and nothing filled it,
    // so it read "none stated" on every run ever made.
    const runner = fx.srcSection('WorkerRunner');
    const planning = fx.srcSection('PlannerRunner');

    t.includes(planning, 'brief.emphasis',
      'the planner still sends emphasis to the model');
    t.notOk(/emphasis:\s*''/.test(runner),
      'and no caller hardcodes it empty any more — that is what made it dead ' +
      'for every run the system has ever done');
  }
};
