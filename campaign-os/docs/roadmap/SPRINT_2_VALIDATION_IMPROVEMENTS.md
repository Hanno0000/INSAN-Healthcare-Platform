# Sprint 2 — Visual Production Quality Hardening

**Source of Truth:** Validation Run #001
**Status:** IN PROGRESS
**Objective:** Raise quality of the next Production Run. No feature additions.

---

## Sprint Philosophy

Sprint 2 is not a feature sprint.

Sprint 2 is: **Visual Production Quality Hardening**

The only goal: improve the quality of the next Production Run.

Any change that does not improve the next Production Run quality is deferred.

---

## Executive Summary

Sprint 2 was created from the first Production Validation Run.

Validation was performed from two independent perspectives:
- Generated Assets Validation
- Pipeline Data Validation

The review produced:
- 10 Visual Production Findings (VP)
- 10 Pipeline Data Findings (DP)

Every finding has been converted into engineering work owned by specific Workers.

---

## Validation Methodology

### Stage A — Generated Assets Validation

Generated images were reviewed independently.

Focus areas included:
- Visual Quality
- Storytelling
- Typography
- Egyptian Identity
- Production Readiness
- Facebook Feed Performance

These findings became the VP findings.

### Stage B — Pipeline Data Validation

The first two rows only were reviewed from:
- Content Pipeline
- Visual Pipeline

The review focused on:
- Worker outputs
- Creative Package consistency
- Information flow
- Field ownership
- Production readiness

These findings became the DP findings.

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

**Evidence**

Prompt metadata such as production terminology appeared inside generated artwork instead of remaining internal instructions.

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

**Evidence**

Generated artwork rendered English text despite Arabic campaign content.

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

**Evidence**

Generated characters and environments appeared generic international rather than recognizably Egyptian.

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

**Evidence**

Generated artwork contained unintended branding and platform references.

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

**Evidence**

Most generated visuals depicted static medical scenes without a recognizable human narrative moment.

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

**Evidence**

Multiple generated assets shared nearly identical composition and framing despite different content.

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

**Evidence**

Generated typography showed weak hierarchy, spacing, and layout quality.

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

**Evidence**

Arabic rendering quality included spelling and text rendering problems.

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

**Evidence**

Some outputs resembled concept boards or presentation mockups rather than final publish-ready artwork.

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

**Evidence**

Generated visuals were aesthetically strong but lacked sufficient scroll-stopping impact for Facebook.

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

## Pipeline Data Validation Findings

---

### DP-001 — Mixed Language Creative Package

**Status:** TODO

**Description**

The Creative Package contains inconsistent language usage across fields.

Examples:
- Strategy fields in English.
- Post Copy in Arabic.
- Design Prompt in English.
- Text On Design in English.

There is no unified language policy across the package.

**Evidence**

Creative Package fields mixed Arabic and English without a consistent language policy.

**Impact:** Critical

**Root Cause**

Creative Director does not enforce a package-wide language policy.

**Primary Owner:** Creative Director

**Supporting Workers:** Content Strategy

**Resolution Plan**

| Worker | Change |
|--------|--------|
| Creative Director | Enforce a single language policy across the entire Creative Package. |
| Content Strategy | Ensure strategy fields follow the selected language policy where applicable. |

**Acceptance Criteria:** All Creative Package fields follow a consistent language policy appropriate for the campaign.

---

### DP-002 — Design Prompt Isolated From Visual Package

**Status:** TODO

**Description**

The Creative Director Design Prompt behaves like an independent document instead of being the execution layer of the Visual Package.

Visual Concept, Visual Elements, Design Notes and Design Prompt partially duplicate each other.

The system currently has multiple creative sources of truth.

**Evidence**

Visual Concept, Visual Elements, Design Notes and Design Prompt partially duplicated one another, creating multiple creative sources of truth.

**Impact:** Critical

**Root Cause**

Design Prompt reconstructs the creative direction instead of translating existing visual fields into production instructions.

**Primary Owner:** Creative Director

**Supporting Workers:** Visual Planner

**Resolution Plan**

