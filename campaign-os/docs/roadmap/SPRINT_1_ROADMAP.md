# Sprint 1 – Visual Production Quality & Workflow Hardening

Campaign OS — Sprint Roadmap

Version: 1.0
Status: Active
Date: July 2026

---

## Sprint Objective

Improve the production quality of the Media Generation Team based on issues discovered during the first production run.

Every implementation decision must answer:

**"Will this improve the quality of the next production run?"**

If the answer is no, postpone it to a future sprint.

---

## Scope Boundaries

### In Scope

- Visual philosophy redesign
- INSAN Visual Language introduction
- Photorealistic generation replacement with approved visual identity
- Project Assets folder hook (production-ready, not fully implemented)
- Quality improvements that directly impact next production run

### Out of Scope

- Advanced asset management systems
- Publishing Service implementation
- Video generation
- Content Pipeline changes
- Architecture expansion beyond quality improvements

---

## Sprint Steps

### Step 1: Creative Direction & Visual Language

**Status:** Approved — Pending Implementation

**Objectives:**

- Redesign the visual philosophy
- Introduce the INSAN Visual Language
- Replace photorealistic generation with approved visual identity:
  - 70% Stylized Realism
  - 20% Semi-Realistic Editorial Illustration
  - 10% 3D Matte Influence
- Add support for future Project Assets lookup

**Implementation Details:**

The Visual Planner must contain the following workflow hook:

1. Check `PROJECT_ASSETS_FOLDER_ID`
2. If suitable project assets exist, use them
3. Otherwise, automatically fall back to AI generation using the INSAN Visual Language

The Project Assets folder will initially be empty. Do NOT implement advanced asset management. Only prepare the workflow hook so it is production-ready later.

**Files Impacted:**

- `CONFIG.gs` — New `PROJECT_ASSETS` config, `VISUAL_LANGUAGE` constants
- `VISUAL_PLANNER_WORKER.md` — Rewritten with Visual Language + asset lookup hook
- `MEDIA_GENERATION_SERVICE.md` — Rewritten with Visual Language execution
- `VISUAL_QA_WORKER.md` — Rewritten with Visual Language compliance checks
- `SYSTEM_CONSTANTS.md` — New vocabulary entries
- `VISUAL_WORKER_CONTRACTS.md` — Updated responsibilities
- `VISUAL_PIPELINE_FLOW.md` — Updated flow
- `VISUAL_PRODUCTION_ARCHITECTURE.md` — Updated architecture
- `VISUAL_SHEET_SCHEMA.md` — Updated schema
- `MEDIA_GENERATION_SERVICE_CONTRACT.md` — Updated contract
- `PROMPT_LAYER_INVENTORY.md` — Updated inventory
- `INSAN_VISUAL_LANGUAGE_SPEC.md` — New canonical reference

**Completion Criteria:**

- [ ] INSAN Visual Language defined and documented
- [ ] Visual Planner prompt rewritten with Visual Language
- [ ] Media Generation Service prompt rewritten with Visual Language
- [ ] Visual QA prompt rewritten with Visual Language compliance checks
- [ ] Project Assets folder hook implemented (empty folder, workflow ready)
- [ ] All worker contracts updated
- [ ] All architecture docs updated
- [ ] SYSTEM_CONSTANTS.md vocabulary updated
- [ ] Changes directly improve design quality for next production run

---

### Step 2: [PENDING — Awaiting Definition]

**Status:** Not Started

[To be defined]

---

### Step 3: [PENDING — Awaiting Definition]

**Status:** Not Started

[To be defined]

---

### Step 4: [PENDING — Awaiting Definition]

**Status:** Not Started

[To be defined]

---

### Step 5: [PENDING — Awaiting Definition]

**Status:** Not Started

[To be defined]

---

## Step Dependencies

```
Step 1: Creative Direction & Visual Language
    ↓
Step 2: [Pending]
    ↓
Step 3: [Pending]
    ↓
Step 4: [Pending]
    ↓
Step 5: [Pending]
```

---

## Governing Principles

1. **Quality over scope** — Every change must improve next production run
2. **Full propagation** — Every change must be reflected across all workers, contracts, prompts, and docs
3. **No isolated changes** — Every architectural change propagates throughout the system
4. **Review before proceeding** — Each step requires approval before next step begins
5. **Document everything** — Update docs, contracts, and architecture at each step completion

---

## Risk Register

### R1: Visual Language Too Prescriptive

**Risk:** Overly rigid visual guidelines may limit creative output.

**Mitigation:** Visual Language defines boundaries, not prescriptions. Workers operate within approved style ranges.

### R2: Asset Lookup Adds Latency

**Risk:** Project Assets folder lookup may slow down Visual Planner.

**Mitigation:** Folder hook is lightweight. Advanced optimization deferred to future sprint.

### R3: QA Inflation

**Risk:** Visual QA may auto-approve images that match Visual Language but lack quality.

**Mitigation:** Visual Language compliance is one dimension among existing quality checks.

---

## Success Metrics

### Quality Metrics

- Generated images match INSAN Visual Language (no photorealism)
- Visual Planner correctly selects production mode (Asset vs AI Generated)
- Visual QA catches Visual Language violations
- Human review rating improves over previous production run

### Performance Metrics

- No increase in pipeline processing time
- Visual Planner asset lookup completes in < 5 seconds

### Reliability Metrics

- Error rate remains below 5%
- No data loss or corruption
- Fallback to AI generation works when asset folder is empty

---

End of Sprint 1 Roadmap.
