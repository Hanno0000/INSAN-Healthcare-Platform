# خطة إصلاح موقع إنسان — تحليل شامل + أوامر شغل مفصّلة

> **لو أنت AI بتقرأ الملف ده:** اقرأه **كامل** قبل ما تلمس أي حاجة. مكتوب على أساس إنك متعرفش أي حاجة عن المشروع. اتبع الترتيب بالحرف. **ممنوع تبدأ من Sprint 3 قبل ما تخلّص Sprint 0 و 1.**

**تاريخ التحليل:** 2026-08-07 · **الحالة المفحوصة:** الموقع الحيّ `http://169.58.77.61` · **آخر كوميت:** `7332508`

---

# الجزء 0 — القرار الاستراتيجي: نرجع خطوة ورا ولا نكمّل؟

## القرار: **نكمّل للأمام (Fix Forward). ممنوع الرجوع (Rollback).**

### ليه؟ (ده مبني على فحص فعلي، مش رأي)

| | البيانات **قبل** آخر رفع | البيانات **بعد** آخر رفع |
|---|---|---|
| المراكز | 12 مركز، منهم "عيون/جلدية/أعصاب" **مش موجودين في السجل الرسمي أصلاً** | 19 كيان، فيهم محتوى حقيقي من ملفات المشروع |
| المحتوى | أوصاف قصيرة تجريبية | أوصاف غنية + `features` + `clinics` حقيقية |
| الحالة | ❌ بيانات اختبار غلط | ⚠️ بيانات حقيقية بس مصنّفة غلط + بالإنجليزي |

**الخلاصة:** الرجوع للخلف **مش هيوصّلك لحالة سليمة** — هيوصّلك لحالة غلط تانية (بيانات تجريبية). آخر رفع جاب **محتوى حقيقي فعلاً** من ملفات `business/knowledge/`، مشكلته إنه **مصنّف غلط ومكتوب بالإنجليزي**. ده يتصلّح بعمليات بيانات موجّهة، أرخص وأأمن بكتير من إعادة استخراج كل حاجة من الأول.

### ⚠️ لكن فيه مشكلة عملية خطيرة لازم تتحل الأول

**سكربتات `parse_centers.js` و `deploy2.js` مش موجودة في الريبو إطلاقاً.**

بحثت في المشروع كله — الملفات دي اتعملت على جهاز/سيرفر ومترفعتش على git. النتيجة:
- مش قادر أراجع الكود اللي عمل المشاكل دي
- لو الجهاز ده ضاع، الـ pipeline كله ضايع
- أي حد جديد مش هيقدر يعيد إنتاج اللي حصل

**ده أول بند في Sprint 0.**

---

# الجزء 1 — تحليل السبب الجذري لكل مشكلة (مبني على فحص حيّ)

## 🔴 مشكلة 1 — العربي على الموقع مكتوب إنجليزي

### الدليل الفعلي
فحصت `GET /api/v1/medical-centers` — النتيجة:
```
cardiac-internal-medicine-center
  desc.ar: "The Cardiac & Internal Medicine Center is a comprehensive..."
  desc.en: "The Cardiac & Internal Medicine Center is a comprehensive..."
  ar === en ? true   ← الحقلين متطابقين حرفياً
```
**14 كيان من 19** فيهم `description.ar` مكتوب بالإنجليزي.

### السبب الجذري (مهم جداً — اقرأه كويس)
فتحت ملف المصدر `business/knowledge/centers/MEDICAL_CENTER_CARDIAC_INTERNAL_MEDICINE.md`:
- الملف **295 سطر**
- الأسطر اللي فيها حروف عربية: **14 سطر بس**
- كل المحتوى التسويقي والوصفي **مكتوب بالإنجليزي**. العربي موجود بس في `entity_name_ar` وبعض المصطلحات بين قوسين.

يعني: **الـ parser مغلطش لما نسخ الإنجليزي — العربي مش موجود في المصدر أصلاً.** الـ parser عمل أسهل حاجة: حط نفس النص في `ar` و `en`.

### ⚠️ نتيجة مهمة على الخطة
ده **مش إصلاح كود** — ده **مهمة ترجمة محتوى**. لازم الـ AI يقرا كل ملف MD ويكتب النسخة العربية بنفسه (مش ترجمة حرفية — صياغة تسويقية عربية سليمة). دي أكبر مهمة في الخطة كلها من ناحية الوقت.

---

## 🔴 مشكلة 2 — صفحة المركز فقيرة (لا صور، لا خدمات)

