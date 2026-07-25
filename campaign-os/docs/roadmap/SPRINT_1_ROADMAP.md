# Sprint 1 — Visual Production Quality & Workflow Hardening

Campaign OS — Official Sprint Reference

Version: 4.0
Status: Active — In Progress
Date: July 2026

---

## 1. Sprint Goal

The single goal of this sprint:

**Improve the quality of the first Production Run so that generated designs become publication-ready.**

Every implementation decision must answer:

**"Will this improve the quality of the next production run?"**

If the answer is no, postpone it to a future sprint.

---

## Sprint Background

Sprint 1 was created after the first Production Run was technically successful.

The infrastructure was stable. The pipeline worked. The workers executed. The technical foundation was solid.

But the problem shifted.

It was no longer about **Technical Stability**. It became about **Production Quality**.

The images were generated. But they were not publication-ready.

The system worked. But the output did not meet the creative standard.

Sprint 1 exists to close that gap — to transform a technically functional system into one that produces publication-quality visual assets.

This is why every decision in this sprint must answer one question:

**"Will this improve the quality of the next production run?"**

Not "will this add a feature." Not "will this expand the architecture." Only "will this make the next run's output better."

---

## Current Sprint Progress

| Step | Worker | Status |
|---|---|---|
| Step 1 | Media Generation Service | ✓ COMPLETE — APPROVED |
| Step 2 | Visual QA Service | ✓ COMPLETE — APPROVED |
| Step 3 | Visual QA Review | Pending |
| Step 4 | Apps Script Implementation | Pending |
| Step 5 | Production Validation Run | Pending |

**Completed:**

- ✓ Architecture reviewed
- ✓ Worker ownership finalized
- ✓ Visual pipeline finalized
- ✓ MEDIA_GENERATION_SERVICE rewritten and approved
- ✓ VISUAL_QA_WORKER rewritten and approved

**Next planned task:**

➡ Rewrite the next worker using the same AI Coaching philosophy.

---

## 2. Problems This Sprint Addresses

The following problems were identified during the last Validation Run:

### P1: Obvious AI Appearance

Generated images look clearly artificial. Specific symptoms:

- Plastic skin texture
- Unrealistic facial features
- Uncanny valley effect from attempting photorealism
- Failed attempts to mimic real photography

### P2: Unwanted Branding Generation

The system generates branding elements that were not requested:

- Logos appearing on images
- "INSAN" text appearing on visuals
- Slide numbers or watermarks
- Any text or branding not explicitly specified in the Creative Package

### P3: Weak Prompt Philosophy

No defined visual direction. The system lacked:

- A coherent visual identity
- Style guidelines for generation
- Composition principles
- Lighting direction
- Human expression standards
- Color and mood philosophy

### P4: Visual QA Approving Unacceptable Images

Visual QA was approving images that should have been rejected:

- No visual identity compliance checks
- No style ratio enforcement
- No prohibited style detection
- Quality validation disconnected from brand standards

---

## 3. Architecture Decisions

The following are approved Architecture Decisions for Sprint 1. They are final and not open for re-discussion within this sprint.

### AD-01: No Photorealism — Building Honest Visual Identity

**Decision:** INSAN will not pursue photorealistic AI generation.

**Rationale:** We are not trying to fool the viewer into believing the image is real.

Photorealistic AI images create a specific lie — "This is a real place. These are real people." When viewers discover (or sense) the image is fake, trust collapses. For a healthcare brand, this trust destruction is catastrophic.

INSAN's visual philosophy takes the opposite approach:

- Semi-realistic imagery with a clear artistic identity is more honest than a fake photograph.
- A stylized image says: "This is a carefully created representation of our healthcare environment."
- A photorealistic fake says: "This is real" — and when the lie is exposed, credibility is lost.

**The goal is not to replicate reality. The goal is to build a stable visual identity.**

When someone sees an INSAN image, they should immediately recognize it — not because it looks like a photograph, but because it carries a consistent, professional, trustworthy visual signature.

This visual identity is more valuable than realism. It is sustainable, scalable, and honest.

### AD-02: INSAN Visual Language

**Decision:** All generated media must conform to the INSAN Visual Language specification.

