# أمر شغل — تصحيح الدومين والإيميل + رفع محتوى معرفي جديد

> **للمنفّذ:** الووركر اللي عنده SSH على السيرفر.
> **مفيش أي سر في الملف ده.**

---

## ⚠️ الخطوة صفر — التوكن (للمهام 3 و4 و5 بس)

```javascript
(await (await fetch('/api/v1/auth/refresh',{method:'POST',credentials:'include'})).json()).data.accessToken
```
```javascript
window.TOKEN = 'الصق_التوكن_هنا';
window.H = { 'Authorization': `Bearer ${window.TOKEN}`, 'Content-Type': 'application/json' };
```

---

# 🔴 المهمة 1 — إصلاح الدومين في الـ sitemap (الأهم في الملف ده)

**المشكلة:** الموقع الحي بيقول لمحركات البحث إن عنوانه
`https://insan-web-2026.loca.lt` — ده **رابط نفق تطوير مؤقت وميت**، متسرّب من
مرحلة التطوير. اتأكدت منه دلوقتي:

```
<loc>https://insan-web-2026.loca.lt</loc>
Sitemap: https://insan-web-2026.loca.lt/sitemap.xml
```

يعني أي صفحة جوجل يزحف عليها، بيتقاله "العنوان الحقيقي هو الرابط الميت ده".

**السبب:** المتغير `NEXT_PUBLIC_SITE_URL` في `website/.env.production` لسه شايل
القيمة القديمة.

## 1.1 عدّل المتغير

```bash
cd /root/INSAN-Healthcare-Platform/website
cp .env.production .env.production.bak-$(date +%Y%m%d-%H%M%S)
grep -n 'NEXT_PUBLIC_SITE_URL\|NEXT_PUBLIC_API_BASE_URL\|CORS_ORIGIN' .env.production
```

**الصق الناتج** (دي مش أسرار، مجرد عناوين).

بعدين عدّلهم بـ `nano .env.production` للقيم دي:

```
NEXT_PUBLIC_SITE_URL=https://insan-eg.com
NEXT_PUBLIC_API_BASE_URL=https://insan-eg.com/api/v1
CORS_ORIGIN=https://insan-eg.com,http://169.58.77.61
```

> ⚠️ **سيب `http://169.58.77.61` في `CORS_ORIGIN`** — سكربتات وأدوات كتير لسه
> بتستخدم الـ IP، وشيله هيكسرها.

## 1.2 إعادة بناء إجبارية — مش إعادة تشغيل

`NEXT_PUBLIC_*` في Next.js **بتتحقن وقت البناء مش وقت التشغيل**. يعني تعديل
الملف وإعادة التشغيل **مش هيغيّر حاجة خالص** — لازم إعادة بناء كاملة.

```bash
pwsh /root/INSAN-Healthcare-Platform/website/deploy-to-contabo.ps1
```

## ✅ التحقّق

```bash
curl -s https://insan-eg.com/sitemap.xml | head -5
curl -s https://insan-eg.com/robots.txt | tail -2
```

**المتوقّع:** `insan-eg.com` في الاتنين، و **مفيش أي أثر لـ `loca.lt`**.
لو لسه بيقول `loca.lt` → إعادة البناء ماحصلتش صح، **بلّغ**.

---

# المهمة 2 — بيانات التواصل (إيميل + رقمين + العنوان)

كل القيم دي من `business/brand/CONTACT_DIRECTORY.md` — مصدر الحقيقة المعتمد من
صاحب المشروع.

**أربع تصحيحات:**

| المفتاح | القيمة الجديدة | ليه |
|---|---|---|
| `contact_email` | `info@insan-eg.com` | القيمة القديمة كانت **تخمين مني**، مش موثّقة |
| `contact_phone` | `01500668657,01100755556` | إنسان عندها **رقمين**، والموقع كان بيعرض واحد بس |
| `emergency_phone` | `01500668657` | القيمة القديمة `0403315000` رقم أرضي **صاحب المشروع لم يعتمده للنشر** |
| `contact_address` | **فاضي** | "الغربية" كانت **استنتاج مني وطلع غلط**. مفيش عنوان موثّق، فنسيبه فاضي |

