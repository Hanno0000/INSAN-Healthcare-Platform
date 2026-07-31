# Campaign OS — Session Handoff

> **Written:** 2026-07-27
> **For:** whoever picks this up next — most likely a fresh context window with no memory of this work.
> **Status: Superseded** by `START_HERE.md`. Kept for the story of how the system
> got here; where it disagrees with `START_HERE.md` §6, §6 wins.
> See `docs/DOCUMENT_STATUS.md`.
>
> **Read this before `CURRENT_STATE.md`.** That document describes the architecture as designed. This one describes what was actually wrong with it, why, and what remains.

---

## Read this first

The operator's complaint at the start of this session was: **"the content is okay but the images are weak and generic."**

That complaint was correct, and almost none of it was the image model's fault. The causes were, in order of how much damage they did:

1. Strategic inputs arriving **scrambled** — a spreadsheet formula off by one column
2. Code **injecting text into the image prompt** that then got drawn onto the artwork
3. Every carousel card receiving an **identical prompt**
4. The quality gate **never seeing the images it was grading**
5. The creative concepts themselves being **the same idea every time**

Every one of these was invisible from inside the system. Sprint 2 had closed with "Compliance Audit PASS" on every worker, because the audits reviewed prompt text rather than output. **The prompts were good. The plumbing was broken.**

If you take one thing from this document: **when output quality is bad, verify the inputs and the code path before touching the prompts.** Four of the five root causes above were unreachable by any prompt edit.

---

## Part 1 — What was wrong, and why

### 1.1 Strategic inputs were scrambled (worst single defect)

**Symptom:** Content felt generic and off-target. Nobody knew why.

**Cause:** One formula, in Content Pipeline cell `G2`:

```
=IF('Campaign Cards'!P2:P1000="","",'Campaign Cards'!P2:AA1000)
```

It pulled Campaign Cards columns **P→AA** into Content Pipeline columns **G→R**. The correct source range was **O→Z**. Every strategic field landed one column to the left of where its header said it was:

| Header said | Actually received |
|---|---|
| Campaign Philosophy | Trust Platform |
| Emotional Trigger | Psychological Barrier |
| CTA Strategy | Primary KPI |
| **Primary KPI** | **Target Audience** |
| **Target Audience** | a stray number (`1008`) |

So the Content Strategy Worker read `Target Audience` and got `1008`. It read `Emotional Trigger` and got a psychological barrier. **Every worker downstream inherited the scramble.**

**How it was found:** not by reading the workers — by dumping the raw sheet XML and comparing header row against data row. The formula was visible in the cell definition.

**Fix:** the operator corrected `G2` to `O2:O1000` / `O2:Z1000`. Verified — all 12 fields now align and `Content Objective` populates where it was previously blank.

**Guard added:** `Maintenance → Preflight Check` now flags a numeric `Target Audience`, audience data sitting in `Primary KPI`, and a `CTA Strategy` that isn't a CTA. It runs in seconds and costs nothing.

> **Lesson worth keeping.** This was invisible to every prompt-level review because each worker's *own* output looked plausible. Nothing in the system compares a field's content against what its name promises. If output quality is unexplained, dump the actual row data before anything else.

---

### 1.2 Code was writing text onto the artwork

**Symptom:** `Slide 1 of 4` and similar production labels appeared inside generated images. Sprint 2 recorded this as VP-001, assigned it to the Media Generation prompt, and marked it DONE.

**Cause:** `ServiceRunner.gs` appended a literal string to every carousel prompt:

```javascript
prompt += ". Slide " + (i + 1) + " of " + assetCount;
```

The image model drew what it was given. **No prompt rule could have prevented this** — the text was concatenated after every prompt-level instruction.

**Fix:** removed. Per-asset differentiation now comes from segmenting the Creative Director's direction, not from a counter appended in code.

> **Lesson worth keeping.** A finding assigned to a prompt owner will be "fixed" in that prompt regardless of whether the prompt is where it lives. Before accepting a fix, confirm the defect is actually reachable from the thing being edited.

