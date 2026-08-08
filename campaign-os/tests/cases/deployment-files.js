// The files the operator pastes into the Apps Script editor.
//
// There is no deployment step in this project. Every change reaches production
// by a human copying a file into a browser, which makes two things checkable
// here that nothing else would catch:
//
//   1. The line counts START_HERE quotes are how a TRUNCATED PASTE is detected.
//      These files run to thousands of lines and a paste can silently lose its
//      tail; the operator compares Ctrl+End against that table. A stale number
//      in it is worse than none, because it is the one thing being trusted.
//
//   2. No .gs file may execute anything at load time.
//
// The second is here because it removed the whole menu on 2026-08-08. A leftover
// Telegram.gs sat in the editor carrying bare top-level statements —
// PropertiesService.getScriptProperties() and UrlFetchApp.fetch(), outside any
// function.
//
// Apps Script evaluates every file before calling anything, and `onOpen` is a
// SIMPLE TRIGGER: it fires on open with no authorization. UrlFetchApp and
// PropertiesService require authorization, so they threw during evaluation —
// before onOpen was ever reached — and the project failed to load. No menu.
//
// What made it hard to see is that running onOpen manually from the editor
// worked perfectly, because the editor runs authorized. A function that succeeds
// on demand and a menu that never appears is the signature of top-level code
// needing authorization.
//
// This suite cannot see the operator's editor. It can guarantee that nothing WE
// ship has that shape, so the next occurrence is known to be a stray file.
//
// Worth knowing when reading the mutation results: appending a top-level
// UrlFetchApp call to a shipped .gs does not merely fail this check — it makes
// tests/run.js REFUSE TO LOAD, because the harness evaluates each source and
// UrlFetchApp is not defined there. The runner dies with a ReferenceError before
// any check executes. That is stronger protection than a failing assertion, and
// it is also why a mutation harness counting "FAILED" lines reports nothing for
// this case. The check below still earns its place: it names the problem and the
// line, instead of leaving a stack trace to interpret.

const DOC = 'campaign-os/docs/START_HERE.md';

// Services that throw when touched during evaluation of a simple trigger.
const NEEDS_AUTH = [
  'UrlFetchApp', 'PropertiesService', 'DriveApp', 'SpreadsheetApp',
  'MailApp', 'GmailApp', 'CacheService', 'ScriptApp', 'HtmlService',
  'SlidesApp', 'DocumentApp', 'CalendarApp', 'Utilities'
];

module.exports = {
  name: 'deployment files',

  run(t, fx) {
    const doc = fx.repoFile(DOC);

    // srcFiles() is keyed by filename → content, not a list.
    const sources = fx.srcFiles();
    const names = Object.keys(sources).filter((n) => n.endsWith('.gs')).sort();

    t.is(names.length, 5, `five .gs files are shipped — ${names.join(', ')}`);
    t.ok(fx.exists('campaign-os/src/ControlCenter.html'),
      'plus the one .html, which cannot be merged into a .gs');

    for (const name of names) {
      const content = sources[name];
      const lines = content.split(/\r?\n/);
      while (lines.length && !lines[lines.length - 1].trim()) lines.pop();

      // --- 1. the count in START_HERE is the real count ---
      const withComma = lines.length.toLocaleString('en-US');
      t.ok(doc.indexOf('| `' + name + '` | ' + withComma + ' |') !== -1,
        `START_HERE states ${name} is ${withComma} lines — the operator compares ` +
        'this against Ctrl+End to catch a paste that lost its tail');

      // --- 2. nothing executes at load time ---
      //
      // Walk the top level only: a line at column zero that is not a comment,
      // not a declaration, and not the tail of a multi-line literal. Anything
      // left that touches an authorised service runs during evaluation.
      const offenders = [];
      let depth = 0;

      lines.forEach((line, i) => {
        const atTop = depth === 0;
        const code = line.replace(/\/\/.*$/, '');

        if (atTop && /^[A-Za-z_$]/.test(line)) {
          const declaration = /^(var|function|const|let|class)\s/.test(line);

          if (!declaration) {
            for (const service of NEEDS_AUTH) {
              if (new RegExp('\\b' + service + '\\s*\\.').test(code)) {
                offenders.push(`${name}:${i + 1}  ${line.trim().slice(0, 60)}`);
              }
            }
          }
        }

        for (const ch of code) {
          if (ch === '{' || ch === '(' || ch === '[') depth++;
          else if (ch === '}' || ch === ')' || ch === ']') depth--;
        }
      });

      t.is(offenders, [],
        `${name} calls no authorised service at the top level — that runs during ` +
        'evaluation, and in a simple trigger it throws and takes the menu with it');
    }

    // --- 3. the trap is written down where the operator reads it ---
    // The check above protects the repository. The failure came from a file that
    // was never in the repository, so the only defence for the next one is that
    // the operator knows the shape.
    t.ok(/No seventh file|No code outside a function/i.test(doc),
      'START_HERE warns that an extra editor file removes the menu — the repo ' +
      'cannot see the operator\'s editor, so the warning is the only guard');
    t.includes(doc, 'Telegram.gs',
      'and names the file it actually happened with, so the symptom is findable');
    t.ok(/simple trigger/i.test(doc),
      'and explains why: onOpen is a simple trigger and runs unauthorised');
    t.ok(/works when run|manually from the editor/i.test(doc),
      'including the confusing part — it works when run by hand and fails on open');
  }
};
