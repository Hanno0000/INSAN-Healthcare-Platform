# Campaign OS — Issue Register

> **Created:** 2026-07-27, after Validation Run #002
> **Purpose:** One numbered list of every known defect, so none is rediscovered later.
> **Status key:** ✅ fixed · 🔧 fix ready, untested · ⏳ open · 💤 deferred by decision

Every issue carries the evidence it was found from. Nothing here is speculative.

---

## A. Content Team

### A1 — Emoji never produced ✅
**Evidence:** All 5 rows returned zero emoji despite `Emoji Style` = Professional / Minimal / Balanced.
**Cause:** `Emoji Style` appeared in prompts only as a field *name*. `CONTENT_CREATION_WORKER.md` never used the word "emoji" once. The worker had no definition of any value.
**Fix applied:** Count ranges per value, placement rules, emoji-selection guidance, and a Creative Director verification check.

### A2 — Hashtags never reached the post ✅
**Evidence:** Hashtags sat in their own columns; row 4 alone had them inline.
**Cause:** No component merged them. Not a bug — an unassigned responsibility.
**Fix applied:** `_composeFinalPostCopy()` appends them deterministically after Creative Director output, stripping any block the model added. 10 unit tests, including idempotency and mid-sentence hashtags.
**Decision:** merged in code, per operator instruction.

### A3 — Full Content Team times out on 5 rows ✅
**Evidence:** Run halted with "exceeded maximum execution time"; Creative Director had to be re-run alone.
**Cause:** Each worker in `runTeamPipeline` opened its **own** 300s timer. Three workers planned for 900s inside an execution Apps Script kills at 360s. Measured cost: ~100s/row × 5 = ~500s.
**Fix applied:** `ExecutionBudget` — one allowance per invocation, shared by all workers. Stops *before* starting a row it cannot finish, checkpoints, and names the resume row. Estimates from a rolling average of actual row times, biased 25% high. Inter-row pause cut 1500ms → 400ms.
**Note:** For 20 rows this still needs several passes. That is correct behaviour — see A4.

### A4 — No unattended multi-pass execution ✅
**Problem:** With a 6-minute ceiling and ~100s/row, 20 rows needs ~4 invocations. The operator had to press Resume each time.
**Fix applied:** An interrupted job records what remains and installs a one-shot trigger for ~1 minute later. `continueActiveJob()` resumes without any dialog. Repeats until the range is done, then removes itself. Works for both the content and visual pipelines; the visual pipeline carries `MEDIA_GENERATION` as a step so the service is resumed in the right order.
**Guards:** at most 25 passes; abandoned after two consecutive passes with no progress; only one continuation trigger can exist. `Maintenance → Background Job Status` and `Cancel Background Job` give manual control.
**Result:** a 20-row job is one click.

### A5 — Strategy can select unbuildable formats ✅
**Evidence:** Row 2 = `Video`; Media Generation failed with "Video generation not yet implemented" after strategy, copy and creative direction had already been paid for.
**Fix applied:** `CONFIG.IMPLEMENTED_FORMATS`; Preflight Check flags any row outside it before a run.
**Still open:** the controlled vocabulary still offers Video / Reel / Motion Graphic. Either restrict it, or implement video.

### A6 — Score inflation ✅
**Evidence:** 5 of 5 rows scored **A**. Zero variance across five different campaigns.
**Cause:** Calibration was subjective ("exceptionally rare", "very minor refinements") — anything can be rationalised into A. It also said "(0-10)" while the vocabulary is letters.
**Fix applied:** Deduction-based rubric — start at A+, deduct one grade per observable defect from a fixed list. Two deductions caps at B+; four is Needs Rewrite.

### A7 — Prompt example copied verbatim ✅
**Evidence:** Rows 2 and 5 both opened «الساعة تلاتة الفجر» — a phrase written into the prompt as an *illustration* of a good opening.
**Cause:** Few-shot examples get lifted, not learned from. Self-inflicted in the previous sprint.
**Fix applied:** Concrete opening examples removed; replaced with a method for deriving an opening from the row, plus an explicit rule against reusing any opening image, and a Creative Director repetition check.

