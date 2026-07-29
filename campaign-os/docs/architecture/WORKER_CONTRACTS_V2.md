# Worker Contracts

> **Version:** 2.0
> **Date:** 2026-07-29
> **Supersedes:** `VISUAL_WORKER_CONTRACTS.md` (visual team only — kept for detail)
> **Parent document:** `docs/SYSTEM_ARCHITECTURE.md`

Every worker in the system, in execution order. For each: what it reads, what it
writes, where its instructions live, and what makes it fail.

**Contract rule.** A worker may only write the columns listed under *Writes*. It may
only read the columns listed under *Reads*. If a worker needs a value it cannot read,
that is an architecture bug — fix the contract, do not let the worker invent.

---

## Status legend

| | |
|---|---|
| 🟢 | Built and running |
| 🟡 | Built, not yet verified in production |
| 🔴 | Not built |

---

## W1 — Campaign Card Builder 🔴

**Purpose.** Turn a knowledge file into a campaign strategy row.

**Runs.** Once per campaign, on demand. Not per post.

| | |
|---|---|
| **Reads** | `business/knowledge/**/*.md` — the whole file, plus its front matter |
| **Writes** | One row in `Campaign Cards` |
| **Prompt** | `prompts/planning/CAMPAIGN_CARD_BUILDER.md` 🔴 |
| **Code** | `src/CardBuilder.gs` 🔴 |

**Output columns**

| Group | Columns |
|---|---|
| Identity | Campaign ID · Umbrella Campaign · Master Brand · Sub-Brand · Medical Center · Campaign Name · **Service Level** |
| Decisions | Business Goal · Marketing Goal · Priority · Duration · Target Posts · Status · Execution Guidance · Desired Audience Perception |
| Strategy (O:Z) | Campaign Philosophy · Trust Platform · Core Message · Trust Promise · Emotional Trigger · Psychological Barrier · Content Pillars · Approved Content Angles · Non-Negotiable Rules · CTA Strategy · Primary KPI · Target Audience |
| Depth (AA:AF) | Core Positioning · Human Insight · Invisible Product · Psychological Transformation · Trust Platform Type · Narrative Arc |
| Provenance | Knowledge Source · Card Built At |

**Fails when**
- A required knowledge section is missing → name the section, write nothing
- `service_level` absent from front matter
- Entity name does not resolve to a known entity

**Never**
- Invents a fact not in the file
- Writes a partial card
- Overwrites a hand-entered campaign decision without recording it

---

## W2 — Campaign Planner 🔴 *(currently human)*

**Purpose.** Turn an operator brief into a filled calendar.

**Operator brief** — the input the human actually gives:

```
duration      : 7 days
pages         : INSAN, Future, Delta
posts per day : 3 per page
mix           : 30% → [Emergency, ICU, Cardiac]
                40% → [Meet Our Doctors, Hospital Life, Success Stories]
                30% → [Why INSAN, Brand Identity, Delta Restore Trust]
```

| | |
|---|---|
| **Reads** | Operator brief · all of `Campaign Cards` · existing `Content Calendar` (to avoid repeats) |
| **Writes** | `Content Calendar`: Day · Post Slot · Status · Calendar ID · Page · Campaign Group · Campaign Name · Hospital Brand |
| **Prompt** | `prompts/planning/CAMPAIGN_PLANNER.md` 🔴 |
| **Code** | `src/PlannerRunner.gs` 🔴 |

**Must respect**
- Requested mix percentages, within one slot
- `Master Campaign Library` page eligibility — Primary / Secondary per page
- No campaign twice on the same page on the same day
- Only campaigns with `Status = Active` **and an existing card**

**Fails when**
- A named campaign has no card → refuses and lists them. This is the guard that
  would have prevented the 67% blank-strategy defect.

---

## W3 — Content Strategy Worker 🟢

| | |
|---|---|
| **Reads** | Content Pipeline `A:R` — scheduling + the 12 strategy fields |
| **Writes** | Content Pipeline `S:AJ` (18 columns) |
| **Prompt** | `prompts/content/CONTENT_STRATEGY_WORKER.md` (1,944 lines) |
| **Code** | `WorkerRunner.runWorkerBatch` |

Content Objective · Content Angle · Content Type · Content Format · Content Funnel
Stage · Hook · Post Structure · Language Style · Emoji Style · Visual Concept ·
Visual Focus · Visual Priority · Design Mood · Composition · Visual Elements ·
Do NOT Show · Text On Design · Design Notes

**Known issue.** Runs happily on blank `G:R`. Should refuse — see `GAP_REGISTER.md` G2.

---

## W4 — Content Creation Worker 🟢

| | |
|---|---|
| **Reads** | Content Pipeline `A:AJ` |
| **Writes** | Content Pipeline `AK:AN` — Post Copy (AI) · Primary Hashtags · Secondary Hashtags · Design Prompt (AI) |
| **Prompt** | `prompts/content/CONTENT_CREATION_WORKER.md` (2,196 lines) |

---

## W5 — Creative Director Worker 🟢

**Purpose.** The publishing gate for editorial. Owns the final version of everything.

| | |
|---|---|
| **Reads** | Content Pipeline `A:AN` + creative memory (recent approved rows) |
| **Writes** | Content Pipeline `S:AJ` (refined) + `AO:AS` |
| **Prompt** | `prompts/content/CREATIVE_DIRECTOR_WORKER.md` (3,261 lines) |

