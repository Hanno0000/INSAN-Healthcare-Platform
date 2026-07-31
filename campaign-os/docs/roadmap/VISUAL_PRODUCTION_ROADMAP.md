# Visual Production Roadmap

INSAN Healthcare AI Operating System

Version: 1.0
Status: **Historical** — largely delivered. Superseded as the plan by
VERDICT_AND_IMPROVEMENTS.md §5. See docs/DOCUMENT_STATUS.md.
Date: July 2026

---

## Overview

This roadmap defines the implementation phases for the Visual Production system. Each phase builds on the previous phase. No phase should begin until its dependencies are satisfied.

---

## Phase 1: Architecture

### Objective

Freeze the system design before any implementation begins.

### Deliverables

- VISUAL_PRODUCTION_ARCHITECTURE.md — Complete system architecture
- VISUAL_SHEET_SCHEMA.md — All column definitions and usage patterns
- VISUAL_PRODUCTION_ROADMAP.md — This document
- Updated CONFIG.gs with Visual Production worker configurations
- Updated SYSTEM_CONSTANTS.md with Visual Production vocabulary

### Dependencies

- Existing Content Strategy Worker functioning
- Existing Content Creation Worker functioning
- Existing Creative Director Worker functioning
- Google Sheet with Content Pipeline columns defined

### Completion Criteria

- [ ] Architecture document reviewed and approved
- [ ] Sheet schema document reviewed and approved
- [ ] All column names finalized
- [ ] All controlled vocabulary defined
- [ ] All worker interfaces defined
- [ ] No open architecture questions

---

## Phase 2: Sheet Integration

### Objective

Add all missing columns to the Content Pipeline spreadsheet to support Visual Production.

### Deliverables

- Updated Content Pipeline spreadsheet with new columns
- Visual Planner columns added
- Visual QA columns added
- Asset Management columns added
- Data validation applied to all controlled vocabulary columns
- Column headers verified against VISUAL_SHEET_SCHEMA.md

### Dependencies

- Phase 1 completed
- Column names finalized in architecture documents
- Controlled vocabulary defined

### Completion Criteria

- [ ] All columns from VISUAL_SHEET_SCHEMA.md exist in the spreadsheet
- [ ] All controlled vocabulary columns have data validation
- [ ] Column headers match architecture documents exactly
- [ ] SheetSchema._getColumnMap() returns correct indices for all new columns
- [ ] refreshCache() returns updated column map
- [ ] No data validation errors on test writes

---

## Phase 3: Visual Planner Worker

### Objective

Implement the Visual Planner worker that transforms Content Strategy and Creative Director output into a visual plan.

### Deliverables

- VISUAL_PLANNER_WORKER.md — Worker prompt file
- Visual Planner worker configuration in CONFIG.gs
- Visual Planner read/write columns defined
- Visual Planner output fields defined
- Visual Planner controlled vocabulary defined

### Dependencies

- Phase 1 completed
- Phase 2 completed (columns exist in spreadsheet)
- Content Strategy Worker functioning
- Creative Director Worker functioning
- Content Pipeline populated with test data

### Completion Criteria

- [ ] Visual Planner prompt file created
- [ ] Worker reads all required input columns correctly
- [ ] Worker produces valid Visual Plan output
- [ ] Visual Plan Summary is clear and actionable
- [ ] Visual Plan Concept is specific and inspiring
- [ ] Visual Plan Composition is technically feasible
- [ ] Visual Plan Brand Compliance flag is accurate
- [ ] Visual Plan Emotional Coherence score is reasonable
- [ ] Output matches VISUAL_SHEET_SCHEMA.md definitions
- [ ] Worker handles missing input gracefully
- [ ] Worker respects minimum necessary intervention principle
- [ ] Test run produces consistent results

---

## Phase 4: Visual QA Worker

### Objective

Implement the Visual QA worker that validates Visual Planner output against INSAN quality standards.

### Deliverables

- VISUAL_QA_WORKER.md — Worker prompt file
- Visual QA worker configuration in CONFIG.gs
- Visual QA read/write columns defined
- Visual QA output fields defined
- Visual QA controlled vocabulary defined
- Quality check templates

### Dependencies

- Phase 1 completed
- Phase 2 completed (columns exist in spreadsheet)
- Phase 3 completed (Visual Planner producing valid output)
- Visual Planner output populated in test data

### Completion Criteria

- [ ] Visual QA prompt file created
- [ ] Worker reads Visual Planner output correctly
- [ ] Worker reads Creative Director output correctly
- [ ] Completeness Check passes for valid plans
- [ ] Completeness Check fails for incomplete plans
- [ ] Brand Alignment Check passes for compliant plans
- [ ] Brand Alignment Check fails for non-compliant plans
- [ ] Technical Feasibility Check passes for feasible plans
- [ ] Technical Feasibility Check fails for infeasible plans
- [ ] Emotional Match Check passes for coherent plans
- [ ] Emotional Match Check fails for incoherent plans
- [ ] Visual QA Score is calibrated (not inflated)
- [ ] Visual QA Decision is appropriate
- [ ] Visual QA Notes are concise (80-150 words)
- [ ] Output matches VISUAL_SHEET_SCHEMA.md definitions
- [ ] Test run produces consistent results

