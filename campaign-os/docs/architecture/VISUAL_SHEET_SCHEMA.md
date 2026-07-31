# Visual Sheet Schema

INSAN Healthcare AI Operating System

Version: 8.0

Status: **Current** — the Visual Pipeline columns as they are. The Publishing
Service columns reserved below are now written by W9. See docs/DOCUMENT_STATUS.md.

Date: July 2026

---

## Overview

This document defines the columns in both the Content Pipeline and Visual Pipeline spreadsheet tabs.

**Content Pipeline** — The Editorial Pipeline. Strategy, writing, and creative direction only.

**Visual Pipeline** — The Production Pipeline. Divided into two sections.

- **Section A: Read-Only** — Auto-populated from Content Pipeline via formulas or automated transfer. No Visual worker may modify these columns.
- **Section B: Visual Production** — Only the designated workers may write to these columns.

The Content Pipeline is the Source of Truth. Only approved rows transfer to the Visual Pipeline.

---

## Architecture Principle

**The Creative Director is the Source of Truth and the Creative Package Owner.**

Section A contains the complete Creative Package. The Creative Director owns the final approved version of every creative field. No Visual worker may rewrite or duplicate any Section A data.

---

## Content Pipeline Columns

The Content Pipeline remains unchanged.

### Business Context

| Column Name | Used By | Purpose | Required | Read/Write |
|---|---|---|---|---|
| Publishing Date | Strategy, Creation, Creative Director | Scheduled publish date | Yes | Read/Write |
| Calendar ID | Strategy, Creation, Creative Director | Calendar event identifier | No | Read/Write |
| Publishing Page | Strategy, Creation, Creative Director | Target Facebook page | Yes | Read/Write |
| Campaign Group | Strategy, Creation, Creative Director | Campaign grouping | Yes | Read/Write |
| Campaign Name | Strategy, Creation, Creative Director | Campaign identifier | Yes | Read/Write |
| Hospital Brand | Strategy, Creation, Creative Director | Hospital brand | Yes | Read/Write |
| Campaign Philosophy | Strategy (Read), Creation, Creative Director | Campaign philosophy | Yes | Read |
| Trust Platform | Strategy (Read), Creation, Creative Director | Trust platform | Yes | Read |
| Core Message | Strategy (Read), Creation, Creative Director | Core message | Yes | Read |
| Trust Promise | Strategy (Read), Creation, Creative Director | Trust promise | Yes | Read |
| Emotional Trigger | Strategy (Read), Creation, Creative Director | Emotional trigger | Yes | Read |
| Psychological Barrier | Strategy (Read), Creation, Creative Director | Psychological barrier | Yes | Read |
| Content Pillars | Strategy (Read), Creation, Creative Director | Content pillars | Yes | Read |
| Approved Content Angles | Strategy (Read), Creation, Creative Director | Approved angles | Yes | Read |
| Non-Negotiable Rules | Strategy (Read), Creation, Creative Director | Non-negotiable rules | Yes | Read |
| CTA Strategy | Strategy (Read), Creation, Creative Director | CTA strategy | Yes | Read |
| Primary KPI | Strategy (Read), Creation, Creative Director | Primary KPI | Yes | Read |
| Target Audience | Strategy (Read), Creation, Creative Director | Target audience | Yes | Read |

### Creative Direction

| Column Name | Used By | Purpose | Required | Read/Write |
|---|---|---|---|---|
| Content Objective | Strategy (Write), Creation, Creative Director | Content objective | Yes | Read/Write |
| Content Angle | Strategy (Write), Creation, Creative Director | Strategic angle | Yes | Read/Write |
| Content Type | Strategy (Write), Creation, Creative Director | Content type | Yes | Read/Write |
| Content Format | Strategy (Write), Creation, Creative Director | Content format | Yes | Read/Write |
| Content Funnel Stage | Strategy (Write), Creation, Creative Director | Funnel stage | Yes | Read/Write |
| Hook | Strategy (Write), Creation, Creative Director | Opening hook | Yes | Read/Write |
| Post Structure | Strategy (Write), Creation, Creative Director | Post structure | Yes | Read/Write |
| Language Style | Strategy (Write), Creation, Creative Director | Language style | Yes | Read/Write |
| Emoji Style | Strategy (Write), Creation, Creative Director | Emoji style | Yes | Read/Write |

