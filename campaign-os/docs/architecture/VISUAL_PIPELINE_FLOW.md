# Visual Pipeline Flow

INSAN Healthcare AI Operating System

Version: 5.0

Status: Sprint 1 — Visual Language Integration

Date: July 2026

---

## Overview

This document defines the execution flow for the Visual Pipeline. It specifies every stage, the responsible component, what each stage reads and writes, exit conditions, and the next stage.

This document is the implementation contract for Apps Script orchestration.

---

## Architecture Principle

**The Creative Director is the ONLY creative decision maker and the Creative Package Owner.**

The Creative Director produces the complete Creative Package — strategy refinement, content refinement, visual creative package, and design prompt. The Content Strategy Worker and Content Creation Worker produce first drafts. The Creative Director owns the final approved version.

No worker may recreate, reinterpret, redesign, or rewrite this creative work.

The Visual Pipeline validates, generates, and publishes. It does not create.

---

## Visual Stage Values

| Stage | Description |
|---|---|
| READY | Row transferred from Content Pipeline, ready for processing |
| PLANNING | Visual Planner is validating production readiness |
| GENERATING | Media Generation Service is producing assets |
| QA | Visual QA is validating |
| PUBLISHING | Publishing Service is publishing |
| COMPLETED | Publishing completed successfully |
| FAILED | An error occurred at any stage |

---

## Stage 0: Transfer

### Trigger

Creative Director Review Status = "Approved" in Content Pipeline.

### Responsible

Transfer Mechanism (spreadsheet formulas or automated script).

### Reads

Content Pipeline row.

### Writes

Section A columns in Visual Pipeline (17 columns).

VISUAL_STAGE = "READY"

### Exit Condition

Section A columns populated.

VISUAL_STAGE = "READY"

### Next Stage

PLANNING

---

## Stage 1: Production Readiness Validation

### Trigger

VISUAL_STAGE = "READY"

### Responsible

Visual Planner

### Role

The Visual Planner is NOT a creative worker. It is a Production Readiness worker.

Think of the Visual Planner as the final production coordinator before manufacturing, not as a designer.

### Reads

Section A columns (complete Creative Package):

- Content ID
- Content Format
- Hospital Brand
- Creative Director Design Prompt
- Visual Concept
- Visual Focus
- Visual Priority
- Design Mood
- Composition
- Visual Elements
- Do NOT Show
- Text On Design
- Design Notes

### Process

1. **Read the complete Creative Package** from Section A.
2. **Verify completeness** — Check that all information required for the requested media format exists.
3. **Verify production readiness** — Confirm the Creative Package can be executed by the Media Generation Service.
4. **Select production mode** — Check Project Assets folder for suitable reference images. If found, select PROJECT_ASSET mode. Otherwise, select AI_GENERATED mode.
5. **Prepare execution plan** — Create the Production Execution Brief for the Media Generation Service including INSAN Visual Language instructions.
6. **Add execution guidance** — If minor execution information is missing, add temporary execution-level guidance in memory only.
7. **Pass package to Media Generation Service** — Invoke the Media Generation Service with the validated Creative Package and execution plan.

### Writes

Asset Count (to Section B)

Production Mode (to Section B)

Reference Asset Package (to Section B)

**Note:** The Visual Planner reports completion. The orchestration layer transitions VISUAL_STAGE to GENERATING.

### Decisions It Can Make

- Whether the Creative Package is complete for the requested format
- Whether production readiness requirements are met
- What minor execution-level guidance is needed (if any)

### Decisions It Cannot Make

- Change creative direction
- Rewrite prompts
- Redesign the concept
- Change composition
- Invent new visual ideas

### Exit Condition

Creative Package validated.

VISUAL_STAGE = "GENERATING" (set by orchestration layer)

### Next Stage

GENERATING

---

## Stage 2: Media Generation

### Trigger

VISUAL_STAGE = "GENERATING"

### Responsible

Media Generation Service (Production Service, not a Worker)

### Reads

Section A columns (Creative Package):

