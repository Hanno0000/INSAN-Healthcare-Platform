# Visual Production Architecture

INSAN Healthcare AI Operating System

Version: 9.0

Status: Sprint 1 — Visual Language Integration

Date: July 2026

---

## 1. Purpose

This document defines the complete Visual Production system architecture for the INSAN Healthcare AI Operating System.

The Visual Production system transforms strategic content into visual assets. It takes the output of the Content Strategy and Creative Director workers, plans format-specific visual storytelling, generates assets, validates quality, and publishes content.

---

## 2. Architecture Principles

### AP-001: Separation of Pipelines

The Content Pipeline is the Editorial Pipeline. The Visual Pipeline is the Production Pipeline. They are separate spreadsheet tabs with distinct responsibilities.

**Content Pipeline** — Strategy, writing, creative direction. Source of Truth.

**Visual Pipeline** — Visual planning, QA, generation, publishing. Working area.

### AP-002: Content Pipeline is Source of Truth

Only approved rows transfer from the Content Pipeline to the Visual Pipeline. The transfer happens after Creative Director approval. The Creative Director owns the final approved version of every creative field.

### AP-003: Visual Pipeline Section Separation

The Visual Pipeline is divided into two sections.

**Section A: Read-Only** — Auto-populated from Content Pipeline via formulas or automated transfer. No Visual worker may modify these columns.

**Section B: Visual Production** — Only the Designer Team may write to these columns.

### AP-004: Minimum Columns

The Visual Pipeline contains only the minimum columns required for production. No unnecessary columns. No duplicated fields.

### AP-005: Model Abstraction

Workers must never know model names. Workers only know formats. The Model Router maps formats to AI models.

### AP-006: Image Generation is a Service

Image Generation is not a Worker. It is a Production Service that receives Visual Planner output and returns generated assets.

### AP-007: Master Production State

VISUAL_STAGE tracks the master production state for every row. The orchestration layer (WorkerRunner) owns all state transitions. Workers report completion status.

### AP-008: Separation of Planning and Evaluation

The Visual Planner is responsible only for planning. Visual QA is the only component responsible for evaluation, compliance, and approval.

### AP-009: Format-Agnostic Asset Output

The system supports one or multiple generated assets depending on the content format. The architecture remains format-agnostic.

### AP-010: Data Contracts

Every worker has a defined data contract specifying exact input and output columns. See VISUAL_WORKER_CONTRACTS.md.

### AP-011: Execution Flow

The execution flow is defined in VISUAL_PIPELINE_FLOW.md. This document is the implementation contract for Apps Script orchestration.

### AP-012: Creative Director is Creative Package Owner

The Creative Director is the Final Creative Authority and the Creative Package Owner. The Content Strategy Worker and Content Creation Worker produce first drafts. The Creative Director owns the final approved version of every creative field — strategy refinement, content refinement, visual creative package, and design prompt. This output transfers to Visual Pipeline Section A and serves as the foundation for all visual production work. The Visual Pipeline does not recreate or rewrite creative direction — it builds upon it.

### AP-013: Visual Planner Output is Production Input

The Visual Planner's format-specific visual plan becomes the direct input to the Image Generation Service. There is no intermediate worker between planning and generation.

### AP-014: INSAN Visual Language is Mandatory

All generated media must conform to the INSAN Visual Language. The visual identity follows a 70/20/10 style ratio (Stylized Realism, Semi-Realistic Editorial Illustration, 3D Matte). Strictly prohibited styles include cartoon, anime, Pixar, comic-book, hyper-realistic AI photography, uncanny faces, plastic skin, and obvious AI artifacts. The Visual Language is enforced at both generation and validation stages.

### AP-015: Production Mode Selection

The Visual Planner selects the production mode (PROJECT_ASSET or AI_GENERATED) based on available project reference images. Mode A (PROJECT_ASSET) is preferred when suitable reference images exist. Mode B (AI_GENERATED) is the fallback. The selected mode is communicated to the Media Generation Service through the Reference Asset Package.

> **Implementation status:** Mode A cannot currently be selected.
> `CONFIG.PROJECT_ASSETS.FOLDER_ID` is an empty string and the folder holds no
> images, so every row resolves to Mode B (AI_GENERATED). The Visual Planner
> workflow hook exists and will work once the folder is populated, but until
> then this is a single-path system, not a two-mode one.
>
> This matters for interpretation: 100% of generated media is currently
> AI-generated with no real photographic reference, which is a known contributor
> to generic output.

