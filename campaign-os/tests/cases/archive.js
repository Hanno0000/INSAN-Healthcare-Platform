// Archive — moving a finished plan out of the working sheets.
//
// This is the only code in the system that deletes a row from a sheet the
// workers read. Everything here is about the two ways that goes wrong.
//
// ONE — order. The Visual Pipeline reads the Content Pipeline through 2,244
// direct cell references (`'Content Pipeline'!AB100`), not a lookup. Delete a
// Content Pipeline row and every Visual Pipeline formula pointing below it
// silently re-points one row up. It does not fail; it starts reading a
// different post's data and nothing looks wrong. So the referencing sheet is
// always emptied before the sheet it references.
//
// TWO — direction. Deleting top-down shifts every row underneath, so the second
// index in the list is already wrong by the time it is used.

module.exports = {
  name: 'archive',

  run(t) {
    const source = require('fs').readFileSync(
      require('path').join(__dirname, '..', '..', 'src', 'Archive.gs'), 'utf8');

    // --- deletion order ---
    t.is(Archive.ORDER, ['VISUAL', 'PIPELINE', 'CALENDAR'],
      'the Visual Pipeline is emptied first, before the Content Pipeline rows ' +
      'its 2,244 formulas point at');

    t.ok(Archive.ORDER.indexOf('VISUAL') < Archive.ORDER.indexOf('PIPELINE'),
      'a referencing sheet is never deleted after the sheet it references');
    t.ok(Archive.ORDER.indexOf('PIPELINE') < Archive.ORDER.indexOf('CALENDAR'),
      'and the calendar, which nothing references by position, goes last');

    // --- deletion direction ---
    t.ok(/sort\(function\(a, b\) \{ return b - a; \}\)/.test(source),
      'rows are deleted bottom-up, so removing one does not invalidate the ' +
      'index of the next');

    const bottomUp = [10, 11, 12].slice().sort((a, b) => b - a);
    t.is(bottomUp, [12, 11, 10], 'the sort really is descending');

    // --- copy before delete, and count before trusting ---
    const runBody = /run: function\(batchId\) \{([\s\S]*?)\n  \}/.exec(source);
    t.ok(runBody, 'Archive.run is readable');

    const body = runBody ? runBody[1] : '';
    t.ok(body.indexOf('_copy') < body.indexOf('_remove'),
      'every copy happens before any delete');
    t.ok(/landed !== step\.count/.test(body),
      'the copy is counted, not assumed — a short copy throws');
    t.ok(/Nothing has been removed/.test(body),
      'and says plainly that nothing was deleted when it throws');

    // --- values, not formulas ---
    t.ok(/getValues\(\)/.test(source) && !/getFormulas\(\)/.test(source),
      'archived rows carry values, not formulas — a copied formula would keep ' +
      'pointing at the live sheet and change meaning when anything moved');

    // --- what counts as finished ---
    // Archiving work in progress removes it from under the workers mid-way.
    const finished = (planned, inVisual, published) =>
      planned > 0 && inVisual === planned && published === planned;

    t.is(finished(21, 21, 21), true, 'every row live means finished');
    t.is(finished(21, 21, 20), false, 'one unpublished row means not finished');
    t.is(finished(21, 20, 20), false,
      'a row that never reached the Visual Pipeline means not finished');
    t.is(finished(0, 0, 0), false, 'an empty batch is not "finished"');

    t.ok(/unstamped/.test(source),
      'rows planned before Batch ID existed are never offered — there is no ' +
      'recorded boundary to trust, and archiving them would mean archiving ' +
      '"everything before some point nobody wrote down"');

    // --- the archive sheets ---
    t.is(Archive.SUFFIX, ' Archive', 'the mirror name is the sheet plus a suffix');
    t.is(Archive.STAMP, 'Archived At', 'and every archived row records when');

    t.ok(/hideSheet\(\)/.test(source),
      'archive sheets are hidden — they are storage, not a place to work');

    // No worker may open an archive sheet. A second copy of the same rows that
    // something reads is a second source of truth, and the whole point of
    // hiding these is that they are storage nothing acts on.
    //
    // Reading Archive.candidates/progress/preview from the menu is the intended
    // API and not what this is looking for — those compute, they do not open.
    const fs = require('fs');
    const path = require('path');
    const srcDir = path.join(__dirname, '..', '..', 'src');
    const openers = [];

    for (const file of fs.readdirSync(srcDir).filter((f) => f.endsWith('.gs'))) {
      if (file === 'Archive.gs') continue;

      const text = fs.readFileSync(path.join(srcDir, file), 'utf8');

      // Opening one by name, or reaching for the machinery that moves rows.
      if (/getSheetByName\([^)]*Archive/i.test(text) ||
          /Archive\.(SUFFIX|_mirror|_copy|_remove)/.test(text)) {
        openers.push(file);
      }
    }

    t.is(openers, [], 'no other file opens an archive sheet or moves rows into one');

    // The one file that may is the one that owns the concept.
    t.ok(/getSheetByName\(mirrorName\)/.test(source),
      'Archive.gs is where an archive sheet is opened');

    // --- confirmation ---
    t.ok(/getResponseText\(\)\)\.trim\(\) !== batchId/.test(source),
      'the operator types the batch id to confirm — a yes/no on the only ' +
      'destructive operation in the system is too cheap');

    t.ok(/preview: function/.test(source),
      'there is a preview that computes the numbers without acting on them');
    t.ok(/var preview = this\.preview\(batchId\)/.test(source),
      'and the run uses that same preview, so the confirmation and the action ' +
      'cannot disagree');

    // --- the offer never breaks the plan it follows ---
    const runner = fs.readFileSync(path.join(srcDir, 'WorkerRunner.gs'), 'utf8');
    const offer = /function _offerToArchive\(ui\) \{([\s\S]*?)\n\}/.exec(runner);

    t.ok(offer, 'the planner offers archiving after a cycle lands');
    t.ok(offer && /try \{/.test(offer[1]) && /catch \(e\)/.test(offer[1]),
      'and the offer cannot fail a plan that was written successfully');
    t.ok(offer && /if \(!candidates\.length\) \{\s*return;/.test(offer[1]),
      'and stays silent when nothing is finished — a prompt that usually has ' +
      'no answer trains the operator to dismiss it unread');
  }
};
