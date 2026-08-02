# START HERE

> **The entry point for this project.** If you are a person or an AI who has never seen
> this repository, read this file completely before opening anything else or writing any
> code.
>
> **Updated:** 2026-08-02
> **Status:** **Current** — the entry point. §6 is the authority on where the work
> stands. Every other document declares its own status; the index is
> `campaign-os/docs/DOCUMENT_STATUS.md`.

---

> ## ⚠️ Read this before you start work
>
> **Phases 0 through 4 are implemented. All ten workers exist in code. The
> knowledge base covers 73 of 132 scheduled slots. Every document declares its own
> status.** If you were told to start at any phase, that instruction is out of
> date. **Do not redo any of it.**
>
> Everything is in git, on `main`. What has *not* happened is a production run:
> **the code has never been pasted into the Apps Script editor, and not one worker
> built since 2026-07-29 has made a single live API call.** **724 automated checks**
> pass against the real files — `node campaign-os/tests/run.js` — and none of them
> proves the system runs.
>
> **Where the work actually stands is §6.** Read §1–§5 for the business and the
> system, then go to §6 — do not infer the current state from anything else in
> this document, or from the audits, which describe the system as it was measured
> on 2026-07-29 and are deliberately left unedited as the baseline.
>
> **What the project needs next is an operator, not a builder.** §6.3 and §6.4 are
> a list of things only the person with the sheet, the keys and the facts can do.

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

**The workers — all ten built, five never run:**

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
| 9 | `business/brand/ENTITY_REGISTRY.md` | **The single list of what the ecosystem contains** — every entity, its level, and the campaign name it is filed under. Also names the four places the three systems still disagree. **Shared with the Website Platform.** |

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

✅ **Every document now declares its own status** — Current, Baseline, Historical,
Superseded or Proposal — and `campaign-os/docs/DOCUMENT_STATUS.md` is the index.
Findings A·F15 and A·F16 are closed. Two claims the audit counted are still worth
knowing: the **Model Router** described by four documents has never been built, and
OCR verification remains deliberately deferred. The **Publishing Service** those
documents reserve columns for now exists.

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
| **5%** | of the knowledge base written — 2 files for ~40 entities | 26 files. 24 build a campaign card, covering 73 of 132 scheduled slots today and 81 after the sheet renames; 2 await operator facts and would add 24 more |
| **2 of 10** | workers own the ends of the chain, and neither exists | W1 and W2 exist and are untested. W9 and W10 still do not |

**The one-sentence reading, still true:** the machinery is in better shape than its
inputs. The difference is that the inputs now fail loudly instead of quietly.

---

## 6. Where the work actually stands

**This is the section to trust.** The audits in Layer 3 describe the system as it was
on 2026-07-29 and are deliberately unedited — they are the baseline, not the status.

### 6.0 The whole operator list, in order

Everything below is something **only the operator can do** — it needs the sheet, a
key, or a fact that exists nowhere in this repository. Nothing in §6.1 can be
verified until §6.0 items 1–4 are done, and the order matters where it is numbered.

