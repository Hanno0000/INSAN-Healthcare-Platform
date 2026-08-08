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
      t.ok(id, `${name} names an entity_id, so the claim can be checked`);

      const campaign = campaignFor[id];
      t.ok(campaign !== undefined,
        `${name}'s entity ${id} is in the registry`);

      t.ok(campaign === '—' || campaign === undefined,
        `${name} declares builds_card: false and the registry agrees — ${id} has ` +
        `no campaign. A file with a live campaign cannot opt out of the gate ` +
        `(registry says "${campaign}")`);

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
