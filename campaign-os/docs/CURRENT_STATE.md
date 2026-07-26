# Campaign OS -- Current State

> **Version:** 1.2
> **Date:** 2026-07-26
> **Status:** Sprint 1 -- In Progress (Production Validation Run)
> **Canonical Handoff Document** -- Primary entry point for Campaign OS development.
> **Scope:** Campaign OS only. For Website Platform, see `website/Docs/CURRENT_STATE.md`.

---

## Executive Summary

| Dimension | Status |
|-----------|--------|
| **Project Phase** | Sprint 1 -- Visual Production Quality & Workflow Hardening |
| **Documentation** | Complete (architecture, contracts, prompts, roadmap) |
| **Apps Script Code** | Implemented (12 source files in `src/`) |
| **Workers** | 4 workers rewritten (Creative Director, Visual QA, Media Generation, Visual Planner) |
| **Production Pipeline** | Operational (Content Pipeline + Visual Pipeline) |
| **Current Sprint** | Production Validation Run (Step 5) |
| **Visual Language** | Implemented (INSAN Visual Language spec, CONFIG.gs) |

**Overall:** Campaign OS is a Google Apps Script AI Operating System that transforms strategic content into publishable social media assets using AI Workers. Sprint 1 is focused on improving production quality. Steps 1-4 (Creative Direction, Media Generation, Visual QA, Visual Planner Completion Pass) are complete. The system is ready for the Production Validation Run to execute the full pipeline and provide evidence of improvement.

---

## Current Project Phase

**Sprint 1 -- Visual Production Quality & Workflow Hardening**

The single goal of this sprint:

> "Improve the quality of the first Production Run so that generated designs become publication-ready."

Every implementation decision must answer: **"Will this improve the quality of the next production run?"**

---

## Sprint 1 Objective

Sprint 1 was created after the first Production Run was technically successful but the output did not meet the creative standard. The infrastructure was stable, the pipeline worked, the workers executed -- but the images were not publication-ready.

The sprint addresses four root causes:
- **P1:** Obvious AI Appearance (plastic skin, uncanny faces, photorealism attempts)
- **P2:** Unwanted Branding Generation (logos, "INSAN" text, watermarks on images)
- **P3:** Weak Prompt Philosophy (no coherent visual identity, no style guidelines)
- **P4:** Visual QA Approving Unacceptable Images (no Visual Language compliance checks)

---

## Current Sprint Status

| Step | Area | Status |
|---|---|---|
| Step 1 | Creative Direction | COMPLETE |
| Step 2 | Media Generation | COMPLETE |
| Step 3 | Visual QA | COMPLETE |
| Step 4 | Visual Planner Completion Pass | COMPLETE |
| Step 5 | Production Validation Run | CURRENT |
| Step 6 | Post-Run Review | Pending |

---

## Completed Work

### Step 1: Creative Direction -- COMPLETE

- INSAN Visual Language specification created (`INSAN_VISUAL_LANGUAGE_SPEC.md`)
- Creative Director rewritten as Creative Package Owner (`CREATIVE_DIRECTOR_WORKER.md` V2)
- Design Governance, Branding Rules, Visual Language integrated
- All architecture documents updated and propagated

### Step 2: Media Generation -- COMPLETE

- Media Generation Service prompt rewritten (`MEDIA_GENERATION_SERVICE.md` V3, 1034 lines)
- AI Coaching philosophy implemented
- Visual Language compliance, branding protection, generation improvements

### Step 3: Visual QA -- COMPLETE

- Visual QA Worker rewritten (`VISUAL_QA_WORKER.md` V2, 590 lines)
- AI Coaching philosophy, Hard Gates, Branding validation, Quality validation

### Step 4: Visual Planner Completion Pass -- COMPLETE

