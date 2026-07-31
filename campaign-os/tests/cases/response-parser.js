// ResponseParser — turning a model's reply into values the sheet will accept.
//
// Audit A measured 19 failures where a worker wrote a valid value that the
// sheet's dropdown rejected. Half of that is fixed by syncing the dropdowns
// from CONFIG; the other half is here — recognising that "Approved." and
// "approved" are the vocabulary's `Approved`, and that a word nobody has
// heard of should be kept and flagged rather than silently coerced.

module.exports = {
  name: 'response parser',

  run(t) {
    // --- getting JSON out of whatever the model wrapped it in ---
    const clean = (s) => ResponseParser._cleanResponseText(s);

    t.is(clean('{"a":1}'), '{"a":1}', 'bare JSON is left alone');
    t.is(clean('```json\n{"a":1}\n```'), '{"a":1}', 'a json fence is stripped');
    t.is(clean('```\n{"a":1}\n```'), '{"a":1}', 'a bare fence is stripped');
    t.is(clean('Here you go:\n{"a":1}\nHope that helps!'), '{"a":1}',
      'prose either side of the object is discarded');
    t.is(clean('   \n  {"a":1}  \n '), '{"a":1}', 'whitespace is trimmed');

    const extract = (s) => ResponseParser._extractJSON(s);

    t.is(extract('{"Hook":"مرحبا"}'), { Hook: 'مرحبا' }, 'Arabic values survive');
    t.is(extract('preamble {"a":1} postamble'), { a: 1 },
      'an object embedded in prose is recovered');
    t.is(extract('not json at all'), null, 'unparseable text yields null, not a throw');
    t.is(extract('{"a":1'), null, 'a truncated object yields null');
    t.is(extract(''), null, 'empty yields null');

    // A truncated response is the one that matters: a model cut off mid-object
    // must not produce a half-filled row that looks complete.
    t.is(extract('{"Hook":"مرحبا","Post Copy":"نص طوي'), null,
      'a response cut off mid-string is refused rather than half-parsed');

    // --- controlled vocabulary ---
    const check = (field, value) => ResponseParser._validateControlledField(field, value);

    const decisions = CONFIG.CONTROLLED_VOCABULARY['Visual QA Decision'];
    t.ok(decisions && decisions.length, 'Visual QA Decision has a vocabulary');

    const exact = check('Visual QA Decision', 'Approved');
    t.is(exact.value, 'Approved', 'an exact match passes through');
    t.is(exact.wasCorrected, false, 'and is not reported as a correction');

    const lower = check('Visual QA Decision', 'approved');
    t.is(lower.value, 'Approved', 'a case difference is corrected to the vocabulary');
    t.is(lower.wasCorrected, true, 'and the correction is reported');

    const spaced = check('Visual QA Decision', '  Approved  ');
    t.is(spaced.value, 'Approved', 'padding is corrected');

    const nonsense = check('Visual QA Decision', 'Sparkling');
    t.is(nonsense.value, 'Sparkling', "a word nobody recognises is kept as the worker wrote it");
    t.is(nonsense.isOutOfVocabulary, true, 'and flagged as out of vocabulary');

    const unknownField = check('A Field With No Vocabulary', 'anything');
    t.is(unknownField.value, 'anything', 'an unconstrained field is untouched');
    t.is(unknownField.wasCorrected, false, 'and reports no correction');

    // --- the near-match machinery under it ---
    t.is(ResponseParser._editDistance('approved', 'approved'), 0,
      'identical strings have no distance');
    t.is(ResponseParser._editDistance('aproved', 'approved'), 1,
      'one missing letter is a distance of one');
    t.is(ResponseParser._similarity('approved', 'approved'), 1,
      'identical strings are fully similar');
    t.ok(ResponseParser._similarity('approved', 'rejected') < 0.6,
      'two different decisions are not similar enough to be confused');

    // This is the guard that matters most: "Rejected" must never be corrected
    // into "Approved". A near-match that crosses a decision boundary would
    // publish artwork that failed QA.
    const rejected = check('Visual QA Decision', 'Rejected');
    t.is(rejected.value, 'Rejected', 'Rejected stays Rejected');

    const rejectedTypo = check('Visual QA Decision', 'rejcted');
    t.ok(rejectedTypo.value !== 'Approved',
      'a typo in Rejected is never corrected into Approved');
  }
};