### AP-016: Creative Package Owner

The Creative Director is the Creative Package Owner. The Content Strategy Worker and Content Creation Worker produce first drafts. The Creative Director owns the final approved version of every creative field — strategy refinement, content refinement, visual creative package, and design prompt. This ensures a single creative authority before visual production begins.

---

## 3. Worker Responsibilities

### Creative Director (Content Pipeline)

**Unique Capability:** Complete Creative Package Ownership

The Creative Director is the Final Creative Authority and the Creative Package Owner. The Content Strategy Worker and Content Creation Worker produce first drafts. The Creative Director owns the final approved version of every creative field:

- Strategy Refinement: Content Objective, Content Angle, Content Type, Content Format, Content Funnel Stage, Hook, Post Structure, Language Style, Emoji Style
- Visual Creative Package: Visual Concept, Visual Focus, Visual Priority, Design Mood, Composition, Visual Elements, Do NOT Show, Text On Design, Design Notes
- Content Refinement: Creative Director Post Copy, Primary Hashtags, Secondary Hashtags
- Design Prompt: Creative Director Design Prompt

The Creative Package transfers to Visual Pipeline Section A on approval. No Visual worker may recreate, reinterpret, redesign, or rewrite the Creative Package.

The Creative Director also produces: Creative Director Quality Score, Creative Director Review Status, Creative Director Notes.

### Visual Planner

**Unique Capability:** Production Mode Selection and Generation Brief Preparation

The Visual Planner receives the Creative Director's strategic output from Section A (Design Prompt, Visual Concept, Visual Priority, Composition, Design Mood, Visual Elements, Do NOT Show, Text On Design, Design Notes). It validates production readiness and selects the appropriate production mode.

The Visual Planner checks the Project Assets folder for suitable reference images. If found, it selects PROJECT_ASSET mode and prepares a reference-based generation brief. If not found, it selects AI_GENERATED mode and prepares a Visual Language-based generation brief.

The Visual Planner does not recreate or rewrite the Creative Director's direction. It validates completeness and prepares the generation brief for the Media Generation Service.

The Visual Planner's output (Asset Count, Production Mode, Reference Asset Package) becomes the direct input to the Media Generation Service.

The Visual Planner is responsible only for production readiness and mode selection. It does not evaluate quality, compliance, or coherence. Those responsibilities belong to Visual QA.

### Visual QA

**Unique Capability:** Production Quality Validation, Production-Critical Validation, and Visual Language Compliance

Visual QA is the only component responsible for evaluation, compliance, and approval. It validates that generated assets faithfully represent the Creative Director's approved strategy, comply with the INSAN Visual Language, and satisfy all production-critical requirements.

Visual QA checks for:
- Alignment with approved communication objective
- Alignment with approved emotional direction
- INSAN Visual Language compliance (70/20/10 style ratio)
- Prohibited style detection (cartoon, anime, Pixar, etc.)
- Production mode fidelity (reference image respect for Mode A)
- Brand consistency
- Healthcare credibility
- Technical feasibility
- Visual coherence
- Production-critical requirements: no visible metadata, correct campaign language, no unauthorized branding, Egyptian identity preservation, narrative moment presence, readable typography, correct Arabic rendering, final artwork only, sufficient platform impact

Visual QA applies Production Hard Gates — non-negotiable failures that block PASS regardless of creative quality.

Visual QA can approve, flag for revision, or reject the output. Every rejection includes a clear reason that helps improve the next iteration. Production failures are reported separately from creative quality issues.

### Image Generation Service

**Unique Capability:** Asset Generation

Image Generation is a Production Service. It receives the Visual Planner's format-specific plan and returns generated assets. It supports one or multiple generated assets depending on the content format.

The Image Generation Service does not make creative decisions. It executes visual plans and returns generated assets.

### Publishing Service

**Unique Capability:** Distribution

Publishing is a Production Service. It handles asset upload and Facebook publishing. It does not own spreadsheet columns beyond status and post URL.

---

## 4. Visual Stage

### Purpose

VISUAL_STAGE is the master production state column. It tracks the current state of every row in the Visual Pipeline.

### Allowed Values

| Value | Description |
|---|---|
| READY | Row transferred from Content Pipeline, ready for processing |
| PLANNING | Visual Planner is processing |
| GENERATING | Image Generation Service is producing assets |
| QA | Visual QA is validating |
| PUBLISHING | Publishing Service is publishing |
| COMPLETED | Publishing completed successfully |
| FAILED | An error occurred at any stage |

