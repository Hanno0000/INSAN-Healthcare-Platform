// CardBuilder's validation gate — what may become a campaign card.
//
// Run against the real knowledge files, not fixtures. A gate that passes on a
// hand-made sample and fails on the repository is worth nothing.
//
// The defect this protects against was found on 2026-07-30: a card filed under
// the entity's name instead of the campaign's is correct in every field and
// joined to nothing. ICU's card would have served none of its 11 scheduled
// slots.

const K = 'business/knowledge/';

module.exports = {
  name: 'knowledge gate',

  run(t, fx) {
    // --- front matter ---
    const icu = fx.repoFile(K + 'departments/MEDICAL_DEPARTMENT_ICU.md');
    const fm = CardBuilder.parseFrontMatter(icu);

    t.is(fm.entity_id, 'MED-001', 'ICU front matter carries its entity id');
    t.is(fm.entity_name_en, 'Intensive Care Unit', 'ICU entity name is the unit');
    t.is(fm.service_level, 'DEPARTMENT',
      'ICU is a DEPARTMENT, not a Center, whatever its campaign is called');

    t.ok(fm.entity_name_en !== fm.campaign_name,
      'the entity name and the campaign name differ — the whole reason campaign_name exists');
    t.is(CardBuilder.campaignNameFor(fm), fm.campaign_name,
      'the card is filed under the campaign name');

    // Nested list items belong to the key above them and are not card inputs.
    t.is(fm['- ICU Awareness Campaign'], undefined,
      'indented list items are not read as front-matter keys');

    // --- ICU is the reference implementation and must stay buildable ---
    //
    // It is 2,773 lines and every required section is written. It matters more
    // than any other single file for two reasons: it is the one card proven to
    // build, and its structure is the template every other knowledge file is
    // written against — so a change to its shape propagates into every file
    // written afterwards.
    //
    // That is not hypothetical. On 2026-08-06 it was replaced by a 233-line
    // rewrite (d0e9c4f) that dropped five of the seventeen required sections,
    // and the eight centre files created after it inherited the broken shape.
    // Restored 2026-08-07, keeping the two renames that were correct: the
    // Arabic name and the campaign name.
    const icuCheck = CardBuilder.validate(icu, 'MEDICAL_DEPARTMENT_ICU.md');

    t.is(icuCheck.problems, [], 'ICU has no structural problems');
    t.is(icuCheck.gaps, [], 'ICU has no unresolved operator markers');
    t.ok(icuCheck.ok, 'ICU may build a card');

    // The structure IS the template, so its size is load-bearing. A 233-line
    // ICU is the shape of the failure, not a tidier version of the same file.
    t.ok(icu.split('\n').length > 2000,
      `ICU is the full reference file — ${icu.split('\n').length} lines. A short ` +
      'one means it has been replaced by a skeleton again, which is how eight ' +
      'other files were written against the wrong shape');

    // --- a file that is structurally complete but waiting on the operator ---
    // Held against a file that IS structurally complete, so the distinction
    // between "missing a section" and "waiting on a fact" stays checkable while
    // ICU is mid-rewrite.
    const emergency = fx.repoFile(K + 'departments/MEDICAL_DEPARTMENT_ER.md');
    const emCheck = CardBuilder.validate(emergency, 'MEDICAL_DEPARTMENT_ER.md');

    t.is(emCheck.problems, [], 'Emergency is structurally complete');
    t.ok(emCheck.gaps.length > 0, 'Emergency still carries operator markers');
    t.notOk(emCheck.ok, 'Emergency is refused — a marker blocks the build');
    t.ok(emCheck.gaps.every((g) => g.section && g.line),
      'every gap names the section and the line it is on');

    // --- and one file that passes the gate outright ---
    // The suite needs a known-good example and ICU is no longer one.
    const good = fx.repoFile(K + 'programs/PROGRAM_KABARONA.md');
    const goodCheck = CardBuilder.validate(good, 'PROGRAM_KABARONA.md');

    t.is(goodCheck.problems, [], 'Kabarona has no structural problems');
    t.is(goodCheck.gaps, [], 'and no unresolved operator markers');
    t.ok(goodCheck.ok, 'so it may build a card — the gate passes something');

    // --- the front matter a card cannot be built without ---
    const noLevel = icu.replace(/^service_level:.*$/m, 'x_service_level: DEPARTMENT');
    const noLevelCheck = CardBuilder.validate(noLevel, 'test.md');
    t.notOk(noLevelCheck.ok, 'a file with no service_level is refused');
    t.ok(noLevelCheck.problems.some((p) => p.indexOf('service_level') !== -1),
      'and the refusal names service_level');

    const badLevel = icu.replace(/^service_level:.*$/m, 'service_level: WARD');
    t.ok(CardBuilder.validate(badLevel, 'test.md').problems
      .some((p) => p.indexOf('WARD') !== -1),
      'a service_level outside the vocabulary is refused by value');

    // --- every ready file in the repository passes the gate ---
    // KNOWLEDGE_BASE_SPEC §7.8 claims 24 files build a card and 2 are waiting.
    // This is that claim, checked.
    const ready = [];
    const blocked = [];
    const broken = [];
    const byCampaign = {};
    const byEntityId = {};
    const misnumbered = [];

    // Sections that are a way of SAYING something already in the file, rather
    // than a fact only the hospital owner holds. Used for the questions
    // document's split, below.
    const WRITTEN_BY_US = [
      'vision', 'mission', 'marketing objectives', 'core promise',
      'human insight', 'emotional strategy', 'audience psychology',
      'narrative themes', 'content pillars', 'storytelling opportunities',
      'call to action', 'offer rules', 'can promise', 'brand perception',
      'relationship with insan', 'specialized clinics'
    ];

    let gapTotal = 0;
    let gapOurs = 0;
    const gapFiles = new Set();

    const encodingDamage = [];

    // ONE pass over the knowledge base. These files live on a Google Drive
    // mount where a read is a network round trip — four separate loops over
    // forty files took the suite from 4 seconds to 340.
    for (const rel of listKnowledgeFiles()) {
      const content = fx.repoFile(rel);
      const name = rel.split('/').pop();
      const result = CardBuilder.validate(content, name);

      // --- encoding damage ---
      //
      // A BOM sits BEFORE the opening `---`, so parseFrontMatter's ^--- never
      // matches and the file silently yields no entity_id, no campaign_name and
      // no service_level. Every worker downstream gets nothing, and the file
      // still looks perfectly normal in an editor.
      //
      // This happened on 2026-08-08. Editing two files with PowerShell's
      // Get-Content -Raw read them as the system ANSI codepage, so the Arabic
      // came back misinterpreted; Set-Content -Encoding utf8 then wrote it out
      // double-encoded and added a BOM. Both files were corrupt and every other
      // check in this suite passed.
      const bytes = fx.repoBytes(rel);
      if (bytes[0] === 0xEF && bytes[1] === 0xBB && bytes[2] === 0xBF) {
        encodingDamage.push(name + ': UTF-8 BOM before the front matter');
      }

      // Double-encoded Arabic. Arabic sits in UTF-8 as a lead byte D8–DB
      // followed by a continuation byte 80–BF; misread as Latin-1 those become
      // Ø-Û followed by a C1 control character, so the giveaway is that PAIR
      // repeating. The first version of this looked for adjacent Ø/Ù and could
      // not fail — the lead bytes never adjoin, they alternate with the
      // continuation byte between them.
      if (/(?:[Ø-Û][-¿]){3,}/.test(content)) {
        encodingDamage.push(name + ': Arabic appears double-encoded');
      }

      if (result.problems.length) broken.push(name + ': ' + result.problems[0]);
      else if (result.gaps.length) blocked.push(name);
      else ready.push(name);

      const front = CardBuilder.parseFrontMatter(content);
      const campaign = CardBuilder.campaignNameFor(front);
      if (campaign) (byCampaign[campaign] = byCampaign[campaign] || []).push(name);
      if (front.entity_id) {
        (byEntityId[front.entity_id] = byEntityId[front.entity_id] || []).push(name);
      }

      const numbered = {};
      let heading = '';

      for (const line of content.split(/\r?\n/)) {
        const h = /^#{1,6}\s+(.+)/.exec(line);
        if (h) {
          heading = h[1].trim().replace(/^[\d.]+\s*/, '');
          const n = /^#{2,4}\s+(\d+\.\d+)\s+(\S.*)$/.exec(line);
          if (n) (numbered[n[1]] = numbered[n[1]] || []).push(n[2].trim());
        }

        if (line.indexOf('NEEDS-OPERATOR') === -1) continue;
        gapTotal++;
        gapFiles.add(rel);
        if (WRITTEN_BY_US.indexOf(heading.toLowerCase()) !== -1) gapOurs++;
      }

      for (const [num, titles] of Object.entries(numbered)) {
        if (titles.length > 1) misnumbered.push(`${name} §${num}: ${titles.join(' / ')}`);
      }
    }

    t.is(encodingDamage.sort(), [],
      'no knowledge file is encoding-damaged — a BOM lands before the opening ' +
      '--- so the front matter stops parsing, and the file looks fine in an ' +
      'editor while every worker downstream gets no entity_id at all');

    // --- one campaign_name, one file ---
    //
    // campaign_name is the join key the whole pipeline turns on: the card is
    // filed under it and Transfer looks the campaign up by it once per
    // scheduled post. Two files claiming one key is not a naming untidiness —
    // it means whichever builds SECOND overwrites the first's card, and both
    // builds report success. Nothing downstream can see that it happened.
    //
    // This is not hypothetical. MEDICAL_CENTER_GENERAL_SURGERY.md (CEN-004) and
    // MEDICAL_SERVICE_GENERAL_SURGERY.md (MED-007) both declared
    // `General Surgery Center` until 2026-08-07, and it was found by reading the
    // files rather than by anything failing.
    const dupCampaigns = Object.entries(byCampaign)
      .filter(([, files]) => files.length > 1)
      .map(([campaign, files]) => `${campaign} <- ${files.sort().join(' + ')}`);

    t.is(dupCampaigns.sort(), [],
      'no two knowledge files claim the same campaign_name — it is the pipeline ' +
      'join key, so a duplicate means one card silently overwrites the other ' +
      'and both builds report success');

    // Same rule for entity_id, which is the registry's join key rather than the
    // sheet's. A file carrying an id that belongs to a different entity joins
    // this file's content to that entity everywhere the registry is consulted.
    const dupIds = Object.entries(byEntityId)
      .filter(([, files]) => files.length > 1)
      .map(([id, files]) => `${id} <- ${files.sort().join(' + ')}`);

    t.is(dupIds.sort(), [],
      'and no two claim the same entity_id — the registry\'s join key');

    // --- one number, one heading ---
    //
    // A script that adds missing sections in bulk cannot see that the number it
    // writes is already taken. Commit 333c090 inserted an empty `### 1.3 Vision`
    // directly above the existing `### 1.3 Mission` in eight files at once, so
    // two headings carried one number, Vision read as empty everywhere, and a
    // bare [TBD] sat above real mission text.
    //
    // The gate did not catch it because CardBuilder matches headings by TEXT,
    // not by number — so nothing failed while eight files the operator is about
    // to fill in by hand carried a mangled outline. This is the check that would
    // have caught it, and it costs nothing to keep.
    t.is(misnumbered.sort(), [],
      'no knowledge file gives one section number to two headings — bulk ' +
      'section-insertion cannot see the number it writes is taken, and headings ' +
      'match by text so nothing else would fail');

    // --- the questions document counts what is actually missing ---
    //
    // NEEDS_OPERATOR_QUESTIONS.md is worked from by a real person: the operator
    // sends its batches to the hospital owner over WhatsApp and files the
    // answers back. It opens by stating how many gaps there are and how they
    // split between "only he knows" and "we write this ourselves".
    //
    // Those numbers go stale the moment a gap is filled, and a stale number in
    // a document someone is working from is worse than no number — it is the
    // one thing in the file nobody re-derives. So they are counted here.
    //
    const questions = fx.repoFile('business/knowledge/NEEDS_OPERATOR_QUESTIONS.md');
    const stated = (label) => {
      const m = new RegExp(label + '[^0-9]{0,40}(\\d+)').exec(questions);
      return m ? Number(m[1]) : null;
    };

    t.is(stated('الإجمالي'), gapTotal,
      `the questions document states the real gap total (${gapTotal})`);
    t.is(stated('منهم للمالك'), gapTotal - gapOurs,
      `and the real number only the hospital owner can answer (${gapTotal - gapOurs})`);
    t.is(stated('والباقي'), gapOurs,
      `and the real number we write ourselves (${gapOurs})`);
    t.is(stated('فجوة في'), gapFiles.size,
      `and the number of files carrying a gap (${gapFiles.size})`);

    // Files known to be deliberately incomplete — waiting on facts only the
    // operator has, marked rather than invented. Adding a new one here is
    // adding a name to this list, not a defect in the file: the whole point of
    // the gate is that it can be blocked on purpose.
    //
    // Re-baselined 2026-08-07 after the knowledge base was reorganised on
    // 2026-08-06: eight MEDICAL_CENTER_* files added, ICU and Emergency renamed
    // to MEDICAL_DEPARTMENT_*, Internal Medicine & Cardiology folded into
    // MEDICAL_CENTER_CARDIAC_INTERNAL_MEDICINE.md.
    // MEDICAL_SERVICE_GENERAL_SURGERY.md was on this list until 2026-08-07 and
    // no longer exists. It declared `campaign_name: General Surgery Center` —
    // the same join key as MEDICAL_CENTER_GENERAL_SURGERY.md — so whichever of
    // the two built second silently overwrote the other's card. The brand owner
    // ruled the entity is a Center; the file was merged into CEN-004's and
    // deleted. `identifiers.js` holds the rule that no two files may share a
    // campaign_name, so this cannot recur silently.
    const KNOWN_BLOCKED = [
      'HOSPITAL_DELTA.md',
      'MEDICAL_DEPARTMENT_ER.md',

      // The eight centers added 2026-08-06. Every one is a real, deliberate
      // gap — several are nearly empty skeletons (Urology 20 markers,
      // Pediatrics 19, ENT 17), which is the correct state for a file that has
      // been created but not yet filled from the operator's recordings.
      'MEDICAL_CENTER_BARIATRIC.md',
      'MEDICAL_CENTER_CARDIAC_INTERNAL_MEDICINE.md',
      'MEDICAL_CENTER_ENT.md',
      'MEDICAL_CENTER_GENERAL_SURGERY.md',
      'MEDICAL_CENTER_PEDIATRICS.md',
      'MEDICAL_CENTER_PROCTOLOGY.md',
      'MEDICAL_CENTER_UROLOGY.md',
      'MEDICAL_CENTER_WOMENS_HEALTH.md',

      // PROG-003, created 2026-08-08. The registry had listed a Check-up
      // Programs campaign from the beginning with no file behind it. All
      // seventeen required sections pass; it is blocked on prices, which do not
      // exist for any of the four programmes.
      'PROGRAM_CHECKUP.md'
    ];

    // ⚠️ STRUCTURALLY broken is worse than blocked: a gap is a fact nobody has
    // supplied yet, a missing required section is a file that does not have the
    // shape of a knowledge file at all.
    //
    //   MEDICAL_SERVICE_OUTPATIENT_CLINICS.md  missing Why This Service Exists
    //
    // Held as an exact list so a second one cannot join it quietly. ICU was on
    // this list between 2026-08-06 and 2026-08-07 and is not any more.
    const KNOWN_BROKEN = [
      'MEDICAL_SERVICE_OUTPATIENT_CLINICS.md'
    ];

    t.is(broken.map((b) => b.split(':')[0]).sort(), [...KNOWN_BROKEN].sort(),
      'one knowledge file is structurally broken — Outpatient Clinics, missing ' +
      'Why This Service Exists. A new name here is a file that lost a required ' +
      'section, which is how eight centre files inherited a broken shape');
    t.is(ready.length, 24, '24 knowledge files build a card');
    t.is(blocked.sort(), [...KNOWN_BLOCKED].sort(),
      `exactly ${KNOWN_BLOCKED.length} are waiting on operator facts`);

    // --- the trap the spec §4.2 records ---
    // The gap detector scans for the marker string anywhere in the file, so a
    // file that merely *mentions* it trips its own gate with nothing missing.
    const marker = CONFIG.CARD_BUILDER.GAP_MARKER || 'NEEDS-OPERATOR';
    const mentions = [];

    for (const rel of listKnowledgeFiles()) {
      const content = fx.repoFile(rel);
      const name = rel.split('/').pop();
      // Neither a deliberately-blocked file nor a structurally broken one is
      // "otherwise ready" — both are expected to carry markers.
      if (KNOWN_BLOCKED.indexOf(name) !== -1) continue;
      if (KNOWN_BROKEN.indexOf(name) !== -1) continue;
      if (content.indexOf(marker) !== -1) mentions.push(name);
    }

    t.is(mentions, [],
      'no otherwise-ready file writes the gap marker literally and blocks itself');

    // --- what is sitting in the knowledge tree that is not a knowledge file ---
    //
    // `KNOWLEDGE_FOLDER_ID` is searched recursively, so anything under these
    // folders is a candidate for `Build Campaign Card`. Two documents there are
    // campaign execution, which KNOWLEDGE_BASE_SPEC §3 and the ICU file's own
    // "Knowledge Scope" both say does not belong in the knowledge base:
    //
    //   programs/Kbrna Campaigns.md      finished post copy, 1,164 lines
    //   programs/KBRNA_META_ADS_PLAN.md  a Meta ads plan
    //   programs/Kbrna_Campaigns_FINAL.xlsx
    //
    // The gate refuses them loudly rather than building a card from them, so
    // nothing is silently wrong. They are listed here so that a NEW stray file
    // fails this check instead of quietly joining them.
    t.is(strays(), [
      'programs/KBRNA_META_ADS_PLAN.md',
      'programs/Kbrna Campaigns.md'
    ], 'only the two known misfiled documents sit in the knowledge folders');

    // --- the prompt and the schema agree on what a card contains ---
    //
    // The prompt is loaded from Drive at runtime and cached for six hours, so a
    // field it asks for that the schema has dropped is not an error anyone
    // sees: ResponseParser iterates the schema, so the extra value is quietly
    // discarded. The model spends output tokens on it every single run.
    const prompt = fx.repoFile('campaign-os/prompts/planning/CAMPAIGN_CARD_BUILDER.md');
    const fields = Object.keys(CONFIG.CARD_BUILDER.OUTPUT_FIELDS);

    // Only section 4, "What you produce". Section 3 lists the documents the
    // worker receives, in tables of the same shape — reading those as field
    // names is how a check ends up reporting MASTER_BRAND_ARCHITECTURE.md as a
    // missing card column.
    const section = /## 4\. What you produce([\s\S]*?)\n## 5\./.exec(prompt);
    t.ok(section, 'the prompt has a "What you produce" section');

    const asked = [];

    for (const line of (section ? section[1] : '').split('\n')) {
      const m = /^\|\s*`([^`]+)`\s*\|/.exec(line.trim());
      if (m) asked.push(m[1]);
    }

    t.ok(asked.length > 10, 'the prompt specifies the card fields in a table');

    const askedForNothing = asked.filter((f) => fields.indexOf(f) === -1);
    t.is(askedForNothing, [],
      'the prompt asks for no field the schema has dropped — Duration was ' +
      'removed from both together, and a mismatch is invisible at runtime');
  }
};

// A knowledge file is named `<LEVEL>_<ENTITY>.md` — KNOWLEDGE_BASE_SPEC §3.
//
// `MEDICAL_DEPARTMENT` was added on 2026-08-06 when ICU and Emergency were
// renamed to it. ⚠️ KNOWLEDGE_BASE_SPEC §3's own table still lists
// `MEDICAL_SERVICE_` as the departments/ prefix while giving
// `MEDICAL_DEPARTMENT_ICU.md` as its example — the two disagree, and which one
// is intended is the brand owner's call, not this file's. Both are accepted here
// so the rename does not turn four real knowledge files into "strays"; when the
// decision is made, narrow this and rename the files that lose.
const NAME = /^(MEDICAL_SERVICE|MEDICAL_DEPARTMENT|MEDICAL_CENTER|CLINIC|PROGRAM|CORPORATE|HOSPITAL|SUPPORTING|EDUCATIONAL)_[A-Z0-9_]+\.md$/;

function everyMarkdownInSubfolders() {
  const fs = require('fs');
  const path = require('path');
  const root = path.join(__dirname, '..', '..', '..', K);
  const out = [];

  for (const dir of fs.readdirSync(root)) {
    const full = path.join(root, dir);
    if (!fs.statSync(full).isDirectory()) continue;

    for (const file of fs.readdirSync(full)) {
      if (file.endsWith('.md')) out.push(dir + '/' + file);
    }
  }

  return out.sort();
}

// Files that declare `builds_card: false` are REFERENCE documents, not sources
// for a campaign card, and the gate does not judge them by Template.md's
// seventeen sections.
//
// HOSPITAL_FUTURE.md is the case this exists for. It holds Future's floors,
// capacity, equipment and hours — the brand owner asked on 2026-08-08 for one
// place to change when a bed is added — and the registry lists NO campaign for
// HOSP-001. Demanding a Human Insight and a Psychological Transformation of a
// floor plan would have produced seventeen invented sections to satisfy a gate,
// which is the opposite of what the gate is for.
//
// The declaration is checked, not trusted: `reference-documents.js` requires
// that a file claiming it has no campaign in ENTITY_REGISTRY. A file with a live
// campaign cannot opt out of the gate by adding a line to its front matter.
function isReferenceDocument(rel) {
  const fs = require('fs');
  const path = require('path');
  const full = path.join(__dirname, '..', '..', '..', rel);
  const m = /^---\s*\r?\n([\s\S]*?)\r?\n---/.exec(fs.readFileSync(full, 'utf8'));

  return !!m && /^builds_card:\s*false\s*$/m.test(m[1]);
}

function listKnowledgeFiles() {
  return everyMarkdownInSubfolders()
    .filter((rel) => NAME.test(rel.split('/').pop()))
    .map((rel) => K + rel)
    .filter((rel) => !isReferenceDocument(rel));
}

function strays() {
  return everyMarkdownInSubfolders()
    .filter((rel) => !NAME.test(rel.split('/').pop()));
}
