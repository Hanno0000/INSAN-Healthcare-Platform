---
entity_id:      HOSP-001
entity_name_en: Future Specialized Hospital
entity_name_ar: مستشفى المستقبل التخصصي
campaign_name:  —
builds_card:    false
service_level:  HOSPITAL
campaign_type:  Institutional
parent:         null
hospitals:      [Future]
status:         Active
version:        1.0
last_updated:   2026-08-08
---

# Purpose

This document is the Source of Truth for **Future Specialized Hospital as a
building and an operation** — its floors, departments, capacity, equipment and
hours.

It exists because that information was scattered across four PDFs that nobody
read, and because the brand owner asked on 2026-08-08 for one place to change
when a bed is added, a laboratory is installed, or a department opens.

**When a physical fact about Future changes, it changes here first.** The
campaign workers, the receptionist and the website all describe this hospital,
and until now each of them was describing it from a different source.

# Document Philosophy

Written for a reader who knows nothing: an AI worker that has never heard of
INSAN, cannot infer, and will not ask. If a fact is not written here, it does not
exist.

**Every number in this file is sourced in the line that states it.** Where two
sources disagree — and they do — both are shown and the ruling is named. A
capacity figure reaches the public in an advertisement; a wrong one is not a
typo, it is a claim.

---

# Future Specialized Hospital (مستشفى المستقبل التخصصي)

## 1. Foundation

### 1.1 Overview

Future Specialized Hospital is one of two hospitals operating under the INSAN
Healthcare Platform, managed by **Wedge Group Medical Services**. It is a
**single main building of a ground floor plus four upper floors**, laid out so
that the surgical, critical and inpatient services stack vertically above the
reception and emergency level.

It provides diagnostic and therapeutic care across all medical specialties
through professors and consultants drawn from Egyptian universities.

### 1.2 Definition

A specialised hospital carrying:

*   **24-hour Emergency**, receiving critical cases, road-traffic injuries and
    accidents.
*   **Specialised outpatient clinics**, 10:00 ص – 10:00 م.
*   **Two intensive care units**, on separate floors.
*   **Three operating theatres**, covering every surgical specialty the hospital
    admits.
*   **A neonatal incubator unit.**
*   **Inpatient accommodation**, graded from standard first class to premium
    suites.
*   **On-site diagnostics** — laboratory 24 hours, plain X-ray, CT, ultrasound,
    Doppler and echocardiography.
*   **Central sterilisation (CSSD)** and a medical gas room.
*   **A pharmacy.**

### 1.3 Capacity — the numbers

**Stated by the brand owner on 2026-08-08.** These are the authoritative figures
and they override the PDFs where the two differ.

| | Beds |
|---|---:|
| **Inpatient (داخلي)** | **26** |
| **Intensive care** | **9** |

⚠️ **Both figures disagree with a committed source, and the disagreement is left
visible rather than resolved by arithmetic.**

*   ✅ **RESOLVED 2026-08-08.** `وصف مستشفى المستقبل.pdf` states **25
    intensive-care beds**. The brand owner confirmed, when asked directly, that
    **9 is correct and 26 inpatient is correct**. The PDF's 25 is wrong and is
    not to be used. It is left named here so that anyone who reads that document
    later knows it has already been checked and rejected, rather than
    rediscovering it as new information.
*   `الوصف الإنشائي لمستشفى المستقبل التخصصي.pdf` counts inpatient beds floor by
    floor: **12 on the third floor and 7 on the fourth**, which is 19, plus
    **4 patient rooms on the second floor** whose bed count it does not give. The
    brand owner's 26 is consistent with those four rooms holding seven beds, but
    that reconciliation is a guess and is not asserted here.

<!-- NEEDS-OPERATOR: one capacity question remains at Future. The intensive-care figure was settled on 2026-08-08 — 9 beds, and the description PDF's 25 is wrong. Still open: the structural PDF counts 12 inpatient beds on floor 3 and 7 on floor 4, plus 4 rooms on floor 2 whose bed count it does not give, against a confirmed total of 26. Do those four second-floor rooms hold the remaining 7 beds? -->

### 1.4 The building, floor by floor

Source: `الوصف الإنشائي لمستشفى المستقبل التخصصي.pdf`.

**Ground floor — reception and operations**

Main reception · accounts · pharmacy · **2 outpatient clinics** · **Emergency
department** · cafeteria · laundry · kitchen · **central sterilisation (CSSD)** ·
**plain X-ray** · mosque · staff lockers · medical gas room · medical supplies
store · general store · files and archive · cleaning store.

