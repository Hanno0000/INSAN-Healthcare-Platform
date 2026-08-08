---
entity_id:      —
campaign_name:  —
builds_card:    false
service_level:  REFERENCE
campaign_type:  Operational
parent:         null
hospitals:      [Future, Delta]
status:         Active
version:        1.0
last_updated:   2026-08-08
---

# Purpose

**This file is the Source of Truth for outpatient clinic days, times and
doctors at both hospitals.**

It has two consumers and they are the reason it is one file rather than four:

| Consumer | Uses it as |
|---|---|
| **العيادات الخارجية** — `MEDICAL_SERVICE_OUTPATIENT_CLINICS.md` | the department's schedule |
| **برنامج كبارنا** — `PROGRAM_KABARONA.md` | the programme's clinics |

The brand owner confirmed on 2026-08-08 that **these are the same clinics**. A
Kabarona patient and an outpatient patient are booking into the same session with
the same doctor. Keeping two copies would mean two schedules that drift, and a
receptionist quoting whichever file it happened to open.

**When a clinic time changes, it changes here — once.**

# Document Philosophy

Written for a reader who knows nothing, and read by something that talks to
patients. A wrong time here sends a real person to a hospital on the wrong day.

So the two hospitals are recorded at **different levels of confidence, and the
difference is stated rather than smoothed over.** Future's schedule came from a
typed spreadsheet. Delta's came from a photograph of a handwritten page, and
handwriting is not a source you publish names from without confirmation.

---

# 1. Future Specialized Hospital

**Source:** `جدول عيادات.xlsx`, supplied by the brand owner 2026-08-08. Typed,
unambiguous.

**The clinic day runs 10:00 ص – 10:00 م**, in six two-hour slots — which matches
what `HOSPITAL_FUTURE.md` §1.5 states from the hospital's own description
document.

| اليوم | الوقت | عيادة ١ | عيادة ٢ |
|---|---|---|---|
| **السبت** | ١٠ص – ١٢ظ | د/ عبدالحي منصور — **جهاز هضمي** | |
| | ٢م – ٤م | د/ أمجد إبراهيم — **باطنة وقلب** | |
| **الأحد** | ١٠ص – ١٢ظ | د/ أشرف عادل — **صدر** | د/ محروس — **مخ وأعصاب** ⚠️ |
| **الاثنين** | ١٠ص – ١٢ظ | د/ عبدالحي منصور — **جهاز هضمي** | |
| | ١٢ظ – ٢م | د/ هاني نشأت — **كلى** | د/ أشرف عادل — **صدر** |
| **الثلاثاء** | ٣ظ – ٥م | د/ محروس — **مخ وأعصاب** | |
| **الأربعاء** | ١٠ص – ١٢ظ | د/ أحمد سلام — **باطنة وقلب** | |
| | ٨م – ١٠م | د/ أحمد سلام — **باطنة وقلب** | |
| **الخميس** | ١٢ظ – ٢م | د/ هاني نشأت — **كلى** | |

**الجمعة — مفيش عيادات في الجدول.**

⚠️ The Sunday entry for د/ محروس reads **"من ١–١١"** in the source cell. That is
recorded verbatim because it is ambiguous: it may be a time range or a date
range, and the two mean completely different things to a patient.

<!-- NEEDS-OPERATOR: Future, Sunday, clinic 2 — the cell says "د/ محروس مخ واعصاب من 1-11". Is that a time (1pm to 11pm), a date range, or something else? Until it is clear the receptionist gives the day but not the hour for that one clinic. -->

**Specialties currently covered at Future:** جهاز هضمي · باطنة وقلب · صدر · كلى ·
مخ وأعصاب. **That is five.** Every other specialty at Future has no published
time yet — see §3.

---

# 2. Delta International Hospital

**Source:** a photograph of a handwritten page, supplied by the brand owner
2026-08-08. **The header reads ١١ ص – ٢½ ظهر.**

> ⚠️ **THE DOCTORS' NAMES BELOW ARE AN UNVERIFIED TRANSCRIPTION FROM
> HANDWRITING, AND THE RECEPTIONIST MUST NOT GIVE A NAME FROM THIS TABLE.**
>
> The days, the two-clinic structure and the 11:00 ص – 2:30 م window are legible
> and safe to use. The names are not: several are read at moderate confidence,
> and a doctor's name given wrongly to a patient is a specific person
> misidentified to someone about to walk into a hospital and ask for them.
>
> **What the receptionist may say from this table:** the day, the time window,
> and the specialty. **What it may not say:** who.

**Reading of the page, for the brand owner to correct:**

| اليوم | عيادة (١) | عيادة (٢) |
|---|---|---|
| **السبت** | جهاد مسري — باطنة | وهاب وجيه — صدر |
| **الأحد** | محمد عمار — باطنة | مؤمن درويش — عظام |
| **الاثنين** | لمياء جميعة — باطنة | عمر عرفة — جراحة/أوعية *(specialty unclear)* |
| **الثلاثاء** | مريم نشأت — باطنة | أحمد ربيع — مسالك |
| **الأربعاء** | لبنى الشريف — باطنة | أحمد البنداري — قلب |
| **الخميس** | إسلام حنيش — باطنة | لبنى عبد… — قلب |

Two further marks on the page could not be read with any confidence: a note
beside الأحد that may be a start date, and a starred line at the foot beginning
**"الخميس ١٥/١٢"** with a title that looks like **أ.م.د**.