### Visual Strategy

| Column Name | Used By | Purpose | Required | Read/Write |
|---|---|---|---|---|
| Visual Concept | Strategy (Write), Creation, Creative Director | Visual concept | Yes | Read/Write |
| Visual Focus | Strategy (Write), Creation, Creative Director | Visual focus | Yes | Read/Write |
| Visual Priority | Strategy (Write), Creation, Creative Director | Visual priority | Yes | Read/Write |
| Design Mood | Strategy (Write), Creation, Creative Director | Design mood | Yes | Read/Write |
| Composition | Strategy (Write), Creation, Creative Director | Composition | Yes | Read/Write |
| Visual Elements | Strategy (Write), Creation, Creative Director | Visual elements | No | Read/Write |
| Do NOT Show | Strategy (Write), Creation, Creative Director | Exclusion list | No | Read/Write |
| Text On Design | Strategy (Write), Creation, Creative Director | Text on design | No | Read/Write |
| Design Notes | Strategy (Write), Creation, Creative Director | Design notes | No | Read/Write |

### Copy

| Column Name | Used By | Purpose | Required | Read/Write |
|---|---|---|---|---|
| Post Copy (AI) | Creation (Write), Creative Director (Read/Write) | Facebook post copy | Yes | Read/Write |
| Primary Hashtags | Creation (Write), Creative Director | Primary hashtags | No | Read/Write |
| Secondary Hashtags | Creation (Write), Creative Director | Secondary hashtags | No | Read/Write |

### Creative Director Review

| Column Name | Used By | Purpose | Required | Read/Write |
|---|---|---|---|---|
| Creative Director Quality Score | Creative Director (Write) | Quality score | Yes | Read/Write |
| Creative Director Review Status | Creative Director (Write) | Review decision | Yes | Read/Write |
| Creative Director Notes | Creative Director (Write) | Coaching notes | Yes | Read/Write |
| Creative Director Post Copy | Creative Director (Write) | Final post copy | Yes | Read/Write |
| Creative Director Design Prompt | Creative Director (Write) | Final design prompt | Yes | Read/Write |

### System

| Column Name | Used By | Purpose | Required | Read/Write |
|---|---|---|---|---|
| Content ID | System | Unique identifier (CNT-XXXXXX) | Yes | Read/Write |
| Revision Number | System | Revision number | Yes | Read/Write |
| Workflow Status | System | Workflow status | Yes | Read/Write |
| AI Worker | System | Last modifying worker | Yes | Read/Write |
| Notes | System | General notes | No | Read/Write |

---

## Visual Pipeline Columns

The Visual Pipeline is a separate tab divided into two sections.

### Section A: Read-Only (Auto-Populated)

These columns are populated automatically from the Content Pipeline via spreadsheet formulas (ARRAYFORMULA / XLOOKUP) or automated transfer. No Visual worker may modify these columns.

#### Transfer Fields (17 columns)

| Column Name | Source | Purpose |
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

#### Transfer Trigger

Creative Director Review Status = "Approved"

#### Transfer Direction

Content Pipeline → Visual Pipeline (one-way, formula-based)

The Visual Pipeline never writes back to the Content Pipeline.

---

### Section B: Visual Production (Worker Write)

Each column has exactly one owner. No orphan columns.

#### Visual Stage

| Column Name | Owner | Purpose | Allowed Values |
|---|---|---|---|
| VISUAL_STAGE | Orchestration Layer | Master production state | READY, PLANNING, GENERATING, QA, PUBLISHING, COMPLETED, FAILED |

