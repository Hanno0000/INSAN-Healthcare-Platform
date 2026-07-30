# Knowledge Base Specification

> **Version:** 1.0
> **Date:** 2026-07-29
> **Governed by:** `business/brand/MASTER_BRAND_ARCHITECTURE.md`
> **Consumed by:** W1 Campaign Card Builder, and every AI worker downstream

---

## 1. What this folder is

One file per entity. The file is the **permanent institutional memory** of that entity
and the **source of truth** for every campaign about it.

It is not a campaign document, not a brief, and not a summary. It is written once,
carefully, and changed only when the entity itself changes.

**The reader is assumed to know nothing.** Write for a worker that has never heard of
INSAN, cannot infer, and will not ask. If a fact is not in the file, it does not exist.

---

## 2. Folder structure

```
business/knowledge/
├── KNOWLEDGE_BASE_SPEC.md      ← this file
├── Template.md                 ← the skeleton every file follows
│
├── departments/                Hospital-wide clinical operations
│      MEDICAL_SERVICE_ICU.md
│      MEDICAL_SERVICE_EMERGENCY.md
│      …
│
├── centers/                    The 12 Medical Centers (Signature Brands)
│      MEDICAL_CENTER_ORTHOPEDIC.md
│      MEDICAL_CENTER_CARDIAC.md
│      …
│
├── clinics/                    Outpatient clinics, only where a clinic
│                               carries its own campaign
│
├── programs/                   Named long-term programs
│      PROGRAM_KABARONA.md
│      …
│
├── corporate/                  INSAN master-brand campaigns
│      CORPORATE_WHY_INSAN.md
│      …
│
├── hospitals/                  Sub-brand hospital campaigns
│      HOSPITAL_DELTA.md
│      HOSPITAL_FUTURE.md
│
└── supporting/                 Supporting campaigns
       SUPPORTING_MEET_OUR_DOCTORS.md
       SUPPORTING_BEHIND_THE_SCENES.md
       …
```

⚠️ `services/` currently exists and is empty. It is replaced by `centers/` and
`clinics/`, which name the level explicitly. Delete it once migration is done.

---

## 3. Naming convention

```
<LEVEL>_<ENTITY>.md        all caps, underscores, English
```

| Level prefix | Folder | Example |
|---|---|---|
| `MEDICAL_SERVICE_` | departments/ | `MEDICAL_SERVICE_ICU.md` |
| `MEDICAL_CENTER_` | centers/ | `MEDICAL_CENTER_ORTHOPEDIC.md` |
| `CLINIC_` | clinics/ | `CLINIC_DIABETES.md` |
| `PROGRAM_` | programs/ | `PROGRAM_KABARONA.md` |
| `CORPORATE_` | corporate/ | `CORPORATE_WHY_INSAN.md` |
| `HOSPITAL_` | hospitals/ | `HOSPITAL_DELTA.md` |
| `SUPPORTING_` | supporting/ | `SUPPORTING_HOSPITAL_LIFE.md` |

The filename is the join key. `Campaign Cards.Knowledge Source` stores the
repo-relative path, so a rename breaks the link — rename deliberately and rebuild the
card.

---

## 4. Required front matter

Every file opens with this block. W1 reads it to decide how to build the card.

```yaml
---
entity_id:      MED-003
entity_name_en: Orthopedic & Sports Injury Center
entity_name_ar: مركز العظام وإصابات الملاعب
campaign_name:  Orthopedic Center   # only when it differs from entity_name_en
service_level:  CENTER          # DEPARTMENT | CENTER | CLINIC | PROGRAM
                                # | CORPORATE | HOSPITAL | SUPPORTING
campaign_type:  Medical Services
parent:         null            # centers may have a parent hospital; clinics a center
hospitals:      [Future, Delta] # where this entity actually operates
status:         Active
version:        1.0
last_updated:   2026-07-29
---
```

`service_level` is mandatory and is what stops a Department being modelled as a Center.

### 4.1 `campaign_name` — the join key

