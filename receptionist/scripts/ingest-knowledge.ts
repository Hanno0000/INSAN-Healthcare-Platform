/**
 * Ingests business/knowledge/**.md into AiKnowledgeBase so the receptionist can
 * answer prose questions from it.
 *
 *   cd website/apps/api
 *   npx ts-node --compiler-options '{"module":"CommonJS"}' ../../../receptionist/scripts/ingest-knowledge.ts
 *   # add --dry-run to parse and report without writing or embedding
 *
 * ── Why this exists ──────────────────────────────────────────────────────
 * The knowledge files were written for Campaign OS, which reads them to build
 * campaign cards. The receptionist reads three sources — hospitals.json, the
 * database, and AiKnowledgeBase — and none of them is a markdown file. So a
 * beautifully written centre file was reaching campaigns and not reaching a
 * single patient. This closes that gap in the one direction that is safe.
 *
 * ── The allowlist is the whole design ────────────────────────────────────
 * These files are mostly NOT patient-facing. §2 Human Understanding and §5
 * Marketing Intelligence are audience psychology — "the patient has stopped
 * believing the problem is solvable", "what we are really selling". Serving
 * that to the patient it describes would be worse than saying nothing.
 * §7.2 Never Promise is a constraint on what may be said, and quoting it at
 * someone would state the very thing it forbids.
 *
 * So sections are DENIED unless explicitly allowed. A new section added to a
 * knowledge file next month is invisible to patients until someone adds it
 * here on purpose. That default is the point — the opposite default leaks
 * strategy the first time a file grows.
 *
 * ── What else is skipped ─────────────────────────────────────────────────
 * Sections still carrying a NEEDS-OPERATOR marker or a [TBD] are unfinished.
 * An unfinished section retrieved at high similarity is worse than a miss: the
 * model reads "<!-- NEEDS-OPERATOR: missing prices -->" as context and answers
 * around a hole it cannot see.
 */

// Relative, not '@prisma/client'. This script lives outside website/, so Node
// resolves node_modules upward from receptionist/scripts/ and never reaches
// website/node_modules — it is a sibling, not a parent. The other scripts in
// this folder reach into the api source tree the same way.
import { PrismaClient } from '../../website/node_modules/@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();
const DRY_RUN = process.argv.includes('--dry-run');
/**
 * --check verifies the two things that must be true before a real run, and
 * changes nothing: that a Gemini provider is configured and its key actually
 * works, and that the migration adding the vector column has been applied.
 *
 * It exists because neither is observable from outside. A chat request that
 * finds no knowledge looks identical whether the key is wrong, the column is
 * missing, or the table is simply empty — SemanticSource swallows its own
 * errors by design so a failing search cannot take down a conversation.
 */
const CHECK = process.argv.includes('--check');

const REPO = path.resolve(__dirname, '..', '..');
const KNOWLEDGE_DIR = path.join(REPO, 'business', 'knowledge');

/**
 * Section numbers a patient may be answered from, keyed by the numeric prefix
 * the knowledge files use. Matching is on the number, not the title, because
 * titles get reworded and a renamed section must not silently change from
 * denied to allowed or back.
 */
const ALLOWED_SECTIONS = new Set([
  '1.1', // Overview — what the centre is
  '1.2', // Definition — what it handles
  '1.5', // Why This Service Exists
  '3.1', // Service Boundaries — what is and isn't included
  '3.2', // Medical Philosophy
  '3.4', // Core Features
  '3.5', // Differentiators
  '3.6', // Service Journey — what happens, in order
  '3.7', // What Makes This Different
  '3.8', // Specialized Clinics — the actual list of clinics
  '3.9', // Clinic Schedule
  '4.1', // How Patients Reach The Center
  '4.2', // Patient Preparation — what to bring, how to prepare
  '4.3', // Urgency Triage — ER vs clinic
  '4.4', // Booking Methods
  '4.5', // FAQ
  '6.1', // Current Offers
]);

