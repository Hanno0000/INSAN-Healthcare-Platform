# Operational Audit — Campaign OS

> **Version:** 1.0
> **Date:** 2026-07-29
> **Method:** Live sheet data, 298 production log entries, all source files, all six prompts.
> **Status:** **Baseline** — measured 2026-07-29 and deliberately unedited. Not the
> current state; per-finding status is in §8. See docs/DOCUMENT_STATUS.md.
> **Scope:** Findings that survived verification. Every number here was computed, not estimated.
> **Companion to:** `GAP_REGISTER.md` (coverage gaps) · `SYSTEM_ARCHITECTURE.md` (structure)

---

## How to read this

The first audit mapped the system. This one measures it. Where the two disagree,
this one wins — two of the earlier conclusions turned out to be wrong, and they are
corrected in §7.

Findings are ordered by cost of leaving them alone.

> ### ⚠️ This document is a baseline, not a status
>
> Every measurement here is from **2026-07-29** and is deliberately left unedited.
> It is the evidence the plan was built on, and it stays fixed so later work can be
> measured against it.
>
> **Most of these findings have since been addressed in code.** Reading this as the
> current state will send you to redo finished work. The status is
> `START_HERE.md` §6; per-finding status is in §8 below.

---

## 1. Production reliability — 26% of all worker calls failed

From 298 Execution Log entries:

| Status | Count | Share |
|---|---|---|
| SUCCESS | 191 | 64% |
| **FAILURE** | **78** | **26%** |
| PARTIAL | 29 | 10% |

Grouped by cause:

| Cause | Count | Category |
|---|---|---|
| Model no longer available (`gemini-2.5-flash`) | 15 | external |
| Quota exceeded | 16 | external |
| Model overloaded / high demand | 13 | external |
| Image model not found (`imagen-3.0`, `imagen-4.0`) | 3 | external |
| **Sheet data-validation rejections** | **19** | **internal — §2** |
| Prompt file could not be loaded | 7 | internal |
| Write verification failed (Publishing Date) | 3 | internal |
| Spreadsheet service error | 1 | infra |

**47 of 78 failures (60%) were external API conditions.** Model deprecation is the
largest single cause, and it is recurring: the log shows three different models
disappearing or being renamed under this project.

**Two conclusions**

1. The retry policy does not cover the failures that actually happen.
   `RETRYABLE_HTTP: [408, 429, 500, 502, 503, 504]` retries quota and overload —
   correct — but a deprecated model returns 400 and is retried zero times, correctly,
   with no operator signal beyond a log line. A model that vanishes should raise a
   *configuration* alarm, not a row failure repeated 15 times.

2. `C4 — Claude as alternate provider` has been sitting dormant in the roadmap while
   31 rows failed to Gemini availability. The fallback exists in code
   (`AIProvider.call` routes on `provider`) and needs only a key. This is the
   cheapest reliability win available.

---

## 2. Code and sheet disagree about controlled vocabulary — 19 failures

`CONFIG.CONTROLLED_VOCABULARY` is injected into the prompt, so the worker produces
exactly what the code asks for. The sheet's dropdown then rejects it, because the
sheet's list is different.

Diffed programmatically:

| Field | Code injects | Sheet dropdown accepts |
|---|---|---|
| **Post Structure** | `Problem to Solution` · `Question to Answer` · `Before to After` | `Problem → Solution` · `Question → Answer` · `Before → After` |
| **Workflow Status** | `NEW` `READY` `PROCESSING` `COMPLETED` `FAILED` | `Content Writing` `Design` `Review` `Publishing` `Completed` `On Hold` |
| **Content Type** | `Community` and `Campaign` as two values | `Community Campaign` as one |
| **Content Format** | *(absent)* | also offers `Reel` `Video` `Motion Graphic` |

**Confirmed against the failures.** Column `Y` is Post Structure and column `AW` is
Workflow Status — and every data-validation failure in the log is on `Y`, `AW`, `AQ`
or `U`. The validation ranges themselves show the damage:

```
Y2:Y4 Y7:Y21 Y23:Y25 Y27:Y30 Y32 Y37:Y1000    ← Post Structure, punched full of holes
U2:U8 U10:U1000                                ← Content Type
AW3:AW1000                                     ← Workflow Status, starts at row 3
```

Those gaps are where validation was cleared by hand, row by row, to get past the
rejections. The workaround has been applied to individual cells for weeks.

Two of these are worse than cosmetic:

- **Workflow Status** — the code's state machine (`NEW → PROCESSING → COMPLETED`) and
  the sheet's human workflow (`Content Writing → Design → Review → Publishing`) share
  exactly one value. These are two different concepts wearing one column name.
