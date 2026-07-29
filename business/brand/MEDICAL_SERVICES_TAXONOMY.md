# Medical Services Taxonomy

> **Version:** 1.0
> **Date:** 2026-07-29
> **Status:** Source of Truth — shared by the Website Platform and Campaign OS
> **Governed by:** `MASTER_BRAND_ARCHITECTURE.md`
> **Read this before modelling any medical entity, in either project.**

---

## Why this document exists

Three systems currently describe the same medical services and agree on 18% of them:
this brand documentation, the Campaign OS sheet, and the website database. They
diverged because each modelled "medical services" as a flat list, and it is not one.

This document is the single definition. Both projects must conform to it.

---

## 1. The rule in one paragraph

**`Medical Services` is a category, not a list.** It contains three kinds of entity
that sit at the same level as siblings — they are peers, not parent and child:

- **Departments** — hospital-wide clinical operations
- **Medical Centers** — branded groupings of clinics *and other services*
- **Outpatient Clinics** — the individual clinic roster

A Medical Center *contains* clinics. But **Outpatient Clinics is also its own Medical
Service**, because a clinic can exist without belonging to any center.

---

## 2. The three kinds

```
Medical Services
│
├── A. Departments  (أقسام)
│      Hospital-wide clinical operations. No clinic roster. Not branded as a center.
│      ICU · Emergency · Operating Rooms · Radiology · Laboratory
│
├── B. Medical Centers  (المراكز الطبية)                    ← Signature Brands
│      A branded concept grouping several clinics of one specialty family,
│      PLUS the non-clinic services that specialty needs.
│      Orthopedic & Sports Injury Center · Cardiac Center · …
│
└── C. Outpatient Clinics  (العيادات الخارجية)
       The individual clinic roster (30–40 clinics).
       A clinic MAY belong to a center. It also may not.
```

### A — Departments

Hospital-wide operations. ICU, Emergency, Operating Rooms, Radiology, Laboratory.

They have no clinic roster and are never a "center". Radiology and Laboratory appear
here **and** as services inside centers — as a department they are the hospital-wide
facility; as a center service they are that center's access to it.

### B — Medical Centers

A Medical Center is **not just a group of clinics**. It is a group of clinics **plus
the other services that specialty needs**.

Worked example — **Orthopedic & Sports Injury Center**:

| Inside the center | |
|---|---|
| **Clinics** | Orthopedic clinic · Rheumatology clinic · Sports Injury clinic |
| **Other services** | Examinations · Imaging (X-ray, MRI) · Laboratory tests · Follow-up programmes |

The clinics are **part of** the center's services — they are not the whole of it. This
is the point of the model: a patient meets one branded destination that carries their
whole journey, instead of a list of disconnected clinics.

**Where centers live.**

- **Today:** every center operates **inside a hospital**.
- **Future:** a center may operate as a **standalone facility** outside any hospital.
  Not built. The data model must allow it; nothing should assume a center always has
  a parent hospital.

### C — Outpatient Clinics

The clinic roster. A clinic is a bookable unit — a specialty, a doctor, a schedule.

**Membership in a center is optional.** There may be a Gynaecology clinic with no
Gynaecology center. The clinic exists, is bookable, and behaves normally.

**A clinic always belongs to a hospital. A clinic optionally belongs to a center.**

---

## 3. Data model

```
Hospital
   │
   ├──< MedicalCenter        0..*     centers inside this hospital
   │        │                         (hospital_id nullable → standalone, future)
   │        ├──< Clinic       0..*     clinics belonging to this center
   │        └──< CenterService 0..*    exams · imaging · labs · programmes
   │                                   (NOT clinics — the other services)
   └──< Clinic               0..*     every clinic belongs to a hospital
```

### Relationships, stated exactly

| From | To | Cardinality | Nullable | Meaning |
|---|---|---|---|---|
| Clinic | Hospital | many → 1 | **No** | Every clinic is in a hospital |
| Clinic | MedicalCenter | many → 1 | **Yes** | A clinic may have no center |
| MedicalCenter | Hospital | many → 1 | **Yes** *(future)* | Today always set; standalone centers later |
| MedicalCenter | CenterService | 1 → many | — | Non-clinic services of the center |

### The two rules that matter most

1. **`Clinic.medicalCenterId` is nullable.** Every query, page and booking step must
   work when it is `null`. A clinic without a center is normal, not an error state.
