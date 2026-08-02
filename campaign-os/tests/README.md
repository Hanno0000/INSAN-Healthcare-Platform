# Tests

> **Status:** **Current** — the committed behavioural checks for the logic layer.
> **Added:** 2026-07-31 · **Updated:** 2026-08-02

```bash
node campaign-os/tests/run.js
```

No dependencies, no network, no install. Runs in under a second.
Add a word to filter: `node campaign-os/tests/run.js openings`.

---

## Why this exists

`START_HERE.md` claimed for two days that "roughly 140 automated checks pass". They
had been run as throwaway scripts in earlier working sessions and never committed —
nobody could re-run them, and the claim could not be checked by anyone reading the
repository. A test result that only one person ever saw is not evidence.

**612 checks now, and they are here.**

---

## What it can and cannot tell you

The `.gs` sources are plain JavaScript, and every one of them loads into one Node
context exactly as Apps Script loads them. What is missing outside the editor is Apps
Script's own services — `SpreadsheetApp`, `DriveApp`, `UrlFetchApp`,
`PropertiesService`, `SlidesApp`. Every one is stubbed in `run.js` to **throw on any
access**.

So these checks cover the decisions the system makes *before* it touches anything:

| Suite | Checks | What it protects |
|---|---|---|
| `ad-policy` | 54 | Meta's rules as a constraint on the writing. Personal attributes — the most common healthcare rejection — and the Arabic boundary that made three of four rules dead on arrival |
| `archive` | 36 | One row per post across four tabs · deletion runs furthest-downstream first · refuses to run while a transfer formula remains |
| `asset-domains` | 27 | Which folder of real photographs a row gets. The substring traps — `ward` inside "award", `dental` inside "accidental", `management` inside "Pain Management Center" |
| `asset-filing` | 36 | Rejection reads `Generated Assets`, not the approval-only column · `REJ` can never become a reuse candidate · published files keep their names |
| `batches` | 21 | A batch id is the planning moment, so the same campaign planned twice is two batches |
| `branding` | 51 | Which marks each brand gets, an unknown brand getting none, and the 16% Meta text budget |
| `config-integrity` | 46 | Publishing ships in dry run · Budget is outside the ads worker's schema · managed columns are declared · no two vocabulary values differ only by case |
| `entity-registry` | 24 | The registry's 24 entities parse; a malformed row is reported, never silently dropped |
| `events-calendar` | 26 | What is coming — and that a Hijri date with no entry is **reported missing, never estimated** |
| `knowledge-gate` | 25 | Which knowledge files may build a card. 24 ready, 2 waiting on operator facts — the claim in `KNOWLEDGE_BASE_SPEC.md` §7.8, checked |
| `menu-bindings` | 43 | **Every `onOpen` menu item points at a function that exists.** The binding is a string, resolved on the click and nowhere earlier |
| `namespace` | 24 | The names the sources put into the shared scope, pinned in `GLOBALS.txt`. No global owned by two files |
| `opening-formulas` | 29 | The five rhetorical constructions Audit B measured, and the Arabic word-boundary regression |
| `post-footer` | 88 | Standing hashtags merged in code · the wa.me links derived from the phone number, after two of three arrived with an extra zero |
| `response-parser` | 27 | JSON out of whatever the model wrapped it in; `Rejected` never corrected into `Approved` |
| `transfer` | 31 | Rows joined by a key the row carries, not by position · a transfer already downstream is skipped |
| `visual-plan` | 24 | Carousel scene counting, including the >4-card case that used to dead-end |

### Two suites about the shape of the code rather than its behaviour

`menu-bindings` and `namespace` exist because Apps Script has **no modules**. Every
`.gs` file is evaluated into one shared scope, and the menu resolves its functions out
of that scope by string:

```js
.addItem('Transfer Rows Forward', 'transferRowsForward')
```

Nothing resolves that string when the script loads, when the menu is built, or when
the sheet is opened. It resolves **when the operator clicks the item** — so a function
renamed, a file left out of a paste, or a section lost in a merge produces a menu that
draws perfectly and has an item that does nothing.

