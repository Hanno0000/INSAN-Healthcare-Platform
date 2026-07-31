// PortfolioCritic — classifying how a post opens.
//
// Audit B measured that 88% of finished posts opened with one of five
// constructions. The critic detects them so a plan can be told before it is
// produced rather than after.
//
// The regression that matters: JavaScript's \b is defined on [A-Za-z0-9_], so
// it never matches at the edge of an Arabic word. Every pattern written as
// /^أصعب\b/ silently matched nothing and reported zero repetition — a detector
// that always says "all clear" is worse than no detector. The boundary is now
// "not followed by another Arabic letter".

module.exports = {
  name: 'opening formulas',

  run(t) {
    const classify = (line) => PortfolioCritic._classifyOpening(line);

    // --- the five constructions ---
    t.is(classify('أصعب لحظة تمر على أسرة'), 'superlative', 'superlative is detected');
    t.is(classify('لما تدخل المستشفى في نص الليل'), 'temporal', 'temporal is detected');
    t.is(classify('مش مجرد سرير في غرفة'), 'negation', 'negation is detected');
    t.is(classify('هل تعلم أن الرعاية المركزة'), 'question', 'question word is detected');
    t.is(classify('الطمأنينة تبدأ من أول كلمة؟'), 'question',
      'a question mark alone is enough, with no question word');

    // Order is a decision, not an accident: negation is tested before question,
    // so "مش مجرد ...؟" is filed as the negation formula it is built on rather
    // than as a question. Both labels are defensible; the point is that the
    // same line always gets the same one.
    t.is(classify('الرعاية المركزة مش مجرد أجهزة؟'), 'negation',
      'negation wins over a trailing question mark');
    t.is(classify('"الطمأنينة هي أول علاج"'), 'quotation', 'a quoted opening is detected');
    t.is(classify('«الطمأنينة هي أول علاج»'), 'quotation',
      'Arabic quotation marks count too');

    // --- the Arabic word-boundary regression ---
    // Both of these begin with the letters of a superlative. Only the first is
    // one. With \b, neither was detected; with a naive prefix test, both are.
    t.is(classify('أصعب لحظة'), 'superlative', 'أصعب as its own word is a superlative');
    t.is(classify('أصعبها على الأسرة هي الانتظار'), 'other',
      'أصعبها is a different word and is not counted as the same formula');
    t.is(classify('أهم من الجهاز هو الفريق'), 'superlative', 'أهم is a superlative');
    t.is(classify('أهمية التواصل مع الأسرة'), 'other',
      'أهمية is not أهم — the boundary holds');

    // --- spelling variants that a writer will actually produce ---
    t.is(classify('اصعب لحظة'), 'superlative', 'أ written as ا is still a superlative');
    t.is(classify('ازاي نطمن الأسرة'), 'question', 'ازاي without hamza is still a question');

    // --- the empty and the ordinary ---
    t.is(classify(''), 'none', 'an empty opening is none, not other');
    t.is(classify(null), 'none', 'a missing opening is none');
    t.is(classify('الفريق الطبي يبدأ يومه قبل الشروق'), 'other',
      'an opening that is not one of the five is other');

    // --- first line extraction ---
    t.is(PortfolioCritic._firstLine('\n\n  الفريق الطبي  \nسطر تاني'), 'الفريق الطبي',
      'the first non-empty line is the opening, trimmed');
    t.is(PortfolioCritic._firstLine('   \n  \n'), '', 'all-whitespace has no opening');
    t.is(PortfolioCritic._firstLine(null), '', 'missing copy has no opening');

    // --- stems: the formula nobody has named yet ---
    const stems = PortfolioCritic._openingStems([
      'في كل يوم نبدأ',
      'في كل يوم نستقبل',
      'في كل يوم يمر',
      'الفريق الطبي يبدأ'
    ]);
    t.is(stems['في كل'], 3, 'a repeated two-word stem is counted across openings');

    // --- counting and ranking ---
    const counts = PortfolioCritic._count(['question', 'question', 'other', 'question', 'temporal']);
    t.is(counts.question, 3, 'occurrences are counted');
    t.is(counts.temporal, 1, 'single occurrences are counted too');

    const top = PortfolioCritic._topEntries(counts, 2, 2);
    t.is(top.length, 1, 'a minimum threshold excludes what appears once');
    t.is(top[0].key, 'question', 'the most frequent is first');
    t.is(top[0].count, 3, 'and carries its count');

    // _dominant reports the leading construction and its share. It does not
    // decide whether that share is a problem — the digest and the prompt do,
    // which keeps the threshold in one place instead of two.
    t.is(PortfolioCritic._dominant({ question: 9, other: 1 }, 10),
      { key: 'question', count: 9, share: 90 },
      'the leading construction is reported with its share');
    t.is(PortfolioCritic._dominant({}, 10), null, 'nothing measured, nothing reported');
    t.is(PortfolioCritic._dominant({ question: 3 }, 0), null,
      'a zero-row plan reports nothing rather than dividing by zero');
  }
};
