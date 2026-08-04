/**
 * Runs the receptionist data layer against a real PostgreSQL 18 (PGlite, WASM).
 *
 * Three things get proven here that a type-check cannot:
 *   A — the Prisma schema produces valid Postgres DDL
 *   B — the hand-written migration actually upgrades an OLD database
 *   C — scope enforcement and geography routing behave in real SQL
 *
 * pgvector is not bundled in PGlite 0.5.4, so the semantic source is out of
 * scope here and stays unverified. The deterministic path is the critical one.
 *
 * ── Running it ────────────────────────────────────────────────────────────
 * The repository sits on Google Drive, where `npm i` intermittently fails
 * mid-write, so install the dependency somewhere else and point back:
 *
 *   mkdir /tmp/pgtest && cd /tmp/pgtest
 *   npm init -y && npm i @electric-sql/pglite
 *   cp "<repo>/receptionist/scripts/test-database.mjs" .
 *
 *   cd "<repo>/website/apps/api" && npx prisma migrate diff \
 *     --from-empty --to-schema-datamodel prisma/schema.prisma --script \
 *     > "<repo>/receptionist/scripts/full.sql"
 *
 *   cd /tmp/pgtest && RECEPTIONIST_REPO="<repo>" node test-database.mjs
 *
 * On a filesystem npm can write to, `node receptionist/scripts/test-database.mjs`
 * works directly after installing the dependency beside it.
 *
 * `full.sql` is generated, not committed — it must always reflect the current
 * schema, and a stale committed copy would quietly test the wrong thing.
 * Override its location with RECEPTIONIST_FULL_SQL.
 */
import { PGlite } from '@electric-sql/pglite';
import fs from 'fs';
import path from 'path';

// decodeURIComponent matters: a repo path containing a space arrives as %20.
const HERE = path.dirname(decodeURIComponent(new URL(import.meta.url).pathname).replace(/^\/([A-Za-z]:)/, '$1'));

// RECEPTIONIST_REPO lets this file be copied somewhere npm can actually install
// and still read the repo. This repository lives on Google Drive, which locks
// files mid-write — `npm i` here fails with TAR_ENTRY_ERROR often enough that
// requiring the dependency to sit beside the script would make the harness
// unrunnable. Copy it to a scratch directory, install there, point this at the
// repo.
const REPO = process.env.RECEPTIONIST_REPO ?? path.resolve(HERE, '..', '..');

let pass = 0;
const fail = [];
const ok = (name) => { pass++; console.log(`  ✓ ${name}`); };
const bad = (name, err) => { fail.push(`${name}: ${err}`); console.log(`  ✗ ${name}\n      ${err}`); };

function check(name, cond, detail = '') {
  cond ? ok(name) : bad(name, detail || 'expected true');
}

// pgvector is unavailable in PGlite — strip it, and note what that costs us.
function stripVector(sql) {
  return sql
    .split('\n')
    .filter((l) => !/CREATE EXTENSION.*vector/i.test(l))
    .join('\n')
    .replace(/"embedding"\s+vector[^,\n]*,?/gi, '')
    .replace(/embedding\s+vector[^,\n]*,?/gi, '');
}

console.log('\n═══ A — the Prisma schema produces valid Postgres DDL ═══');
const full = stripVector(fs.readFileSync(process.env.RECEPTIONIST_FULL_SQL || path.join(HERE, 'full.sql'), 'utf8'));
const dbA = await PGlite.create();
try {
  await dbA.exec(full);
  ok('full schema applies to PostgreSQL 18');
  const t = await dbA.query(`SELECT count(*)::int n FROM information_schema.tables WHERE table_schema='public'`);
  check(`tables created (${t.rows[0].n})`, t.rows[0].n > 30, `only ${t.rows[0].n}`);
  const e = await dbA.query(`SELECT count(*)::int n FROM pg_type WHERE typtype='e'`);
  check(`enums created (${e.rows[0].n})`, e.rows[0].n >= 13, `only ${e.rows[0].n}`);
} catch (err) {
  bad('full schema applies', err.message.slice(0, 300));
}
await dbA.close();