### الدليل الفعلي
```
كل الـ 19 مركز:  heroImage: false   ← ولا مركز واحد عنده صورة
كل الـ 19 مركز:  services: false    ← حقل الخدمات فاضي تماماً
14 مركز:        features: true     ← دي الحاجة الوحيدة الممتلئة
```
وفي `seed-data.json` المركز عنده `clinics` array فيها بيانات، بس **حقل `services` فاضي** — وده اللي سيكشن "العيادات والتخصصات" بيقرا منه.

### السبب الجذري
1. **الصور:** الـ parser ما بيحطش `heroImage` خالص (الحقل `undefined` في seed-data). والصور موجودة في `business/Media/` بس محدش ربطها.
2. **الخدمات:** فيه خلط بين حقلين — `clinics` (علاقة في قاعدة البيانات) و `services` (حقل Json). الـ parser بيملا `clinics` والواجهة بتقرا `services`، فالسيكشن يطلع فاضي.

---

## 🔴 مشكلة 3 — مستشفى الدلتا مكرر

### الدليل الفعلي
```
GET /api/v1/hospitals  →  العدد: 3
 - delta-international-hospital | مستشفى الدلتا الدولي   ← جديد (من آخر رفع)
 - delta-hospital               | مستشفى الدلتا الدولي   ← الأصلي
 - future-hospital              | مستشفى المستقبل التخصصي
```

### السبب الجذري
الـ parser بيولّد الـ `slug` من **اسم المستشفى في ملف MD** (`Delta International Hospital` → `delta-international-hospital`)، بينما السجل الموجود في قاعدة البيانات سلَجه `delta-hospital`. الـ seed بيعمل `upsert` على أساس الـ slug — ولمّا الـ slug اختلف، **أنشأ سجل جديد بدل ما يحدّث القديم**.

⚠️ **خطر:** الاتنين مرتبطين ببيانات. لازم تتأكد قبل الحذف مين فيهم مربوط بالمراكز والحجوزات.

---

## 🔴 مشكلة 4 — الأقسام والبرامج ظاهرة كمراكز طبية

### الدليل الفعلي
صفحة `/medical-centers` بتقول **"19 مركز طبي"** وفيهم:
```
برامج (4):  prevention-programs · check-up-programs · senior-care-program · kabarona-program
أقسام (6):  outpatient-clinics · laboratory · radiology-imaging · operating-rooms
            emergency-department · intensive-care-unit
مراكز حقيقية (9): الباقي
```

### السبب الجذري
الكوميت `7b98a1e "parse and seed departments and programs as medical centers"` — الاسم نفسه بيقول المشكلة. الـ worker السابق حلّ مشكلة "الأقسام والبرامج مالهاش صفحات" بأسهل طريقة: **حشرها كلها في جدول `MedicalCenter`**.

ده غلط معمارياً وبيخالف `business/brand/MEDICAL_SERVICES_TAXONOMY.md` اللي بيقول صراحة إن القسم (Department) والمركز (Center) والبرنامج (Program) **تلات أنواع مختلفة**.

---

## 🔴 مشكلة 5 — البرامج محتاجة صفحة مستقلة
مرتبطة بمشكلة 4. البرامج دلوقتي محشورة في `/medical-centers`. المطلوب: قسم `برامجنا` في الهيدر + صفحة `/programs` بنفس تصميم المراكز + سيكشن في الصفحة الرئيسية.

---

## 🔴 مشكلة 6 — اللوجو صغير/مش ظاهر

### الدليل الفعلي
```
GET /logos/insan-logo-light.png  →  HTTP 404
GET /logos/insan-logo-dark.png   →  HTTP 404
```
**ملفات اللوجو مش موجودة على السيرفر أصلاً.** الإعدادات بتشاور على مسار مش موجود، فالهيدر بيعرض بديل احتياطي صغير.

الملفات الحقيقية موجودة محلياً في `business/brand/logos/` بأحجام 512/1024/2048/4096 وبنسخ (Color/Black/White) وأنواع (Arabic Logotype / English Logotype / Horizontal Version / Symbol).

---

## 🟠 مشكلة 7 — صفحة "عن المجموعة" ضعيفة
الصفحة موجودة (`/api/v1/pages/about` بترجع 200) لكن محتواها قليل وتصميمها بسيط. المحتوى المكتوب موجود في `business/knowledge/ABOUT_US_CONTENT.md`.

---

## 🔴 مشكلة 8 — أزرار التواصل معلوماتها غلط

