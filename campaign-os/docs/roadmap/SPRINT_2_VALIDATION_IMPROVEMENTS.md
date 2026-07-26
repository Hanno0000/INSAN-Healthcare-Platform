# Sprint 2 — Visual Production Quality Hardening

**Source of Truth:** Validation Run #001
**Status:** READY
**Objective:** Raise quality of the next Production Run. No feature additions.

---

## Sprint Philosophy

Sprint 2 is not a feature sprint.

Sprint 2 is: **Visual Production Quality Hardening**

The only goal: improve the quality of the next Production Run.

Any change that does not improve the next Production Run quality is deferred.

---

## Validation Findings

---

### VP-001 — Prompt Metadata Leakage

**Status:** TODO

**Description**

Media Generation displays parts of the prompt instructions inside the final design.

Examples:
- Slide 1 of 4
- Slide 2
- Card 1
- Premium Carousel Concept
- Style Ratio
- 70% Stylized Realism
- Editorial Illustration

These are all production instructions, not part of the design.

**Impact:** Critical

**Root Cause**

Media Generation treats parts of the prompt as visual content to be rendered.

**Primary Owner:** Media Generation Service

**Supporting Workers:** Visual QA, Visual Planner, Creative Director

**Resolution Plan**

| Worker | Change |
|--------|--------|
| Media Generation | Completely prevent rendering of any prompt metadata. Treat as internal instructions only. |
| Visual QA | Any appearance of these elements = Automatic Reject. |
| Visual Planner | Generation Brief must clearly distinguish between Production Instructions and Visible Design Content. |
| Creative Director | Design Prompt must explicitly state what is visible vs. what is internal. |

**Acceptance Criteria:** No prompt metadata appears in any generated image.

---

### VP-002 — Wrong Language Rendering

**Status:** TODO

**Description**

Text renders in English while the platform is Arabic.

**Impact:** High

**Root Cause**

Media Generation does not enforce the language specified in Text On Design.

**Primary Owner:** Media Generation Service

**Supporting Workers:** Creative Director, Visual QA

**Resolution Plan**

| Worker | Change |
|--------|--------|
| Media Generation | Must comply with Text On Design language only. No replacement or translation allowed. |
| Visual QA | Reject any text in the wrong language. |
| Creative Director | Specify the required language explicitly inside the Creative Package. |

**Acceptance Criteria:** All text inside images appears in the specified language only.

---

### VP-003 — Generic International Visual Identity

**Status:** TODO

**Description**

Characters and environment appear European/American. Do not reflect the Egyptian environment.

**Impact:** Critical

**Root Cause**

Creative Package does not enforce Egyptian visual identity rules.

**Primary Owner:** Creative Director

**Supporting Workers:** Visual Planner, Media Generation, Visual QA

**Resolution Plan**

| Worker | Change |
|--------|--------|
| Creative Director | Add Egyptian healthcare visual identity rules: Egyptian healthcare staff, Egyptian patients, Egyptian families, Egyptian hospital environment, hijab where appropriate, local architecture, local demographics. |
| Visual Planner | Ensure these requirements transfer into the Generation Brief. |
| Media Generation | Implement them. |
| Visual QA | Reject any generic environment. |

**Acceptance Criteria:** The viewer feels the image represents an Egyptian hospital.

---

### VP-004 — Unauthorized Branding

**Status:** TODO

**Description**

Appearance of:
- INSAN
- INSAN Platform
- Logos
- Hospital Names

inside generated images.

**Impact:** High

**Root Cause**

Media Generation does not suppress brand-related content generation.

**Primary Owner:** Media Generation

**Supporting Workers:** Visual QA

**Resolution Plan**

| Worker | Change |
|--------|--------|
| Media Generation | Do not create any branding. Branding will be added later outside the system. |
| Visual QA | Reject any generated logo or brand name. |

**Acceptance Criteria:** No generated logo or brand name appears in any image.

---

### VP-005 — Weak Visual Storytelling

**Status:** TODO

**Description**

Most images are:
- Doctor standing
- Nurse standing
- Inside a room

No human moments.

**Impact:** High

**Root Cause**

Design Prompts lack storytelling direction.

**Primary Owner:** Creative Director

**Supporting Workers:** Media Generation, Visual QA

**Resolution Plan**

| Worker | Change |
|--------|--------|
| Creative Director | Enrich Design Prompt with real storytelling moments. |
| Visual QA | Evaluate presence of Narrative Moment. |

**Acceptance Criteria:** Each image contains a clear moment.

