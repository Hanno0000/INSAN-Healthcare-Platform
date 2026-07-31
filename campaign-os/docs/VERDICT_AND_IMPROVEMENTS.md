# Verdict and Proposed Improvements

> **Version:** 1.0
> **Date:** 2026-07-29
> **Status:** **Current** — the judgement and the phased plan. Phase status is
> maintained in §5. See docs/DOCUMENT_STATUS.md.
> **Companion to:** `OPERATIONAL_AUDIT.md` (Audit A) · `AUDIT_B_OUTPUT_AND_PORTFOLIO.md` (Audit B)
> **Why this exists:** the two audits catalogue defects. This document carries the
> professional judgement and the proposed improvements — material that was delivered
> verbally and would otherwise have been lost.

---

## Part 1 — The verdict

### Is this system viable as a SaaS product?

> **The IP is worth selling. The runtime it runs on is not — and that is fine, because
> a runtime is replaceable and IP is not.**

What has been built is not a tool. It is a **methodology**: deep knowledge file →
campaign card → calendar → content → visual execution, with one owner per decision.
That part is rare. Most agencies do not have this discipline; they work from memory and
instinct.

But the system runs on **Google Sheets + Apps Script**, and that is a ceiling rather
than a defect:

| Constraint | Consequence |
|---|---|
| ~360s execution limit | A three-worker content team over five rows does not fit in one invocation |
| No concurrency | Rows are processed serially, always |
| Sheets as database | No transactions, no safe concurrent writes, validation fights the code |
| No tenant isolation | A second client means a **full copy** of script + sheet + Drive folders |
| No API, auth, or billing | Nothing a SaaS requires exists |

**Conclusion:** INSAN is the right place to prove the methodology. A SaaS product is a
*separate* project that borrows the IP — not an evolution of this one.

---

### Strength profile — now vs after every fix in the audits

A single percentage would mislead. Each dimension has a different ceiling.

| Dimension | Now | After fixes | Ceiling | Why the ceiling |
|---|---|---|---|---|
| Copy quality | 72% | **88%** | 100% | Prompts are already excellent; fixes remove starvation and repetition |
| Image quality | 35% | **70%** | 80% | Capped by the image model, not the system |
| Portfolio consistency | 20% | **80%** | 90% | Creative-memory fix + portfolio critic |
| Reliability | 64% | **92%** | 95% | Claude fallback + handling model deprecation |
| Cost efficiency | 30% | **85%** | 90% | Caching alone removes ~90% of input |
| Automation | 45% | **80%** | 85% | 6 of 10 workers exist; the rest are buildable |
| Learning from results | 0% | **15%** | 25% | Manual entry at best — Sheets will not integrate with Meta seriously |
| Scalability | 15% | **30%** | 35% | Apps Script: 6 min, no concurrency |
| Multi-tenancy | 5% | **25%** | 30% | Moving IDs to properties eases copying; it does not make a SaaS |

**How to read this:** fixing everything in the audits produces **a system that runs one
brand very well**. It leaves three things unfixed by any amount of repair — *learning
from performance*, *scale*, and *multi-tenancy*. Those three need a different runtime.

---

### What was built correctly

These are the parts to keep if the system were rebuilt tomorrow.

| Asset | Why it matters |
|---|---|
| **The prompt library** | 11,200 lines with measured overlap of at most 2 lines between any pair. Genuine craft, not copy-paste. The single most valuable asset here. |
| **`MEDICAL_SERVICE_ICU.md`** | 2,761 lines of real institutional knowledge. The reference standard the whole system feeds on. |
| **Editorial / production split** | Content Pipeline vs Visual Pipeline. Correct and non-obvious. |
| **One decision, one owner, one field** | This discipline is what made diagnosing the defects possible at all. |

---

## Part 2 — The six themes

The audits produced 30 findings. They collapse into six themes, which is the right
granularity for deciding what to do.

