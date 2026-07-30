# START HERE

> **The entry point for this project.** If you are a person or an AI who has never seen
> this repository, read this file completely before opening anything else or writing any
> code.
>
> **Updated:** 2026-07-29

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
W2  Campaign Planner        ❌ not built    operator brief → calendar        (human today)
W3  Content Strategy        ✅ built        → Content Pipeline S:AJ
W4  Content Creation        ✅ built        → Content Pipeline AK:AN
W5  Creative Director       ✅ built        → refines S:AJ, approves AO:AS
W6  Visual Planner          ✅ built        → Visual Pipeline S:U
W7  Media Designer          🟡 unverified   → the image prompt
W8  Visual QA               ✅ built        → Visual Pipeline Y:AB
W9  Publishing              ❌ not built    → AC:AE (columns reserved)      (human today)
W10 Paid Ads                ❌ not built    → a new Ads Pipeline tab        (human today)
```

Both ends of the chain — planning and publishing/ads — are still done by hand.

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
| `business/knowledge/departments/MEDICAL_SERVICE_ICU.md` | 2,761 lines. **The reference standard** — the depth every entity file is supposed to reach. Only two exist. |
| `business/knowledge/KNOWLEDGE_BASE_SPEC.md` | The registry: which entities have a file, which do not, and how many posts each is scheduled for |

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

Every figure below was measured, not estimated. Evidence in the audits.

| | |
|---|---|
| **67%** | of Content Pipeline rows reach the workers with all twelve strategy fields blank |
| **26%** | of worker calls failed (78 of 298), 60% of them external API conditions |
| **88%** | of finished posts open with one of five rhetorical formulas |
| **18%** | agreement between the three systems that describe the medical centers |
| **~9.7M of 10.8M** | input tokens are byte-identical across rows, and caching is blocked by one line |
| **5%** | of the knowledge base is written — 2 files for ~40 entities |
| **2 of 10** | workers own the two ends of the chain, and neither exists |

**The one-sentence reading:** the machinery is in better shape than its inputs. Every
sprint so far was spent improving prompt quality, and the prompts are — on measurement —
the healthiest part of the system.

---

## 6. The agreed next action

> **Updated 2026-07-30.** Phases 0, 1 and 2 have been implemented. The code changes
> are in `campaign-os/src/`; the knowledge files are in `business/knowledge/`.
> **Nothing has run in production yet** — every change still needs to be pasted into
> the Apps Script editor, and three one-time menu actions need running. See
> `VERDICT_AND_IMPROVEMENTS.md` §5 for the phase list and the sprint notes below it.
>
> Immediate next actions, in order:
> 1. Copy the changed `src/*.gs` files into the Apps Script editor.
> 2. Add `ANTHROPIC_API_KEY` and `KNOWLEDGE_FOLDER_ID` to Script Properties.
> 3. Run Maintenance → **Create Managed Columns**, then **Sync Dropdowns from
>    CONFIG**, then **Preflight Check**.
> 4. Fill the two `NEEDS-OPERATOR` sections in `MEDICAL_SERVICE_EMERGENCY.md` and
>    `HOSPITAL_DELTA.md` — 24 scheduled posts are waiting on them.
> 5. Build cards from the five files that are ready, and verify one against the
>    sheet.

The original Phase 0, kept for reference:

1. **Fix the creative-memory window.** `ContextBuilder._buildCreativeMemory` anchors its
   scan to the bottom of the sheet instead of the row being written, so it always reads
   empty rows and has never returned anything. This is the direct cause of the 88%
   repeated openings.
2. **Delete the timestamp line** in `ContextBuilder.gs:148` **and** `MediaDesigner.gs:83`.
   It is the third line of every prompt, changes every call, and blocks all prompt
   caching. Nothing reads it.
3. **Enable the Claude fallback** — add `ANTHROPIC_API_KEY` to Script Properties and set
   `provider: 'claude'` on one worker. The code path already exists; 31 rows failed to
   Gemini availability while it sat unused.

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
| **Sheet dropdowns fight the code** | Workers write valid values that the sheet rejects — 19 failures so far | See Audit A §2. Four vocabularies disagree between `CONFIG.gs` and `SYSTEM_CONSTANTS`. |

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
investigation found. Start at Phase 0.*
