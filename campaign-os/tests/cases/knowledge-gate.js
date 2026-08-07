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

    // --- ⚠️ ICU REGRESSED, and the suite says so rather than absorbing it ---
    //
    // ICU was the reference implementation: 2,773 lines, every required section
    // written, the one file proven to build a card. On 2026-08-06 it was
    // deliberately replaced — "refactor: replace V1 ICU file with V2
    // Comprehensive Critical Care Center", commit d0e9c4f — with a 233-line
    // rewrite that dropped five of the seventeen required sections.
    //
    // That was somebody's deliberate work and this suite does not undo it. What
    // it will not do is let it pass quietly: the file cannot build a card, and
    // the first campaign the operator successfully ran end to end was ICU's.
    //
    // Delete this block when the rewrite is finished. Until then it is the only
    // thing in the repository that states the reference file is broken.
    const icuCheck = CardBuilder.validate(icu, 'MEDICAL_DEPARTMENT_ICU.md');
    const REGRESSED = [
      'What We Are Really Selling',
      'Psychological Barriers',
      'Narrative Themes',
      'Content Pillars',
      'Relationship With INSAN'
    ];

    const stillMissing = REGRESSED.filter((section) =>
      icuCheck.problems.some((p) => p.indexOf(section) !== -1));

    t.is(stillMissing, REGRESSED,
      'ICU is still missing exactly the five required sections the V2 rewrite ' +
      'dropped — if this fails because the list shrank, the rewrite is being ' +
      'finished and this block should be deleted, not adjusted');
    t.notOk(icuCheck.ok,
      'and so ICU cannot build a card — the file that used to be the proof that ' +
      'the whole chain works');

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

    for (const rel of listKnowledgeFiles()) {
      const content = fx.repoFile(rel);
      const name = rel.split('/').pop();
      const result = CardBuilder.validate(content, name);

      if (result.problems.length) broken.push(name + ': ' + result.problems[0]);
      else if (result.gaps.length) blocked.push(name);
      else ready.push(name);
    }

    // Files known to be deliberately incomplete — waiting on facts only the
    // operator has, marked rather than invented. Adding a new one here is
    // adding a name to this list, not a defect in the file: the whole point of
    // the gate is that it can be blocked on purpose.
    //
    // Re-baselined 2026-08-07 after the knowledge base was reorganised on
    // 2026-08-06: eight MEDICAL_CENTER_* files added, ICU and Emergency renamed
    // to MEDICAL_DEPARTMENT_*, Internal Medicine & Cardiology folded into
    // MEDICAL_CENTER_CARDIAC_INTERNAL_MEDICINE.md.
    const KNOWN_BLOCKED = [
      'HOSPITAL_DELTA.md',
      'MEDICAL_DEPARTMENT_ER.md',
      'MEDICAL_SERVICE_GENERAL_SURGERY.md',

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
      'MEDICAL_CENTER_WOMENS_HEALTH.md'
    ];

    // ⚠️ Two files are STRUCTURALLY broken, which is worse than blocked: a gap
    // is a fact nobody has supplied yet, a missing required section is a file
    // that does not have the shape of a knowledge file.
    //
    //   MEDICAL_DEPARTMENT_ICU.md            the V2 rewrite dropped 5 of 17
    //   MEDICAL_SERVICE_OUTPATIENT_CLINICS.md  missing Why This Service Exists
    //
    // Held as an exact list so a THIRD one cannot join them quietly.
    const KNOWN_BROKEN = [
      'MEDICAL_DEPARTMENT_ICU.md',
      'MEDICAL_SERVICE_OUTPATIENT_CLINICS.md'
    ];

    t.is(broken.map((b) => b.split(':')[0]).sort(), [...KNOWN_BROKEN].sort(),
      'exactly two knowledge files are structurally broken, both mid-rewrite — ' +
      'a new name here is a file that lost a required section');
    t.is(ready.length, 23, '23 knowledge files build a card');
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

function listKnowledgeFiles() {
  return everyMarkdownInSubfolders()
    .filter((rel) => NAME.test(rel.split('/').pop()))
    .map((rel) => K + rel);
}

function strays() {
  return everyMarkdownInSubfolders()
    .filter((rel) => !NAME.test(rel.split('/').pop()));
}