2. **`MedicalCenter.hospitalId` should be nullable** even though it is always set
   today. Standalone centers are a stated future step, and a non-null constraint now
   becomes a migration later.

---

## 4. What this changes on the website

### 4.1 "Book your doctor" becomes "Book your clinic"

The booking entry point is **the clinic**, not the doctor.

| Before | After |
|---|---|
| احجز طبيبك | **احجز عيادتك** |

A patient chooses a clinic. The doctor is an attribute of the clinic and its schedule,
not the thing being chosen.

### 4.2 The booking flow

```
Patient taps  «احجز عيادتك»
        ↓
   picks a clinic
        ↓
   ┌────────────────────────────────────┐
   │ does this clinic belong to a center?│
   └────────────────────────────────────┘
        │                          │
       YES                        NO
        │                          │
 show the center it               show nothing about
 belongs to, linked               centers — no empty
 to the center page               state, no placeholder
        │                          │
        └────────────┬─────────────┘
                     ↓
        show the hospital (always)
                     ↓
        continue booking normally
```

**Both paths complete the booking identically.** Center membership adds context; it
never adds a step, a condition or a blocker.

### 4.3 What must not happen

- A clinic with no center must not show an empty "Center" field, a dash, or
  "Not assigned". It shows nothing.
- The booking must not require a center. A missing center is not a validation failure.
- A center page must not assume it has a hospital, once standalone centers exist.
- A clinic must never be reachable without its hospital being resolvable.

---

## 5. Applying this to the campaign side

Campaign OS models the same entities in `Campaign Cards`. It must carry a
`Service Level` column so a Department is never filed as a Center:

| Value | Meaning |
|---|---|
| `DEPARTMENT` | ICU, Emergency, Radiology, Laboratory, Operating Rooms |
| `CENTER` | One of the twelve Medical Centers |
| `CLINIC` | An individual outpatient clinic with its own campaign |
| `PROGRAM` | Kabarona, Senior Care |
| `CORPORATE` / `HOSPITAL` / `SUPPORTING` | Non-medical campaign types |

Currently `Campaign Cards` files Emergency, ICU, Laboratory, Diagnostic & Imaging and
Surgical as "Medical Centers". Under this taxonomy they are **Departments**.

---

## 6. The authoritative list of Medical Centers

From `MASTER_BRAND_ARCHITECTURE.md` §5. Anything calling itself a center and not on
this list is a Department, a Clinic, or an error.

| # | Arabic | English |
|---|---|---|
| 1 | مركز القلب والباطنة وإحالة الرعايات الحرجة | Cardiac & Internal Medicine Center |
| 2 | مركز جراحات المسالك والليزر | Urology & Laser Surgery Center |
| 3 | مركز مناظير الجهاز الهضمي والكبد | Digestive & Liver Endoscopy Center |
| 4 | مركز الجراحات العامة والمناظير | General Surgery & Endoscopy Center |
| 5 | مركز القدم السكري والأوعية الدموية | Diabetic Foot & Vascular Center |
| 6 | مركز علاج الألم والتدخلات المحدودة | Pain Management Center |
| 7 | مركز صحة المرأة والطفل | Women's & Children's Health Center |
| 8 | مركز الأسنان للكبار والأطفال وذوي الهمم | Dental Center |
| 9 | مركز الأنف والأذن وجراحات الرقبة والرأس | ENT & Head/Neck Surgery Center |
| 10 | مركز العظام وإصابات الملاعب | Orthopedic & Sports Injury Center |
| 11 | مركز الصدر واضطرابات النوم | Chest & Sleep Disorders Center |
| 12 | مركز صحة كبار السن والفحص الشامل | Senior Health & Screening Center |

### Known divergence to reconcile

The website database currently seeds centers that are not on this list —
**Ophthalmology** and **Dermatology** — and omits six that are. Until reconciled, the
public site advertises services no campaign supports.

Reconciling is a decision for the brand owner, not a merge: either those centers exist
and belong in §6, or they are clinics without a center and belong under §2 C.

---

## 7. Glossary

| Arabic | English | Meaning here |
|---|---|---|
| الخدمات الطبية | Medical Services | The category containing all three kinds |
| قسم | Department | Hospital-wide clinical operation |
| مركز طبي | Medical Center | Branded grouping of clinics + services |
| العيادات الخارجية | Outpatient Clinics | The clinic roster |
| عيادة | Clinic | One bookable specialty unit |
| خدمات المركز | Center Services | Non-clinic services inside a center |

---

*End of Medical Services Taxonomy.*
