// `builds_card: false` — the opt-out from the knowledge gate, and its limit.
//
// Most files under business/knowledge/ are sources for a campaign card, and the
// gate judges them by Template.md's seventeen required sections. A few are not.
// HOSPITAL_FUTURE.md holds Future's floors, capacity, equipment and hours — the
// brand owner asked on 2026-08-08 for one place to change when a bed is added —
// and ENTITY_REGISTRY lists NO campaign for HOSP-001.
//
// Demanding a Human Insight and a Psychological Transformation of a floor plan
// would have produced seventeen invented sections written to satisfy a gate.
// That is precisely the laundering the gate exists to prevent, arrived at from
// the other direction.
//
// So a file may declare `builds_card: false` and be skipped. This suite is the
// limit on that: the declaration is CHECKED, not trusted. A file whose campaign
// is live in the registry cannot escape the seventeen sections by adding a line
// to its front matter — which would otherwise be the easiest way in this
// repository to ship an unfinished card source.

const K = 'business/knowledge/';

module.exports = {
  name: 'reference documents',

  run(t, fx) {
    const registry = fx.repoFile('business/brand/ENTITY_REGISTRY.md');

    // Campaign names the registry actually schedules, by entity id.
    const campaignFor = {};
    for (const line of registry.split(/\r?\n/)) {
      if (!/^\|\s*(MED|CEN|HOSP|PROG)-/.test(line)) continue;
      const c = line.split('|').map((s) => s.trim());
      campaignFor[c[1]] = c[5];
    }

    const files = allKnowledgeFiles();
    const reference = [];

    for (const rel of files) {
      const content = fx.repoFile(rel);
      const m = /^---\s*\r?\n([\s\S]*?)\r?\n---/.exec(content);
      if (!m) continue;

      const front = m[1];
      if (!/^builds_card:\s*false\s*$/m.test(front)) continue;

      const name = rel.split('/').pop();
      const id = (/^entity_id:\s*(\S+)/m.exec(front) || [])[1];
      reference.push(name);

      // --- the declaration must be true ---
      //
      // Two legitimate shapes, and both are checked rather than one being a
      // loophole:
      //
      //   an ENTITY that has no campaign — HOSPITAL_FUTURE.md, HOSP-001
      //   NO entity at all — CLINIC_SCHEDULES.md, which is a timetable spanning
      //   both hospitals and is not an entity in any sense
      //
      // What is forbidden is the third shape: a file naming an entity whose
      // campaign is live, opting out of the seventeen sections by declaring
      // itself a reference. That would be the easiest way in this repository to
      // ship an unfinished card source.
      const claimsNoEntity = !id || id === '—';

      if (claimsNoEntity) {
        t.ok(true,
          `${name} claims no entity — it is a cross-entity reference, and the ` +
          'gate has nothing to judge it against');
      } else {
        const campaign = campaignFor[id];
        t.ok(campaign !== undefined, `${name}'s entity ${id} is in the registry`);
        t.ok(campaign === '—' || campaign === undefined,
          `${name} declares builds_card: false and the registry agrees — ${id} ` +
          `has no campaign. A file with a live campaign cannot opt out of the ` +
          `gate (registry says "${campaign}")`);
      }

      // --- and it must say why, where a human would look ---
      t.ok(/Source of Truth|source of truth/.test(content),
        `${name} states what it IS a source of truth for, since it is not a ` +
        'card source and a reader needs to know what it is instead');
    }

    // The mechanism should be rare. If this number climbs, files are opting out
    // of the gate rather than being finished.
    t.ok(reference.length <= 3,
      `${reference.length} reference document(s): ${reference.join(', ') || 'none'} — ` +
      'the opt-out stays rare, or the gate stops meaning anything');

    // --- the clinic schedule's safety rules ---
    //
    // This one is different from every other check in the suite, because the
    // file it guards is read by something that TALKS TO PATIENTS. A wrong clinic
    // time sends a real person to a hospital on the wrong day, and a wrong
    // doctor's name misidentifies a specific human being to someone who is about
    // to walk in and ask for them.
    //
    // Both hospitals are now confirmed from typed sources. Delta's names were
    // withheld for part of 2026-08-08, and the transcription that was withheld
    // turned out to be WRONG IN EIGHT OF TWELVE ENTRIES — including a specialty
    // read as vascular surgery that is actually neurology, and a man's name that
    // is actually a woman's.
    //
    // That comparison is kept in the file and pinned here. It is the only
    // concrete evidence in this repository for a rule that is otherwise an
    // abstraction, and the first edit that tidies the file will delete it.
    const SCHED = 'business/knowledge/hospitals/CLINIC_SCHEDULES.md';
    t.ok(fx.exists(SCHED), 'the clinic schedule file exists');

    if (fx.exists(SCHED)) {
      const s = fx.repoFile(SCHED);

      t.ok(/CONFIRMED by the brand owner/i.test(s),
        'Delta\'s schedule is confirmed from a typed table, so its names may ' +
        'now be given');

      t.ok(/eight of twelve/i.test(s),
        'and the file keeps what the handwriting transcription got wrong — the ' +
        'evidence for withholding an unverified name, which is otherwise a ' +
        'principle nobody can weigh');

      t.ok(/مخ\s*\r?\n?وأعصاب/.test(s) && /جراحة/.test(s),
        'including the specialty that was read as vascular surgery and is ' +
        'actually neurology — a wrong department, not a misspelling');

      // Delta's TIMES are still unconfirmed: the typed table has none, and the
      // window comes from the handwritten header.
      t.ok(/NEEDS-OPERATOR[\s\S]*?NO TIMES/i.test(s),
        'and records that Delta\'s typed table carries no times, so the window ' +
        'still rests on the handwriting');

      t.ok(/[Nn]ever invent a clinic time/.test(s),
        'and forbidden from inventing a time — a patient who travels on a guess ' +
        'arrives to a closed door');

      t.ok(/هيكلمك|هيتم التنسيق|will call/i.test(s),
        'and told what to say when a clinic is absent: somebody from the ' +
        'hospital will call and arrange it, which is the brand owner\'s ruling');

      t.ok(/[Nn]ever say a specialty is unavailable/.test(s),
        'and told not to treat absence from this file as absence from the ' +
        'hospital — the file is incomplete by design');

      // Both consumers must point here rather than hold their own copy.
      for (const rel of ['business/knowledge/departments/MEDICAL_SERVICE_OUTPATIENT_CLINICS.md',
                         'business/knowledge/programs/PROGRAM_KABARONA.md']) {
        t.includes(fx.repoFile(rel), 'CLINIC_SCHEDULES.md',
          `${rel.split('/').pop()} points at the schedule file instead of ` +
          'holding a copy — the brand owner confirmed these are the same clinics');
      }
    }
  }
};

// Every knowledge file, INCLUDING the reference documents that
// knowledge-gate.js filters out — this suite exists to check exactly those.
function allKnowledgeFiles() {
  const fs = require('fs');
  const path = require('path');
  const root = path.join(__dirname, '..', '..', '..', K);
  const out = [];

  for (const dir of fs.readdirSync(root)) {
    const full = path.join(root, dir);
    if (!fs.statSync(full).isDirectory()) continue;

    for (const file of fs.readdirSync(full)) {
      if (file.endsWith('.md')) out.push(K + dir + '/' + file);
    }
  }

  return out.sort();
}
