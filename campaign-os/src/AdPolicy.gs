// ================================
// META ADVERTISING POLICY — HARD RULES
//
// Every post this system produces is intended for paid promotion. That makes
// Meta's advertising policies a constraint on the WRITING, not a step someone
// checks afterwards — a rejected ad is discovered days later, and a pattern of
// rejections restricts the ad account itself.
//
// ------------------------------------------------------------------------
// WHY THIS IS A BLOCK OF TEXT AND NOT ONE SENTENCE
//
// "Comply with Facebook's advertising policies" is not enough. A model knows
// them approximately, and approximately is exactly where this fails: the rules
// that bite are specific, they are phrased in ways that do not survive
// translation into Arabic, and a near-miss reads as perfectly good copy.
//
// Pasting the whole policy is not the answer either. It runs to tens of
// thousands of words, most of it about cryptocurrency, weapons, dating and
// politics, and it changes faster than a cached prompt does.
//
// So this is the subset that actually applies to Arabic healthcare content on
// a Facebook page, written as rules rather than as a summary.
//
// ------------------------------------------------------------------------
// WHERE IT LIVES
//
// In code, injected into the static prefix of every worker that shapes what a
// post says or shows. Not a Drive document: a document can be edited by anyone,
// cached for six hours, or simply not uploaded — and a hard rule that silently
// fails to load is worse than no rule, because everything still looks fine.
//
// ------------------------------------------------------------------------
// THE ONE THE BRAND DOCUMENTS DO NOT COVER
//
// AI_CREATIVE_CONSTITUTION already forbids most of what Meta forbids: no fear
// marketing, no unproven claims, no "best hospital", no guarantees. The overlap
// is large and that is a good sign.
//
// It does not cover PERSONAL ATTRIBUTES, and that is the single most common
// reason healthcare ads are rejected. The rule is grammatical, not editorial:
// addressing the reader as though you know their condition. "Do you suffer from
// diabetes?" is refused; "care for people with diabetes" is not. Nothing in the
// brand documents would stop a writer producing the first one — and the ICU
// knowledge base, whose whole emotional strategy is families in distress, leans
// toward exactly that phrasing.
// ================================

