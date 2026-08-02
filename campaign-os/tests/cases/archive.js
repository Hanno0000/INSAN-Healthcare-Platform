// Archive — joining a finished plan into one sheet, then removing it.
//
// A post's life is spread across four tabs: what was scheduled, what was
// written, what was produced, what was advertised. Archiving joins those into
// ONE row, with each fact stored once, and then deletes the originals.
//
// This is the only code in the system that removes a row from a tab a worker
// reads, and it is safe only because Transfer.gs replaced the position-bound
// formulas that used to join the tabs. The guard that enforces that is the most
// important thing here.

module.exports = {
  name: 'archive',

  run(t, fx) {
    const source = fx.srcSection('Archive');

    // --- the guard that makes everything else safe ---
    t.is(typeof Archive.assertNoTransferFormulas, 'function',
      'archiving checks for transfer formulas before it does anything');

    t.ok(/getFormulas\(\)/.test(source),
      'and checks by reading the sheet, not by trusting a config flag');

    const runBody = /run: function\(batchId\) \{([\s\S]*?)\n  \}\n\};/.exec(source);
    t.ok(runBody, 'Archive.run is readable');

    const body = runBody ? runBody[1] : '';

    // Present, and before the deletion. Checking only the ORDER of the two
    // passes when the guard is absent entirely — indexOf returns -1, which is
    // less than everything.
    t.ok(body.indexOf('assertNoTransferFormulas') !== -1,
      'Archive.run calls the formula guard');
    t.ok(body.indexOf('assertNoTransferFormulas') !== -1 &&
         body.indexOf('assertNoTransferFormulas') < body.indexOf('deleteRow'),
      'and calls it before any deletion');

    const menu = /function archiveFinishedPlan\(\)([\s\S]*)$/.exec(source);
    t.ok(menu && menu[1].indexOf('assertNoTransferFormulas') !== -1,
      'and the menu checks too, so the operator is told before choosing a batch');

    // --- deletion order: furthest downstream first ---
    t.is(Archive.ORDER, ['ADS', 'VISUAL', 'PIPELINE', 'CALENDAR'],
      'rows are removed furthest-downstream first, so nothing is ever left ' +
      'holding a key to a row that has already gone');

    t.ok(Archive.ORDER.indexOf('VISUAL') < Archive.ORDER.indexOf('PIPELINE'),
      'the Visual Pipeline goes before the Content Pipeline it keys off');
    t.ok(Archive.ORDER.indexOf('PIPELINE') < Archive.ORDER.indexOf('CALENDAR'),
      'and the Content Pipeline before the calendar it keys off');
    t.ok(Archive.ORDER.indexOf('ADS') === 0,
      'the Ads Pipeline is furthest downstream and goes first');
    t.is(Archive.ORDER.length, 4,
      'all four tabs a post touches are archived — the ads tab was the one ' +
      'easiest to forget');

    // --- deletion direction ---
    t.ok(/sort\(function\(a, b\) \{ return b - a; \}\)/.test(source),
      'rows are deleted bottom-up, so removing one does not invalidate the ' +
      'index of the next');

    const bottomUp = [10, 11, 12].slice().sort((a, b) => b - a);
    t.is(bottomUp, [12, 11, 10], 'the sort really is descending');

    // --- write before delete, and count before trusting ---
    t.ok(body.indexOf('setValues(payload)') < body.indexOf('deleteRow'),
      'the joined rows are written before anything is deleted');
    t.ok(/landed !== payload\.length/.test(body),
      'the write is counted, not assumed — a short write throws');
    t.ok(/Nothing has \n?\s*'?\+?\s*'?been removed|been removed from the working tabs/.test(body),
      'and says plainly that nothing was deleted when it throws');

    // --- one sheet, one row per post, each fact once ---
    t.is(Archive.SHEET_NAME, 'Archive',
      'everything lands in one sheet, not one mirror per tab');
    t.is(Archive.STAMP, 'Archived At', 'and every archived row records when');

    t.is(typeof Archive.columns, 'function',
      'the archive builds its own column order');

    // The dedup is a guard clause, not just a variable that happens to be
    // named `seen`. Matching the name alone still passes when the guard is
    // removed, because `seen[label] = true` is left behind.
    t.ok(/if \(seen\[label\]\) \{\s*\n\s*continue;/.test(source),
      'a column already contributed by an earlier tab is skipped — Calendar ID ' +
      'and Campaign Name appear once in the joined row, not four times');

    t.ok(/prefix: 'Ad '/.test(source),
      'where two tabs genuinely mean different things by the same name, the ' +
      'later one is prefixed rather than dropped');

    t.ok(/hideSheet\(\)/.test(source),
      'the archive is hidden — it is storage, not a place to work');

    // --- the joins are on identity, never position ---
    t.ok(/Calendar ID/.test(source) && /Content ID/.test(source),
      'the four tabs are joined on Calendar ID and Content ID');
    t.notOk(/startRow \+ i/.test(source),
      'nothing in the archive assumes two tabs are aligned by row offset');

    // --- what counts as finished ---
    const finished = (planned, inVisual, published) =>
      planned > 0 && inVisual === planned && published === planned;

    t.is(finished(21, 21, 21), true, 'every row live means finished');
    t.is(finished(21, 21, 20), false, 'one unpublished row means not finished');
    t.is(finished(21, 20, 20), false,
      'a row that never reached the Visual Pipeline means not finished');
    t.is(finished(0, 0, 0), false, 'an empty batch is not "finished"');

    t.ok(/unstamped/.test(source),
      'rows planned before Batch ID existed are never offered — there is no ' +
      'recorded boundary, so archiving them would mean archiving "everything ' +
      'before some point nobody wrote down"');

    // --- confirmation ---
    t.ok(/getResponseText\(\)\)\.trim\(\) !== batchId/.test(source),
      'the operator types the batch id — a yes/no on the only destructive ' +
      'operation in the system is too cheap');

    t.ok(/preview: function/.test(source) &&
         /var preview = this\.preview\(batchId\)/.test(source),
      'the confirmation and the action read the same preview, so they cannot ' +
      'disagree about what is about to happen');

    // --- nothing else touches the archive sheet ---
    // By section rather than by file: Archive shares a file with eight other
    // sources now, and a check that excused only its own filename would excuse
    // all nine.
    const openers = [];
    const sections = fx.srcSections();

    for (const [name, text] of Object.entries(sections)) {
      if (name === 'Archive.gs') continue;

      if (/getSheetByName\([^)]*Archive/i.test(text) ||
          /Archive\.(SHEET_NAME|_mirror|columns|collect)/.test(text)) {
        openers.push(name);
      }
    }

    t.ok(Object.keys(sections).length > 25,
      `every source is readable as a section — found ${Object.keys(sections).length}, ` +
      `and a scan over none of them would report no openers`);

    t.is(openers, [],
      'no other file opens the archive sheet — a second copy of the same rows ' +
      'that something reads is a second source of truth');

    // --- the offer after planning never breaks the plan it follows ---
    const runner = fx.srcSection('WorkerRunner');
    const offer = /function _offerToArchive\(ui\) \{([\s\S]*?)\n\}/.exec(runner);

    t.ok(offer, 'the planner offers archiving after a cycle lands');
    t.ok(offer && /try \{/.test(offer[1]) && /catch \(e\)/.test(offer[1]),
      'and the offer cannot fail a plan that was written successfully');
    t.ok(offer && /if \(!candidates\.length\) \{\s*return;/.test(offer[1]),
      'and stays silent when nothing is finished — a prompt that usually has ' +
      'no answer trains the operator to dismiss it unread');
  }
};
