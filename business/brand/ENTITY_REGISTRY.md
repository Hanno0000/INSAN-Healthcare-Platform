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
| MED-001 | Intensive Care Unit | وحدة العناية المركزة | DEPARTMENT | Critical Care Center | Future, Delta |
| MED-002 | Emergency Department | قسم الطوارئ | DEPARTMENT | Rapid Response Center | Future, Delta |
| MED-003 | Operating Rooms | غرف العمليات | DEPARTMENT | — | Future, Delta |
| MED-004 | Radiology & Imaging | الأشعة والتصوير | DEPARTMENT | — | Future, Delta |
| MED-005 | Laboratory | المعمل | DEPARTMENT | — | Future, Delta |
| MED-006 | Outpatient Clinics | العيادات الخارجية | DEPARTMENT | Outpatient Clinics | Future, Delta |
| CEN-001 | Cardiac & Internal Medicine Center | مركز القلب والباطنة وإحالة الرعايات الحرجة | CENTER | Cardiac Center | Future, Delta |
| CEN-002 | Urology & Laser Surgery Center | مركز جراحات المسالك والليزر | CENTER | Urology Center | Future, Delta |
| ~~CEN-003~~ | *retired 2026-08-08 — merged into CEN-016* | — | — | — | — |
| CEN-004 | General Surgery & Endoscopy Center | مركز الجراحات العامة والمناظير | CENTER | General Surgery Center | Future, Delta |
| CEN-005 | Diabetic Foot & Vascular Center | مركز القدم السكري والأوعية الدموية | CENTER | Diabetic Foot Center | Delta |
| CEN-006 | Pain Management Center | مركز علاج الألم والتدخلات المحدودة | CENTER | Pain Management Center | Delta |
| CEN-007 | Women's Health Center | مركز صحة المرأة | CENTER | Women's Health Center | Delta |
| CEN-008 | Dental Center | مركز الأسنان للكبار والأطفال وذوي الهمم | CENTER | Dental Center | Delta |
| CEN-009 | ENT & Head/Neck Surgery Center | مركز الأنف والأذن وجراحات الرقبة والرأس | CENTER | ENT Center | Delta |
| CEN-010 | Orthopedic & Sports Injury Center | مركز العظام وإصابات الملاعب | CENTER | Orthopedic Center | Future, Delta |
| CEN-011 | Chest & Sleep Disorders Center | مركز الصدر واضطرابات النوم | CENTER | Chest & Sleep Center | Delta |
| CEN-012 | Senior Health & Screening Center | مركز صحة كبار السن والفحص الشامل | CENTER | — | Delta |
| CEN-013 | Bariatric & Metabolic Surgeries Center | مركز جراحات السمنة والتمثيل الغذائي | CENTER | Bariatric Center | Future, Delta |
| CEN-014 | Colorectal & Hemorrhoid Surgeries Center | مركز جراحات المستقيم والبواسير | CENTER | Proctology Center | Delta |
| CEN-015 | Pediatrics & Neonatology Center | مركز طب الأطفال وحديثي الولادة | CENTER | Pediatric Center | Delta |
| CEN-016 | Digestive & Oncology Surgery Center | مركز جراحات الجهاز الهضمي والأورام | CENTER | Digestive Center | Future, Delta |
| HOSP-001 | Future Specialized Hospital | مستشفى المستقبل التخصصي | HOSPITAL | — | Future |
| HOSP-002 | Delta International Hospital | مستشفى الدلتا الدولي | HOSPITAL | Delta Restore Trust | Delta |
| PROG-001 | Kabarona Program | برنامج كبارنا | PROGRAM | Kabarona Continuous Care Program | Future, Delta |
| PROG-002 | Senior Care Program | برنامج رعاية كبار السن | PROGRAM | Senior Care Program | Future, Delta |
| PROG-003 | Check-up Programs | برامج الفحص الشامل | PROGRAM | Check-up Programs | Future, Delta |
| PROG-004 | Prevention Programs | برامج الوقاية | PROGRAM | Prevention Programs | Future, Delta |

A `—` in Campaign Name means the entity is registered and real, and no campaign is
currently scheduled for it. That is a legitimate state: the registry describes the
business, not the plan.

### ⚠️ The Future rule — read this before writing a Hospitals cell

**Stated by the brand owner, 2026-08-08, as a standing rule rather than a
one-time correction.** It replaces reasoning case by case about which hospital
runs what.

> **Future runs a named, closed list of centres. Delta runs everything.**

| At **both** hospitals | |
|---|---|
| `CEN-001` | مركز الباطنة والقلب وإحالة الرعايات الحرجة والمتوسطة |
| `CEN-010` | مركز العظام وإصابات الملاعب |
| `CEN-004` | مركز الجراحات العامة — and the surgical centres branching from it |
| `CEN-013` | مركز جراحات السمنة والتمثيل الغذائي |
| `CEN-002` | مركز جراحات المسالك والليزر |

**Every other centre is Delta only.**

Two consequences that are part of the rule, not inferences from it:

1. **Future ⊆ Delta.** A centre at Future is *always* also at Delta. There is no
   centre Future has and Delta does not. `future-rule.js` enforces this.
2. **A new centre is Delta-only by default.** When one is added, the brand owner
   says explicitly whether it is also at Future. Nobody derives it from the
   centre's specialty, because the list is a business decision about where the
   group invested, not a clinical one.