**This file describes an entity. The calendar schedules a campaign. They are
not always called the same thing.**

W1 files the card under `campaign_name` where it is present and under
`entity_name_en` where it is not, and that name is what `Content Pipeline`
looks up once per scheduled post. A card filed under a name no calendar row
uses is **orphaned**: every field correct, joined to nothing, and the twelve
strategy fields still arrive blank — the 67% defect again, this time underneath
a card that reported success.

Measured against the live workbook on 2026-07-30:

| File | Entity | Calendar campaign | Slots |
|---|---|---|---|
| `MEDICAL_SERVICE_ICU.md` | Intensive Care Unit | **ICU Center** | 11 |
| `MEDICAL_SERVICE_EMERGENCY.md` | Emergency Department | **Emergency Center** | 16 |
| `HOSPITAL_DELTA.md` | Delta International Hospital | **Delta Restore Trust** | 8 |
| `PROGRAM_KABARONA.md` | Kabarona Program | **Kabarona Continuous Care Program** ¹ | 6 |
| the three `SUPPORTING_*` files | — | identical to the entity name | 18 |

Note what the first two show: the calendar calls ICU and Emergency "Centers"
while `MEDICAL_SERVICES_TAXONOMY.md` §2 A makes them **Departments**. Both
statements stay: `campaign_name` carries what the campaign is *called*,
`service_level` carries what the entity *is*. Renaming the campaign is a
separate decision and belongs to the brand owner.

¹ ⚠️ **Pending one rename in the sheet.** The calendar currently spells this
`Kobarna Continuous Care Program`. The spelling was unified on the brand
documents' *Kabarona* on 2026-07-30, so **6 Content Calendar rows and 1 Campaign
Cards row must be renamed** before this file's card will join to anything.
`Check Knowledge File` reports it as orphaned until they are — which is the
point of the check.

**Before building any card:** AI Workers → Planning → **Check Knowledge File**
reports how many scheduled slots the name would serve, and names the near
misses when the answer is zero. It costs no inference.

---

## 5. Document sections

Follow `Template.md`. Sections are grouped in six blocks:

| Block | Purpose | Feeds |
|---|---|---|
| **Foundation** | What the entity is, why it exists, its objectives and positioning | Campaign Philosophy, Business Goal, Marketing Goal |
| **Human Understanding** | The human problem, insight, invisible product, psychological transformation, audience | Human Insight, Invisible Product, Psychological Transformation, Emotional Trigger, Psychological Barrier, Target Audience |
| **Medical Foundation** | Boundaries, philosophy, principles, features, differentiators, journey | Trust Promise, Content Pillars, Non-Negotiable Rules |
| **Marketing Intelligence** | Messaging framework, narrative themes, content pillars, tone, rules | Core Message, Content Pillars, Approved Content Angles, CTA Strategy |
| **Strategic Governance** | Constraints, never-promise / can-promise, brand contribution | Non-Negotiable Rules, Trust Platform |
| **AI & Documentation** | Scope, worker guidance, relationship with Campaign Cards | how W1 interprets the file |

### 5.1 Sections that must never be skipped

These six map **one-to-one** onto the Campaign Card depth columns that are currently
empty on 15 of 16 cards. Omitting them means the card cannot be built:

- Human Insight
- Invisible Product
- Psychological Transformation
- Positioning → *Core Positioning*
- Trust Platform Type
- Narrative Arc

### 5.2 Sections specific to Medical Centers

A Center file must additionally list, because a Center is a container:

- **Center Features**
- **Center Services** — including non-clinic services such as imaging or screening
- **Specialized Clinics** — the clinic roster inside this center
- **Clinic Schedule** — which clinics run on which days

### 5.3 Offers

Every file carries an **Offers** section: what promotional offers may be advertised
for this entity, and the rules for advertising them. If there are none, say so
explicitly — an empty section and a missing section are not the same thing to a
worker.

---

## 6. Depth standard

