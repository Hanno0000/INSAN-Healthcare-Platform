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

### A4 — No unattended multi-pass execution ⏳
**Problem:** With a 6-minute ceiling and ~100s/row, 20 rows needs ~4 invocations. The operator must press Resume each time.
**Suggested fix:** A time-driven trigger that self-schedules: run until the budget is nearly spent, install a trigger for ~1 minute later, exit, resume automatically. Delete the trigger when the range completes. Turns a 20-row job into one click.
**Effort:** moderate. **Value:** high for production.

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

### A8 — One MSA marker survived 🔧
**Evidence:** Row 4 contained «ليس».
**Status:** The Creative Director scan lists it; it was not applied. Should be caught by A6's deduction rubric now.

### A9 — Investor posts address the audience directly ⏳
**Evidence:** Row 3: «المستثمر الذكي مش بيشتري مجرد تكنولوجيا متطورة».
**Problem:** Naming the audience inside the copy is the failure the prompt warns about — conviction should come from the observed moment.
**Suggested fix:** Add to the deduction list: copy that names its own audience.

### A10 — Posts run long for Facebook ⏳
**Evidence:** 250–400 words per post.
**Suggested fix:** Length guidance per `Content Format`; a shorter target for Static.

---

## B. Visual Team

### B1 — One failed row halted the whole pipeline ✅
**Evidence:** Row 2 (Video) failed → "Pipeline stopped: Media Generation failed" → **Visual QA never ran for any row**, including the four that generated successfully.
**Cause:** `if (result.failed > 0) pipelineFailed = true`.
**Fix applied:** Only an exhausted budget halts the pipeline. Row failures are reported and stepped over.

### B2 — Visual QA now works ✅
**Evidence from the QA-only re-run:** it caught the row 5 collage, the row 6 duplicate text, and the row 4 tablet gibberish — independently matching this review's own findings. Scores spread A / B+ / Needs Revision.
**Status:** the single most important fix of the sprint, now confirmed working.

### B3 — Mockup / collage layouts still generated ⏳
**Evidence:** Row 5 slide 1 is a contact sheet — one large panel plus two duplicate thumbnails. Row 6 slide 1 carries a presentation frame with crop marks.
**Status:** QA catches it (correctly returned Revision Required), but generation still produces it.
**Suggested fix:** Strengthen the negative constraint in `_buildExclusions`; consider a different image model.

### B4 — Duplicate text on artwork ⏳
**Evidence:** Row 6 slide 1: «هندسة الثبات» rendered twice.
**Status:** QA caught it. Generation still produces it.

### B5 — Unapproved gibberish text inside scenes ⏳
**Evidence:** Tablet and monitor screens across nearly every asset show garbled pseudo-Arabic and pseudo-English — «سربق العوفد protocol», «Alsizhndem».
**Problem:** Violates "only approved visible text". QA noted it but passed row 4 anyway.
**Suggested fix:** Add an explicit "screens and displays must be blank or out of focus" constraint. This is a known weakness of the image model.

### B6 — Output is photorealistic, not the 70/20/10 style ratio ⏳
**Evidence:** All 12 assets read as photography.
**Problem:** Directly contradicts AD-01 "No Photorealism" and the INSAN Visual Language. QA never mentions style ratio.
**Suggested fix:** Add style-ratio compliance to the QA rubric; strengthen the style clause in the generation prompt. Likely needs a different image model to fully resolve.

### B7 — Cold, dark grading on some sets ⏳
**Evidence:** Rows 5 and 6 are desaturated and dim, against the "warm over cool, light-filled" philosophy.

### B8 — Static team photos ⏳
**Evidence:** Row 6 slide 4 — five staff standing in a line facing camera.
**Problem:** Exactly what Rule 6 "Narrative First" forbids. QA described it without flagging it.
**Suggested fix:** Add "people posed facing camera" to the QA hard gates.

### B9 — QA scores a hard-gate failure as B+ ⏳
**Evidence:** Row 6 has duplicate text — a hard gate — yet scored B+.
**Problem:** The QA prompt says a gate failure caps at C. Not applied.
**Suggested fix:** Restate the cap next to the gate list, not only in the calibration section.

---

## C. Architecture

### C1 — Project Assets lookup does not exist ⏳ **← operator question, answered**
**Evidence:** `CONFIG.PROJECT_ASSETS` and `DOMAIN_FOLDERS` are defined and **read by no code anywhere**. `ServiceRunner` never reads the `Production Mode` column — the only mentions are in the sanitiser that strips those words. `DriveLoader` has no asset-lookup function. `FOLDER_ID` is empty.
**Consequence:** 100% of media is generated with no photographic reference. Mode A cannot be selected even if the folder were populated, because nothing consumes the decision.
**Suggested fix:** Implement `DriveLoader.loadProjectAssets(domain)`, have the Visual Planner match campaign subject to a domain folder, and have `ServiceRunner` pass matched images to `ImageProvider` as reference input. Substantial work, and likely the single largest lever on "generic-looking design".

### C2 — Publishing Service not implemented 💤
Columns reserved. The pipeline stops at "ready to publish".

### C3 — No performance feedback loop 💤
Nothing feeds reach or engagement back into strategy. Quality is self-assessed.

### C4 — Single AI provider ⏳
`AIProvider` is an abstraction with one implementation. Any Gemini outage stops production. Also blocks per-worker model selection.
**Suggested fix:** Add a Claude provider and per-worker model configuration. Needs an API key.

### C5 — Creative Director writes and grades itself ⏳
One inference produces the package and scores it. No independent critic.
**Suggested fix:** A second pass, ideally on a different model. Doubles per-row cost — an operator decision.

### C6 — No creative memory ⏳
Prompts instruct workers to learn from past Creative Director notes; no mechanism supplies them.
**Suggested fix:** Have `ContextBuilder` include recent notes for the same campaign.

### C7 — Visual Planner uses a model for mechanical checks ⏳
Field-completeness validation is deterministic work being done by an LLM at ~15s and full token cost per row.
**Suggested fix:** Move completeness checks to code; keep the model only for mode selection and brief authoring.

### C8 — No deterministic text verification ⏳
Rendered text is only ever checked by a vision model.
**Suggested fix:** OCR the artwork and diff against `Text On Design`. Lower priority now that B2 is confirmed working.

---

## Priority for the next run

**Done — no action needed:** A1, A2, A3, A5, A6, A7, B1, B2

**Worth doing before scaling to production:** A4 (unattended multi-pass), C1 (project assets), B5 and B8 (QA gates)

**Needs an operator decision:** C4 (API key), C5 (cost), A5 remainder (restrict or implement video)

**Deferred:** C2, C3
