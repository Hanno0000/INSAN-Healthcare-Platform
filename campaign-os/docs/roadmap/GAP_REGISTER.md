# Gap Register

> **Version:** 1.0
> **Date:** 2026-07-29
> **Method:** Read of the live sheet, the code, the knowledge base and the prompts.
> **Parent:** `docs/SYSTEM_ARCHITECTURE.md`
>
> Complements `ISSUE_REGISTER.md`, which covers content/visual quality defects
> (A1–A10, B1–B9, C1–C8). This register covers **structural and coverage gaps**.

Ordered by impact on output quality, not by effort.

---

> ## Status, 2026-07-30
>
> The gap descriptions below are the 2026-07-29 measurement and are left unedited.
> This table is what has changed. **Nothing here has been verified in production.**
>
> | | Gap | State |
> |---|---|---|
> | G1 | Two thirds of rows have no strategy | 🟠 The mechanism is built — W1 exists, workers refuse a starved row by name — but the rows still have no strategy until cards are built from knowledge files. **Made loud, not yet closed.** |
> | G2 | Workers accept empty input | ✅ `CONFIG.REQUIRED_INPUTS` per worker, checked before any write |
> | G3 | Knowledge base 5% written | 🟠 7 files. 5 build a card; Emergency and Delta await operator facts |
> | G4 | Depth columns unused | ✅ W1 writes all six |
> | G5 | Campaign Planner does not exist | ✅ W2 built, unverified |
> | G6 | Publishing and Paid Ads do not exist | ⬜ Unchanged |
> | G7 | Service levels conflated | ✅ Column added; the 16 existing rows still need correcting by hand |
> | G8 | Four tabs describe the same concept | ⬜ Unchanged |
> | G9 | Content Calendar duplicates campaign data | ⬜ Unchanged |
> | G10 | Prompt length | ⬜ Deliberately untouched — caching removes the cost without deleting the asset |
> | G11 | Three components unverified in production | ⬜ **Still open, and now the oldest blocker.** Needs one row, end to end |
> | G12 | Template.md was headings only | ✅ Fixed 2026-07-29 |
>
> Current state and next actions: `START_HERE.md` §6.

---

## Severity

| | |
|---|---|
| 🔴 **Critical** | Silently degrades output on most rows |
| 🟠 **High** | Blocks automation, or degrades a subset |
| 🟡 **Medium** | Correctness or maintenance risk |
| ⚪ **Low** | Cleanup |

---

## G1 🔴 — Two thirds of pipeline rows have no strategy

**Evidence**

```
Content Pipeline rows with a campaign : 132
  fully blank strategy fields (G:R)   :  89   (67%)
  complete                            :  43
```

```
Content Calendar schedules  : 41 distinct campaigns
Campaign Cards covers       : 16
Slots with no card          : 81 of 132  (61%)
```

**Cause.** The transfer is `VLOOKUP(Campaign Name → Campaign Cards)`. When the campaign
has no card the lookup returns `""`, and all twelve strategy fields arrive blank.

**Effect.** The Content Strategy Worker receives a campaign name, a date and a page —
and nothing else. It cannot fail, so it invents. Every downstream worker inherits the
invention. Weeks of prompt and image work were spent on rows that had no strategic
input to begin with.

**Fix**
1. Write the missing knowledge files, highest slot count first (`KNOWLEDGE_BASE_SPEC.md` §8)
2. Build W1 to generate the cards
3. Add G2 so this can never be silent again

**Blocks:** any meaningful quality assessment of the content team.

---

## G2 🔴 — Workers accept empty input

`WorkerRunner` runs a worker on any row in range. There is a completeness check, but
it applies only to `VISUAL_PLANNER_WORKER`:

```javascript
if (upperName === 'VISUAL_PLANNER_WORKER') {
  var missing = _missingCreativeFields(rowData);
  if (missing.length) { throw new Error(...); }
}
```

**Fix.** Extend the pattern: each worker declares required input columns; the runner
refuses the row and names the missing fields. A row that cannot be done well should
cost nothing, not produce plausible output.

---

## G3 🔴 — Knowledge base is 5% written

2 files for ~40 entities. 121 of 132 scheduled slots have no source document.

**Highest impact missing files**

| Entity | Slots |
|---|---|
| Emergency | 16 |
| Meet Our Doctors / Patient Journey / Success Stories | 18 |
| Meet Our Team / Behind The Scenes / Hospital Life | 15 |
| Delta Hospital | 8 |
| Cardiac Center | 5 |

Full registry in `KNOWLEDGE_BASE_SPEC.md` §7.

---

## G4 🟠 — Depth columns unused

