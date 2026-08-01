# Document Status

> **Version:** 1.0
> **Date:** 2026-07-31
> **Status:** Current — this file is maintained
> **Closes:** Audit A findings F15 (documents claim unbuilt features) and F16 (six
> documents stuck at Sprint 1 status)

---

## Why this file exists

Audit A found four documents asserting a Model Router that has never existed, ten
asserting a Publishing Service that did not exist until this week, and six carrying
`Status: Sprint 1 — Visual Language Integration` long after Sprint 1 ended.
`SPRINT_1_ROADMAP.md` read *Active — In Progress*. `CURRENT_STATE.md` said Sprint 3.
All of them could not be true.

The audit's own note about this is the point:

> *"an audit that reads instructions rather than outputs will confirm whatever the
> instructions claim."*

It was written about worker audits. It applies to the documentation with equal force,
and the cost is real: a fresh reader trusts a status line, and a wrong one sends them
to rebuild something that exists or rely on something that does not.

---

## The convention

**Every document states, in its header, whether what it describes exists.**

| Marker | Meaning |
|---|---|
| **Current** | Describes the system as it is. Maintained. |
| **Current, with caveats** | Broadly accurate; specific claims are marked inline. |
| **Baseline** | A measurement of a past state, deliberately left unedited so later work can be compared against it. |
| **Historical** | A record of finished work. Accurate about its moment, not about now. |
| **Superseded** | Replaced by a named document. Kept for the reasoning, not the content. |
| **Proposal** | Describes something not built. Says so on the same line as its version. |

A document describing unbuilt behaviour must say so **on the same line as its
version**, where a reader sees it before the content.
`WORKER_CONTRACTS_V2.md` does this per worker with 🔴/🟡/🟢 and is the model.

**When a document's status changes, this index changes with it.** One index is
checkable; twenty scattered headers are not.

---

## The index

### Entry point

| Document | Status | Note |
|---|---|---|
| `START_HERE.md` | **Current** | The entry point. §6 is the authority on where work stands. |
| `DOCUMENT_STATUS.md` | **Current** | This file. |

### The system

| Document | Status | Note |
|---|---|---|
| `SYSTEM_ARCHITECTURE.md` | **Current** | All ten workers, the data contract, the two-layer knowledge rule. |
| `architecture/WORKER_CONTRACTS_V2.md` | **Current** | Per-worker I/O with build status. Supersedes `VISUAL_WORKER_CONTRACTS.md`. ⚠️ Its W2 clause about Master Campaign Library page eligibility is **not implemented** — see `roadmap/TAB_CONSOLIDATION.md`. |
| `architecture/CREATIVE_PACKAGE_CONTRACT.md` | **Current** | The Content → Visual handoff, in detail. Sits under WORKER_CONTRACTS_V2. |
| `architecture/INSAN_VISUAL_LANGUAGE_SPEC.md` | **Current** | Loaded at runtime by the Creative Director and the Media Designer. |
| `architecture/VISUAL_SHEET_SCHEMA.md` | **Current** | The Visual Pipeline columns. The Publishing Service columns it reserves are now written by W9. |
| `architecture/VISUAL_PIPELINE_FLOW.md` | **Current** | The stage machine. Its Publishing Service stage is now `PublishingRunner.gs`. |
| `architecture/PROMPT_LAYER_INVENTORY.md` | **Current, with caveats** | The prompt layers. Written before `MediaDesigner.gs` existed, so the image path it describes is now composed by a worker rather than by concatenation. |
| `architecture/MEDIA_GENERATION_SERVICE_CONTRACT.md` | **Current, with caveats** | ⚠️ Describes a **Model Router**, which has never been built. Model selection is `CONFIG.MEDIA_MODELS`. The rest is superseded in part by `MediaDesigner.gs` and WORKER_CONTRACTS_V2 W7. |
| `architecture/VISUAL_PRODUCTION_ARCHITECTURE.md` | **Current, with caveats** | ⚠️ Same Model Router claim; the file already carries an inline correction at the point it makes it. |
| `architecture/VISUAL_WORKER_CONTRACTS.md` | **Superseded** | By `WORKER_CONTRACTS_V2.md`. Kept for the visual-team detail V2 summarises. |
| `constants/SYSTEM_CONSTANTS.md` | **Superseded** | By `CONFIG.gs`. Phase 1 made CONFIG the single vocabulary source and `syncVocabularyFromConfig` writes the sheet from it. A vocabulary edited here changes nothing. |