### Usage

Every worker reads VISUAL_STAGE before processing.

The orchestration layer writes VISUAL_STAGE after processing (workers report completion).

The Apps Script orchestrator uses VISUAL_STAGE to determine which rows to process.

---

## 5. High-Level Workflow

```
Content Pipeline (Editorial)
┌─────────────────────────────────────────┐
│ Content Strategy → Content Creation     │
│        ↓                                │
│ Creative Director Reviews & Owns        │
│ Complete Creative Package               │
│        ↓                                │
│ Review Status = "Approved"              │
└─────────────────────┬───────────────────┘
                      │
                      │ Formula-based transfer
                      │ VISUAL_STAGE = "READY"
                      ▼
Visual Pipeline (Production)
┌─────────────────────────────────────────┐
│ Section A: Read-Only (Auto-Populated)   │
│   Complete Creative Package from        │
│   Creative Director                     │
└─────────────────────┬───────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────┐
│ Section B: Visual Production            │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │       VISUAL PLANNER            │   │
│  │  Stage: READY → PLANNING → ...  │   │
│  │  Input: Section A               │   │
│  │  Output: Production Brief       │   │
│  └─────────────────┬───────────────┘   │
│                    │                     │
│                    ▼                     │
│  ┌─────────────────────────────────┐   │
│  │     IMAGE GENERATION SERVICE    │   │
│  │  Stage: GENERATING → QA         │   │
│  │  Receives Production Brief      │   │
│  │  Returns generated assets       │   │
│  └─────────────────┬───────────────┘   │
│                    │                     │
│                    ▼                     │
│  ┌─────────────────────────────────┐   │
│  │           VISUAL QA             │   │
│  │  Stage: QA → PUBLISHING/...     │   │
│  │  Validates against Creative     │   │
│  │  Director's Creative Package    │   │
│  └─────────────────┬───────────────┘   │
│                    │                     │
│                    ▼                     │
│  ┌─────────────────────────────────┐   │
│  │       PUBLISHING SERVICE        │   │
│  │  Stage: PUBLISHING → COMPLETED  │   │
│  │  Uploads assets, publishes post │   │
│  └─────────────────────────────────┘   │
│                                         │
└─────────────────────────────────────────┘
```

---

## 6. Pipeline Section Separation

### Section A: Read-Only

Section A contains columns auto-populated from the Content Pipeline via spreadsheet formulas (ARRAYFORMULA / XLOOKUP) or automated transfer.

**No Visual worker may modify these columns.**

| Column | Source | Purpose |
|---|---|---|
| Content ID | Content Pipeline | Row identifier |
| Calendar ID | Content Pipeline | Calendar event identifier |
| Campaign Name | Content Pipeline | Campaign identifier |
| Hospital Brand | Content Pipeline | Brand identifier |
| Content Type | Content Pipeline | Content classification |
| Content Format | Content Pipeline | Format constraints |
| Post Copy (AI) | Content Pipeline | Approved post copy |
| Creative Director Design Prompt | Content Pipeline | Approved design prompt |
| Visual Concept | Content Pipeline | Strategic visual concept |
| Visual Focus | Content Pipeline | Primary visual subject |
| Visual Priority | Content Pipeline | Visual priority order |
| Design Mood | Content Pipeline | Emotional mood |
| Composition | Content Pipeline | Compositional approach |
| Visual Elements | Content Pipeline | Visual elements to include |
| Do NOT Show | Content Pipeline | Elements to exclude |
| Text On Design | Content Pipeline | Text on visual |
| Design Notes | Content Pipeline | Additional notes |

### Section B: Visual Production

Section B contains columns written only by designated workers. Each column has exactly one owner.

| Column | Owner | Purpose |
|---|---|---|
| VISUAL_STAGE | Orchestration Layer | Master production state |
| Asset Count | Visual Planner | Number of media assets to generate |
| Production Mode | Visual Planner | PROJECT_ASSET or AI_GENERATED |
| Reference Asset Package | Visual Planner | Structured brief for Media Generation Service |
| Generated Assets | Media Generation Service | One or multiple generated files |
| Generation Status | Media Generation Service | Generation status |
| Generation Timestamp | Media Generation Service | When generated |
| Visual QA Score | Visual QA | Quality score |
| Visual QA Decision | Visual QA | Approved/Revision/Rejected |
| Visual QA Notes | Visual QA | Feedback notes |
| Final Asset URL | Visual QA | URL of approved assets (on approval only) |
| Publishing Status | Publishing Service (RESERVED) | Publishing status |
| Publishing Timestamp | Publishing Service (RESERVED) | When published |
| Live Post URL | Publishing Service (RESERVED) | Facebook post URL |
| AI Worker | Every Worker | Last modifying worker |