`Core Positioning`, `Human Insight`, `Invisible Product`, `Psychological
Transformation`, `Trust Platform Type`, `Narrative Arc` — filled on **1 of 16** cards.

`MEDICAL_SERVICE_ICU.md` contains all six, under those exact headings. The knowledge
exists; nothing carries it across. These are the fields that separate a distinctive
campaign from a generic one, which makes this a direct cause of the "generic output"
complaint.

**Fix.** W1.

---

## G5 🟠 — Campaign Planner does not exist

Planning is manual. The operator fills 132 calendar rows by hand.

The described interaction — *"a week, three pages, three posts a day, 30% on these
campaigns"* — is a well-specified problem with a deterministic core and a small
judgement layer. It is the highest-leverage worker not yet built: it is where the
operator's intent enters the system.

**Fix.** W2, per `WORKER_CONTRACTS_V2.md`.

---

## G6 🟠 — Publishing and Paid Ads do not exist

The chain stops at an approved asset in Drive. A human publishes and a human builds
every ad.

Columns `AC:AE` are already reserved in the Visual Pipeline, so W9 needs no schema
change — only Graph API tokens and an idempotency guard.

W10 needs a new `Ads Pipeline` tab. **W10 drafts specifications only; it must not
spend money.**

---

## G7 🟠 — Service levels are conflated

`Campaign Cards` lists Emergency, ICU, Laboratory, Diagnostic & Imaging and Surgical as
"Medical Centers". They are Departments. Meanwhile six real centers — Urology, Diabetic
Foot, Pain, Dental, ENT, Senior Health — have no card and are scheduled anyway.

**Fix.** Add a `Service Level` column (`DEPARTMENT` / `CENTER` / `CLINIC` / `PROGRAM` /
`CORPORATE` / `HOSPITAL` / `SUPPORTING`), and correct the existing 16 rows. Taxonomy in
`SYSTEM_ARCHITECTURE.md` §1.1.

---

## G8 🟡 — Four tabs describe the same concept

| Tab | Rows | Consumer |
|---|---|---|
| Campaign Cards | 16 | Content Pipeline VLOOKUP ✅ |
| Master Campaign Library | ~40 | page eligibility only |
| Campaign Defaults | 6 | none found |
| Campaign Overview | ? | none found |

Two have no consumer in the flow. Every additional place a campaign is described is
another place it can disagree with itself.

**Fix.** Fold page eligibility into Campaign Cards; delete the other two, or document
their owner.

---

## G9 🟡 — Content Calendar duplicates campaign data

The calendar carries ~38 columns, of which everything from `Business Goal` rightward
duplicates Campaign Cards. The Content Pipeline already looks those up.

**Fix.** Reduce the calendar to the eight scheduling columns.

---

## G10 🟡 — Prompt length

| Worker | Lines |
|---|---|
| Creative Director | 3,261 |
| Content Creation | 2,196 |
| Media Generation | 1,994 |
| Content Strategy | 1,944 |

~11,200 lines total, paid per row. The writing quality is high and this is a real
asset — but no worker needs its full manual on every row.

**Fix — later, and only on evidence.** Do not cut prompts while G1 is open; you would
be tuning the wrong variable. Revisit after a clean run.

---

## G11 🟡 — Three components unverified in production

`MediaDesigner.gs`, `TextOverlay.gs`, `AssetIntegrity.gs` were built this week. Only
`TextOverlay` has been exercised at all, via `testTextOverlay()`.

**Fix.** One row, end to end, before any batch.

---

## G12 ⚪ — Template.md is headings only

`Template.md` lists section names with nothing under them, while
`MEDICAL_SERVICE_ICU.md` is the real reference. Anyone starting a new file opens the
empty one.

**Fix.** Add per-section guidance: what belongs there, what a good answer looks like,
which Campaign Card column it feeds.

---

## Recommended order

**Phase 1 — stop the bleeding**
1. G12 — upgrade the template *(hours)*
2. G3 — write the top five knowledge files *(the real work; human + AI)*
3. G1 + G4 — build W1, generate cards *(days)*
4. G2 — refuse-on-empty guard *(hours)*
5. G7 — service level column *(hours)*

**Phase 2 — close the loop**
6. G11 — verify the visual components on one row
7. G5 — build W2
8. G8 + G9 — collapse redundant tabs

**Phase 3 — remove the remaining humans**
9. G6 — W9 publishing
10. G6 — W10 ads drafting
11. G10 — revisit prompt length with run evidence

---

## The one-sentence version

**The system's machinery is in better shape than its inputs.** Six workers run, the
contracts hold, and the visual pipeline has been hardened repeatedly — while two thirds
of the rows entering it carry no strategy at all. Phase 1 is worth more than every
prompt change made so far.

---

*End of Gap Register.*