### الدليل الفعلي
```
الإعدادات العامة (اللي الهيدر والفوتر بيقروا منها):
  contact_phone    = "+20-XXX-XXX-XXXX"   ← placeholder
  emergency_phone  = "+20-XXX-XXX-XXXX"   ← placeholder
  whatsapp_number  = "+20-XXX-XXX-XXXX"   ← placeholder
```
**لكن** بيانات مستشفى الدلتا فيها أرقام **حقيقية**:
```json
"phones": ["0403315000","0403315001","0403315002","0403315003","0403321774"],
"whatsapp": "01100002154",
"email": "info@lavenir-medical.com",
"website": "www.lavenir-medical.com"
```
### السبب الجذري
البيانات الحقيقية اتحطت على مستوى **المستشفى** بس، والإعدادات **العامة** فضلت placeholders. الهيدر/الفوتر بيقروا من الإعدادات العامة.

---

## 🔴 مشكلة 9 — صفحة المستشفى وصفحات الأقسام

### الدليل الفعلي — أقسام مستشفى الدلتا (10 أقسام)
```
 - pediatrics                                    | desc ✓ | img ✓
 - general-surgery                               | desc ✓ | img ✓
 - intensive-care-unit                           | desc ✗ | img ✗   ← مكرر
 - emergency-department                          | desc ✓ | img ✗   ← مكرر
 - outpatient-clinics                            | desc ✗ | img ✗
 - emergency-department-rapid-response-center-   | desc ✓ | img ✗   ← مكرر + slug مشوّه
 - icu                                           | desc ✓ | img ✗   ← مكرر
 - emergency                                     | desc ✓ | img ✗   ← مكرر
```
**3 نسخ من الطوارئ، ونسختين من العناية المركزة، وslug فيه شرطة زايدة في آخره.** ومعظمهم بلا وصف ولا صورة → ده سبب "صفحة القسم فيها صورة واسم بس".

وكمان: **19 مركز مرتبط بالدلتا** (المفروض 12 حسب السجل)، والسيكشن بيعرض 4 بس بدون زرار "تصفح الكل".

---

## 🟠 مشكلة 10 — الفوتر
مرتبط بمشكلة 8 (نفس مصدر البيانات الغلط) + محتاج مراجعة تصميم.

---

# الجزء 2 — تقسيم السبرنتات

القاعدة: **البيانات الصحيحة الأول، بعدين التصميم.** مفيش فايدة من تصميم جميل بيعرض بيانات غلط.

| Sprint | المحتوى | المشاكل | ليه الترتيب ده |
|---|---|---|---|
| **0** | إنقاذ الـ pipeline + تنظيف البيانات | 3، 4، وتكرار الأقسام | كل حاجة بعدها بتعتمد على بيانات نظيفة |
| **1** | المحتوى العربي | 1 | أكبر مهمة محتوى، ولازم تخلص قبل أي تصميم |
| **2** | البرامج | 5 | بيكمّل إعادة التصنيف من Sprint 0 |
| **3** | صفحات المراكز | 2 | تصميم + صور + خدمات |
| **4** | صفحة المستشفى وصفحات الأقسام | 9 | أكبر مهمة تصميم |
| **5** | الهوية العامة | 6، 8، 10 | لوجو + تواصل + فوتر |
| **6** | صفحة عن المجموعة | 7 | مهمة إبداعية مستقلة |

---

# 🚦 Sprint 0 — إنقاذ الـ Pipeline وتنظيف البيانات

> **ده أهم sprint. متبدأش أي حاجة تانية قبله.**

## المهمة 0.1 — ارفع سكربتات الـ pipeline على git

**المشكلة:** `parse_centers.js` و `deploy2.js` مش في الريبو.

**اعمل الآتي:**
1. دوّر على الملفين. جرّب: مجلد `website/` أو `website/scripts/` أو على السيرفر
   ```bash
   ssh root@169.58.77.61 "find ~ -name 'parse_centers.js' -o -name 'deploy2.js' 2>/dev/null"
   ```
2. لو لقيتهم، انسخهم لـ `website/scripts/` وارفعهم على git فوراً:
   ```bash
   git add website/scripts/parse_centers.js website/scripts/deploy2.js
   git commit -m "chore: commit the data pipeline scripts that were only on disk"
   git push
   ```
3. **لو ملقتهمش:** بلّغ صاحب المشروع فوراً وقف. متكتبش نسخة جديدة من دماغك من غير ما تعرف الأصلية عملت إيه.

**✅ التحقق:** `git ls-files website/scripts/` لازم تظهر الملفين.

---

## المهمة 0.2 — أصلح تكرار مستشفى الدلتا

