// PORTFOLIO CRITIC — I1
//
// Every worker in this system sees exactly one row. That is correct for the
// decisions each worker owns, and it is why nothing could see that 88% of
// finished posts opened with one of five constructions, that 79% were
// carousels, that the funnel had one stage, or that the same campaign ran on
// two pages in the same week. Each post, read alone, was good.
//
// Those are not four defects. They are one blindness expressed in four columns.
// (Audit B, findings B1, B2, B4, B5 and B6.)
//
// This reads the whole plan once, before production spends anything on it.
//
//   one call per plan          ~15,000 tokens
//   against 132 rows           ~10,800,000 tokens
//
// Arithmetic is settled in code and judgement is left to the model. The same
// division AssetIntegrity applies before Visual QA: a grader asked about
// composition reports on composition, and a model asked to count will
// approximate. Counting is not a judgement call.

var PortfolioCritic = {

  WORKER_NAME: 'PORTFOLIO_CRITIC',

  _config: function() {
    return CONFIG.PORTFOLIO_CRITIC || {};
  },

  // ------------------------------------------------------------- measuring

  _firstLine: function(text) {
    var value = String(text || '').trim();

    if (!value) {
      return '';
    }

    var lines = value.split('\n');

    for (var i = 0; i < lines.length; i++) {
      var line = lines[i].trim();
      if (line) {
        return line;
      }
    }

    return '';
  },

  // The five constructions Audit B measured across the finished posts. Kept
  // because they are the known failure, not because they are the only one —
  // see _openingStems, which finds formulas nobody has named yet.
  // \b is defined on [A-Za-z0-9_], so it never matches at the edge of an Arabic
  // word — every pattern written with it silently matched nothing. The boundary
  // here is "not followed by another Arabic letter", which is the real one.
  _ARABIC_BOUNDARY: '(?![\\u0600-\\u06FF])',

  _startsWith: function(text, words) {
    return new RegExp('^(' + words.join('|') + ')' + this._ARABIC_BOUNDARY).test(text);
  },

  _classifyOpening: function(line) {
    if (!line) {
      return 'none';
    }

    var text = line.trim();

    if (/^["'«“”„‘]/.test(text)) {
      return 'quotation';
    }

    if (this._startsWith(text,
        ['أصعب', 'اصعب', 'أهم', 'اهم', 'أخطر', 'اخطر', 'أقوى', 'اقوى',
         'أكتر', 'أكثر', 'اكتر', 'أجمل', 'اجمل', 'أسوأ', 'اسوأ', 'أطول', 'اطول'])) {
      return 'superlative';
    }

    if (this._startsWith(text,
        ['لما', 'لمّا', 'قبل ما', 'بعد ما', 'أول ما', 'اول ما',
         'في اللحظة', 'ساعة ما', 'وقت ما', 'لحظة', 'يوم ما'])) {
      return 'temporal';
    }

    if (this._startsWith(text, ['مش', 'ليس', 'ليست', 'مو']) ||
        /(مش|ليس)\s+مجرد/.test(text)) {
      return 'negation';
    }

    if (/[?؟]/.test(text) ||
        this._startsWith(text,
          ['هل', 'إيه', 'ايه', 'ليه', 'إزاي', 'ازاي', 'ماذا', 'كيف', 'لماذا',
           'مين', 'مَن', 'إمتى', 'امتى', 'فين', 'أمتى'])) {
      return 'question';
    }

    return 'other';
  },

  // The first two words of every opening, counted. This catches the formula
  // that has not been named yet — the five patterns above were derived from one
  // sample of 33 posts and a portfolio will invent new ones.
  _openingStems: function(openings) {
    var stems = {};

    for (var i = 0; i < openings.length; i++) {
      var words = String(openings[i]).replace(/[«»"'“”.,!?؟]/g, ' ')
        .split(/\s+/).filter(function(w) { return w; });

      if (words.length < 2) {
        continue;
      }

      var stem = words[0] + ' ' + words[1];
      stems[stem] = (stems[stem] || 0) + 1;
    }

    return stems;
  },

  _count: function(values) {
    var counts = {};

    for (var i = 0; i < values.length; i++) {
      var key = String(values[i] || '').trim() || '(blank)';
      counts[key] = (counts[key] || 0) + 1;
    }

    return counts;
  },

  _topEntries: function(counts, limit, minimum) {
    var entries = [];

    for (var key in counts) {
      if (counts[key] >= (minimum || 1)) {
        entries.push({ key: key, count: counts[key] });
      }
    }

    entries.sort(function(a, b) { return b.count - a.count; });
    return entries.slice(0, limit || 10);
  },

  // Reads the plan and settles everything a number can settle.
  measure: function(startRow, endRow) {
    var sheetName = CONFIG.SHEET_NAME;
    var rows = [];

    for (var row = startRow; row <= endRow; row++) {
      var data = SheetSchema.getRowData(row, sheetName);

      // A row with no campaign is an empty calendar slot, not a plan entry.
      if (!String(data['Campaign Name'] || '').trim()) {
        continue;
      }

      var copy = String(data['Creative Director Post Copy'] || '').trim() ||
        String(data['Post Copy (AI)'] || '').trim();

      rows.push({
        row: row,
        campaign: String(data['Campaign Name'] || '').trim(),
        page: String(data['Publishing Page'] || '').trim(),
        date: data['Publishing Date'],
        format: String(data['Content Format'] || '').trim(),
        type: String(data['Content Type'] || '').trim(),
        funnel: String(data['Content Funnel Stage'] || '').trim(),
        objective: String(data['Content Objective'] || '').trim(),
        cta: String(data['CTA Strategy'] || '').trim(),
        opening: this._firstLine(copy),
        alternative: this._firstLine(data['Alternative Opening']),
        hasCopy: !!copy
      });
    }

    var written = rows.filter(function(r) { return r.hasCopy; });
    var openings = written.map(function(r) { return r.opening; });

    // Openings by construction.
    var formulaCounts = {};
    for (var i = 0; i < openings.length; i++) {
      var kind = this._classifyOpening(openings[i]);
      formulaCounts[kind] = (formulaCounts[kind] || 0) + 1;
    }

    var formulaic = 0;
    for (var kind2 in formulaCounts) {
      if (kind2 !== 'other' && kind2 !== 'none') {
        formulaic += formulaCounts[kind2];
      }
    }

    // Openings that are the same, or nearly. Near-duplicates matter more than
    // exact ones: r14 and r17 in the audit were not identical, they were the
    // same post wearing two words of difference, on two pages of one ecosystem.
    var seen = {};
    var duplicates = [];

    for (var d = 0; d < written.length; d++) {
      var head = written[d].opening.substring(0, 30);

      if (!head) {
        continue;
      }

      if (seen[head] !== undefined) {
        duplicates.push({
          rows: [seen[head].row, written[d].row],
          pages: [seen[head].page, written[d].page],
          opening: written[d].opening.substring(0, 70)
        });
      } else {
        seen[head] = written[d];
      }
    }

    // The same campaign twice on one page on one day, which the planner is
    // supposed to prevent and currently nothing checks.
    var slots = {};
    var clashes = [];

    for (var c = 0; c < rows.length; c++) {
      var day = rows[c].date instanceof Date
        ? Utilities.formatDate(rows[c].date, Session.getScriptTimeZone(), 'yyyy-MM-dd')
        : String(rows[c].date || '').trim();

      if (!day || !rows[c].page) {
        continue;
      }

      var slotKey = day + ' | ' + rows[c].page + ' | ' + rows[c].campaign;

      if (slots[slotKey]) {
        clashes.push({ day: day, page: rows[c].page, campaign: rows[c].campaign });
      } else {
        slots[slotKey] = true;
      }
    }

    return {
      total: rows.length,
      written: written.length,
      unwritten: rows.length - written.length,
      formulas: formulaCounts,
      formulaicShare: written.length
        ? Math.round((formulaic / written.length) * 100) : 0,
      stems: this._topEntries(this._openingStems(openings), 8, 2),
      duplicates: duplicates,
      formats: this._count(rows.map(function(r) { return r.format; })),
      types: this._count(rows.map(function(r) { return r.type; })),
      funnel: this._count(rows.map(function(r) { return r.funnel; })),
      objectives: this._count(rows.map(function(r) { return r.objective; })),
      ctas: this._count(rows.map(function(r) { return r.cta; })),
      pages: this._count(rows.map(function(r) { return r.page; })),
      campaigns: this._count(rows.map(function(r) { return r.campaign; })),
      clashes: clashes,
      withAlternative: written.filter(function(r) { return r.alternative; }).length
    };
  },

  // --------------------------------------------------------------- reading

  _dominant: function(counts, total) {
    var top = this._topEntries(counts, 1)[0];

    if (!top || !total) {
      return null;
    }

    return { key: top.key, count: top.count, share: Math.round((top.count / total) * 100) };
  },

  // Everything a number can answer, answered — so the model spends its
  // attention on what the numbers mean rather than on producing them.
  _digest: function(m) {
    var lines = [];
    var self = this;

    function distribution(label, counts, total) {
      var entries = self._topEntries(counts, 8);
      var parts = [];

      for (var i = 0; i < entries.length; i++) {
        parts.push(entries[i].key + ' ' + entries[i].count +
          ' (' + Math.round((entries[i].count / total) * 100) + '%)');
      }

      lines.push(label + ': ' + parts.join(' · '));
    }

    lines.push('PLAN SIZE');
    lines.push('rows in plan: ' + m.total + ' | copy written: ' + m.written +
      ' | not yet written: ' + m.unwritten);
    lines.push('');

    lines.push('OPENINGS  (measured across the ' + m.written + ' rows that have copy)');
    lines.push('share opening with a known formula: ' + m.formulaicShare + '%');
    distribution('by construction', m.formulas, Math.max(m.written, 1));

    if (m.stems.length) {
      var stemParts = [];
      for (var s = 0; s < m.stems.length; s++) {
        stemParts.push('"' + m.stems[s].key + '" ×' + m.stems[s].count);
      }
      lines.push('repeated opening stems: ' + stemParts.join(' · '));
    } else {
      lines.push('repeated opening stems: none');
    }

    if (m.duplicates.length) {
      lines.push('near-identical openings: ' + m.duplicates.length);
      for (var d = 0; d < Math.min(m.duplicates.length, 6); d++) {
        var dup = m.duplicates[d];
        lines.push('  rows ' + dup.rows.join(' and ') +
          ' [' + dup.pages.join(' / ') + ']: "' + dup.opening + '"');
      }
    } else {
      lines.push('near-identical openings: none');
    }

    lines.push('second openings available: ' + m.withAlternative + ' of ' + m.written);
    lines.push('');

    lines.push('SHAPE OF THE PLAN');
    distribution('format', m.formats, m.total);
    distribution('content type', m.types, m.total);
    distribution('funnel stage', m.funnel, m.total);
    distribution('objective', m.objectives, m.total);
    distribution('CTA', m.ctas, m.total);
    lines.push('');

    lines.push('DISTRIBUTION');
    distribution('page', m.pages, m.total);
    distribution('campaign', m.campaigns, m.total);

    if (m.clashes.length) {
      lines.push('same campaign twice on one page on one day: ' + m.clashes.length);
      for (var c = 0; c < Math.min(m.clashes.length, 6); c++) {
        lines.push('  ' + m.clashes[c].day + ' — ' + m.clashes[c].page +
          ' — ' + m.clashes[c].campaign);
      }
    } else {
      lines.push('same campaign twice on one page on one day: none');
    }

    return lines.join('\n');
  },

  _buildPrompt: function(digest) {
    var staticPart = [
      'You are executing inside the INSAN Healthcare AI Operating System.',
      'Worker: ' + this.WORKER_NAME,
      '',
      'You are the only worker that sees the whole plan.',
      '',
      'Every other worker in this system reads one row. That is deliberate and',
      'it is why nobody noticed that 88% of finished posts opened with one of',
      'five constructions, that 79% were carousels, and that the funnel had one',
      'stage. Each post, read alone, was good. The feed was formulaic.',
      '',
      'You are given measurements, not posts. The counting is already done and',
      'it is correct — do not re-derive it, do not estimate, and do not dispute',
      'a number. Your job is what the numbers mean and what to do about them.',
      '',
      '=== WHAT MATTERS ===',
      '',
      'A reader meets this plan as a feed, in order, at two or three posts a',
      'day. Judge it the way they will experience it:',
      '',
      '- Repetition is the primary defect. Two posts that open the same way on',
      '  two pages of one ecosystem are one post published twice.',
      '- Concentration is the second. A plan that is 79% one format is a plan',
      '  a reader stops seeing.',
      '- A funnel with one stage never asks for anything, or asks every time.',
      '- A campaign clustered into three consecutive days is exhausted by day',
      '  four and absent for the rest of the month.',
      '- Balance across the three pages is an ecosystem question, not a',
      '  scheduling one: INSAN, Future and Delta build one brand together.',
      '',
      'Be specific and be brief. Name the rows. An observation that does not',
      'name what to change is not worth the call.',
      '',
      'Do not praise the plan. If something is genuinely fine, say nothing',
      'about it — the operator is reading this to find what needs work.',
      '',
      '=== OUTPUT FORMAT ===',
      '',
      'Return a single valid JSON object. No markdown fences, no text around it.',
      '',
      '{',
      '  "verdict": "one sentence: is this plan publishable as it stands?",',
      '  "findings": [',
      '    {',
      '      "severity": "high | medium | low",',
      '      "what": "the problem, in one sentence, with the number",',
      '      "where": "rows or pages affected",',
      '      "fix": "the specific change to make"',
      '    }',
      '  ],',
      '  "strongest": "the single most valuable change, if only one is made"',
      '}',
      '',
      'At most six findings. Fewer is better if fewer are real.',
      '',
      '=== END OF OUTPUT FORMAT ==='
    ].join('\n');

    var dynamicPart = [
      '=== MEASUREMENTS ===',
      '',
      digest,
      '',
      '=== END OF MEASUREMENTS ==='
    ].join('\n');

    return { prompt: staticPart + '\n\n' + dynamicPart, staticPart: staticPart };
  },

  // -------------------------------------------------------------- the entry

  review: function(startRow, endRow) {
    var startTime = new Date().getTime();
    var config = this._config();

    var measured = this.measure(startRow, endRow);

    if (!measured.total) {
      throw new Error(
        'No plan rows found between ' + startRow + ' and ' + endRow +
        '. A row needs a Campaign Name to count as part of the plan.'
      );
    }

    var digest = this._digest(measured);
    var built = this._buildPrompt(digest);

    var response = AIProvider.call(built.prompt, {
      temperature: config.temperature,
      provider: config.provider || undefined,
      model: config.model || undefined,
      cachePrefix: built.staticPart
    });

    var parsed = this._parse(response.text);
    var runtime = new Date().getTime() - startTime;

    Logger.logSuccess(
      this.WORKER_NAME, startRow, runtime,
      response.inputTokens, response.outputTokens,
      'Reviewed ' + measured.total + ' rows (' + measured.written + ' with copy) | ' +
      'Formulaic openings: ' + measured.formulaicShare + '% | ' +
      'Findings: ' + (parsed.findings || []).length +
      ' | ' + AIProvider.cacheSummary(response)
    );

    return { measured: measured, digest: digest, review: parsed };
  },

  _parse: function(text) {
    var cleaned = String(text).trim();

    if (cleaned.indexOf('```') === 0) {
      cleaned = cleaned.replace(/^```(json)?/, '').replace(/```$/, '').trim();
    }

    var first = cleaned.indexOf('{');
    var last = cleaned.lastIndexOf('}');

    if (first === -1 || last <= first) {
      throw new Error(
        'The portfolio critic returned no JSON. Response began: ' +
        cleaned.substring(0, 200)
      );
    }

    return JSON.parse(cleaned.substring(first, last + 1));
  }
};
