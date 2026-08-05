# تعليمات تجهيز وضخّ بيانات منظومة إنسان — دليل كامل من الصفر

> **لو أنت AI بتقرأ الملف ده، اقرأه كامل قبل ما تعمل أي حاجة.** الملف ده مكتوب على أساس إنك **متعرفش أي حاجة عن المشروع أو عن المحادثة اللي قبل كده**. كل مصطلح هتلاقيه متشرح. اتبع الخطوات بالترتيب، ومتخترعش خطوات من عندك.

---

## 0. الصورة الكاملة في 3 جمل

منصة "إنسان للرعاية الصحية" (INSAN Healthcare Platform) موقع ويب حقيقي شغّال على الإنترنت، وعنده لوحة تحكم (Admin Panel) بيتحكم بيها في محتواه. المحتوى الحالي على الموقع **تجريبي/غلط** (بيانات اختبار من مرحلة تطوير لوحة التحكم). مهمتك: **تجمع البيانات الحقيقية للمشروع من ملفات موجودة في الريبو، تحطها في ملف JSON واحد منظّم، وبعدين تضخّها في قاعدة بيانات الموقع الحيّ مباشرة** (من غير أي رفع كود ولا Git).

المهمة دي **ملهاش علاقة بكتابة كود أو إصلاح باجات** — دي مهمة "إدخال بيانات" بحتة. لو لقيت باج في الكود وانت شغّال، سجّله واستمر، متصلحوش إلا لو حد طلب منك كده صراحة.

---

## 1. مصدر الحقيقة — من فين تجيب البيانات الصحيحة