### The business

| Document | Status | Note |
|---|---|---|
| `business/brand/MASTER_BRAND_ARCHITECTURE.md` | **Current** | Governs everything. |
| `business/brand/MEDICAL_SERVICES_TAXONOMY.md` | **Current** | Departments vs Centers vs Clinics. Shared with the website. |
| `business/brand/ENTITY_REGISTRY.md` | **Current** | The single list of what exists. Shared with the website. |
| `business/knowledge/KNOWLEDGE_BASE_SPEC.md` | **Current** | The registry of knowledge files and what is written. |

### The findings

| Document | Status | Note |
|---|---|---|
| `OPERATIONAL_AUDIT.md` | **Baseline** | Measured 2026-07-29. Deliberately unedited; per-finding status in its §8. |
| `AUDIT_B_OUTPUT_AND_PORTFOLIO.md` | **Baseline** | Measured 2026-07-29, from 33 finished posts. Status table at the top. |
| `VERDICT_AND_IMPROVEMENTS.md` | **Current** | The judgement and the phased plan. Phase status maintained in its §5. |
| `roadmap/GAP_REGISTER.md` | **Baseline** | Gap descriptions from 2026-07-29 with a maintained status table. |
| `roadmap/ISSUE_REGISTER.md` | **Historical** | Content and visual quality defects from earlier sprints. Superseded as a status source by the two audits. |

### Plans and history

| Document | Status | Note |
|---|---|---|
| `roadmap/TAB_CONSOLIDATION.md` | **Current** | The G8/G9 decision and migration order. Nothing executed. |
| `roadmap/PROMPT_CACHING_PLAN.md` | **Partly implemented** | ⚠️ Its own header said *nothing below has been implemented*, which stopped being true in Phase 0. Steps 1–3 are done — the timestamp removed, cached tokens logged, an Anthropic cache breakpoint in place. Step 4, explicit Gemini caching, is deliberately not built until implicit caching is measured. |
| `roadmap/SPRINT_1_ROADMAP.md` | **Historical** | Sprint 1 is finished. Its header said *Active — In Progress*. |
| `roadmap/SPRINT_2_VALIDATION_IMPROVEMENTS.md` | **Historical** | Sprint 2 is finished. Its header said *IN PROGRESS*. |
| `roadmap/VISUAL_PRODUCTION_ROADMAP.md` | **Historical** | Implementation plan, largely delivered. Superseded by `VERDICT_AND_IMPROVEMENTS.md` §5. |
| `roadmap/VALIDATION_RUN_002_CHECKLIST.md` | **Historical** | A checklist for a run that has not happened. Superseded by `START_HERE.md` §6.4. |
| `tasks/VISUAL_PRODUCTION_TASKS.md` | **Historical** | Implementation checklist. Contains a Model Router section describing something that was never built. |
| `reviews/VISUAL_PLANNER_CODE_REVIEW.md` | **Historical** | A point-in-time review. `VisualPlan.gs` now computes what it reviewed. |
| `CURRENT_STATE.md` | **Superseded** | By `START_HERE.md` §6. Contains claims later found untrue; kept for the story of how the system got here. |
| `HANDOFF.md` | **Superseded** | By `START_HERE.md`. Same caveat. |
| `HANDOFF_2026-08-02.md` | **Current** | Written for the session picking up the 31→5 file consolidation. Records what the 2026-07-31/08-02 session built, the positional-coupling defect it found, and the two bugs it introduced and caught. |

---

## The three claims Audit A counted

| Claim | Documents asserting it | Now |
|---|---|---|
| **Model Router** | 4 | ❌ **Still does not exist.** Model selection is `CONFIG.MEDIA_MODELS`, chosen per media type, with no router. The four documents are marked above. |
| **Publishing Service** | 10 | ✅ **Built 2026-07-31** — `PublishingRunner.gs`, W9. The reserved columns those documents describe are now written. Ships with `DRY_RUN` on and has never posted. |
| **OCR verification** | 2 | ❌ Deliberately deferred. `AssetIntegrity.gs` covers what arithmetic can decide; text verification is not built. |

---

## Maintaining this

Update when a document is written, superseded, or has its status change — in the same
commit as the change, not afterwards.

A document whose status here disagrees with its own header is a defect, and the header
is the one to fix: this index is the register, and a register that has to be
reconciled against twenty files is the problem it replaced.

---

*End of Document Status.*
