# Visual Production Tasks

INSAN Healthcare AI Operating System

Version: 1.0
Status: Implementation Checklist
Date: July 2026

---

## Overview

This document contains all executable engineering tasks for the Visual Production system implementation. Tasks are organized by group and should be executed in dependency order.

**Status Legend:**
- TODO — Not started
- IN PROGRESS — Currently working
- BLOCKED — Waiting on dependency
- DONE — Completed

**Priority Legend:**
- P0 — Critical path, must complete before dependent tasks
- P1 — Important, should complete soon
- P2 — Nice to have, can defer

**Complexity Legend:**
- S — Small (< 1 hour)
- M — Medium (1-4 hours)
- L — Large (4-8 hours)
- XL — Extra Large (> 8 hours)

---

## Architecture

| Task ID | Title | Description | Dependencies | Status | Priority | Complexity |
|---|---|---|---|---|---|---|
| ARCH-001 | Finalize system architecture | Complete and approve VISUAL_PRODUCTION_ARCHITECTURE.md | None | TODO | P0 | M |
| ARCH-002 | Finalize sheet schema | Complete and approve VISUAL_SHEET_SCHEMA.md | None | TODO | P0 | M |
| ARCH-003 | Define worker interfaces | Define input/output contracts for Planner and QA | ARCH-001 | TODO | P0 | M |
| ARCH-004 | Define controlled vocabulary | Finalize all controlled vocabulary for Visual Production columns | ARCH-002 | TODO | P0 | S |
| ARCH-005 | Define error handling strategy | Define retry, timeout, and fallback behavior for all workers | ARCH-001 | TODO | P1 | M |
| ARCH-006 | Define checkpoint strategy | Define checkpoint save/resume behavior for Visual Production | ARCH-001 | TODO | P1 | S |
| ARCH-007 | Define execution flow | Define sequential and parallel execution patterns | ARCH-001 | TODO | P1 | S |

---

## Documentation

| Task ID | Title | Description | Dependencies | Status | Priority | Complexity |
|---|---|---|---|---|---|---|
| DOC-001 | Create development roadmap | Complete and approve VISUAL_PRODUCTION_ROADMAP.md | ARCH-001 | TODO | P0 | M |
| DOC-002 | Create task breakdown | Complete and approve this document | DOC-001 | TODO | P0 | M |
| DOC-003 | Update SYSTEM_CONSTANTS.md | Add Visual Production columns and vocabulary to system constants | ARCH-002, ARCH-004 | TODO | P0 | S |
| DOC-004 | Create Visual Planner prompt spec | Define prompt file structure and requirements | ARCH-003 | TODO | P1 | S |
| DOC-006 | Create Visual QA prompt spec | Define prompt file structure and requirements | ARCH-003 | TODO | P1 | S |
| DOC-007 | Document API key requirements | Document which API keys are needed and how to configure them | None | TODO | P1 | S |

---

## Planner

| Task ID | Title | Description | Dependencies | Status | Priority | Complexity |
|---|---|---|---|---|---|---|
| PLAN-001 | Create VISUAL_PLANNER_WORKER.md | Write the Visual Planner worker prompt file | ARCH-003, DOC-004 | TODO | P0 | L |
| PLAN-002 | Define Visual Planner input fields | Define all fields the Visual Planner reads from the spreadsheet | ARCH-002 | TODO | P0 | S |
| PLAN-003 | Define Visual Planner output fields | Define all fields the Visual Planner writes to the spreadsheet | ARCH-002 | TODO | P0 | S |
| PLAN-004 | Define Visual Planner vocabulary | Define controlled vocabulary for Visual Planner output columns | ARCH-004 | TODO | P0 | S |
| PLAN-005 | Implement emotional mapping logic | Define how emotional triggers map to visual concepts | PLAN-001 | TODO | P1 | M |
| PLAN-006 | Implement format analysis logic | Define how Content Format affects visual planning | PLAN-001 | TODO | P1 | M |
| PLAN-007 | Implement brand compliance check | Define how hospital brand constraints affect visual planning | PLAN-001 | TODO | P1 | M |
| PLAN-008 | Implement composition guidance | Define how composition choices are made based on content type | PLAN-001 | TODO | P1 | M |
| PLAN-009 | Test Visual Planner with sample data | Run Visual Planner on 5+ rows and validate output | PLAN-001 through PLAN-008 | TODO | P0 | L |