> ℹ️ الكود اتعدّل عشان يقرا `contact_phone` كقائمة أرقام (بيفصل على الفاصلة)،
> ويخفي بلوك العنوان تلقائيًا وهو فاضي. فمفيش فراغ هيبان في التصميم.

```javascript
const SETTINGS = {
  contact_email:   'info@insan-eg.com',
  contact_phone:   '01500668657,01100755556',
  emergency_phone: '01500668657',
  contact_address: '',
};

for (const [key, value] of Object.entries(SETTINGS)) {
  const r = await fetch(`/api/v1/admin/settings/${key}`, {
    method: 'PATCH', headers: H, body: JSON.stringify({ value })
  });
  console.log(key.padEnd(16), r.status === 200 ? '✅' : '❌ ' + r.status + ' ' + await r.text());
}
```

**✅ التحقّق:**
```javascript
const s = (await (await fetch('/api/v1/settings')).json()).data;
['contact_email','contact_phone','emergency_phone','contact_address'].forEach(k => {
  const v = s.find(x => x.key === k)?.value;
  console.log(k.padEnd(16), JSON.stringify(v));
});
```

**المتوقّع:** الإيميل `info@insan-eg.com` · الهاتف فيه **الرقمين** · الطوارئ
`01500668657` · العنوان `""` فاضي.

> ⚠️ لو `contact_address` رجّع خطأ لأن القيمة الفاضية مرفوضة، جرّب `{"ar":"","en":""}`
> بدلها وبلّغني بالنتيجة.

---

# المهمة 3 — وصف مستشفى المستقبل

المصدر: `business/knowledge/hospitals/HOSPITAL_FUTURE.md` — ملف جديد اتضاف
2026-08-08، وفيه أرقام الأسرّة مؤكدة من صاحب المشروع نفسه.

> ⚠️ **متزوّدش أي رقم مش مكتوب هنا.** الملف المصدري بيمنع صراحة أي رقم سعة غير
> المذكور، وأي ادعاء عن عدد الأطباء أو الممرضين، وأي ادعاء اعتماد.
> **ومتكتبش عنوان للمستشفى** — فيه سؤال مفتوح هل هو في طنطا ولا القاهرة.

```javascript
// ⛔ ممنوع تعديل أي نص هنا
const FUTURE_DESCRIPTION = {
  ar: 'مستشفى المستقبل التخصصي أحد مستشفيَي منظومة إنسان، تديره مجموعة ويدج للخدمات الطبية. يتكوّن من مبنى رئيسي واحد من دور أرضي وأربعة أدوار علوية، مُنظَّمة بحيث تتوزّع الخدمات الجراحية والحرجة والإقامة الداخلية رأسيًا فوق دور الاستقبال والطوارئ.\n\nيعمل قسم الطوارئ على مدار 24 ساعة ويستقبل الحالات الحرجة وإصابات الطرق والحوادث، بينما تعمل العيادات الخارجية التخصصية من الساعة 10 صباحًا حتى 10 مساءً، ويعمل المعمل على مدار الساعة.\n\nيضم المستشفى وحدتَي عناية مركزة منفصلتين في دورين مختلفين بسعة 9 أسرّة، وقسم إقامة داخلية بسعة 26 سريرًا تتدرّج غرفه من الدرجة الأولى القياسية حتى الأجنحة المميزة، وثلاث غرف عمليات مجهزة لمختلف التخصصات الجراحية، ووحدة حضّانات لحديثي الولادة، وقسم تعقيم مركزي، وغرفة غازات طبية، وصيدلية.\n\nتتوفر التشخيصات داخل المستشفى: معمل يعمل 24 ساعة يغطي أمراض الدم والمناعة والفيروسات والهرمونات وكل الكيمياء الحيوية والمزارع والباثولوجيا والخلوية، وأشعة تشمل الأشعة السينية والمقطعية والموجات فوق الصوتية والدوبلر وإيكو القلب، ووحدة مناظير للجهاز الهضمي والقولون والقنوات المرارية.\n\nتُقدَّم الخدمة الطبية على يد أساتذة واستشاريين من جامعات مصرية متعددة.',
  en: "Future Specialized Hospital is one of the two hospitals operating under the INSAN Healthcare Platform, managed by Wedge Group Medical Services. It occupies a single main building of a ground floor plus four upper floors, laid out so that surgical, critical and inpatient services stack vertically above the reception and emergency level.\n\nThe Emergency Department operates 24 hours a day, receiving critical cases, road-traffic injuries and accidents, while specialized outpatient clinics run from 10:00 AM to 10:00 PM and the laboratory operates around the clock.\n\nThe hospital has two separate intensive care units on different floors with a combined 9 beds, an inpatient section of 26 beds graded from standard first class up to premium suites, three operating theatres equipped for the various surgical specialties, a neonatal incubator unit, a central sterilisation department, a medical gas room and a pharmacy.\n\nDiagnostics are available on site: a 24-hour laboratory covering haematology and immunology, virology, hormones, all chemistry panels and cultures, histopathology and cytology; radiology covering plain X-ray, CT, ultrasound, Doppler and echocardiography; and an endoscopy unit for the gastrointestinal tract, colon and biliary ducts.\n\nMedical care is delivered by professors and consultants drawn from multiple Egyptian universities."
};

const hs = (await (await fetch('/api/v1/admin/hospitals?pageSize=50',{headers:H})).json()).data;
const future = hs.find(x => x.slug === 'future-hospital');
const before = (await (await fetch(`/api/v1/admin/hospitals/${future.id}`,{headers:H})).json()).data;
console.log('عدد الأقسام قبل:', (before.departments||[]).length);

const r = await fetch(`/api/v1/admin/hospitals/${future.id}`, {
  method: 'PATCH', headers: H, body: JSON.stringify({ description: FUTURE_DESCRIPTION })
});
console.log(r.status === 200 ? '✅ اتحفظ' : '❌ ' + r.status + ' ' + await r.text());
```

