# Visual Prompt Layer Inventory

INSAN Healthcare AI Operating System

Date: July 2026

Status: **Current, with caveats** — written before MediaDesigner.gs existed, so
the image path described here is now composed by a worker rather than by string
concatenation. See docs/DOCUMENT_STATUS.md.

---

## Purpose

This document inventories the Visual Production prompt layer. It reflects the finalized architecture where the Creative Director is the Source of Truth and no worker recreates creative work.

---

## Active Workers

Workers are prompt-based components that read from the spreadsheet, perform processing, and write to the spreadsheet.

| Worker | Prompt File | Status |
|---|---|---|
| Visual Planner | `prompts/visual/VISUAL_PLANNER_WORKER.md` | Active |
| Visual QA | `prompts/visual/VISUAL_QA_WORKER.md` | Active |

**Visual Planner Role:** Production Readiness worker. Validates the Creative Package for media generation. Selects production mode (PROJECT_ASSET or AI_GENERATED). Prepares generation brief with INSAN Visual Language instructions. Writes Asset Count, Production Mode, Reference Asset Package. Does NOT write VISUAL_STAGE (orchestration layer handles state transitions).

**Visual QA Role:** Validates generated media against the Creative Package and INSAN Visual Language. Checks style ratio (70/20/10), prohibited styles, production mode fidelity. Writes Visual QA Score, Visual QA Decision, Visual QA Notes, Final Asset URL. Does NOT write VISUAL_STAGE (orchestration layer handles state transitions).

---

## Active Services

Services are external capabilities invoked by workers. They do not have prompt files in the prompt layer.

| Service | Prompt File | Status |
|---|---|---|
| Media Generation Service | `prompts/visual/MEDIA_GENERATION_SERVICE.md` — **design reference only, never loaded** | Active (code-driven) |
| Publishing Service | None | **RESERVED — not implemented** |

> **On the Media Generation prompt file:** it exists and reads like a worker
> prompt, but no language model ever sees it. `ServiceRunner.gs` assembles the
> image prompt in code and calls `ImageProvider` directly. `DriveLoader.loadPrompt()`
> resolves files through `CONFIG.WORKERS[...].promptFile`, and Media Generation
> lives under `CONFIG.SERVICES`, which has no `promptFile` key.
>
> Editing that document does not change production behaviour. The constraints
> that execute live in `ServiceRunner._buildExclusions()` and
> `_buildGenerationPrompt()`. The document is retained for the reasoning behind
> those rules; keep the two in sync.

**Media Generation Service Role:** Receives the Creative Package from Section A and the production brief from the Visual Planner. Applies INSAN Visual Language guidelines. Generates visual assets respecting production mode (PROJECT_ASSET or AI_GENERATED). Writes Generated Assets, Generation Status, Generation Timestamp. Does NOT write VISUAL_STAGE (orchestration layer handles state transitions).

**Publishing Service Role:** Uploads assets and publishes to Facebook. Writes Publishing Status, Publishing Timestamp, Live Post URL. Does NOT write VISUAL_STAGE (orchestration layer handles state transitions). **RESERVED — not yet implemented.**

---

## Archived Workers

Workers that have been removed from the production system.

| Worker | Prompt File | Status |
|---|---|---|
| Visual Producer | `prompts/workers/VISUAL_PRODUCER_WORKER_ARCHIVE.md` | Archived |

**Visual Producer Role (Historical):** Was responsible for constructing technical prompts for AI image generation. Removed because the Creative Director already produces the complete Creative Package and the Media Generation Service reads directly from Section A.

---

## Content Pipeline Workers (Reference)

These workers are part of the Content Pipeline, not the Visual Pipeline. Listed for completeness.

| Worker | Prompt File | Status |
|---|---|---|
| Content Strategy | `prompts/CONTENT_STRATEGY_WORKER.md` | Active |
| Content Creation | `prompts/CONTENT_CREATION_WORKER.md` | Active |
| Creative Director | `prompts/CREATIVE_DIRECTOR_WORKER.md` | Active (V2) |

**Creative Director Role (V2):** The Creative Package Owner and Final Creative Authority. Produces the complete Creative Package: strategy refinement, content refinement, visual creative package, and design prompt. The Content Strategy Worker and Content Creation Worker produce first drafts. The Creative Director owns the final approved version of every creative field. The Creative Package transfers to Visual Pipeline Section A on approval. No Visual worker may recreate, reinterpret, redesign, or rewrite the Creative Package.

---

## Architecture Summary

```
Content Pipeline (Editorial)
├── Content Strategy Worker
├── Content Creation Worker
└── Creative Director Worker
        ↓
        ↓ (Creative Package transfers to Visual Pipeline)
        ↓
Visual Pipeline (Production)
┌─────────────────────────────────────────┐
│  Visual Planner Worker                  │
│  (Production Readiness Validation)      │
└─────────────────┬───────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│  Media Generation Service               │
│  (External — generates assets)          │
└─────────────────┬───────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│  Visual QA Worker                       │
│  (Quality Validation)                   │
└─────────────────┬───────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│  Publishing Service                     │
│  (External — publishes to Facebook)     │
└─────────────────────────────────────────┘
```

---

## Key Principles

1. **Creative Director is Source of Truth and Creative Package Owner** — The Creative Package is complete. The Creative Director owns the final approved version of every creative field. No worker recreates it.

2. **Content Strategy and Content Creation produce drafts** — Their outputs are first versions. The Creative Director owns the final approved version.

3. **Visual Planner is Production Readiness** — Validates completeness, selects production mode, prepares generation brief. Does not create.

4. **No Creative Reinterpretation** — The Creative Package flows directly from Section A to the Media Generation Service.

5. **INSAN Visual Language is mandatory** — All generated media must conform to the visual identity. Style ratio, goals, and prohibitions are enforced at generation and validation.

6. **Spreadsheet is Persistent Database** — Only write columns that store NEW production information.

---

End of Visual Prompt Layer Inventory.