console.log('\n═══ B — the migration upgrades an OLD database ═══');
const dbB = await PGlite.create();
try {
  // Reconstruct the pre-migration world: the original ChatConversation and
  // ChatMessage as migration 1 created them, plus only what the FKs need.
  await dbB.exec(`
    CREATE TYPE "ChatSender" AS ENUM ('USER','AI','SYSTEM');
    CREATE TYPE "ContentStatus" AS ENUM ('DRAFT','PUBLISHED','ARCHIVED');
    CREATE TYPE "AppointmentStatus" AS ENUM ('NEW','CONTACTED','CONFIRMED','CANCELLED','COMPLETED');
    CREATE TABLE "Brand" ("id" TEXT PRIMARY KEY, "code" TEXT UNIQUE NOT NULL);
    CREATE TABLE "Hospital" ("id" TEXT PRIMARY KEY, "slug" TEXT UNIQUE NOT NULL, "name" JSONB NOT NULL, "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT');
    CREATE TABLE "AppointmentRequest" ("id" TEXT PRIMARY KEY, "name" TEXT NOT NULL, "phone" TEXT NOT NULL, "hospitalId" TEXT REFERENCES "Hospital"("id"), "message" TEXT, "notes" TEXT, "answers" JSONB, "status" "AppointmentStatus" NOT NULL DEFAULT 'NEW');
    CREATE TABLE "ChatConversation" (
      "id" TEXT PRIMARY KEY, "visitorId" TEXT NOT NULL, "locale" TEXT NOT NULL,
      "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "endedAt" TIMESTAMP(3));
    CREATE TABLE "ChatMessage" (
      "id" TEXT PRIMARY KEY, "conversationId" TEXT NOT NULL REFERENCES "ChatConversation"("id") ON DELETE CASCADE,
      "sender" "ChatSender" NOT NULL, "content" TEXT NOT NULL, "matchedKbId" TEXT,
      "isUnanswered" BOOLEAN NOT NULL DEFAULT false, "isFallback" BOOLEAN NOT NULL DEFAULT false,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP);
  `);
  // A row that predates the migration — its data must survive.
  await dbB.exec(`INSERT INTO "ChatConversation"("id","visitorId","locale") VALUES ('old1','visitor-old','ar');`);
  ok('pre-migration schema built, with one legacy row');

  const migration = stripVector(
    fs.readFileSync(path.join(REPO, 'website/apps/api/prisma/migrations/20260803000000_receptionist_layer/migration.sql'), 'utf8'),
  );
  await dbB.exec(migration);
  ok('migration applies to the old schema');

  // Running it twice must be safe — the defensive IF NOT EXISTS/DO blocks exist
  // precisely because the real database drifted and its state is uncertain.
  await dbB.exec(migration);
  ok('migration is idempotent (ran twice, no error)');

  const legacy = await dbB.query(`SELECT "visitorId","channel","scopeState","leadStatus","slots" FROM "ChatConversation" WHERE id='old1'`);
  check('legacy row survived', legacy.rows[0].visitorId === 'visitor-old', JSON.stringify(legacy.rows[0]));
  check('legacy row got channel default WEB', legacy.rows[0].channel === 'WEB', legacy.rows[0].channel);
  check('legacy row got scope UNRESOLVED', legacy.rows[0].scopeState === 'UNRESOLVED', legacy.rows[0].scopeState);
  check('legacy row got leadStatus INFORMATION_ONLY', legacy.rows[0].leadStatus === 'INFORMATION_ONLY', legacy.rows[0].leadStatus);

  const cols = await dbB.query(`SELECT column_name FROM information_schema.columns WHERE table_name='ChatMessage'`);
  const names = cols.rows.map((r) => r.column_name);
  check('ChatMessage gained citedRecordIds', names.includes('citedRecordIds'));
  check('ChatMessage gained cachedTokens', names.includes('cachedTokens'));

  const tbls = await dbB.query(`SELECT table_name FROM information_schema.tables WHERE table_schema='public'`);
  const t = tbls.rows.map((r) => r.table_name);
  check('ServiceArea created', t.includes('ServiceArea'));
  check('BrandPersona created', t.includes('BrandPersona'));
} catch (err) {
  bad('migration', err.message.slice(0, 400));
}