| Worker | Change |
|--------|--------|
| Creative Director | Redefine the Design Prompt as the execution layer of the Visual Package instead of a second creative document. |
| Visual Planner | Consume structured visual fields without relying on duplicated prompt content. |

**Acceptance Criteria:** The Design Prompt becomes a production translation of the Visual Package rather than an independent creative specification.

---

### DP-003 — Text On Design Contains Production Instructions

**Status:** TODO

**Description**

Text On Design contains production scripting such as:
- Slide 1
- Slide 2
- Card 1

instead of the exact text intended to appear inside the artwork.

This likely contributed to the rendered "Slide 1" problem.

**Evidence**

Text On Design contained production scripting such as Slide 1 / Slide 2 instead of final visible artwork text.

**Impact:** Critical

**Root Cause**

Creative Director outputs production scripting instead of publish-ready design text.

**Primary Owner:** Creative Director

**Supporting Workers:** Media Generation, Visual QA

**Resolution Plan**

| Worker | Change |
|--------|--------|
| Creative Director | Text On Design must contain only the final visible text. |
| Media Generation | Ignore any production scripting if present. |
| Visual QA | Reject artwork containing slide labels or production metadata. |

**Acceptance Criteria:** Text On Design contains only publish-ready visible text.

---

### DP-004 — Egyptian Identity Not Explicitly Encoded

**Status:** TODO

**Description**

The Visual Package does not consistently encode Egyptian healthcare identity requirements.

The package relies on implication instead of explicit production rules.

**Evidence**

Egyptian healthcare identity was implied but not consistently encoded as explicit production requirements.

**Impact:** High

**Primary Owner:** Creative Director

**Supporting Workers:** Visual Planner, Media Generation, Visual QA

**Resolution Plan**

| Worker | Change |
|--------|--------|
| Creative Director | Encode mandatory Egyptian healthcare identity rules directly into the Visual Package. |
| Visual Planner | Preserve these rules inside the Generation Brief. |
| Media Generation | Apply them during generation. |
| Visual QA | Reject generic international environments. |

**Acceptance Criteria:** Egyptian identity is explicitly represented throughout the Creative Package.

---

### DP-005 — Visual Package Field Duplication

**Status:** TODO

**Description**

Several visual fields repeat the same information:
- Visual Concept
- Visual Elements
- Design Notes
- Design Prompt

instead of serving distinct responsibilities.

**Evidence**

Multiple visual fields repeated similar information instead of serving clearly separated responsibilities.

**Impact:** High

**Root Cause**

Field ownership is insufficiently separated.

**Primary Owner:** Creative Director

**Supporting Workers:** Visual Planner

**Resolution Plan**

| Worker | Change |
|--------|--------|
| Creative Director | Clearly separate responsibilities for each visual field. |
| Visual Planner | Consume each field according to its intended responsibility only. |

**Acceptance Criteria:** Each visual field contributes unique information without unnecessary duplication.

---

### DP-006 — Excessive Prompt Boilerplate

**Status:** TODO

**Description**

Design Prompts repeat large blocks of identical boilerplate across campaigns.

Campaign-specific creative decisions become diluted.

**Evidence**

Design Prompts reused large blocks of repeated boilerplate rather than focusing on campaign-specific creative direction.

**Impact:** High

**Primary Owner:** Creative Director

**Supporting Workers:** Media Generation

**Resolution Plan**

| Worker | Change |
|--------|--------|
| Creative Director | Move permanent visual standards into the Worker Prompt and keep row-level prompts campaign-specific. |
| Media Generation | Rely on worker-level standards rather than repeated prompt boilerplate. |

**Acceptance Criteria:** Row-level Design Prompts contain only campaign-specific creative direction.

---

### DP-007 — Visual Package Prioritizes Scene Over Moment

**Status:** TODO

**Description**

Visual Packages describe environments well but often fail to encode a clear human moment.

**Evidence**

Visual Packages described environments effectively but often lacked an explicit narrative human moment.

**Impact:** Medium

**Primary Owner:** Creative Director

**Supporting Workers:** Visual Planner, Media Generation

**Resolution Plan**

