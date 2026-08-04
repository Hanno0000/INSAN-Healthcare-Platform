#!/usr/bin/env node
//
// Check a knowledge file the way the Campaign Card Builder will, without a sheet.
//
//   node campaign-os/tests/check-knowledge-file.js business/knowledge/departments/MEDICAL_SERVICE_ICU.md
//   node campaign-os/tests/check-knowledge-file.js --all
//
// WHY THIS EXISTS
//
// The sheet has a menu item — AI Workers → Planning → Check Knowledge File — that
// answers this question against the live workbook. Anyone writing knowledge files
// offline cannot reach it: it needs Apps Script, the spreadsheet, and Drive.
//
// This runs the SAME function, `CardBuilder.validate()`, against a file on disk.
// It is not a re-implementation and must never become one: a second definition of
// "is this file ready" would drift from the first, and the failure of that is a
// file that passes here and is refused by the builder, or worse, the reverse.
//
// What it cannot tell you: whether the campaign name joins to anything in the
// Content Calendar. That needs the sheet. See the note printed at the end.

'use strict';

const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, '..', 'src');
const REPO = path.join(__dirname, '..', '..');

// --- Apps Script services: present, and loud when touched --------------------
// Same stubs as tests/run.js. `validate()` is pure — it reads a string and
// returns a verdict — so nothing here should ever be reached. If one throws,
// that is a real finding: the gate would be touching the sheet.

function unavailable(name) {
  return new Proxy(function () {}, {
    get(_, prop) {
      if (prop === Symbol.toPrimitive || prop === 'toString') {
        return () => `[${name} unavailable]`;
      }
      throw new Error(`Apps Script service touched: ${name}.${String(prop)}`);
    },
    apply() { throw new Error(`Apps Script service touched: ${name}()`); }
  });
}

for (const svc of ['SpreadsheetApp', 'DriveApp', 'UrlFetchApp', 'PropertiesService',
                   'SlidesApp', 'CacheService', 'Utilities', 'HtmlService',
                   'ScriptApp', 'MailApp', 'Session']) {
  global[svc] = unavailable(svc);
}

global.Logger = { log: () => {} };

const globalEval = (0, eval);

for (const file of fs.readdirSync(SRC).filter((f) => f.endsWith('.gs')).sort()) {
  globalEval(fs.readFileSync(path.join(SRC, file), 'utf8'));
}

global.Logger = { log: () => {}, logSuccess: () => {}, logFailure: () => {} };

// --- reporting ---------------------------------------------------------------

const BOLD = '\x1b[1m';
const DIM = '\x1b[2m';
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const AMBER = '\x1b[33m';
const OFF = '\x1b[0m';

