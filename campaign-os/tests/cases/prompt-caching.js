// Prompt caching — the claim that ~90% of the input is paid for once.
//
// Audit A measured 9.7M of 10.8M input tokens per plan as byte-identical across
// rows, and none of it cached: a timestamp on the third line of every prompt
// held the cacheable prefix to two lines. Every caching mechanism there is —
// Gemini implicit, Gemini explicit, Anthropic cache_control — matches a prefix
// from byte zero, so one changing line near the top costs the whole prefix.
//
// The timestamp is gone and the prompt is now assembled as a static prefix
// followed by the row's own material. This suite checks the property that makes
// that worth anything: THE PREFIX IS THE SAME BYTES ON EVERY ROW.
//
// It matters because the failure is silent and expensive. A row-dependent value
// leaking into the prefix does not break a run, does not fail a worker, and does
// not appear in any output. The only symptom is the bill, a month later.
//
// What this cannot check: whether the provider actually served the cache. That
// is the `Cached:` figure in the Execution Log after a real run —
// START_HERE §6.4 item 5.

module.exports = {
  name: 'prompt caching',

  run(t, fx) {
    // DriveLoader reaches Drive, which is stubbed to throw. Fixed text stands in
    // for the manuals and documents: their content does not matter here, only
    // that it is the same on every call.
    const savedPrompt = DriveLoader.loadPrompt;
    const savedMarkdown = DriveLoader.loadMarkdown;

    DriveLoader.loadPrompt = (name) => 'MANUAL FOR ' + name + '\n' + 'x'.repeat(400);
    DriveLoader.loadMarkdown = (name) => 'DOCUMENT ' + name + '\n' + 'y'.repeat(400);

    try {
      const worker = 'CONTENT_STRATEGY_WORKER';

      // --- the prefix does not depend on the row ---
      // Two rows with nothing in common.
      const rowA = {
        'Content ID': 'C-001', 'Campaign Name': 'ICU Center',
        'Publishing Page': 'INSAN', 'Hospital Brand': 'INSAN',
        'Core Message': 'ZZQQ_ROW_A_MARKER', 'Publishing Date': '2026-08-03'
      };
      const rowB = {
        'Content ID': 'C-999', 'Campaign Name': 'Delta Restore Trust',
        'Publishing Page': 'Delta', 'Hospital Brand': 'Delta',
        'Core Message': 'WWXX_ROW_B_MARKER', 'Publishing Date': '2026-12-25'
      };

      const prefixA = ContextBuilder.staticPrefixFor(worker);
      const prefixB = ContextBuilder.staticPrefixFor(worker);

      t.ok(prefixA.length > 500,
        `the static prefix is substantial — ${prefixA.length} characters. A near-empty ` +
        'prefix would compare equal to itself and prove nothing');
      t.is(prefixA === prefixB, true,
        'the static prefix is byte-identical between calls');

      // --- and the whole prompt really starts with it ---
      // Caching matches from byte zero. A prefix that is correct but not first
      // is a prefix that is never matched.
      const contextA = ContextBuilder.buildContext(worker, rowA, 5);
      const contextB = ContextBuilder.buildContext(worker, rowB, 91);

      t.is(contextA.indexOf(prefixA), 0,
        'the prompt begins with the static prefix — every caching mechanism ' +
        'matches from byte zero, so a prefix that is not first is never matched');
      t.is(contextB.indexOf(prefixA), 0, 'on a different row too');

      // --- nothing from the row leaks into it ---
      // This is the check that would have caught the timestamp, and it is the
      // one that catches the next thing like it.
      for (const marker of ['ZZQQ_ROW_A_MARKER', 'C-001', '2026-08-03']) {
        t.is(prefixA.indexOf(marker), -1,
          `the prefix carries nothing from the row — "${marker}" is absent`);
      }

      t.ok(contextA.indexOf('ZZQQ_ROW_A_MARKER') > prefixA.length,
        'and the row\'s own material sits after the prefix, where it belongs');

      // The two prompts differ, or the test above is comparing a constant with
      // itself and the row data never reached the model at all.
      t.ok(contextA !== contextB, 'two different rows produce two different prompts');

      // --- the prefix is most of the prompt ---
      // The whole economic case. With stand-in manuals it will not be the real
      // ~90%, but a prefix that had become a minority share would mean the
      // static/dynamic split had inverted.
      const share = Math.round((prefixA.length / contextA.length) * 100);
      t.ok(share >= 50,
        `the cacheable prefix is the bulk of the prompt — ${share}% here, with ` +
        'stand-in documents standing in for the real manuals');

      // --- the breakpoint and the prompt cannot disagree ---
      // Anthropic needs to be told where the reusable part ends. If that
      // boundary were computed a second time, from a parallel definition, it
      // would drift from the prompt it describes — and the failure of that is a
      // 100% miss rate that looks exactly like caching not working.
      const runner = fx.srcSection('WorkerRunner');
      t.includes(runner, 'ContextBuilder.staticPrefixFor(',
        'the cache breakpoint comes from the same function that builds the ' +
        'prefix, so the two cannot describe different boundaries');

      const provider = fx.srcSection('AIProvider');
      t.includes(provider, 'cache_control',
        'Anthropic is given a cache breakpoint — its caching is opt-in, and ' +
        'without the marker a perfectly cacheable prefix is never cached');
      t.includes(provider, '_splitOnPrefix',
        'and the request is split on that exact prefix');

      // Splitting a prompt into two blocks must not change a byte of what the
      // model reads: the blocks are concatenated in order. Asserted rather than
      // guarded — a check that quietly skips itself when the function moves is
      // no check at all.
      t.is(typeof ClaudeProvider._splitOnPrefix, 'function',
        'the split is where the caching path expects it');

      const split = ClaudeProvider._splitOnPrefix(contextA, prefixA);

      t.ok(split, 'the prompt splits on its own prefix');
      t.is(split.prefix + split.rest, contextA,
        'and reassembles exactly — the model reads the same bytes it would ' +
        'have read unsplit');
      t.is(split.prefix, prefixA, 'the cached block is the static prefix');

      // A prefix that is not actually a prefix must not be split on — silently
      // caching the wrong boundary would bill the write and never hit.
      t.notOk(ClaudeProvider._splitOnPrefix(contextA, 'NOT A PREFIX OF THIS'),
        'a prefix the prompt does not start with is refused rather than guessed at');
      t.notOk(ClaudeProvider._splitOnPrefix(contextA, ''),
        'and so is an empty one');

      // --- Gemini needs no marker, and that is the point of the ordering ---
      t.includes(provider, 'cachedContentTokenCount',
        'the Gemini response\'s cached-token count is read, so a run can be ' +
        'measured rather than assumed');
    } finally {
      DriveLoader.loadPrompt = savedPrompt;
      DriveLoader.loadMarkdown = savedMarkdown;
    }
  }
};