**Rationale:** The Visual Language defines the creative philosophy, style ratio, composition principles, lighting philosophy, human expression standards, and color/mood direction. It is the canonical reference for all visual production. See `INSAN_VISUAL_LANGUAGE_SPEC.md`.

### AD-03: Semi-Realistic / Stylized Approach

**Decision:** Use a stylized, semi-realistic approach instead of attempting to mimic reality.

**Rationale:** Semi-realistic styles maintain the human quality of subjects while clearly communicating artistic intention. The viewer sees: "This is a carefully created image about healthcare." Not: "This is a cartoon about healthcare." Not: "This is a fake photograph."

**Style Ratio:**

| Style | Ratio | Description |
|---|---|---|
| Stylized Realism | 70% | Realistic forms with artistic interpretation. Not photorealistic. |
| Semi-Realistic Editorial Illustration | 20% | Illustrated editorial style with realistic proportions. |
| 3D Matte Illustration | 10% | Soft 3D rendered elements for depth and premium feel. |

### AD-04: Project Assets Workflow — Source of Truth

**Decision:** Project Assets are the primary source for visual production. INSAN Visual Language is the fallback.

This is an architectural decision, not a hook.

**Workflow:**

```
Visual Planner
       │
       ▼
Search Project Assets
       │
 ┌─────┴─────┐
 │           │
Found     Not Found
 │           │
 ▼           ▼
Use      INSAN Visual Language
Assets     AI Generation
```

**Rules:**

- Project Assets are the **first source**. When a suitable asset exists in the Project Assets folder, it must be used.
- INSAN Visual Language is the **fallback**. When no suitable Project Asset exists, the Visual Planner falls back to AI generation using the Visual Language.
- The Visual Planner alone makes this decision. No other worker decides whether to use Project Assets.
- This is a production decision with direct impact on output quality. It is defined here, not in a hook.

### AD-05: Media Generation Executes, Does Not Reinterpret

**Decision:** The Media Generation Service executes the approved Creative Package. It does not create, reinterpret, improve, or rewrite creative direction.

**What this means in practice:**

- It does **not** rewrite the prompt.
- It does **not** reinterpret the Creative Package.
- It does **not** add new ideas.
- It does **not** improve the creative direction.
- It does **not** make aesthetic judgment calls.
- It does **not** change composition, lighting, or style beyond what the Creative Director approved and the Visual Planner prepared.

**It executes only what was approved and prepared.**

The Media Generation Service is a production utility — a high-quality printer, not a creative collaborator. Its job is to translate a resolved creative brief into pixels with maximum fidelity. Creative decisions belong to the Creative Director. Production decisions (asset lookup, brief preparation) belong to the Visual Planner. The Media Generation Service belongs to neither — it belongs to the brief.

### AD-06: Visual QA Validates Against Creative Package

**Decision:** Visual QA evaluates generated assets against the Creative Director's approved Creative Package, not against generic quality standards.

**Rationale:** The Creative Package is the source of truth. An image can be technically beautiful but fail to match the creative direction. Visual QA must validate fidelity to the approved package, not just aesthetic quality.

### AD-07: Creative Director is Creative Package Owner

**Decision:** The Creative Director owns the final approved version of every creative field — strategy refinement, content refinement, visual creative package, and design prompt.

**Rationale:** A single creative authority for the complete Creative Package ensures consistency across all creative decisions. The Content Strategy Worker and Content Creation Worker produce first drafts. The Creative Director owns the final version.

### AD-08: Visual Planner Owns Asset vs Generation Decision

**Decision:** The Visual Planner is the only worker responsible for deciding whether to use Project Assets or fall back to AI generation.

**Rationale:**

- **Creative Director** does not decide whether to use reference images. Creative Director produces the Creative Package (strategy, content, visual direction, design prompt). The Creative Package does not contain asset lookup logic.
- **Media Generation Service** does not decide whether to use reference images. Media Generation Service receives an already-resolved generation brief and executes it.
- **Visual Planner** alone is responsible for:
  - Searching Project Assets for suitable references
  - Deciding whether a found asset matches the creative direction
  - Falling back to AI generation when no suitable asset exists
  - Preparing the generation brief accordingly