`MEDICAL_SERVICE_ICU.md` (2,761 lines) is the reference implementation. A new file is
not "done" because every heading has a sentence under it.

**Test:** could a worker that has read only this file write a month of campaign content
about this entity without inventing a single fact? If not, the file is incomplete.

Specifically avoid:

- Headings with one generic line beneath them
- Marketing adjectives with no substance — "world-class", "state-of-the-art"
- Claims that cannot be supported, given §Never Promise
- Anything that duplicates `MASTER_BRAND_ARCHITECTURE.md` instead of referencing it

---

## 7. Entity registry — what exists and what is missing

**Legend:** ✅ written · 🟠 partial · ❌ missing

### 7.1 Departments / Critical Services

| Entity | File | Status |
|---|---|---|
| ICU | `departments/MEDICAL_SERVICE_ICU.md` | ✅ builds a card |
| Emergency | `departments/MEDICAL_SERVICE_EMERGENCY.md` | 🟠 **16 slots** — structurally complete, awaiting operator facts in Core Features, Service Journey and Institutional Knowledge |
| Operating Rooms | `departments/MEDICAL_SERVICE_OPERATIONS.md` | ❌ |
| Radiology & Imaging | `departments/MEDICAL_SERVICE_RADIOLOGY.md` | ❌ |
| Laboratory | `departments/MEDICAL_SERVICE_LABORATORY.md` | ❌ |
| Outpatient Clinics (as a service) | `departments/MEDICAL_SERVICE_OUTPATIENT.md` | ❌ |

### 7.2 Medical Centers — all 12 missing

| # | Center | File | Slots scheduled |
|---|---|---|---|
| 1 | Cardiac & Internal Medicine | `centers/MEDICAL_CENTER_CARDIAC.md` | 5 |
| 2 | Urology & Laser Surgery | `centers/MEDICAL_CENTER_UROLOGY.md` | 2 |
| 3 | Digestive & Liver Endoscopy | `centers/MEDICAL_CENTER_DIGESTIVE.md` | 2 |
| 4 | General Surgery & Endoscopy | `centers/MEDICAL_CENTER_GENERAL_SURGERY.md` | 2 |
| 5 | Diabetic Foot & Vascular | `centers/MEDICAL_CENTER_DIABETIC_FOOT.md` | 1 |
| 6 | Pain Management | `centers/MEDICAL_CENTER_PAIN.md` | 2 |
| 7 | Women's & Children's Health | `centers/MEDICAL_CENTER_WOMEN_CHILDREN.md` | 2 |
| 8 | Dental | `centers/MEDICAL_CENTER_DENTAL.md` | 1 |
| 9 | ENT & Head/Neck Surgery | `centers/MEDICAL_CENTER_ENT.md` | 1 |
| 10 | Orthopedic & Sports Injury | `centers/MEDICAL_CENTER_ORTHOPEDIC.md` | 1 |
| 11 | Chest & Sleep Disorders | `centers/MEDICAL_CENTER_CHEST_SLEEP.md` | 2 |
| 12 | Senior Health & Screening | `centers/MEDICAL_CENTER_SENIOR_HEALTH.md` | 1 |

### 7.3 Programs

| Entity | File | Status |
|---|---|---|
| Kabarona | `programs/PROGRAM_KABARONA.md` | ✅ |
| Senior Care | `programs/PROGRAM_SENIOR_CARE.md` | ❌ |
| Check-up Programs | `programs/PROGRAM_CHECKUP.md` | ❌ |
| Prevention Programs | `programs/PROGRAM_PREVENTION.md` | ❌ |

### 7.4 Corporate

