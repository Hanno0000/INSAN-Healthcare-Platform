# Entity Registry

> **Version:** 1.0
> **Date:** 2026-07-31
> **Status:** Source of Truth — the single list of what this ecosystem contains
> **Governed by:** `MASTER_BRAND_ARCHITECTURE.md`
> **Read by:** Campaign OS (`EntityRegistry.gs`), the Website Platform, and every
> worker that names a medical entity

---

## Why this file exists

Three systems described the same business and agreed on **18% of it**.

Audit B measured it: 22 distinct entities named across this brand documentation,
the Campaign OS sheet and the website database — and only 4 appearing in all
three. The website advertises an Ophthalmology Center and a Dermatology Center
that no campaign has ever heard of; six real centers have no campaign card at
all.

That is not a data-hygiene problem. It is the brand's central promise — *the same
system wherever you go* — failing at the first place a customer would check.

The cause is structural: each project kept its own list. **This file is the list.**
Both projects read it, and divergence becomes a check that fails rather than a
discovery someone makes later.

> **The rule:** an entity that is not in this file does not exist. If something
> should exist and is not here, add it here first, then let the systems follow.

---

## How to use it

**Campaign OS** — AI Workers → Maintenance → **Check Entity Registry**. It compares
`Campaign Cards` against the table below and reports three things: entities with no
card, cards naming an entity that is not registered, and cards whose Service Level
disagrees with the registry.

**The Website Platform** — the same table governs `prisma/seed.ts`. Anything seeded
and not listed here is either an error or an entity that needs adding here first.

**Adding an entity** — add the row, decide its level using
`MEDICAL_SERVICES_TAXONOMY.md` §2, then create the knowledge file
(`KNOWLEDGE_BASE_SPEC.md` §3) and the campaign card.

---

## The table

`Level` follows `MEDICAL_SERVICES_TAXONOMY.md`: a **Department** is a hospital-wide
clinical operation with no clinic roster; a **Center** is one of the twelve
Signature Brands; a **Clinic** is a bookable specialty unit; a **Program** is a
named long-term programme.

`Campaign Name` is the name the Content Calendar schedules and the Campaign Cards
row is filed under — the join key. Where it differs from the entity's own name,
that difference is deliberate and is recorded in the knowledge file's
`campaign_name` front matter (`KNOWLEDGE_BASE_SPEC.md` §4.1).

| ID | Entity (EN) | Entity (AR) | Level | Campaign Name | Hospitals |
|---|---|---|---|---|---|
| MED-001 | Intensive Care Unit | وحدة العناية المركزة | DEPARTMENT | ICU Center | Future, Delta |
| MED-002 | Emergency Department | قسم الطوارئ | DEPARTMENT | Emergency Center | Future, Delta |
| MED-003 | Operating Rooms | غرف العمليات | DEPARTMENT | — | Future, Delta |
| MED-004 | Radiology & Imaging | الأشعة والتصوير | DEPARTMENT | — | Future, Delta |
| MED-005 | Laboratory | المعمل | DEPARTMENT | — | Future, Delta |
| MED-006 | Outpatient Clinics | العيادات الخارجية | DEPARTMENT | — | Future, Delta |
| MED-007 | General Surgery & Specialized Surgical Clinics | مركز الجراحات العامة والعيادات التخصصية | DEPARTMENT | — | Future, Delta |
| CEN-001 | Cardiac & Internal Medicine Center | مركز القلب والباطنة وإحالة الرعايات الحرجة | CENTER | Cardiac Center | Future, Delta |
| CEN-002 | Urology & Laser Surgery Center | مركز جراحات المسالك والليزر | CENTER | Urology Center | Future, Delta |
| CEN-003 | Digestive & Liver Endoscopy Center | مركز مناظير الجهاز الهضمي والكبد | CENTER | Digestive Center | Future, Delta |
| CEN-004 | General Surgery & Endoscopy Center | مركز الجراحات العامة والمناظير | CENTER | General Surgery Center | Future, Delta |
| CEN-005 | Diabetic Foot & Vascular Center | مركز القدم السكري والأوعية الدموية | CENTER | Diabetic Foot Center | Delta |
| CEN-006 | Pain Management Center | مركز علاج الألم والتدخلات المحدودة | CENTER | Pain Management Center | Delta |
| CEN-007 | Women's & Children's Health Center | مركز صحة المرأة والطفل | CENTER | Women's Health Center | Delta |
| CEN-008 | Dental Center | مركز الأسنان للكبار والأطفال وذوي الهمم | CENTER | Dental Center | Delta |
| CEN-009 | ENT & Head/Neck Surgery Center | مركز الأنف والأذن وجراحات الرقبة والرأس | CENTER | ENT Center | Delta |
| CEN-010 | Orthopedic & Sports Injury Center | مركز العظام وإصابات الملاعب | CENTER | Orthopedic Center | Delta |
| CEN-011 | Chest & Sleep Disorders Center | مركز الصدر واضطرابات النوم | CENTER | Chest & Sleep Center | Delta |
| CEN-012 | Senior Health & Screening Center | مركز صحة كبار السن والفحص الشامل | CENTER | — | Delta |
| CEN-013 | Pediatrics & Neonatology Center | مركز طب الأطفال وحديثي الولادة | CENTER | — | Delta |
| CEN-014 | Colorectal & Anal Surgeries Center | مركز جراحات المستقيم والشرج | CENTER | Proctology Center | Future, Delta |
| CEN-015 | Bariatric & Metabolic Surgeries Center | مركز جراحات السمنة والتمثيل الغذائي | CENTER | Bariatric Center | Future, Delta |
| HOSP-001 | Future Specialized Hospital | مستشفى المستقبل التخصصي | HOSPITAL | — | Future |
| HOSP-002 | Delta International Hospital | مستشفى الدلتا الدولي | HOSPITAL | Delta Restore Trust | Delta |
| PROG-001 | Kabarona Program | برنامج كبارنا | PROGRAM | Kabarona Continuous Care Program | Future, Delta |
| PROG-002 | Senior Care Program | برنامج رعاية كبار السن | PROGRAM | Senior Care Program | Future, Delta |
| PROG-003 | Check-up Programs | برامج الفحص الشامل | PROGRAM | Check-up Programs | Future, Delta |
| PROG-004 | Prevention Programs | برامج الوقاية | PROGRAM | Prevention Programs | Future, Delta |

