# Campaign OS -- Current State

> **Version:** 1.6
> **Date:** 2026-07-27
> **Status:** Sprint 3 -- Pipeline Integrity Fixes complete. Awaiting Validation Run #002.
> **Canonical Handoff Document** -- Primary entry point for Campaign OS development.
> **Scope:** Campaign OS only. For Website Platform, see `website/Docs/CURRENT_STATE.md`.

---

## ⚠️ Read This First — Sprint 2 Conclusions Were Not Verified

Sprint 2 closed every worker with a "Compliance Audit PASS" and concluded that
the architecture required no further change before production.

**Those audits reviewed prompt text. They did not review output.**

A subsequent review of the actual pipeline — the code, the sheet data, and a
generated asset — found that several defects marked resolved in Sprint 2 were
still reaching production, and that some had never been reachable by a prompt
change at all.

Nothing below invalidates the architecture. Ownership boundaries, contracts and
the Field Responsibility Matrix all held up. The failures were in **data flow and
verification**, not in design.

### What was actually wrong

| Finding | Sprint 2 status | Reality |
|---|---|---|
| Strategic inputs scrambled | Not detected | The Content Pipeline transfer formula pulled `Campaign Cards!P:AA` into columns expecting `O:Z`. Every strategic field was shifted one column. `Target Audience` received a number; `Emotional Trigger` received a psychological barrier. **Every worker had been running on mismatched inputs.** |
| VP-001 metadata leakage | DONE | `ServiceRunner` appended `". Slide N of M"` to every carousel prompt in code. No prompt rule could have prevented it. |
| VP-006 repetitive composition | DONE | Every asset in a carousel received an identical prompt. A four-card set was four attempts at one image. |
| DP-009 QA too permissive | DONE | Visual QA received the asset URL as plain text and never saw the image. It graded the Creative Package and returned A+ on assets containing duplicated text and an unauthorized logo. |
| Reference Asset Package | DONE | Written by the Visual Planner, read by nothing. |
| QA decision vocabulary | — | The prompt asked for `PASS`/`REVISE`/`REJECT`; `stageMapping` expected `Approved`/`Revision Required`/`Rejected`. Only controlled-vocabulary injection kept the state machine alive. |
| Revision loop | — | `Revision Required → PLANNING` had no counter, despite `VISUAL_PIPELINE_FLOW.md` specifying a maximum of 3. |

### The lesson worth keeping

A worker that cannot observe its subject cannot evaluate it. A prompt rule cannot
constrain behaviour that lives in code. **An audit that reads instructions rather
than outputs will confirm whatever the instructions claim.**

Future sprint closure requires evidence from a production run, not a prompt review.

---

## Executive Summary

| Dimension | Status |
|-----------|--------|
| **Project Phase** | Sprint 2 -- Visual Production Quality Hardening |
| **Documentation** | Complete (architecture, contracts, prompts, roadmap) |
| **Apps Script Code** | Implemented (12 source files in `src/`) |
| **Workers** | 4 workers finalized (Creative Director, Visual QA, Media Generation, Visual Planner) |
| **Production Pipeline** | Operational (Content Pipeline + Visual Pipeline) |
| **Current Sprint** | Sprint 2 -- Branch A Complete (Creative Director) + Branch B Complete (Visual Planner & Visual QA) |
| **Visual Language** | Implemented (INSAN Visual Language spec, CONFIG.gs) |

**Overall:** Campaign OS is a Google Apps Script AI Operating System that transforms strategic content into publishable social media assets using AI Workers. The system has reached an architectural milestone: it has evolved from prompt-based workers into a Contract-Driven AI Operating System with stabilized ownership, boundaries, and decision flow. Sprint 2 is focused on visual production quality hardening based on Validation Run #001 findings. Branch A (Creative Director) is complete with all 8 assigned DP findings implemented and compliance audit passed. Branch B (Visual Planner & Visual QA) is also complete with all assigned Sprint 2 findings implemented and consistency audit passed.

---

## Current Project Phase

**Sprint 2 -- Visual Production Quality Hardening**