**First floor — surgical**

**3 operating theatres**, equipped for the different surgical specialties ·
recovery room · **neonatal incubator unit with 5 incubators** · 2 stores for
equipment and medical supplies.

**Second floor — critical and diagnostic**

**Intensive care unit** · **CT scan department** · **4 patient rooms**.

**Third floor — inpatient**

**12 beds**, in rooms equipped to care requirements.

**Fourth floor — critical and inpatient**

**Intensive care unit**, equipped with the latest medical devices · inpatient
section with **7 beds**.

⚠️ **Future has two separate intensive care units** — second floor and fourth
floor. Content saying "the ICU" is describing one of two.

### 1.5 Hours

| | |
|---|---|
| Specialised outpatient clinics | **10:00 ص – 10:00 م** |
| Emergency | **24 hours** |
| Laboratory | **24 hours** |

*Source: `وصف مستشفى المستقبل.pdf`.*

<!-- NEEDS-OPERATOR: the radiology department's hours are not stated anywhere, only that the department exists. Is imaging available 24 hours, or clinic hours only? The answer changes what an emergency-readiness claim may say. -->

### 1.6 Diagnostics

**Laboratory**, 24 hours — haematology and immunology, virology, hormones, all
chemistry panels and cultures, histopathology and cytology.

**Radiology** — plain X-ray (ground floor), CT (second floor), ultrasound,
Doppler, echocardiography.

**Endoscopy** — gastrointestinal, colon, and biliary duct endoscopy unit.

### 1.7 Surgical scope

The operating theatres cover: general surgery · oncological surgery ·
laparoscopic surgery · obstetrics & gynaecology · orthopaedics and sports
injuries · maxillofacial · neurosurgery · ENT · hand surgery · plastic and
reconstructive surgery · vascular · thoracic · gastrointestinal · urological
surgery. Specialised dental surgery for children and adults.

⚠️ **Theatre capability is not a Medical Center.** This list says the hospital
can perform these operations. Which of them is a Signature Brand with its own
campaign is decided by `ENTITY_REGISTRY.md`, and the two are routinely confused
— see §1.8.

### 1.8 Which Medical Centers run here

**`ENTITY_REGISTRY.md` is authoritative.** Under the Future rule of 2026-08-08,
Future runs a **named, closed list**:

| | |
|---|---|
| `CEN-001` | مركز الباطنة والقلب وإحالة الرعايات الحرجة والمتوسطة |
| `CEN-002` | مركز جراحات المسالك والليزر |
| `CEN-004` | مركز الجراحات العامة والمناظير |
| `CEN-010` | مركز العظام وإصابات الملاعب |
| `CEN-013` | مركز جراحات السمنة والتمثيل الغذائي |
| `CEN-016` | مركز جراحات الجهاز الهضمي والأورام |

**Every other centre is Delta only**, and every centre at Future also runs at
Delta. `future-rule.js` enforces both.

Hospital-wide departments — Emergency, Intensive Care, Operating Rooms,
Radiology, Laboratory, Outpatient Clinics — run at both hospitals.

### 1.9 Staffing, as stated

Medical service delivered by **professors and consultants across all
specialties, drawn from various Egyptian universities**.

<!-- NEEDS-OPERATOR: no headcount anywhere — how many resident physicians, how many nurses, whether a consultant is on site overnight or on call. This is the same gap recorded in MEDICAL_CENTER_GENERAL_SURGERY.md §3.4 and it blocks any staffing claim at either hospital. -->

### 1.10 Pricing regime

**Future's prices are its own — أسعار خاصة — positioned as economic.** They are
not bound to any external tariff, which is the opposite of Delta's arrangement
*(brand owner, 2026-08-08)*.

Known consultation fees: **الكشف العادي ١٠٠ جنيه** · **المسالك ٣٠٠ جنيه** ·
**الأنف والأذن ٣٠٠ جنيه**. Maintained in `CLINIC_SCHEDULES.md` §3.

<!-- NEEDS-OPERATOR: Future's laboratory and imaging price list. Delta's follows a published tariff and is therefore knowable; Future's is internal and exists only inside the hospital. Without it the receptionist cannot answer "التحليل بكام؟" for Future at all. -->

### 1.11 Contact

Per `business/brand/CONTACT_DIRECTORY.md`, which is the source of truth for every
number this ecosystem publishes:

| | |
|---|---|
| **Hotline** | `01122224352` · `01151001177` |
| **WhatsApp** | `01151001177` |

<!-- NEEDS-OPERATOR: the letterhead of وصف مستشفى المستقبل.pdf carries a Cairo address — "مستشفى المستقبل مصر الجديدة، ٦٧ أ نخلة المطيعي، ميدان تريومف" — and two landlines, ٢٤١٠٦١٧٩٨ and ٢٤١٠٦٧٣٩. That is Heliopolis, and Delta is in Tanta. Is this hospital in Cairo, or is that the Wedge Group head office on a shared template? It matters directly: the campaign strategy for several centres rests on patients NOT having to travel to the capital, and the receptionist needs a real address. -->

---

## 2. Governance

### 2.1 Relationship With INSAN

Future Specialized Hospital is a **Sub-Brand** operating under the INSAN
Healthcare Platform, managed by **Wedge Group Medical Services**. Per
`MASTER_BRAND_ARCHITECTURE.md` §4 the hierarchy is platform → hospital →
Signature Brand centre, and per §4.1 content published on Future's page carries
that relationship naturally rather than as a bolted-on credit line.

The platform's standard — *«أساس الخدمة الطبية احترام الإنسان»* — governs here
as everywhere.

### 2.2 Never Promise

*   **No capacity figure that is not in §1.3.** Bed counts are the most quotable
    numbers a hospital has and the two sources for this one disagree.
*   **No staffing claim at all**, until §1.9 is answered.
*   **No accreditation claim** — none is recorded anywhere.
*   Nothing implying a Medical Center runs here that §1.8 does not list.

### 2.3 Can Promise

*   The departments, theatres, units and equipment listed in §1.2 and §1.4, which
    are stated in the hospital's own structural document.
*   The hours in §1.5.
*   The diagnostics in §1.6, on site.
*   Care by professors and consultants from Egyptian universities (§1.9).

---

## 3. AI & Documentation

### 3.1 Knowledge Scope

This file covers **Future as a facility**: floors, departments, capacity,
equipment, hours and contact.

**It does not cover** the strategy, positioning or messaging of any Medical
Center — those live in the centre's own knowledge file — nor Future's own
campaign, since the registry lists no campaign for HOSP-001.

### 3.2 AI Worker Guidance

*   **Quote capacity only from §1.3.** Not from the PDFs, which disagree with it.
*   **Do not convert a theatre specialty into a centre** (§1.7 and §1.8).
*   **Do not state a staffing level or an accreditation.** Neither exists in any
    source.
*   Where a centre's own file and this file both describe a capability, **the
    centre's file governs the centre and this file governs the building.**

### 3.3 Intended Consumers

| Consumer | What it takes |
|---|---|
| **Campaign workers** | facility facts a post may state about Future |
| **The receptionist** | hours, departments, what exists and where |
| **The website** | the hospital page |

### 3.4 Relationship With Other Documentation

*   `ENTITY_REGISTRY.md` — registers this hospital as HOSP-001 and is
    authoritative for which centres run here.
*   `HOSPITAL_DELTA.md` — HOSP-002, the same file for the other hospital.
*   `CONTACT_DIRECTORY.md` — the source of §1.10.
*   `business/knowledge/hospitals/*.pdf` — the four source documents this file
    was built from. **They are raw material, not a source of truth.** Where this
    file and a PDF disagree, this file governs and says why.

### 3.5 Maintenance Policy

**Update this file the moment a physical fact changes** — a bed added, a
laboratory or imaging device installed, a department opened, hours changed. That
is what it is for.

Update it also when either capacity conflict in §1.3 is settled, when the address
question in §1.10 is answered, or when staffing in §1.9 is recorded.

### 3.6 Versioning Philosophy

*   **v1.0** — 2026-08-08. Built from `وصف مستشفى المستقبل.pdf` and
    `الوصف الإنشائي لمستشفى المستقبل التخصصي.pdf`, plus the capacity figures the
    brand owner stated that day.

### 3.7 Document Metadata

| | |
|---|---|
| Document type | Business Knowledge Base — Facility |
| Knowledge domain | Hospital — Sub-Brand |
| Entity | Future Specialized Hospital (HOSP-001) |
| Managed by | Wedge Group Medical Services |
| Status | Living document — capacity conflicts unresolved, see §1.3 |
| Authority | Primary Source of Truth for this hospital's physical facts |
| Sources | two hospital PDFs; brand owner, 2026-08-08 |