- **Content Format** — the sheet offers `Reel`, `Video` and `Motion Graphic`, which
  `CONFIG_IMPLEMENTED_FORMATS` cannot produce. That is how a Video row entered the
  pipeline and consumed strategy, copy and creative direction before failing at
  generation with "Video generation not yet implemented."

**Fix:** one source of truth. Generate the `SYSTEM_CONSTANTS` sheet *from*
`CONFIG.gs`, or read `CONFIG.gs` *from* the sheet. Never maintain both.

---

## 3. Cost — 90% of every prompt is identical across rows, and nothing is cached

Measured token weights:

| Component | Tokens |
|---|---|
| CREATIVE_DIRECTOR_WORKER.md | 18,412 |
| MEDIA_GENERATION_SERVICE.md | 11,074 |
| CONTENT_CREATION_WORKER.md | 10,070 |
| VISUAL_QA_WORKER.md | 7,854 |
| CONTENT_STRATEGY_WORKER.md | 6,859 |
| VISUAL_PLANNER_WORKER.md | 5,451 |
| **Project docs loaded with every content worker** | **~10,225** |

Observed per-call input, from the log:

| Worker | Avg input | Avg output | Ratio |
|---|---|---|---|
| Creative Director | 20,130 | 904 | 22 : 1 |
| Content Creation | 18,885 | 715 | 26 : 1 |
| Content Strategy | 18,158 | 579 | 31 : 1 |
| Visual Planner | 6,584 | 100 | 66 : 1 |
| Visual QA | 5,847 | 211 | 28 : 1 |

**Input dominates by 25:1.** Cutting input cost is nearly the same as cutting total cost.

Per published post: **≈ 82,000 input tokens** (three content workers + Media Designer
+ visual planner + QA). For the 132 posts currently scheduled: **≈ 10.8 million input
tokens**, of which roughly **9.7 million are byte-identical** — the same six project
docs and the same six worker manuals, re-sent on every row.

### Why nothing is cached

`PROMPT_CACHING_PLAN.md` identified the blocker precisely on 2026-07-27 and it is
still present:

```javascript
// src/ContextBuilder.gs:148
'Time: ' + new Date().toISOString(),
```

Every caching mechanism — Gemini implicit, Gemini explicit, Anthropic
`cache_control` — matches a prefix from byte zero. This line is the third line of
every prompt and changes on every call, so the cacheable prefix is two lines long.

The plan verified that nothing reads this timestamp. It remains unimplemented.

⚠️ **`src/MediaDesigner.gs:83` has the same line.** It was written this week, copying
the existing header pattern, and reproduces the defect in the newest worker.

**This is the highest-value cost work in the system, and it is one deleted line plus a
cache key.** Section 3 of the caching plan already verified that the prompt is
correctly ordered — everything static precedes everything dynamic — so no
restructuring is needed and the quality risk is near zero.

---

## 4. The prompts are not bloated — correcting an earlier assumption

The first audit suggested prompt length (11,194 lines) was a cost problem worth
cutting. Measured overlap between the six prompts:

```
                             CREATION  STRATEGY  DIRECTOR  PLANNER   QA   MEDIA
CONTENT_CREATION_WORKER.md        258         0         0        0     0       0
CONTENT_STRATEGY_WORKER.md          0       179         2        0     0       0
CREATIVE_DIRECTOR_WORKER.md         0         2       590        1     0       0
VISUAL_PLANNER_WORKER.md            0         0         1      187     0       1
VISUAL_QA_WORKER.md                 0         0         0        0   267       0
MEDIA_GENERATION_SERVICE.md         0         0         0        1     0     377
```

Substantial lines (>40 chars) shared between any two prompts: **at most 2**.
Lines appearing in three or more prompts: **zero**.

There is essentially no copy-paste between them. The length is genuine, distinct
instruction per worker — a real asset, not debt.

**Revised recommendation: do not cut the prompts.** Cache them instead. Caching
reduces the same cost without touching a word of output; cutting risks the quality
that took a sprint to build.

The docs, by contrast, *are* duplicated — the same ~10,225 tokens go to all three
content workers on every row. That is the 4-million-token line item, and caching
removes it without deleting anything.

---

## 5. Documentation has drifted from the system it describes

| Claim | Documents asserting it | Implementations |
|---|---|---|
| Model Router | 4 | **0** |
| Publishing Service | 10 | **0** |
| OCR verification | 2 | 0 (deliberately deferred) |