| # | What | Why it is yours | Detail |
|---|---|---|---|
| 1 | **Rotate the leaked credentials** | `.env.production` is tracked in git on a **public** repo and carries the Supabase production `DATABASE_URL` and both JWT signing secrets. Committed 2026-07-29 in `40e6a02`. Deleting the file does not undo it — the history is public. | Rotate first, then `git rm --cached .env.production` |
| 2 | **Paste the five `.gs` files into the Apps Script editor** | Nothing in this repository takes effect until this happens | §6.1a — five files and one `.html`, not 31 |
| 3 | **Set the Script Properties** | Keys and folder IDs. `ANTHROPIC_API_KEY` and `KNOWLEDGE_FOLDER_ID` are required; the rest fall back to `CONFIG.gs` | §6.3 |
| 4 | **Upload to Drive**: `prompts/planning/`, `prompts/ads/`, the knowledge folders, and `ENTITY_REGISTRY.md` | The workers load their manuals from Drive at runtime | §6.3 |
| 5 | **Create Managed Columns → Sync Dropdowns → Preflight Check** | One-time schema setup. Preflight must report no problems | §6.3 |
| 6 | **Three renames in the sheet** | Kabarona ×7 rows, `Myth vs Fact` ×2 rows. Until they land, two finished knowledge files are joined to nothing | §6.3 |
| 7 | **Verify the visual pipeline on one Static row** | `MediaDesigner`, `TextOverlay` and `AssetIntegrity` have never completed a production run. The oldest unverified thing in the system | §6.4 item 1 |
| 8 | **Answer the five operator questions** | Emergency and Delta. Facts only you have. Worth **24 scheduled posts** | `business/knowledge/NEEDS_OPERATOR_QUESTIONS.md` |
| 9 | **Enter Ramadan and Eid dates** | Hijri, locally announced. The system refuses to estimate them | §6.4 item 8 |
| 10 | **Name a clinician to review medical content** | The three educational campaigns must not run without one | `EDUCATIONAL_MYTHS_FACTS.md` |
| 11 | **Decide the entity divergences** | Do the website's Ophthalmology and Dermatology centers exist? A brand-owner question the code deliberately does not guess at | `ENTITY_REGISTRY.md` §Divergences |
| 12 | **Facebook page tokens**, when you reach W9 | Two Script Properties per page. W9 refuses by name rather than defaulting to another page | §6.3 |
| 13 | **Unzip the facility photographs** | `business/Media/Services/Pics/` holds a `.zip`; every domain folder beside it is empty, so generation falls back to AI with no reference | §7 |
| 14 | **Execute the tab consolidation** | Every step is an edit to live data, and the order is load-bearing | `roadmap/TAB_CONSOLIDATION.md` |

**Items 1–6 are prerequisites.** Item 7 is the first thing that produces evidence.

---

### 6.1 Done, in git, never run

Six working sessions. Every line below is committed to `main` and **none of it has
run in production.**

Phases 0–3 of `VERDICT_AND_IMPROVEMENTS.md` §5 are implemented across three working
sessions. **No worker built in these phases has made a live API call, and no code has
been pasted into the Apps Script editor.**

⚠️ **Corrected 2026-07-31.** This section previously claimed "roughly 140 automated
checks pass". They had been run as throwaway scripts in earlier sessions and never
committed, so nobody could re-run them and the claim could not be checked. There is
now a committed harness — **724 checks**, `node campaign-os/tests/run.js`, no
dependencies and no network. It covers the logic layer only: every Apps Script
service is stubbed to throw, so nothing here writes a cell, reads Drive or calls a
model. See `campaign-os/tests/README.md`.

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

**A sixth pass, 2026-07-31 — the calendar and the identifiers.**

**The events calendar (I5)** closes Audit B's B10: nothing in this system knew a
season was coming. `EventsCalendar.gs` answers what falls inside — or just
before — the window being planned, and the planner now receives it in its brief.
It **never computes a Hijri date**: Ramadan and Eid are entered by hand per year,
and a year with no entry is reported as missing rather than estimated. A Ramadan
date one day out would misplan a month of medication-timing content. New menu
item: Planning → **What Is Coming**.

**F17 is closed.** All eleven hardcoded Google identifiers, plus the publishing
page list, now resolve from Script Properties with the `CONFIG.gs` value as the
fallback — so a second deployment is a configuration exercise rather than a code
fork, and the current one is unaffected until a property is set. New menu item:
Maintenance → **Deployment Identifiers**.

**The approved-asset library (I4)** closes the oldest dead configuration in the
system: `CONFIG.VISUAL_ASSETS.approved` had existed since the beginning and no
code ever read or wrote it. QA approval now files the artwork into it under a
name that says what it is — Drive ids survive a move, so every URL already in the
sheet keeps resolving — and Visual Team → **Reuse An Approved Asset** offers
matching sets for a row. Reuse skips generation, the most expensive line in the
system, and still goes through QA: reuse changes what artwork costs, not whether
it is checked. The choice is the operator's, because an automatic substitution
would put an approved image behind copy nobody checked it against.