- Content ID
- Content Format
- Creative Director Design Prompt
- Visual Concept
- Visual Focus
- Composition
- Visual Elements
- Do NOT Show
- Text On Design

Also reads from Section B:

- Asset Count
- Production Mode
- Reference Asset Package

### Writes

Generated Assets

Generation Status

Generation Timestamp

**Note:** The Media Generation Service reports completion. The orchestration layer transitions VISUAL_STAGE to QA (success) or FAILED (failure).

### Exit Condition

Generated Assets populated.

VISUAL_STAGE = "QA" or "FAILED" (set by orchestration layer)

### Next Stage

QA (if successful)

FAILED (if failed)

---

## Stage 3: Quality Assurance

### Trigger

VISUAL_STAGE = "QA"

### Responsible

Visual QA

### Reads

Section A columns (Creative Package):

- Content ID
- Content Format
- Hospital Brand
- Creative Director Design Prompt
- Visual Concept
- Visual Focus
- Visual Priority
- Design Mood
- Composition
- Visual Elements
- Do NOT Show
- Text On Design
- Design Notes

Section B columns:

- Generated Assets
- Production Mode
- Reference Asset Package

### Process

1. **Strategy Alignment Check** — Verify generated assets align with Creative Director's approved strategy.
2. **Visual Language Compliance** — Validate assets conform to INSAN Visual Language (70/20/10 style ratio, no prohibited styles).
3. **Brand Alignment Check** — Validate assets align with hospital brand guidelines.
4. **Technical Feasibility Check** — Ensure assets meet technical requirements.
5. **Emotional Coherence Check** — Confirm assets match intended emotional impact.
6. **Production Mode Fidelity** — Verify reference image qualities were respected (Mode A) or Visual Language guidelines followed (Mode B).
7. **Quality Standard Check** — Verify assets meet INSAN premium quality standard.
6. **Decision** — Approve, request revision, or reject with clear reasoning.

### Writes

Visual QA Score

Visual QA Decision

Visual QA Notes

If approved, Final Asset URL is populated with Generated Assets value.

**Note:** The Visual QA reports decision. The orchestration layer transitions VISUAL_STAGE based on the decision.

### Decisions It Can Make

- Approve assets for publishing
- Request revision (return to Visual Planner for re-validation)
- Reject assets (mark as FAILED)

### Decisions It Cannot Make

- Redesign visuals
- Rewrite the Creative Package
- Change the communication strategy
- Generate new creative ideas

### Exit Condition

Visual QA Decision populated.

VISUAL_STAGE = "PUBLISHING" or "PLANNING" or "FAILED" (set by orchestration layer)

### Next Stage

PUBLISHING (if approved)

PLANNING (if revision required)

FAILED (if rejected)

---

## Stage 4: Publishing

### Trigger

VISUAL_STAGE = "PUBLISHING"

### Responsible

Publishing Service (Production Service, not a Worker)

### Reads

Section A columns:

- Content ID
- Post Copy (AI)
- Campaign Name

Section B columns:

- Generated Assets

### Writes

Final Asset URL

Publishing Status

Publishing Timestamp

Live Post URL (optional)

**Note:** The Publishing Service reports completion. The orchestration layer transitions VISUAL_STAGE to COMPLETED or FAILED.

### Exit Condition

Publishing Status populated.

VISUAL_STAGE = "COMPLETED"

### Next Stage

None. Pipeline complete.

---

## Stage: Failed

### Trigger

Any stage encounters an unrecoverable error.

### Responsible

System

### Reads

Error details from failed stage.

### Writes

VISUAL_STAGE = "FAILED"

### Exit Condition

VISUAL_STAGE = "FAILED"

### Next Stage

Manual intervention required. Row can be resumed from failed stage after correction.

---

## Revision Loop

When Visual QA requires revision:

```
QA → PLANNING → GENERATING → QA → PLANNING → GENERATING → ...
```

The Visual Planner re-validates the Creative Package with QA feedback.

The Media Generation Service re-generates assets.

The loop continues until Visual QA approves or rejects.

Maximum revision attempts: Configurable (recommended: 3).

After maximum attempts: Auto-set VISUAL_STAGE = "FAILED".