---

## Model Router

| Task ID | Title | Description | Dependencies | Status | Priority | Complexity |
|---|---|---|---|---|---|---|
| ROUTE-001 | Design model router architecture | Define routing logic for different task types | ARCH-001 | TODO | P0 | M |
| ROUTE-002 | Implement tier 1 routing (Planning) | Route planning tasks to appropriate models | ROUTE-001 | TODO | P1 | M |
| ROUTE-003 | Implement tier 2 routing (Production) | Route production tasks to appropriate models | ROUTE-001 | TODO | P1 | M |
| ROUTE-004 | Implement tier 3 routing (Validation) | Route validation tasks to appropriate models | ROUTE-001 | TODO | P1 | M |
| ROUTE-005 | Implement fallback logic | Define fallback behavior when primary model fails | ROUTE-001 | TODO | P1 | M |
| ROUTE-006 | Implement cost-aware routing | Prefer cost-effective models when quality allows | ROUTE-001 | TODO | P2 | M |
| ROUTE-007 | Test model routing | Validate routing logic with different task types | ROUTE-001 through ROUTE-006 | TODO | P1 | M |

---

## Google Drive

| Task ID | Title | Description | Dependencies | Status | Priority | Complexity |
|---|---|---|---|---|---|---|
| DRIVE-001 | Define folder structure | Create folder hierarchy in Google Drive | ARCH-001 | TODO | P0 | S |
| DRIVE-002 | Implement folder creation | Auto-create campaign folders when needed | DRIVE-001 | TODO | P1 | M |
| DRIVE-003 | Implement naming convention | Apply naming convention to all visual assets | DRIVE-001 | TODO | P1 | M |
| DRIVE-004 | Implement asset upload | Upload generated images to correct folders | DRIVE-001, DRIVE-003 | TODO | P0 | M |
| DRIVE-005 | Implement URL recording | Record asset URLs in Content Pipeline spreadsheet | DRIVE-004 | TODO | P0 | S |
| DRIVE-006 | Implement version control | Track asset versions and maintain history | DRIVE-004 | TODO | P2 | M |
| DRIVE-007 | Implement access control | Ensure proper permissions for production workers | DRIVE-001 | TODO | P1 | S |
| DRIVE-008 | Test Drive operations | Validate folder creation, upload, and URL recording | DRIVE-001 through DRIVE-007 | TODO | P0 | M |

---

## Apps Script

| Task ID | Title | Description | Dependencies | Status | Priority | Complexity |
|---|---|---|---|---|---|---|
| SCRIPT-001 | Update CONFIG.gs with Visual Production | Add all Visual Production worker configurations | ARCH-002, ARCH-004 | TODO | P0 | M |
| SCRIPT-002 | Add Visual Planner menu items | Add menu items for Visual Planner execution | SCRIPT-001 | TODO | P1 | S |
| SCRIPT-004 | Add Visual QA menu items | Add menu items for Visual QA execution | SCRIPT-001 | TODO | P1 | S |
| SCRIPT-005 | Add Full Pipeline menu item | Add menu item for sequential Visual Production execution | SCRIPT-002, SCRIPT-004 | TODO | P0 | S |
| SCRIPT-006 | Implement Visual Planner execution | Integrate Visual Planner into WorkerRunner.gs | SCRIPT-001, PLAN-001 | TODO | P0 | L |
| SCRIPT-008 | Implement Visual QA execution | Integrate Visual QA into WorkerRunner.gs | SCRIPT-001, QA-001 | TODO | P0 | L |
| SCRIPT-009 | Implement sequential execution | Implement Planner → QA flow | SCRIPT-006, SCRIPT-008 | TODO | P0 | L |
| SCRIPT-010 | Implement parallel execution | Support multiple rows in Visual Production | SCRIPT-009 | TODO | P1 | M |
| SCRIPT-011 | Implement checkpoint support | Save and resume Visual Production state | SCRIPT-009 | TODO | P1 | M |
| SCRIPT-012 | Implement error handling | Catch and report errors in Visual Production | SCRIPT-009 | TODO | P0 | M |
| SCRIPT-013 | Implement retry logic | Retry transient failures in Visual Production | SCRIPT-012 | TODO | P1 | M |
| SCRIPT-014 | Implement timeout detection | Detect and handle long-running Visual Production | SCRIPT-009 | TODO | P1 | M |
| SCRIPT-015 | Update System Status | Add Visual Production health to system status dashboard | SCRIPT-001 | TODO | P2 | S |
| SCRIPT-016 | Test Apps Script integration | Validate all menu items and execution flows | SCRIPT-001 through SCRIPT-015 | TODO | P0 | XL |