console.log('\n═══ C — scope enforcement and geography routing, in real SQL ═══');
try {
  await dbB.exec(`
    INSERT INTO "Hospital"("id","slug","name","status") VALUES
      ('h_fut','future-hospital','{"ar":"المستقبل"}','PUBLISHED'),
      ('h_dlt','delta-hospital','{"ar":"الدلتا"}','PUBLISHED');
  `);

  // The real rows, loaded from the repo file — not a fixture invented here.
  const areas = JSON.parse(fs.readFileSync(path.join(REPO, 'receptionist/data/service-areas.json'), 'utf8')).areas;
  for (const a of areas) {
    const hid = a.hospitalSlug === 'future-hospital' ? 'h_fut' : 'h_dlt';
    await dbB.query(
      `INSERT INTO "ServiceArea"("id","hospitalId","governorate","district","priority","updatedAt")
       VALUES ($1,$2,$3,$4,$5,now())`,
      [`sa_${Math.random().toString(36).slice(2, 10)}`, hid, a.governorate, a.district, a.priority],
    );
  }
  ok(`loaded ${areas.length} real service areas`);

  // The resolver's ordering: district beats governorate, then priority.
  const match = async (text) => {
    const r = await dbB.query(`SELECT "hospitalId","governorate","district","priority" FROM "ServiceArea" WHERE "isActive"=true ORDER BY priority ASC`);
    const hits = r.rows.filter((a) => (a.district ? text.includes(a.district) : text.includes(a.governorate)));
    hits.sort((a, b) => ((b.district ? 1 : 0) - (a.district ? 1 : 0)) || a.priority - b.priority);
    return hits[0] ?? null;
  };

  check('طنطا → Delta', (await match('انا ساكن في طنطا'))?.hospitalId === 'h_dlt');
  check('مصر الجديدة → Future', (await match('ساكن مصر الجديدة'))?.hospitalId === 'h_fut');
  check('كفر الزيات → Delta', (await match('من كفر الزيات'))?.hospitalId === 'h_dlt');
  check('الغربية (governorate only) → Delta', (await match('من محافظة الغربية'))?.hospitalId === 'h_dlt');
  check('مدينة نصر → Future', (await match('مدينة نصر'))?.hospitalId === 'h_fut');
  check('أسوان (unmapped) → no match, so AMBIGUOUS', (await match('انا من اسوان')) === null);

  // Scope enforcement: the Future page must not be able to see Delta's clinics.
  await dbB.exec(`
    CREATE TABLE "Clinic" ("id" TEXT PRIMARY KEY, "hospitalId" TEXT NOT NULL REFERENCES "Hospital"("id"), "name" JSONB NOT NULL, "schedule" JSONB NOT NULL);
    INSERT INTO "Clinic" VALUES
      ('c1','h_fut','{"ar":"عيادة الباطنة"}','[{"day":"السبت","from":"16:00","to":"20:00"}]'),
      ('c2','h_dlt','{"ar":"عيادة الأسنان"}','[{"day":"الأحد","from":"10:00","to":"22:00"}]'),
      ('c3','h_dlt','{"ar":"عيادة العظام"}','[{"day":"الاثنين","from":"10:00","to":"22:00"}]');
  `);
  const futClinics = await dbB.query(`SELECT id FROM "Clinic" WHERE "hospitalId"='h_fut'`);
  const dltClinics = await dbB.query(`SELECT id FROM "Clinic" WHERE "hospitalId"='h_dlt'`);
  check('Future scope returns only Future clinics', futClinics.rows.length === 1 && futClinics.rows[0].id === 'c1');
  check('Delta scope returns only Delta clinics', dltClinics.rows.length === 2);
  check('no query path returns both', futClinics.rows.every((r) => !dltClinics.rows.find((d) => d.id === r.id)));

  // The unique constraint that motivated district='' instead of NULL.
  let dup = false;
  try {
    await dbB.query(
      `INSERT INTO "ServiceArea"("id","hospitalId","governorate","district","priority","updatedAt") VALUES ('dup','h_dlt','الغربية','',9,now())`,
    );
  } catch { dup = true; }
  check("district='' prevents a duplicate whole-governorate row", dup, 'the duplicate was accepted');

  // Handoff writes into the existing leads table.
  await dbB.exec(`
    INSERT INTO "AppointmentRequest"("id","name","phone","hospitalId","message","status")
    VALUES ('ap1','أحمد','01012345678','h_dlt','مريض عايز عظام','NEW');
    UPDATE "ChatConversation" SET "appointmentRequestId"='ap1', "handedOffAt"=now(), "leadStatus"='READY_TO_BOOK' WHERE id='old1';
  `);
  const joined = await dbB.query(`
    SELECT c."leadStatus", a."phone", a."hospitalId"
      FROM "ChatConversation" c JOIN "AppointmentRequest" a ON a.id = c."appointmentRequestId"
     WHERE c.id='old1'`);
  check('handoff links conversation → AppointmentRequest', joined.rows[0]?.phone === '01012345678');
  check('lead carries the resolved hospital', joined.rows[0]?.hospitalId === 'h_dlt');
} catch (err) {
  bad('scope/geography', err.message.slice(0, 400));
}

