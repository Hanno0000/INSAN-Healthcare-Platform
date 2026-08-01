// AdPolicy — Meta's advertising rules, as a constraint on the writing.
//
// Every post this system produces runs as a paid ad. A rejection is discovered
// days later, and a pattern of them restricts the ad account itself, so the
// rules have to reach the workers that write — not a reviewer afterwards.
//
// The rule the brand documents do not cover is PERSONAL ATTRIBUTES: addressing
// the reader as though their condition is known. It is the most common cause of
// healthcare ad rejection, it is grammatical rather than editorial, and nothing
// in AI_CREATIVE_CONSTITUTION would stop a writer producing it.
//
// The detection here finds shapes, not meaning. It is deliberately advisory.

module.exports = {
  name: 'ad policy',

  run(t, fx) {
    // --- who is bound ---
    for (const worker of ['CONTENT_STRATEGY_WORKER', 'CONTENT_CREATION_WORKER',
                          'CREATIVE_DIRECTOR_WORKER', 'MEDIA_DESIGNER',
                          'PAID_ADS_WORKER']) {
      t.ok(AdPolicy.appliesTo(worker), `${worker} is bound by the ad policy`);
    }

    // Workers that move finished work rather than shape it are not bound —
    // adding the block to them would pay for it on every row for nothing.
    for (const worker of ['VISUAL_QA_WORKER', 'CAMPAIGN_PLANNER',
                          'PUBLISHING_WORKER']) {
      t.notOk(AdPolicy.appliesTo(worker),
        `${worker} does not shape what a post says, so it is not bound`);
    }

    t.ok(AdPolicy.appliesTo('content_creation_worker'),
      'the check is case-insensitive');

    // --- the block reaches the prompt ---
    const block = AdPolicy.block();

    t.ok(block.length > 1500, 'the block is substantive, not a single sentence');
    t.ok(block.length < 8000,
      'and compact — pasting the whole policy would be tens of thousands of ' +
      'words, mostly about crypto, weapons and dating');

    t.includes(block.toLowerCase(), 'personal attributes',
      'it names the rule the brand documents do not cover');
    t.includes(block, 'هل تعاني', 'and shows a refused Arabic phrasing');
    t.includes(block, 'رعاية متخصصة لمرضى السكري',
      'and the accepted third-person rewrite beside it');
    t.includes(block, 'these win',
      'and states that it overrides the creative documents where they disagree');

    for (const rule of ['guaranteed', 'before-and-after', 'superlative',
                        'prescription', 'fear']) {
      t.includes(block.toLowerCase(), rule,
        `the block covers ${rule}`);
    }

    // --- the \b trap, which this file walked into ---
    // JavaScript defines \b on [A-Za-z0-9_], so it never matches at the edge of
    // an Arabic word. START_HERE §7 records this against the portfolio critic,
    // and three of the four rules here were dead on arrival for the same reason.
    //
    // Read by section rather than by path. These scans are claims about this body of
    // code — pointed at a whole merged file they would start reporting on the
    // regex literals of everything AdPolicy happens to sit beside.
    const source = fx.srcSection('AdPolicy');

    // Only regex literals, not the comment that explains the trap — which
    // contains both \b and Arabic and matched a looser check.
    const literals = source.split('\n')
      .filter((line) => !line.trim().startsWith('//'))
      .flatMap((line) => line.match(/\/(?![\/*])(?:\\.|\[[^\]]*\]|[^\/\n\\])+\/[gimsuy]*/g) || []);

    t.ok(literals.length > 5, 'the scan patterns are readable as regex literals');

    // \b is only dead where it sits against an Arabic letter. `\b100%` is fine —
    // the boundary is against an ASCII digit — so the rule is adjacency, not
    // "this regex contains both".
    const deadBoundary = literals.filter((r) =>
      /\\b[؀-ۿ]/.test(r) || /[؀-ۿ]\\b/.test(r));

    t.is(deadBoundary, [],
      'no \\b sits against an Arabic letter — JavaScript defines it on ' +
      '[A-Za-z0-9_], so there it matches nothing, silently, and the check then ' +
      'reports all clear');

    // Written as a string that becomes the lookahead, so the source carries the
    // doubled backslashes.
    t.includes(source, '(?![\\\\u0600-\\\\u06FF])',
      'the Arabic boundary is the "not another Arabic letter" lookahead');

    // --- violations are found ---
    const flags = (text) => AdPolicy.scan(text).map((f) => f.rule);

    t.includes(flags('هل تعاني من آلام الظهر؟'), 'personal attributes',
      'the classic healthcare rejection is caught');
    t.includes(flags('علاجك يبدأ من هنا'), 'personal attributes',
      'a possessive about the reader\'s condition is caught');
    t.includes(flags('لأنك مريض بالقلب، نحن هنا'), 'personal attributes',
      'and a causal claim about the reader');
    t.includes(flags('Do you suffer from diabetes?'), 'personal attributes',
      'in English too');
    t.includes(flags('your diabetes is manageable'), 'personal attributes',
      'including the English possessive');

    t.includes(flags('نضمن لك الشفاء خلال أسبوع'), 'guaranteed outcome',
      'a promised recovery is caught');
    t.includes(flags('نتائج مضمونة'), 'guaranteed outcome', 'and a promised result');
    t.includes(flags('guaranteed recovery'), 'guaranteed outcome', 'in English');

    // Both forms. Real copy says "أفضل مستشفى" at least as often as
    // "المستشفى الأفضل", and a pattern that knew only one would pass the other.
    t.includes(flags('أفضل مستشفى في مصر'), 'unverifiable superlative',
      'a bare superlative is caught');
    t.includes(flags('المستشفى الأفضل في الدلتا'), 'unverifiable superlative',
      'and the article-prefixed form');
    t.includes(flags('best hospital in Egypt'), 'unverifiable superlative',
      'and in English');

    t.includes(flags('احجز الآن قبل فوات الأوان'), 'fear or urgency',
      'urgency around a health decision is caught');
    t.includes(flags('آخر فرصة'), 'fear or urgency', 'and scarcity');

    // --- clean copy stays clean ---
    // A false positive costs a rewrite for nothing, so these matter as much.
    const clean = [
      'رعاية متخصصة لمرضى السكري',
      'عندما تدخل الأسرة إلى العناية المركزة، نحن معها',
      'مركز القلب يقدم رعاية متكاملة',
      'آلام الظهر لها أسباب كثيرة — والتشخيص الصحيح يبدأ بالفحص',
      'نحن نضمن التزامنا بالمعايير',
      'فريق طبي متكامل يعمل على مدار الساعة',
      'Comprehensive care for people with diabetes'
    ];

    for (const line of clean) {
      t.is(AdPolicy.scan(line), [],
        `clean copy is not flagged: "${line.substring(0, 40)}"`);
    }

    t.is(AdPolicy.scan(''), [], 'empty text yields nothing');
    t.is(AdPolicy.scan(null), [], 'missing text yields nothing');

    // --- the third-person test the block teaches ---
    // The same fact, said two ways. One is refused and one is not, and the
    // difference is only the person.
    t.ok(AdPolicy.scan('هل تعاني من السكري؟').length > 0 &&
         AdPolicy.scan('رعاية لمرضى السكري').length === 0,
      'the same fact in the third person passes where the second person fails ' +
      '— which is the whole rule');

    // --- reporting, not blocking ---
    const found = AdPolicy.report('CREATIVE_DIRECTOR_WORKER', 42, {
      'Creative Director Post Copy': 'هل تعاني من آلام الظهر؟',
      'Hook': 'أفضل مستشفى'
    });

    t.ok(found.length >= 2, 'every field carrying a breach is reported');
    t.ok(found.some((f) => f.indexOf('Creative Director Post Copy') !== -1),
      'and the field is named');

    t.is(AdPolicy.report('CREATIVE_DIRECTOR_WORKER', 42, {
      'Creative Director Post Copy': 'رعاية متخصصة لمرضى السكري'
    }), [], 'clean copy reports nothing');

    // Never throws and never blocks: a shape is evidence, not proof, and a row
    // stopped by a regex that misread a sentence costs a rewrite for nothing.
    const runner = fx.srcSection('WorkerRunner');
    t.includes(runner, 'AdPolicy.report(',
      'the scan runs at the Creative Director gate');
    t.notOk(/throw[^\n]*AdPolicy/.test(runner),
      'and nothing throws on it');

    // --- it is in the cached prefix, and in the image path ---
    const context = fx.srcSection('ContextBuilder');
    const prefix = /staticPrefixFor: function\(workerName\) \{([\s\S]*?)\n  \},/
      .exec(context);

    t.ok(prefix && prefix[1].indexOf('_buildAdPolicy') !== -1,
      'the block sits in the CACHED prefix — identical every row, so it is ' +
      'paid for once rather than per row');
    t.ok(prefix && prefix[1].indexOf('_buildAdPolicy') <
                   prefix[1].indexOf('_buildProjectDocs'),
      'and before the creative documents it overrides');

    const designer = fx.srcSection('MediaDesigner');
    t.includes(designer, 'AdPolicy.block()',
      'the image path carries it too — before/after pairings and distressing ' +
      'clinical imagery are IMAGE rejections, not copy ones');
  }
};
