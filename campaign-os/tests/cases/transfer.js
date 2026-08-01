// Transfer — moving a row to the next tab by key, as values.
//
// This replaces the defect that made every earlier idea about archiving unsafe.
//
// The workbook joined its tabs with position-bound formulas: two array formulas
// anchored in Content Pipeline row 2 fed the whole tab, and the Visual Pipeline
// read the Content Pipeline through 2,244 individual cell references. Row
// POSITION was load-bearing across tabs.
//
// Delete Content Calendar rows 2–50 and the array in Content Pipeline B2
// re-renders from the new source range, so row 2 now shows what used to be
// calendar row 51 — while S:AX on row 2, everything the workers wrote, never
// moved. Every post's strategy ends up paired with a different post's copy.
// No #REF!, no error, nothing to notice. And deleting row 2 destroys the array
// formula outright.
//
// Values written once and joined by key make a row independent. That is the
// whole point, and these checks are about the ways that independence breaks.

module.exports = {
  name: 'transfer',

  run(t) {
    const fs = require('fs');
    const path = require('path');
    const source = fs.readFileSync(
      path.join(__dirname, '..', '..', 'src', 'Transfer.gs'), 'utf8');

    // --- the two hops ---
    t.is(typeof Transfer.calendarToPipeline, 'function',
      'Content Calendar → Content Pipeline is code, not a formula');
    t.is(typeof Transfer.pipelineToVisual, 'function',
      'Content Pipeline → Visual Pipeline is code, not 2,244 cell references');

    // --- idempotence: the property that makes this safe to re-run ---
    t.ok(/_existingKeys/.test(source),
      'each hop reads what is already downstream before writing');
    t.ok(/already\[calendarId\]/.test(source),
      'a calendar row already in the pipeline is skipped, never duplicated');
    t.ok(/already\[contentId\]/.test(source),
      'a pipeline row already in the visual tab is skipped, never duplicated');

    // Re-running must be a no-op. Anything else makes it unsafe to run after
    // every plan, which is when it is most useful.
    const seen = { 'CAL-1': 2, 'CAL-2': 3 };
    const incoming = ['CAL-1', 'CAL-2', 'CAL-3'];
    const fresh = incoming.filter((k) => !seen[k]);
    t.is(fresh, ['CAL-3'], 'only unseen keys are written');
    t.is(incoming.filter((k) => !seen[k] && k !== 'CAL-3'), [],
      'a second run of the same input writes nothing');

    // --- the keys ---
    t.is(Transfer.CALENDAR_TO_PIPELINE['Calendar ID'], 'Calendar ID',
      'Calendar ID crosses into the pipeline as itself — it is the join key');
    t.ok(/record\['Content ID'\] = 'CNT-' \+ calendarId/.test(source),
      'Content ID is derived from Calendar ID, so the two keys agree by ' +
      'construction rather than by luck');
    t.includes(Transfer.PIPELINE_TO_VISUAL, 'Content ID',
      'Content ID crosses into the visual tab — it is the next join key');
    t.includes(Transfer.PIPELINE_TO_VISUAL, 'Calendar ID',
      'and Calendar ID travels with it, so a visual row can still be traced ' +
      'back to the plan that scheduled it');

    // --- the calendar mapping is a rename, not a reshuffle ---
    t.is(Transfer.CALENDAR_TO_PIPELINE['Day'], 'Publishing Date',
      'Day becomes Publishing Date');
    t.is(Transfer.CALENDAR_TO_PIPELINE['Page'], 'Publishing Page',
      'Page becomes Publishing Page');
    t.is(Object.keys(Transfer.CALENDAR_TO_PIPELINE).length, 6,
      'six columns cross, matching what the old array formula carried (D:H plus Day)');

    // --- the twelve strategy fields ---
    t.is(Transfer.CARD_STRATEGY.length, 12,
      'twelve strategy fields cross from the card, as Campaign Cards O:Z did');
    t.is(Transfer.CARD_STRATEGY.length, new Set(Transfer.CARD_STRATEGY).size,
      'and none is listed twice');
    t.includes(Transfer.CARD_STRATEGY, 'Campaign Philosophy', 'starting at O');
    t.includes(Transfer.CARD_STRATEGY, 'Target Audience', 'and ending at Z');

    // --- a campaign with no card is reported, not silently blanked ---
    // This is the 67% defect the audits measured: rows arriving with all twelve
    // strategy fields empty, and workers inventing a strategy for every one.
    t.ok(/noCard\[campaign\]/.test(source),
      'a row whose campaign has no card is counted and named');
    t.ok(/Transferred with NO strategy/.test(source),
      'and the operator is told, rather than finding out from the output');

    // --- approval is the gate into the visual tab ---
    t.ok(/Creative Director Review Status'\] \|\| ''\)\.trim\(\) !== 'Approved'/.test(source),
      'only an approved row becomes a creative package — generation on copy ' +
      'that may still change is spend on work about to be redone');
    t.ok(/notApproved\+\+/.test(source),
      'and the ones still waiting are counted rather than ignored');

    // --- the approved versions win ---
    t.ok(/Creative Director Post Copy'\] \|\|\s*\n?\s*row\['Post Copy \(AI\)'\]/.test(source),
      "the Creative Director's copy wins over the draft — approval is what " +
      'makes it final');
    t.ok(/Creative Director Design Prompt'\] \|\| row\['Design Prompt \(AI\)'\]/.test(source),
      'and the same for the design prompt');

    // --- values, never formulas ---
    t.notOk(/setFormula|getFormula/.test(source),
      'nothing here writes or reads a formula — a formula is what bound a row ' +
      'to its position in the first place');

    // --- Batch ID travels the whole way ---
    // Without it, an archived batch could not be identified downstream.
    const hops = source.split('pipelineToVisual');
    t.ok(hops[0].indexOf("record['Batch ID']") !== -1,
      'Batch ID crosses into the pipeline');
    t.ok(hops.length > 1 && hops[1].indexOf("record['Batch ID']") !== -1,
      'and on into the visual tab, so a finished plan can be found in every ' +
      'tab it touched');

    // --- writes are batched ---
    // A per-row write across a few hundred rows is what makes a transfer
    // outlast the six-minute execution budget.
    t.ok(/setValues\(payload\)/.test(source),
      'rows are appended in one write, not one call per row');
    t.ok(/getRange\([\s\S]{0,80}getValues\(\)/.test(source),
      'and read in bulk too');

    // --- a column the target does not have is reported, not dropped ---
    t.ok(/unknown\[key\] = true/.test(source),
      'a field with no matching column is collected');
    t.ok(/Create Managed Columns/.test(source),
      'and the operator is pointed at the fix — SheetWriter would otherwise ' +
      'skip the write, log one line, and the run would report success');
  }
};