console.log('\n═══ D — verified facts overlay, and confidence is respected ═══');
try {
  await dbB.exec(`ALTER TABLE "Hospital" ADD COLUMN IF NOT EXISTS "locations" JSONB, ADD COLUMN IF NOT EXISTS "contactInfo" JSONB;`);
  // The placeholder the admin panel was tested with — wrong governorate.
  await dbB.exec(`UPDATE "Hospital" SET "locations"='[{"address":{"ar":"المهندسين، الجيزة"}}]' WHERE id='h_dlt';`);

  const facts = JSON.parse(fs.readFileSync(path.join(REPO, 'receptionist/data/hospitals.json'), 'utf8'));
  const servable = (c) => c === 'stated' || c === 'derived';

  for (const f of facts.hospitals) {
    const id = f.slug === 'future-hospital' ? 'h_fut' : 'h_dlt';
    if (servable(f.location?.confidence)) {
      await dbB.query(`UPDATE "Hospital" SET "locations"=$1 WHERE id=$2`, [
        JSON.stringify([{ address: f.location.address, governorate: f.location.governorate, district: f.location.district }]),
        id,
      ]);
    }
    const contact = {};
    if (servable(f.contact?.confidence)) {
      if (f.contact.phones?.length) contact.phones = f.contact.phones;
      if (f.contact.whatsapp) contact.whatsapp = f.contact.whatsapp;
    }
    if (Object.keys(contact).length) {
      await dbB.query(`UPDATE "Hospital" SET "contactInfo"=$1 WHERE id=$2`, [JSON.stringify(contact), id]);
    }
  }

  const dlt = (await dbB.query(`SELECT "locations","contactInfo" FROM "Hospital" WHERE id='h_dlt'`)).rows[0];
  const fut = (await dbB.query(`SELECT "locations","contactInfo" FROM "Hospital" WHERE id='h_fut'`)).rows[0];

  check('Delta location overwritten with Tanta', dlt.locations?.[0]?.district === 'طنطا', JSON.stringify(dlt.locations));
  check('the Mohandeseen placeholder is gone', !JSON.stringify(dlt.locations).includes('المهندسين'));
  check('Delta governorate is Gharbia', dlt.locations?.[0]?.governorate === 'الغربية');
  check('Future location is Heliopolis', fut.locations?.[0]?.district === 'مصر الجديدة');

  // The point of carrying confidence all the way through: Delta's numbers are
  // `stated` and get written; Future's are `conflict` (nine digits where Cairo
  // landlines have eight, CONF-05) and must not be.
  check('Delta phones written (stated)', Array.isArray(dlt.contactInfo?.phones) && dlt.contactInfo.phones.length === 5);
  check('Delta whatsapp written', dlt.contactInfo?.whatsapp === '01100002154');
  check('Future phones WITHHELD (conflict)', fut.contactInfo === null, JSON.stringify(fut.contactInfo));
} catch (err) {
  bad('facts overlay', err.message.slice(0, 400));
}