- Visual Planner prompt updated (`VISUAL_PLANNER_WORKER.md`, 685 lines)
- Added Revision Loop Handling (was missing -- blocking issue)
- Added format-specific completeness checklist in Stage 1
- Completed Input list (Content Format, Visual Format, Visual Angle)
- Clarified VISUAL_STAGE ownership (WorkerRunner, not Planner)
- Added Mode B fallback note when PROJECT_ASSETS_FOLDER_ID is empty

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
| Creative Director | Rewritten (V2) | Creative Package Owner -- owns final approved version of every creative field |

### Visual Pipeline Workers

| Worker | Status | Notes |
|--------|--------|-------|
| Visual Planner | Completion Pass Complete | Production-readiness review with revision loop handling |
| Media Generation Service | Rewritten (V3) | Executes Creative Package, generates assets via Gemini API |
| Visual QA | Rewritten (V2) | Validates against Creative Package, enforces Visual Language |
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

### Sprint 1 Progress

- Steps 1-4: All core workers rewritten and reviewed
- Step 5: Production Validation Run -- ready to execute
- Step 6: Post-Run Review -- pending (after validation run)
- No validation run has been executed yet after the Sprint 1 rewrites

### What Needs Validation

- Generated images clearly avoid AI appearance
- Generated images follow INSAN Visual Language (style ratio, prohibited styles)
- Generated images communicate Trust, Warmth, and Modernity simultaneously
- No unwanted logos, text, or watermarks
- Creative Director produces production-ready Design Prompts
- Visual QA catches Visual Language violations
- Visual Planner correctly selects production mode and handles revision loop
- Media Generation executes without reinterpretation
- Revision loop functions correctly

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

### Reserved Hooks (Production-Ready but Not Active)

| Hook | Location | Status |
|---|---|---|
| `PROJECT_ASSETS_FOLDER_ID` | `CONFIG.gs` | Empty, ready for folder ID |
| `DOMAIN_FOLDERS` | `CONFIG.gs` | Empty, ready for domain-specific folders |
| Visual Planner asset lookup | Worker prompt | Workflow hook implemented, folder empty |
| Production Mode Selection | Worker prompt | Logic implemented, falls back to AI_GENERATED |

---

## Next Immediate Step

**Step 5: Production Validation Run**

Execute the full pipeline with test content and provide evidence of improvement. This run will validate:
- Generated images clearly avoid AI appearance
- Generated images follow INSAN Visual Language (style ratio, prohibited styles)
- Generated images communicate Trust, Warmth, and Modernity simultaneously
- No unwanted logos, text, or watermarks
- Creative Director produces production-ready Design Prompts
- Visual QA catches Visual Language violations
- Visual Planner correctly selects production mode and handles revision loop
- Media Generation executes without reinterpretation
- Revision loop functions correctly

After the validation run, Step 6 (Post-Run Review) will analyze results and inform future work.

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

`docs/roadmap/SPRINT_1_ROADMAP.md` is the official Sprint 1 reference. Read it first when resuming work.

### Critical Rules

1. The Creative Director is the Creative Package Owner -- no worker recreates or reinterprets the Creative Package.
2. The Content Pipeline is the Source of Truth -- Visual Pipeline never writes back.
3. VISUAL_STAGE is owned by the orchestration layer -- workers report completion, never write state directly.
4. INSAN Visual Language is mandatory -- all generated media must conform to the 70/20/10 style ratio.
5. Media Generation executes, does not reinterpret -- it is a production utility, not a creative collaborator.
6. Every Section B column has exactly one owner -- no orphan columns.

### Do NOT Modify Without Review

- `CONFIG.gs` production configuration section (frozen)
- Worker prompts (Creative Director, Visual QA, Media Generation, Visual Planner) -- all were rewritten in Sprint 1
- INSAN Visual Language definition
- Pipeline architecture (Section A/B separation, transfer mechanism)

---

*This document is the primary entry point for anyone continuing development on Campaign OS. Website Platform documentation is maintained separately at `website/Docs/CURRENT_STATE.md`. Last updated: 2026-07-26.*