| Campaign | File | Slots | Status |
|---|---|---|---|
| Why INSAN? | `corporate/CORPORATE_WHY_INSAN.md` | 1 | ✅ builds a card |
| Why Trust Us | `corporate/CORPORATE_WHY_TRUST_US.md` | 3 | ✅ builds a card |
| Brand Identity | `corporate/CORPORATE_BRAND_IDENTITY.md` | 1 | ❌ |
| Healthcare Leadership | `corporate/CORPORATE_LEADERSHIP.md` | 3 | ❌ |
| Healthcare Innovation | `corporate/CORPORATE_INNOVATION.md` | 2 | ❌ |
| Growth & Transformation | `corporate/CORPORATE_GROWTH.md` | 1 | ❌ |
| Digital Healthcare Transformation | `corporate/CORPORATE_DIGITAL.md` | 1 | ❌ |

### 7.4.1 The corporate routing test

Seven corporate campaigns describe the same organisation. Each answers a different
question, and the question is the boundary. Recorded in full in
`CORPORATE_WHY_INSAN.md`, which is the cluster anchor:

| The question the reader is asking | The campaign |
|---|---|
| "What is this?" | Why INSAN? |
| "What do you believe?" | Brand Identity |
| "Why should I believe you?" | Why Trust Us |
| "What do you think healthcare should be?" | Healthcare Leadership |
| "What are you building?" | Healthcare Innovation |
| "Where are you going, and what has changed?" | Growth & Transformation |
| "What does the digital side look like?" | Digital Healthcare Transformation |

**Why INSAN? must be scheduled first.** Every other corporate campaign assumes the
reader already knows what INSAN is; *Why Trust Us* scheduled ahead of it asks someone
to trust a thing they cannot name.

### 7.5 Hospitals

| Entity | File | Status |
|---|---|---|
| Delta International | `hospitals/HOSPITAL_DELTA.md` | 🟠 **8 slots** — brand strategy complete, awaiting institutional facts and the trust-context question in Core Features |
| Future Specialized | `hospitals/HOSPITAL_FUTURE.md` | ❌ |

### 7.6 Supporting campaigns

| Campaign | File | Slots | Status |
|---|---|---|---|
| Meet Our Doctors | `supporting/SUPPORTING_MEET_OUR_DOCTORS.md` | 6 | ✅ builds a card |
| Patient Journey | `supporting/SUPPORTING_PATIENT_JOURNEY.md` | 6 | ✅ builds a card |
| Success Stories | `supporting/SUPPORTING_SUCCESS_STORIES.md` | 6 | ✅ builds a card |
| Meet Our Team | `supporting/SUPPORTING_MEET_OUR_TEAM.md` | 5 | ✅ builds a card |
| Behind The Scenes | `supporting/SUPPORTING_BEHIND_THE_SCENES.md` | 5 | ✅ builds a card |
| Hospital Life | `supporting/SUPPORTING_HOSPITAL_LIFE.md` | 5 | ✅ builds a card |
| FAQ | `supporting/SUPPORTING_FAQ.md` | 3 | ❌ |
| Community Impact (CSR) | `supporting/SUPPORTING_CSR.md` | 3 | ❌ |
| Visiting Professors | `supporting/SUPPORTING_VISITING_PROFESSORS.md` | 2 | ❌ |
| Patient Guides | `supporting/SUPPORTING_PATIENT_GUIDES.md` | 2 | ❌ |
| Medical Education | `supporting/SUPPORTING_MEDICAL_EDUCATION.md` | 1 | ❌ |

### 7.6.1 The three-campaign boundary

Meet Our Team, Behind The Scenes and Hospital Life describe the same two buildings and
will collapse into one another unless the boundary is enforced. Each file carries the
same routing test, and it is the first thing to check before writing:

| If the post is fundamentally about… | It belongs to |
|---|---|
| a **person** — who they are, what they decide | Meet Our Team |
| a **process** — what happens that nobody sees | Behind The Scenes |
| a **place and its rhythm** — what it feels like here | Hospital Life |

A post can contain all three. File it by what would be lost if you removed it.

Audit B's finding that 88% of posts shared five opening formulas came from exactly
this kind of unnoticed convergence — three campaigns producing one campaign is the
same failure at the plan level.

### 7.7 Educational