---

## Complete Flow Diagram

```
Content Pipeline
      │
      │ Creative Director Approved
      ▼
┌─────────────────────────────────────┐
│ Stage 0: TRANSFER                   │
│ Reads: Content Pipeline             │
│ Writes: Section A, Stage = READY    │
│ Exit: Section A populated           │
└───────────────┬─────────────────────┘
                │
                ▼
┌─────────────────────────────────────┐
│ Stage 1: PRODUCTION READINESS       │
│ Worker: Visual Planner              │
│ Reads: Section A (Creative Package) │
│ Writes: Asset Count                 │
│ Exit: Package validated             │
│ Note: Orchestration → GENERATING    │
└───────────────┬─────────────────────┘
                │
                ▼
┌─────────────────────────────────────┐
│ Stage 2: MEDIA GENERATION           │
│ Service: Media Generation           │
│ Reads: Section A + Asset Count      │
│ Writes: Assets, Status, Timestamp   │
│ Exit: Assets populated              │
│ Note: Orchestration → QA/FAILED     │
└───────────────┬─────────────────────┘
                │
                ▼
┌─────────────────────────────────────┐
│ Stage 3: QUALITY ASSURANCE          │
│ Worker: Visual QA                   │
│ Reads: Section A + Generated Assets │
│ Writes: QA Decision, Stage = ...    │
│ Exit: Decision populated            │
└───────┬─────────┬──────────┬────────┘
        │         │          │
        ▼         ▼          ▼
   ┌─────────┐ ┌────────┐ ┌────────┐
   │Approved │ │Revision│ │Rejected│
   │Stage =  │ │Stage = │ │Stage = │
   │PUBLISH  │ │PLAN    │ │FAILED  │
   └────┬────┘ └───┬────┘ └────────┘
        │          │
        │          └──→ Back to Stage 1
        ▼
┌─────────────────────────────────────┐
│ Stage 4: PUBLISHING                 │
│ Service: Publishing                 │
│ Reads: Assets + Post Copy           │
│ Writes: Post URL, Stage = COMPLETED │
│ Exit: Publishing complete           │
└───────────────┬─────────────────────┘
                │
                ▼
            COMPLETED
```

---

## Apps Script Orchestration Rules

1. **Check VISUAL_STAGE before executing.** Only process rows with matching stage value.

2. **Workers report completion.** Workers do NOT write VISUAL_STAGE directly.

3. **Orchestration layer transitions state.** WorkerRunner performs all VISUAL_STAGE transitions based on worker results.

4. **Handle errors gracefully.** Set VISUAL_STAGE = "FAILED" on unrecoverable errors.

5. **Support resume.** Failed rows can be resumed from the failed stage.

6. **Enforce revision limits.** Maximum 3 revision cycles between QA and PLANNING.

7. **Log execution.** Record all stage transitions in Execution Log.

8. **Respect access control.** Only designated components write to their designated columns.

9. **No creative reinterpretation.** The Visual Planner validates. It does not create. The Creative Package flows directly to generation.

---

## Key Architecture Principles

1. **Creative Director is Source of Truth and Creative Package Owner** — The Creative Package is complete. The Creative Director owns the final approved version of every creative field. No worker recreates it.

2. **Content Strategy and Content Creation produce drafts** — Their outputs are first versions. The Creative Director owns the final approved version.

3. **Visual Planner is Production Readiness and Planning** — Validates completeness, selects production mode, prepares execution plan. Does not create creative work.

4. **Spreadsheet is Persistent Database** — Only write columns that store NEW production information. Temporary data stays in memory.

5. **Media Generation reads from Section A** — The Creative Package flows directly to generation. No intermediate creative reinterpretation.

6. **Visual QA validates against Creative Director** — The Creative Package is the standard, not any intermediate interpretation.

7. **INSAN Visual Language is mandatory** — All generated media must conform to the visual identity. Style ratio, goals, and prohibitions are enforced at generation and validation.

8. **Orchestration Layer owns state transitions** — Single authoritative state machine. Workers report completion.

---

End of Visual Pipeline Flow.