المشروع فيه فولدر اسمه **`business/`** (في نفس مستوى فولدر `website/` — يعني `J:\My Drive\Insan\business\`). ده مصدر كل المعلومات الحقيقية عن الشركة والمستشفيات والخدمات. جوّاه:

```
business/
├── brand/                          ← أهم فولدر. اقرأه الأول
│   ├── ENTITY_REGISTRY.md          ← ⭐ القائمة الرسمية لكل حاجة موجودة (مستشفيات، مراكز، أقسام، برامج)
│   ├── MEDICAL_SERVICES_TAXONOMY.md ← ⭐ يشرح الفرق بين "قسم" و"مركز طبي" و"عيادة"، وفيه قائمة الـ 12 مركز بالعربي والإنجليزي
│   ├── MASTER_BRAND_ARCHITECTURE.md ← الهيكل التنظيمي الكامل للبراند
│   └── logos/                      ← شعارات المنظومة (بصيغ وألوان مختلفة)
├── knowledge/
│   ├── hospitals/                  ← ملفات + PDFs عن كل مستشفى
│   ├── departments/                ← ملفات عن الأقسام (عناية مركزة، طوارئ...)
│   ├── services/                   ← ملفات عن الخدمات (لو موجودة)
│   ├── programs/                   ← برامج زي "كبارنا"
│   ├── supporting/                 ← محتوى مساند (أسئلة شائعة، عن الأطباء، رحلة المريض...)
│   └── corporate/                  ← هوية الشركة، ليه إنسان، القيادة...
├── Media/                          ← صور حقيقية (منشآت + خدمات) — راجع قسم "الصور" آخر الملف
└── strategy/                       ← وثائق استراتيجية عامة (سياق، مش بيانات مباشرة)
```

### ⭐ القاعدة الذهبية

> **`business/brand/ENTITY_REGISTRY.md` هو الحَكَم. أي حاجة مش موجودة فيه، معناها مش موجودة في الحقيقة.**

الملف ده بيقول إن المنظومة الحقيقية فيها:
- **مستشفيين بس:** مستشفى المستقبل التخصصي (Future) + مستشفى الدلتا الدولي (Delta)
- **12 مركز طبي رسمي** بأسماء محددة بالعربي والإنجليزي (موجودين في `MEDICAL_SERVICES_TAXONOMY.md` §6)
- **6 أقسام** (عناية مركزة، طوارئ، عمليات، أشعة، معمل، عيادات خارجية) — دول "أقسام" مش "مراكز"
- **4 برامج** (كبارنا، رعاية كبار السن، الفحص الشامل، الوقاية)

**مستشفى المستقبل بيشغّل 4 مراكز بس من الـ 12** (أول أربعة في القائمة). **مستشفى الدلتا بيشغّل الـ 12 كلهم.**

⚠️ **الموقع الحالي فيه بيانات غلط لازم تتشال** — مراكز زي "عيون" و"جلدية" و"أعصاب" و"طب أطفال منفصل" **مش موجودين في السجل الرسمي أصلاً**. وفيه "العناية المركزة" و"الطوارئ" متسجّلين غلط كـ"مراكز" وهما لازم يبقوا "أقسام". التفاصيل الكاملة والـ IDs في قسم "التنظيف" تحت.

---

## 2. الملف اللي هتشتغل عليه

**فيه ملف مسودة جاهز بالفعل، كمّل عليه — متعملش ملف جديد:**

```
website/Docs/insan-content-data.json
```

الملف ده مبني بالفعل على `ENTITY_REGISTRY.md` وفيه:
- `settings` — بيانات تواصل عامة (تليفون، إيميل، سوشيال ميديا...)
- `hospitals[]` — المستشفيين بكل تفاصيلهم
- `departments_catalog[]` — الـ 6 أقسام
- `centers[]` — الـ 12 مركز
- `doctors.list[]` — فاضية، محتاجة تتملى
- `faqs.list[]` — فيها 3 أسئلة عامة بس، محتاجة تتزوّد
- `cleanup_actions` — قائمة بالكيانات الغلط اللي على الموقع دلوقتي ولازم تتشال

### إزاي تقرأ العلامات جوّه الملف

- **`"__NEEDS_OPERATOR__"`** = القيمة دي لسه مش موجودة، لازم تدوّر عليها في ملفات `business/` أو تسيبها لو مش لاقيها.
- **`"suggestedImage": "business/Media/..."`** = مسار صورة حقيقية مقترحة لهذا الكيان (اقرأ قسم "الصور" تحت).
- **`"USE_DEFAULT"`** = سيبها زي ما هي، معناها "استخدم القيمة الافتراضية اللي مبرمجة في كود الموقع".

### طريقة الشغل — بالباتشات (مش لازم تخلّص كل حاجة مرة واحدة)

ينفع تمامًا تشتغل جزء جزء:
1. اقرا مجموعة ملفات من `business/`
2. املا اللي تقدر عليه في `insan-content-data.json` (حتى لو ملأت نص المعلومات بس، حط اللي متأكد منه وسيب الباقي `__NEEDS_OPERATOR__`)
3. اضخّه في الموقع (قسم 3 تحت)
4. كرّر مع باتش تانية من الملفات، وكمّل على **نفس السجلات** (متعملش سجلات مكررة)

**قاعدة مهمة:** بعض الحقول (زي `heroStats`، `journeySteps`، `departments` جوّه المستشفى، `locations`) بتتبعت كـ**مصفوفة كاملة** مش إضافة عنصر لوحده. يعني لو مستشفى عنده قسمين دلوقتي وعايز تضيف تالت، لازم تبعت **التلاتة مع بعض** في نفس الطلب، مش القسم الجديد لوحده — وإلا هتمسح التنين اللي قبل كده. لو مش متأكد إيه اللي موجود حاليًا، اقرا الكيان الأول (`GET`) قبل ما تكتب فوقه.

---

## 3. إزاي تضخّ البيانات في الموقع الحيّ — الآلية بالتفصيل

### 3.1 مفيش Git في الموضوع ده خالص

**البيانات مش بتتحط في ملفات كود.** هي بتتحط مباشرة في قاعدة بيانات الموقع عن طريق نداءات API. يعني:
- ❌ متعملش `git commit` أو `git push` عشان تضيف بيانات
- ❌ متعدّلش أي ملف `.ts` أو `.tsx` عشان تحط بيانات
- ✅ كل حاجة بتتم بطلبات HTTP (`fetch`) للموقع الحيّ مباشرة

الموقع: `http://169.58.77.61`
لوحة التحكم: `http://169.58.77.61/admin`

### 3.2 "الباب الخلفي" — إزاي تدخل بدون تسجيل دخول

المشروع فيه آلية خاصة (فعّلها صاحب المشروع نفسه على السيرفر) بتخلّيك تدخل لوحة التحكم **بدون إيميل ولا باسورد**. الطريقة:

1. افتح متصفح (لازم يكون عندك أداة تتحكم في متصفح حقيقي وتقدر تنفّذ فيها كود JavaScript — زي أدوات الـ browser automation)
2. روح على `http://169.58.77.61/admin`
3. **استنى من 5 لـ 10 ثواني** — الصفحة أول ما تفتح ممكن تطلب تسجيل دخول، **متقلقش ومتحاولش تسجّل دخول**، الباب الخلفي بيشتغل تلقائيًا خلال ثواني ويحوّلك للوحة التحكم الحقيقية.
4. لما توصل لصفحة فيها "لوحة التحكم" / "نظرة عامة على منظومة إنسان" — يبقى دخلت بنجاح.

### 3.3 إزاي تاخد توكن تقدر تستخدمه في الطلبات

بمجرد ما تدخل، الجلسة بتحطلك كوكيز صالحة. نفّذ الكود ده **جوّه نفس صفحة المتصفح** (عن طريق أداة تنفيذ JavaScript في المتصفح، مش سكربت خارجي منفصل):

```javascript
const r = await fetch('/api/v1/auth/refresh', { method: 'POST', credentials: 'include' });
const j = await r.json();
const token = j?.data?.accessToken;
console.log(token); // انسخ القيمة دي، هتحتاجها في كل الطلبات
```

لو `token` طلع فاضي أو الطلب رجع خطأ، يبقى الباب الخلفي لسه مفتحش — ارجع لخطوة 3.2 واستنى أكتر.

**⚠️ التوكن ده صلاحيته 15 دقيقة بس.** لو هتشتغل فترة أطول، نفّذ نفس الكود تاني كل شوية عشان تاخد توكن جديد.

### 3.4 إزاي تقرا بيانات موجودة (قبل ما تكتب فوقها)

**قاعدة إلزامية: اقرا الكيان قبل ما تعدّله، عشان متمسحش حاجة موجودة بالغلط.**

```javascript
const H = { 'Authorization': `Bearer ${token}` };

// كل المستشفيات
const hospitals = await (await fetch('/api/v1/admin/hospitals?pageSize=50', { headers: H })).json();
console.log(hospitals.data); // مصفوفة فيها id, slug, name... لكل مستشفى

// كل المراكز الطبية
const centers = await (await fetch('/api/v1/admin/medical-centers?pageSize=50', { headers: H })).json();

// كل الأطباء
const doctors = await (await fetch('/api/v1/admin/doctors?pageSize=200', { headers: H })).json();

// الإعدادات العامة
const settings = await (await fetch('/api/v1/admin/settings', { headers: H })).json();

// الأسئلة الشائعة
const faqs = await (await fetch('/api/v1/admin/faqs?pageSize=100', { headers: H })).json();
```

⚠️ **متعتمدش على أي IDs قديمة مكتوبة في أي مكان تاني.** حاجات كتير اتغيّرت في المشروع من وقت ما آخر حد فحص الموقع. **دايمًا اعمل GET الأول واستخرج الـ IDs الحقيقية دلوقتي.**

### 3.5 إزاي تكتب/تعدّل بيانات

استخدم `PATCH` — بيحدّث **بس الحقول اللي بتبعتها**، من غير ما يمسح باقي الحقول:

```javascript
const H = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

// تعديل مستشفى موجود
await fetch(`/api/v1/admin/hospitals/${hospitalId}`, {
  method: 'PATCH',
  headers: H,
  body: JSON.stringify({
    heroTagline: { ar: "...", en: "..." },
    contactInfo: { phone: "...", email: "...", address: { ar: "...", en: "..." } }
  })
});
```

### 3.6 نقاط النهاية (Endpoints) المتاحة — استخدم دول بالظبط

| الكيان | قراءة الكل | قراءة واحد | إنشاء | تعديل | نشر | إلغاء نشر | حذف |
|---|---|---|---|---|---|---|---|
| مستشفى | `GET /api/v1/admin/hospitals` | `GET .../admin/hospitals/:id` | `POST /api/v1/admin/hospitals` | `PATCH .../admin/hospitals/:id` | `POST .../:id/publish` | `POST .../:id/unpublish` | `DELETE .../admin/hospitals/:id` |
| مركز طبي | `GET /api/v1/admin/medical-centers` | `GET .../admin/medical-centers/:id` | `POST /api/v1/admin/medical-centers` | `PATCH .../admin/medical-centers/:id` | `POST .../:id/publish` | `POST .../:id/unpublish` | `DELETE .../admin/medical-centers/:id` |
| طبيب | `GET /api/v1/admin/doctors` | `GET .../admin/doctors/:id` | `POST /api/v1/admin/doctors` | `PATCH .../admin/doctors/:id` | `POST .../:id/publish` | `POST .../:id/unpublish` | `DELETE .../admin/doctors/:id` |
| إعداد (Setting) | `GET /api/v1/admin/settings` | — | — | `PATCH /api/v1/admin/settings/:key` بـ `{value}` | — | — | — |
| سؤال شائع | `GET /api/v1/admin/faqs` | — | `POST /api/v1/admin/faqs` | `PATCH .../admin/faqs/:id` | — | — | `DELETE .../admin/faqs/:id` |

**كل الطلبات محتاجة الهيدر `Authorization: Bearer <token>` — ماعدا القراءة العامة (بدون `/admin/`) اللي متاحة للجميع بلا توكن.**

### 3.7 الحقول المطلوبة لكل كيان (لو هتعمل إنشاء جديد)

**مستشفى جديد — الحد الأدنى:**
```json
{ "slug": "hyphen-case-only", "name": { "ar": "...", "en": "..." } }
```
باقي الحقول اختيارية: `shortDescription`, `description`, `logoUrl`, `heroImage`, `brandColor` (لازم hex زي `#0B1F3A`)، `googleMapsUrl` (**لازم يبدأ بـ** `https://www.google.com/maps/embed` وإلا هيترفض)، `status` (`DRAFT`/`PUBLISHED`/`ARCHIVED`)، `heroTagline`, `heroStats`, `departments`, `locations`, `contactInfo`, `journeySteps`.

**مركز طبي جديد — الحد الأدنى:**
```json
{ "slug": "hyphen-case-only", "name": { "ar": "...", "en": "..." } }
```
اختياري: `description`, `heroImage`, `isFeatured` (true/false), `status`, `hospitalIds` (مصفوفة IDs المستشفيات اللي المركز ده تابع لها — **ده الرابط بين المركز والمستشفى**).

**طبيب جديد — الحد الأدنى:**
```json
{ "slug": "hyphen-case-only", "name": { "ar": "...", "en": "..." } }
```
اختياري: `title`, `specialty`, `photo`, `bio`, `isFeatured`, `status`, `hospitalIds`, `medicalCenterIds`.

**سؤال شائع جديد — الحد الأدنى:**
```json
{ "topic": {"ar":"...","en":"..."}, "question": {"ar":"...","en":"..."}, "answer": {"ar":"...","en":"..."} }
```

⚠️ **قاعدة خطيرة جدًا لازم تعرفها:** الـ API بيتجاهل **بصمت** أي حقل مش معرّف في القائمة دي — يعني لو بعت حقل غلط الاسم، مش هيرجعلك خطأ، بس هيضيع من غير ما حد يلاحظ. لو مش متأكد من اسم حقل، افتح الملف المصدر (مثلاً `apps/api/src/modules/hospitals/dto/create-hospital.dto.ts`) وشوف الأسماء بالظبط.

### 3.8 مثال كامل — إزاي تعدّل مستشفى بأمان (اتّبع الترتيب ده دايمًا)

```javascript
// 1) خد توكن جديد
const token = (await (await fetch('/api/v1/auth/refresh', {method:'POST', credentials:'include'})).json()).data.accessToken;
const H = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

// 2) دوّر على المستشفى بالـ slug عشان تجيب الـ id الحقيقي
const list = (await (await fetch('/api/v1/admin/hospitals?pageSize=50', {headers:H})).json()).data;
const hospital = list.find(h => h.slug === 'delta-hospital');
console.log(hospital); // شوف القيم الحالية قبل ما تكتب فوقها

// 3) اكتب الحقول الجديدة بس
const res = await fetch(`/api/v1/admin/hospitals/${hospital.id}`, {
  method: 'PATCH', headers: H,
  body: JSON.stringify({ heroTagline: { ar: "اثنا عشر مركزًا طبيًا تحت سقف واحد", en: "Twelve medical centers under one roof" } })
});
console.log(res.status); // لازم يبقى 200

// 4) اتأكد إن القيمة اتحفظت فعلًا
const verify = (await (await fetch(`/api/v1/admin/hospitals/${hospital.id}`, {headers:H})).json()).data;
console.log(verify.heroTagline); // لازم يظهر نفس القيمة اللي بعتها
```

**نفّذ الخطوة 4 (التحقق) دايمًا بعد أي كتابة. لو القيمة مش ظاهرة، فيه مشكلة — متكملش، أبلغ عن الخطأ.**

---

## 4. تنظيف الكيانات الغلط الموجودة على الموقع دلوقتي

الموقع فيه مراكز طبية غلط (مش في `ENTITY_REGISTRY.md`). اعمل الآتي **بعد** ما تتأكد من ضخّ البيانات الصحيحة، مش قبلها:

### الخطوات لكل مركز غلط (زي `ophthalmology-center` أو `dermatology-center` أو `neurology-center`):

```javascript
// 1) لازم تلغي النشر الأول (مينفعش تحذف مركز منشور مباشرة)
await fetch(`/api/v1/admin/medical-centers/${centerId}/unpublish`, { method:'POST', headers:H });

// 2) بعدين احذف
const del = await fetch(`/api/v1/admin/medical-centers/${centerId}`, { method:'DELETE', headers:H });
console.log(del.status); // لو 409 معناها فيه حجوزات مرتبطة بالمركز ده — سيبه منشور بدل الحذف، أو استبدل بياناته بدل حذفه
```

**المراكز اللي مش لازم تتحذف لكن لازم تتصحّح اسمها/بياناتها** (لأنها بنفس المسمى بس بأسماء غلط شوية) — راجع `insan-content-data.json` → `cleanup_actions.centers_to_remove_or_reassign` فيه القائمة كاملة وموضّح كل واحدة تتحذف ولا تتصحّح.

⚠️ **لو الحذف رجع خطأ `409 Conflict` وقاله "فيه appointment requests مرتبطة"**، متجبرش الحذف. سيب المركز، بلّغ عنه، وكمّل الباقي.

---

## 5. الصور

فولدر `business/Media/` فيه **100 صورة حقيقية** (منشآت + خدمات)، وفولدر `business/brand/logos/` فيه شعارات المنظومة. دي مش موجودة على الموقع لسه.

### 5.1 الموقع دلوقتي **فيه نظام رفع صور شغّال فعليًا** ✅

```
POST /api/v1/admin/upload
```
- محتاج هيدر `Authorization: Bearer <token>` بس (مفيش صلاحيات إضافية)
- الطلب لازم يكون `multipart/form-data` وفيه حقل اسمه بالظبط `file`
- بيرجّع: `{ "success": true, "url": "/uploads/xxxxx.jpg" }`
- الـ `url` ده تحطه مباشرة في أي حقل صورة (`heroImage`, `photo`, `logoUrl`...) في أي كيان

### 5.2 إزاي ترفع الصور من `business/Media/` عمليًا

المشكلة: التوكن والجلسة موجودين في المتصفح، لكن ملفات الصور موجودة على القرص المحلي (Google Drive) — والمتصفح مش بيقدر يقرا ملفات من القرص من غير ما مستخدم يختارها يدويًا (قيد أمان من المتصفح نفسه، مش قيد في المشروع).

**الحل: اعمل سكربت Node.js منفصل يشتغل من على الجهاز (مش من جوّه المتصفح):**

1. من المتصفح، خد التوكن (بنفس طريقة قسم 3.3) وانسخه كـ نص عادي
2. اكتب سكربت Node بسيط بيستخدم مكتبة `form-data` عشان يرفع كل صورة:

```javascript
// upload-images.js — يتشغّل بـ: node upload-images.js
const fs = require('fs');
const FormData = require('form-data'); // لو مش موجودة: npm install form-data

const TOKEN = 'الصق_التوكن_هنا'; // صلاحيته 15 دقيقة بس — لو خلصت، خد توكن جديد وحدّث هنا
const BASE = 'http://169.58.77.61/api/v1';

async function uploadOne(localPath) {
  const form = new FormData();
  form.append('file', fs.createReadStream(localPath));
  const res = await fetch(`${BASE}/admin/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, ...form.getHeaders() },
    body: form,
  });
  const json = await res.json();
  console.log(localPath, '->', json.url || json);
  return json.url;
}