The single goal of this sprint:

> "Raise quality of the next Production Run. No feature additions."

Every implementation decision must answer: **"Will this improve the quality of the next production run?"**

---

## Sprint 2 Objective

Sprint 2 was created after the first Production Validation Run revealed 20 findings (10 Visual Production + 10 Pipeline Data). The sprint addresses these findings through targeted worker prompt updates.

**Branch A Status:** Complete
- Creative Director prompt hardened with all 8 DP findings (DP-001 through DP-008)
- Creative Decision Ownership, Field Responsibility Matrix, Language Policy, Egyptian Identity, Narrative Moment, Text Safety Rules implemented
- All assigned Sprint 2 findings implemented
- Final Compliance Audit passed
- Worker is Production Ready

**Branch B Status:** Complete
- Visual Planner Prompt finalized with Creative Preservation Validation
- Visual QA Prompt finalized with Production Validation & Hard Gates
- All assigned Sprint 2 findings implemented
- Prompt propagation completed across architecture documentation
- Consistency Audit passed

---

## Architectural Milestone

The project has reached a significant architectural milestone.

The system has evolved from:

> **Prompt-based Workers**

into:

> **A Contract-Driven AI Operating System.**

### What Is Now Stable

The following architectural elements are considered settled and should not be redesigned without production evidence:

| Element | Status | Description |
|---------|--------|-------------|
| Worker Ownership | Stabilized | Every worker owns a defined set of decisions. No decision shared across workers. |
| Responsibility Boundaries | Stabilized | Each field owns exactly one creative decision. Field Responsibility Matrix defines separation. |
| Creative Package Architecture | Stabilized | Creative Director owns all creative decisions. Design Prompt is execution layer only. Visual Package is Source of Truth. |
| Prompt / Contract / Schema Alignment | Stabilized | Worker prompts, data contracts, and sheet schema are synchronized. Single source of truth for each concept. |
| Cross-Worker Decision Flow | Stabilized | Creative Director → Visual Planner → Media Generation → Visual QA. No worker invents missing decisions. |
| Visual Production Pipeline | Stabilized | Six-stage pipeline with clear ownership and stage transitions orchestrated by WorkerRunner. |
| Source of Truth Architecture | Stabilized | Content Pipeline owns creative data. Visual Pipeline owns production data. No reverse writes. |
| Single Owner per Decision | Stabilized | Every creative decision exists in exactly one field. One Decision. One Owner. One Field. |

### What This Means

The architecture no longer requires speculative redesign.

Future improvements should be driven by:

- Validation Run results
- Production metrics
- Operational experience
- Real production data

Not by rewriting prompts or redesigning worker responsibilities.

---

## Current Sprint Status

### Sprint 2 Progress

| Step | Area | Status |
|---|---|---|
| Step 0 | Ownership Verification | COMPLETE |
| Step 1 | Creative Director Worker | COMPLETE |
| Step 2 | Visual Planner Worker | COMPLETE |
| Step 3 | Media Generation Service | COMPLETE |
| Step 4 | Visual QA Worker | COMPLETE |
| Step 5 | Content Strategy Worker | TODO |
| Step 6 | System Logging | TODO |

**Branch A:** COMPLETE (Creative Director)
**Branch B:** COMPLETE (Visual Planner & Visual QA)
**Current Phase:** Step 5 — Content Strategy Worker (Pending)

---

## Completed Work

### Step 0: Ownership Verification -- COMPLETE

- Verified ownership of DP-002, DP-005, DP-006, DP-007 against Worker Contracts, Prompt Responsibilities, and Sprint Ownership
- All four findings have correct Primary Owner and Supporting Workers
- No conflicts found. No ownership changes required.

### Step 1: Creative Director Worker -- COMPLETE (Branch A)