---

### 1.3 Every carousel card got the same prompt

**Symptom:** four-card carousels looked like four attempts at one image.

**Cause:** the loop built one prompt and reused it for every asset, varying only the appended slide number.

**Fix:** `_segmentByAsset()` splits both the Design Prompt and `Text On Design` per asset. Two formats are supported: `|` separators (what the Creative Director now emits) and the legacy `Slide 1:` / `شريحة 1:` labels, so historical rows still work. Labels are stripped either way — they are production scaffolding, not artwork copy.

---

### 1.4 Visual QA was grading images it could not see

**Symptom:** every asset scored A+ and passed, including ones with duplicated text and an unauthorized INSAN logo.

**Cause:** `Generated Assets` holds a Drive URL. That URL was passed to the model **as plain text**. Vision was never invoked. The worker was reading the Creative Package and paraphrasing it back as if it were an observation — a QA note that would read identically if the image were blank.

**Fix, in two parts:**

- **Code:** `DriveLoader.loadImagesFromCell()` fetches the assets and passes them as inline image data. QA now **fails loudly** if no readable image is found, rather than silently grading a URL.
- **Prompt:** rewritten for a worker that can see. Literal description before judgement, an explicit anti-paraphrase rule, and the instruction to transcribe rendered text character by character.

**Confirmed working.** On the follow-up run it independently caught the row 5 collage, the row 6 duplicated text, and the row 4 tablet gibberish — the same defects found by manual review. Scores spread A / B+ / Needs Revision.

> **This is the single most important fix in the session.** A gate that cannot observe its subject will approve anything, and it will do so with confident-sounding notes.

---

### 1.5 The creative concepts were the same idea every time

**Symptom:** images looked generic even when technically clean.

**Cause — and this one is upstream of everything above.** Five campaigns produced these Visual Concepts:

> "teams move with identical, synchronized precision"
> "a collaborative healthcare team inside a modern corridor"
> "the medical team working in perfect harmony"
> "an Egyptian medical team … working in perfect, calm synchronization"

Three of five are the same image. The rest are screens and dashboards. Different hospitals, different subjects, one picture.

The mechanism is consistent: an abstract idea arrives — *governance*, *coordination*, *operational excellence* — and gets drawn directly. Coordination becomes people coordinating. A system becomes a dashboard. The frame contains the concept and nothing else.

Four of five also opened by naming the medium and its budget: *"a high-production cinematic transition"*, *"a warm, high-quality lifestyle photograph"*. Those describe expense. Nothing can draw expensive.

**The system already had the doctrine to prevent this.** `CONTENT_STRATEGY_WORKER.md` says *"Cameras record moments. Not concepts"* and *"if the camera cannot film it, rewrite it."* That rule had only ever been applied to copy — which is exactly why the writing was good and the images were not.

**Fix:** the camera test extended to the visual fields across every worker, the observed clichés named explicitly, a second-idea discipline with worked examples, brand-swap and recall tests, and reject authority given to the Visual Planner. In code, the cliché situations were added to the generation exclusions and production-value adjectives are stripped from the assembled prompt.

---

### 1.6 Smaller defects, same pattern

| Defect | Cause |
|---|---|
| `Reference Asset Package` ignored | Visual Planner wrote it; nothing ever read it |
| Media Generation prompt file inert | Never loaded — the service is code-driven, not prompt-driven. Editing it changed nothing |
| QA decision vocabulary mismatch | Prompt asked for `PASS`; `stageMapping` expected `Approved`. Only controlled-vocabulary injection kept the state machine alive |
| Unbounded revision loop | `Revision Required → PLANNING` had no counter, despite the flow doc specifying max 3. Harmless only because blind QA never rejected anything |
| One failed row halted the batch | A Video row — a format with no generation path — stopped QA from ever seeing the four rows that succeeded |
| Content Team timed out | Each worker opened its **own** 300s timer inside an execution the platform kills at 360s |
| No emoji, ever | `Emoji Style` appeared in prompts only as a field name. The word "emoji" was absent from the Content Creation prompt entirely |
| Hashtags never reached the post | No component merged them. Not a bug — an unassigned responsibility |
| Every row scored A | Calibration was subjective, so anything could be rationalised into it |
| Two rows opened identically | The phrase was an *example* in the prompt. Few-shot examples get copied, not learned from — self-inflicted in this session |
| Stale downstream data | Workers overwrote their own columns but never later stages'. A re-planned row kept the previous run's images **and its "Approved" verdict** |