**Note:** VISUAL_STAGE is owned by the orchestration layer (WorkerRunner). Workers report completion status. The orchestration layer performs all state transitions.

#### Visual Planner Output

| Column Name | Owner | Purpose |
|---|---|---|
| Asset Count | Visual Planner | Number of media assets to generate |
| Production Mode | Visual Planner | PROJECT_ASSET or AI_GENERATED |
| Reference Asset Package | Visual Planner | Structured brief for Media Generation Service |

#### Media Generation Service Output

| Column Name | Owner | Purpose |
|---|---|---|
| Generated Assets | Media Generation Service | One or multiple generated files |
| Generation Status | Media Generation Service | Generation status |
| Generation Timestamp | Media Generation Service | When generated |

#### Visual QA Output

| Column Name | Owner | Purpose |
|---|---|---|
| Visual QA Score | Visual QA | Quality score |
| Visual QA Decision | Visual QA | Approved/Revision/Rejected |
| Visual QA Notes | Visual QA | Feedback notes |
| Final Asset URL | Visual QA | URL of approved assets (on approval only) |

#### Publishing Service Output (RESERVED)

| Column Name | Owner | Purpose |
|---|---|---|
| Publishing Status | Publishing Service | Publishing status |
| Publishing Timestamp | Publishing Service | When published |
| Live Post URL | Publishing Service | Facebook post URL |

#### System

| Column Name | Owner | Purpose |
|---|---|---|
| AI Worker | Every Worker | Last modifying worker |

---

## Column Count Summary

| Pipeline | Section | Columns | Purpose |
|---|---|---|---|
| Content Pipeline | — | ~42 | Strategy, writing, creative direction |
| Visual Pipeline | Section A (Read-Only) | 17 | Auto-populated Creative Package |
| Visual Pipeline | Section B (Write) | 12 | Visual production by workers |
| **Total** | — | ~71 | Complete content lifecycle |

---

## Column Ownership Matrix

| Section B Column | Owner | Multi-Writer |
|---|---|---|
| VISUAL_STAGE | Orchestration Layer | No — single writer |
| Asset Count | Visual Planner | No |
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
| AI Worker | Every Visual Worker | Yes (last writer wins) |

---

## Access Control Rules

1. **Section A columns are read-only.** No Visual worker may modify these columns.

2. **Section B columns have exactly one owner.** No orphan columns. No undefined ownership.

3. **VISUAL_STAGE is owned by the orchestration layer.** Workers report completion. WorkerRunner performs all state transitions.

4. **Content Pipeline is the Source of Truth.** Visual Pipeline never writes back to Content Pipeline.

5. **Transfer is one-way.** Content Pipeline → Visual Pipeline via formulas or automated transfer.

6. **Visual Planner writes to Asset Count only.**

7. **Media Generation Service writes to Generated Assets, Generation Status, and Generation Timestamp.**

8. **Visual QA writes to Visual QA Score, Visual QA Decision, Visual QA Notes, and Final Asset URL.**

9. **Publishing Service (RESERVED) writes to Publishing Status, Publishing Timestamp, and Live Post URL.**

10. **AI Worker column is per-pipeline.** Content workers write to Content Pipeline. Visual workers write to Visual Pipeline.**

---

## Key Architecture Principles

1. **Creative Director is Source of Truth and Creative Package Owner** — The Creative Package in Section A is complete. The Creative Director owns the final approved version of every creative field. No worker recreates it.

2. **Content Strategy and Content Creation produce drafts** — Their outputs are first versions. The Creative Director owns the final approved version.

3. **Visual Planner is Production Readiness** — Validates completeness, does not create.

4. **Spreadsheet is Persistent Database** — Only write columns that store NEW production information. Temporary data stays in memory.

5. **No Duplicated Data** — Section B does not duplicate Section A. Each column stores unique information.

6. **Every column has exactly one owner** — No orphan columns. No undefined ownership.

---

End of Visual Sheet Schema.
