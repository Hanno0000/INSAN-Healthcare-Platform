# Visual Worker Contracts

INSAN Healthcare AI Operating System

Version: 9.0

Status: Sprint 1 — Visual Language Integration

Date: July 2026

---

## Overview

This document defines the data contracts for each component in the Visual Production pipeline.

**The Creative Director is the ONLY creative decision maker.** The Creative Director produces the complete Creative Package. No worker may recreate, reinterpret, redesign, or rewrite this creative work.

**Workers** read from Section A and write to Section B of the Visual Pipeline.

**Services** receive inputs and return outputs. They write only to Section B.

The Content Pipeline is the Source of Truth. Only approved rows transfer to the Visual Pipeline.

---

## Visual Stage Column

The VISUAL_STAGE column tracks the master production state.

**Ownership:** The orchestration layer (WorkerRunner / Master Orchestrator) owns all state transitions. Workers report completion status. The orchestration layer performs all state transitions.

| Value | Description |
|---|---|
| READY | Row transferred from Content Pipeline, ready for processing |
| PLANNING | Visual Planner is validating production readiness |
| GENERATING | Media Generation Service is producing assets |
| QA | Visual QA is validating |
| PUBLISHING | Publishing Service is publishing |
| COMPLETED | Publishing completed successfully |
| FAILED | An error occurred at any stage |

---

## Transfer Contract

### Content Pipeline → Visual Pipeline (Section A)

**Trigger:** Creative Director Review Status = "Approved"

**Mechanism:** Spreadsheet formulas or automated transfer

**Transfer Fields (17 columns, Read-Only in Visual Pipeline):**

The Creative Director produces the complete Creative Package:

| Field | Purpose |
|---|---|
| Content ID | Row identifier |
| Calendar ID | Calendar event identifier |
| Campaign Name | Campaign identifier |
| Hospital Brand | Brand identifier |
| Content Type | Content classification |
| Content Format | Format constraints |
| Post Copy (AI) | Approved post copy |
| Creative Director Design Prompt | Approved design prompt |
| Visual Concept | Strategic visual concept |
| Visual Focus | Primary visual subject |
| Visual Priority | Visual priority order |
| Design Mood | Emotional mood |
| Composition | Compositional approach |
| Visual Elements | Visual elements to include |
| Do NOT Show | Elements to exclude |
| Text On Design | Text on visual |
| Design Notes | Additional notes |

**Writes:** VISUAL_STAGE = "READY"

---

## 1. Visual Planner

### Mission

Validate and prepare the Creative Package for media generation.

### Role

The Visual Planner is NOT a creative worker. It is a Production Readiness worker.

Think of the Visual Planner as the final production coordinator before manufacturing, not as a designer.

### Inputs

Reads the complete Creative Package from Section A:

| Column | Required |
|---|---|
| Content ID | Yes |
| Content Format | Yes |
| Hospital Brand | Yes |
| Creative Director Design Prompt | Yes |
| Visual Concept | Yes |
| Visual Focus | Yes |
| Visual Priority | Yes |
| Design Mood | Yes |
| Composition | Yes |
| Visual Elements | No |
| Do NOT Show | No |
| Text On Design | No |
| Design Notes | No |
| Visual QA Decision | No (for revision loop) |
| Visual QA Notes | No (for revision loop) |

### Responsibilities

- Read the complete Creative Package from Section A
- Verify that all information required for the requested media format exists
- Verify production readiness
- Select production mode (PROJECT_ASSET or AI_GENERATED)
- Check Project Assets folder for suitable reference images
- Prepare generation brief for the Media Generation Service
- Apply INSAN Visual Language guidelines to the generation brief
- Update VISUAL_STAGE, Asset Count, Production Mode, and Reference Asset Package

### Decisions It Can Make

- Whether the Creative Package is complete for the requested format
- Whether production readiness requirements are met
- What minor execution-level guidance is needed (if any)
- Production mode selection (PROJECT_ASSET or AI_GENERATED)

### Decisions It Cannot Make

- Change creative direction
- Rewrite prompts
- Redesign the concept
- Change composition
- Invent new visual ideas
- Add new visual elements
- Modify the emotional direction

### Outputs

Provides NEW information not in Section A:

| Output | Purpose |
|---|---|
| Asset Count | Number of media assets to generate |
| Production Mode | PROJECT_ASSET or AI_GENERATED |
| Reference Asset Package | Structured brief for Media Generation Service |

### Columns Written

| Column | Owner |
|---|---|
| Asset Count | Visual Planner |
| Production Mode | Visual Planner |
| Reference Asset Package | Visual Planner |

### Stage Transitions

