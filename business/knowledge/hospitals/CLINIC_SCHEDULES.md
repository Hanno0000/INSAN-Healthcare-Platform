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

**Source:** the brand owner's typed table, 2026-08-08 — which replaced a
photograph of a handwritten page supplied earlier the same day. **The ١١ ص – ٢½
ظهر window comes from the handwritten header and is not in the typed table.**

> ✅ **CONFIRMED by the brand owner, 2026-08-08.** The table below is the typed
> schedule, not the transcription. **Names may now be given.**
>
> ⚠️ **The handwriting transcription was wrong in eight of twelve entries** — it
> is recorded at the foot of this section, because it is the clearest evidence in
> this repository for why an unverified name is withheld rather than published.

| اليوم | عيادة الباطنة / التخصص الأول | التخصص الآخر |
|---|---|---|
| **السبت** | د. جهاد صبري — **باطنة وغدد** | د. رحاب وحيد — **صدر** |
| **الأحد** | د. محمد عمارة — **باطنة** *(ابتداءً من ٢٦/٧)* | د. مؤمن درويش — **عظام** |
| **الاثنين** | د. لمياء نجيمة — **باطنة وحميات** | د. عمر عرفة — **مخ وأعصاب** |
| **الثلاثاء** | د. مريم نشأت — **باطنة** | د. أحمد ربيع — **مسالك** |
| **الأربعاء** | د. لبنى الشريف — **باطنة وغدد** | د. أحمد البنداري — **قلب** |
| **الخميس** | د. إسلام حشيش — **باطنة وكلى** | د. لبنى حمد — **قلب** |

**الجمعة — مفيش عيادات في الجدول.**

**Specialties covered at Delta:** باطنة · باطنة وغدد · باطنة وحميات · باطنة وكلى ·
صدر · عظام · مخ وأعصاب · مسالك · قلب. **That is nine**, against Future's five —
and note that **five of the six first-clinic slots are internal medicine with a
subspecialty**, which is the shape of the department rather than a coincidence.

د. محمد عمارة's clinic **started ٢٦/٧**, which has already passed. It is running.

<details>
<summary><strong>⚠️ What the handwriting transcription got wrong — kept as evidence</strong></summary>

Eight of twelve entries were wrong. Recorded because the argument for withholding
an unverified name is otherwise abstract, and this makes it concrete.

| | Read from handwriting | Actually |
|---|---|---|
| السبت ١ | جهاد **مسري** — باطنة | جهاد **صبري** — باطنة **وغدد** |
| السبت ٢ | **وهاب وجيه** — صدر | **رحاب وحيد** — صدر |
| الأحد ١ | محمد **عمار**، من **١٥/١٢** | محمد **عمارة**، من **٢٦/٧** |
| الاثنين ١ | لمياء **جميعة** — باطنة | لمياء **نجيمة** — باطنة **وحميات** |
| الاثنين ٢ | عمر عرفة — **جراحة/أوعية** | عمر عرفة — **مخ وأعصاب** |
| الأربعاء ١ | لبنى الشريف — باطنة | لبنى الشريف — باطنة **وغدد** |
| الخميس ١ | إسلام **حنيش** — باطنة | إسلام **حشيش** — باطنة **وكلى** |
| الخميس ٢ | لبنى **عبد…** — قلب | لبنى **حمد** — قلب |

**The dangerous one is الاثنين ٢.** Read as *جراحة/أوعية*, actually **مخ
وأعصاب**. A patient with a neurological complaint would have been directed to a
vascular surgeon — not a misspelling, a wrong department.

**And السبت ٢ inverted the person entirely**: *وهاب وجيه*, a man's name, is
**رحاب وحيد**, a woman's. A patient arriving asking for "دكتور وهاب" would have
been asking for somebody who does not work there.

Only four entries were right outright.
</details>

<!-- NEEDS-OPERATOR: the confirmed Delta table gives days, doctors and specialties but NO TIMES. The 11ص–2:30م window comes from the header of the handwritten page. Does it apply to every clinic in the table, or only to some? The receptionist is currently giving that window for all of them, and it is the one part of Delta's schedule still resting on the handwriting. Also: the handwritten page had a starred line at its foot reading roughly "الخميس ١٥/١٢" with a title like "أ.م.د" — it is absent from the typed table, so is it cancelled, or a separate clinic that was left out? -->

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

For **Delta**, names may now be given too — the schedule was confirmed typed on
2026-08-08.

⚠️ **But the TIME for Delta is the one thing still unconfirmed.** The typed table
gives days and doctors, not hours; the ١١ص–٢½ظ window comes from the handwritten
header. Give it as the usual window, not as a guarantee:

> «العيادة عادة من ١١ الصبح لحد ٢ ونص، بس خليني أأكدلك الميعاد قبل ما تيجي.»

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