| Worker | Change |
|--------|--------|
| Creative Director | Make the narrative moment mandatory within the Visual Package. |
| Visual Planner | Preserve the narrative moment during generation planning. |
| Media Generation | Generate the defined human moment rather than only the environment. |

**Acceptance Criteria:** Every Visual Package defines a recognizable human moment.

---

### DP-008 — Missing Visual Text Safety Rules

**Status:** TODO

**Description**

The Creative Package does not explicitly prohibit:
- Metadata
- Extra generated text
- Platform names
- Slide numbers
- Internal labels

**Evidence**

The Creative Package did not explicitly prohibit metadata, internal labels, platform names or unintended generated text.

**Impact:** High

**Primary Owner:** Creative Director

**Supporting Workers:** Media Generation, Visual QA

**Resolution Plan**

| Worker | Change |
|--------|--------|
| Creative Director | Add explicit text safety rules to the Creative Package. |
| Media Generation | Never generate forbidden text elements. |
| Visual QA | Reject forbidden visible text immediately. |

**Acceptance Criteria:** Forbidden text rules become part of every Creative Package.

---

### DP-009 — Visual QA Validation Too Permissive

**Status:** TODO

**Description**

Visual QA approved packages that produced images with major production failures.

QA evaluation is not aligned with actual production quality.

**Evidence**

Visual QA approved packages whose generated outputs later exhibited significant production defects.

**Impact:** Critical

**Primary Owner:** Visual QA

**Supporting Workers:** Creative Director, Media Generation

**Resolution Plan**

| Worker | Change |
|--------|--------|
| Visual QA | Expand validation criteria to reflect real production outcomes. |
| Creative Director | Provide stronger production expectations. |
| Media Generation | Produce outputs compatible with QA rules. |

**Acceptance Criteria:** QA approval accurately predicts production quality.

---

### DP-010 — Worker Execution Log Redundancy

**Status:** TODO

**Description**

Worker execution logs contain repeated worker names, reducing audit readability.

**Evidence**

Worker execution logs contained redundant worker names, reducing audit clarity.

**Impact:** Low

**Primary Owner:** System Logging

**Supporting Workers:** All Workers

**Resolution Plan**

| Worker | Change |
|--------|--------|
| System Logging | Normalize worker execution logging and remove redundant entries. |

**Acceptance Criteria:** Execution logs clearly represent worker execution history without duplication.

---

## Ownership Philosophy

Every Finding has one Primary Owner.

Supporting Workers assist implementation but do not own the Finding.

Sprint execution follows Worker Ownership.

Each Worker is completed before moving to the next Worker.

---

## Sprint Execution Strategy

Sprint is executed by Ownership, not by problem.

Each worker is completed fully before moving to the next.

---

### Step 0 — Ownership Verification

**Status:** DONE

**Scope:** Verify ownership of DP-002, DP-005, DP-006, DP-007 against Worker Contracts, Prompt Responsibilities, and Sprint Ownership.

**Result:** All four findings have correct Primary Owner and Supporting Workers. No conflicts found. No ownership changes required.

**Verified Findings:**

| Finding | Primary Owner | Supporting | Verified |
|---------|--------------|------------|----------|
| DP-002 | Creative Director | Visual Planner | ✅ |
| DP-005 | Creative Director | Visual Planner | ✅ |
| DP-006 | Creative Director | Media Generation | ✅ |
| DP-007 | Creative Director | Visual Planner, Media Generation | ✅ |

---

### Step 1 — Creative Director Worker

**Responsible For:**

| Finding | Type | Ownership |
|---------|------|-----------|
| VP-001 | Visual | Part of (Design Prompt clarity) |
| VP-002 | Visual | Part of (language specification) |
| VP-003 | Visual | Full (Egyptian identity rules) |
| VP-005 | Visual | Full (storytelling moments) |
| VP-006 | Visual | Full (composition diversity) |
| VP-009 | Visual | Part of (final artwork requirement) |
| VP-010 | Visual | Full (Feed performance criteria) |
| DP-001 | Data | Full (language policy enforcement) |
| DP-002 | Data | Full (Design Prompt as execution layer) |
| DP-003 | Data | Full (Text On Design = visible text only) |
| DP-004 | Data | Full (Egyptian identity encoding) |
| DP-005 | Data | Full (field responsibility separation) |
| DP-006 | Data | Full (boilerplate reduction) |
| DP-007 | Data | Full (narrative moment mandatory) |
| DP-008 | Data | Full (text safety rules) |

