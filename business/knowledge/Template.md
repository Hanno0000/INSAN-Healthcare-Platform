# Knowledge File Template

> Copy this file, rename it per `KNOWLEDGE_BASE_SPEC.md` §3, and fill every section.
>
> **Who reads this.** AI workers that know nothing about INSAN, cannot infer, and will
> not ask. If a fact is not written here, it does not exist. Write for that reader.
>
> **When is it done?** Not when every heading has a sentence. It is done when a worker
> that has read only this file could write a month of campaign content about this
> entity without inventing a single fact.
>
> **Reference implementation:** `departments/MEDICAL_DEPARTMENT_ICU.md` (2,761 lines).
>
> `→ Campaign Cards.X` markers show which card column a section feeds. Sections marked
> **[REQUIRED]** will cause the Campaign Card Builder to fail if left empty.
>
> Delete this instruction block when you start writing.

---

```yaml
---
entity_id:      # MED-003
entity_name_en: #
entity_name_ar: #
service_level:  # DEPARTMENT | CENTER | CLINIC | PROGRAM | CORPORATE | HOSPITAL | SUPPORTING
campaign_type:  # Corporate | Hospital | Medical Services | Signature Programs | Educational | Supporting
parent:         # null, or the parent hospital / center
hospitals:      # [Future, Delta]
status:         # Active | Paused
version:        1.0
last_updated:   # YYYY-MM-DD
---
```

---

# Purpose

Why this document exists and what decisions depend on it.

# Document Philosophy

How to read it, and what it deliberately does not cover.

---

# ═══════════ FOUNDATION ═══════════

## Overview
What this entity is, in plain language, to someone who has never heard of it.

## Definition **[REQUIRED]**
The precise scope. What is inside it and what is not. A reader must be able to decide,
for any given service, whether it belongs here.

## Vision
Where this entity is going.

## Mission
What it does every day.

## Why This Service Exists **[REQUIRED]**
The human and operational reason it exists. Not "to provide excellent care" — the
actual gap it closes.

## Business Objectives → `Business Goal`
What the business needs from this entity. Concrete.

## Marketing Objectives → `Marketing Goal`
What communication must achieve. Awareness? Bookings? Trust? Referrals?

## Positioning **[REQUIRED]** → `Core Positioning`
One sentence: for whom, against what alternative, and on what basis.
> *Test: could a competitor claim the same sentence? If yes, it is not positioning.*

## Brand Philosophy → `Campaign Philosophy`
The belief this entity operates on.

## Core Promise **[REQUIRED]** → `Trust Promise`
The one thing that is always true, every time, for every patient. It must be
defensible — see *Never Promise*.

---

# ═══════════ HUMAN UNDERSTANDING ═══════════

> This block produces the fields that separate a distinctive campaign from a generic
> one. It is the most commonly skipped block and the most valuable.

## Human Problem **[REQUIRED]**
What the patient or family is actually living through. Their words, not clinical ones.

## Human Insight **[REQUIRED]** → `Human Insight`
The non-obvious truth underneath the problem — the thing that is true but rarely said.
> *Test: would a patient read it and think "how did they know that?" If it only makes
> a marketer nod, it is not an insight.*

## Invisible Product **[REQUIRED]** → `Invisible Product`
What the patient is really buying, which is never the medical procedure.
Certainty. Time back. Not having to fight. Being believed.

## Psychological Transformation **[REQUIRED]** → `Psychological Transformation`
The before → after of the patient's inner state.
> *Example: "I am at the mercy of whoever is on shift" → "There is a system, and it
> does not depend on luck."*

## Emotional Strategy → `Emotional Trigger`
Which emotion the communication works with, and why that one.

## Audience **[REQUIRED]** → `Target Audience`
Primary, secondary, supporting. Be specific: who decides, who influences, who pays.

## Audience Decision
How they actually choose. What they compare. What they fear. Where they look.

---

# ═══════════ MEDICAL FOUNDATION ═══════════

## Service Boundaries
What this entity does **not** do. Prevents workers implying capability that is absent.

## Medical Philosophy
The clinical approach and what it protects.

## Core Principles
The operating rules, each with a sentence on why it exists.

## Core Features **[REQUIRED]**
Concrete capabilities. Equipment, protocols, staffing, response times.
> *This is the section that stops copy being vague. Be exhaustive.*

## Differentiators **[REQUIRED]**
What is genuinely different here versus the same service elsewhere in the market —
and specifically what INSAN's standard adds.