function checkOne(relPath, brief) {
  const full = path.isAbsolute(relPath) ? relPath : path.join(REPO, relPath);

  if (!fs.existsSync(full)) {
    console.log(`${RED}not found${OFF}  ${relPath}`);
    return false;
  }

  const content = fs.readFileSync(full, 'utf8');
  const name = path.basename(full);
  const check = CardBuilder.validate(content, name);
  const campaign = CardBuilder.campaignNameFor(check.frontMatter);

  if (brief) {
    const mark = check.ok ? `${GREEN}ready ${OFF}` : `${AMBER}blocked${OFF}`;
    const why = check.ok
      ? ''
      : `  ${DIM}${check.problems.length} problem(s), ${check.gaps.length} gap(s)${OFF}`;
    console.log(`  ${mark}  ${name.padEnd(46)} ${campaign || '(no campaign_name)'}${why}`);
    return check.ok;
  }

  console.log('');
  console.log(`${BOLD}${name}${OFF}`);
  console.log(`${DIM}${relPath}${OFF}`);
  console.log('');

  // --- front matter ---
  console.log(`${BOLD}Front matter${OFF}`);
  for (const key of ['entity_id', 'entity_name_en', 'entity_name_ar', 'campaign_name',
                     'service_level', 'campaign_type', 'hospitals', 'status']) {
    const value = check.frontMatter[key];
    const mark = value ? `${GREEN}ok${OFF}  ` : `${RED}MISSING${OFF}`;
    console.log(`  ${mark} ${key.padEnd(16)} ${value || ''}`);
  }
  console.log('');
  console.log(`  ${DIM}campaign_name is the join key. It must match Content Calendar`);
  console.log(`  and Campaign Cards character for character, or the card is`);
  console.log(`  correct in every field and joined to nothing.${OFF}`);

  // --- the 17 the builder refuses without ---
  console.log('');
  console.log(`${BOLD}Required sections${OFF} ${DIM}(CONFIG.CARD_BUILDER.REQUIRED_SECTIONS)${OFF}`);

  let missing = 0;
  for (const req of CONFIG.CARD_BUILDER.REQUIRED_SECTIONS) {
    const hit = CardBuilder._findSection(content, req.match);
    const written = hit && hit.body && hit.body.trim();
    if (!written) missing++;
    console.log(`  ${written ? GREEN + 'ok  ' + OFF : RED + 'MISS' + OFF}  ${req.name}`);
  }

  // --- problems ---
  if (check.problems.length) {
    console.log('');
    console.log(`${BOLD}${RED}Problems${OFF}`);
    check.problems.forEach((p) => console.log(`  - ${p}`));
  }

  // --- gaps ---
  if (check.gaps.length) {
    console.log('');
    console.log(`${BOLD}${AMBER}Gaps${OFF} ${DIM}(${CONFIG.CARD_BUILDER.GAP_MARKER} markers — the builder refuses to build past these)${OFF}`);
    check.gaps.forEach((g) => {
      console.log(`  line ${String(g.line).padStart(4)}  under "${g.section}"`);
      if (g.note) console.log(`            ${DIM}${g.note.slice(0, 100)}${OFF}`);
    });

    // The trap that has caught this project twice: writing the marker in plain
    // prose, outside an HTML comment, blocks a file that is otherwise finished.
    const lines = content.split('\n');
    const inProse = check.gaps.filter((g) => {
      const line = lines[g.line - 1] || '';
      return line.indexOf('<!--') === -1;
    });

    if (inProse.length) {
      console.log('');
      console.log(`  ${RED}${inProse.length} of these are NOT inside an HTML comment.${OFF}`);
      console.log(`  ${DIM}A marker written in ordinary prose — "this section is NEEDS-OPERATOR"`);
      console.log(`  — blocks the file exactly as a real gap does. If you meant to`);
      console.log(`  describe the marker rather than raise a gap, rewrite the sentence.${OFF}`);
      inProse.forEach((g) => console.log(`      line ${g.line}: ${(lines[g.line - 1] || '').trim().slice(0, 90)}`));
    }
  }

  // --- verdict ---
  console.log('');
  if (check.ok) {
    console.log(`${GREEN}${BOLD}READY${OFF} — a card can be built from this file.`);
  } else {
    console.log(`${AMBER}${BOLD}BLOCKED${OFF} — the Campaign Card Builder will refuse this file.`);
    console.log(`${DIM}That is the correct behaviour when facts are genuinely missing. Do not`);
    console.log(`remove a marker to unblock a file; fill in what it names.${OFF}`);
  }

  console.log('');
  console.log(`${DIM}Not checked here: whether "${campaign}" matches any row in the Content`);
  console.log(`Calendar. That needs the live sheet — AI Workers → Planning → Check`);
  console.log(`Knowledge File reports it, and costs no inference.${OFF}`);
  console.log('');

  return check.ok;
}

// --- run ---------------------------------------------------------------------

const args = process.argv.slice(2);

if (!args.length) {
  console.log('');
  console.log('  Check a knowledge file the way the Campaign Card Builder will.');
  console.log('');
  console.log('    node campaign-os/tests/check-knowledge-file.js <path-to-file.md>');
  console.log('    node campaign-os/tests/check-knowledge-file.js --all');
  console.log('');
  process.exit(2);
}

if (args[0] === '--all') {
  const root = path.join(REPO, 'business', 'knowledge');
  const files = [];

  for (const dir of fs.readdirSync(root)) {
    const full = path.join(root, dir);
    if (!fs.statSync(full).isDirectory()) continue;
    for (const f of fs.readdirSync(full)) {
      if (f.endsWith('.md')) files.push(`business/knowledge/${dir}/${f}`);
    }
  }

  console.log('');
  let ready = 0;
  for (const f of files.sort()) {
    if (checkOne(f, true)) ready++;
  }
  console.log('');
  console.log(`  ${ready} ready, ${files.length - ready} blocked, ${files.length} total`);
  console.log('');
  process.exit(0);
}

process.exit(checkOne(args[0], false) ? 0 : 1);
