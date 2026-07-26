# Visual Worker Contracts

INSAN Healthcare AI Operating System

Version: 9.0

Status: Sprint 1 — Visual Language Integration

Date: July 2026

---

## Overview

This document defines the data contracts for each component in the Visual Production pipeline.

**The Creative Director is the ONLY creative decision maker and the Creative Package Owner.** The Creative Director produces the complete Creative Package — strategy refinement, content refinement, visual creative package, and design prompt. No worker may recreate, reinterpret, redesign, or rewrite this creative work.

The Content Strategy Worker and Content Creation Worker produce first drafts. The Creative Director owns the final approved version of every creative field.

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

## Content Pipeline — Creative Package Production

### Content Strategy Worker

**Role:** Proposes the first version of strategy and visual direction fields.

**Outputs (first draft):** Content Objective, Content Angle, Content Type, Content Format, Content Funnel Stage, Hook, Post Structure, Language Style, Emoji Style, Visual Concept, Visual Focus, Visual Priority, Design Mood, Composition, Visual Elements, Do NOT Show, Text On Design, Design Notes.

**Authority:** Proposes. Does not own the final version.

### Content Creation Worker

**Role:** Produces the first draft of content fields.

**Outputs (first draft):** Post Copy (AI), Primary Hashtags, Secondary Hashtags, Design Prompt (AI).

**Authority:** Proposes. Does not own the final version.

### Creative Director Worker

**Role:** The Final Creative Authority and the Creative Package Owner.

**Authority:** Owns the final approved version of every creative field.

**Outputs (final):** All strategy refinement fields, all visual creative package fields, Creative Director Post Copy, Primary Hashtags, Secondary Hashtags, Creative Director Design Prompt, Creative Director Quality Score, Creative Director Review Status, Creative Director Notes.

---

## Transfer Contract

### Content Pipeline → Visual Pipeline (Section A)

**Trigger:** Creative Director Review Status = "Approved"

**Mechanism:** Spreadsheet formulas or automated transfer

**Transfer Fields (17 columns, Read-Only in Visual Pipeline):**

The Creative Director produces the complete Creative Package. The Content Strategy Worker and Content Creation Worker produce first drafts. The Creative Director owns the final approved version of every field.

| Field | Source (Draft) | Final Owner |
|---|---|---|
| Content ID | System | System |
| Calendar ID | System | System |
| Campaign Name | Campaign Strategy | Campaign Strategy |
| Hospital Brand | Campaign Strategy | Campaign Strategy |
| Content Type | Content Strategy Worker | **Creative Director** |
| Content Format | Content Strategy Worker | **Creative Director** |
| Post Copy (AI) | Content Creation Worker | **Creative Director** |
| Creative Director Design Prompt | Content Creation Worker (draft) | **Creative Director** |
| Visual Concept | Content Strategy Worker | **Creative Director** |
| Visual Focus | Content Strategy Worker | **Creative Director** |
| Visual Priority | Content Strategy Worker | **Creative Director** |
| Design Mood | Content Strategy Worker | **Creative Director** |
| Composition | Content Strategy Worker | **Creative Director** |
| Visual Elements | Content Strategy Worker | **Creative Director** |
| Do NOT Show | Content Strategy Worker | **Creative Director** |
| Text On Design | Content Strategy Worker | **Creative Director** |
| Design Notes | Content Strategy Worker | **Creative Director** |

**Writes:** VISUAL_STAGE = "READY"

---

## 1. Visual Planner

### Mission

Validate and prepare the Creative Package for media generation.

### Role

The Visual Planner is NOT a creative worker. It is a Production Readiness and Planning Specialist.

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
- Prepare the execution plan for the Media Generation Service
- Apply INSAN Visual Language guidelines to the execution plan
- Write Asset Count, Production Mode, and Reference Asset Package

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

| Column | Final Owner | Draft Source | Multi-Writer |
|---|---|---|---|
| Content ID | READ-ONLY | System | No |
| Calendar ID | READ-ONLY | System | No |
| Campaign Name | READ-ONLY | Campaign Strategy | No |
| Hospital Brand | READ-ONLY | Campaign Strategy | No |
| Content Type | **Creative Director** | Content Strategy Worker | No |
| Content Format | **Creative Director** | Content Strategy Worker | No |
| Post Copy (AI) | **Creative Director** | Content Creation Worker | No |
| Creative Director Design Prompt | **Creative Director** | Content Creation Worker (draft) | No |
| Visual Concept | **Creative Director** | Content Strategy Worker | No |
| Visual Focus | **Creative Director** | Content Strategy Worker | No |
| Visual Priority | **Creative Director** | Content Strategy Worker | No |
| Design Mood | **Creative Director** | Content Strategy Worker | No |
| Composition | **Creative Director** | Content Strategy Worker | No |
| Visual Elements | **Creative Director** | Content Strategy Worker | No |
| Do NOT Show | **Creative Director** | Content Strategy Worker | No |
| Text On Design | **Creative Director** | Content Strategy Worker | No |
| Design Notes | **Creative Director** | Content Strategy Worker | No |
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

1. **Creative Director is Source of Truth and Creative Package Owner** — The Creative Package is complete. The Creative Director owns the final approved version of every creative field. No worker recreates it.

2. **Content Strategy and Content Creation produce drafts** — Their outputs are first versions. The Creative Director owns the final approved version.

3. **Visual Planner is Production Readiness and Planning** — Validates completeness, selects production mode, prepares execution plan. Does not create creative work.

4. **Spreadsheet is Persistent Database** — Only write columns that store NEW production information. Temporary data stays in memory.

5. **Media Generation reads from Section A** — The Creative Package flows directly to generation. No intermediate creative reinterpretation.

6. **Visual QA validates against Creative Director** — The Creative Package is the standard, not any intermediate interpretation.

7. **INSAN Visual Language is mandatory** — All generated media must conform to the visual identity. Style ratio, goals, and prohibitions are enforced at generation and validation.

8. **Every column has exactly one owner** — No orphan columns. No undefined ownership.

9. **Orchestration Layer owns state transitions** — Workers report completion. The orchestration layer (WorkerRunner) performs all VISUAL_STAGE transitions. Single authoritative state machine.

10. **AI Worker column is per-pipeline** — Content workers write to Content Pipeline's AI Worker column. Visual workers write to Visual Pipeline's AI Worker column. They never cross boundaries.

---

End of Visual Worker Contracts.
