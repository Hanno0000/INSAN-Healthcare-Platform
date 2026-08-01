#!/usr/bin/env node
//
// Campaign OS — behavioural checks for the logic layer.
//
//   node campaign-os/tests/run.js            run everything
//   node campaign-os/tests/run.js openings   run suites whose name contains "openings"
//
// No dependencies, no network, no Apps Script.
//
// ---------------------------------------------------------------------------
// WHAT THIS CAN AND CANNOT TELL YOU
//
// The `.gs` sources are plain JavaScript. What they do NOT have outside the
// Apps Script editor is its services — SpreadsheetApp, DriveApp, UrlFetchApp,
// PropertiesService, SlidesApp. Every one of those is stubbed below to throw.
//
// So these checks cover the decisions the system makes *before* it touches
// anything: which folder a row's photographs come from, whether a knowledge
// file may build a card, how an Arabic opening is classified, what the events
// calendar refuses to guess. That is the layer where the defects found on
// 2026-07-29 and 2026-07-30 actually lived.
//
// They do NOT prove the system runs. Nothing here writes a cell, reads Drive,
// or calls a model. A green run and a working deployment are different claims,
// and only a production run makes the second one — see START_HERE.md §6.4.
//
// If a check fails with "Apps Script service touched", the code under test
// reached for the sheet or Drive. That is not a bug in the test; it means the
// function is not part of the pure layer and needs a different kind of check.
// ---------------------------------------------------------------------------

'use strict';

const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, '..', 'src');
const CASES = path.join(__dirname, 'cases');
const REPO = path.join(__dirname, '..', '..');

// --- Apps Script services: present, and loud when touched ------------------

function unavailable(name) {
  return new Proxy(function () {}, {
    get(_, prop) {
      if (prop === Symbol.toPrimitive || prop === 'toString') {
        return () => `[${name} unavailable]`;
      }
      throw new Error(
        `Apps Script service touched: ${name}.${String(prop)} — this function is ` +
        `not part of the pure layer and cannot be checked here`
      );
    },
    apply() {
      throw new Error(`Apps Script service touched: ${name}()`);
    }
  });
}

for (const svc of ['SpreadsheetApp', 'DriveApp', 'UrlFetchApp', 'PropertiesService',
                   'SlidesApp', 'CacheService', 'Utilities', 'HtmlService',
                   'ScriptApp', 'MailApp', 'Session']) {
  global[svc] = unavailable(svc);
}

// The sources call Logger.log on non-fatal paths. Collect rather than throw, so
// a legitimate warning does not read as a failure.
const logLines = [];
global.Logger = { log: (m) => logLines.push(String(m)) };

// --- Load every source into one context, as Apps Script does ---------------

const sources = fs.readdirSync(SRC).filter((f) => f.endsWith('.gs')).sort();
const globalEval = (0, eval);

for (const file of sources) {
  try {
    globalEval(fs.readFileSync(path.join(SRC, file), 'utf8'));
  } catch (e) {
    console.error(`\n  cannot load src/${file}\n  ${e.message}\n`);
    process.exit(1);
  }
}

// src/Logger.gs defines its own Logger and replaces the stub above. Reinstall
// it: the real one writes to the Execution Log sheet, and a suite that
// deliberately exercises a warning path would otherwise print it into the test
// output as though something had gone wrong.
global.Logger = {
  log: (m) => logLines.push(String(m)),
  logSuccess: (...a) => logLines.push('SUCCESS ' + a.join(' ')),
  logFailure: (...a) => logLines.push('FAILURE ' + a.join(' '))
};

// --- Assertions -----------------------------------------------------------

let passed = 0;
const failures = [];
let suiteName = '';

function show(v) {
  if (typeof v === 'string') return JSON.stringify(v);
  try { return JSON.stringify(v); } catch (e) { return String(v); }
}

const t = {
  is(actual, expected, description) {
    const ok = show(actual) === show(expected);
    record(ok, description, `expected ${show(expected)}, got ${show(actual)}`);
  },
  ok(value, description) {
    record(!!value, description, `expected truthy, got ${show(value)}`);
  },
  notOk(value, description) {
    record(!value, description, `expected falsy, got ${show(value)}`);
  },
  includes(haystack, needle, description) {
    const ok = Array.isArray(haystack)
      ? haystack.indexOf(needle) !== -1
      : String(haystack).indexOf(needle) !== -1;

    // Truncated. A failing `includes` against a whole source file printed the
    // file, which buries the two other failures under it and makes the run
    // unreadable — the point of the output is to be scanned.
    const shown = show(haystack);
    const brief = shown.length > 220
      ? shown.slice(0, 200) + `… (${shown.length} chars)`
      : shown;

    record(ok, description, `does not contain ${show(needle)}\n          in: ${brief}`);
  },
  throws(fn, description) {
    let threw = false;
    try { fn(); } catch (e) { threw = true; }
    record(threw, description, 'expected a throw, got none');
  }
};

function record(ok, description, detail) {
  if (ok) {
    passed++;
  } else {
    failures.push({ suite: suiteName, description, detail });
  }
}

// --- Fixtures -------------------------------------------------------------

const fixtures = {
  repoFile(relative) {
    return fs.readFileSync(path.join(REPO, relative), 'utf8');
  },
  repoBytes(relative) {
    return Array.from(fs.readFileSync(path.join(REPO, relative)));
  },
  exists(relative) {
    return fs.existsSync(path.join(REPO, relative));
  },
  logLines
};

// --- Run ------------------------------------------------------------------

const filter = process.argv[2];
const suiteFiles = fs.readdirSync(CASES).filter((f) => f.endsWith('.js')).sort();
const started = Date.now();

for (const file of suiteFiles) {
  const suite = require(path.join(CASES, file));

  if (filter && suite.name.indexOf(filter) === -1 && file.indexOf(filter) === -1) {
    continue;
  }

  suiteName = suite.name;
  const before = passed + failures.length;

  try {
    suite.run(t, fixtures);
  } catch (e) {
    failures.push({
      suite: suiteName,
      description: '(suite threw before finishing)',
      detail: e.message + '\n      ' + String(e.stack || '').split('\n')[1]
    });
  }

  const ran = passed + failures.length - before;
  const bad = failures.filter((f) => f.suite === suiteName).length;
  const mark = bad ? 'FAIL' : ' ok ';
  console.log(`  ${mark}  ${suite.name.padEnd(34)} ${ran} checks`);
}

console.log('');

if (failures.length) {
  for (const f of failures) {
    console.log(`  FAILED  ${f.suite} — ${f.description}`);
    console.log(`          ${f.detail}`);
  }
  console.log('');
}

const total = passed + failures.length;
console.log(
  `  ${passed}/${total} checks passed in ${Date.now() - started}ms` +
  (failures.length ? `  —  ${failures.length} FAILED` : '')
);
console.log('');
console.log('  This covers the logic layer only. It does not prove the system runs:');
console.log('  no cell is written, no Drive folder read, no model called.');
console.log('');

process.exit(failures.length ? 1 : 0);
