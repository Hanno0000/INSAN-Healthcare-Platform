#!/usr/bin/env node
/**
 * Validates receptionist/prompts/brands/*.md — the files the seed loads into
 * BrandPersona.
 *
 *   node receptionist/scripts/test-personas.js
 *
 * Two things are checked. First, that the front matter parses at all: these
 * files are edited by a brand owner, and a broken heading silently drops a
 * whole persona at seed time, leaving a surface answering with no voice and no
 * rules. Second, that Delta's hard constraints are actually present — they come
 * from HOSPITAL_DELTA.md §Never Promise and bind the receptionist the same way
 * they bind a campaign, so "we wrote them down somewhere" is not enough.
 *
 * The parser below mirrors seedBrandPersonas() in prisma/seed.ts. If one
 * changes, change both.
 */

const fs = require('fs');
const path = require('path');

const DIR = path.resolve(__dirname, '..', 'prompts', 'brands');

function parse(raw) {
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/.exec(raw);
  if (!m) throw new Error('missing front matter');
  const [, fm, body] = m;

  const scalar = (key) => {
    const r = new RegExp('^' + key + ':\\s*(.+)$', 'm').exec(fm);
    return r ? r[1].trim() : '';
  };

  const bilingual = (key) => {
    const block = new RegExp('^' + key + ':\\r?\\n((?:[ ]{2}\\w+:.*\\r?\\n?)+)', 'm').exec(fm);
    const out = {};
    if (block) {
      for (const line of block[1].split('\n')) {
        const kv = /^[ ]{2}(\w+):\s*(.+)$/.exec(line.replace(/\r$/, ''));
        if (kv) out[kv[1]] = kv[2].trim();
      }
    }
    return out;
  };

  const HEADING = '# قواعد العمل';
  const split = body.indexOf(HEADING);
  if (split < 0) throw new Error("missing '" + HEADING + "' heading");

  return {
    brandCode: scalar('brandCode'),
    entryMode: scalar('entryMode'),
    displayName: bilingual('displayName'),
    greeting: bilingual('greeting'),
    persona: body.slice(0, split).replace(/<!--[\s\S]*?-->/g, '').trim(),
    businessRules: body.slice(split).trim(),
  };
}

let passed = 0;
const failures = [];
const seen = {};

function check(name, cond, detail = '') {
  cond ? (passed++, console.log(`  ✓ ${name}`)) : (failures.push(name), console.log(`  ✗ ${name}${detail ? '\n      ' + detail : ''}`));
}

console.log('\n── files parse and carry a complete persona ──');
for (const file of fs.readdirSync(DIR).filter((f) => f.endsWith('.md'))) {
  let d;
  try {
    d = parse(fs.readFileSync(path.join(DIR, file), 'utf8'));
  } catch (e) {
    check(file, false, e.message);
    continue;
  }
  seen[d.brandCode] = d;

  const problems = [];
  if (!d.brandCode) problems.push('brandCode');
  if (!['DIRECT', 'ROUTER'].includes(d.entryMode)) problems.push(`entryMode='${d.entryMode}'`);
  if (!d.displayName.ar) problems.push('displayName.ar');
  if (!d.greeting.ar) problems.push('greeting.ar');
  if (d.persona.length < 80) problems.push('persona too short');
  if (d.businessRules.length < 80) problems.push('businessRules too short');
  if (d.persona.includes('<!--')) problems.push('HTML comment leaked into persona');

  check(
    `${file} → ${d.brandCode}/${d.entryMode} (persona ${d.persona.length}ch, rules ${d.businessRules.length}ch)`,
    problems.length === 0,
    problems.join(', '),
  );
}

console.log('\n── all three surfaces are covered ──');
check('INSAN present and is the ROUTER', seen.INSAN?.entryMode === 'ROUTER');
check('FUTURE present and is DIRECT', seen.FUTURE?.entryMode === 'DIRECT');
check('DELTA present and is DIRECT', seen.DELTA?.entryMode === 'DIRECT');

console.log('\n── Delta carries its documented hard constraints ──');
// Source: business/knowledge/hospitals/HOSPITAL_DELTA.md §Never Promise /
// §Offer Rules, and KBRNA_META_ADS_PLAN.md's mandatory creative constraints.
const deltaRules = seen.DELTA?.businessRules ?? '';
const REQUIRED = [
  ['no availability claims', 'إتاحة'],
  ['no price or discount talk', 'سعر'],
  ['no comparison', 'مقارنة'],
  ['no "under new management"', 'إدارة جديدة'],
  ['no claim a centre is running today', 'اتناشر مركز'],
  ['no treatment outcomes promised', 'نتائج علاجية'],
];
for (const [label, needle] of REQUIRED) {
  check(`Delta rules cover: ${label}`, deltaRules.includes(needle), `expected to find "${needle}"`);
}

console.log('\n── INSAN does not impersonate a hospital ──');
check('INSAN rules forbid speaking as the destination', (seen.INSAN?.businessRules ?? '').includes('متتقمصش'));
check('INSAN resolution is lazy, not an opening question', (seen.INSAN?.businessRules ?? '').includes('متسألش عن المنطقة في أول رسالة'));

console.log('');
if (failures.length) {
  console.error(`✗ ${failures.length} failed, ${passed} passed\n`);
  process.exit(1);
}
console.log(`✓ persona files — ${passed} checks passed`);
