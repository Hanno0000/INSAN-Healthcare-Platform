# Media Generation Service Contract

INSAN Healthcare AI Operating System

Version: 1.2

Status: VISUAL_STAGE write removed — orchestration layer owns all state transitions

Date: July 2026

---

## Service Purpose

The Media Generation Service is a Production Service that executes the Creative Package and generates visual assets. It receives inputs from the Visual Planner and Section A, generates media assets, and returns them with metadata for Quality Assurance.

The Media Generation Service does not make creative decisions. It executes visual plans and returns generated assets.

---

## Pipeline Position

Stage 2 of the Visual Pipeline.

```
Stage 1: Production Readiness Validation (Visual Planner)
         ↓
Stage 2: Media Generation (Media Generation Service)
         ↓
Stage 3: Quality Assurance (Visual QA)
```

---

## Upstream Dependency

Visual Planner (Stage 1)

The Media Generation Service receives a validated Creative Package from the Visual Planner's internal runtime payload. This payload contains the Creative Package from Section A and any minor execution-level guidance added by the Visual Planner.

---

## Downstream Dependency

Visual QA (Stage 3)

The Media Generation Service passes generated assets to Visual QA for quality validation.

---

## Reads From

### Section A (Creative Package)

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

### Visual Planner Runtime Payload

Execution-level guidance from Visual Planner's internal runtime payload (if any).

---

## Writes To

### Section B Columns

| Column | Purpose |
|---|---|
| Generated Assets | One or multiple generated files |
| Generation Status | Success/failure status |
| Generation Timestamp | When assets were generated |

---

## Runtime Responsibilities

- Generate visual assets from the Creative Package
- Support one or multiple assets depending on content format
- Return assets with metadata
- Use Model Router to determine which model to use based on Content Format

---

## Decisions It Can Make

- Which model to use (via Model Router based on Content Format)
- Execute the approved Creative Package using the selected generation model.

---

## Decisions It Cannot Make

- Rewrite the Creative Package
- Change the creative direction
- Evaluate quality (Visual QA responsibility)
- Publish assets (Publishing Service responsibility)

---

## Inputs

Reads the complete Creative Package directly from Section A:

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

Also reads execution-level guidance from Visual Planner's internal runtime payload.

---

## Outputs

Provides NEW information not in Section A:

| Output | Purpose |
|---|---|
| Generated Assets | One or multiple generated files |
| Generation Status | Success/failure status |
| Generation Timestamp | When assets were generated |

---

## Asset Format Rules

| Content Format | Assets |
|---|---|
| Static | One image |
| Carousel | Multiple images (one per slide) |
| Video | One video file |
| Reel | One video file |
| Story | One image or video |
| Motion Graphic | One video file |
| Infographic | One image |

---

## Stage Transitions

```
GENERATING → QA (success)
GENERATING → FAILED (failure)
```

---

## Failure Conditions

ARCHITECTURE DECISION REQUIRED

The architecture documents do not specify:
- Exact error conditions that trigger FAILED state
- Timeout handling
- Retry mechanisms
- Error logging requirements

---

## Success Conditions

Generated Assets populated.

VISUAL_STAGE = "QA" (set by orchestration layer)

---

## Access Control

Media Generation Service writes ONLY to:

- Generated Assets
- Generation Status
- Generation Timestamp

Does NOT write VISUAL_STAGE (orchestration layer handles state transitions).

No other columns may be modified.

---

End of Media Generation Service Contract.