- All 8 assigned DP findings (DP-001 through DP-008) implemented
- Creative Director prompt hardened according to Sprint 2:
  - DP-001: Creative Package Language Policy
  - DP-002: Design Prompt = Execution Layer (replaced full section)
  - DP-003: Visible Text Rule (Text On Design = visible text only)
  - DP-004: Egyptian Healthcare Visual Identity encoding
  - DP-005: Field Responsibility Matrix (one decision per field)
  - DP-006: Campaign-Specific Prompt Rule (reduce boilerplate)
  - DP-007: Narrative Moment Requirement (mandatory human moment)
  - DP-008: Visual Text Safety Rules (16-item prohibition list)
- Added Creative Decision Ownership principle and Creative Package Confirmation gate
- Final Compliance Audit = PASS
- Worker is Production Ready
- Completion commit: `5b494fb`

### Step 2: Visual Planner Worker -- COMPLETE (Branch B)

- Visual Planner prompt updated with Stage 4 — Creative Preservation Validation
- Added Narrative Moment, Egyptian Identity, Composition Intent, Visible vs Internal, Final Artwork preservation checks
- Added Preservation Failure Rule (stop production, report failure, wait for Creative Director)
- Added Creative Preservation Confirmation to Stage 6 Generation Brief
- All 8 assigned Sprint 2 findings implemented (VP-001, VP-003, VP-006, VP-009, DP-002, DP-004, DP-005, DP-007)
- Consistency audit passed

### Step 3: Media Generation Service -- COMPLETE

- Media Generation Service prompt updated for Sprint 2
- Production Execution Brief translation methodology
- Prompt Construction Standard
- Internal Prompt Validation
- Production Safety & Execution Constraints
- Typography & Visible Text Quality Standard
- All assigned Sprint 2 findings implemented

### Step 4: Visual QA Worker -- COMPLETE (Branch B)

- Visual QA prompt updated with Step 8 — Production Validation (9-item checklist)
- Added Production Hard Gates (9 non-negotiable failure conditions)
- Added Production Failure Reporting (creative vs production distinction)
- All 13 assigned Sprint 2 findings implemented (VP-001 through VP-010, DP-003, DP-004, DP-008, DP-009)
- Prompt propagation completed across architecture documentation
- Consistency audit passed

---

## Architecture Review Conclusion

An independent post-Sprint 2 architecture review was conducted.

> **Amended 2026-07-27.** The conclusion below — that the architecture needs no
> redesign — still stands, and the pipeline-integrity work of Sprint 3 supports
> it: every defect found was in data flow or verification, none required an
> ownership or contract change.
>
> One clause of the reasoning was wrong, however. "Contracts are aligned" was
> asserted from documents rather than from execution. Several contracts described
> behaviour the code did not implement: `Reference Asset Package` had a documented
> consumer that never read it, Visual QA was contracted to validate images it was
> never given, and the Model Router in `VISUAL_PRODUCTION_ARCHITECTURE.md` §8 has
> no implementation at all.
>
> Alignment between a prompt, a contract and a schema does not establish
> alignment with the running system. Verify against code.

### Major Conclusion

**The current architecture does NOT require another redesign before production.**

The system has reached a stable contract-driven state. All worker responsibilities, ownership boundaries, and decision flows are defined and aligned across prompts, contracts, and schema.

### Guiding Principle for Future Work

> Future architectural evolution should be driven by Validation Runs, production metrics, operational experience, and real production data—not by rewriting prompts or redesigning worker responsibilities.

### Why the Architecture Stopped Changing

1. **Ownership is frozen.** Every decision has exactly one owner. No worker needs to invent missing decisions.
2. **Boundaries are defined.** The Field Responsibility Matrix, Language Policy, and Design Prompt rules eliminate duplication.
3. **Contracts are aligned.** Worker prompts, data contracts, and sheet schema share the same source of truth.
4. **The pipeline is complete.** Creative Director → Visual Planner → Media Generation → Visual QA covers the full production flow with clear stage transitions.

Any future architectural change must be justified by production evidence, not by speculative redesign.

---

## Current Architecture

### Two-Pipeline System

1. **Content Pipeline** -- Editorial: Strategy, writing, creative direction. Source of Truth.
2. **Visual Pipeline** -- Production: Planning, generation, QA, publishing.

### Pipeline Flow