This is a production decision with direct impact on output quality and pipeline integrity. It belongs to one worker only.

---

## 4. Visual Language

The INSAN Visual Language is the official visual identity for all AI-generated media.

**Canonical Reference:** `campaign-os/docs/architecture/INSAN_VISUAL_LANGUAGE_SPEC.md`

**Machine-Readable Reference:** `CONFIG.gs` — `VISUAL_LANGUAGE` object

### What INSAN Feels Like

Every INSAN design should make the viewer feel:

**"This is a place I can trust with my family's health."**

Not cold. Not clinical. Not distant. Warm, but professional. Human, but credible. Modern, but not sterile.

The feeling is **confidence**. Quiet, grounded confidence that says: "We know what we are doing, and we care about you."

### Emotional Goal

Every generated image must communicate three things simultaneously:

1. **Trust** — This is a serious, credible healthcare provider
2. **Warmth** — This is a place where humans care for humans
3. **Modernity** — This is a forward-thinking, world-class healthcare ecosystem

If any one of these three emotions is missing, the image fails.

### Visual Personality

- **Confident, not arrogant** — Authority without talking down
- **Caring, not sentimental** — Warmth without emotional manipulation
- **Premium, not exclusive** — Elevated without being intimidating
- **Egyptian, not generic** — Authentic Egyptian healthcare environment
- **Clear, not simple** — Communicates clearly without dumbing down

### Style Ratio

| Style | Ratio | Description |
|---|---|---|
| Stylized Realism | 70% | Realistic forms with artistic interpretation |
| Semi-Realistic Editorial Illustration | 20% | Illustrated editorial style |
| 3D Matte Illustration | 10% | Soft 3D rendered elements |

### Strictly Prohibited

| Prohibited Style | Why |
|---|---|
| Cartoon | Signals entertainment, not healthcare credibility |
| Anime | Inconsistent with premium healthcare branding |
| Pixar | Inconsistent with professional healthcare tone |
| Comic-book | Undermines medical seriousness |
| Hyper-realistic AI photography | Creates uncanny valley, damages trust |
| Uncanny faces | Destroys human connection |
| Plastic skin | Signals artificiality |
| Obvious AI artifacts | Damages brand credibility |

### Application by Workers

| Worker | How They Use Visual Language |
|---|---|
| Creative Director | References when producing Design Prompt and visual direction |
| Visual Planner | Applies to generation brief preparation |
| Media Generation Service | Applies during image generation |
| Visual QA | Validates generated images against Visual Language |

---

## 5. Sprint Scope — The Five Steps

### Step 1: Media Generation Service Prompt Rewrite

**Status:** COMPLETE — APPROVED

**What was done:**

- Completely rewritten `MEDIA_GENERATION_SERVICE.md` from scratch
- Applied new Prompt Philosophy (~80% AI Coaching, ~20% Operational Rules)
- Added Worker Identity, Mission, Pipeline Responsibility
- Added Manufacturing Mindset, Honest Healthcare Philosophy
- Added Human Psychology, Visual Storytelling, Human Representation
- Added Composition, Lighting, Color Psychology, Brand Consistency
- Added Internal QA, Worker Contract Inputs/Outputs
- Added Model-Specific Generation Behavior (Gemini failure prevention)
- Added Success Definition
- Fixed formatting: added missing `---` separators between sections
- Fixed typo: `confelling` → `compelling`
- Removed all legacy sections (Production Mode Handling, Generation Methodology, Professional Boundaries, Working Rules, old Inputs/Outputs/Definition of Success)

**Key file modified:**

- `MEDIA_GENERATION_SERVICE.md` — V3 (1034 lines, complete rewrite)

---

### Step 2: Visual QA Service Prompt Rewrite

**Status:** COMPLETE — APPROVED

**What was done:**