---

## Phase 6: Apps Script Integration

### Objective

Integrate all Visual Production workers into the Apps Script container-bound script.

### Deliverables

- Updated WorkerRunner.gs with Visual Production menu items
- Updated CONFIG.gs with all Visual Production configurations
- Visual Planner execution flow
- Visual QA execution flow
- Sequential execution (Planner → Image Generation → QA → Publishing)
- Parallel execution support (multiple rows)
- Checkpoint and resume support
- Error handling and retry logic
- Custom menu items for Visual Production

### Dependencies

- Phase 1 completed
- Phase 2 completed
- Phase 3 completed
- Phase 4 completed
- Phase 5 completed
- Existing Apps Script infrastructure functioning

### Completion Criteria

- [ ] Visual Production menu items appear in spreadsheet
- [ ] "Run Visual Planner" executes correctly
- [ ] "Run Visual QA" executes correctly
- [ ] "Run Full Visual Pipeline" executes all stages sequentially
- [ ] Sequential execution works (Planner → Image Generation → QA → Publishing)
- [ ] Parallel execution works (multiple rows)
- [ ] Checkpoints are saved at each stage
- [ ] Resume works after interruption
- [ ] Error handling catches and reports failures
- [ ] Retry logic works on transient failures
- [ ] Timeout detection works correctly
- [ ] Execution Log records all Visual Production runs
- [ ] System Status shows Visual Production health
- [ ] No data validation errors on writes
- [ ] All columns are written correctly
- [ ] No duplicate writes or missed writes

---

## Phase 7: Production Validation

### Objective

Validate the complete Visual Production system end-to-end with real content.

### Deliverables

- End-to-end test with real Content Pipeline data
- Visual Planner output validated by human review
- Visual QA output validated by human review
- Image generation output validated by human review
- Performance metrics collected
- Error rates documented
- Quality metrics documented
- Production readiness report

### Dependencies

- Phase 1 completed
- Phase 2 completed
- Phase 3 completed
- Phase 4 completed
- Phase 5 completed
- Phase 6 completed
- Real content populated in Content Pipeline
- Human reviewers available

### Completion Criteria

- [ ] 10+ rows processed through full Visual Production pipeline
- [ ] Visual Planner output rated "Good" or better by human review
- [ ] Image generation output rated "Good" or better by human review
- [ ] Visual QA output rated "Good" or better by human review
- [ ] Average processing time per row documented
- [ ] Error rate below 5%
- [ ] No data loss or corruption
- [ ] All columns populated correctly
- [ ] All controlled vocabulary validated
- [ ] All free text fields contain meaningful content
- [ ] Generated visual plans are specific and actionable
- [ ] Generated visual plans are diverse (not repetitive)
- [ ] Quality scores are calibrated (not inflated)
- [ ] Review statuses are accurate
- [ ] Notes are concise and helpful
- [ ] Production readiness report approved
- [ ] Go-live decision made

---

## Phase Dependencies

```
Phase 1: Architecture
    ↓
Phase 2: Sheet Integration
    ↓
Phase 3: Visual Planner Worker
    ↓
Phase 4: Visual QA Worker
    ↓
Phase 5: Apps Script Integration
    ↓
Phase 6: Production Validation
```

---

## Risk Register

### R1: Column Name Mismatch

**Risk:** Column names in the spreadsheet do not match architecture documents.

**Mitigation:** Phase 2 includes explicit verification of column names against architecture documents.

### R2: Visual Plan Quality

**Risk:** Visual Planner produces vague or generic plans.

**Mitigation:** Phase 3 includes quality checks and human review of test output.

### R3: QA Calibration

**Risk:** Visual QA inflates scores or auto-approves everything.

**Mitigation:** Phase 4 includes calibration checks and human review of test output.

### R4: Integration Errors

**Risk:** Apps Script integration introduces bugs or data corruption.

**Mitigation:** Phase 5 includes comprehensive error handling and Phase 6 includes end-to-end validation.

---

## Estimated Timeline

| Phase | Estimated Duration | Prerequisites |
|---|---|---|
| Phase 1: Architecture | 1-2 days | None |
| Phase 2: Sheet Integration | 1 day | Phase 1 |
| Phase 3: Visual Planner Worker | 2-3 days | Phase 2 |
| Phase 4: Visual QA Worker | 2-3 days | Phase 3 |
| Phase 5: Apps Script Integration | 3-5 days | Phase 4 |
| Phase 6: Production Validation | 2-3 days | Phase 5 |

**Total Estimated Duration: 11-18 days**

---

## Success Metrics

### Quality Metrics

- Visual Plan Quality Score: Average 4.0+ (out of 5.0)
- QA Accuracy: 95%+ agreement with human review
- Score Calibration: No more than 10% inflation

### Performance Metrics

- Visual Planner Processing Time: < 2 minutes per row
- Visual QA Processing Time: < 1 minute per row
- Full Pipeline Processing Time: < 5 minutes per row

### Reliability Metrics

- Error Rate: < 5%
- Data Loss Rate: 0%
- Checkpoint Recovery Rate: 100%
- Timeout Recovery Rate: 100%

---

End of Visual Production Roadmap.