**The entity registry (I7)** is `business/brand/ENTITY_REGISTRY.md` — see §6.5.

⚠️ **Superseded 2026-08-02.** This section used to list the individual `.gs` files
changed in each pass, so the operator knew which to re-paste. There are now five
files and every pass touches one of them — **§6.1a is the list**. `ENTITY_REGISTRY.md`
still has to be uploaded to the docs folder in Drive. Still nothing verified in
production.

### 6.1a The files to paste

**Six files. Five `.gs` and one `.html`.**

| File | Lines | What is in it |
|---|---|---|
| `Core.gs` | 3,490 | CONFIG · ConfigResolver · Logger · SheetSchema · SheetWriter · DriveLoader · ResponseParser |
| `AI.gs` | 4,699 | AIProvider · ImageProvider · ContextBuilder · AdPolicy · MediaDesigner · TextOverlay · Branding · AssetIntegrity · AssetLibrary · VisualPlan · ServiceRunner |
| `Planning.gs` | 3,937 | CardBuilder · PlannerRunner · PortfolioCritic · EventsCalendar · EntityRegistry · Batches · Transfer · Archive · PostFooter |
| `Delivery.gs` | 1,040 | PublishingRunner · AdsRunner |
| `App.gs` | 3,859 | WorkerRunner (`onOpen` and every menu function) · ControlCenter |
| `ControlCenter.html` | 1,346 | **Not a `.gs` and cannot be merged into one.** `HtmlService.createHtmlOutputFromFile('ControlCenter')` resolves it by name when the sidebar is opened |

It was 31 `.gs` files until 2026-08-02. They were merged because the operator pastes
every file by hand and does it again after every change; 31 was an unreasonable
amount of manual work for a repository with no deployment step.

**Nothing about the code changed.** Apps Script has no modules — every `.gs` is
evaluated into one shared scope before anything is called, so which file a
definition sits in has never affected what runs. Each of the 31 originals is still
present, byte for byte, as a banner-delimited section:

```
// BEGIN SOURCE FILE: Transfer.gs
...
// END SOURCE FILE: Transfer.gs
```

Those banners are load-bearing. The tests read a source **by section** — a check
about `AdPolicy`'s regex literals, pointed at the whole of `AI.gs`, would start
reporting on its ten neighbours. Keep them if you regroup anything.

The evidence that the merge changed nothing: every section was re-extracted and
compared against the committed original (31 of 31 identical, the only difference
being a final newline added to the two files that shipped without one); the
namespace the sources contribute is pinned at 136 names in `tests/GLOBALS.txt` and
is unchanged; and 612 checks pass, including 43 that confirm every menu item still
points at a function that exists.

**Delivery is separate on purpose.** Publishing is the only irreversible operation
in the system, and it should be easy to find and hard to change by accident.

### 6.1b The Control Center sidebar

**Written 2026-07-27, and it stopped there.** Everything built afterwards went into
the `onOpen` menu only, so the sidebar covered W3 to W8 — the middle of the chain —
and 18 of the menu's 31 items had no equivalent in it.

Three things were fixed on 2026-08-02. **None of them has been seen in a browser:
the sidebar has never been opened.**

- **The health light was checking the wrong thing.** It read `GEMINI_API_KEY` and
  labelled the result *API*. The Creative Director runs on Claude and does **not**
  fall back — without `ANTHROPIC_API_KEY` it fails on every row, by name. So the
  panel showed green at exactly the moment the operator was deciding whether the
  system was ready, and the most expensive worker in the chain could not make a
  call. It now checks every provider some worker is configured to use, **names the
  missing one**, and shows a provider that no worker uses without failing on it.