**⚠️ عملية خطيرة. اتبع الترتيب بالحرف ومتقفزش خطوة.**

### الخطوة 1: اعرف مين المربوط بإيه (قبل أي حذف)
افتح `http://169.58.77.61/admin`، استنى 5-10 ثواني لحد ما الباب الخلفي يفتحلك (متحاولش تسجّل دخول)، وبعدين نفّذ في console المتصفح:

```javascript
const token = (await (await fetch('/api/v1/auth/refresh',{method:'POST',credentials:'include'})).json()).data.accessToken;
const H = {'Authorization':`Bearer ${token}`,'Content-Type':'application/json'};

const list = (await (await fetch('/api/v1/admin/hospitals?pageSize=50',{headers:H})).json()).data;
for (const h of list.filter(x => x.slug.includes('delta'))) {
  const full = (await (await fetch(`/api/v1/admin/hospitals/${h.id}`,{headers:H})).json()).data;
  console.log(h.slug, {
    id: h.id,
    centers: (full.medicalCenters||[]).length,
    doctors: (full.doctors||[]).length,
    departments: (full.departments||[]).length,
    heroImage: !!full.heroImage,
    contactInfo: !!full.contactInfo,
  });
}
```

### الخطوة 2: قرار أي واحد يفضل
**القاعدة: خلّي اللي عليه بيانات أكتر، واحذف/أرشف التاني.**
- لو `delta-hospital` (الأصلي) عليه الروابط والصورة → خلّيه، واحذف `delta-international-hospital`
- لو العكس → انقل البيانات الناقصة للأصلي الأول بـ PATCH، وبعدين احذف الجديد

**⚠️ الأفضلية للـ slug القديم `delta-hospital`** لأنه غالباً مربوط بحجوزات وروابط خارجية.

### الخطوة 3: الحذف (لازم unpublish الأول)
```javascript
const victimId = 'الـ_id_بتاع_المستشفى_المكرر';
await fetch(`/api/v1/admin/hospitals/${victimId}/unpublish`, {method:'POST', headers:H});
const del = await fetch(`/api/v1/admin/hospitals/${victimId}`, {method:'DELETE', headers:H});
console.log(del.status, await del.text());
```
**لو رجع 409:** يبقى فيه حجوزات مرتبطة. **متجبرش الحذف** — سيبه `unpublish` بس (مش هيظهر على الموقع) وبلّغ.

### الخطوة 4: امنع تكرار المشكلة
في الـ parser، لازم الـ slug يتاخد من **السجل الرسمي** مش من اسم الملف. أضف خريطة صريحة:
```javascript
const HOSPITAL_SLUG_MAP = {
  'HOSP-001': 'future-hospital',
  'HOSP-002': 'delta-hospital',
};
// استخدم HOSPITAL_SLUG_MAP[entityId] بدل slugify(name)
```

**✅ التحقق:** `curl http://169.58.77.61/api/v1/hospitals` لازم يرجع **2** بس.

---

## المهمة 0.3 — أخرج الأقسام والبرامج من جدول المراكز

### القرار المعماري (نفّذه زي ما هو — متبتكرش بديل)

أضف حقل **`type`** لموديل `MedicalCenter` يفرّق بين التلاتة:

**1) عدّل `website/apps/api/prisma/schema.prisma`** — في موديل `MedicalCenter` أضف:
```prisma
model MedicalCenter {
  // ... الحقول الموجودة زي ما هي
  type            CenterType    @default(CENTER)
  // ...
}

enum CenterType {
  CENTER
  DEPARTMENT
  PROGRAM
}
```

**2) اكتب migration بإيدك** (⛔ **ممنوع منعاً باتاً** `prisma migrate dev` — قاعدة الإنتاج مُنحرِفة وهيطلب reset ويمسح كل البيانات):

المسار: `website/apps/api/prisma/migrations/20260807120000_add_center_type/migration.sql`
```sql
-- نوع الكيان: مركز / قسم / برنامج
DO $$ BEGIN
  CREATE TYPE "CenterType" AS ENUM ('CENTER', 'DEPARTMENT', 'PROGRAM');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "MedicalCenter"
  ADD COLUMN IF NOT EXISTS "type" "CenterType" NOT NULL DEFAULT 'CENTER';
```

**3) أضف الحقل في الـ DTO** — `apps/api/src/modules/medical-centers/dto/create-medical-center.dto.ts`:
```typescript
import { CenterType } from '@prisma/client';
// جوّه الكلاس:
@IsOptional()
@IsEnum(CenterType)
type?: CenterType;
```
> ⚠️ **فخّ لازم تعرفه:** الـ API بيحذف **بصمت** أي حقل مش معرّف في الـ DTO. لو نسيت الخطوة دي، الحقل `type` هيتبعت ومش هيتحفظ **من غير أي رسالة خطأ**.