---

## 7. Transfer Mechanism

### Trigger

Creative Director Review Status = "Approved"

### Mechanism

Spreadsheet formulas (ARRAYFORMULA / XLOOKUP) or automated transfer script.

### Direction

Content Pipeline → Visual Pipeline Section A (one-way)

The Visual Pipeline never writes back to the Content Pipeline.

### Fields

17 fields transfer. See Section 6, Section A.

### Stage Assignment

VISUAL_STAGE = "READY" after transfer.

---

## 8. Model Routing

> **Implementation status:** There is no Model Router component. No such class or
> function exists in `src/`. This section describes the *principle* that is
> upheld, not a module that exists.
>
> What actually happens: `CONFIG.MEDIA_MODELS` holds one image model and one
> video model. `ServiceRunner._isVideoFormat()` chooses between them by Content
> Format. Text workers all use `CONFIG.GEMINI_MODEL`.
>
> The principle below still holds — no worker prompt names a model — but the
> selection is a two-way branch in configuration, not a routing table.

### Routing Principle

Model selection is driven by Content Format. Workers never know model names.

### Actual Selection

| Content Format | Resolved model |
|---|---|
| Static, Carousel, Story, Infographic | `CONFIG.MEDIA_MODELS.IMAGE` |
| Video, Reel, Motion Graphic | `CONFIG.MEDIA_MODELS.VIDEO` — **not yet implemented; these formats fail with an explicit error** |

### Worker Awareness

Workers only know:

- Static
- Carousel
- Video
- Reel
- Story
- Motion Graphic
- Infographic

Workers never know:

- Model names
- Model versions
- Model endpoints
- API configurations

### Model Configuration

Model names and configurations are stored in the system configuration, not in worker prompts.

---

## 9. Visual Planner

### Input

Section A columns (auto-populated from Content Pipeline):
- Creative Director Design Prompt
- Visual Concept
- Composition
- Design Mood
- Visual Elements
- Do NOT Show
- Text On Design
- Content Format
- Hospital Brand
- Content Type

Also reads from Project Assets folder (for Mode A selection).

### Output

Section B columns (Visual Planner Output):
- Asset Count
- Production Mode (PROJECT_ASSET or AI_GENERATED)
- Reference Asset Package (structured brief for Media Generation Service)

### Unique Capability

Production Mode Selection and Generation Brief Preparation

### Stage Transition

The Visual Planner reports completion. The orchestration layer transitions:
VISUAL_STAGE: READY → PLANNING → GENERATING

### Process

1. **Context Absorption** — Reads all Section A columns, focusing on Creative Director output.
2. **Completeness Validation** — Check that all information required for the requested media format exists.
3. **Production Mode Selection** — Check Project Assets folder for suitable reference images. Select PROJECT_ASSET or AI_GENERATED mode.
4. **Generation Brief Preparation** — Create a structured brief including INSAN Visual Language instructions.
5. **Asset Count** — Set the number of media assets to generate based on Content Format.
6. **Constraint Check** — Validates plan against all visual constraints from Section A.

### What the Visual Planner Does NOT Do

- Does not rewrite the Creative Director's Design Prompt
- Does not create new creative concepts
- Does not evaluate quality or compliance
- Does not generate images

---

## 10. Visual QA

### Input

Section A columns (Creative Director output) + Visual Planner Output + Generated Assets from Image Generation Service + Production Mode + Reference Asset Package.

### Output

Section B columns (Visual QA Output):
- Visual QA Score
- Visual QA Decision
- Visual QA Notes

### Unique Capability

Production Quality Validation and Visual Language Compliance

### Stage Transition

The Visual QA reports decision. The orchestration layer transitions:
If approved: VISUAL_STAGE: QA → PUBLISHING
If revision required: VISUAL_STAGE: QA → PLANNING
If rejected: VISUAL_STAGE: QA → FAILED

### Process