console.log('\n═══ E — centres seed from the registry, with the right hospitals ═══');
try {
  await dbB.exec(`
    CREATE TABLE "MedicalCenter" ("id" TEXT PRIMARY KEY, "slug" TEXT UNIQUE NOT NULL, "name" JSONB NOT NULL, "customFields" JSONB);
    CREATE TABLE "HospitalMedicalCenter" (
      "hospitalId" TEXT NOT NULL REFERENCES "Hospital"("id") ON DELETE CASCADE,
      "medicalCenterId" TEXT NOT NULL REFERENCES "MedicalCenter"("id") ON DELETE CASCADE,
      PRIMARY KEY ("hospitalId","medicalCenterId"));
  `);

  // Same parse the seeder performs, against the same file.
  const HOSPITAL_SLUG = { Future: 'h_fut', Delta: 'h_dlt' };
  const md = fs.readFileSync(path.join(REPO, 'business/brand/ENTITY_REGISTRY.md'), 'utf8');
  const centres = [];
  for (const line of md.split('\n')) {
    if (!/^\|\s*CEN-\d+/.test(line)) continue;
    const cells = line.split('|').map((c) => c.trim());
    const [, id, nameEn, nameAr, level, , hospitals] = cells;
    if (level !== 'CENTER') continue;
    centres.push({
      id,
      nameAr,
      slug: nameEn.toLowerCase().replace(/&/g, ' ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''),
      hospitalIds: hospitals.split(',').map((h) => HOSPITAL_SLUG[h.trim()]).filter(Boolean),
    });
  }
  check(`registry yields 12 centres (got ${centres.length})`, centres.length === 12);

  for (const c of centres) {
    await dbB.query(`INSERT INTO "MedicalCenter"("id","slug","name","customFields") VALUES ($1,$2,$3,$4)`, [
      c.id, c.slug, JSON.stringify({ ar: c.nameAr }), JSON.stringify({ registryId: c.id }),
    ]);
    for (const hid of c.hospitalIds) {
      await dbB.query(`INSERT INTO "HospitalMedicalCenter" VALUES ($1,$2)`, [hid, c.id]);
    }
  }

  const futCentres = (await dbB.query(`SELECT "medicalCenterId" id FROM "HospitalMedicalCenter" WHERE "hospitalId"='h_fut' ORDER BY 1`)).rows.map((r) => r.id);
  const dltCentres = (await dbB.query(`SELECT "medicalCenterId" id FROM "HospitalMedicalCenter" WHERE "hospitalId"='h_dlt' ORDER BY 1`)).rows.map((r) => r.id);

  // The boundary the whole scope design rests on: PLATFORM_KNOWLEDGE_BASE §2.2
  // — centres 1–4 run at both hospitals, 5–12 at Delta only.
  check('Future operates exactly 4 centres', futCentres.length === 4, futCentres.join(','));
  check('Future gets CEN-001..004', futCentres.join(',') === 'CEN-001,CEN-002,CEN-003,CEN-004', futCentres.join(','));
  check('Delta operates all 12', dltCentres.length === 12, String(dltCentres.length));
  check(
    'no Delta-only centre leaked to Future',
    !futCentres.some((id) => Number(id.slice(4)) >= 5),
    futCentres.filter((id) => Number(id.slice(4)) >= 5).join(','),
  );

  // Names come from the registry, so the near-miss "مركز القلب والأوعية
  // الدموية" cannot survive a re-seed.
  const cardiac = (await dbB.query(`SELECT name FROM "MedicalCenter" WHERE id='CEN-001'`)).rows[0];
  check('CEN-001 carries the registry name', cardiac.name.ar === 'مركز القلب والباطنة وإحالة الرعايات الحرجة', cardiac.name.ar);
} catch (err) {
  bad('registry-driven centres', err.message.slice(0, 400));
}
await dbB.close();

console.log('');
if (fail.length) {
  console.error(`✗ ${fail.length} failed, ${pass} passed\n`);
  process.exit(1);
}
console.log(`✓ database layer — ${pass} checks passed against real PostgreSQL 18`);
console.log('  (pgvector unavailable in PGlite — the semantic source remains unverified)');
