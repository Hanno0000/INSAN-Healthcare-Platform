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
time yet — see §4.

---

# 2. Delta International Hospital

**Source:** the brand owner's typed table, 2026-08-08, with the hours confirmed
separately the same day.

> ✅ **الجدول كله من ١١:٠٠ صباحًا إلى ١:٣٠ ظهرًا** — every clinic in the table,
> every day. *(Brand owner, 2026-08-08.)*
>
> ⚠️ That also corrects the handwritten header, which was read here as **٢½ ظهر**
> and is actually **١:٣٠**. It is the ninth error from that page — see the
> comparison below.

> ✅ **CONFIRMED by the brand owner, 2026-08-08.** The table below is the typed
> schedule, not the transcription. **Names may now be given.**
>
> ⚠️ **The handwriting transcription was wrong in nine of thirteen entries** — it
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

Nine of thirteen entries were wrong, counting the hours. Recorded because the argument for withholding
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
| الميعاد | من العنوان: **١١ص – ٢½ظ** | **١١ص – ١:٣٠م** |

**The dangerous one is الاثنين ٢.** Read as *جراحة/أوعية*, actually **مخ
وأعصاب**. A patient with a neurological complaint would have been directed to a
vascular surgeon — not a misspelling, a wrong department.

**And السبت ٢ inverted the person entirely**: *وهاب وجيه*, a man's name, is
**رحاب وحيد**, a woman's. A patient arriving asking for "دكتور وهاب" would have
been asking for somebody who does not work there.

Only four were right outright.
</details>

<!-- NEEDS-OPERATOR: the confirmed Delta table gives days, doctors and specialties but NO TIMES. The 11ص–2:30م window comes from the header of the handwritten page. Does it apply to every clinic in the table, or only to some? The receptionist is currently giving that window for all of them, and it is the one part of Delta's schedule still resting on the handwriting. Also: the handwritten page had a starred line at its foot reading roughly "الخميس ١٥/١٢" with a title like "أ.م.د" — it is absent from the typed table, so is it cancelled, or a separate clinic that was left out? -->

⚠️ **The window is much shorter than Future's — two and a half hours against
twelve.** `HOSPITAL_DELTA.md` records the outpatient *department* as running
**١٠ص – ١٠م** from the hospital's description PDF, while these named clinics run
**١١ص – ١:٣٠م**.

Both can be true: the department is open longer than any individual consultant
sits. But a receptionist answering *"العيادات بتفتح امتى؟"* would give a
different answer from each, so the rule is: **give the clinic's time, not the
department's.** A patient arriving at 4pm for د. جهاد صبري finds the hospital
open and the clinic finished.

---


---

# 3. أسعار الكشف

**Stated by the brand owner, 2026-08-08.** These are consultation fees only —
laboratory work, imaging and procedures are billed separately.

| الكشف | الدلتا | المستقبل |
|---|---:|---:|
| **الكشف العادي** — عيادات كبارنا / الباطنة | **٤٠ جنيه** | **١٠٠ جنيه** |
| **المسالك** | **٢٠٠ جنيه** | **٣٠٠ جنيه** |
| **الأنف والأذن** | **٢٠٠ جنيه** | **٣٠٠ جنيه** |

**Delta is consistently cheaper**, and by a wide margin at the general clinic —
forty pounds against a hundred. That is not a discount, it is the two hospitals'
different pricing regimes; see §3.1.

⚠️ **The forty and the hundred are the Kabarona clinic consultation**, which is
the same clinic as the outpatient consultation — the brand owner confirmed on
2026-08-08 that these are one and the same. A Kabarona member and a walk-in are
paying the same fee for the same seat.

<!-- NEEDS-OPERATOR: consultation prices exist for three clinic types — general, urology, ENT. What about the rest? Delta's table alone runs صدر, عظام, مخ وأعصاب, قلب, and the باطنة subspecialties غدد, حميات, كلى. Is 200 the standard Delta specialty fee and 300 the standard Future one, or are those two figures specific to urology and ENT? The receptionist is asked the price on nearly every call and currently can answer for three clinics out of nine. -->

### 3.1 Why the two hospitals price differently

**Delta** — laboratory and imaging prices **follow the published
مؤسسة العلاجية tariff of 2023**. That is a public, externally set schedule, not a
hospital decision, and it is the reason Delta's prices are both lower and
quotable with confidence.

**Future** — prices are **private (أسعار خاصة)** but positioned as **economic**.
They are the hospital's own and are not bound to the tariff.

⚠️ **This is a genuinely useful thing to say publicly**, and almost nobody does:
Delta's diagnostic pricing is set by an external schedule rather than by the
hospital. It answers the suspicion recorded in
`MEDICAL_CENTER_PEDIATRICS.md` §5.6 — that a hospital prices to profit from a
frightened family — with a fact rather than a reassurance.