---

## Part 2 — Where things stand

`docs/roadmap/ISSUE_REGISTER.md` is the numbered register: A1–A10 (content), B1–B9 (visual), C1–C8 (architecture), each with its evidence and fix. Read it for detail; the summary:

**Fixed and verified:** 22 issues. All of Part 1 above.

**Built but dormant — waiting on an operator action:**

| | What | To activate |
|---|---|---|
| **C1** | Project asset references — real facility photographs used as visual reference | Set `CONFIG.PROJECT_ASSETS.FOLDER_ID`, create subfolders named as in `CONFIG.PROJECT_ASSETS.DOMAINS`, add photographs. Nothing else. **Highest expected impact on generic-looking output** — 100% of media is currently invented from text with no photographic ground truth |
| **C4** | Claude as an alternate provider | Add `ANTHROPIC_API_KEY` to Script Properties, then `provider: 'claude'` on a worker in `CONFIG.WORKERS` |
| **C5** | Independent critic re-scoring the Creative Director's own grade | `CONFIG.CREATIVE_CRITIC.ENABLED = true` |

**Deferred with reasons:** C2 (Publishing Service), C3 (performance feedback loop), C8 (OCR — Visual QA already transcribes and checks rendered text; a second slower mechanism is cost without a demonstrated gap).

**Still open — generation-side, all confirmed present in the last run:** B3 collage layouts, B4 duplicated text, B5 gibberish on screens, B6 photorealism instead of the 70/20/10 style ratio, B7 cold grading, B8 posed team shots. Constraints were added for each; whether generation now avoids them is unverified.

---

## Part 3 — The critical open question

**Everything in Part 1 is a fix, not a result.**

The B-series in particular addresses defects at the point of generation, and image models do not reliably obey instructions however precisely worded. B3 through B8 all describe a model producing something it had already been told not to produce.

What can be claimed honestly:

- the defects are named and their causes understood
- the constraints are specific rather than categorical
- **Visual QA is confirmed to catch them when they slip through**

Whether generation now avoids them is a question only the next run answers.

`docs/roadmap/VALIDATION_RUN_002_CHECKLIST.md` exists for exactly this: 26 observable checks, each tied to a defect confirmed present before this work. It answers *"did the fixes hold?"* rather than *"does the output feel better"* — the second question cannot be answered from five rows.

**The most important line in that checklist is A16:** look at each asset yourself first, write down what is wrong with it, and only then read the QA notes. If QA missed something obvious to a human in seconds, the model is the constraint and Claude for Visual QA moves to the top of the list. If QA caught it, the current model is adequate and the money is better spent elsewhere.

---

## Part 4 — Deliberate decisions, so they aren't relitigated

**Run with the current Gemini models first.** The old baseline was poisoned — `Slide 1 of 4` injected in code, identical prompts per card, scrambled strategic inputs, a blind QA gate. Changing models *and* prompts *and* data in one step means learning nothing from the result. Get a clean baseline; then model changes have something to be measured against.

**Image generation stays on Gemini regardless.** Anthropic does not offer image generation. Claude can improve the Creative Director, Visual QA, and the copy — not the pixels.

**C8 (OCR) deferred on evidence, not effort.** Visual QA demonstrably transcribes rendered text and catches mismatches. Building a second, slower mechanism to verify what a working one verifies is cost without a demonstrated gap. If a future run shows QA missing text defects a human catches immediately — that is the evidence. Build it then.