**4) فلترة القوائم** — في `medical-centers.service.ts` دالة `findAll`، أضف:
```typescript
if (query.type) where.type = query.type;
```

**5) الصفحة العامة تعرض المراكز بس** — في `apps/web/lib/public-api.ts`:
```typescript
export async function getMedicalCenters(params?: {...}) {
  return pub<PaginatedResponse<MedicalCenter>>('/medical-centers', { ...params, type: 'CENTER' }, !!params?.search);
}
```

### الخطوة 6: صنّف الـ 19 كيان الموجودين
```javascript
const CLASSIFY = {
  // برامج
  'prevention-programs':'PROGRAM', 'check-up-programs':'PROGRAM',
  'senior-care-program':'PROGRAM', 'kabarona-program':'PROGRAM',
  // أقسام
  'outpatient-clinics':'DEPARTMENT', 'laboratory':'DEPARTMENT',
  'radiology-imaging':'DEPARTMENT', 'operating-rooms':'DEPARTMENT',
  'emergency-department':'DEPARTMENT', 'intensive-care-unit':'DEPARTMENT',
};
const centers = (await (await fetch('/api/v1/admin/medical-centers?pageSize=50',{headers:H})).json()).data;
for (const c of centers) {
  const type = CLASSIFY[c.slug] || 'CENTER';
  const r = await fetch(`/api/v1/admin/medical-centers/${c.id}`, {
    method:'PATCH', headers:H, body: JSON.stringify({ type })
  });
  console.log(r.status, c.slug, '->', type);
}
```

**✅ التحقق:** `/medical-centers` لازم تقول **9 مراكز** (مش 19).

---

## المهمة 0.4 — نظّف أقسام المستشفى المكررة

الدلتا عنده 3 نسخ من الطوارئ ونسختين من العناية المركزة وslug مشوّه.

**⚠️ تحذير حرج:** حقل `departments` **مصفوفة كاملة** — لازم تبعتها كلها مرة واحدة. لو بعت عنصر واحد، **هتمسح الباقي**.

```javascript
const hid = 'id_مستشفى_الدلتا';
const h = (await (await fetch(`/api/v1/admin/hospitals/${hid}`,{headers:H})).json()).data;
console.log('قبل:', h.departments.map(d=>d.slug));

// الاحتفاظ بالأغنى محتوى: الأولوية للي عنده وصف وصورة
const KEEP = ['pediatrics','general-surgery','emergency','icu','outpatient-clinics','laboratory','radiology-imaging','operating-rooms'];
const seen = new Set();
const cleaned = h.departments
  .filter(d => { const s=(d.slug||'').replace(/-+$/,''); if(seen.has(s)) return false; seen.add(s); return KEEP.includes(s); })
  .map(d => ({ ...d, slug: (d.slug||'').replace(/-+$/,'') }));  // شيل الشرطة الزايدة

console.log('بعد:', cleaned.map(d=>d.slug));
// راجع النتيجة بعينك الأول، وبعدين نفّذ:
await fetch(`/api/v1/admin/hospitals/${hid}`, {method:'PATCH', headers:H, body: JSON.stringify({ departments: cleaned })});
```
**اعمل نفس الشيء لمستشفى المستقبل.**

**✅ التحقق:** مفيش slug مكرر ولا slug بينتهي بشرطة.

---

# 🚦 Sprint 1 — المحتوى العربي

> **دي مهمة ترجمة وكتابة، مش برمجة.** المصدر إنجليزي والعربي لازم يتكتب من الصفر.

## طريقة الشغل — كيان كيان

لكل مركز/قسم/برنامج:

**1)** افتح ملف المصدر في `business/knowledge/centers/` أو `departments/` أو `programs/`

**2)** استخرج المعلومات الطبية والتسويقية الحقيقية (تجاهل أقسام استراتيجية الحملات — دي للتسويق الداخلي مش للموقع)

**3)** **اكتب** نسخة عربية سليمة (مش ترجمة حرفية آلية):
   - `name.ar` → موجود جاهز في `entity_name_ar` في أول الملف
   - `shortDescription.ar` → سطر أو اتنين
   - `description.ar` → 4-6 فقرات غنية
   - `features` → كل ميزة `{ar, en}`