Six architecture documents still carry `Status: Sprint 1 — Visual Language
Integration`. `SPRINT_1_ROADMAP.md` reads `Active — In Progress`.
`SPRINT_2_VALIDATION_IMPROVEMENTS.md` reads `IN PROGRESS`. `CURRENT_STATE.md` says
Sprint 3. All four cannot be true.

This is the same failure mode `CURRENT_STATE.md` warns about at the top of its own
file — *"an audit that reads instructions rather than outputs will confirm whatever
the instructions claim."* The warning was written about worker audits; it applies to
the documentation itself.

**Fix:** a document describing unbuilt behaviour must say so in its status line, on
the same line as its version. `WORKER_CONTRACTS_V2.md` uses 🔴/🟡/🟢 for this.

---

## 6. SaaS readiness — eleven hardcoded identifiers

The stated ambition is to run this architecture for other brands. Currently
`CONFIG.gs` contains **11 hardcoded Google identifiers**:

```
DOCS_FOLDER_ID · PROMPTS_FOLDER_ID · VISUAL_PROMPTS_FOLDER_ID
PROJECT_ASSETS.FOLDER_ID · TEXT_OVERLAY.TEMPLATES ×2
VISUAL_ASSETS ×5  (generated, approved, rejected, published, archive)
```

plus `PUBLISHING_PAGES: ['INSAN', 'Future', 'Delta']` and brand-specific visual
language labels.

**Assessment: the architecture is portable; the configuration is not.** The worker
contracts, the pipeline shape and the knowledge/card/calendar separation are all
brand-neutral. What blocks a second tenant is that identity lives in a source file
rather than in configuration.

**Path to multi-tenant, in order of effort:**

1. Move all 11 IDs and the page list into Script Properties, read at startup —
   makes a second deployment a configuration exercise rather than a code fork.
2. Extract `INSAN Visual Language` into a per-tenant document, as the prompts
   already do.
3. Only then consider a tenant registry.

None of this should happen before the pipeline produces a clean run for one brand.

---

## 7. Corrections to the first audit

Two conclusions in the first audit were wrong, and one was imprecise.

| First audit said | Actually |
|---|---|
| Prompt length is bloat worth cutting | Prompts have near-zero overlap; the duplication is in the **docs**, and caching removes it without deleting anything (§4) |
| "67% of rows have blank strategy" implied worker fault | Correct number, wrong emphasis — 26% of *calls* also failed outright, mostly on external API conditions (§1). Both must be fixed; they are independent. |
| `Campaign Defaults` has no consumer | It holds the campaign type templates (Corporate, Hospital, Medical Services, Signature, Educational). It has no *code* consumer, but it is the source of the six campaign types. Do not delete before mapping. |

---

## 8. Complete finding register

Severity: 🔴 silently degrades most output · 🟠 blocks automation or a subset ·
🟡 correctness risk · ⚪ cleanup

> **Status column added 2026-07-30.** ✅ addressed in code and covered by automated
> checks — **not** verified in production. ⬜ open.
>
> | | Finding | Status |
> |---|---|---|
> | F1 | 67% of rows have no strategy | 🟠 W1 built; rows still need cards built from knowledge files |
> | F2 | Workers accept empty input and invent | ✅ |
> | F3 | Knowledge base 5% written | 🟠 7 of ~40; two await operator facts |
> | F4 | Code and sheet vocabularies disagree | ✅ one run of Sync Dropdowns applies it |
> | F5 | Caching blocked by one timestamp line | ✅ line removed, Anthropic breakpoint in place, cached tokens logged. Gemini implicit caching needs measuring |
> | F6 | 26% call failure, 60% external | ✅ automatic provider failover |
> | F7 | Depth columns unused | ✅ W1 writes all six |
> | F8 | Campaign Planner not built | ✅ W2 built |
> | F9 | Publishing + Ads not built | ⬜ |
> | F10 | Service levels conflated | ✅ column added; 16 rows still need correcting |
> | F11 | Sheet offers formats the pipeline cannot make | ✅ |
> | F12 | Claude fallback dormant | ✅ enabled on the Creative Director |
> | F13 | Four tabs describe campaigns | ⬜ |
> | F14 | Content Calendar duplicates card data | ⬜ |
> | F15 | Docs claim unbuilt features | 🟠 the four docs in the reading path are current; six under `architecture/` and `roadmap/` still carry Sprint 1 headers |
> | F16 | Six docs stuck at Sprint 1 status | ⬜ |
> | F17 | 11 hardcoded IDs block multi-tenant | 🟠 two new IDs read from Script Properties; the original eleven have not moved |
> | F18 | MediaDesigner reproduces the cache blocker | ✅ |
> | F19 | Three new components unverified | ⬜ **still open — needs a production run, and it now blocks the visual work** |
> | F20 | Template.md was headings only | ✅ |