1. **Strategy Alignment Check** — Verifies generated assets align with Creative Director's approved strategy.
2. **Visual Language Compliance** — Validates assets conform to INSAN Visual Language (70/20/10 style ratio, no prohibited styles).
3. **Brand Alignment Check** — Validates assets align with hospital brand guidelines.
4. **Technical Feasibility Check** — Ensures assets meet technical requirements.
5. **Emotional Coherence Check** — Confirms assets match intended emotional impact.
6. **Production Mode Fidelity** — Verifies reference image qualities respected (Mode A) or Visual Language followed (Mode B).
7. **Quality Standard Check** — Verifies assets meet INSAN premium quality standard.
8. **Production Validation** — Verifies all production-critical requirements: no visible metadata, correct campaign language, no unauthorized branding, Egyptian identity preserved, narrative moment present, readable typography, correct Arabic rendering, final artwork only, sufficient platform impact. Production validation is independent of creative quality.
9. **Decision** — Approves, flags for revision, or rejects output with clear reasoning. Production Hard Gates block PASS when any production-critical requirement fails.

### What Visual QA Does NOT Do

- Does not redesign visuals
- Does not rewrite plans
- Does not change the communication strategy
- Does not generate new creative ideas
- Does not generate images

---

## 11. Media Generation Service

### Type

Production Service (not a Worker).

### Unique Capability

Asset Generation

### Input

Section A columns (Creative Package) + Asset Count from Visual Planner.

### Output

Generated assets (one or multiple depending on format).

### Stage Transition

The Media Generation Service reports completion. The orchestration layer transitions:
If successful: VISUAL_STAGE: GENERATING → QA
If failed: VISUAL_STAGE: GENERATING → FAILED

### Contract

Receives Creative Package from Section A → Generates assets → Returns generated assets with metadata.

### What the Media Generation Service Does NOT Do

- Does not make creative decisions
- Does not rewrite plans
- Does not evaluate quality (Visual QA responsibility)
- Does not publish assets (Publishing Service responsibility)

---

## 12. Publishing Service (RESERVED)

### Type

Production Service (not a Worker).

**Status:** Not yet implemented. Columns reserved.

### Input

Final Asset URL and approved post copy.

### Output

Published Facebook post.

### Stage Transition

The Publishing Service reports completion. The orchestration layer transitions:
VISUAL_STAGE: PUBLISHING → COMPLETED (success)
VISUAL_STAGE: PUBLISHING → FAILED (failure)

### Contract

Receives Final Asset URL + post copy → Uploads to Drive → Publishes to Facebook → Returns post URL.

---

## 13. Naming Convention

### Pattern

```
[ContentID]_[Version]_[Timestamp]_[Sequence].[ext]
```

### Examples

```
CNT-000001_V1_20260723_143052_1.png
CNT-000001_V1_20260723_143052_2.png
CNT-000002_V1_20260723_143105_1.jpg
```

### Rules

- Content ID comes from Content Pipeline (auto-generated CNT-XXXXXX).
- Version is V1 for initial generation.
- Timestamp is YYYYMMDD_HHMMSS.
- Sequence is a single digit for the asset number.
- Extensions are lowercase.

---

## 14. Folder Structure

```
Google Drive/
├── INSAN Healthcare Ecosystem/
│   ├── Content Pipeline (Master)/
│   ├── Visual Pipeline (Production)/
│   │   ├── Campaigns/
│   │   │   ├── [Campaign Name]/
│   │   │   │   ├── Strategy/
│   │   │   │   ├── Creative Direction/
│   │   │   │   ├── Visual Plans/
│   │   │   │   ├── Assets/
│   │   │   │   │   ├── Source/
│   │   │   │   │   ├── Final/
│   │   │   │   │   └── Archive/
│   │   │   │   └── Publishing/
│   │   │   └── ...
│   │   └── Templates/
│   ├── Docs/
│   ├── Prompts/
│   └── Archive/
```

---

## 15. Branding Layer (Phase 2 - Deferred)

The Branding Layer handles hospital-specific logo placement, brand color enforcement, and visual identity compliance.

Deferred because:

1. Logo placement requires manual verification for healthcare advertising compliance.
2. Brand color enforcement requires access to hospital-specific brand guidelines.
3. Visual identity rules vary significantly across hospital brands.

---

## 16. Manual Logo Workflow (Temporary)

Until the Branding Layer is implemented:

1. Visual Planner produces plan without logo placement.
2. Designer adds logo during manual design review.
3. Final asset is uploaded to campaign folder.
4. Asset URL is recorded in Visual Pipeline.

---

## 17. Future Extensions

### Phase 2

- Branding Layer implementation.
- Automated logo placement.
- Brand color and font enforcement.
- Multi-language visual adaptation.

### Phase 3