---

### VP-006 — Repetitive Composition

**Status:** TODO

**Description**

Same image composition repeated across outputs.

**Impact:** Medium

**Root Cause**

No composition diversity rules based on content type.

**Primary Owner:** Creative Director

**Supporting Workers:** Visual Planner, Media Generation

**Resolution Plan**

| Worker | Change |
|--------|--------|
| Creative Director | Add composition diversity rules based on content type. |
| Visual Planner | Enforce composition variety in the Generation Brief. |

**Acceptance Criteria:** Clear visual diversity between images.

---

### VP-007 — Text Layout Quality

**Status:** TODO

**Description**

Weak typography. Text overlap. No hierarchy.

**Impact:** High

**Root Cause**

Media Generation does not enforce text layout standards.

**Primary Owner:** Media Generation

**Supporting Workers:** Visual QA

**Resolution Plan**

| Worker | Change |
|--------|--------|
| Media Generation | Improve layout. Improve text readability. Prevent element overlap. |
| Visual QA | Verify text layout quality. |

**Acceptance Criteria:** All text is readable and has clear hierarchy.

---

### VP-008 — Arabic Rendering Quality

**Status:** TODO

**Description**

Spelling errors. Arabic text rendering issues.

**Impact:** High

**Root Cause**

Media Generation Arabic rendering is unreliable.

**Primary Owner:** Media Generation

**Supporting Workers:** Visual QA

**Resolution Plan**

| Worker | Change |
|--------|--------|
| Media Generation | Improve Arabic rendering quality. |
| Visual QA | Check for Arabic spelling errors. |

**Acceptance Criteria:** No Arabic errors in any generated image.

---

### VP-009 — Mockup Instead of Final Artwork

**Status:** TODO

**Description**

Model sometimes generates preview, mockup, or concept board instead of final design.

**Impact:** Critical

**Root Cause**

Media Generation does not distinguish between concept and final output.

**Primary Owner:** Media Generation

**Supporting Workers:** Creative Director, Visual Planner, Visual QA

**Resolution Plan**

| Worker | Change |
|--------|--------|
| Media Generation | Produce Final Publish-Ready Artwork only. |
| Creative Director | Design Prompt specifies final artwork requirement. |
| Visual Planner | Generation Brief enforces final output. |
| Visual QA | Reject any mockup or presentation layout. |

**Acceptance Criteria:** No mockup or presentation layout is produced.

---

### VP-010 — Weak Facebook Feed Presence

**Status:** TODO

**Description**

Images are beautiful but do not stop the user during scrolling. Look like AI images rather than professional social media content.

**Impact:** High

**Root Cause**

Visual success criteria are based on drawing quality, not Facebook Feed performance.

**Primary Owner:** Creative Director

**Supporting Workers:** Media Generation, Visual QA

**Resolution Plan**

| Worker | Change |
|--------|--------|
| Creative Director | Redefine visual success criteria to serve Facebook content performance, not just drawing quality. |
| Media Generation | Optimize for Feed attention. |
| Visual QA | Evaluate Feed scroll-stopping power. |

**Acceptance Criteria:** The design grabs attention quickly and delivers a clear message inside the Feed.

---

## Sprint Execution Strategy

Sprint is executed by Ownership, not by problem.

Each worker is completed fully before moving to the next.

---

### Step 1 — Creative Director Worker

**Responsible For:**
- VP-003
- VP-005
- VP-006
- VP-010
- Part of VP-001
- Part of VP-002
- Part of VP-009

**Status:** TODO

---

### Step 2 — Visual Planner Worker

**Responsible For:**
- VP-001
- VP-003
- VP-006
- VP-009

**Status:** TODO

---

### Step 3 — Media Generation Service

**Responsible For:**
- VP-001
- VP-002
- VP-004
- VP-007
- VP-008
- VP-009
- VP-010

**Status:** TODO

---

### Step 4 — Visual QA Worker

**Responsible For:**
- VP-001
- VP-002
- VP-003
- VP-004
- VP-005
- VP-007
- VP-008
- VP-009
- VP-010

**Status:** TODO

---

## Completion Rule

Production Validation Run #002 does not begin until:

1. All Sprint 2 steps are complete.
2. All worker prompts, contracts, and affected documentation are updated.
3. All items are changed to DONE or officially deferred with a documented decision.

This document is the sole Source of Truth for Sprint 2. No scattered information from conversations is relied upon. Every validation issue becomes structured engineering work and is never forgotten or re-discovered in later sessions.