---

## QA

| Task ID | Title | Description | Dependencies | Status | Priority | Complexity |
|---|---|---|---|---|---|---|
| QA-001 | Create VISUAL_QA_WORKER.md | Write the Visual QA worker prompt file | ARCH-003, DOC-006 | DONE | P0 | L |
| QA-002 | Define Visual QA input fields | Define all fields the Visual QA reads from the spreadsheet | ARCH-002 | TODO | P0 | S |
| QA-003 | Define Visual QA output fields | Define all fields the Visual QA writes to the spreadsheet | ARCH-002 | TODO | P0 | S |
| QA-004 | Define Visual QA vocabulary | Define controlled vocabulary for Visual QA output columns | ARCH-004 | TODO | P0 | S |
| QA-005 | Implement completeness check | Verify all required elements are present in design prompt | QA-001 | TODO | P0 | M |
| QA-006 | Implement brand alignment check | Verify prompt aligns with hospital brand guidelines | QA-001 | TODO | P0 | M |
| QA-007 | Implement technical feasibility check | Verify prompt can be executed by available tools | QA-001 | TODO | P1 | M |
| QA-008 | Implement emotional match check | Verify visual matches intended emotional impact | QA-001 | TODO | P1 | M |
| QA-009 | Implement quality standard check | Verify prompt meets INSAN premium quality standard | QA-001 | TODO | P0 | M |
| QA-010 | Implement score calibration | Ensure quality scores are not inflated | QA-001 | TODO | P0 | M |
| QA-011 | Implement review status logic | Ensure review statuses are accurate | QA-001 | TODO | P0 | M |
| QA-012 | Implement concise notes | Ensure QA notes are 80-150 words | QA-001 | TODO | P1 | S |
| QA-013 | Test Visual QA with sample data | Run Visual QA on 5+ rows and validate output | QA-001 through QA-012 | TODO | P0 | L |

---

## Testing

| Task ID | Title | Description | Dependencies | Status | Priority | Complexity |
|---|---|---|---|---|---|---|
| TEST-001 | Create test data set | Prepare 10+ rows of realistic Content Pipeline data | None | TODO | P0 | M |
| TEST-002 | Test Visual Planner unit | Test Visual Planner with isolated test data | PLAN-009 | TODO | P0 | M |
| TEST-004 | Test Visual QA unit | Test Visual QA with isolated test data | QA-013 | TODO | P0 | M |
| TEST-005 | Test sequential execution | Test Planner → QA flow end-to-end | SCRIPT-009, TEST-002, TEST-004 | TODO | P0 | L |
| TEST-006 | Test parallel execution | Test multiple rows processed simultaneously | SCRIPT-010, TEST-005 | TODO | P1 | M |
| TEST-007 | Test checkpoint and resume | Test interruption and recovery | SCRIPT-011, TEST-005 | TODO | P1 | M |
| TEST-008 | Test error handling | Test error catching and reporting | SCRIPT-012, TEST-005 | TODO | P1 | M |
| TEST-009 | Test retry logic | Test transient failure recovery | SCRIPT-013, TEST-005 | TODO | P1 | M |
| TEST-010 | Test timeout detection | Test long-running process detection | SCRIPT-014, TEST-005 | TODO | P1 | M |
| TEST-011 | Test data validation bypass | Test that Visual Production bypasses sheet validation | SCRIPT-009, TEST-005 | TODO | P0 | M |
| TEST-012 | Test Drive operations | Test folder creation, upload, and URL recording | DRIVE-008, TEST-005 | TODO | P0 | M |
| TEST-013 | Test column mapping | Test that SheetSchema returns correct indices for all columns | SCRIPT-001, TEST-005 | TODO | P0 | M |
| TEST-014 | Test controlled vocabulary | Test that all controlled vocabulary is enforced | SCRIPT-001, TEST-005 | TODO | P0 | M |
| TEST-015 | Test Execution Log | Test that Visual Production is logged correctly | SCRIPT-009, TEST-005 | TODO | P1 | M |
| TEST-016 | Test System Status | Test that Visual Production health is reported | SCRIPT-015, TEST-005 | TODO | P2 | S |
| TEST-017 | Performance benchmark | Measure processing time per row for each worker | TEST-005 | TODO | P1 | M |
| TEST-018 | Quality benchmark | Rate output quality with human review | TEST-005 | TODO | P0 | L |