```
Content Pipeline (Editorial)
Content Strategy --> Content Creation --> Creative Director Reviews & Owns
                                                  |
                                        Review Status = "Approved"
                                                  |
                                        Formula-based transfer
                                        VISUAL_STAGE = "READY"
                                                  v
Visual Pipeline (Production)
Section A: Read-Only (Auto-Populated from Content Pipeline)
        |
        v
Section B: Visual Production
  Visual Planner --> Image Generation Service --> Visual QA --> Publishing Service
```

### Key Architecture Decisions (Sprint 1)

| Decision | Summary |
|---|---|
| AD-01 | No Photorealism -- Building Honest Visual Identity |
| AD-02 | INSAN Visual Language is mandatory for all generated media |
| AD-03 | Semi-Realistic / Stylized approach (70/20/10 style ratio) |
| AD-04 | Project Assets are primary source; Visual Language is fallback |
| AD-05 | Media Generation executes, does not reinterpret |
| AD-06 | Visual QA validates against Creative Package |
| AD-07 | Creative Director is Creative Package Owner |
| AD-08 | Visual Planner owns Asset vs Generation decision |

---

## Current Worker Status

### Content Pipeline Workers

| Worker | Status | Notes |
|--------|--------|-------|
| Content Strategy Worker | Operational | Produces first drafts of strategy fields |
| Content Creation Worker | Operational | Produces first drafts of content fields |
| Creative Director | Finalized (Sprint 2) | Creative Package Owner — all 8 DP findings implemented, compliance audit PASS |

### Visual Pipeline Workers

| Worker | Status | Notes |
|--------|--------|-------|
| Visual Planner | Finalized (Sprint 2) | 7-stage workflow with Creative Preservation Validation |
| Media Generation Service | Updated (Sprint 2) | Executes Creative Package, generates assets via Gemini API |
| Visual QA | Finalized (Sprint 2) | 9-step evaluation with Production Validation & Hard Gates |
| Publishing Service | RESERVED | Not yet implemented, columns reserved |

---

## Current Production Pipeline

### Visual Stage States

| Value | Description |
|---|---|
| READY | Row transferred from Content Pipeline, ready for processing |
| PLANNING | Visual Planner is processing |
| GENERATING | Image Generation Service is producing assets |
| QA | Visual QA is validating |
| PUBLISHING | Publishing Service is publishing |
| COMPLETED | Publishing completed successfully |
| FAILED | An error occurred at any stage |

### INSAN Visual Language (CONFIG.gs)

- **Style Ratio:** 70% Stylized Realism, 20% Semi-Realistic Editorial, 10% 3D Matte
- **Prohibited:** Cartoon, Anime, Pixar, Comic-book, Hyper-realistic AI photography, Uncanny faces, Plastic skin, Obvious AI artifacts
- **Emotional Goals:** Trust, Warmth, Modernity (all three must be present)
- **Model:** Gemini 3.5 Flash (temperature 0.7, max 8192 tokens)

---

## Current Sheet Schema Status

### Content Pipeline

~42 columns across Business Context, Creative Direction, Visual Strategy, Copy, Creative Director Review, and System categories.

### Visual Pipeline

- **Section A (Read-Only):** 17 columns auto-populated from Content Pipeline via formulas
- **Section B (Visual Production):** 12 columns with single-owner access control

### Column Ownership

Every Section B column has exactly one owner. VISUAL_STAGE is owned exclusively by the orchestration layer (WorkerRunner).

---

## Current Apps Script Status

### Source Files (13 files in `src/`)

| File | Purpose |
|---|---|
| `CONFIG.gs` | Central configuration (sheet names, Drive folder IDs, AI model, Visual Language) |
| `WorkerRunner.gs` | Menu and batch execution |
| `ServiceRunner.gs` | Media Generation service |
| `ControlCenter.gs` / `ControlCenter.html` | Production Control Center UI |
| `AIProvider.gs` | AI provider abstraction (Gemini) |
| `ImageProvider.gs` | Image generation provider |
| `ContextBuilder.gs` | Context construction for workers |
| `DriveLoader.gs` | Google Drive file loading |
| `SheetSchema.gs` | Sheet schema definitions |
| `SheetWriter.gs` | Spreadsheet write operations |
| `Logger.gs` | Logging |
| `ResponseParser.gs` | AI response parsing |