<!-- NEEDS-OPERATOR: the مؤسسة العلاجية 2023 tariff is public and the brand owner suggested downloading it. It is deliberately NOT copied into this repository from a web search: a price quoted to a patient must come from a copy the hospital itself stands behind, and a scraped table that is out of date, regionally different or simply the wrong document would be worse than having no prices at all. Please supply the hospital's own price list — the one the accounts desk works from — and it goes in here as a table. -->

### 3.2 What the receptionist may say about price

*   **The three consultation fees above may be given directly.** They are
    confirmed.
*   **For any other clinic**, say the fee is confirmed on booking and take the
    patient's number. Do not extrapolate from 200 or 300 — that is exactly what
    §3's marker is asking about.
*   **For tests and imaging at Delta**, it is honest and reassuring to say the
    prices follow the **published 2023 مؤسسة العلاجية tariff**. Do not quote a
    figure from it until the hospital supplies its own list.
*   **For tests and imaging at Future**, say they are the hospital's own
    economic pricing and will be confirmed. Do not guess.
*   **Never quote a check-up programme price** — none exists. See
    `PROGRAM_CHECKUP.md` §6.1.

# 4. ⚠️ Instructions for the receptionist

**This section is written for the worker that answers patients on the page. It
is the operating rule, not background.**

### 4.1 When a patient asks about a clinic that IS in this file

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

### 4.2 When a patient asks about a clinic that is NOT in this file

**Do not say the clinic does not exist, and do not invent a time.** Most of the
hospital's specialties are simply not in this table yet.

Say — in the patient's own dialect, not as a script:

> «العيادة دي مواعيدها بتتحدد حسب الحالة. سيبلي رقمك وحد من المستشفى
> هيكلمك ويظبط معاك ميعاد العيادة اللي إنت عايزها.»

The commitment is: **someone from the hospital will call and arrange the
appointment with them.** That is the brand owner's instruction of 2026-08-08.

Then capture what is needed to make the call happen — the patient's name, their
number, the specialty they want, and the hospital.

### 4.3 What must never happen

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

# 5. Kabarona

The brand owner confirmed on 2026-08-08 that **the Kabarona programme's clinics
at each hospital are these same clinics** — same doctors, same days, same
sessions.

So a Kabarona enquiry is answered from §1 or §2 exactly as an outpatient enquiry
is, under the same rules in §4.

⚠️ **What is NOT established** is whether a Kabarona patient gets anything
different inside the same session — priority booking, a different fee, a longer
consultation. `PROGRAM_KABARONA.md` describes the programme; this file describes
only when the clinic runs.

<!-- NEEDS-OPERATOR: does a Kabarona member get anything different at these clinics — priority in booking, a different price, a longer visit — or is it the same session on the same terms? The receptionist will be asked this directly by anyone who has heard of the programme. -->

---

# 6. AI & Documentation

### 6.1 Knowledge Scope

**When outpatient clinics run, and who staffs them**, at both hospitals.

**Not covered:** prices, booking channel (see `CONTACT_DIRECTORY.md`), the
clinical content of any specialty, or the Kabarona programme's own strategy.

### 6.2 Intended Consumers

| Consumer | Reads it for |
|---|---|
| **The receptionist** | §1, §2, §3 and above all §4 |
| **`MEDICAL_SERVICE_OUTPATIENT_CLINICS.md`** | the department's schedule |
| **`PROGRAM_KABARONA.md`** | the programme's clinics |
| **Campaign workers** | may state a clinic day; may not state a Delta doctor |
| **The website** | the clinics page |

### 6.3 Relationship With Other Documentation

*   `HOSPITAL_FUTURE.md` §1.5 and `HOSPITAL_DELTA.md` — the departments' opening
    hours, which are wider than these clinic windows.
*   `CONTACT_DIRECTORY.md` — the numbers a patient books on.
*   `ENTITY_REGISTRY.md` — which centres exist at which hospital. A specialty
    having a clinic here does **not** make it a registered Centre.

### 6.4 Maintenance Policy

**Update the moment a clinic is added, moved or cancelled.** This is the file
that changes most often in the entire knowledge base, because a schedule is a
living thing and a wrong one is worse than none.

Update also when Delta's typed schedule arrives (§2), when the two Future
ambiguities are cleared (§1), and when the Kabarona question is answered (§4).

### 6.5 Versioning Philosophy

*   **v1.0** — 2026-08-08. Future from `جدول عيادات.xlsx`; Delta transcribed from
    a photograph of a handwritten page and marked unverified.

### 6.6 Document Metadata

| | |
|---|---|
| Document type | Business Knowledge Base — Operational Reference |
| Builds a campaign card | **No** — it is a schedule, not an entity |
| Authority | Primary Source of Truth for clinic days and times |
| Sources | `جدول عيادات.xlsx`; handwritten Delta page; brand owner, 2026-08-08 |