| Campaign | File | Slots |
|---|---|---|
| Medical Myths & Facts ² | `supporting/EDUCATIONAL_MYTHS_FACTS.md` | 3 |
| Health Awareness | `supporting/EDUCATIONAL_HEALTH_AWARENESS.md` | 2 |
| Prevention Tips | `supporting/EDUCATIONAL_PREVENTION_TIPS.md` | 2 |
| Seasonal Campaigns | `supporting/EDUCATIONAL_SEASONAL.md` | 1 |

All ❌.

² The calendar schedules this campaign under **two names** — `Myth vs Fact`
(2 slots) and `Medical Myths & Facts` (1 slot). Confirmed by the operator on
2026-07-30 to be one campaign. The 3 above is the combined figure. **Rename the
two `Myth vs Fact` rows to `Medical Myths & Facts`** so one knowledge file
serves all three; until then the split would need two files describing the same
thing, which is how two sources of truth begin.

### 7.8 Totals

*Updated 2026-07-30, after the top five by scheduled volume were written.*

| | Count | Scheduled slots |
|---|---|---|
| ✅ Written, builds a campaign card | **10** — ICU, Kabarona, Meet Our Doctors, Patient Journey, Success Stories, Meet Our Team, Behind The Scenes, Hospital Life, Why INSAN?, Why Trust Us | **54** |
| 🟠 Structurally complete, awaiting operator facts | **2** — Emergency, Delta | 24 |
| ❌ Not started | ~28 | 54 |

*Updated 2026-07-30 (third pass).* Kabarona was closed by rewriting its front
matter to §4 and renaming two headings to the ones the gate matches — *Why This
Program Exists* → *Why This Service Exists*, *What Makes The Program Different* →
*Differentiators*. No content was added or invented. Then **Meet Our Team**,
**Behind The Scenes** and **Hospital Life** were written from the committed brand
documents, ~1,000 lines each, adding 15 slots.

Every ready file is joined to a real calendar row, verified against the workbook.
Before `campaign_name` existed, ICU's card would have been filed as "Intensive
Care Unit" and served **none** of its 11 slots.

Then the corporate cluster was opened with **Why INSAN?** — which carries the
routing test all seven corporate campaigns inherit — and **Why Trust Us**.

**Coverage: 48 of 132 slots today**, 54 once the Kabarona rename lands in the
sheet, **78 once Emergency and Delta are answered.**

**How to check any file:** AI Workers → Planning → **Check Knowledge File**. It runs
W1's full validation gate and reports what is missing, without spending an
inference.

**What 🟠 means.** Every section derivable from the committed brand documents is
written. The sections that require facts only the operator has carry an explicit
`<!-- NEEDS-OPERATOR: ... -->` marker naming exactly what is needed. W1 refuses to
build a card past an unresolved marker — deliberately, because a card built on an
invented operational fact becomes the strategy for every post about that entity, and
nothing downstream can tell it was a guess.

---

## 8. Writing order

Write by **scheduled volume**, not by org-chart order. Highest impact first:

1. **Emergency** — 16 slots, no file
2. **Supporting: Meet Our Doctors, Patient Journey, Success Stories** — 18 slots combined
3. **Delta Hospital** — 8 slots
4. **Meet Our Team, Behind The Scenes, Hospital Life** — 15 slots combined
5. **Cardiac Center** — 5 slots
6. Everything else by slot count

Writing the top five closes roughly half the 67% strategy gap.

---

## 9. How a file becomes a campaign card

```
knowledge file  →  W1 Campaign Card Builder  →  one row in Campaign Cards
```

W1 reads the whole file and produces:

- the twelve strategy fields (Campaign Cards O:Z)
- the six depth fields (AA:AF)
- campaign decisions — business goal, marketing goal, priority, target posts, CTA, KPI
- `Knowledge Source` = this file's path, `Card Built At` = timestamp

If a required section is missing, W1 **fails loudly and names the section**. It never
invents. A card built on an incomplete file would push the same gap downstream
wearing a completed badge.

---

*End of Knowledge Base Specification.*