- Completely rewritten `VISUAL_QA_WORKER.md` from scratch
- Applied new Prompt Philosophy (~80% AI Coaching, ~20% Operational Rules)
- Added Worker Identity, Mission, Core Philosophy
- Added Mental Model, Quality Philosophy, Healthcare Communication Mindset
- Added Brand Guardian Mindset, Long-Term Thinking
- Added Creative Evaluation Framework (Communication Quality, Visual Hierarchy, Emotional Evaluation, Healthcare Credibility, Brand Consistency, Simplicity, Originality, Production Readiness, Human Judgment)
- Added Evaluation Workflow (8-step sequence)
- Added Failure Analysis, Severity Assessment, Recovery Recommendations
- Added Decision Categories (PASS / REVISE / REJECT)
- Added Output Requirements, Worker Boundaries, Collaboration Philosophy
- Added Approval Philosophy, Success Definition, Final Principle

**Key file modified:**

- `VISUAL_QA_WORKER.md` — V2 (complete rewrite)

---

### Step 3: Visual QA Review

**Status:** Not Started

Review the Visual QA Service prompt against architecture contracts and ensure full alignment.

---

### Step 4: Apps Script Implementation

**Status:** Not Started

Implement prompt changes in Apps Script container-bound functions.

---

### Step 5: Production Validation Run

**Status:** Not Started

Execute a production validation run to verify improved output quality.

---

## Step Dependencies

```
Media Generation Service ✓ COMPLETE
        ↓
Visual QA Service ✓ COMPLETE
        ↓
Visual QA Review ← CURRENT
        ↓
Implementation
        ↓
Production Validation
```

---

## 6. Out of Scope

The following are explicitly deferred to future sprints:

### Deferred — Not Implemented

- Advanced asset management systems (full Project Assets workflow)
- Publishing Service implementation
- Video generation
- Content Pipeline architectural changes beyond quality improvements
- Branding Layer (logo placement, brand color enforcement)
- Multi-language visual adaptation
- A/B testing framework for visual variants
- Performance analytics integration
- Real-time visual optimization

### Reserved — Hooks Only

The following are implemented as reserved hooks only. They are production-ready but not fully implemented:

| Hook | Location | Status |
|---|---|---|
| `PROJECT_ASSETS_FOLDER_ID` | `CONFIG.gs` | Empty, ready for folder ID |
| `DOMAIN_FOLDERS` | `CONFIG.gs` | Empty, ready for domain-specific folders |
| Visual Planner asset lookup | `VISUAL_PLANNER_WORKER.md` | Workflow hook implemented, folder empty |
| Production Mode Selection | `VISUAL_PLANNER_WORKER.md` | Logic implemented, falls back to AI_GENERATED |

---

## 7. Success Criteria

Sprint 1 is considered successful only if ALL of the following are true:

### Visual Quality

- [ ] Generated images clearly avoid AI appearance (no plastic skin, no uncanny faces)
- [ ] Generated images follow INSAN Visual Language (style ratio, prohibited styles)
- [ ] Generated images communicate Trust, Warmth, and Modernity simultaneously

### Branding

- [ ] No unwanted logos appear on generated images
- [ ] No "INSAN" text appears on visuals unless explicitly specified
- [ ] No slide numbers or watermarks appear

### Visual Direction

- [ ] Creative Director produces specific, production-ready Design Prompts
- [ ] Visual direction fields are specific enough to imagine before generation
- [ ] Design Prompt integrates INSAN Visual Language terms

### Visual QA

- [ ] Visual QA catches Visual Language violations
- [ ] Visual QA validates against Creative Package, not just aesthetic quality
- [ ] Visual QA enforces style ratio and prohibited style detection

### Pipeline

- [ ] Creative Director owns complete Creative Package
- [ ] Visual Planner correctly selects production mode
- [ ] Media Generation executes without reinterpretation
- [ ] Revision loop functions correctly
- [ ] No data loss or corruption

### Production Run

- [ ] Next Production Run achieves publication-ready quality
- [ ] Human review rating improves over previous production run
- [ ] Error rate remains below 5%

---

## 8. Governing Principles

1. **Quality over scope** — Every change must improve next production run
2. **Full propagation** — Every change must be reflected across all workers, contracts, prompts, and docs
3. **No isolated changes** — Every architectural change propagates throughout the system
4. **Review before proceeding** — Each step requires approval before next step begins
5. **Document everything** — Update docs, contracts, and architecture at each step completion

---