var AdPolicy = {

  VERSION: '2026-08-02',

  // Workers that decide what a post says or shows. A worker not on this list
  // does not shape published content — the planner picks dates, the publisher
  // moves finished text.
  APPLIES_TO: [
    'CONTENT_STRATEGY_WORKER',
    'CONTENT_CREATION_WORKER',
    'CREATIVE_DIRECTOR_WORKER',
    'MEDIA_DESIGNER',
    'PAID_ADS_WORKER'
  ],

  appliesTo: function(workerName) {
    return this.APPLIES_TO.indexOf(String(workerName || '').toUpperCase()) !== -1;
  },

  // The block, as it appears in the prompt.
  block: function() {
    return [
      '=== META ADVERTISING POLICY — HARD RULES ===',
      '',
      'Every post produced here runs as a paid Facebook ad. These are not style',
      'preferences. An ad that breaks them is rejected, and a pattern of',
      'rejections restricts the advertising account itself.',
      '',
      'Where these and the creative documents disagree, these win.',
      '',
      '## 1. Personal attributes — the one that catches healthcare',
      '',
      'Never assert or imply that you know something about the reader: their',
      'health, condition, body, age, finances, or circumstances. This is about',
      'GRAMMAR, not tone. Addressing a condition in the second person breaks it',
      'even when the sentence is kind.',
      '',
      '  REFUSED   هل تعاني من آلام الظهر؟',
      '  REFUSED   علاجك من السكري يبدأ هنا',
      '  REFUSED   لأنك مريض بالقلب، نحن هنا',
      '  REFUSED   Do you suffer from diabetes?',
      '',
      '  ACCEPTED  رعاية متخصصة لمرضى السكري',
      '  ACCEPTED  مركز القلب يقدم رعاية متكاملة',
      '  ACCEPTED  آلام الظهر لها أسباب كثيرة — والتشخيص الصحيح يبدأ بالفحص',
      '',
      'The test: rewrite the sentence in the third person. If it still says what',
      'you meant, use the third person. If it only works in the second person,',
      'it is claiming to know the reader.',
      '',
      'This applies to the FAMILY as well. "عندما يدخل والدك العناية المركزة"',
      'assumes a fact about the reader. "عندما تدخل الأسرة إلى العناية المركزة"',
      'does not.',
      '',
      '## 2. No guaranteed or implied outcomes',
      '',
      'No cure, no recovery, no result, no timeframe — stated or implied.',
      'No "شفاء مضمون", no "نتائج مؤكدة", no "خلال أسبوع".',
      'Describe the care and the process. Never the outcome.',
      '',
      '## 3. No before-and-after, and no idealised bodies',
      '',
      'No before/after pairing of any kind, in copy or image. No implied',
      'transformation of a body. No imagery that presents a body as a problem to',
      'be fixed. This is refused outright and is the most common image rejection',
      'in healthcare.',
      '',
      '## 4. Nothing shocking, graphic or distressing',
      '',
      'No blood, wounds, surgery in progress, exposed anatomy, needles entering',
      'skin, patients in visible pain or fear, or medical imagery a person would',
      'not want to meet while scrolling. Clinical environments are fine; clinical',
      'distress is not.',
      '',
      '## 5. No unverifiable superlatives',
      '',
      'No "الأفضل", "الأول", "الأكبر", "الأشهر", "رقم واحد" without a stated,',
      'checkable source. Absent a source, the claim is refused — and this one is',
      'also a Strict Red Line in AI_CREATIVE_CONSTITUTION.',
      '',
      '## 6. Do not name or promote prescription medicines',
      '',
      'No drug names, no dosages, no pharmaceutical products. Treatments may be',
      'described as categories of care, not as products.',
      '',
      '## 7. Nothing that exploits fear',
      '',
      'No implied consequence of not acting. No countdown, no scarcity, no',
      '"قبل فوات الأوان". Urgency around health is read as exploitation of a',
      'vulnerable state, and it is refused whether or not it is true.',
      '',
      '## 8. Text on the image',
      '',
      'The system composites the headline and the contact strip and holds them',
      'inside the allowed share of the frame. Do not ask the image for further',
      'text, and do not write copy that only works if more text is drawn on it.',
      '',
      '=== END OF META ADVERTISING POLICY ==='
    ].join('\n');
  },

  // ------------------------------------------------------------- detection
  //
  // A cheap pass over finished Arabic or English copy for the patterns that are
  // mechanically detectable. It finds the shapes, not the meaning: a clean
  // result is not a guarantee of compliance, and it is reported rather than
  // used to block a row.
  //
  // Only the personal-attribute and guarantee patterns are reliable enough to
  // check this way. The rest need a reader.
  // JavaScript defines \b on [A-Za-z0-9_], so it never matches at the edge of
  // an Arabic word — /\bنضمن/ matches nothing, silently, and the check reports
  // all clear. This is the same defect START_HERE §7 records against the
  // portfolio critic, and writing these patterns reproduced it: three of the
  // four rules below were dead on arrival.
  //
  // The boundary that works is "not another Arabic letter".
  _AR_END: '(?![\\u0600-\\u06FF])',

  _ar: function(alternatives) {
    return new RegExp('(?:' + alternatives.join('|') + ')' + this._AR_END);
  },

  scan: function(text) {
    var value = String(text || '');

    if (!value.trim()) {
      return [];
    }

    var findings = [];

    var patterns = [
      {
        rule: 'personal attributes',
        why: 'addresses the reader as though their condition is known',
        tests: [
          /هل\s+(?:تعاني|تشكو|تشعر|تخاف|تبحث عن علاج)/,
          /(?:تعاني|تشكو)\s+من/,
          /لأنك\s+(?:مريض|تعاني|مصاب)/,
          this._ar(['مرضك', 'حالتك المرضية', 'علاجك', 'أعراضك', 'ألمك',
                    'وجعك', 'تعبك']),
          /\bdo you (?:suffer|have|struggle with)\b/i,
          /\byour (?:diabetes|cancer|condition|illness|symptoms|pain|disease)\b/i,
          /\bare you (?:diabetic|overweight|struggling)\b/i
        ]
      },
      {
        rule: 'guaranteed outcome',
        why: 'promises a medical result',
        tests: [
          /(?:شفاء|نتائج|علاج)\s+(?:مضمون|مضمونة|أكيد|مؤكدة)/,
          /نضمن\s+(?:لك|لكم|الشفاء|النتيجة)/,
          /\bguaranteed\s+(?:results?|recovery|cure)\b/i,
          /\b100%\s*(?:نجاح|شفاء|success|cure)/i
        ]
      },
      {
        rule: 'unverifiable superlative',
        why: 'a ranking claim with no stated source',
        tests: [
          // Both the article-prefixed and bare forms. Real copy says
          // "أفضل مستشفى" at least as often as "المستشفى الأفضل", and a
          // pattern that only knew the first would have passed it.
          this._ar(['الأفضل', 'أفضل', 'الأول', 'الأكبر', 'الأشهر', 'الأقوى',
                    'رقم\\s*1', 'رقم\\s*واحد']),
          /\b(?:best|number one|#1|leading)\s+hospital\b/i
        ]
      },
      {
        rule: 'fear or urgency',
        why: 'pressure around a health decision',
        tests: [
          /قبل\s+فوات\s+الأوان/,
          this._ar(['احجز الآن', 'احجز فوراً', 'سارع', 'لا تفوت', 'العرض ينتهي',
                    'آخر فرصة', 'لا تتأخر']),
          /\bbefore it(?:'| i)?s too late\b/i
        ]
      }
    ];

    for (var p = 0; p < patterns.length; p++) {
      for (var i = 0; i < patterns[p].tests.length; i++) {
        var match = patterns[p].tests[i].exec(value);

        if (match) {
          findings.push({
            rule: patterns[p].rule,
            why: patterns[p].why,
            found: match[0]
          });
          break;
        }
      }
    }

    return findings;
  },

  // Reports what the scan found. Never throws and never blocks: this catches
  // shapes, and a shape is evidence rather than proof. A row stopped by a
  // regex that misread a sentence costs a rewrite for nothing, while a row
  // flagged in the log costs a glance.
  report: function(workerName, rowNumber, values) {
    var fields = ['Creative Director Post Copy', 'Post Copy (AI)', 'Hook',
                  'Text On Design', 'Alternative Opening'];
    var seen = {};
    var all = [];

    for (var f = 0; f < fields.length; f++) {
      var findings = this.scan(values[fields[f]]);

      for (var i = 0; i < findings.length; i++) {
        var key = findings[i].rule + '|' + findings[i].found;

        if (seen[key]) {
          continue;
        }

        seen[key] = true;
        all.push(fields[f] + ': "' + findings[i].found + '" — ' +
          findings[i].rule + ', ' + findings[i].why);
      }
    }

    if (all.length) {
      Logger.log(
        'AD_POLICY | ' + workerName + ' | Row ' + rowNumber + ' | ' +
        all.length + ' possible breach(es). These posts run as paid ads and a ' +
        'pattern of rejections restricts the account:\n   ' + all.join('\n   ')
      );
    }

    return all;
  }
};