// كرّر السطر ده لكل صورة عايز ترفعها
uploadOne('J:/My Drive/Insan/business/Media/Facility/Hospital Exterior/future-hospital-exterior-016.jpeg');
```

3. شغّله من `Bash`/`PowerShell`: `node upload-images.js`
4. خد الروابط اللي بترجع (`/uploads/xxx.jpg`) وحطها في حقول `heroImage`/`suggestedImage` بتاعة الكيان المناسب في `insan-content-data.json`، وابعتها في PATCH زي أي حقل تاني

**لأنك هترفع صور كتير، اعمل الرفع على دفعات (Batches) صغيرة (20-30 صورة) عشان التوكن ميخلصش صلاحيته نص الطريق.**

### 5.3 أنهي صورة لأنهي كيان؟

`insan-content-data.json` فيه حقل `suggestedImage` جوّه كل مستشفى/مركز، بيشاور على أنسب صورة من `business/Media/`. استخدمها كنقطة بداية — لو لقيت صورة أدق في الملفات الجديدة اللي هتتضاف، استبدلها.

---

## 6. قواعد أمان لازم تلتزم بيها

1. **متخترعش بيانات.** لو معلومة مش موجودة في `business/` ولا في اللي هيبعته صاحب المشروع، سيبها `__NEEDS_OPERATOR__`. **ممنوع تخترع أرقام إحصائيات، تقييمات، أو تفاصيل طبية.** ده حصل قبل كده في نسخة قديمة من الموقع وسبب مشكلة مصداقية خطيرة.
2. **اقرا قبل ما تكتب.** دايمًا `GET` الكيان قبل أي `PATCH`، وتحقّق بعد الكتابة إن القيمة اتحفظت.
3. **الحذف حذر.** لو `DELETE` رجع خطأ، متحاولش تلف حواليه — فيه سبب (زي حجوزات مرتبطة).
4. **مفيش داعي لـ Git خالص في المهمة دي.** لو حسّيت إنك محتاج تعدّل ملف كود، توقف واسأل — دي مش من صلاحياتك في المهمة دي.
5. **لو التوكن رجع فاضي أو 401،** الباب الخلفي غالبًا انقطع — ارجع افتح `http://169.58.77.61/admin` تاني واستنى.
6. **بلاغ الأخطاء:** لو أي طلب رجع خطأ مش متوقّع (500، أو رسالة غريبة)، **متجاهلوش ومتحاولش تلتف حواليه** — سجّله في تقرير آخر الشغل وكمّل على الكيانات التانية.

---

## 7. خلاصة الترتيب المطلوب منك

1. [ ] اقرا `business/brand/ENTITY_REGISTRY.md` و `business/brand/MEDICAL_SERVICES_TAXONOMY.md` كاملين
2. [ ] افتح `website/Docs/insan-content-data.json` — ده الملف اللي هتشتغل عليه
3. [ ] اقرا باقي ملفات `business/knowledge/` (اللي موجودة + اللي هتتضاف جديدة) واملا الحقول اللي تقدر عليها
4. [ ] افتح `http://169.58.77.61/admin` في المتصفح واستنى الباب الخلفي
5. [ ] خد توكن (قسم 3.3)
6. [ ] اقرا الكيانات الحالية (قسم 3.4) وسجّل الـ IDs الحقيقية
7. [ ] اضخّ البيانات كيان كيان بـ PATCH، وتحقّق بعد كل واحدة
8. [ ] نظّف الكيانات الغلط (قسم 4)
9. [ ] لو فاضل وقت، ابدأ رفع الصور (قسم 5)
10. [ ] اكتب تقرير مختصر آخر الشغل: إيه اللي اتضخّ، إيه اللي لسه ناقص، وأي أخطاء واجهتك

**ابدأ من البند 1. بالتوفيق.**
