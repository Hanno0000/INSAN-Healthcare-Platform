# Audit B — Output, Portfolio and Ecosystem Coherence

> **Version:** 1.0
> **Date:** 2026-07-29
> **Status:** **Baseline** — measured 2026-07-29 and deliberately unedited. Status
> table below. See docs/DOCUMENT_STATUS.md.
> **Lens:** Backwards from the published post. What does the audience actually receive?
> **Independent of:** `OPERATIONAL_AUDIT.md` (Audit A), which examined the machinery.
> **Purpose:** a second, differently-angled reading, to be merged with Audit A.

---

## Why this reads differently

Audit A asked *"is the system built correctly?"* and inspected code, logs and schema.

This audit asks *"is the system producing a good marketing product?"* and starts from
the 33 finished posts, then works backwards. It examines the **portfolio**, not the
row — the things that are invisible when you review one post at a time and obvious
when you scroll a page.

Every finding below was invisible to Audit A's method.

---

> ### ⚠️ Baseline, not status
>
> Measured **2026-07-29** across 33 finished posts, and deliberately left unedited so
> later work can be measured against it. Status as of 2026-07-30:
>
> | | Finding | Status |
> |---|---|---|
> | B1 | 88% of posts open with one of five formulas | 🟠 Three mechanisms now exist — the creative-memory fix, a second opening per post, and a portfolio critic that measures the whole plan. **None has run.** The 88% stands until new posts are written |
> | B2 | The feature built to prevent B1 has never executed | ✅ Window anchored to the row being written; verified by simulation against the live sheet's shape |
> | B3 | Three systems disagree about what the business contains | ⬜ Needs a brand-owner decision, not code |
> | B4–B6 | Carousel dominance · single-stage funnel · scattered hashtags | 🟠 The portfolio critic measures all three. Fixing them is a planning decision it now surfaces |
> | B7–B10 | see below | ⬜ |
>
> The portfolio critic reproduces this audit's own B1 measurement from this audit's
> own data — that is what its test suite checks. Current state: `START_HERE.md` §6.

---

## B1 🔴 — 88% of posts open with one of five rhetorical formulas

Facebook truncates a post at roughly 250 characters. **The median post here is 1,199
characters and every one of the 33 exceeds 800.** So the first line is not merely
important — it is the entire product for most readers.

Measured across all 33 finished posts:

| Opening formula | Posts | Share |
|---|---|---|
| Temporal — *"لما … / قبل ما …"* | 12 | 36% |
| Opens with a quotation | 9 | 27% |
| Superlative — *"أصعب …"* | 6 | 18% |
| Negation — *"مش/ليس مجرد X.. بل Y"* | 3 | 9% |
| Opens with a question | 3 | 9% |
| **Any of the five** | **29** | **88%** |

The superlative cluster in full:

```
r14 [Future] أصعب جزء في الرعاية المركزة مش انتظار الشفاء.. هو انتظار معلومة تطمنك.
r17 [Delta ] أصعب دقيقة هي اللي بتقضيها قدام باب الرعاية المركزة.. مستني خبر يطمنك.
r18 [Delta ] أصعب لحظة بعد جراحة العظام مش الألم..
r23 [Future] أصعب لحظة ممكن يمر بيها ابن..
r28 [Delta ] أصعب دقيقة في حياة أي أب هي الدقيقة اللي بيجري فيها بطفله لغرفة الطوارئ..
r30 [INSAN ] أصعب جزء في أي قرار طبي كبير مش العملية نفسها.. هو الشك اللي بيسبقها.
```

`r14` and `r17` are effectively the same post: same subject (waiting outside ICU),
same structure, same closing verb (*تطمنك / يطمنك*). They are scheduled on two
different pages of the same ecosystem.

**On the Delta page, 3 of 9 posts open with "أصعب".** At three posts a day, a follower
meets that formula on the first day.

Each post, read alone, is good. The *feed* is formulaic. No single-post review can
detect this, which is why every quality review so far has passed.

---

## B2 🔴 — The feature built to prevent B1 has never executed

`ContextBuilder._buildCreativeMemory` exists specifically to show each worker the
recent openings so it avoids repeating them. It returns nothing, always.

```javascript
// src/ContextBuilder.gs
var lastRow  = SheetSchema.getLastRow(sheetName);
var scanFrom = Math.max(CONFIG.DATA_START_ROW, lastRow - 24);
```

The window is anchored to the **bottom of the sheet**, never to the row being written.
Simulated against the live sheet:

```
Content Pipeline getLastRow()          = 1000
rows holding Creative Director copy    = rows 2–34
window actually scanned, for every row = 976–1000   → 0 openings found
```

`getLastRow()` returns 1000 because validation and formulas extend that far. All
finished work sits at the top of the sheet; the window always looks at the bottom.