**4)** حدّث عبر الـ API:
```javascript
await fetch(`/api/v1/admin/medical-centers/${id}`, {
  method:'PATCH', headers:H,
  body: JSON.stringify({
    description: { ar: "النص العربي اللي كتبته", en: "The original English text" },
    shortDescription: { ar: "...", en: "..." }
  })
});
```

## ⛔ قواعد ملزمة
- **ممنوع تخترع معلومات طبية.** لو معلومة مش في ملف المصدر، متكتبهاش.
- **ممنوع تسيب الإنجليزي في حقل `ar`.**
- **ممنوع تحط نفس النص في `ar` و `en`.**
- لو مالقتش محتوى عربي كافي لكيان، سيب `description.ar` فاضي وبلّغ عنه — أحسن من نص إنجليزي في مكان عربي.

**✅ التحقق النهائي:**
```bash
curl -s "http://169.58.77.61/api/v1/medical-centers?pageSize=50" | node -e "
let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{
JSON.parse(s).data.forEach(c=>{
  const ar=(c.description?.ar||'').trim();
  if(!ar) return console.log('فاضي:',c.slug);
  if(/^[A-Za-z\"']/.test(ar)) console.log('❌ إنجليزي في ar:',c.slug);
  if(ar===c.description?.en) console.log('❌ ar==en:',c.slug);
});});"
```
لازم الأمر ده **ميطبعش أي سطر ❌**.

---

# 🚦 Sprint 2 — صفحة البرامج

**يعتمد على:** Sprint 0 (حقل `type`)

## المطلوب
1. **رابط في الهيدر:** `برامجنا` بين "مراكزنا الطبية" و "تواصل معنا"
   - عدّل من لوحة التحكم: `/admin/navigation` (مش في الكود — النافيجيشن بيتقرا من قاعدة البيانات)
2. **صفحة `/programs`:** انسخ `apps/web/app/medical-centers/page.tsx` بالكامل، غيّر:
   - العنوان → "برامجنا"
   - الاستدعاء → `type: 'PROGRAM'`
3. **صفحة برنامج واحد `/programs/[slug]`:** انسخ `medical-centers/[slug]/page.tsx`
4. **سيكشن في الصفحة الرئيسية:** انسخ `HospitalsSection.tsx` → `ProgramsSection.tsx`، وضيفه في `app/page.tsx` بعد سيكشن المراكز

**✅ التحقق:** `/programs` تعرض 4 برامج · `/medical-centers` مفيهاش ولا برنامج · الهيدر فيه الرابط

---

# 🚦 Sprint 3 — صفحات المراكز

## 3.1 الصور
**نظام رفع الصور موجود وشغّال:** `POST /api/v1/admin/upload` (حقل `file`، حد أقصى 5MB، صور بس، بيرجّع `{url}`)

اكتب سكربت Node يرفع من `business/Media/`:
```javascript
// scripts/upload-images.js
const fs = require('fs');
const FormData = require('form-data');   // npm i form-data
const TOKEN = 'الصق_التوكن_هنا';          // صلاحيته 15 دقيقة — جدده لو خلص
const BASE = 'http://169.58.77.61/api/v1';

async function upload(p) {
  const form = new FormData();
  form.append('file', fs.createReadStream(p));
  const r = await fetch(`${BASE}/admin/upload`, {
    method:'POST', headers:{Authorization:`Bearer ${TOKEN}`, ...form.getHeaders()}, body: form
  });
  const j = await r.json();
  console.log(p, '->', j.url);
  return j.url;
}
```
اربط كل مركز بأنسب صورة من `business/Media/Services/`، وبعدين `PATCH` بـ `{heroImage: url}`.

## 3.2 سيكشن العيادات والتخصصات
**السبب:** الـ parser بيملا `clinics` والواجهة بتقرا `services`.

**الحل:** خلّي الـ parser يملا **الاتنين**:
```javascript
center.services = center.clinics.map(c => ({
  name: c.name,                    // {ar, en}
  description: c.description || null
}));
```
وتأكد إن صفحة `medical-centers/[slug]/page.tsx` بتعرض `services` وبتستخدم `t()` على الحقول الثنائية.

## 3.3 التصميم
- أضف صورة hero فوق + صورة أو اتنين جوّه المحتوى
- وسّع الوصف (بيعتمد على Sprint 1)
- سيكشن "العيادات والتخصصات" في grid واضح

> ⚠️ **قاعدة عرض:** كل حقل ثنائي اللغة **لازم** يتلف بـ `t(field)` من `@/lib/utils`. كتابة `{field}` مباشرة = انهيار الصفحة بـ `Objects are not valid as a React child`.

