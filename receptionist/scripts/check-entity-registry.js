#!/usr/bin/env node
/**
 * Compares what the website seeds against business/brand/ENTITY_REGISTRY.md.
 *
 *   node receptionist/scripts/check-entity-registry.js
 *
 * The registry states the rule plainly: "an entity that is not in this file
 * does not exist", and "the same table governs prisma/seed.ts". Until now
 * nothing enforced it, which is how the three systems drifted to 18% agreement
 * in the first place.
 *
 * This matters more for the receptionist than it did for a campaign. A campaign
 * naming a centre that does not exist is an embarrassing post. A receptionist
 * naming one sends a patient to a building to ask for it.
 *
 * Offline: reads the registry markdown and prisma/seed-data.json. No database,
 * no network. The registry table is machine-parsed by design — keep the column
 * order and one entity per row.
 */

const fs = require('fs');
const path = require('path');

const REPO = path.resolve(__dirname, '..', '..');
const REGISTRY = path.join(REPO, 'business', 'brand', 'ENTITY_REGISTRY.md');
const SEED_DATA = path.join(REPO, 'website', 'apps', 'api', 'prisma', 'seed-data.json');

// ─── Parse the registry table ────────────────────────────────────────
function parseRegistry(md) {
  const rows = [];
  for (const line of md.split('\n')) {
    if (!/^\|\s*(MED|CEN|HOSP|PROG)-\d+/.test(line)) continue;
    const cells = line.split('|').map((c) => c.trim()).filter((_, i, a) => i > 0 && i < a.length - 1);
    const [id, nameEn, nameAr, level, campaign, hospitals] = cells;
    rows.push({
      id,
      nameEn,
      nameAr,
      level,
      campaign: campaign === '—' ? null : campaign,
      hospitals: hospitals.split(',').map((h) => h.trim()).filter(Boolean),
    });
  }
  return rows;
}

const registry = parseRegistry(fs.readFileSync(REGISTRY, 'utf8'));
const seed = JSON.parse(fs.readFileSync(SEED_DATA, 'utf8'));

const registeredCenters = registry.filter((r) => r.level === 'CENTER');

/**
 * Since 2026-08-03 the seeder reads ENTITY_REGISTRY.md directly, so identity —
 * which centres exist and at which hospitals — cannot drift. seed-data.json now
 * supplies CONTENT only, joined on `registryId`.
 *
 * That moves this check's job: instead of hunting for divergence after the
 * fact, it verifies the join is intact. A content entry pointing at a registry
 * id that does not exist is content that will silently never be applied.
 */
const contentEntries = seed.medicalCenters ?? [];

const findings = [];
const note = (severity, what, detail) => findings.push({ severity, what, detail });

console.log(`\nregistry: ${registry.length} entities (${registeredCenters.length} centres)`);
console.log(`content:  ${contentEntries.length} entry/entries in seed-data.json\n`);

// ─── 0. Content must join to a real registry entry ───────────────────
for (const c of contentEntries) {
  if (!c.registryId) {
    note('high', 'content entry has no registryId', `${c.slug} — it will never be applied to any centre`);
    continue;
  }
  if (!registeredCenters.some((r) => r.id === c.registryId)) {
    note('high', 'content points at an unknown registry id', `${c.slug} → ${c.registryId}`);
  }
}

const claimed = contentEntries.map((c) => c.registryId).filter(Boolean);
const dupes = claimed.filter((id, i) => claimed.indexOf(id) !== i);
for (const id of new Set(dupes)) {
  note('high', 'two content entries claim the same registry id', id);
}

// Not a defect — the registry describes the business, content is entered over
// time. But the receptionist can only describe a centre it has content for.
const withoutContent = registeredCenters.filter((r) => !claimed.includes(r.id));
if (withoutContent.length) {
  note(
    'medium',
    `${withoutContent.length} registered centre(s) will seed with no content`,
    withoutContent.map((m) => `${m.id} ${m.nameAr}`).join('\n        '),
  );
}

// ─── Report ──────────────────────────────────────────────────────────
if (findings.length === 0) {
  console.log('✓ entity registry — the seed agrees with the registry');
  process.exit(0);
}

const high = findings.filter((f) => f.severity === 'high');
for (const f of findings) {
  console.log(`  ${f.severity === 'high' ? '✗' : '•'} ${f.what}\n        ${f.detail}\n`);
}
console.log(
  `${high.length ? '✗' : '•'} ${findings.length} finding(s), ${high.length} high\n\n` +
    `  The registry is the source of truth: "an entity that is not in this file\n` +
    `  does not exist". Fix the seed, or add the entity to the registry first.\n`,
);
process.exit(high.length ? 1 : 0);