The Visual Planner reports completion. The orchestration layer transitions:
```
READY/PLANNING → GENERATING (on success)
```

---

## 2. Media Generation Service

### Mission

Execute the Creative Package and generate requested media assets.

### Inputs

Reads from Section A:

| Column | Required |
|---|---|
| Content ID | Yes |
| Content Format | Yes |
| Creative Director Design Prompt | Yes |
| Visual Concept | Yes |
| Visual Focus | Yes |
| Composition | Yes |
| Visual Elements | No |
| Do NOT Show | No |
| Text On Design | No |

Reads from Section B:

| Column | Required |
|---|---|
| Asset Count | Yes |
| Production Mode | Yes |
| Reference Asset Package | Yes |

### Responsibilities

- Generate visual assets from the Creative Package
- Apply INSAN Visual Language guidelines to all generated media
- Support one or multiple assets depending on format
- Handle Mode A (PROJECT_ASSET) and Mode B (AI_GENERATED) appropriately
- Return assets with metadata

### Decisions It Can Make

- Which model to use (via Media Router)
- How to interpret the Creative Package for generation
- How to apply Visual Language guidelines

### Decisions It Cannot Make

- Rewrite the Creative Package
- Change the creative direction
- Evaluate quality (Visual QA responsibility)
- Publish assets (Publishing Service responsibility)

### Outputs

Provides NEW information not in Section A or B:

| Output | Purpose |
|---|---|
| Generated Assets | One or multiple generated files |
| Generation Status | Success/failure status |
| Generation Timestamp | When assets were generated |

### Columns Written

| Column | Owner |
|---|---|
| Generated Assets | Media Generation Service |
| Generation Status | Media Generation Service |
| Generation Timestamp | Media Generation Service |

### Asset Format Rules

| Content Format | Assets |
|---|---|
| Static | One image |
| Carousel | Multiple images (one per slide) |
| Video | One video file |
| Reel | One video file |
| Story | One image or video |
| Motion Graphic | One video file |
| Infographic | One image |

### Stage Transitions

The Media Generation Service reports completion. The orchestration layer transitions:
```
GENERATING → QA (on success)
GENERATING → FAILED (on failure)
```

---

## 3. Visual QA

### Mission

Validate that generated assets faithfully represent the Creative Director's approved creative vision.

### Inputs