- **Delivery is reachable.** A new card runs W9 and W10 over a row range.
  `PublishingRunner` and `AdsRunner` are not entries in `CONFIG.WORKERS`, so
  `executeWorker` could never have reached them.
- **Transfer Rows Forward** is in Operations. It takes no row range: it moves what is
  ready, skips what is already downstream, and names any campaign transferred with
  no card behind it.

**Publishing states its mode on the button** — `Publish — DRY RUN`, `Publish — LIVE`
in red, or `Publish — mode unknown` if the flag cannot be read. The menu only tells
the operator inside the dialog that follows the click. On the one action in this
system that cannot be undone from the sheet, the state belongs where it is read
before the click, and an unreadable flag is treated as live.

**Still only in the menu, deliberately:** the one-time setup (Create Managed Columns,
Sync Dropdowns, Unblock Dropdowns), the diagnostics (Preflight, Deployment
Identifiers, Check Entity Registry, Check Project Assets, Check Visual Asset
Folders), and **Archive A Finished Plan** — the only destructive operation here,
which asks the operator to type a batch id. Among a panel of run buttons that is a
wrong click waiting to happen.

**A Planning card was added the same day.** W1, W2, the Portfolio Critic, Check
Knowledge File and What Is Coming. These take a knowledge filename, a written brief
and a batch rather than a row range, so each got its own control:

- **The knowledge file is a list, not a typed name.** `CardBuilder.listKnowledgeFiles`
  is new — the menu asks the operator to type the filename *exactly as it appears in
  Drive*, and a typo comes back as "not found", which reads like a missing file
  rather than a mistyped one. A list removes the whole class of error.
- **What can be scheduled is stated before the form is filled**, not after it is
  submitted: how many campaigns are ready, which cards carry almost no strategy, and
  which are excluded for not being Active.
- **The daily ceiling is shown while the numbers are being typed.** PROJECT_DECISIONS
  §4 caps the ecosystem at 3 posts a day. Going over is still allowed and still
  confirmed — the panel says so before the click rather than refusing after it.
- **The critic takes a batch from a list**, because it measures repetition across the
  rows it is given and a range covering two plans reports their difference as a fault.

Every refusal is enforced **on the server as well as in the form** — an unknown
publishing page, a plan over the ceiling without confirmation, an empty filename. A
browser can be made to send anything, and the cap is a decision about the business.

**Still only in the menu, and that is the whole list now:** the one-time setup, the
diagnostics, Archive, and Resume/Stop/Refresh which the panel already has its own
controls for.

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
| `CORPORATE_INNOVATION.md` · `EDUCATIONAL_HEALTH_AWARENESS.md` · `EDUCATIONAL_PREVENTION_TIPS.md` · `SUPPORTING_VISITING_PROFESSORS.md` · `SUPPORTING_PATIENT_GUIDES.md` | Healthcare Innovation · Health Awareness · Prevention Tips · Visiting Professors · Patient Guides | 2 each | ✅ build cards |
| `CORPORATE_WHY_INSAN.md` · `CORPORATE_BRAND_IDENTITY.md` · `CORPORATE_GROWTH.md` · `CORPORATE_DIGITAL.md` · `SUPPORTING_MEDICAL_EDUCATION.md` · `EDUCATIONAL_SEASONAL.md` | Why INSAN? · Brand Identity · Growth & Transformation · Digital Transformation · Medical Education · Seasonal Campaigns | 1 each | ✅ build cards |
| `MEDICAL_SERVICE_EMERGENCY.md` | Emergency Center | 16 | 🟠 3 operator markers |
| `HOSPITAL_DELTA.md` | Delta Restore Trust | 8 | 🟠 2 operator markers |

**73 of 132 slots** are covered today, **81 once the renames below land**, and
**105** once the two 🟠 files are filled.

**Three clusters are complete** — Corporate (7), Supporting (11) and Educational
(4) — each with a routing test that stops its campaigns collapsing into one
another. What remains is what nobody can write without the operator or a
clinician: the twelve Medical Centers, the other Departments, Future Hospital and
the Programs. The middle column is the
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