<!-- NEEDS-OPERATOR: Delta's clinic schedule needs to be supplied TYPED, the way Future's was, before any name from it reaches a patient. Every doctor name in §2 is a transcription from handwriting and several are uncertain. Specifically unclear: (1) عيادة 2 on الاثنين — the specialty, read as "جراحة" or "أوعية"; (2) the surname on الخميس عيادة 2, read as "لبنى عبد…"; (3) the note beside الأحد that may be a start date; (4) the starred line at the foot beginning "الخميس ١٥/١٢". Also: does the 11ص–2:30م window apply to every row, or only to some? -->

⚠️ **Note the window is much shorter than Future's.** Delta's page says
**١١ص – ٢½ظ**, while `HOSPITAL_DELTA.md` records the outpatient department as
running **١٠ص – ١٠م** from the hospital's description PDF. Both can be true — the
department opens longer than these particular clinics — but a receptionist
answering "متى تفتح العيادات؟" would give a different answer from each. The
specific clinic times in this table are the ones to give.

---

# 3. ⚠️ Instructions for the receptionist

**This section is written for the worker that answers patients on the page. It
is the operating rule, not background.**

### 3.1 When a patient asks about a clinic that IS in this file

Give **the day, the time, and the specialty**, from the table for the hospital
they are asking about.

For **Future**, the doctor's name may also be given — it comes from a typed
schedule.

For **Delta**, **do not give the doctor's name.** Give the day, the window and
the specialty only. See the warning in §2.

### 3.2 When a patient asks about a clinic that is NOT in this file

**Do not say the clinic does not exist, and do not invent a time.** Most of the
hospital's specialties are simply not in this table yet.

Say — in the patient's own dialect, not as a script:

> «العيادة دي مواعيدها بتتحدد حسب الحالة. سيبلي رقمك وحد من المستشفى
> هيكلمك ويظبط معاك ميعاد العيادة اللي إنت عايزها.»

The commitment is: **someone from the hospital will call and arrange the
appointment with them.** That is the brand owner's instruction of 2026-08-08.

Then capture what is needed to make the call happen — the patient's name, their
number, the specialty they want, and the hospital.

### 3.3 What must never happen

*   **Never invent a clinic time.** Not "probably mornings", not "usually
    Sunday". A patient who travels on a guess arrives to a closed door.
*   **Never give a Delta doctor's name** from §2 until it is confirmed.
*   **Never say a specialty is unavailable** because it is absent here. This file
    is incomplete by design and says so.
*   **Never quote Future's times for Delta or the reverse.** They are different
    hospitals with different windows, and §1 and §2 are not interchangeable.
*   **Never promise a specific appointment.** The promise is a **call back to
    arrange one** — not a slot.

---

# 4. Kabarona

The brand owner confirmed on 2026-08-08 that **the Kabarona programme's clinics
at each hospital are these same clinics** — same doctors, same days, same
sessions.

So a Kabarona enquiry is answered from §1 or §2 exactly as an outpatient enquiry
is, under the same rules in §3.

⚠️ **What is NOT established** is whether a Kabarona patient gets anything
different inside the same session — priority booking, a different fee, a longer
consultation. `PROGRAM_KABARONA.md` describes the programme; this file describes
only when the clinic runs.

<!-- NEEDS-OPERATOR: does a Kabarona member get anything different at these clinics — priority in booking, a different price, a longer visit — or is it the same session on the same terms? The receptionist will be asked this directly by anyone who has heard of the programme. -->

---

# 5. AI & Documentation

### 5.1 Knowledge Scope

**When outpatient clinics run, and who staffs them**, at both hospitals.

**Not covered:** prices, booking channel (see `CONTACT_DIRECTORY.md`), the
clinical content of any specialty, or the Kabarona programme's own strategy.

### 5.2 Intended Consumers

| Consumer | Reads it for |
|---|---|
| **The receptionist** | §1, §2 and above all §3 |
| **`MEDICAL_SERVICE_OUTPATIENT_CLINICS.md`** | the department's schedule |
| **`PROGRAM_KABARONA.md`** | the programme's clinics |
| **Campaign workers** | may state a clinic day; may not state a Delta doctor |
| **The website** | the clinics page |

### 5.3 Relationship With Other Documentation

*   `HOSPITAL_FUTURE.md` §1.5 and `HOSPITAL_DELTA.md` — the departments' opening
    hours, which are wider than these clinic windows.
*   `CONTACT_DIRECTORY.md` — the numbers a patient books on.
*   `ENTITY_REGISTRY.md` — which centres exist at which hospital. A specialty
    having a clinic here does **not** make it a registered Centre.

### 5.4 Maintenance Policy

**Update the moment a clinic is added, moved or cancelled.** This is the file
that changes most often in the entire knowledge base, because a schedule is a
living thing and a wrong one is worse than none.

Update also when Delta's typed schedule arrives (§2), when the two Future
ambiguities are cleared (§1), and when the Kabarona question is answered (§4).

### 5.5 Versioning Philosophy

*   **v1.0** — 2026-08-08. Future from `جدول عيادات.xlsx`; Delta transcribed from
    a photograph of a handwritten page and marked unverified.

### 5.6 Document Metadata

| | |
|---|---|
| Document type | Business Knowledge Base — Operational Reference |
| Builds a campaign card | **No** — it is a schedule, not an entity |
| Authority | Primary Source of Truth for clinic days and times |
| Sources | `جدول عيادات.xlsx`; handwritten Delta page; brand owner, 2026-08-08 |
