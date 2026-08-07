// The Future rule.
//
// The brand owner stated on 2026-08-08 that Future runs a named, closed list of
// centres and Delta runs everything. It replaced reasoning case by case, which
// is what had produced the divergences the registry spent two days recording.
//
// This suite exists because getting a Hospitals cell wrong does not fail
// anywhere. W2 schedules the campaign onto a page, W3 writes strategy for it,
// W5 approves the copy, the artwork carries that hospital's marks, and the post
// publishes — advertising a service the hospital does not have, to people who
// live near it. Nothing in that chain re-checks the premise.
//
// So the rule is held here rather than in prose that everyone agrees with and
// nobody consults.

// Centres the brand owner named as running at Future. Adding to this list is a
// business decision, not a code change — it comes from the brand owner, per
// entity, and the registry records the date.
const AT_FUTURE = [
  'CEN-001',   // مركز الباطنة والقلب وإحالة الرعايات الحرجة والمتوسطة
  'CEN-002',   // مركز جراحات المسالك والليزر
  'CEN-004',   // مركز الجراحات العامة والمناظير — parent of the surgical family
  'CEN-010',   // مركز العظام وإصابات الملاعب
  'CEN-013',   // مركز جراحات السمنة والتمثيل الغذائي
  'CEN-016'    // مركز جراحات الجهاز الهضمي والأورام — the "الهضمي" of the rule
];

// Centres the rule does not settle. EMPTY as of 2026-08-08 — the brand owner
// answered all four:
//
//   CEN-016  is "الهضمي". It stays at Future and takes CEN-003's campaign name.
//   CEN-003  is RETIRED and merged into CEN-016. No row, so nothing to decide.
//   CEN-009  ENT is Delta only, reversing the 2026-08-07 exception.
//   CEN-014  Proctology stands alone, outside the surgical family, Delta only.
//
// Keeping the mechanism with an empty list is deliberate. The next centre the
// brand owner adds arrives undecided, and this is where it waits — visibly,
// with the registry marking it — rather than being given a plausible value by
// whoever happens to be editing the row.
//
// A name JOINING this list should be argued for. It is how a rule becomes a
// suggestion.
const UNDECIDED = [];