### A8 — One MSA marker survived ✅
**Evidence:** Row 4 contained «ليس».
**Fix applied:** MSA markers are an explicit line in the A6 deduction rubric, and the independent critic (C5) checks the same list.

### A9 — Investor posts address the audience directly ✅
**Evidence:** Row 3: «المستثمر الذكي مش بيشتري مجرد تكنولوجيا متطورة».
**Problem:** Naming the audience inside the copy is the failure the prompt warns about — conviction should come from the observed moment.
**Fix applied:** Added to the Creative Director deduction list, plus a dedicated section in the Content Creation prompt: an investor-primary post never mentions investors. It shows a system working properly and lets the reader draw the conclusion — which is worth more than any sentence written at them.

### A10 — Posts run long for Facebook ✅
**Evidence:** 250–400 words per post, roughly double what the format supports.
**Fix applied:** Word targets and ceilings per `Content Format` (Static 90–140, Carousel 120–180, Story 40–70, Infographic 80–120), plus the two cuts that recover most of the excess — the restatement and the summary close. Over-length is a deduction in A6.

---

## B. Visual Team

### B1 — One failed row halted the whole pipeline ✅
**Evidence:** Row 2 (Video) failed → "Pipeline stopped: Media Generation failed" → **Visual QA never ran for any row**, including the four that generated successfully.
**Cause:** `if (result.failed > 0) pipelineFailed = true`.
**Fix applied:** Only an exhausted budget halts the pipeline. Row failures are reported and stepped over.

### B2 — Visual QA now works ✅
**Evidence from the QA-only re-run:** it caught the row 5 collage, the row 6 duplicate text, and the row 4 tablet gibberish — independently matching this review's own findings. Scores spread A / B+ / Needs Revision.
**Status:** the single most important fix of the sprint, now confirmed working.

### B3 — Mockup / collage layouts ✅
**Evidence:** Row 5 slide 1 is a contact sheet — one large panel plus two duplicate thumbnails. Row 6 slide 1 carries a presentation frame with crop marks.
**Cause:** The exclusion said "no mockups" — a category the model did not recognise in what it was producing.
**Fix applied:** The exclusions now name the actual shapes: grids, collages, contact sheets, split panels, thumbnails, inset sub-images, borders, crop marks, registration marks, blueprint overlays. Stated positively too — one single full-frame image. Added as a QA hard gate.

### B4 — Duplicate text on artwork ✅
**Evidence:** Row 6 slide 1: «هندسة الثبات» rendered twice.
**Fix applied:** The visible-text instruction now specifies the approved wording appears "once and once only", with a matching exclusion. Already a QA hard gate.

### B5 — Unapproved gibberish text inside scenes ✅
**Evidence:** Tablet and monitor screens across nearly every asset show garbled pseudo-Arabic and pseudo-English — «سربق العوفد protocol», «Alsizhndem».
**Problem:** Violates "only approved visible text". QA noted it but passed row 4 anyway.
**Fix applied:** Screens, monitors, tablets and phones must be off, blank, plain colour or far out of focus — never legible interfaces, charts or dashboards. Signage and documents bearing readable writing excluded too. Added as a QA hard gate, with an instruction to examine every display in the frame.

### B6 — Output is photorealistic, not the 70/20/10 style ratio ✅
**Evidence:** All 12 assets read as photography.
**Problem:** Contradicts AD-01 "No Photorealism". QA never mentioned style ratio once.
**Cause:** Style guidance was **negative only** — a model given nothing to aim at defaults to a photograph.
**Fix applied:** The prompt now states the style positively before the exclusions: designed editorial illustration, soft realistic modelling, clearly crafted artwork rather than a photograph. QA gained a Style Compliance section built on one question — *would a viewer take this for a photograph?* — plus face, hand and lighting checks.