- Audio integration for video content.
- A/B testing framework for visual variants.
- Performance analytics integration.

### Phase 4

- Real-time visual optimization based on engagement data.
- Predictive visual trend analysis.
- Automated visual content calendar generation.

---

## 18. Architecture Decisions

### AD-001: Separation of Pipelines

Content Pipeline and Visual Pipeline are separate spreadsheet tabs with distinct responsibilities.

**Rationale:** Keeps Editorial Pipeline focused on strategy and writing. Keeps Production Pipeline focused on visual production. Prevents column sprawl.

### AD-002: Content Pipeline is Source of Truth

Only approved rows transfer from Content Pipeline to Visual Pipeline after Creative Director approval.

**Rationale:** Ensures only approved content enters visual production. Prevents wasted visual production effort.

### AD-003: Visual Pipeline Section Separation

Visual Pipeline is divided into Section A (Read-Only) and Section B (Visual Production).

**Rationale:** Section A is auto-populated via formulas. Section B is write-only by Designer Team. Clear access control.

### AD-004: Minimum Columns

Visual Pipeline contains only minimum columns required for production. No duplicated fields.

**Rationale:** Keeps Visual Pipeline compact. Every column has a clear production purpose.

### AD-005: Model Abstraction

Workers never know model names. Model Router maps formats to models.

**Rationale:** Models change. Workers should not need updating when models change. Clean separation of concerns.

### AD-006: Image Generation is a Service

Image Generation is a Production Service, not a Worker.

**Rationale:** Image Generation is a utility that receives plans and returns assets. It does not make creative decisions.

### AD-007: Separation of Planning and Evaluation

The Visual Planner is responsible only for planning. Visual QA is the only component responsible for evaluation, compliance, and approval.

**Rationale:** Clean separation of concerns. Planning produces direction. QA validates quality.

### AD-008: Format-Agnostic Asset Output

The system supports one or multiple generated assets depending on the content format. The architecture remains format-agnostic.

**Rationale:** Carousel needs multiple assets. Static needs one. The system handles both without special cases.

### AD-009: Cloud-Native Architecture

All visual production operations are cloud-based using Google Drive and Google Apps Script.

**Rationale:** Consistency with existing INSAN infrastructure. Enables collaboration and version control.

### AD-010: Phase-Based Implementation

System is implemented in phases, with Phase 1 focusing on static images.

**Rationale:** Reduces initial complexity. Allows validation of core architecture before expanding scope.

### AD-011: Manual Logo Handling

Logo placement is handled manually in Phase 1.

**Rationale:** Healthcare advertising regulations require human verification.

### AD-012: Creative Director is Creative Package Owner

The Creative Director is the Final Creative Authority and the Creative Package Owner. The Content Strategy Worker and Content Creation Worker produce first drafts. The Creative Director owns the final approved version of every creative field. This output transfers to Visual Pipeline Section A and serves as the foundation for all visual production work. The Visual Pipeline does not recreate or rewrite creative direction — it builds upon it.

**Rationale:** The Creative Director already produces the complete Creative Package: strategy refinement, content refinement, visual direction (Visual Concept, Design Mood, Composition, Visual Elements, Do NOT Show, Text On Design, Design Notes), and the Design Prompt. The Visual Pipeline's job is to adapt this strategic output for specific formats — not to redo creative work.

### AD-013: Visual Planner Output is Production Input

The Visual Planner's format-specific visual plan becomes the direct input to the Image Generation Service. There is no intermediate worker between planning and generation.

**Rationale:** The Visual Planner already produces sufficient information for image generation. An intermediate worker would add complexity without adding value. Visual QA validates the final output against the approved strategy and plan.

### AD-014: Creative Package Owner

The Creative Director is the Creative Package Owner. The Content Strategy Worker and Content Creation Worker produce first drafts. The Creative Director owns the final approved version of every creative field.

**Rationale:** Having a single creative authority for the complete Creative Package ensures consistency across all creative decisions — copy, visual direction, and design prompt. It prevents fragmented creative ownership and ensures the Visual Pipeline receives a coherent, internally consistent creative brief.

---

## 19. Related Documents

| Document | Purpose |
|---|---|
| VISUAL_SHEET_SCHEMA.md | Column definitions for Content Pipeline and Visual Pipeline |
| VISUAL_WORKER_CONTRACTS.md | Data contracts for each worker and service |
| VISUAL_PIPELINE_FLOW.md | Execution flow and stage transitions |

---

End of Visual Production Architecture Document.
