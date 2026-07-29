# Clinic ↔ Center Relationship, and the Booking Flow

> **Version:** 1.0
> **Date:** 2026-07-29
> **Status:** Specification — to be implemented
> **Canonical model:** `business/brand/MEDICAL_SERVICES_TAXONOMY.md` — read it first
> **Scope:** Website Platform. The taxonomy itself is shared with Campaign OS.

---

## 1. What changes

The booking entry point moves from the doctor to the clinic.

| | Before | After |
|---|---|---|
| Label | احجز طبيبك — *Book your doctor* | **احجز عيادتك** — *Book your clinic* |
| Entity chosen | Doctor | **Clinic** |
| Doctor | The thing being booked | An attribute of the clinic and its schedule |

Everywhere the current UI leads with a doctor, it leads with a clinic instead.

---

## 2. The relationship to model

Read `MEDICAL_SERVICES_TAXONOMY.md` §2 for the reasoning. The part that matters for
implementation:

```
Hospital
   ├──< MedicalCenter   0..*        (hospitalId nullable — standalone centers, future)
   │       ├──< Clinic          0..*
   │       └──< CenterService   0..*   exams · imaging · labs · programmes
   └──< Clinic          0..*        every clinic has a hospital
```

| From | To | Nullable | Rule |
|---|---|---|---|
| `Clinic.hospitalId` | Hospital | **No** | Every clinic is in a hospital |
| `Clinic.medicalCenterId` | MedicalCenter | **Yes** | **A clinic may have no center** |
| `MedicalCenter.hospitalId` | Hospital | **Yes** | Always set today; standalone is a stated future step |

### The one rule that drives everything below

> **`Clinic.medicalCenterId` is nullable, and a null is completely normal.**

There can be a Gynaecology clinic with no Gynaecology center. That clinic is bookable,
listed and complete. A missing center is **not** an incomplete record and **not** a
validation failure.

### A center is more than its clinics

A Medical Center groups clinics **and** the other services that specialty needs.
Orthopedic & Sports Injury Center contains the orthopedic, rheumatology and sports
injury clinics — plus examinations, imaging and lab services. `CenterService` holds
the non-clinic part. Do not model a center as only a list of clinics.

---

## 3. Booking flow

```
  «احجز عيادتك»
        │
        ▼
  patient picks a clinic
        │
        ▼
  clinic.medicalCenterId ?
        │
   ┌────┴────┐
  set       null
   │          │
   ▼          ▼
 show the   show nothing
 center,    about centers
 linked        │
   │          │
   └────┬─────┘
        ▼
  show the hospital  (always)
        ▼
  continue booking — identical in both paths
```

**Both paths reach the same booking form.** The center is context on the way, never a
step, a condition or a gate.

### Confirmation screen

| Field | When shown |
|---|---|
| Clinic | Always |
| Medical Center | **Only when the clinic has one** |
| Hospital | Always |

---

## 4. Acceptance criteria

- [ ] The booking CTA reads **احجز عيادتك** everywhere the doctor CTA appeared
- [ ] A clinic can be booked with `medicalCenterId = null`, start to finish
- [ ] A clinic **with** a center shows the center name, linked to the center page
- [ ] A clinic **without** a center shows **no** center row — not a dash, not
      "غير محدد", not an empty label. The row is absent.
- [ ] The hospital is shown on every path
- [ ] Center page lists both its clinics **and** its non-clinic services
- [ ] Listing and filtering clinics does not require a center
- [ ] Nothing breaks if `MedicalCenter.hospitalId` is null *(forward compatibility)*
- [ ] No query uses an inner join between Clinic and MedicalCenter on a listing path

---

## 5. Failure modes to avoid

| Anti-pattern | Why it is wrong |
|---|---|
| `INNER JOIN` clinic → center on any listing | Silently hides every clinic without a center |
| `"Center: —"` or `"غير محدد"` | A clinic with no center is normal; do not label an absence |
| Requiring a center to complete booking | Blocks a valid booking |
| `hospitalId NOT NULL` on MedicalCenter | Becomes a migration when standalone centers arrive |
| Treating Radiology/Laboratory as centers | They are Departments — see taxonomy §2 A |
| Modelling a center as only a clinic list | Loses `CenterService` — exams, imaging, labs |

---

## 6. Data reconciliation — needs a decision before implementation

The seed data in `apps/api/prisma/seed.ts` and the brand's authoritative list do not
match. Cross-referenced against `MASTER_BRAND_ARCHITECTURE.md` §5:

**Seeded on the website, not in the brand's list of centers:**

| Seeded | Likely correct classification |
|---|---|
| `ophthalmology-center` | Clinic, or a center the brand list has not added |
| `dermatology-center` | Clinic, or a center the brand list has not added |
| `emergency-center` | **Department** — not a center |
| `icu-center` | **Department** — not a center |
| `neurology-center` | Clinic, or a center to be added |

**In the brand's list of twelve, missing from the seed:**

Urology & Laser · Diabetic Foot & Vascular · Pain Management ·
ENT & Head/Neck · General Surgery & Endoscopy · Chest & Sleep Disorders

**Consequence today:** the public site advertises an Ophthalmology Center and a
Dermatology Center that no campaign supports, while six real centers have no page.

⚠️ **This is a brand-owner decision, not a merge.** Either those entities are centers
and belong in the authoritative list, or they are clinics and should be modelled as
clinics with `medicalCenterId = null`. Do not silently pick one.

---

## 7. Why the campaign side cares

Campaign OS builds campaigns per entity and needs the same classification. It is
adding a `Service Level` column with `DEPARTMENT / CENTER / CLINIC / PROGRAM`.

If the website and Campaign OS classify the same entity differently, a patient
arriving from an ad sees one story and the site tells another — which contradicts the
ecosystem's core promise that the standard is identical wherever you go.

**Long term:** the website database should become the single entity registry that both
projects read. It already has the schema for it; Campaign OS is maintaining lists in a
spreadsheet instead.

---

*End of specification.*