---

# 🚦 Sprint 4 — صفحة المستشفى وصفحات الأقسام

**يعتمد على:** Sprint 0 (تنظيف الأقسام)

## 4.1 سلايد شو في الـ Hero
- أضف حقل `heroImages` (مصفوفة روابط) للمستشفى — نفس خطوات إضافة حقل في Sprint 0.3 (schema + migration يدوي + DTO)
- في `HospitalHeroSection.tsx` حوّل الصورة الواحدة لسلايدر
- **متضفش مكتبة سلايدر جديدة** — اعملها بـ `useState` + `setInterval` بسيط

## 4.2 الأقسام من ملفات المستشفى
اقرا `business/knowledge/hospitals/HOSPITAL_DELTA.md` واستخرج الأقسام الفعلية، وحدّث `departments` (المصفوفة كاملة — راجع تحذير 0.4).

## 4.3 زرار "تصفح كل المراكز"
في `HospitalMedicalCentersSection.tsx` أضف تحت الكاردات:
```tsx
<Link href={`/medical-centers?hospital=${hospitalSlug}`}
  className="inline-block bg-accent-500 hover:bg-accent-600 text-white font-bold px-8 py-3 rounded-pill">
  تصفح كل المراكز ({centers.length})
</Link>
```
وضيف فلترة بالمستشفى في صفحة `/medical-centers`.

## 4.4 سيكشن التواصل
`HospitalContactSection.tsx` لازم يعرض **كل** اللي في `contactInfo`: مصفوفة `phones` (مش رقم واحد)، `whatsapp`، `email`، `website`، `hours`، والخريطة.
> بيانات الدلتا الحقيقية موجودة بالفعل — المشكلة في العرض مش في البيانات.

## 4.5 صفحة القسم — أهم جزء
`/hospitals/[slug]/departments/[deptSlug]` دلوقتي صورة + اسم بس.

**المطلوب:** وسّع `HospitalDepartmentDto` (الملف: `apps/api/src/modules/hospitals/dto/create-hospital.dto.ts`) — الحقول `slug`, `name`, `shortDescription`, `description`, `image`, `doctorIds`, `customFields` موجودة. **ضيف:**
```typescript
@IsOptional() @IsArray() images?: string[];        // معرض صور
@IsOptional() @IsArray() equipment?: any[];        // الأجهزة {ar, en}
@IsOptional() @IsArray() services?: any[];         // الخدمات
@IsOptional() @IsArray() features?: any[];         // المميزات
@IsOptional() @IsString() videoUrl?: string;       // فيديو
```
وعدّل صفحة القسم تعرضهم كلهم، و`HospitalModal.tsx` (تبويب "الأقسام") يدخّلهم.

---

# 🚦 Sprint 5 — اللوجو والتواصل والفوتر

## 5.1 اللوجو (مشكلة 6)
**السبب المؤكد: الملفات 404 — مش موجودة على السيرفر.**

1. ارفع من `business/brand/logos/` بسكربت الرفع (3.1). **المقترح:**
   - `Horizontal Version/PNG Exports/1024 px/Color.png` → للهيدر
   - `Horizontal Version/PNG Exports/1024 px/White.png` → للفوتر (خلفية داكنة)
2. حدّث الإعدادات:
```javascript
await fetch('/api/v1/admin/settings/logo_light', {method:'PATCH', headers:H, body: JSON.stringify({value:'/uploads/xxx.png'})});
await fetch('/api/v1/admin/settings/logo_dark',  {method:'PATCH', headers:H, body: JSON.stringify({value:'/uploads/yyy.png'})});
```
3. كبّر المقاس في `Header.tsx` — من `h-10` لـ `h-14 md:h-16`

**✅ التحقق:** الرابطين يرجعوا 200، والكلمتين "إنسان" و"Egyptian Healthcare Platform" واضحين.

## 5.2 بيانات التواصل (مشاكل 8 و 10)
حدّث الإعدادات بالأرقام الحقيقية (موجودة في `contactInfo` بتاع الدلتا):
```javascript
const REAL = {
  contact_phone: '0403315000',
  emergency_phone: '0403315000',
  whatsapp_number: '01100002154',
  contact_email: 'info@lavenir-medical.com',
};
for (const [k,v] of Object.entries(REAL)) {
  await fetch(`/api/v1/admin/settings/${k}`, {method:'PATCH', headers:H, body: JSON.stringify({value:v})});
}
```
⚠️ **أكّد الأرقام دي مع صاحب المشروع الأول** — دي أرقام مستشفى الدلتا، وممكن يكون فيه رقم موحّد مختلف للمنظومة.

