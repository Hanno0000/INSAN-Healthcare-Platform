# Tab Consolidation — G8 and G9

> **Version:** 1.0
> **Date:** 2026-07-31
> **Status:** Decision and migration plan. **Nothing here has been executed** — every
> step is a change to the live sheet and belongs to the operator.
> **Closes:** `GAP_REGISTER.md` G8 (four tabs describe the same concept) and G9
> (Content Calendar duplicates campaign data)

---

## The rule

**One concept, one owner.** Every additional place a campaign is described is another
place it can disagree with itself — and the 18% agreement Audit B measured between
three *systems* has a smaller version of itself inside this one spreadsheet.

---

## What each tab actually holds

Measured from the workbook on 2026-07-31, not assumed.

| Tab | Rows | Columns | Read by code? |
|---|---|---|---|
| `Campaign Cards` | 43 (16 named) | 33 | ✅ Content Pipeline VLOOKUP, W1, W2, W10 |
| `Master Campaign Library` | 41 | 7 | ❌ **nothing** |
| `Campaign Defaults` | 6 | 9 | ❌ **nothing** |
| `Campaign Overview` | 43 | 6 | ❌ **nothing** |
| `Content Calendar` | 132 slots | 35 | ✅ formula → Content Pipeline A:F |

### Master Campaign Library — 41 rows

`Campaign Group · Campaign Name · INSAN · Future Hospital · Delta Hospital ·
14-Day Priority · فلسفة الحملة`

**41 rows is the number of distinct campaigns the calendar schedules.** This is the
only complete list of campaigns in the workbook, and the only place **page
eligibility** exists — which of the three pages may carry which campaign.

Two of its columns duplicate `Campaign Cards`: `14-Day Priority` against `Priority`,
and `فلسفة الحملة` against `Campaign Philosophy`.

⚠️ **`WORKER_CONTRACTS_V2.md` states that W2 "must respect Master Campaign Library
page eligibility — Primary / Secondary per page". `PlannerRunner.gs` does not read
this tab at all.** That is a contract clause with no implementation behind it, and it
is the same defect class as the stale documents in `DOCUMENT_STATUS.md` — found in a
current document rather than an old one.

### Campaign Defaults — 6 rows

`Template ID · Campaign Type · Business Goal · Marketing Goal · Target Audience ·
Trust Platform · Default Duration · Default Status · Default Execution Guidance`

Six rows — one per campaign type. Audit A §7 explicitly corrected an earlier
conclusion about this tab: it has no *code* consumer, but it is **the source of the
six campaign types**, and the note said plainly *do not delete before mapping*.

That warning still applies. The six types are the taxonomy in
`SYSTEM_ARCHITECTURE.md` §2.

### Campaign Overview — 43 rows

`Campaign ID · Umbrella Campaign · Sub-Brand · Medical Center · Campaign Name ·
Status`

Every one of these columns exists in `Campaign Cards`, with the same row count. This
tab is a **view** of the cards' identity block that someone built by hand and that
now has to be maintained by hand.

It is the clearest deletion in the workbook.

### Content Calendar — 35 columns

`Day · Post Slot · Status · Calendar ID · Page · Campaign Group · Campaign Name ·
Hospital Brand` — then **26 more columns**, `Business Goal` through `Narrative Arc`.

Those 26 are the campaign's strategy, copied onto every scheduled row. The Content
Pipeline already looks all of them up from `Campaign Cards` by campaign name. So the
same strategy exists in two places per post, one of them denormalised 132 times, and
nothing keeps them in step.

**This is how the two sources drift.** A card corrected after a plan was made leaves
132 calendar rows still carrying the old strategy.

---

## The decision

| Concept | Owner after consolidation |
|---|---|
| What a campaign *is*, and its strategy | **`Campaign Cards`** |
| Which page may carry which campaign | **`Campaign Cards`** — three new columns |
| The six campaign types and their defaults | **`Campaign Defaults`** — kept, and given a consumer |
| Which posts are scheduled, when, on which page | **`Content Calendar`** — eight columns only |
| What exists in the business at all | **`ENTITY_REGISTRY.md`** — outside the sheet |

**Deleted:** `Campaign Overview`, and `Master Campaign Library` once its two unique
concepts have moved.

---

## Migration order

The order matters. Every step is reversible until the one that deletes something, and
nothing is deleted until what it held has a new home that is actually read.

**1. Move page eligibility into `Campaign Cards`.**
Add `Page INSAN`, `Page Future`, `Page Delta` — the values Master Campaign Library
already carries. Add them to `CONFIG.MANAGED_COLUMNS` so `Create Managed Columns`
maintains them, and append rather than insert: the twelve strategy fields must stay
at O:Z because the Content Pipeline VLOOKUP addresses them by position.

**2. Make W2 read them.**
`PlannerRunner.checkCampaigns` already builds the eligible list; page eligibility is a
filter on it. This is the step that turns a written contract clause into behaviour —
and until it exists, step 5 would delete the only copy of a rule nothing enforces.

**3. Give `Campaign Defaults` a consumer.**
W1 fills every field from the knowledge file. Where a file cannot support a campaign
decision it returns `INSUFFICIENT` and leaves the cell blank. The type defaults are
the sensible fallback for exactly those cells — which is what this tab was built for
and has never been used as.

**4. Reduce `Content Calendar` to eight columns.**
Delete `Business Goal` through `Narrative Arc` — columns I to AH. Nothing reads them:
the Content Pipeline looks the same fields up from `Campaign Cards`. Do this **after**
a plan has been produced and checked, not before, so the deletion is verified against
a working pipeline rather than an empty one.

**5. Delete `Campaign Overview`.**
Nothing reads it and every column exists in `Campaign Cards`.

**6. Delete `Master Campaign Library`.**
Only after steps 1 and 2. Its 41-row campaign list is worth keeping as a reference
until `Campaign Cards` covers all 41 — at 16 today, that is a while away.

---

## What breaks if this is done out of order

- **Deleting Master Campaign Library before step 2** removes the only record of page
  eligibility, and W2 will schedule any campaign on any page with nothing to say it
  is wrong.
- **Deleting the calendar's strategy columns before a plan has run** removes the only
  copy of the strategy for any campaign whose card does not exist — which is 25 of
  the 41 campaigns today.
- **Inserting rather than appending columns in `Campaign Cards`** moves the twelve
  strategy fields out of O:Z and silently breaks the Content Pipeline VLOOKUP on every
  row. `SYSTEM_ARCHITECTURE.md` §6 states this; it is the single most damaging
  possible edit to the workbook.

---

## What this does not solve

Consolidating tabs does not close the 67% blank-strategy gap. That closes when
knowledge files are written and cards are built from them. This work stops the sheet
disagreeing with itself; it does not fill it.

---

*End of Tab Consolidation.*