## 9. Risk Register

### R1: Visual Language Too Prescriptive

**Risk:** Overly rigid visual guidelines may limit creative output.

**Mitigation:** Visual Language defines boundaries, not prescriptions. Workers operate within approved style ranges.

### R2: Asset Lookup Adds Latency

**Risk:** Project Assets folder lookup may slow down Visual Planner.

**Mitigation:** Folder hook is lightweight. Advanced optimization deferred to future sprint.

### R3: QA Inflation

**Risk:** Visual QA may auto-approve images that match Visual Language but lack quality.

**Mitigation:** Visual Language compliance is one dimension among existing quality checks.

### R4: Creative Director Bottleneck

**Risk:** Expanding Creative Director responsibility may slow down the Content Pipeline.

**Mitigation:** The Creative Director already runs as part of the Content Pipeline. The additional fields are processed in the same invocation. No additional pipeline stages added.

### R5: Prompt Complexity

**Risk:** Longer, more complex prompts may reduce output quality or increase token usage.

**Mitigation:** Prompts are structured in clear sections. The model can process the additional guidance. Token usage increase is acceptable for the quality improvement.

---

## 10. Key References

| Document | Purpose |
|---|---|
| `INSAN_VISUAL_LANGUAGE_SPEC.md` | Canonical visual identity reference |
| `CREATIVE_PACKAGE_CONTRACT.md` | Creative Director ownership contract |
| `VISUAL_WORKER_CONTRACTS.md` | Data contracts for all Visual Pipeline workers |
| `VISUAL_SHEET_SCHEMA.md` | Column definitions for both pipelines |
| `VISUAL_PIPELINE_FLOW.md` | Execution flow and stage transitions |
| `VISUAL_PRODUCTION_ARCHITECTURE.md` | Complete system architecture |
| `PROMPT_LAYER_INVENTORY.md` | Prompt layer inventory |
| `MEDIA_GENERATION_SERVICE_CONTRACT.md` | Media Generation Service contract |
| `SYSTEM_CONSTANTS.md` | Controlled vocabulary and ownership |

---

## 11. How to Use This Document

This document is the **official reference** for Sprint 1. It is self-contained.

The following rules apply:

### Before Starting Work

- **Read this document first.** Before executing any Sprint 1 step, read this file in full.
- **This file is the restart point.** At the beginning of any new session, consider this file as the point of resumption.
- **Review before proceeding.** Each step requires review and approval before the next step begins.

### During Work

- **Scope is fixed.** Sprint scope does not expand unless there is an explicit decision to do so.
- **Features are filtered.** Any feature that does not improve the next production run is postponed.
- **Decisions are final.** Architecture decisions in this document are approved and not open for re-discussion within this sprint.

### For New Readers / New AI Sessions

If you are reading this document for the first time — whether you are a human or an AI — you should be able to answer these questions after reading:

1. Why does Sprint 1 exist?
2. What problem does it solve?
3. What are the Architecture Decisions?
4. What is the INSAN Visual Language?
5. What is the sprint scope?
6. What is out of scope?
7. What does success look like?
8. How do I use this document as a reference?

If you cannot answer all 8 questions, the document has not been read thoroughly.

---

## Current Sprint Position

The Media Generation Service and Visual QA Worker have both been completed and approved.

The sprint is now focused on reviewing the Visual QA Worker against architecture contracts before moving to Apps Script implementation.

Prompt architecture continues to be finalized before code implementation.

---

## Version History

| Version | Date | Change |
|---|---|---|
| 1.0 | July 2026 | Initial Sprint 1 roadmap |
| 2.0 | July 2026 | Comprehensive Sprint 1 reference — Single Source of Truth |
| 2.1 | July 2026 | Documentation Patch — Sprint Background, Visual Language philosophy, Project Assets workflow, Visual Planner & Media Generation responsibilities, How to Use |
| 3.0 | July 2026 | Sprint progress update — Media Generation Service V3 complete, Visual QA Service in progress, 5-step execution sequence defined |
| 4.0 | July 2026 | Visual QA Worker V2 complete and approved — both core workers rewritten using AI Coaching philosophy |

---

End of Sprint 1 Reference.
