# START HERE

> **The entry point for this project.** If you are a person or an AI who has never seen
> this repository, read this file completely before opening anything else or writing any
> code.
>
> **Updated:** 2026-07-30

---

> ## ⚠️ Read this before you start work
>
> **Phases 0, 1, 2 and 3 of the agreed plan are implemented.** If you were told to
> "start at Phase 0", that instruction is out of date — Phase 0 was three changes
> and they are committed. **Do not redo them.**
>
> Everything is in git, on `main`. What has *not* happened is a production run:
> the code has never been pasted into the Apps Script editor, and no worker built
> in these phases has made a single live API call.
>
> **Where the work actually stands is §6.** Read §1–§5 for the business and the
> system, then go to §6 — do not infer the current state from anything else in
> this document, or from the audits, which describe the system as it was measured
> on 2026-07-29 and are deliberately left unedited as the baseline.

---

## 1. What this project is, in four paragraphs

**INSAN is a healthcare platform, not a hospital.** It manages and operates hospitals
and medical centers under one unified standard, so that a patient meets the same system
and the same quality of treatment wherever they go inside the ecosystem. Two hospitals
currently operate under it: **Future Specialized Hospital** (managed by Wedge Medical)
and **Delta International Hospital** (managed by L'Avenir Medical).

**The business problem being solved is branding.** The owner is running this like an
advertising agency for INSAN: build the brand through social media campaigns published
across three Facebook pages — INSAN, Future Hospital, Delta Hospital — so that the
campaigns together construct one coherent brand rather than scattered posts.

**Campaign OS is the machine that produces those campaigns.** It is a Google Sheets +
Apps Script system driven by AI workers. Each worker reads specific columns from the
sheet, does one job, and writes specific columns back. The chain runs from campaign
knowledge → a plan → strategy → copy → images → publishing → paid ads.

**The end goal is a mostly-automatic operation.** The owner wants to say *"give me a
week's plan, focused on these campaigns, in these proportions"* and receive finished
posts on the pages with ads running on them. Human involvement should shrink to
approving at a few gates. If it works for INSAN, the ambition is to sell the same
architecture as a SaaS product for other brands.

---

## 2. Two projects in one repository

`J:\My Drive\Insan` is a single git repo containing **two independent projects**. Do not
conflate them; they have separate state documents.

| Path | What it is | Entry point |
|---|---|---|
| `campaign-os/` | The AI campaign system. Google Sheets + Apps Script. **This file's subject.** | this file |
| `website/` | The public website. Turborepo, NestJS + Next.js + Prisma (28 models). | `website/Docs/CURRENT_STATE.md` |
| `business/` | Shared knowledge — brand architecture, strategy, and one knowledge file per medical entity | `business/knowledge/KNOWLEDGE_BASE_SPEC.md` |

---

## 3. How Campaign OS actually runs

**The sheet is the database.** One online Google Sheet (`Campaign_Playbook V2`) holds
every tab the pipeline reads and writes. Code in `campaign-os/src/*.gs` is **copied by
hand** into the Apps Script editor attached to that sheet — the repo is not deployed
automatically.

**Worker instructions live in `campaign-os/prompts/`**, one Markdown file per worker,
loaded from Google Drive at runtime and cached for six hours. This is where a worker is
told who it is and how to think. The code decides only what it reads and where it
writes.

**The tabs, in pipeline order:**

| Tab | Holds |
|---|---|
| `Campaign Cards` | One row per campaign — its strategy. 32 columns. |
| `Content Calendar` | One row per scheduled post — day, page, campaign. |
| `Content Pipeline` | The editorial workspace. 53 columns. **Source of truth for content.** |
| `Visual Pipeline` | The production workspace. 32 columns. |
| `Execution Log` | Every worker call, with tokens and runtime. |
| `SYSTEM_CONSTANTS` | Dropdown vocabularies. |

**The workers — 10 designed, 6 built:**

```
W1  Campaign Card Builder   🟡 unverified   knowledge file → campaign card
W2  Campaign Planner        🟡 unverified   operator brief → calendar
--  Portfolio Critic        🟡 unverified   whole plan → what one row cannot show
W3  Content Strategy        ✅ running      → Content Pipeline S:AJ
W4  Content Creation        ✅ running      → Content Pipeline AK:AN
W5  Creative Director       ✅ running      → refines S:AJ, approves AO:AS
W6  Visual Planner          ✅ running      → Visual Pipeline S:U  (replaceable, see §6)
W7  Media Designer          🟡 unverified   → the image prompt
W8  Visual QA               ✅ running      → Visual Pipeline Y:AB
W9  Publishing              🟡 unverified   → AC:AE   (dry run by default)
W10 Paid Ads                🟡 unverified   → Ads Pipeline (drafts, never spends)
```

🟡 means the code exists and is tested, but has never made a live API call.

**All ten workers now exist in code.** Five of them have never run. Publishing
and ads are still done by hand until W9 and W10 are verified — W9 ships with
`DRY_RUN` on, so running it changes nothing until that is deliberately turned
off.

---

## 4. Read the documents in this order

Three layers. **Understand the business before the system, and the system before the
findings.** Skipping to the findings produces confident opinions about something you
have not understood — which is exactly the failure mode the audits found in this
project's own earlier work.

Section 1 above is a summary written by someone who read all of this. It is not a
substitute for the primary documents; it is a map of them.

### Layer 1 — The business. What INSAN actually is.

Read all of these. Together they are about 950 lines and they are the foundation
everything else assumes.

| Order | Document | Answers |
|---|---|---|
| 1 | `README.md` *(repo root)* | What the repository holds, in one screen |
| 2 | **`business/brand/MASTER_BRAND_ARCHITECTURE.md`** | **Source of truth.** Vision, business model, brand hierarchy, the twelve medical centers, marketing flow. **Governs every other document — where anything disagrees with this, this wins.** |
| 3 | `business/brand/PLATFORM_KNOWLEDGE_BASE.md` | The platform's own knowledge: what INSAN offers and how it positions |
| 4 | `business/brand/AI_CREATIVE_CONSTITUTION.md` | The creative rules every worker is bound by — what may and may not be said |
| 5 | `business/strategy/PROJECT_STRUCTURE.md` | How the marketing operation is organised; the campaign architecture |
| 6 | `business/strategy/PROJECT_ROADMAP.md` | The twelve phases, and which are done |
| 7 | `business/strategy/PROJECT_DECISIONS.md` | Decisions already taken — **do not relitigate these** |
| 8 | `business/brand/MEDICAL_SERVICES_TAXONOMY.md` | Departments vs Centers vs Clinics. **Shared with the Website Platform.** |

Then read **one knowledge file end to end** to understand what "campaign knowledge"
means here:

| | |
|---|---|
| `business/knowledge/departments/MEDICAL_SERVICE_ICU.md` | 2,772 lines. **The reference standard** — the depth every entity file is supposed to reach |
| `business/knowledge/KNOWLEDGE_BASE_SPEC.md` | The registry: which entities have a file, which do not, and how many posts each is scheduled for |

Seven files exist now, not two. If you want to see how a *supporting campaign* file
differs from an *entity* file — it describes the campaign, not a medical service —
read `business/knowledge/supporting/SUPPORTING_SUCCESS_STORIES.md` as well.

### Layer 2 — The system. How the machine works.

| Order | Document | Answers |
|---|---|---|
| 9 | **`campaign-os/docs/SYSTEM_ARCHITECTURE.md`** | All ten workers, what each reads and writes, the data contract per sheet tab |
| 10 | `campaign-os/docs/architecture/WORKER_CONTRACTS_V2.md` | Exact I/O per worker, with 🔴/🟡/🟢 build status |

The worker prompts in `campaign-os/prompts/` are the workers' actual instructions —
11,200 lines. Read the one belonging to whichever worker you are about to touch, not all
of them.

### Layer 3 — The findings. What is wrong and what it is worth.

**Do not re-analyse this system.** Two full audits were completed 2026-07-29 and
everything is committed.

**Read these as the baseline, not the status.** They measure the system as it was on
2026-07-29 and are deliberately unedited, so later work can be compared against them.
Most of what they describe has since been addressed — each carries a status table at
the top, and `§6` of this file is the authority. Treating them as current will send
you to rebuild finished work.

| Order | Document | Answers |
|---|---|---|
| 11 | **`campaign-os/docs/VERDICT_AND_IMPROVEMENTS.md`** | Is this any good? Can it be a SaaS? What is worth doing, in what order? |
| 12 | `campaign-os/docs/OPERATIONAL_AUDIT.md` | Audit A — the machinery. F1–F20, measured against 298 log entries |
| 13 | `campaign-os/docs/AUDIT_B_OUTPUT_AND_PORTFOLIO.md` | Audit B — the product, read backwards from 33 finished posts. B1–B10 |
| 14 | `campaign-os/docs/roadmap/GAP_REGISTER.md` | Coverage gaps G1–G12, phased |

### The other project

| Document | Answers |
|---|---|
| `website/Docs/CURRENT_STATE.md` | The Website Platform — separate project, own state |
| `website/Docs/CLINIC_CENTER_BOOKING_SPEC.md` | The clinic/center booking spec, written for the website worker |

⚠️ **Superseded, but kept as history.** `campaign-os/docs/CURRENT_STATE.md` and
`campaign-os/docs/HANDOFF.md` describe earlier sprints and contain claims later found
untrue. Read them for background if you want the story of how the system got here; where
they disagree with Layer 3, Layer 3 wins.

⚠️ Six documents under `campaign-os/docs/architecture/` and `docs/roadmap/` still carry
`Status: Sprint 1`. They are stale. Finding A·F15/F16.

### If you only have time for four

`MASTER_BRAND_ARCHITECTURE.md` → `SYSTEM_ARCHITECTURE.md` →
`VERDICT_AND_IMPROVEMENTS.md` → this file's §6.

---

## 5. The state of things, in numbers

Every figure below was measured on 2026-07-29, not estimated. Evidence in the audits.
The right-hand column is what has changed since — **none of it verified in production.**

| Measured 2026-07-29 | | Now |
|---|---|---|
| **67%** | of Content Pipeline rows reach the workers with all twelve strategy fields blank | Workers now refuse such a row by name. The rows still have no strategy — refusing is the point, so the gap is visible instead of silent |
| **26%** | of worker calls failed (78 of 298), 60% external API conditions | Providers now fail over to each other |
| **88%** | of finished posts open with one of five rhetorical formulas | Creative memory fixed; a second opening is produced per post; a portfolio critic measures the whole plan |
| **18%** | agreement between the three systems describing the medical centers | Unchanged — needs the brand owner, not code |
| **~9.7M of 10.8M** | input tokens byte-identical across rows, caching blocked by one line | Line removed; Anthropic cache breakpoint in place; Gemini implicit caching needs measuring |
| **5%** | of the knowledge base written — 2 files for ~40 entities | 16 files. 14 build a campaign card, covering 58 of 132 scheduled slots today and 66 after the sheet renames; 2 await operator facts and would add 24 more |
| **2 of 10** | workers own the ends of the chain, and neither exists | W1 and W2 exist and are untested. W9 and W10 still do not |

**The one-sentence reading, still true:** the machinery is in better shape than its
inputs. The difference is that the inputs now fail loudly instead of quietly.

---

## 6. Where the work actually stands

**This is the section to trust.** The audits in Layer 3 describe the system as it was
on 2026-07-29 and are deliberately unedited — they are the baseline, not the status.

### 6.1 Done, in git, never run

Phases 0–3 of `VERDICT_AND_IMPROVEMENTS.md` §5 are implemented across three working
sessions. Roughly 140 automated checks pass against the real files. **No worker built
in these phases has made a live API call, and no code has been pasted into the Apps
Script editor.**

| Phase | What landed |
|---|---|
| **0** | Creative-memory window anchored to the row being written · timestamp deleted from both prompt headers · Claude enabled on the Creative Director |
| **1** | `Pipeline State` split from the operator's `Workflow Status` · `CONFIG.gs` made the single vocabulary source · workers refuse rows whose required inputs are empty · `Service Level` added · automatic provider failover · cached-token logging |
| **2** | **W1 Campaign Card Builder** · prompt split for real Anthropic caching · **five knowledge files** by scheduled volume |
| **3** | **W2 Campaign Planner** · **Portfolio Critic** · a second opening per post · deterministic visual planning (off by default) |

New code: `CardBuilder.gs` · `PlannerRunner.gs` · `PortfolioCritic.gs` ·
`VisualPlan.gs`. New prompts: `prompts/planning/CAMPAIGN_CARD_BUILDER.md` ·
`CAMPAIGN_PLANNER.md`.

**A fourth pass, 2026-07-30 — pre-run hardening.** A static review of the path
in §6.4 item 1, before it is run rather than after, plus the offline work that
did not need the sheet. Six defects, each of which would have cost a live run:

| | Defect | Effect |
|---|---|---|
| 1 | Cards were filed under the entity's name, not the campaign's | ICU's card would have served **none** of its 11 slots. `campaign_name` added; `Check Knowledge File` now reports the slot count |
| 2 | Visual QA loaded at most four assets, then failed the row for being short | Any carousel over four cards dead-ends: the failure says re-run generation, and re-running reproduces it |
| 3 | Cache share was computed with Anthropic's token convention for both providers | Understates Gemini by roughly half — on the exact figure §6.4 item 5 asks you to read |
| 4 | The Media Designer's inference was logged as zero tokens | The whole image path was invisible to the cost and cache measurement. It now has its own log line and a cache breakpoint |
| 5 | `Refresh Cache` skipped `CONFIG.SERVICES` and the planning prompts | Editing `MEDIA_GENERATION_SERVICE.md` or `CAMPAIGN_CARD_BUILDER.md` in Drive did nothing for six hours, and looked exactly like an edit that had landed |
| 6 | A cache-write failure discarded a file that had been read | Reported as "prompt file not found, check the folder ID". `CREATIVE_DIRECTOR_WORKER.md` is 77KB against a 100KB limit |

Also: **Kabarona now builds a card** (§6.2), and the five questions blocking
Emergency and Delta are written out in
`business/knowledge/NEEDS_OPERATOR_QUESTIONS.md`.

**A fifth pass, 2026-07-30 — W9 and W10.** The chain is complete in code for the
first time. `PublishingRunner.gs` takes an approved row live on a Facebook page
and makes no model call: every decision publishing needs was already owned
upstream, so the worker's whole job is refusing the rows it cannot prove are
safe. It ships with `DRY_RUN` on. `AdsRunner.gs` drafts an ad specification for
a post that is already live, and `Budget`, `Ad Status`, `Ad ID` and `Results`
are outside its output schema entirely — there is no path by which it reports a
spend. New prompt: `prompts/ads/PAID_ADS_WORKER.md`. 23 automated checks cover
the guards.

⚠️ **Files changed and to be pasted into the Apps Script editor:**
`AIProvider.gs` · `CardBuilder.gs` · `CONFIG.gs` · `DriveLoader.gs` ·
`MediaDesigner.gs` · `PlannerRunner.gs` · `PortfolioCritic.gs` ·
`ServiceRunner.gs` · `WorkerRunner.gs`, plus two new files —
**`PublishingRunner.gs`** and **`AdsRunner.gs`**. Still nothing verified in
production.

### 6.2 The knowledge base

| File | Campaign it serves | Slots | State |
|---|---|---|---|
| `MEDICAL_SERVICE_ICU.md` | ICU Center | 11 | ✅ builds a card |
| `PROGRAM_KABARONA.md` | Kabarona Continuous Care Program ⚠️ | 6 | ✅ builds a card |
| `SUPPORTING_MEET_OUR_DOCTORS.md` | Meet Our Doctors | 6 | ✅ builds a card |
| `SUPPORTING_PATIENT_JOURNEY.md` | Patient Journey | 6 | ✅ builds a card |
| `SUPPORTING_SUCCESS_STORIES.md` | Success Stories | 6 | ✅ builds a card |
| `SUPPORTING_MEET_OUR_TEAM.md` | Meet Our Team | 5 | ✅ builds a card |
| `SUPPORTING_BEHIND_THE_SCENES.md` | Behind The Scenes | 5 | ✅ builds a card |
| `SUPPORTING_HOSPITAL_LIFE.md` | Hospital Life | 5 | ✅ builds a card |
| `CORPORATE_WHY_TRUST_US.md` | Why Trust Us | 3 | ✅ builds a card |
| `CORPORATE_LEADERSHIP.md` | Healthcare Leadership | 3 | ✅ builds a card |
| `SUPPORTING_FAQ.md` | FAQ | 3 | ✅ builds a card |
| `SUPPORTING_CSR.md` | Community Impact (CSR) | 3 | ✅ builds a card |
| `EDUCATIONAL_MYTHS_FACTS.md` | Medical Myths & Facts ⚠️ | 3 | ✅ builds a card |
| `CORPORATE_WHY_INSAN.md` | Why INSAN? | 1 | ✅ builds a card |
| `MEDICAL_SERVICE_EMERGENCY.md` | Emergency Center | 16 | 🟠 3 `NEEDS-OPERATOR` markers |
| `HOSPITAL_DELTA.md` | Delta Restore Trust | 8 | 🟠 2 `NEEDS-OPERATOR` markers |

**58 of 132 slots** are covered today, **66 once the renames below land**, and
**90** once the two 🟠 files are filled. The middle column is the
join key and it is not always the entity's name — see the trap in §7. Kabarona
was closed on 2026-07-30 by rewriting its front matter and renaming two
headings; no content was invented.

⚠️ **The last three describe the same two buildings and will merge into one
campaign unless the boundary is enforced.** Each file carries the same routing
test: a post about **a person** is Meet Our Team, about **a process** is Behind
The Scenes, about **a place and its rhythm** is Hospital Life. Three campaigns
producing one campaign is Audit B's B1 finding at the plan level.

⚠️ **One rename owed in the sheet.** The spelling was unified on the brand
documents' *Kabarona*; the calendar still says *Kobarna*. Rename **6 Content
Calendar rows and 1 Campaign Cards row** to `Kabarona Continuous Care Program`.
Until then `Check Knowledge File` will correctly report that card as orphaned.

The five questions behind the 🟠 markers are written out, in Arabic, in
`business/knowledge/NEEDS_OPERATOR_QUESTIONS.md`.

A `NEEDS-OPERATOR` marker names exactly what is needed and W1 refuses to build past
one — deliberately. **Those sections need facts only the operator has** (Emergency's
equipment, staffing and response times; Delta's history and what changed under INSAN).
Inventing them would put fabricated operational claims about a real hospital into the
source of truth for 24 published posts.

Check any file without spending an inference: **AI Workers → Planning → Check
Knowledge File**.

### 6.3 What the operator must do before anything runs

In this order. Steps 1–3 are one-time.

1. **Copy `src/*.gs` into the Apps Script editor.** Nothing takes effect until this
   happens — see §7.
2. **Script Properties:** add `ANTHROPIC_API_KEY` (or the Creative Director fails on
   every row) and `KNOWLEDGE_FOLDER_ID` (the Drive folder holding
   `business/knowledge`; subfolders are searched). Optionally
   `PLANNING_PROMPTS_FOLDER_ID` and `ADS_PROMPTS_FOLDER_ID`.

   **For W9 only, and only when you reach it:** `FB_PAGE_ID_<PAGE>` and
   `FB_PAGE_TOKEN_<PAGE>` for each of INSAN, FUTURE and DELTA. Nothing else in
   the system needs them, and W9 refuses by name when one is missing rather than
   falling back to another page.
3. **Upload the new prompt folders** `prompts/planning/` and `prompts/ads/`, and the
   new knowledge folders, to Drive.
4. **AI Workers → Maintenance → Create Managed Columns**, then **Sync Dropdowns from
   CONFIG**, then **Preflight Check** — which must report no schema problems.

   **Three renames owed in the sheet**, all decided on 2026-07-30 and all
   affecting the join key. Nothing downstream is wrong until a card is built
   against the old name:

   | In | From | To | Rows |
   |---|---|---|---|
   | Content Calendar | `Kobarna Continuous Care Program` | `Kabarona Continuous Care Program` | 6 |
   | Campaign Cards | `Kobarna Continuous Care Program` | `Kabarona Continuous Care Program` | 1 |
   | Content Calendar | `Myth vs Fact` | `Medical Myths & Facts` | 2 |

   The first two unify the spelling on the brand documents. The third merges two
   names for one campaign, so a single knowledge file serves all three slots.
5. **Verify one thing at a time**, and expect the first run of anything to be the
   interesting one.

### 6.4 The next work, in order

1. **Verify the visual pipeline on one row** — `MediaDesigner`, `TextOverlay` and
   `AssetIntegrity` have never completed a production run (A·F19). This is the oldest
   unverified thing in the system and it blocks judging anything visual.
   **Do this before turning on `CONFIG.VISUAL_PLAN.ENABLED`** — otherwise the first
   run is testing two unknowns and neither result means anything.

   A static review of that path on 2026-07-30 fixed four defects ahead of the run
   and left three things for the operator to check first:
   **use a `Static` row, not a carousel** (the overlay does a Slides copy-export-trash
   per asset, and a carousel spends that budget three times over);
   run `testTextOverlay()` from the editor to prove the two overlay templates really
   carry their page sizes; and confirm `CONFIG.MEDIA_MODELS.IMAGE` still resolves —
   three of the historical failures were an image model that had been renamed.
2. **Fill the `NEEDS-OPERATOR` sections** in Emergency and Delta. 24 scheduled posts
   are waiting on them, and they are the largest remaining input gap.
3. **Build cards** from the five files that are ready, and check one field by field
   against its knowledge file. Run **Check Knowledge File** first on each — it now
   also reports how many scheduled slots the card would serve, and costs no
   inference. A card that serves zero is joined to nothing.
4. **Run W2 on a small cycle** — three days, one page — before planning a month.
5. **Measure caching.** Read the `Cached:` figure in the Execution Log. If Gemini's
   implicit caching is working, the caching project is finished; if it is zero across
   rows, explicit caching is worth building (`PROMPT_CACHING_PLAN.md` step 4).
6. **Verify W9 on one row, in dry run first.** The code landed 2026-07-30 with
   `CONFIG.PUBLISHING.DRY_RUN = true`: it resolves the page, the token, the copy
   and every asset for real and posts nothing. Run it that way, read what it says
   it would post, and only then turn the flag off — on **one** row, on the page
   you least mind getting wrong. It is the only irreversible action in the system.
7. **Draft ads for that post with W10** and read the row. It cannot spend: budget
   and results are outside its output schema.
8. Then the rest of Phase 4: the approved-asset library, the events calendar, the
   shared entity registry, and the eleven hardcoded IDs.

### 6.5 Known open items not yet addressed

- **18% agreement** between the three systems describing the medical centers. Needs a
  brand-owner decision, not code — see `MEDICAL_SERVICES_TAXONOMY.md` §6.
- **Redundant tabs** — `Master Campaign Library`, `Campaign Defaults`,
  `Campaign Overview` (G8, G9).
- **Eleven hardcoded Google IDs** in `CONFIG.gs` (F17). Two new ones now read from
  Script Properties instead; the original eleven have not moved.
- **Kabarona** is two short sections away from building a card — the highest return
  per hour left in the knowledge base.

---

## 7. Traps that will cost you time

| Trap | What happens | What to do |
|---|---|---|
| **The repo is inside Google Drive** | Drive locks files under `.git/` and git commands fail with `Permission denied` on objects | Retry; verify state after. Moving the repo to a local path is the real fix. |
| **`git push origin main` from another branch** | Pushes the local `main` ref, not your work. Exits successfully. This already happened once and lost seven commits' worth of apparent progress. | Use `git push origin HEAD`, then confirm with `git status -sb` showing neither ahead nor behind. |
| **Apps Script stops at ~360s** | A three-worker content team over five rows does not fit in one invocation | Expected, not a failure. The system reserves 45s and checkpoints at 315s. |
| **Code is copied by hand** | Editing `src/*.gs` changes nothing until it is pasted into the Apps Script editor | After any code change, tell the operator which files to copy. |
| **Prompts are cached six hours** | Editing a prompt in Drive changes nothing until the cache clears | Run `Refresh Cache` from the sheet's AI Workers menu. |
| **`gh` CLI is not installed** | Cannot open pull requests from the terminal | Give the operator a prefilled GitHub compare URL. |
| **Sheet dropdowns fight the code** | Workers write valid values that the sheet rejects — 19 failures so far | **Fixed in code, needs one run:** Maintenance → Sync Dropdowns from CONFIG. |
| **A missing column fails silently** | `SheetWriter.writeCell` skips a column the sheet does not have, logs one line, and the run reports success | Maintenance → Create Managed Columns, then Preflight Check. Any code writing a new column must add it to `CONFIG.MANAGED_COLUMNS`. |
| **`\b` does not work on Arabic** | JavaScript defines `\b` on `[A-Za-z0-9_]`, so a regex like `/^أصعب\b/` matches nothing and silently reports zero | Use `(?![؀-ۿ])`. This bug was live in the portfolio critic and only surfaced because it was tested against real Arabic openings. |
| **Claude rejects `temperature`** | The Claude 5 family returns HTTP 400 on any non-default sampling parameter, and every worker declares one | Handled in `ClaudeProvider`, which no longer forwards it. Do not re-add it. |
| **A knowledge file's entity name is not the campaign's name** | W1 files the card under that name and `Content Pipeline` looks it up per post. The ICU file names "Intensive Care Unit"; the calendar schedules "ICU Center". A card filed under the entity name is orphaned — correct in every field, joined to nothing, and the strategy fields still arrive blank | Set `campaign_name` in the front matter, and run **Check Knowledge File** before building: it reports the slot count and names the near misses. |
| **Reference photographs are configured but absent** | Every domain folder under `business/Media/Services/` exists and matches `CONFIG.PROJECT_ASSETS.DOMAINS`, and every one is empty — the actual photos are still a `.zip` in `Services/Pics/`. `Brand Identity` has its images one level down in `Png/`, and the loader does not recurse | Generation falls back to AI_GENERATED silently. Unzip into the matching domain folders before judging any visual output. |
| **The audits are a baseline, not a status** | They describe 2026-07-29 and are deliberately unedited. Reading them as current state will send you to redo finished work | §6 is the status. The audits are the evidence. |

---

## 8. How the operator wants to work

- **Arabic for conversation.** Explain in Arabic; English technical terms inside the
  sentence are fine. Code, comments and documents stay in English.
- **Verify, do not assume.** This operator asks "are you sure?" and has been right to.
  Check the thing before reporting it done.
- **Evidence over opinion.** Every claim in the audits carries a measured number. Keep
  that standard.
- **Say what is not done.** Three components built recently have never completed a
  production run. That is stated plainly in the docs rather than glossed.

---

*If you have read this file and the four documents in §4, you know what a two-week
investigation found and what three working sessions built on top of it.*

***Start at §6.4 — and remember that nothing built since 2026-07-29 has run in
production. The first live run of any of it is the interesting one.***