The function also never learns which row it is serving — it receives `rowData`, not a
row number — so it cannot look backwards from the current position even in principle.

**Result:** every worker has been writing in isolation, with no sight of what was
written before it, exactly as the system was designed *not* to do. B1 is the
predictable consequence.

The two lines that follow the scan, which strip and format the openings, are correct.
The defect is entirely in the window.

---

## B3 🔴 — Three systems disagree about what the business contains

One business, three descriptions of its medical centers:

| Source | Names |
|---|---|
| `MASTER_BRAND_ARCHITECTURE.md` | 12 centers, Arabic |
| `Campaign Cards` | 12 centers, English |
| `website/apps/api/prisma/seed.ts` | 12 centers, slugs |

Cross-referenced:

```
22 distinct entities named across the three
 4 present in all three
   → 18% agreement
```

| | Named only here |
|---|---|
| Brand document | Chest & Sleep · Diabetic Foot · ENT · General Surgery · Pain · Urology |
| Campaign Cards | Diagnostic & Imaging · Laboratory · Respiratory · Surgical |
| **Website database** | **Ophthalmology · Dermatology** |

The last row is the commercial risk. **The public website tells a patient that an
Ophthalmology Center and a Dermatology Center exist. The campaign system has never
heard of either.** A patient who arrives from an ad and browses the site sees services
no campaign supports; a patient who arrives from the site and searches social finds
nothing.

This is not a data-hygiene issue. It is the brand promise — *"the same system
wherever you go"* — failing at the first place a customer would check.

**Root cause:** no shared entity registry. The website and Campaign OS were built as
separate projects with separate lists, and nothing reconciles them.

---

## B4 🟠 — The funnel has only one stage

Across 33 posts:

| Content Objective | | Content Funnel Stage | |
|---|---|---|---|
| Build Trust | **85%** | Trust | **88%** |
| Educate | 12% | Awareness | 6% |
| Humanize Brand | 3% | Consideration | 6% |

There is no conversion stage at all, and awareness is 6%.

The stated purpose of these campaigns includes *"جمع حجوزات"* — collecting bookings.
No post in the produced set is built to convert. `Primary KPI` on the cards includes
`Emergency Calls` and `Brand Trust`, but nothing downstream asks a reader to act.

For a paid campaign this matters twice: a trust-only portfolio has no retargeting
ladder, and the ad account accumulates no conversion signal to optimise against.

**This is a strategy-layer gap, not a worker defect.** No worker is told what mix of
funnel stages a plan should contain, because nothing plans the mix — the human does,
in the calendar, and the calendar has no funnel column.

---

## B5 🟠 — 79% Carousel, against an explicit instruction, at ~3.5× the cost

| Content Format | Posts | Share |
|---|---|---|
| Carousel | 26 | **79%** |
| Static | 5 | 15% |
| Video | 1 | 3% |
| Infographic | 1 | 3% |

`CONTENT_STRATEGY_WORKER.md` says plainly:

> Never default to Carousel.
> Encourage balanced use of formats: Static, Carousel, Reel, Video, Story, Motion Graphic, Infographic.
> Intentionally diversify formats across campaigns whenever appropriate.

The instruction is being ignored at scale, and it is the single largest controllable
cost line in the system: a carousel generates 3–4 images where a static generates 1.
At 79% carousel the image bill is roughly **3.5× what a balanced mix would cost**, for
a format choice nobody deliberately made.

Two contributing causes:

1. Format is chosen per row, in isolation, with no view of the portfolio — the same
   blindness as B2. "Diversify across campaigns" is unenforceable by a worker that
   cannot see other campaigns.
2. `Asset Count` for a carousel defaults to 3 and may reach 10, with no cost ceiling.

Also present: **one Video row**, which `CONFIG_IMPLEMENTED_FORMATS` cannot produce. It
will consume strategy, copy and creative direction, then fail at generation.

---

## B6 🟠 — Hashtags are scattered to the point of uselessness

```
202 distinct hashtags across 33 posts
147 used exactly once  (73%)
```

Most used: `#منصة_إنسان` ×14, `#INSAN_Healthcare` ×13, `#منظومة_إنسان` ×11,
`#INSANEcosystem` ×10.

Two problems, opposite in direction:

- **The long tail does nothing.** A hashtag used once has no discovery value and
  builds no equity. 73% of the vocabulary is single-use.
- **The head is fragmented.** `#منصة_إنسان` and `#منظومة_إنسان` are two spellings of
  the same brand tag, splitting 25 uses across two tags. Same for
  `#INSAN_Healthcare` / `#INSANEcosystem`.

There is no hashtag strategy layer anywhere — no controlled set, no per-campaign tag,
no brand tag standard. Each worker invents tags per post, which is exactly what
produces this distribution.