**Prompt length was left alone, mostly.** ~600 lines were added this session; only pure duplication was removed (195 lines of restated boilerplate in the Creative Director output section). Cutting further is a judgement call that risks deleting something load-bearing, and would add a second variable to the validation run. Revisit only if a run shows a worker ignoring an explicit rule — then length is a suspect with evidence behind it.

---

## Part 5 — Before the next run

1. Copy the modified `.gs` files to Apps Script. The prompts live on the Drive mount and are already in place.
2. `AI Workers → Maintenance → Unblock Dropdowns` — once. Converts rejecting dropdowns to warn-only so a worker is never blocked by a missing vocabulary value.
3. `AI Workers → Maintenance → Preflight Check` — should report no problems.
4. **`Refresh Cache`** — required. `DriveLoader` caches prompts for six hours; without this the workers read the previous versions.
5. Run on 3–5 rows with `VALIDATION_RUN_002_CHECKLIST.md` open.

Afterwards: `Maintenance → Review Vocabulary Gaps` lists every value a worker produced that was missing from `SYSTEM_CONSTANTS` — the raw material for correcting the controlled vocabulary from evidence rather than guesswork.

---

## Part 6 — Operating notes

**Data is never stale now.** A stage clears everything produced after it before writing (`SheetWriter.clearDownstreamOutput`). Re-running the Visual Planner wipes the old images and the old QA verdict; re-running Content Strategy wipes the Creative Director's approval. A blank verdict says "not yet judged", which is true — a stale one asserts something false about work that has since been redone. **No manual clearing needed before a re-run.**

**Long jobs finish on their own.** At roughly 100 seconds per row against a six-minute ceiling, a 20-row job is necessarily several executions. An interrupted job records what remains and schedules itself to continue about a minute later, repeating until done. `Maintenance → Background Job Status` and `Cancel Background Job` give manual control. Bounded at 25 passes and abandoned after two consecutive passes with no progress.

**Failures no longer cascade.** One bad row is recorded and stepped over. Only an exhausted time budget stops a pipeline. Partial generations are written as `PARTIAL (n/m)` rather than claiming `SUCCESS` on an incomplete set, and assets already generated are kept rather than discarded when a later one fails.

**The revision loop is capped** at `CONFIG.VISUAL_PIPELINE.MAX_REVISION_CYCLES` (3). Each cycle regenerates every asset in the row, so an uncapped loop was an uncapped bill — harmless only while QA was blind and approved everything.

---

## Part 7 — Where things live

| File | What it holds |
|---|---|
| `docs/roadmap/ISSUE_REGISTER.md` | Every defect, numbered, with evidence and fix |
| `docs/roadmap/VALIDATION_RUN_002_CHECKLIST.md` | The 26 checks for the next run |
| `docs/CURRENT_STATE.md` | Architecture, **with a warning at the top** about the unverified Sprint 2 conclusions |
| `src/ServiceRunner.gs` | Image prompt assembly. **This is where generation behaviour actually lives** — not in `prompts/visual/MEDIA_GENERATION_SERVICE.md`, which is documentation only and carries a banner saying so |
| `src/WorkerRunner.gs` | Orchestration, execution budget, unattended continuation, hashtag composition, creative critic |
| `src/SheetWriter.gs` | Write safety, validation relaxation, downstream clearing |
| `src/DriveLoader.gs` | Prompt/doc loading, image loading for QA, project asset resolution |

Git history is granular, and each commit message explains the reasoning rather than just the change. `git log --stat` over this session's commits is a reliable second source if this document is ever unclear.

---

## The shortest possible summary

The architecture was sound. The prompts were good. **The data arriving at the workers was scrambled, the code was writing text onto the artwork, and the quality gate was blind.**

Those are fixed and the gate is confirmed working. What remains is mostly whether the image model obeys its new constraints — and the answer to that is one validation run away.