**✅ التحقّق:**
```javascript
const f = (await (await fetch('/api/v1/hospitals/future-hospital')).json()).data;
console.log('طول الوصف:', (f.description?.ar||'').length, '(المتوقع > 900)');
console.log('عدد الأقسام (لازم يفضل 6):', (f.departments||[]).length);
```

---

# المهمة 4 — محتوى برامج الفحص الشامل

المصدر: `business/knowledge/programs/PROGRAM_CHECKUP.md` (جديد 2026-08-08).

> ⚠️ **البرنامج الرابع وصل ناقصًا في المصدر** — قائمة الأشعة وما يحصل عليه
> المريض اتقطعت. فمكتوبش عنهم حاجة هنا عمدًا. **متكمّلهاش من عندك.**

```javascript
// ⛔ ممنوع تعديل أي نص هنا
const CHECKUP = {
  description: {
    ar: 'أربعة برامج للفحص الصحي الشامل، يُستكمل كل منها في زيارة واحدة، وتتدرّج من فحص أساسي إلى تقييم متعدد التخصصات. تعمل البرامج في مستشفى المستقبل التخصصي ومستشفى الدلتا الدولي.\n\nيجمع كل برنامج بين الكشف لدى استشاريين، والتحاليل المعملية، والأشعة والفحوصات، وفترة إقامة مستضافة داخل المستشفى، وينتهي بتقرير طبي مكتوب وخطة متابعة.',
    en: 'Four comprehensive health-assessment programmes, each completed in a single visit, escalating from a basic screen to a full multi-specialty assessment. They run at both Future Specialized Hospital and Delta International Hospital.\n\nEach programme combines consultant examinations, laboratory work, imaging and examinations, and a period of hosted stay inside the hospital, ending with a written medical report and a follow-up plan.'
  },
  features: [
    { ar: 'يُستكمل البرنامج في زيارة واحدة', en: 'Completed in a single visit' },
    { ar: 'كشف لدى استشاريين في تخصصات متعددة', en: 'Examination by consultants across multiple specialties' },
    { ar: 'تحاليل وأشعة داخل نفس الزيارة', en: 'Laboratory work and imaging within the same visit' },
    { ar: 'إقامة مستضافة داخل جناح مخصص', en: 'A hosted stay in a dedicated wing' },
    { ar: 'تقرير طبي مكتوب وخطة متابعة عند المغادرة', en: 'A written medical report and follow-up plan on leaving' }
  ],
  services: [
    { ar: 'برنامج الوقاية والاطمئنان — لمن هم فوق 55 سنة', en: 'Prevention & Reassurance Programme — for those over 55' },
    { ar: 'برنامج القلب والسكر', en: 'Heart & Diabetes Programme' },
    { ar: 'البرنامج الذهبي لكبار السن', en: 'The Golden Programme for Seniors' },
    { ar: 'برنامج كبارنا VIP 360', en: 'Kabarona VIP 360 Programme' }
  ]
};

const cs = (await (await fetch('/api/v1/admin/medical-centers?pageSize=60',{headers:H})).json()).data;
const chk = cs.find(x => x.slug === 'check-up-programs');
const r2 = await fetch(`/api/v1/admin/medical-centers/${chk.id}`, {
  method: 'PATCH', headers: H, body: JSON.stringify(CHECKUP)
});
console.log(r2.status === 200 ? '✅ اتحفظ' : '❌ ' + r2.status + ' ' + await r2.text());
```