Reads from Section A (Creative Director's complete Creative Package):

| Column | Required |
|---|---|
| Content ID | Yes |
| Content Format | Yes |
| Hospital Brand | Yes |
| Creative Director Design Prompt | Yes |
| Visual Concept | Yes |
| Visual Focus | Yes |
| Visual Priority | No |
| Design Mood | Yes |
| Composition | Yes |
| Visual Elements | No |
| Do NOT Show | No |
| Text On Design | No |
| Design Notes | No |

Reads from Section B:

| Column | Required |
|---|---|
| Generated Assets | Yes |
| Production Mode | Yes |
| Reference Asset Package | Yes |

### Responsibilities

- Validate alignment with Creative Director's approved strategy
- Validate compliance with INSAN Visual Language
- Check style ratio (70/20/10)
- Check for prohibited styles
- Check brand consistency
- Check healthcare credibility
- Assess technical feasibility
- Confirm emotional coherence
- Verify production mode fidelity

### Decisions It Can Make

- Approve assets for publishing
- Request revision (return to Visual Planner for re-validation)
- Reject assets (mark as FAILED)

### Decisions It Cannot Make

- Redesign visuals
- Rewrite the Creative Package
- Change the communication strategy
- Generate new creative ideas
- Generate images

### Outputs

Provides NEW information not in Section A or B:

| Output | Purpose |
|---|---|
| Visual QA Score | Quality score |
| Visual QA Decision | Approved / Needs Revision / Rejected |
| Visual QA Notes | Feedback notes |
| Final Asset URL | URL of approved assets (on approval only) |

### Columns Written

| Column | Owner |
|---|---|
| Visual QA Score | Visual QA |
| Visual QA Decision | Visual QA |
| Visual QA Notes | Visual QA |
| Final Asset URL | Visual QA (on approval only) |

### Stage Transitions

The Visual QA reports decision. The orchestration layer transitions:
```
QA → PUBLISHING (on Approved)
QA → PLANNING (on Revision Required)
QA → FAILED (on Rejected)
```

---

## 4. Publishing Service (RESERVED)

### Mission

Upload assets and publish to Facebook.

**Status:** Not yet implemented. Columns reserved.

### Inputs

Reads from Section A:

| Column | Required |
|---|---|
| Content ID | Yes |
| Post Copy (AI) | Yes |
| Campaign Name | Yes |

Reads from Section B:

| Column | Required |
|---|---|
| Final Asset URL | Yes |

### Responsibilities

- Upload assets to Google Drive
- Publish to Facebook
- Return post URL

### Decisions It Can Make

- When to publish (after QA approval)

### Decisions It Cannot Make

- Creative decisions
- Modify assets
- Change post copy

### Outputs

Provides NEW information not in Section A or B:

| Output | Purpose |
|---|---|
| Publishing Status | Success/failure status |
| Publishing Timestamp | When published |
| Live Post URL | URL of published Facebook post |

### Columns Written

| Column | Owner |
|---|---|
| Publishing Status | Publishing Service |
| Publishing Timestamp | Publishing Service |
| Live Post URL | Publishing Service |

### Stage Transitions

The Publishing Service reports completion. The orchestration layer transitions:
```
PUBLISHING → COMPLETED (on success)
PUBLISHING → FAILED (on failure)
```

---

## Access Control Summary

| Component | Reads From | Writes To |
|---|---|---|
| Transfer Mechanism | Content Pipeline | Section A (17 columns), VISUAL_STAGE |
| Visual Planner | Section A + QA feedback + Project Assets | Asset Count, Production Mode, Reference Asset Package |
| Media Generation Service | Section A + Asset Count + Production Mode + Reference Asset Package | Generated Assets, Generation Status, Generation Timestamp |
| Visual QA | Section A + Generated Assets + Production Mode + Reference Asset Package | Visual QA Score, Visual QA Decision, Visual QA Notes, Final Asset URL |
| Publishing Service (RESERVED) | Section A + Final Asset URL | Publishing Status, Publishing Timestamp, Live Post URL |
| **Orchestration Layer** | Worker results | **VISUAL_STAGE** (all transitions) |

---

## Column Ownership Matrix

| Column | Owner | Multi-Writer |
|---|---|---|
| Content ID | READ-ONLY | No |
| Calendar ID | READ-ONLY | No |
| Campaign Name | READ-ONLY | No |
| Hospital Brand | READ-ONLY | No |
| Content Type | READ-ONLY | No |
| Content Format | READ-ONLY | No |
| Post Copy (AI) | READ-ONLY | No |
| Creative Director Design Prompt | READ-ONLY | No |
| Visual Concept | READ-ONLY | No |
| Visual Focus | READ-ONLY | No |
| Visual Priority | READ-ONLY | No |
| Design Mood | READ-ONLY | No |
| Composition | READ-ONLY | No |
| Visual Elements | READ-ONLY | No |
| Do NOT Show | READ-ONLY | No |
| Text On Design | READ-ONLY | No |
| Design Notes | READ-ONLY | No |
| VISUAL_STAGE | Orchestration Layer | No — single writer |
| Asset Count | Visual Planner | No |
| Production Mode | Visual Planner | No |
| Reference Asset Package | Visual Planner | No |
| Generated Assets | Media Generation Service | No |
| Generation Status | Media Generation Service | No |
| Generation Timestamp | Media Generation Service | No |
| Visual QA Score | Visual QA | No |
| Visual QA Decision | Visual QA | No |
| Visual QA Notes | Visual QA | No |
| Final Asset URL | Visual QA | No |
| Publishing Status | Publishing Service (RESERVED) | No |
| Publishing Timestamp | Publishing Service (RESERVED) | No |
| Live Post URL | Publishing Service (RESERVED) | No |
| AI Worker | Every Visual Worker | Yes — last writer wins |

---

## Key Architecture Principles

1. **Creative Director is Source of Truth** — The Creative Package is complete. No worker recreates it.

2. **Visual Planner is Production Readiness** — Validates completeness, selects production mode, prepares generation brief. Does not create.

3. **Spreadsheet is Persistent Database** — Only write columns that store NEW production information. Temporary data stays in memory.

4. **Media Generation reads from Section A** — The Creative Package flows directly to generation. No intermediate creative reinterpretation.

5. **Visual QA validates against Creative Director** — The Creative Package is the standard, not any intermediate interpretation.

6. **INSAN Visual Language is mandatory** — All generated media must conform to the visual identity. Style ratio, goals, and prohibitions are enforced at generation and validation.

7. **Every column has exactly one owner** — No orphan columns. No undefined ownership.

8. **Orchestration Layer owns state transitions** — Workers report completion. The orchestration layer (WorkerRunner) performs all VISUAL_STAGE transitions. Single authoritative state machine.

9. **AI Worker column is per-pipeline** — Content workers write to Content Pipeline's AI Worker column. Visual workers write to Visual Pipeline's AI Worker column. They never cross boundaries.

---

End of Visual Worker Contracts.