`GLOBALS.txt` pins the 136 names the sources contribute to that scope. It is what makes
"the sources were regrouped into different files and nothing changed" a measurement
rather than a claim. Regenerate it deliberately, in the commit that adds the name —
never to make a failing check pass.

**They do not prove the system runs.** No cell is written, no Drive folder read, no
model called. A green run and a working deployment are different claims, and only a
production run makes the second one — `START_HERE.md` §6.4 item 1.

If a check fails with *"Apps Script service touched"*, the function under test reached
for the sheet or Drive. That is not a bug in the test; it means the function is not
part of the pure layer and needs a different kind of check.

---

## The checks are known to fail when they should

A suite that cannot fail is decoration. Every regression below was introduced
deliberately, run, and caught:

| Regression | Caught by |
|---|---|
| Revert `_ARABIC_BOUNDARY` to `\b` — the bug that made the opening detector silently report zero | 7 checks in `opening-formulas` |
| Put `Budget` back into the ads worker's output schema | `config-integrity` |
| Turn `CONFIG.PUBLISHING.DRY_RUN` off | `config-integrity` |
| Add a bare `ward` keyword to the inpatient domain | `asset-domains` |
| Rename `transferRowsForward`, leaving the menu item pointing at nothing | `menu-bindings` and `namespace`, 6 checks |
| Declare `var Transfer` in a second file | `namespace` |
| Add a name to `GLOBALS.txt` that no source defines | `namespace` |
| Remove a name from `GLOBALS.txt` that a source does define | `namespace` |

`menu-bindings` also carries its mutation test inside the suite: the audit is run
against a source with one deliberately broken binding and must report exactly that
binding, then stop reporting it once the function exists.

---

## Writing a check

One file per suite in `cases/`. Each exports a name and a `run(t, fixtures)`:

```js
module.exports = {
  name: 'my suite',
  run(t, fx) {
    t.is(actual, expected, 'what should be true, in a sentence');
    t.ok(value, 'and why it matters');
  }
};
```

`t` has `is` · `ok` · `notOk` · `includes` · `throws`.

`fx` has `repoFile(path)` · `repoBytes(path)` · `exists(path)`, all repo-relative, plus
four for reading the sources themselves:

| | |
|---|---|
| `srcSection(name)` | the text of one original source unit — `srcSection('AdPolicy')` — wherever it now lives |
| `srcSections()` | all 31 of them, keyed by their original filename |
| `srcFiles()` | the five `.gs` files as they sit on disk, keyed by filename |
| `sourceGlobals` | the names the sources added to the shared scope, as a sorted list |

**Read a source by section, not by path.** The 31 sources were merged into five files
on 2026-08-02 and each is now delimited by `// BEGIN SOURCE FILE:` banners.
`srcSection` reads either shape, so a check keeps meaning what it meant.

Two ways this matters, both of which the merge actually hit:

- A check on `AdPolicy`'s regex literals, pointed at the whole of `AI.gs`, starts
  reporting on the regex literals of its ten neighbours.
- `archive` checks that **no source other than Archive** opens the archive sheet.
  By filename, after the merge, that excused all nine sources sharing `Planning.gs`.

Two conventions worth keeping:

**Check against the real repository, not fixtures.** A gate that passes on a hand-made
sample and fails on the actual knowledge files is worth nothing. Every suite here reads
the committed files.

**Write the description as a claim about behaviour.** The failure output is the
description, so `'Rejected stays Rejected'` tells you what broke and
`'test 14'` does not.

---

## A note on what these checks found

`knowledge-gate` surfaced two documents sitting in `business/knowledge/programs/` that
are not knowledge files — `Kbrna Campaigns.md` (1,164 lines of finished post copy) and
`KBRNA_META_ADS_PLAN.md`. `KNOWLEDGE_FOLDER_ID` is searched recursively, so both are
candidates for **Build Campaign Card**. The gate refuses them loudly rather than
building from them, so nothing is silently wrong — but they belong somewhere else, and
the check now lists them by name so that a *new* stray file fails instead of quietly
joining them.

*End of Tests README.*