### Configuration

All configuration is centralized in `CONFIG.gs`:
- Spreadsheet tab names
- Google Drive folder IDs
- AI model settings (Gemini 3.5 Flash)
- Worker configurations
- INSAN Visual Language definition
- Project Assets configuration (placeholder -- folder empty)

---

## Validation Status

### Sprint 2 Progress

- Step 0: Ownership Verification -- COMPLETE
- Step 1: Creative Director Worker -- COMPLETE (Branch A)
- Step 2: Visual Planner Worker -- COMPLETE (Branch B)
- Step 3: Media Generation Service -- COMPLETE
- Step 4: Visual QA Worker -- COMPLETE (Branch B)
- Step 5: Content Strategy Worker -- TODO
- Step 6: System Logging -- TODO

### Branch B Completion Summary

- Visual Planner Prompt finalized with Creative Preservation Validation (Stage 4)
- Visual QA Prompt finalized with Production Validation (Step 8) & Hard Gates
- All assigned Sprint 2 findings implemented
- Prompt propagation completed across architecture documentation
- Consistency audit passed (6/6 dimensions)

### What Needs Validation

- Creative Preservation Validation catches loss of narrative moment, Egyptian identity, composition intent, visible vs internal instructions, and final artwork requirements
- Production Hard Gates prevent pass of images with critical production failures
- Production Failure Reporting distinguishes creative issues from production issues
- Generation Brief preserves all creative requirements through to Media Generation

---

## Deferred Work

### Deferred to Future Sprints

- Publishing Service implementation
- Video generation
- Branding Layer (logo placement, brand color enforcement)
- Multi-language visual adaptation
- A/B testing framework for visual variants
- Performance analytics integration
- Real-time visual optimization
- Visual Planner full redesign
- Project Assets activation (folder ID placeholder exists but folder is empty)
- Advanced Visual Planner intelligence

### Technical Debt (Architecture Maturity)

These items are intentionally deferred. They represent architectural maturity, not missing functionality. None are production blockers.

#### TD-001 — Failure Architecture

Define failure handling policies:
- Retry policy
- Timeout policy
- Recovery workflow
- Failure classification (transient vs permanent)
- Production recovery strategy

#### TD-002 — System Invariants

Create a formal invariants document (e.g., `SYSTEM_INVARIANTS.md`) recording permanent rules:
- Creative Package never changes after approval.
- Section A is immutable.
- Workers never write foreign columns.
- Orchestration exclusively owns VISUAL_STAGE.
- Media Generation executes but never redesigns.
- Visual QA validates but never creates.

#### TD-003 — Architecture Decision Records

Introduce ADRs (Architecture Decision Records) for future major architectural decisions. Formalize decision capture with context, options, decision, and consequences.

#### TD-004 — Definition of Done

Define a formal Definition of Done for every Worker covering: prompt alignment, contract compliance, schema compatibility, evidence of passing output, and documentation.

#### TD-005 — End-to-End Validation Checklist

Create one production release checklist covering the complete pipeline:

Strategy → Creative → Transfer → Visual Planner → Media Generation → Visual QA → Publishing

### Reserved Hooks (Production-Ready but Not Active)

| Hook | Location | Status |
|---|---|---|
| `PROJECT_ASSETS_FOLDER_ID` | `CONFIG.gs` | Empty, ready for folder ID |
| `DOMAIN_FOLDERS` | `CONFIG.gs` | Empty, ready for domain-specific folders |
| Visual Planner asset lookup | Worker prompt | Workflow hook implemented, folder empty |
| Production Mode Selection | Worker prompt | Logic implemented, falls back to AI_GENERATED |

---

## Next Immediate Step

**Step 5: Content Strategy Worker**

Review the Content Strategy Worker against every Sprint 2 finding assigned to it before implementing prompt modifications. The Content Strategy Worker is responsible for:
- DP-001 (Part of): Follow language policy