بعدين تأكد إن `Header.tsx` و `Footer.tsx` و `StickyActionsBar.tsx` بيقروا من الإعدادات مش من قيم ثابتة.

---

# 🚦 Sprint 6 — صفحة "عن المجموعة"

**المصدر:** `business/knowledge/ABOUT_US_CONTENT.md` + ملفات `business/knowledge/corporate/`

**المطلوب — سيكشنات مقترحة:**
1. Hero بصورة كبيرة + العنوان + جملة تعريفية
2. القصة/الرؤية
3. أرقام المنظومة (⚠️ **حقيقية بس** — ممنوع أرقام مخترعة)
4. المستشفيات
5. المراكز والبرامج
6. ليه إنسان (من `CORPORATE_WHY_INSAN.md`)
7. القيادة (من `CORPORATE_LEADERSHIP.md`)
8. CTA

**اقرا `business/knowledge/corporate/` كله قبل ما تبدأ** — فيه مادة غنية جداً.

---

# الجزء 3 — قواعد شغل ملزمة (لكل السبرنتات)

## ⛔ ممنوعات مطلقة
1. **`prisma migrate dev` أو `migrate reset`** — قاعدة الإنتاج مُنحرِفة، الأمرين دول هيمسحوا كل البيانات. الآمن الوحيد: `prisma migrate deploy` + migration مكتوب بإيدك.
2. **تخترع بيانات** — أرقام، إحصائيات، معلومات طبية. لو مش في `business/`، متكتبهاش.
3. **تسيب سكربت خارج git** — أي سكربت تكتبه لازم يتكوميت.
4. **تبعت عنصر واحد في حقل مصفوفة** (`departments`, `heroStats`, `locations`, `journeySteps`) — لازم المصفوفة كاملة.

## ✅ إلزاميات
1. **اقرا قبل ما تكتب:** `GET` الكيان → عدّل → `GET` تاني للتأكيد.
2. **أي حقل جديد = 4 خطوات:** schema → migration يدوي → **DTO** → الواجهة. نسيان الـ DTO = الحقل بيضيع بصمت.
3. **`t()` على كل حقل ثنائي اللغة** في الواجهة.
4. **بعد كل sprint:** commit + push + `deploy-to-contabo.ps1`.

## 🔄 دورة العمل لكل مشكلة (اللي طلبها صاحب المشروع)
```
1. افحص الصفحة الحيّة → شوف المشكلة بعينك
2. افحص لوحة التحكم → إزاي بتتحكم في الصفحة دي؟
3. صلّح لوحة التحكم الأول → لو فيها نقص يمنع الإدخال اليدوي
4. صلّح التصميم
5. اضخّ البيانات
6. راجع النتيجة النهائية كـ Creative Director
```

## 🔑 الوصول للوحة التحكم
```
1. افتح http://169.58.77.61/admin
2. استنى 5-10 ثواني — الباب الخلفي بيفتح تلقائياً. متحاولش تسجّل دخول.
3. خد توكن:
   const token = (await (await fetch('/api/v1/auth/refresh',{method:'POST',credentials:'include'})).json()).data.accessToken;
4. التوكن صلاحيته 15 دقيقة — جدّده لما يخلص.
```

---

# ملخص تنفيذي لصاحب المشروع

| البند | الحالة |
|---|---|
| **نرجع خطوة ورا؟** | ❌ **لا** — البيانات قبل الرفع كانت غلط برضه. نكمّل للأمام. |
| **أخطر اكتشاف** | سكربتات الـ pipeline (`parse_centers.js`, `deploy2.js`) **مش على git** |
| **أكبر مهمة** | المحتوى العربي — المصدر إنجليزي، فالعربي محتاج **يتكتب** مش يتنسخ |
| **أسهل مكسب** | اللوجو (ملفات 404 بس) + بيانات التواصل (موجودة أصلاً في بيانات الدلتا) |
| **المشاكل المعمارية** | الأقسام والبرامج محشورة في جدول المراكز — بتتحل بحقل `type` |

**الترتيب المقترح:** Sprint 0 (عاجل) → 1 (أطول) → 2 → 5 (مكاسب سريعة) → 3 → 4 → 6

> **حاجة أنصح تعملها إنت هنا مش الـ worker:** حذف مستشفى الدلتا المكرر (Sprint 0.2). دي عملية حذف على قاعدة إنتاج ومحتاجة قرار بشري لو ظهرت حجوزات مرتبطة.