| # | Theme | Core problem | Findings |
|---|---|---|---|
| 1 | **Input starvation** | Two thirds of rows arrive with no strategy | A·F1, A·F2, A·F3, A·F7 |
| 2 | **The system is blind to itself** | Nothing can see more than one post at a time | B·B1, B·B2, B·B4, B·B5, B·B6 |
| 3 | **Conflicting sources of truth** | Three systems, 18% agreement | B·B3, A·F4, A·F10, A·F13 |
| 4 | **Reliability and cost** | 26% of calls fail; 90% of each prompt is re-paid | A·F5, A·F6, A·F11, A·F12, A·F18 |
| 5 | **Incomplete chain** | Both ends are manual; nothing learns | A·F8, A·F9, B·B8 |
| 6 | **Debt** | Docs describe things that do not exist | A·F15, A·F16, A·F17, A·F19, B·B7 |

**Theme 2 is one root cause with five symptoms.** Repetitive openings, carousel
dominance, single-stage funnel and scattered hashtags are the same blindness expressed
in different columns.

---

## Part 3 — Proposed improvements

These are **not** defect fixes. They make the system better than it was designed to be.
Ordered by impact-to-effort.

### I1 — A portfolio critic: one worker that reads the whole plan before production

Every symptom in Theme 2 comes from per-row isolation. Rather than patching each
symptom, add one worker that reads all 132 rows **before** production starts and
reports: *"18 posts open with the same construction, 79% are carousels, there is no
conversion content, and the Emergency campaign repeats three days running."*

```
one call per plan — not per row
~15,000 tokens for the whole plan
against  132 rows × 82,000 = 10.8M
```

**Resolves four findings at once, for under 0.2% of current cost.**

---

### I2 — Two openings per post, and the operator picks

Output is remarkably cheap relative to input: **579 output tokens against 18,158
input**. Asking a worker for two distinct openings instead of one raises cost by
roughly **3%** and doubles the creative options.

```
input 18,158  +  output   579  = today
input 18,158  +  output 1,158  = +3%
```

**Doubles creative choice for 3%.**

---

### I3 — Retire the Visual Planner

The question was asked whether any worker could be removed. **One can.**

`VISUAL_PLANNER_WORKER` writes exactly three columns:

| Column | Reality |
|---|---|
| `Asset Count` | Derivable from Content Format |
| `Production Mode` | Already computed in code by `DriveLoader.resolveAssetDomain` |
| `Reference Asset Package` | A brief that largely restates the Creative Director's Design Prompt |

Two of three outputs are deterministic and the third duplicates upstream work, at
**6,584 input tokens per row**.

**Saves 6,584 tokens/row and removes a worker from the maintenance surface.**

---

### I4 — An approved-asset library: stop generating every image from scratch

Every post currently generates its images fresh. An A-graded image for the Cardiac
Center **can be reused on another page with different copy** — and since ~79% of briefs
describe similar environments, reuse applies often.

`CONFIG.VISUAL_ASSETS.approved` **already exists and no code ever reads from it.**

**Direct saving on the single most expensive line: image generation.**

---

### I5 — An Egyptian events calendar

Nothing in the system knows Ramadan is coming, or World Diabetes Day, or Eid. These are
**the highest-engagement windows of the year** in this market.

Implementation: one column in the calendar plus a `Seasonal Context` field in the
planning brief.

**The cheapest marketing improvement on this list.**

---

### I6 — Make the brief a conversation, not a form

Today the operator fills 132 calendar rows. Instead: write one sentence — *"a week,
focus on Emergency and ICU, I want bookings"* — and have the Planner **ask what is
missing** before it starts:

> *"You asked for bookings, but the Emergency card has no offer and no booking CTA.
> Should I add one, or change the objective?"*

**The gain is not automation — it is a system that asks instead of assuming.** This is
what would have prevented the 67% gap at its origin.

---

### I7 — Make the website database the entity registry

The website already has **Prisma, 28 models and a working API** — real infrastructure,
already paid for. Campaign OS maintains entity lists in a spreadsheet.

If both read from the database, the entity conflict (22 entities, 18% agreement)
resolves **structurally rather than by hand**, and the groundwork for a future product
is laid in the same step.

---

## Part 4 — What I would do if this were mine

**I would not build a SaaS out of this spreadsheet.** I would run two tracks:

| Track | Decision |
|---|---|
| **INSAN — the current sheet** | Leave it. Fix it, run it, produce real campaigns for a year. Its purpose is to prove the methodology produces marketing results — **not to become a product.** |
| **The product — a separate project** | Take the **prompts, the knowledge structure and the contracts** — those are the assets. Leave Apps Script and Sheets behind. Then the three things above the ceiling (learning, scale, multi-tenancy) become buildable instead of impossible. |

---

## Part 5 — Recommended order

> **Status as of 2026-07-30.** Phases 0–3 are implemented and committed to `main`.
> ✅ means written and covered by automated checks. **It does not mean verified in
> production — nothing below has made a live API call.** The one item that requires
> a production run is the one item still open in Phase 3.
>
> Current state and next actions: `START_HERE.md` §6.

**Phase 0 — one hour, changes no output** ✅

1. ✅ Fix the creative-memory window *(B·B2 — direct cause of B·B1)*
   — anchored to the row being written; also falls back to the draft copy so W4
   sees openings from its own plan
2. ✅ Delete the timestamp line in `ContextBuilder.gs` **and** `MediaDesigner.gs`
   *(A·F5, A·F18)*
3. ✅ Add `ANTHROPIC_API_KEY`, switch one worker to Claude *(A·F12)*
   — Creative Director. Required removing `temperature`, which the Claude 5 family
   rejects with a 400; without that fix the first row would have failed three times
4. ✅ Log cached tokens from both providers *(A·F5 — from Audit A §9)*

**Phase 1 — correctness before quality** ✅

5. ✅ One vocabulary source between code and sheet *(A·F4)*
   — `syncVocabularyFromConfig` writes every dropdown in all three sheets.
   `Workflow Status` was two concepts in one column; the machine state moved to a
   new `Pipeline State`
6. ✅ Remove unmakeable formats from the dropdown *(A·F11)* — falls out of item 5
7. ✅ Refuse rows with empty required inputs *(A·F2)*
   — per-worker required lists in `CONFIG.REQUIRED_INPUTS`, checked before any write
8. ✅ Add `Service Level` to Campaign Cards *(A·F10)* — appended, never inserted
9. ✅ *(added)* Automatic provider failover — what would have rescued the 31 rows

**Phase 2 — close the input gap (the real work)** ✅

10. 🟠 Write the top five knowledge files by scheduled volume *(A·F3)*
    — all five written and structurally complete. Three build cards now; Emergency
    and Delta carry `NEEDS-OPERATOR` markers on sections needing facts only the
    operator has
11. ✅ Build W1 Campaign Card Builder *(A·F1, A·F7)*
12. ✅ Enable caching *(A·F5)* — prompt split with an Anthropic cache breakpoint,
    verified byte-identical to the previous assembly. Explicit Gemini caching
    deliberately not built: measure implicit caching first, per the plan's own step 3

**Phase 3 — improvements** — code ✅, verification ⬜

13. ✅ I1 portfolio critic · ✅ I3 deterministic visual plan (off by default) ·
    ✅ I2 two openings
14. ⬜ **Verify Media Designer + TextOverlay + AssetIntegrity on one row** *(A·F19)*
    — **the only item in Phases 0–3 still open.** It is a production run, not code.
    Do it before enabling `CONFIG.VISUAL_PLAN.ENABLED`
15. ✅ Build W2 Campaign Planner *(A·F8)*, with I6 conversational brief

**Phase 4 — close the loop** ⬜

16. ⬜ I4 asset library · I5 events calendar
17. ⬜ W9 Publishing · W10 Paid Ads *(drafts specs, does not spend)*
18. ⬜ I7 shared entity registry · move the 11 hardcoded IDs to properties

---

## One paragraph

The machinery is in better shape than its inputs. Six workers run, the contracts hold,
and the visual pipeline has been hardened repeatedly — while two thirds of the rows
entering it carry no strategy, a quarter of calls fail on external conditions, and the
one feature meant to give the system a view of its own output has never executed.
**None of that is a prompt-quality problem, and every sprint so far was spent on prompt
quality.** The prompts are, on measurement, the healthiest part of the system.

---

*End of Verdict and Improvements.*