---

## Branding

| Task ID | Title | Description | Dependencies | Status | Priority | Complexity |
|---|---|---|---|---|---|---|
| BRAND-001 | Design branding layer architecture | Define how logo placement and brand enforcement will work | ARCH-001 | TODO | P2 | L |
| BRAND-002 | Define hospital brand guidelines | Document brand requirements for each hospital | None | TODO | P2 | M |
| BRAND-003 | Implement logo placement (Phase 2) | Automate logo placement based on hospital brand | BRAND-001, BRAND-002 | TODO | P2 | XL |
| BRAND-004 | Implement brand color enforcement (Phase 2) | Automate brand color palette enforcement | BRAND-001, BRAND-002 | TODO | P2 | L |
| BRAND-005 | Implement font enforcement (Phase 2) | Automate font family enforcement | BRAND-001, BRAND-002 | TODO | P2 | L |
| BRAND-006 | Test branding layer | Validate branding automation with real content | BRAND-003, BRAND-004, BRAND-005 | TODO | P2 | L |

---

## Task Summary

| Group | Total Tasks | P0 | P1 | P2 | S | M | L | XL |
|---|---|---|---|---|---|---|---|---|
| Architecture | 6 | 3 | 3 | 0 | 0 | 5 | 0 | 0 |
| Documentation | 6 | 2 | 3 | 1 | 3 | 2 | 0 | 0 |
| Planner | 9 | 4 | 3 | 0 | 0 | 4 | 2 | 0 |
| Model Router | 7 | 1 | 4 | 1 | 0 | 5 | 0 | 0 |
| Google Drive | 8 | 3 | 3 | 1 | 1 | 3 | 0 | 0 |
| Apps Script | 14 | 7 | 5 | 1 | 3 | 4 | 2 | 1 |
| QA | 13 | 7 | 4 | 0 | 0 | 5 | 2 | 0 |
| Testing | 17 | 6 | 8 | 1 | 1 | 8 | 2 | 0 |
| Branding | 6 | 0 | 0 | 6 | 0 | 1 | 3 | 1 |
| **Total** | **86** | **33** | **37** | **11** | **8** | **37** | **11** | **2** |

---

## Execution Order

### Phase 1: Architecture (Week 1)

1. ARCH-001 → ARCH-002 → ARCH-003 → ARCH-004 → ARCH-005 → ARCH-006 → ARCH-007

### Phase 2: Documentation (Week 1-2)

2. DOC-001 → DOC-002 → DOC-003 → DOC-004 → DOC-005 → DOC-006 → DOC-007

### Phase 3: Sheet Integration (Week 2)

3. Update spreadsheet with all missing columns from VISUAL_SHEET_SCHEMA.md

### Phase 4: Worker Implementation (Week 2-3)

4. PLAN-001 through PLAN-009
5. QA-001 through QA-013

### Phase 5: Infrastructure (Week 3-4)

7. ROUTE-001 through ROUTE-007
8. DRIVE-001 through DRIVE-008

### Phase 6: Apps Script Integration (Week 4-5)

9. SCRIPT-001 through SCRIPT-016

### Phase 7: Testing (Week 5-6)

10. TEST-001 through TEST-018

### Phase 8: Branding (Phase 2 - Deferred)

11. BRAND-001 through BRAND-006

---

## Critical Path

The following tasks are on the critical path and must be completed in order:

1. ARCH-001 (Architecture)
2. ARCH-002 (Sheet Schema)
3. SCRIPT-001 (CONFIG.gs)
4. PLAN-001 (Visual Planner Prompt)
5. QA-001 (Visual QA Prompt)
6. SCRIPT-006 (Planner Execution)
7. SCRIPT-008 (QA Execution)
8. SCRIPT-009 (Sequential Execution)
9. TEST-005 (End-to-End Test)
10. TEST-018 (Quality Benchmark)

---

End of Visual Production Tasks.