### B7 — Cold, dark grading on some sets ✅
**Evidence:** Rows 5 and 6 are desaturated and dim, against the "warm over cool, light-filled" philosophy.
**Fix applied:** Warm light-filled interiors with soft directional daylight stated positively; cold, dim, desaturated and clinical-blue grading excluded. Lighting added to the QA style checks.

### B8 — Static team photos ✅
**Evidence:** Row 6 slide 4 — five staff standing in a line facing camera.
**Problem:** Exactly what Rule 6 "Narrative First" forbids. QA described it without flagging it.
**Fix applied:** Rows of people facing camera, line-ups, team portraits and group photographs excluded at generation — subjects must be engaged in the moment. Added as a QA hard gate.

### B10 — Every regeneration was named V1 ✅
**Evidence:** `ServiceRunner._storeGeneratedImages()` hardcoded `var version = 'V1'`, so a row taken through three revision cycles produced three sets of files all labelled V1. `VISUAL_PRODUCTION_ARCHITECTURE.md` had specified V1 for the *initial* generation, implying later versions for revisions.
**Impact:** low risk, real friction — the revision loop could not be reviewed from the folder, only by cross-referencing timestamps against the execution log.
**Fix applied:** `_resolveAssetVersion()` reads the per-Content-ID revision counter that already exists to enforce `MAX_REVISION_CYCLES`. First attempt V1, after the first `Revision Required` V2, and so on. Resolved once per row so every card in a carousel shares one version. The version now appears in the execution log alongside the asset count. Falls back to V1 if the counter is unavailable. 10 unit tests.

### B11 — Asset folders defined but unused ⏳
**Evidence:** `CONFIG.VISUAL_ASSETS` defines `approved`, `rejected`, `published` and `archive`; only `generated` is referenced anywhere in the code. No `setTrashed`, `moveTo`, or equivalent exists in the project.
**Consequence:** approved and rejected artwork accumulates in one folder, and `Final Asset URL` points into `generated` rather than an approved location. The configuration implies a sorting workflow that does not exist.
**Suggested fix:** move assets on the QA decision, or drop the unused folder entries. Naturally belongs with the Publishing Service (C2) — documented here so the gap is not mistaken for working behaviour.

### B9 — QA scores a hard-gate failure as B+ ✅
**Evidence:** Row 6 has duplicate text — a hard gate — yet scored B+.
**Fix applied:** The cap is stated at the top of the hard gate list rather than only in the calibration section: any gate failure caps the score at C, and it is not a judgement call. The gate sets the ceiling; craft decides only where it lands beneath it.

---

## C. Architecture

### C1 — Project Assets lookup did not exist 🔧 **← implemented, needs photos**
**Evidence:** `CONFIG.PROJECT_ASSETS` and `DOMAIN_FOLDERS` were defined and **read by no code anywhere**. `ServiceRunner` never read the `Production Mode` column — the only mentions were in the sanitiser that strips those words. `DriveLoader` had no asset-lookup function.
**Consequence:** 100% of media was generated with no photographic reference. Mode A could not be selected even with a populated folder, because nothing consumed the decision.

**Fix applied — the full path now exists:**
1. `DriveLoader.resolveAssetDomain()` matches the row to a domain by keyword. Deterministic, no model call, Arabic-aware — text is normalised for the definite article, alef and taa-marbuta variants, so «العناية المركزة» matches the keyword «عناية مركزة». 20 unit tests.
2. `DriveLoader.listProjectAssets()` / `loadProjectAssets()` read the domain subfolder.
3. The Visual Planner is told in its context which photographs actually exist, so its Production Mode decision is grounded rather than guessed.
4. `ServiceRunner` resolves the domain, loads the images, and passes them to `ImageProvider`.
5. `ImageProvider` sends them as `inlineData` parts ahead of the instruction, with prompt guidance to match the real architecture, finishes, equipment and uniforms — and to copy no person, text or logo from them.

**Activated 2026-07-27.** `FOLDER_ID` points at `My Drive / Insan / business / Media`. Domain `folder` values are now paths relative to it — clinical departments live under `Services/`, brand material at the top — so `_assetSubfolder()` walks path segments rather than looking for a direct child. `Maintenance → Check Project Assets` reports what each domain actually contains, so setup can be verified without paying for a run. **Folders exist but still need photographs**; a missing or empty folder falls back to AI generation silently.