**✅ التحقّق:**
```javascript
const c = (await (await fetch('/api/v1/medical-centers?pageSize=60')).json()).data.find(x=>x.slug==='check-up-programs');
console.log('وصف:', (c.description?.ar||'').length, '| خدمات:', (c.services||[]).length, '| مميزات:', (c.features||[]).length);
```
**المتوقّع:** وصف > 400، خدمات 4، مميزات 5.

---

# المهمة 5 — إنشاء مركز الجهاز الهضمي (مركز جديد)

المصدر: `business/knowledge/centers/MEDICAL_CENTER_DIGESTIVE.md` (جديد 2026-08-08)
— `CEN-016` في سجل الكيانات، ومش موجود على الموقع خالص.

> ⚠️ **الملف المصدري بيحجب "المميزات" صراحة** — صاحب المشروع قال ما يتذكرش إلا
> المؤكد وجوده فعليًا، وده لسه غير محسوم. **فالمركز هيتضاف بوصف وخدمات بس، بلا
> مميزات. ده مقصود مش نقص.**
>
> ⚠️ **ومتضفش "ERCP" للخدمات** — المصدر بيقول توفّره في كل مستشفى "لسه محتاج
> تأكيد".

```javascript
// ⛔ ممنوع تعديل أي نص هنا
const DIGESTIVE = {
  slug: 'digestive-endoscopy-center',
  type: 'CENTER',
  status: 'PUBLISHED',
  name: { ar: 'مركز مناظير الجهاز الهضمي', en: 'Digestive Endoscopy Center' },
  shortDescription: {
    ar: 'مركز متخصص في مناظير الجهاز الهضمي التشخيصية والعلاجية — تشخيص أدق، وتدخل علاجي في نفس الجلسة عند الحاجة.',
    en: 'A center specialized in diagnostic and therapeutic digestive endoscopy — a more accurate diagnosis, with therapeutic intervention in the same sitting where needed.'
  },
  description: {
    ar: 'مركز متخصص في مناظير الجهاز الهضمي التشخيصية والعلاجية: المعدة والاثني عشر، والقولون والمستقيم، والقنوات المرارية والبنكرياسية. يعمل المركز في مستشفى المستقبل التخصصي ومستشفى الدلتا الدولي.\n\nالمنظار عندنا ليس إجراءً يُباع، بل وسيلة لتشخيص أدق، وتدخل علاجي في نفس الجلسة حين تستدعي الحالة، في إطار من الأمان والخصوصية وفريق متخصص ومتابعة بعد الإجراء.\n\nيغطي المركز مناظير الجهاز الهضمي العلوي، ومناظير القولون، وأخذ العينات، واستئصال اللحميات في الحالات المناسبة، والتعامل المنظاري مع بعض حالات النزيف، وتوسيع بعض الضيقات، وتقييم ومتابعة أمراض الجهاز الهضمي بالتنسيق مع عيادات الباطنة والجراحة.',
    en: 'A center specialized in diagnostic and therapeutic endoscopy of the digestive system: the stomach and duodenum, the colon and rectum, and the bile and pancreatic ducts. It operates at both Future Specialized Hospital and Delta International Hospital.\n\nThe endoscope here is not sold as a procedure — it is a means to a more accurate diagnosis, with a therapeutic intervention in the same sitting where the case calls for one, within a setting of safety, privacy, a specialized team and follow-up after the procedure.\n\nThe center covers upper GI endoscopy, colonoscopy, biopsy and tissue sampling, polyp removal where appropriate, endoscopic management of some cases of bleeding, dilation of some strictures, and the assessment and follow-up of digestive conditions in coordination with the gastroenterology and surgical clinics.'
  },
  services: [
    { ar: 'مناظير الجهاز الهضمي العلوي (المريء والمعدة والاثني عشر)', en: 'Upper GI endoscopy (oesophagus, stomach and duodenum)' },
    { ar: 'مناظير القولون والمستقيم', en: 'Colonoscopy' },
    { ar: 'أخذ العينات والفحص النسيجي', en: 'Biopsy and tissue sampling' },
    { ar: 'استئصال اللحميات في الحالات المناسبة', en: 'Polyp removal where the case is appropriate' },
    { ar: 'التعامل المنظاري مع بعض حالات النزيف', en: 'Endoscopic management of some cases of bleeding' },
    { ar: 'توسيع بعض الضيقات', en: 'Dilation of some strictures' },
    { ar: 'تقييم ومتابعة أمراض الجهاز الهضمي', en: 'Assessment and follow-up of digestive conditions' }
  ]
};

const r3 = await fetch('/api/v1/admin/medical-centers', {
  method: 'POST', headers: H, body: JSON.stringify(DIGESTIVE)
});
const out = await r3.text();
console.log(r3.status === 200 || r3.status === 201 ? '✅ اتضاف' : '❌ ' + r3.status + ' ' + out);
```