`Creative Director Review Status ∈ {Pending, Under Review, Approved, Rejected, Needs Revision}`
— `Approved` is what transfers the row to the Visual Pipeline.

**Note.** W5 shares 18 columns with W3 by design; `SheetWriter.clearDownstreamOutput`
protects them by owner precedence.

---

## W6 — Visual Planner 🟢

| | |
|---|---|
| **Reads** | Visual Pipeline `A:Q` + QA feedback on revision |
| **Writes** | Visual Pipeline `S:U` — Asset Count · Production Mode · Reference Asset Package |
| **Prompt** | `prompts/visual/VISUAL_PLANNER_WORKER.md` (796 lines) |

Validates production readiness. Has **no creative authority** — by design.

---

## W7 — Media Designer 🟡

**Purpose.** Compose the image prompt(s) from the approved package.

| | |
|---|---|
| **Reads** | Visual Pipeline `A:U` |
| **Writes** | Nothing to the sheet directly — returns prompts to `ServiceRunner` |
| **Prompt** | `prompts/visual/MEDIA_GENERATION_SERVICE.md` (1,994 lines) |
| **Code** | `src/MediaDesigner.gs` |

Then `ServiceRunner` writes Visual Pipeline `V:X` — Generated Assets · Generation
Status · Generation Timestamp.

**Supporting components**

| Component | Role |
|---|---|
| `TextOverlay.gs` | Sets approved Arabic as real type after generation. The image model is never asked for text. |
| `AssetIntegrity.gs` | Deterministic gate before QA — aspect, resolution, asset count, uniformity, blank detection, duplicate detection, overlay success |

🟡 None of these three has completed a production run.

---

## W8 — Visual QA 🟢

| | |
|---|---|
| **Reads** | Visual Pipeline `A:U` + **the generated images as inline data** |
| **Writes** | Visual Pipeline `Y:AB` — Score · Decision · Notes · Final Asset URL |
| **Prompt** | `prompts/visual/VISUAL_QA_WORKER.md` (1,003 lines) |

`Visual QA Decision ∈ {Approved, Revision Required, Rejected}` — matched literally by
`stageMapping`.

**Structural limit.** A vision model grades what it was taught to grade. It scored a
set of half-cropped, wrong-aspect assets `A / Approved` with an accurate description of
their contents. Anything decidable by arithmetic belongs in `AssetIntegrity`, not here.

---

## W9 — Publishing Worker 🔴 *(currently human)*

| | |
|---|---|
| **Reads** | Visual Pipeline `A:AB` where `VISUAL_STAGE = PUBLISHING` |
| **Writes** | Visual Pipeline `AC:AE` — Publishing Status · Publishing Timestamp · Live Post URL |
| **Prompt** | `prompts/publishing/PUBLISHING_WORKER.md` 🔴 |
| **Code** | `src/PublishingRunner.gs` 🔴 |

**Requires** Facebook Graph API page tokens per page, in Script Properties.

**Must**
- Publish to the page named in `Publishing Page` — never a default
- Attach every asset in order for a carousel
- Post copy = `Creative Director Post Copy` + merged hashtags
- Refuse any row not `Approved` by W8
- Be idempotent — a re-run must never double-post. Check `Live Post URL` first.

---

## W10 — Paid Ads Worker 🔴 *(currently human)*

| | |
|---|---|
| **Reads** | `Campaign Cards` (audience, KPI, goal) + the published post |
| **Writes** | New tab `Ads Pipeline` 🔴 |
| **Prompt** | `prompts/ads/PAID_ADS_WORKER.md` 🔴 |
| **Code** | `src/AdsRunner.gs` 🔴 |

**Proposed columns**

Content ID · Campaign Name · Page · Live Post URL · Objective · Target Audience ·
Age Range · Gender · Location · Interests · Budget · Duration · Placements ·
Ad Status · Ad ID · Results

**Boundary — important.** W10 **drafts the specification only**. It does not spend
money. A human approves budget and launches. Automating spend is out of scope until
the rest of the chain has a production track record.

---

## Execution order and gates

```
W1 ──▶ W2 ──▶ W3 ──▶ W4 ──▶ W5 ──▶ [Approved] ──▶ W6 ──▶ W7 ──▶ W8 ──▶ [Approved] ──▶ W9 ──▶ W10
                                        ▲                              ▲                    ▲
                                    HUMAN GATE 1               HUMAN GATE 2         HUMAN GATE 3
                                  creative approval            visual approval       budget approval
```

Three human gates. Everything between them is machine work.

---

## Shared infrastructure

| Component | Responsibility |
|---|---|
| `WorkerRunner.gs` | Orchestration, execution budget, checkpoints, resume, operator stop |
| `ServiceRunner.gs` | Media generation loop, prompt fallback, text composition |
| `ContextBuilder.gs` | Assembles prompt + docs + row data + output schema |
| `AIProvider.gs` | Gemini / Claude routing |
| `SheetWriter.gs` | Write safety, validation bypass, downstream clearing |
| `SheetSchema.gs` | Column maps, row reads |
| `DriveLoader.gs` | Prompt and doc loading, image loading, project assets |
| `ResponseParser.gs` | JSON extraction, controlled-vocabulary validation |
| `Logger.gs` | Execution Log |
| `ControlCenter.gs/html` | Operator sidebar |

**Execution budget.** Apps Script terminates at ~360s. The system reserves 45s and
stops cleanly at 315s, writing a checkpoint. A full content team over 5 rows does not
fit in one execution — this is expected, not a failure.

---

*End of Worker Contracts.*