/**
 * Older knowledge files (HOSPITAL_DELTA, ICU, KABARONA) predate the numbered
 * scheme and use bare `## Title` headings. They carry the same canonical
 * titles, so the title maps onto the number and both formats end up judged by
 * the one allowlist above.
 *
 * Title matching is used ONLY here, and only because these files have no
 * number to match on. Anything not in this map is denied, so a bespoke heading
 * — ICU's file is written almost entirely in its own headings — stays out
 * rather than being guessed at.
 */
const LEGACY_TITLES: Record<string, string> = {
  'overview': '1.1',
  'definition': '1.2',
  'service definition': '1.2',
  'why this service exists': '1.5',
  'service boundaries': '3.1',
  'medical philosophy': '3.2',
  'core features': '3.4',
  'differentiators': '3.5',
  'service journey': '3.6',
  'what makes this different': '3.7',
  'specialized clinics': '3.8',
  'clinic schedule': '3.9',
  'how patients reach the center': '4.1',
  'how patients reach the centre': '4.1',
  'how patients reach the service': '4.1',
  'how patients reach the program': '4.1',
  'patient preparation': '4.2',
  'urgency triage': '4.3',
  'booking methods': '4.4',
  'faq': '4.5',
  'frequently asked questions': '4.5',
  'current offers': '6.1',
};

/** Unfinished content. Retrieving a hole is worse than retrieving nothing. */
const INCOMPLETE = /NEEDS-OPERATOR|\[TBD\]/i;

interface FrontMatter {
  entity_id?: string;
  entity_name_en?: string;
  entity_name_ar?: string;
  hospitals?: string[];
  status?: string;
}

interface Chunk {
  sourceRef: string;
  topicAr: string;
  topicEn: string;
  questionAr: string;
  answer: string;
  hospitals: string[];
  category: string;
}

/** Hospital names in front matter → Hospital.slug, the value the query filters on. */
const HOSPITAL_SLUGS: Record<string, string> = {
  future: 'future-hospital',
  delta: 'delta-hospital',
};

function parseFrontMatter(raw: string): { fm: FrontMatter; body: string } {
  const lines = raw.split(/\r?\n/);
  if (lines[0]?.trim() !== '---') return { fm: {}, body: raw };

  const end = lines.indexOf('---', 1);
  if (end === -1) return { fm: {}, body: raw };

  const fm: FrontMatter = {};
  for (const line of lines.slice(1, end)) {
    const m = line.match(/^([a-z_]+):\s*(.*)$/i);
    if (!m) continue;
    const [, key, valueRaw] = m;
    const value = valueRaw.trim();
    if (key === 'hospitals') {
      fm.hospitals = value
        .replace(/^\[|\]$/g, '')
        .split(',')
        .map((h) => h.trim().toLowerCase())
        .filter(Boolean)
        .map((h) => HOSPITAL_SLUGS[h])
        .filter((h): h is string => Boolean(h));
    } else {
      (fm as Record<string, unknown>)[key] = value;
    }
  }
  return { fm, body: lines.slice(end + 1).join('\n') };
}