**✅ التحقّق:**
```javascript
const all = (await (await fetch('/api/v1/medical-centers?pageSize=60')).json()).data;
const d = all.find(x => x.slug === 'digestive-endoscopy-center');
console.log(d ? `✅ موجود | خدمات: ${(d.services||[]).length} | وصف: ${(d.description?.ar||'').length}` : '❌ مش موجود');
console.log('إجمالي المراكز من نوع CENTER:', all.filter(x=>x.type==='CENTER').length, '(كان 8، المتوقع 9)');
```

**وافتح بعينك:** `https://insan-eg.com/medical-centers/digestive-endoscopy-center`

> ℹ️ **لو الإنشاء فشل بسبب حقل ناقص** — الصق نص الخطأ كما هو وبلّغ. **متخترعش
> قيم لحقول مطلوبة.**

---

# 📋 قواعد ملزمة

## ⛔ ممنوعات
1. **ممنوع `db:seed`** — بيمسح آراء المرضى وعيادات وأسئلة حجز المستشفيات. (`seed-brands.ts` وحده هو الآمن.)
2. **متزوّدش أي رقم أو ادعاء مش مكتوب في الملف ده** — لا أسرّة، ولا عدد أطباء، ولا اعتماد، ولا عنوان لمستشفى المستقبل.
3. **متضفش مميزات لمركز الجهاز الهضمي** ولا ERCP للخدمات.
4. **متكمّلش البرنامج الرابع** في الفحص الشامل.
5. **متشيلش `http://169.58.77.61` من `CORS_ORIGIN`.**

## ✅ إلزاميات
1. المهمة 1 محتاجة **إعادة بناء كاملة** مش إعادة تشغيل.
2. الصق ناتج كل تحقّق كما هو.
3. أي حاجة اختلفت — بلّغ ومتصلّحهاش من عندك.

## 📊 التقرير المطلوب
```
المهمة 1 (الدومين/sitemap): ✅/❌ — [الصق sitemap + robots]
المهمة 2 (الإيميل): ✅/❌ — [الصق]
المهمة 3 (وصف المستقبل): ✅/❌ — [الصق]
المهمة 4 (الفحص الشامل): ✅/❌ — [الصق]
المهمة 5 (مركز الجهاز الهضمي): ✅/❌ — [الصق]

مشاكل واجهتني: [اكتبها، متخفيش حاجة]
```