---

## B7 🟡 — Copy length is uniformly wrong for the placement

```
min 914   median 1,199   max 1,593 characters
posts over 800 chars: 33 of 33
```

Facebook collapses at ~250 characters behind *"See more"*. Every post is 4–6× that,
and no post is short.

This is not necessarily wrong — long-form storytelling has a place — but **it is not a
decision anybody made.** There is no length target in any prompt, no variation by
format or funnel stage, and no short-form posts at all. A portfolio where every single
item has the same shape is a portfolio nobody art-directed.

---

## B8 🟡 — Nothing in the system can learn

The system has no place to record what happened after publishing. No reach, no
engagement, no clicks, no bookings — no column, no tab, no field.

Consequences:

- `Primary KPI` is written on every campaign card and never measured against anything.
- The Creative Director's quality score is the only feedback signal, and it is a
  judgement made *before* publication by the same family of model that wrote the post.
- The 30/40/30 campaign mix the operator specifies is a guess that never gets corrected.
- A SaaS product that cannot report performance is not sellable to a second client.

`C3 — performance feedback loop` is listed as deferred in the issue register. Audit A
reached the same conclusion structurally. From the output side it looks larger: this
is the difference between a content factory and a marketing system.

---

## B9 🟡 — The Creative Director is working correctly

Measured word overlap between `Post Copy (AI)` and `Creative Director Post Copy` on 29
posts where both exist:

| Verdict | Posts |
|---|---|
| Largely rewritten (<55% overlap) | 8 (28%) |
| Edited (55–85%) | 14 (48%) |
| Near-identical (>85%) | 7 (24%) |

This is a healthy distribution — refinement with occasional replacement, which is what
the role is meant to do. **A concern that the Creative Director might be discarding
the Content Creation Worker's output wholesale is not supported by the data.** Recorded
here because it was worth checking and the answer is reassuring.

---

## B10 ⚪ — Concepts with nowhere to live

Absent from the schema entirely, listed for completeness:

| Concept | Consequence |
|---|---|
| Post performance | B8 |
| Offers / promotions | Campaign Cards has no offers field, though the operator named offers as campaign input |
| Publishing time of day | Calendar has Day and Post Slot, no time |
| Client / hospital sign-off | No approval column between QA and publishing |
| Seasonality and events | No way to plan around Ramadan, holidays, awareness days |
| Frequency capping | Nothing prevents the same campaign appearing three days running |
| Language variant | Arabic and English mixed with no field marking intent |

---

## Finding register — Audit B

| # | Finding | Sev | Evidence |
|---|---|---|---|
| B1 | 88% of posts share five opening formulas | 🔴 | 29/33 measured |
| B2 | Creative memory never executes | 🔴 | window is rows 976–1000, always |
| B3 | Three systems disagree on what exists — 18% agreement | 🔴 | 22 entities, 4 shared |
| B4 | Funnel is 88% one stage, no conversion | 🟠 | objective distribution |
| B5 | 79% carousel against instruction, ~3.5× image cost | 🟠 | format distribution |
| B6 | 73% of hashtags used once; brand tag split | 🟠 | 202 tags / 33 posts |
| B7 | Every post 4–6× the visible length | 🟡 | median 1,199 chars |
| B8 | No performance data anywhere | 🟡 | no column, tab or field |
| B9 | Creative Director behaviour is healthy | ✅ | 28% rewrite rate |
| B10 | Seven concepts have no home in the schema | ⚪ | schema read |

---

## What this audit would fix first

Ordered by ratio of impact to effort.

**1. B2 — repair creative memory.** A window bug. Anchor the scan to the row being
written rather than to the bottom of the sheet, and pass the row number in. This is
the direct cause of B1, and B1 is the most visible quality problem in the product.

**2. B5 — cap carousel share.** The largest controllable cost in the system, running
against an instruction already written in the prompt.

**3. B3 — one entity registry.** Reconcile the three lists into a single source that
the website and Campaign OS both read. Until this exists, the ecosystem's central
promise is contradicted by its own website.

**4. B4 — plan the funnel mix.** Add funnel stage to the planning brief so the
operator states it and the planner enforces it.

**5. B6 — a controlled hashtag set** per brand and per campaign, in the campaign card.

**6. B8 — a performance tab.** Even manual entry of reach and engagement would give
the system its first feedback signal, and it is a precondition for the SaaS ambition.

---

## One paragraph

Audit A found that the machinery runs and the inputs are missing. This audit finds
that **where the machinery does run, it produces a portfolio that no art director
would sign off** — not because any single post is weak, but because nothing in the
system can see more than one post at a time. The feature that was supposed to provide
that view has never run. Every symptom in B1, B4, B5 and B6 is the same blindness
expressed in a different column.

---

*End of Audit B.*