| # | Finding | Sev | Evidence |
|---|---|---|---|
| F1 | 67% of pipeline rows have no strategy | 🔴 | 89/132 rows blank G:R |
| F2 | Workers accept empty input and invent | 🔴 | completeness check exists for one worker only |
| F3 | Knowledge base 5% written | 🔴 | 2 files / ~40 entities |
| F4 | Code and sheet vocabularies disagree | 🔴 | 4 fields, 19 failures |
| F5 | Caching blocked by one timestamp line | 🔴 | ~9.7M of 10.8M tokens redundant |
| F6 | 26% call failure rate, 60% external | 🟠 | 78/298 log entries |
| F7 | Depth columns unused | 🟠 | 1/16 cards |
| F8 | Campaign Planner not built | 🟠 | manual, 132 rows |
| F9 | Publishing + Ads not built | 🟠 | columns reserved, no code |
| F10 | Service levels conflated | 🟠 | departments listed as centers |
| F11 | Sheet offers formats the pipeline cannot make | 🟠 | Reel/Video/Motion Graphic |
| F12 | Claude fallback dormant while Gemini failed 31× | 🟠 | code exists, key absent |
| F13 | Four tabs describe campaigns | 🟡 | two have no consumer |
| F14 | Content Calendar duplicates card data | 🟡 | ~30 redundant columns |
| F15 | Docs claim unbuilt features | 🟡 | Model Router ×4, Publishing ×10 |
| F16 | Six docs stuck at Sprint 1 status | 🟡 | version headers |
| F17 | 11 hardcoded IDs block multi-tenant | 🟡 | CONFIG.gs |
| F18 | MediaDesigner reproduces the cache blocker | 🟡 | MediaDesigner.gs:83 |
| F19 | Three new components unverified | 🟡 | no production run |
| F20 | Template.md was headings only | ⚪ | fixed 2026-07-29 |

---

## 9. Recommended sequence

Each phase is ordered so that nothing later invalidates measurements taken earlier.

### Phase 0 — one hour, unblocks measurement

| | Action | Finding |
|---|---|---|
| 1 | Delete the timestamp line in `ContextBuilder.gs` **and** `MediaDesigner.gs` | F5, F18 |
| 2 | Log `cachedContentTokenCount` from the API response | F5 |
| 3 | Add `ANTHROPIC_API_KEY`, set one worker to `provider: 'claude'` | F12 |

Nothing here changes output. Step 2 makes the next phase measurable.

### Phase 1 — correctness before quality

| | Action | Finding |
|---|---|---|
| 4 | Make `CONFIG.gs` the single vocabulary source; regenerate `SYSTEM_CONSTANTS` from it | F4 |
| 5 | Remove `Reel` / `Video` / `Motion Graphic` from the Content Format dropdown | F11 |
| 6 | Refuse a row whose required inputs are empty, naming the fields | F2 |
| 7 | Add `Service Level` to Campaign Cards; correct the 16 rows | F10 |

Step 6 is what converts F1 from silent to loud.

### Phase 2 — close the input gap *(the real work)*

| | Action | Finding |
|---|---|---|
| 8 | Write the top five knowledge files, by scheduled volume | F3 |
| 9 | Build W1 Campaign Card Builder | F1, F7 |
| 10 | Enable caching with a content-hash key | F5 |

### Phase 3 — close the loop

| | Action | Finding |
|---|---|---|
| 11 | Verify Media Designer + TextOverlay + AssetIntegrity on one row | F19 |
| 12 | Build W2 Campaign Planner | F8 |
| 13 | Collapse redundant tabs | F13, F14 |

### Phase 4 — remove the remaining humans

| | Action | Finding |
|---|---|---|
| 14 | W9 Publishing | F9 |
| 15 | W10 Paid Ads — drafts specifications, does not spend | F9 |
| 16 | Move the 11 IDs to Script Properties | F17 |
| 17 | Reconcile documentation status lines | F15, F16 |

---

## 10. The honest summary

**The machinery is sound. Three separate things are wrong with what flows through it,
and they are independent of each other:**

1. **Two thirds of rows carry no strategy** — a coverage gap between the calendar and
   the campaign cards.
2. **A quarter of calls fail** — mostly external model availability, with a dormant
   fallback that would have absorbed most of it.
3. **Nine tenths of every prompt is paid for repeatedly** — one line blocks the fix.

None of the three is a prompt-quality problem, and every sprint so far has been spent
on prompt quality. The prompts are, on measurement, the healthiest part of the system.

---

*End of Operational Audit.*
