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
    const icu = fx.repoFile(K + 'departments/MEDICAL_SERVICE_ICU.md');
    const fm = CardBuilder.parseFrontMatter(icu);

    t.is(fm.entity_id, 'MED-001', 'ICU front matter carries its entity id');
    t.is(fm.entity_name_en, 'Intensive Care Unit', 'ICU entity name is the unit');
    t.is(fm.campaign_name, 'ICU Center', 'ICU campaign name is what the calendar schedules');
    t.is(fm.service_level, 'DEPARTMENT',
      'ICU is a DEPARTMENT, not a Center, whatever its campaign is called');

    t.ok(fm.entity_name_en !== fm.campaign_name,
      'the entity name and the campaign name differ — the whole reason campaign_name exists');
    t.is(CardBuilder.campaignNameFor(fm), 'ICU Center',
      'the card is filed under the campaign name');

    // Nested list items belong to the key above them and are not card inputs.
    t.is(fm['- ICU Awareness Campaign'], undefined,
      'indented list items are not read as front-matter keys');

    // --- the gate itself ---
    const icuCheck = CardBuilder.validate(icu, 'MEDICAL_SERVICE_ICU.md');
    t.is(icuCheck.problems, [], 'ICU has no structural problems');
    t.is(icuCheck.gaps, [], 'ICU has no unresolved operator markers');
    t.ok(icuCheck.ok, 'ICU may build a card');

    // --- a file that is structurally complete but waiting on the operator ---
    const emergency = fx.repoFile(K + 'departments/MEDICAL_SERVICE_EMERGENCY.md');
    const emCheck = CardBuilder.validate(emergency, 'MEDICAL_SERVICE_EMERGENCY.md');

    t.is(emCheck.problems, [], 'Emergency is structurally complete');
    t.ok(emCheck.gaps.length > 0, 'Emergency still carries operator markers');
    t.notOk(emCheck.ok, 'Emergency is refused — a marker blocks the build');
    t.ok(emCheck.gaps.every((g) => g.section && g.line),
      'every gap names the section and the line it is on');

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
    const KNOWN_BLOCKED = [
      'HOSPITAL_DELTA.md',
      'MEDICAL_SERVICE_EMERGENCY.md',
      // Captured by voice 2026-08-04. Two genuine gaps: the operator declined
      // Can Promise outright, and comprehensive check-up program pricing was
      // still being sent when the recording ended.
      'MEDICAL_SERVICE_INTERNAL_MEDICINE_CARDIOLOGY.md'
    ];

    t.is(broken, [], 'no knowledge file has a structural problem');
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
      if (KNOWN_BLOCKED.indexOf(name) !== -1) continue;
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
const NAME = /^(MEDICAL_SERVICE|MEDICAL_CENTER|CLINIC|PROGRAM|CORPORATE|HOSPITAL|SUPPORTING|EDUCATIONAL)_[A-Z0-9_]+\.md$/;

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