/** Split a body into `### N.M Title` sections. */
function sections(body: string): Array<{ number: string; title: string; text: string }> {
  const out: Array<{ number: string; title: string; text: string }> = [];
  // CRLF-safe: the repo lives on a Windows checkout and `.` does not match \r.
  const lines = body.split(/\r?\n/);

  let current: { number: string; title: string; buf: string[] } | null = null;
  const flush = () => {
    if (current) out.push({ number: current.number, title: current.title, text: current.buf.join('\n').trim() });
    current = null;
  };

  for (const line of lines) {
    // Strip the ✍️ marker used to flag derived sections — it is provenance for
    // a human reviewer, not part of the heading.
    const numbered = line.match(/^###\s+(\d+\.\d+)\s+(.*?)\s*$/);
    if (numbered) {
      flush();
      current = { number: numbered[1], title: numbered[2].replace(/✍️/g, '').trim(), buf: [] };
      continue;
    }

    const bare = line.match(/^##\s+(.*?)\s*$/);
    if (bare) {
      flush();
      const title = bare[1].replace(/✍️/g, '').trim();
      const mapped = LEGACY_TITLES[title.toLowerCase()];
      // A group header in a numbered file ("## 3. Medical Foundation") maps to
      // nothing and simply ends the previous section, which is correct.
      if (mapped) current = { number: mapped, title, buf: [] };
      continue;
    }

    if (current) current.buf.push(line);
  }
  flush();
  return out;
}

/** Strip HTML comments (gap markers) and collapse blank runs. */
function clean(text: string): string {
  return text
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function collect(): Chunk[] {
  const chunks: Chunk[] = [];
  const subdirs = ['centers', 'departments', 'programs', 'hospitals'];

  for (const sub of subdirs) {
    const dir = path.join(KNOWLEDGE_DIR, sub);
    if (!fs.existsSync(dir)) continue;

    for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.md'))) {
      const full = path.join(dir, file);
      const raw = fs.readFileSync(full, 'utf8');
      const { fm, body } = parseFrontMatter(raw);

      if (!fm.entity_id) {
        console.log(`  · ${sub}/${file} — no entity_id, skipped`);
        continue;
      }
      if (fm.status && fm.status.toLowerCase() !== 'active') {
        console.log(`  · ${sub}/${file} — status=${fm.status}, skipped`);
        continue;
      }

      let kept = 0;
      let denied = 0;
      let incomplete = 0;

      for (const s of sections(body)) {
        if (!ALLOWED_SECTIONS.has(s.number)) {
          denied++;
          continue;
        }
        if (INCOMPLETE.test(s.text)) {
          incomplete++;
          continue;
        }
        const text = clean(s.text);
        if (text.length < 40) {
          incomplete++;
          continue;
        }

        chunks.push({
          sourceRef: `${sub}/${file}#${s.number}`,
          topicAr: fm.entity_name_ar ?? fm.entity_id,
          topicEn: fm.entity_name_en ?? fm.entity_id,
          questionAr: `${fm.entity_name_ar ?? ''} — ${s.title}`.trim(),
          answer: text,
          // No hospitals in front matter means the content is not hospital
          // specific (a programme, a platform policy) and is ecosystem-wide.
          hospitals: fm.hospitals ?? [],
          category: sub,
        });
        kept++;
      }

      const scope = fm.hospitals?.length ? fm.hospitals.join('+') : 'ecosystem';
      console.log(
        `  ✓ ${sub}/${file} — ${kept} kept, ${denied} not patient-facing, ${incomplete} unfinished  [${scope}]`,
      );
    }
  }
  return chunks;
}

/** Same model and endpoint SemanticSource queries with — the dimensions must match. */
async function embed(text: string, apiKey: string): Promise<number[]> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'models/text-embedding-004', content: { parts: [{ text }] } }),
    },
  );
  if (!res.ok) throw new Error(`embed failed ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = (await res.json()) as { embedding?: { values?: number[] } };
  const v = data.embedding?.values ?? [];
  if (v.length !== 768) throw new Error(`expected 768 dimensions, got ${v.length}`);
  return v;
}

/** Verify the prerequisites without writing anything. */
async function check(): Promise<void> {
  console.log('\nChecking ingestion prerequisites\n');
  let ok = true;

  // 1 — the migration
  const cols = await prisma.$queryRawUnsafe<Array<{ column_name: string }>>(
    `SELECT column_name FROM information_schema.columns
      WHERE table_name = 'AiKnowledgeBase'
        AND column_name IN ('embedding','hospitals','sourceRef')`,
  );
  const present = new Set(cols.map((c) => c.column_name));
  for (const c of ['embedding', 'hospitals', 'sourceRef']) {
    if (present.has(c)) {
      console.log(`  ✓ column "${c}" exists`);
    } else {
      console.log(`  ✗ column "${c}" MISSING — apply migration 20260808120000_knowledge_embeddings`);
      ok = false;
    }
  }

  // 2 — the provider row
  const provider = await prisma.aiProvider.findFirst({
    where: { name: { contains: 'gemini', mode: 'insensitive' }, isActive: true },
  });
  if (!provider) {
    const all = await prisma.aiProvider.findMany({ select: { name: true, isActive: true } });
    console.log('  ✗ no ACTIVE provider whose name contains "gemini"');
    console.log(
      `      providers present: ${all.map((p) => `${p.name}${p.isActive ? '' : ' (inactive)'}`).join(', ') || '(none)'}`,
    );
    console.log('      the lookup is literal — a provider named "Google AI" will not be found');
    ok = false;
  } else if (!provider.apiKey) {
    console.log(`  ✗ provider "${provider.name}" has no API key stored`);
    ok = false;
  } else {
    console.log(`  ✓ provider "${provider.name}" is active and has a key`);

    // 3 — the key actually works, and returns the dimension the column expects
    try {
      const v = await embed('اختبار', provider.apiKey);
      console.log(`  ✓ Gemini responded — ${v.length} dimensions`);
    } catch (e) {
      console.log(`  ✗ Gemini call FAILED — ${(e as Error).message}`);
      ok = false;
    }
  }

  console.log(ok ? '\n✓ ready to ingest\n' : '\n✗ not ready — fix the above first\n');
  if (!ok) process.exitCode = 1;
}

async function main(): Promise<void> {
  if (CHECK) return check();

  console.log(`\nIngesting business/knowledge → AiKnowledgeBase${DRY_RUN ? '  (DRY RUN)' : ''}\n`);

  const chunks = collect();
  console.log(`\n${chunks.length} patient-facing section(s) collected.\n`);

  if (!chunks.length) {
    console.log('Nothing to ingest.');
    return;
  }

  if (DRY_RUN) {
    for (const c of chunks) {
      console.log(`  ${c.sourceRef}  [${c.hospitals.join(',') || 'ecosystem'}]  ${c.answer.length} chars`);
    }
    console.log('\nDry run — nothing written.');
    return;
  }

  const provider = await prisma.aiProvider.findFirst({
    where: { name: { contains: 'gemini', mode: 'insensitive' }, isActive: true },
  });
  if (!provider?.apiKey) {
    console.error(
      '\n✗ No active Gemini AiProvider. Embeddings use the same provider row SemanticSource reads,\n' +
        '  so add one in /admin → AI → Providers before ingesting.',
    );
    process.exitCode = 1;
    return;
  }

  let written = 0;
  for (const c of chunks) {
    const vector = await embed(`${c.questionAr}\n${c.answer}`, provider.apiKey);

    // Upsert on sourceRef so re-running replaces this section's row rather than
    // adding a second copy. Raw SQL because `embedding` is Unsupported() in
    // Prisma and cannot be written through the typed client.
    await prisma.$executeRawUnsafe(
      `INSERT INTO "AiKnowledgeBase"
         ("id","topic","question","answer","category","isActive","hospitals","sourceRef","embedding","createdAt","updatedAt")
       VALUES (gen_random_uuid()::text, $1::jsonb, $2::jsonb, $3::jsonb, $4, true, $5::text[], $6, $7::vector, NOW(), NOW())
       ON CONFLICT ("sourceRef") DO UPDATE
         SET "topic"     = EXCLUDED."topic",
             "question"  = EXCLUDED."question",
             "answer"    = EXCLUDED."answer",
             "category"  = EXCLUDED."category",
             "hospitals" = EXCLUDED."hospitals",
             "embedding" = EXCLUDED."embedding",
             "isActive"  = true,
             "updatedAt" = NOW()`,
      JSON.stringify({ ar: c.topicAr, en: c.topicEn }),
      JSON.stringify({ ar: c.questionAr, en: '' }),
      JSON.stringify({ ar: c.answer, en: '' }),
      c.category,
      c.hospitals,
      c.sourceRef,
      `[${vector.join(',')}]`,
    );
    written++;
    process.stdout.write(`\r  embedded ${written}/${chunks.length}`);
  }

  console.log(`\n\n✓ ${written} row(s) written.`);
  console.log('  Hand-authored rows (sourceRef IS NULL) were not touched.\n');
}

main()
  .catch((e) => {
    console.error(`\n✗ ${(e as Error).message}`);
    process.exitCode = 1;
  })
  .finally(() => void prisma.$disconnect());