module.exports = {
  name: 'future rule',

  run(t, fx) {
    const registry = fx.repoFile('business/brand/ENTITY_REGISTRY.md');
    const rows = registry.split(/\r?\n/)
      .filter((l) => /^\|\s*(MED|CEN|HOSP|PROG)-/.test(l))
      .map((l) => l.split('|').map((c) => c.trim()))
      .map((c) => ({ id: c[1], name: c[2], level: c[4], hospitals: c[6] }));

    t.ok(rows.length > 20, `the registry parses (${rows.length} rows)`);

    const at = (row, hospital) => row.hospitals.split(',')
      .map((s) => s.trim()).indexOf(hospital) !== -1;

    // --- 1. Future ⊆ Delta ---
    //
    // Not a tidiness rule. This is the invariant that makes a Hospitals cell
    // checkable at all: there is no centre Future has and Delta does not, so a
    // row listing Future alone is a typo or a misunderstanding, never a fact.
    //
    // HOSPITAL rows are exempt, and the exemption is not a special case so much
    // as a different column. For a centre, Hospitals answers "where is this
    // offered"; for HOSP-001 it answers "which hospital is this". Future
    // Specialized Hospital listing Future alone is the only correct value it
    // could have. The first run of this suite failed on exactly that row.
    for (const row of rows) {
      if (row.level === 'HOSPITAL') continue;
      if (!at(row, 'Future')) continue;
      t.ok(at(row, 'Delta'),
        `${row.id} runs at Delta as well as Future — Future never has a centre ` +
        'Delta lacks, so Future-alone is always an error');
    }

    // --- 2. only the named centres run at Future ---
    for (const row of rows) {
      if (row.level !== 'CENTER') continue;
      if (UNDECIDED.indexOf(row.id) !== -1) continue;

      const expected = AT_FUTURE.indexOf(row.id) !== -1;
      t.is(at(row, 'Future'), expected, expected
        ? `${row.id} runs at Future — the brand owner named it`
        : `${row.id} is Delta only — a centre not on the named list never ` +
          'reaches a Future page, whatever its specialty suggests');
    }

    // --- 3. every named centre is registered ---
    // A rule naming an id that does not exist is a rule nothing enforces.
    for (const id of AT_FUTURE.concat(UNDECIDED)) {
      t.ok(rows.some((r) => r.id === id),
        `${id} exists in the registry — the rule names real rows`);
    }

    // --- 4. the registry states the rule where a reader would look ---
    t.ok(/Future runs a named, closed list of centres/.test(registry),
      'the registry carries the rule in prose, not only in this suite — the ' +
      'brand owner and the website read that file and never run these tests');
    t.ok(/Future ⊆ Delta|Future ⊂ Delta/.test(registry),
      'including the subset invariant');

    // --- 5. an undecided centre is marked, not silently exempted ---
    //
    // The danger with an exemption list is that it quietly becomes permanent: a
    // row nothing complains about reads as a row somebody decided. So whenever
    // the list has anything in it, the registry has to say so in the open.
    //
    // The list is empty today. This check costs nothing while it stays empty
    // and starts working the moment it does not.
    if (UNDECIDED.length) {
      t.ok(registry.indexOf('NEEDS-OPERATOR') !== -1,
        'the unsettled centres are marked as an open question, not left to ' +
        'look decided because nothing complains about them');

      for (const id of UNDECIDED) {
        t.includes(registry, id,
          `${id} is named in the registry's open question`);
      }
    } else {
      t.ok(true, 'no centre is exempt from the rule — all four were answered ' +
        'on 2026-08-08, and the mechanism stays for the next one');
    }

    // --- 5b. a retired id is not reused ---
    //
    // CEN-003 was retired into CEN-016 and MED-007 into CEN-004. Reusing either
    // number would silently attach one entity's history to another — the
    // registry is the join key two other systems read.
    for (const id of ['CEN-003', 'MED-007']) {
      const live = rows.filter((r) => r.id === id && r.level !== '—');
      t.is(live.length, 0,
        `${id} is retired and no live row claims it`);
      t.includes(registry, id,
        'and the retirement is recorded, so the number is not quietly free');
    }

    // --- 6. the knowledge files agree with the registry ---
    // The registry is authoritative; a file disagreeing is the divergence that
    // put a Delta-only centre on a Future page in the first place.
    for (const rel of knowledgeFiles()) {
      const m = /^---\s*\n([\s\S]*?)\n---/.exec(fx.repoFile(rel));
      if (!m) continue;

      const id = (/^entity_id:\s*(\S+)/m.exec(m[1]) || [])[1];
      const hospitals = (/^hospitals:\s*(.+)$/m.exec(m[1]) || [])[1];
      if (!id || !hospitals) continue;

      const row = rows.find((r) => r.id === id);
      if (!row) continue;

      const fileSet = hospitals.replace(/[[\]]/g, '').split(',')
        .map((s) => s.trim()).filter(Boolean).sort().join(',');
      const regSet = row.hospitals.split(',')
        .map((s) => s.trim()).filter(Boolean).sort().join(',');

      t.is(fileSet, regSet,
        `${rel.split('/').pop()} lists the same hospitals as the registry for ${id}`);
    }
  }
};

// Every knowledge file, by path relative to the repo root.
function knowledgeFiles() {
  const fs = require('fs');
  const path = require('path');
  const rel = 'business/knowledge/';
  const root = path.join(__dirname, '..', '..', '..', rel);
  const out = [];

  for (const dir of fs.readdirSync(root)) {
    const full = path.join(root, dir);
    if (!fs.statSync(full).isDirectory()) continue;

    for (const file of fs.readdirSync(full)) {
      if (file.endsWith('.md')) out.push(rel + dir + '/' + file);
    }
  }

  return out.sort();
}