## Service Journey
Step by step, from first contact to follow-up, as the patient experiences it.

## What Makes This Different
The short version, for a worker that reads nothing else.

---

## ── Medical Centers only ──

> Delete this block for Departments, Programs, Corporate and Supporting files.

### Center Features
### Center Services
Including non-clinic services — imaging, screening, follow-up.
### Specialized Clinics
The clinic roster inside this center.
### Clinic Schedule
Which clinics run on which days.

---

# ═══════════ MARKETING INTELLIGENCE ═══════════

## Communication Objective
What communication is for, here.

## What We Are Really Selling **[REQUIRED]** → `Core Message`
Never the procedure. The outcome, the certainty, the system behind it.

## Human Truth
The universal truth this connects to.

## Audience Psychology
How they think about this category before we say anything.

## Emotional Triggers → `Emotional Trigger`
## Psychological Barriers **[REQUIRED]** → `Psychological Barrier`
What stops them acting: fear, cost, distrust, denial, inconvenience. Be honest.

## Core Messaging Framework → `Core Message`
## Messaging Hierarchy
First, second, third. What is said when there is only one line.

## Narrative Themes **[REQUIRED]** → `Narrative Arc`
The recurring stories this entity can tell — enough for months without repeating.

## Content Pillars **[REQUIRED]** → `Content Pillars`
4–6 content territories. Pipe-separated when transferred.

## Storytelling Opportunities → `Approved Content Angles`
Specific, filmable moments. Not topics — moments.
> *"The tablet showing the patient's data before the ambulance doors open"
> is an angle. "Emergency readiness" is a topic.*

## Communication Style
## Tone of Voice
## Messaging Rules → `Non-Negotiable Rules`

---

# ═══════════ OFFERS ═══════════

## Current Offers
Promotional offers that may be advertised. If none, write **"No offers."** — an empty
section and a missing section mean different things to a worker.

## Offer Rules
What may never be discounted or advertised on price.

## Call To Action → `CTA Strategy`
The actions we ask for, in priority order.

## Primary KPI → `Primary KPI`
The single measure of success.

---

# ═══════════ STRATEGIC GOVERNANCE ═══════════

## Strategic Reminder
## Strategic Constraints
## Medical Communication Principles
## Never Promise **[REQUIRED]**
Claims that must never be made — medical, legal, ethical.
## Can Promise
What is safe to state, and on what evidence.
## Brand Perception → `Desired Audience Perception`
## Long-Term Brand Contribution
## Relationship With INSAN **[REQUIRED]** → `Trust Platform`, `Trust Platform Type`
How this entity carries the master brand's standard. Which trust platform it sits on:
Leadership · Transparency · Governance · Innovation · Safety · Continuity · Expertise.

---

# ═══════════ INSTITUTIONAL KNOWLEDGE ═══════════

## Institutional Knowledge Extensions
Permanent knowledge unique to this entity that fits nowhere above and would otherwise
be lost — history, incidents, decisions and their reasons, local context.

---

# ═══════════ AI & DOCUMENTATION ═══════════

## Knowledge Scope
What this file covers and where its edges are.

## AI Worker Guidance
How a worker should use this file. Common mistakes to avoid with this entity.

## Intended Consumers
Which workers read this and what each takes from it.

## Relationship With Campaign Cards
Which card this builds, and any field needing special handling.

## Relationship With Other Documentation
References to `MASTER_BRAND_ARCHITECTURE.md` and siblings.
> Reference; never restate. A copied fact is a fact that will drift.

## Maintenance Policy
What triggers an update, and who owns it.

## Versioning Philosophy
## Future Expansion Areas
## Final Strategic Reminder
The one thing a worker must not get wrong about this entity.

## Document Metadata
## Related Knowledge

---

## Completion checklist

- [ ] Front matter complete, `service_level` correct
- [ ] Every **[REQUIRED]** section written — not placeholders
- [ ] Positioning could not be claimed by a competitor
- [ ] Human Insight is genuinely non-obvious
- [ ] Core Features specific enough to write copy from
- [ ] Storytelling Opportunities are moments, not topics
- [ ] Offers section present, even if "No offers."
- [ ] Never Promise reviewed by someone clinically accountable
- [ ] Nothing here restates `MASTER_BRAND_ARCHITECTURE.md`
- [ ] **The test:** could a worker write a month of content from this file alone?