After Content Strategy, Step 6 (System Logging) will address DP-010.

### Completed Steps

- Step 0: Ownership Verification ✅
- Step 1: Creative Director Worker ✅ (commit `5b494fb`, compliance audit PASS)
- Step 2: Visual Planner Worker ✅ (Branch B)
- Step 3: Media Generation Service ✅
- Step 4: Visual QA Worker ✅ (Branch B)

---

## Sprint 2 Reference

`docs/roadmap/SPRINT_2_VALIDATION_IMPROVEMENTS.md` is the official Sprint 2 reference. Read it first when resuming work.

---

## AI Handoff Notes

### Source of Truth

Campaign OS architecture is defined across these documents in `docs/architecture/`:

| Document | Purpose |
|---|---|
| `VISUAL_PRODUCTION_ARCHITECTURE.md` | Complete system architecture |
| `VISUAL_WORKER_CONTRACTS.md` | Data contracts for each worker and service |
| `VISUAL_SHEET_SCHEMA.md` | Column definitions for Content Pipeline and Visual Pipeline |
| `VISUAL_PIPELINE_FLOW.md` | Execution flow and stage transitions |
| `MEDIA_GENERATION_SERVICE_CONTRACT.md` | Media Generation Service contract |
| `CREATIVE_PACKAGE_CONTRACT.md` | Creative Director ownership contract |
| `INSAN_VISUAL_LANGUAGE_SPEC.md` | Canonical visual identity reference |
| `PROMPT_LAYER_INVENTORY.md` | Prompt layer inventory |

### Sprint Reference

`docs/roadmap/SPRINT_2_VALIDATION_IMPROVEMENTS.md` is the official Sprint 2 reference. Read it first when resuming work.

### Critical Rules

1. The Creative Director is the Creative Package Owner -- no worker recreates or reinterprets the Creative Package.
2. The Content Pipeline is the Source of Truth -- Visual Pipeline never writes back.
3. VISUAL_STAGE is owned by the orchestration layer -- workers report completion, never write state directly.
4. INSAN Visual Language is mandatory -- all generated media must conform to the 70/20/10 style ratio.
5. Media Generation executes, does not reinterpret -- it is a production utility, not a creative collaborator.
6. Every Section B column has exactly one owner -- no orphan columns.

### Architectural History

The system evolved through these phases:

1. **Sprint 1 — Foundation:** Prompt-based workers, INSAN Visual Language, two-pipeline architecture, worker contracts, schema alignment.
2. **Sprint 2 — Hardening:** Validation Run #001 revealed 20 findings. The system evolved from prompt-based workers into a Contract-Driven AI Operating System. Worker ownership, responsibility boundaries, and cross-worker decision flow were stabilized.
3. **Post-Sprint 2:** Architecture is considered stable. No redesign needed before production. Future evolution should be driven by production data, not speculative redesign.

### Why the Architecture Stopped Changing

The architecture reached stability because:
- Every creative decision now has exactly one owner and one field.
- Design Prompt is explicitly the execution layer of the Visual Package — not a second creative document.
- Permanent visual standards are separated from campaign-specific instructions.
- Contracts, prompts, and schema are aligned to the same source of truth.
- Visual QA has hard gates that enforce production-quality requirements.

Further redesign without production evidence would introduce risk without justification.

### Do NOT Modify Without Review

- `CONFIG.gs` production configuration section (frozen)
- Worker prompts (Visual QA, Media Generation, Visual Planner) — all were rewritten in Sprint 1
- INSAN Visual Language definition
- Pipeline architecture (Section A/B separation, transfer mechanism)
- Worker ownership assignments and responsibility boundaries (frozen in Sprint 2)

### Modified in Sprint 2

- `CREATIVE_DIRECTOR_WORKER.md` — hardened with all 8 DP findings (compliance audit PASS)

---

*This document is the primary entry point for anyone continuing development on Campaign OS. Website Platform documentation is maintained separately at `website/Docs/CURRENT_STATE.md`. Last updated: 2026-07-26.*