⚠️ **The two hospital-description PDFs do not contradict this and must not be
read as if they did.** `وصف مستشفى المستقبل.pdf` lists ENT, dental, neurosurgery
and plastic surgery among Future's operating-theatre specialties. That is
**theatre capability** — the hospital can perform the operation. A **Centre** is
a Signature Brand with its own campaign and its own knowledge file. Future
operating on an ear does not make Future the home of the ENT Center.

**All three open questions were answered by the brand owner on 2026-08-08**, and
the rule is now complete. What each answer changed:

| Centre | Ruling | Row |
|---|---|---|
| `CEN-010` Orthopaedics | on the Future list | Delta → **Future, Delta** |
| `CEN-016` Digestive & Oncology Surgery | this is *"الهضمي"* | keeps Future, Delta; **gains the campaign name `Digestive Center`** |
| `CEN-009` ENT | **Delta only** | Future, Delta → **Delta** |
| `CEN-014` Proctology | stands alone, outside the surgical family | Future, Delta → **Delta** |
| `CEN-003` GI & Liver Endoscopy | **retired**, merged into CEN-016 | row removed |

⚠️ **CEN-009 reverses a ruling made the day before.** On 2026-08-07 the brand
owner moved ENT to Future+Delta to match its knowledge file. On 2026-08-08 they
placed it at Delta only. The later ruling stands, and the reversal is recorded
rather than overwritten because the file's own copy had been evidence for it all
along: `MEDICAL_CENTER_ENT.md` §5.7 reads *"all under one roof at Delta
Hospital"* and §9.1 writes Future as a parenthetical. The knowledge file was
never really claiming Future.

**MED-002's campaign was renamed `Emergency Center` → `Rapid Response Center`** on
2026-08-07, to match its knowledge file. ⚠️ Renaming a campaign is a **three-place**
change — knowledge file, this registry, and **every existing Content Calendar
row**. Two are done. The live sheet is the operator's to change, and until it is,
cards built under the new name join to nothing.

**MED-006 gained a campaign name on 2026-08-07.** Outpatient Clinics is a
department that carries its own campaigns, which the `—` had denied.

**There is no MED-007.** A knowledge file existed under that id claiming
`campaign_name: General Surgery Center` — the same join key as CEN-004 — which
meant whichever built second silently overwrote the other's card. The brand owner
ruled the entity is a Center, and the file was merged into `CEN-004`'s and
deleted on 2026-08-07. The id is retired, not reusable.

### The surgical family

`CEN-004` is the parent centre. Three centres branch from it, and the brand owner
states the group is four centres in total (2026-08-07):

| | Centre |
|---|---|
| parent | `CEN-004` مركز الجراحات العامة والمناظير |
| branch | `CEN-013` مركز جراحات السمنة والتمثيل الغذائي |
| branch | `CEN-016` مركز جراحات الجهاز الهضمي والأورام |

The parent/child link is recorded in each knowledge file's `parent:` front matter.
**`MedicalCenter` has no `parentId` column**, so the hierarchy is documentation
only — the database and the website treat them as sibling centres.

⚠️ **The family is three, not four.** On 2026-08-07 the brand owner said four and
`CEN-014` was one of them. On 2026-08-08 they ruled that Proctology *"ملوش علاقة
بيهم"* — it stands alone. Its `parent:` front matter is cleared and it is Delta
only. The earlier count is left visible here rather than quietly corrected,
because a stated number that changes is worth seeing change.

### CEN-003 is retired

`CEN-003` (مركز مناظير الجهاز الهضمي والكبد — Digestive & Liver Endoscopy Center)
**no longer exists as an entity.** The brand owner retired it on 2026-08-08 and
folded it into `CEN-016`.

What moved across:

*   **The campaign name `Digestive Center`** — CEN-016 had none, so this is now
    the join key the Content Calendar schedules for digestive work.
*   **The scope** — diagnostic and therapeutic endoscopy of the digestive system
    and liver is inside CEN-016's remit, alongside its surgical and oncological
    work.
*   **Both hospitals** — CEN-016 already ran at Future and Delta, matching what
    CEN-003 had.

⚠️ **The id is retired, not reusable** — same rule as MED-007.

<!-- NEEDS-OPERATOR: CEN-016 is registered as "مركز جراحات الجهاز الهضمي والأورام / Digestive & Oncology Surgery Center", and it has now absorbed endoscopy of the digestive system and liver. The registered name says surgery and says nothing about endoscopy. Should the entity name widen to cover both, or does "جراحات" already read as covering the scopes it treats? Renaming is a three-place change (registry, knowledge file, live Content Calendar) so it is not being done on inference. The CAMPAIGN name Digestive Center is unaffected either way. -->

⚠️ **CEN-003 is referenced by two systems this repository does not own**, and
retiring it here does not retire it there. Recorded so it is not discovered later
as a website advertising a centre that no longer exists:

| System | File | What it holds |
|---|---|---|
| Receptionist | `receptionist/data/hospitals.json` | `CEN-003` in both hospitals' `centerIds` |
| Receptionist | `receptionist/scripts/test-database.mjs` | asserts Future gets `CEN-001..004` |
| Website | `website/Docs/insan-content-data.json` | slug `digestive-liver`, featured, both hospitals |
| Website | `website/Docs/ingestion-state.json` | three references |

Both also need `CEN-009` and `CEN-014` moved off Future, and `CEN-010` moved onto
it. **The receptionist test asserting Future gets CEN-001..004 is now wrong in
three separate ways** and will keep passing against stale data until someone
updates it.

**CEN-007 was "Women's & Children's Health Center" until 2026-08-07.** The brand
owner retired the combined entity: women's health and paediatrics are now two
centres, CEN-007 and CEN-015. Anything still naming a combined centre is stale.

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