A `—` in Campaign Name means the entity is registered and real, and no campaign is
currently scheduled for it. That is a legitimate state: the registry describes the
business, not the plan.

**Centers 5–12 operate at Delta only**, per `PLATFORM_KNOWLEDGE_BASE.md` §2.2.
Centers 1–4 operate at both hospitals.

---

## Divergences to resolve

These are the specific disagreements Audit B measured. Each needs a decision from
the brand owner, not a merge — the systems can be made to agree only once someone
says which of them is right.

### 1. The website seeds two centers that do not exist here

`website/apps/api/prisma/seed.ts` creates an **Ophthalmology Center** and a
**Dermatology Center**. Neither appears in `MASTER_BRAND_ARCHITECTURE.md` §5, and
no campaign supports them.

**Either** they exist and belong in the table above — in which case the brand
architecture's list of twelve is out of date — **or** they are outpatient clinics
without a center, in which case the website should present them as clinics.

Until this is settled, the public site advertises services the campaign system has
never heard of. **This is the most commercially exposed item in the registry.**

### 2. Campaign Cards files five Departments as Centers

`Campaign Cards` lists Emergency, ICU, Laboratory, Diagnostic & Imaging and
Surgical as Medical Centers. Under `MEDICAL_SERVICES_TAXONOMY.md` §2 A they are
**Departments**.

The `Service Level` column exists to record this and the existing rows still need
correcting. Note that the *campaign* may keep its name — "Emergency Center" is
what the calendar schedules — while `Service Level` records what the entity
actually is. The two statements are compatible and both are needed.

### 3. Campaign Cards names entities that are not in the registry

`Diagnostic & Imaging`, `Laboratory`, `Respiratory` and `Surgical` appear as cards.
Radiology and Laboratory are registered as Departments above under their proper
names; `Respiratory` and `Surgical` correspond to no registered entity.

Either they map onto CEN-011 (Chest & Sleep) and MED-003 (Operating Rooms), or
they are cards that should be retired.

### 4. Six registered centers have no card

Urology, Diabetic Foot, Pain, Dental, ENT and Senior Health are real, registered,
and scheduled in the calendar with no card behind them. That is part of the 67%
blank-strategy defect and it closes when their knowledge files are written — which
requires clinical facts only the operator has.

---

## What this file is not

It is **not** the knowledge base. It says what exists; the knowledge files say what
each thing is, and `KNOWLEDGE_BASE_SPEC.md` §7 tracks which have been written.

It is **not** the campaign plan. An entity with no campaign is still an entity.

It is **not** a clinic roster. Individual outpatient clinics are registered only
where a clinic carries its own campaign (`MEDICAL_SERVICES_TAXONOMY.md` §2 C).

---

## Maintenance

Update when an entity is added, removed, renamed, or moves between hospitals — and
before either system is changed, never after.

Owner: the brand owner, with `MASTER_BRAND_ARCHITECTURE.md` §5 governing the list
of centers.

**The table above is parsed by machine.** Keep the column order, keep one entity
per row, and keep `—` as the empty marker. A malformed row is skipped by the
checker with a warning rather than silently ignored.

---

*End of Entity Registry.*