**Status:** TODO

---

### Step 2 — Visual Planner Worker

**Responsible For:**

| Finding | Type | Ownership |
|---------|------|-----------|
| VP-001 | Visual | Part of (Generation Brief distinction) |
| VP-003 | Visual | Part of (transfer Egyptian rules) |
| VP-006 | Visual | Part of (enforce composition variety) |
| VP-009 | Visual | Part of (enforce final output) |
| DP-002 | Data | Part of (consume structured fields) |
| DP-004 | Data | Part of (preserve Egyptian rules) |
| DP-005 | Data | Part of (consume fields by responsibility) |
| DP-007 | Data | Part of (preserve narrative moment) |

**Status:** TODO

---

### Step 3 — Media Generation Service

**Responsible For:**

| Finding | Type | Ownership |
|---------|------|-----------|
| VP-001 | Visual | Full (prevent metadata rendering) |
| VP-002 | Visual | Full (enforce language compliance) |
| VP-004 | Visual | Full (suppress branding generation) |
| VP-007 | Visual | Full (text layout quality) |
| VP-008 | Visual | Full (Arabic rendering quality) |
| VP-009 | Visual | Full (final artwork only) |
| VP-010 | Visual | Part of (Feed attention optimization) |
| DP-003 | Data | Part of (ignore production scripting) |
| DP-004 | Data | Part of (apply Egyptian identity) |
| DP-006 | Data | Part of (rely on worker-level standards) |
| DP-007 | Data | Part of (generate defined moment) |
| DP-008 | Data | Part of (never generate forbidden text) |
| DP-009 | Data | Part of (produce QA-compatible outputs) |

**Status:** TODO

---

### Step 4 — Visual QA Worker

**Responsible For:**

| Finding | Type | Ownership |
|---------|------|-----------|
| VP-001 | Visual | Part of (automatic reject on metadata) |
| VP-002 | Visual | Part of (reject wrong language) |
| VP-003 | Visual | Part of (reject generic environment) |
| VP-004 | Visual | Part of (reject generated branding) |
| VP-005 | Visual | Part of (evaluate narrative moment) |
| VP-007 | Visual | Part of (verify text layout) |
| VP-008 | Visual | Part of (check Arabic spelling) |
| VP-009 | Visual | Part of (reject mockups) |
| VP-010 | Visual | Part of (evaluate Feed power) |
| DP-003 | Data | Part of (reject production metadata in art) |
| DP-004 | Data | Part of (reject generic international) |
| DP-008 | Data | Part of (reject forbidden visible text) |
| DP-009 | Data | Full (expand validation criteria) |

**Status:** TODO

---

### Step 5 — Content Strategy Worker

**Responsible For:**

| Finding | Type | Ownership |
|---------|------|-----------|
| DP-001 | Data | Part of (follow language policy) |

**Status:** TODO

---

### Step 6 — System Logging

**Responsible For:**

| Finding | Type | Ownership |
|---------|------|-----------|
| DP-010 | Data | Full (normalize execution logging) |

**Status:** TODO

---

## Completion Rule

Production Validation Run #002 does not begin until:

1. All Sprint 2 steps are complete.
2. All worker prompts, contracts, and affected documentation are updated.
3. All items are changed to DONE or officially deferred with a documented decision.

This document is the sole Source of Truth for Sprint 2. No scattered information from conversations is relied upon. Every validation issue becomes structured engineering work and is never forgotten or re-discovered in later sessions.

---

## Current Sprint Status

**Current Phase:** Step 0 — Ownership Verification (Completed)

**Current Status:** Ownership map verified. Worker Contracts, Worker Responsibilities and Sprint Ownership are fully aligned. No ownership changes were required.

**Next Step:** Step 1 — Creative Director Worker Review

**Current Objective:** Review the Creative Director Worker Contract and Prompt against every assigned VP and DP Finding before implementing prompt modifications.