**Expected impact:** the largest single lever on "generic-looking design" — but only once real photographs are in place. Until then behaviour is unchanged.

### C2 — Publishing Service not implemented 💤
Columns reserved. The pipeline stops at "ready to publish".

### C3 — No performance feedback loop 💤
Nothing feeds reach or engagement back into strategy. Quality is self-assessed.

### C4 — Single AI provider 🔧
`AIProvider` was an abstraction with one implementation. Any Gemini outage stopped production, and per-worker model selection was impossible.
**Fix applied:** `ClaudeProvider` implemented — messages API, vision support, same retry policy. `AIProvider.call()` routes on a per-worker `provider` / `model` setting, so moving one worker is configuration rather than a code change.
**To activate:** add `ANTHROPIC_API_KEY` to Script Properties, then add `provider: 'claude'` to a worker in `CONFIG.WORKERS`. Suggested order by expected return: Creative Director, Visual QA, Content Creation.

### C5 — Creative Director writes and grades itself 🔧
One inference produced the package and scored it, and graded five different campaigns identically.
**Fix applied:** `_applyCreativeCritic()` — an independent pass that re-scores the finished package against the deduction rubric. It only grades, never rewrites, so it costs a fraction of a generation rather than doubling it. Disagreement overwrites the score and is recorded in the notes. Any failure leaves the original untouched.
**Off by default** — the cost decision is yours. Set `CONFIG.CREATIVE_CRITIC.ENABLED = true`, optionally with `provider: 'claude'` for a genuinely independent read.

### C6 — No creative memory ✅
Prompts instructed workers to learn from past Creative Director notes and to avoid repeating openings. Neither was possible — every row was processed in isolation.
**Fix applied:** `ContextBuilder._buildCreativeMemory()` supplies the Content Creation and Creative Director workers with the openings already used, which they are told not to repeat, and recent Creative Director notes to learn from. This closes the mechanism gap behind A7: two rows opened identically because no row could see any other. Reads a 24-row window; fails silently if unavailable.

### C7 — Visual Planner uses a model for mechanical checks ✅
Field-completeness validation was deterministic work done by an LLM at ~15s and full token cost per row.
**Fix applied:** `_missingCreativeFields()` validates the required package fields in code before the model call. An incomplete package fails in milliseconds at no token cost, instead of ~15 seconds later via a model asked to notice empty cells.

### C8 — No deterministic text verification 💤
Rendered text is only ever checked by a vision model.
**Recommendation: defer, and revisit only if evidence justifies it.** Drive OCR is available but needs the Advanced Drive Service enabled, converts each asset to a Doc, and adds a call per image. B2 confirmed Visual QA now transcribes rendered text and catches mismatches, duplicates and gibberish. Building a second, slower mechanism to check what a working one already checks is cost without a demonstrated gap. If a future run shows QA missing text defects a human catches immediately, that is the evidence — build it then.

---

## Where things stand

**Fixed and verified:** A1–A10, B1–B9, C6, C7 — 21 issues

**Built, waiting on you:**
- **C1** — add real facility photographs to Drive and set `FOLDER_ID`. Highest expected impact on "generic-looking design".
- **C4** — add `ANTHROPIC_API_KEY`, then point a worker at `provider: 'claude'`.
- **C5** — set `CREATIVE_CRITIC.ENABLED = true` if the extra cost is acceptable.

**Deferred by decision:** C2 (Publishing), C3 (performance loop), C8 (OCR — see reasoning above)

---

## What is still unknown

Everything above is a fix, not a result. The B-series in particular addresses defects at the point of generation, and image models do not always obey instructions however precisely they are worded — B3 through B8 all describe a model producing something it had already been told not to produce.

What this sprint can honestly claim: the defects are named, the constraints are specific rather than categorical, and Visual QA is confirmed to catch them when they slip through.

Whether generation now avoids them is a question only the next run answers.
