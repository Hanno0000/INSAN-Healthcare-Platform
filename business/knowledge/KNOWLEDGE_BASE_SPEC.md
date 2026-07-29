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
| ICU | `departments/MEDICAL_SERVICE_ICU.md` | ✅ |
| Emergency | `departments/MEDICAL_SERVICE_EMERGENCY.md` | ❌ **16 slots scheduled** |
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

| Campaign | File | Slots |
|---|---|---|
| Why INSAN? | `corporate/CORPORATE_WHY_INSAN.md` | 1 |
| Why Trust Us | `corporate/CORPORATE_WHY_TRUST_US.md` | 3 |
| Brand Identity | `corporate/CORPORATE_BRAND_IDENTITY.md` | 1 |
| Healthcare Leadership | `corporate/CORPORATE_LEADERSHIP.md` | 3 |
| Healthcare Innovation | `corporate/CORPORATE_INNOVATION.md` | 2 |
| Growth & Transformation | `corporate/CORPORATE_GROWTH.md` | 1 |
| Digital Healthcare Transformation | `corporate/CORPORATE_DIGITAL.md` | 1 |

All ❌.

### 7.5 Hospitals

| Entity | File | Status |
|---|---|---|
| Delta International | `hospitals/HOSPITAL_DELTA.md` | ❌ — 8 slots |
| Future Specialized | `hospitals/HOSPITAL_FUTURE.md` | ❌ |

### 7.6 Supporting campaigns

| Campaign | File | Slots |
|---|---|---|
| Meet Our Doctors | `supporting/SUPPORTING_MEET_OUR_DOCTORS.md` | 6 |
| Patient Journey | `supporting/SUPPORTING_PATIENT_JOURNEY.md` | 6 |
| Success Stories | `supporting/SUPPORTING_SUCCESS_STORIES.md` | 6 |
| Meet Our Team | `supporting/SUPPORTING_MEET_OUR_TEAM.md` | 5 |
| Behind The Scenes | `supporting/SUPPORTING_BEHIND_THE_SCENES.md` | 5 |
| Hospital Life | `supporting/SUPPORTING_HOSPITAL_LIFE.md` | 5 |
| FAQ | `supporting/SUPPORTING_FAQ.md` | 3 |
| Community Impact (CSR) | `supporting/SUPPORTING_CSR.md` | 3 |
| Visiting Professors | `supporting/SUPPORTING_VISITING_PROFESSORS.md` | 2 |
| Patient Guides | `supporting/SUPPORTING_PATIENT_GUIDES.md` | 2 |
| Medical Education | `supporting/SUPPORTING_MEDICAL_EDUCATION.md` | 1 |

All ❌.

### 7.7 Educational

| Campaign | File | Slots |
|---|---|---|
| Medical Myths & Facts | `supporting/EDUCATIONAL_MYTHS_FACTS.md` | 3 |
| Health Awareness | `supporting/EDUCATIONAL_HEALTH_AWARENESS.md` | 2 |
| Prevention Tips | `supporting/EDUCATIONAL_PREVENTION_TIPS.md` | 2 |
| Seasonal Campaigns | `supporting/EDUCATIONAL_SEASONAL.md` | 1 |

All ❌.

### 7.8 Totals

| | Written | Missing |
|---|---|---|
| Entities | **2** | **~38** |
| Scheduled slots they cover | 11 of 132 | 121 of 132 |

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