1. **Copy the six files in `src/` into the Apps Script editor** — five `.gs` and
   `ControlCenter.html`, which must keep that exact name. Nothing takes effect until
   this happens. The list is §6.1a; the trap is §7.
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
8. **Enter this year's Ramadan and Eid dates** in `CONFIG.EVENTS_CALENDAR.MOVEABLE`.
   The events calendar (I5) landed 2026-07-31 and the planner now reads it — but it
   refuses to estimate a Hijri date, so until the dates are entered it will say it
   does not know them. **AI Workers → Planning → What Is Coming** shows what is
   recorded and what is missing. Ramadan needs the most notice: the
   medication-timing content has to be written and clinically reviewed before the
   month starts.
9. **Run Check Entity Registry once** and decide the four divergences it lists.
   The two website-only centers are the commercially exposed one.
10. **Phase 4 is otherwise complete.** What is left is the production run of all
    of it.

### 6.5 Known open items not yet addressed

- **18% agreement** between the three systems describing the medical centers.
  **A registry now exists** — `business/brand/ENTITY_REGISTRY.md` is the single
  list, and Maintenance → **Check Entity Registry** reports every card that names
  something the business does not list and every Service Level that contradicts
  it. Run against today's sheet it finds **8 such cards**. The registry also
  writes down the four divergences by name. What it cannot do is decide them:
  whether the website's Ophthalmology and Dermatology centers exist is a
  brand-owner question, and the code deliberately does not guess.
- **Redundant tabs** (G8, G9). **The decision and the migration order are written** —
  `roadmap/TAB_CONSOLIDATION.md`. Nothing is executed, because every step is a change
  to the live sheet. Two things worth knowing before you touch it: `Campaign Overview`
  duplicates the cards' identity block exactly and is the clearest deletion in the
  workbook; and the `Content Calendar` carries **26 columns** of campaign strategy
  copied onto every row, which the Content Pipeline already looks up — that is how
  the two drift. Also found while measuring it: **W2's contract requires it to
  respect Master Campaign Library page eligibility, and `PlannerRunner.gs` never
  reads that tab.**
- ~~**Eleven hardcoded Google IDs** in `CONFIG.gs` (F17).~~ **Closed 2026-07-31.**
  All eleven, plus the publishing page list, now read from Script Properties and
  fall back to the value in `CONFIG.gs` when a property is absent — so nothing
  changes until one is set. **Maintenance → Deployment Identifiers** shows which
  are set, without printing any value.
- **Kabarona** is two short sections away from building a card — the highest return
  per hour left in the knowledge base.

---

## 7. Traps that will cost you time

| Trap | What happens | What to do |
|---|---|---|
| **The repo is inside Google Drive** | Drive locks files under `.git/` and git commands fail with `Permission denied` on objects | Retry; verify state after. Moving the repo to a local path is the real fix. |
| **`git push origin main` from another branch** | Pushes the local `main` ref, not your work. Exits successfully. This already happened once and lost seven commits' worth of apparent progress. | Use `git push origin HEAD`, then confirm with `git status -sb` showing neither ahead nor behind. |
| **Apps Script stops at ~360s** | A three-worker content team over five rows does not fit in one invocation | Expected, not a failure. The system reserves 45s and checkpoints at 315s. |
| **Code is copied by hand** | Editing `src/*.gs` changes nothing until it is pasted into the Apps Script editor | After any code change, tell the operator which of the five files to copy. §6.1a maps each of the 31 original sources to the file it now lives in. |
| **A menu item can point at nothing** | `onOpen` binds by string — `.addItem('Transfer Rows Forward', 'transferRowsForward')`. Apps Script resolves that name **when the operator clicks it**, not at load. A renamed function, or a file left out of a paste, gives a menu that draws perfectly with an item that does nothing | `node campaign-os/tests/run.js menu` — 43 checks, one per binding. Run it after touching anything the menu reaches. |
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
