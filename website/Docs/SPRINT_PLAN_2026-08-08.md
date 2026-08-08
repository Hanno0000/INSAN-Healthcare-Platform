# أمر شغل — استكمال إصلاحات موقع إنسان (الجولة الثانية)

> **لو أنت AI بتقرأ ده:** اقرأه **كامل** قبل ما تلمس حاجة. مكتوب على أساس إنك متعرفش أي حاجة عن المشروع.
>
> **القاعدة الحاكمة في الملف ده:** كل مهمة بتنتهي بـ **أمر تحقّق**. نفّذه، وألصق نتيجته في تقريرك. **لو نتيجة التحقّق مش مطابقة للمتوقّع — قف، متكملش، وبلّغ.** ممنوع تقول "خلصت" من غير ما تلصق نتيجة التحقّق.

**التاريخ:** 2026-08-08 · **الموقع:** `http://169.58.77.61` · **آخر كوميت:** `511d935`

---

## ⚠️ اقرأ ده الأول — ليه الجولة اللي فاتت فشلت جزئياً

الجولة السابقة **بنت البنية التحتية صح** لكن **البيانات مادخلتش**. النمط اتكرر 3 مرات:

| اللي اتعمل | اللي فات |
|---|---|
| حقل `type` اتضاف في قاعدة البيانات ✅ | الفلتر مكانش شغّال — الصفحتين عرضوا نفس الـ 19 ❌ |
| حقول الأقسام (خدمات/أجهزة/صور) اتضافت ✅ | ولا بيان واحد اتدخّل فيها ❌ |
| كوميت اسمه `"assign heroImages to centers"` ✅ | النتيجة **صفر صورة** ❌ |

**السبب:** الكوميت اتعمل من غير ما حد يفتح الصفحة ويشوف النتيجة.

**علشان كده كل مهمة هنا فيها أمر تحقّق إجباري.** الكوميت من غير تحقّق = المهمة مش مقبولة.

---

## ✅ اللي اتصلح بالفعل (متلمسوش)

| الإصلاح | الحالة |
|---|---|
| فلتر `type` في `PaginationQueryDto` | ✅ اتصلح في `511d935` |
| قصر مراكز صفحة المستشفى على `type=CENTER` | ✅ اتصلح في `511d935` |
| المحتوى العربي للمراكز | ✅ 19/19 عربي سليم |
| تكرار مستشفى الدلتا | ✅ اتشال — بقوا 2 |
| بيانات التواصل | ✅ أرقام حقيقية |
| ملفات اللوجو | ✅ `/logos/insan-logo-color.png` شغّال |
| تكرار أقسام المستشفى | ✅ من 10 → 5 |

---

## 🔑 الوصول للوحة التحكم — اقرأ ده قبل أي مهمة بيانات

**⚠️ الباب الخلفي (الدخول بدون كلمة مرور) اتقفل.** جرّبته 3 مرات على مسارات مختلفة — بيحوّل للّوجن ومفيش كوكيز.

**قبل ما تبدأ أي مهمة فيها كلمة "بيانات"، اتأكد إنك تقدر تدخل:**

1. افتح `http://169.58.77.61/admin`
2. **لو فتحت لوحة التحكم مباشرة** → الباب الخلفي شغّال، كمّل عادي
3. **لو طلب منك تسجيل دخول** → قف واسأل صاحب المشروع: يفتح الباب الخلفي تاني، أو يديك طريقة تانية

**إزاي تاخد توكن (بعد ما تدخل):**
```javascript
const token = (await (await fetch('/api/v1/auth/refresh',{method:'POST',credentials:'include'})).json()).data.accessToken;
const H = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };
```
> التوكن صلاحيته **15 دقيقة**. لو شغلك طويل، جدّده.

---

# 🚦 المهمة 1 — انشر إصلاح الفلتر وتحقّق منه

**دي أول حاجة. الإصلاح مرفوع على git بس لسه مش على السيرفر.**

## الخطوات
```bash
cd website
git pull
./deploy-to-contabo.ps1
```

## ✅ التحقّق (إجباري — الصق النتيجة)
```bash
curl -s "http://169.58.77.61/api/v1/medical-centers?pageSize=60&type=CENTER" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>console.log('CENTER =',JSON.parse(s).meta.total))"
curl -s "http://169.58.77.61/api/v1/medical-centers?pageSize=60&type=PROGRAM" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>console.log('PROGRAM =',JSON.parse(s).meta.total))"
```

**المتوقّع:** رقمين **مختلفين**، ومجموعهم أقل من 19.
**لو الاتنين طلعوا 19** → النشر مانجحش. **قف وبلّغ.**

**وكمان افتح الصفحتين دول بعينك:**
- `http://169.58.77.61/medical-centers` — **مينفعش** تلاقي "برنامج كبارنا" أو "قسم الطوارئ"
- `http://169.58.77.61/programs` — **مينفعش** تلاقي "مركز الأسنان" أو أي مركز

---

# 🚦 المهمة 2 — صحّح تصنيف 6 كيانات

**المشكلة:** حقل `type` موجود بس 6 كيانات متصنّفين غلط، فبيظهروا في الصفحة الغلط.

## الوضع الحالي (مفحوص)
| الكيان | متصنّف حالياً | المفروض |
|---|---|---|
| `prevention-programs` | CENTER ❌ | **PROGRAM** |
| `check-up-programs` | CENTER ❌ | **PROGRAM** |
| `senior-care-program` | CENTER ❌ | **PROGRAM** |
| `laboratory` | CENTER ❌ | **DEPARTMENT** |
| `radiology-imaging` | CENTER ❌ | **DEPARTMENT** |
| `operating-rooms` | CENTER ❌ | **DEPARTMENT** |

الباقي صح: `kabarona-program`=PROGRAM · `outpatient-clinics`/`emergency-department`/`intensive-care-unit`/`general-surgery-specialized-surgical-clinics`=DEPARTMENT · باقي المراكز=CENTER

## الخطوات
ادخل لوحة التحكم (راجع قسم الوصول فوق)، وشغّل في console المتصفح:

```javascript
const token = (await (await fetch('/api/v1/auth/refresh',{method:'POST',credentials:'include'})).json()).data.accessToken;
const H = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

const FIX = {
  'prevention-programs': 'PROGRAM',
  'check-up-programs':   'PROGRAM',
  'senior-care-program': 'PROGRAM',
  'laboratory':          'DEPARTMENT',
  'radiology-imaging':   'DEPARTMENT',
  'operating-rooms':     'DEPARTMENT',
};

const all = (await (await fetch('/api/v1/admin/medical-centers?pageSize=60',{headers:H})).json()).data;
for (const [slug, type] of Object.entries(FIX)) {
  const c = all.find(x => x.slug === slug);
  if (!c) { console.log('❌ ملقيتش:', slug); continue; }
  const r = await fetch(`/api/v1/admin/medical-centers/${c.id}`, {
    method:'PATCH', headers:H, body: JSON.stringify({ type })
  });
  console.log(r.status === 200 ? '✅' : '❌', slug, '->', type, `(HTTP ${r.status})`);
}
```

## ✅ التحقّق (إجباري)
```javascript
const check = (await (await fetch('/api/v1/admin/medical-centers?pageSize=60',{headers:H})).json()).data;
const counts = {};
check.forEach(c => counts[c.type] = (counts[c.type]||0) + 1);
console.log(counts);
```
**المتوقّع بالظبط:** `{ CENTER: 9, DEPARTMENT: 6, PROGRAM: 4 }`
**أي رقم مختلف** → قف وبلّغ.

---

# 🚦 المهمة 3 — ارفع الصور واربطها 🔴 أهم مهمة بصرياً

**المشكلة المفحوصة:** `19 مركز → عندها صورة: 0`. ولا مركز واحد عنده صورة.

## 3.1 افهم نظام الرفع
```
POST /api/v1/admin/upload
- الهيدر: Authorization: Bearer <token>
- الجسم: multipart/form-data، الحقل اسمه بالظبط: file
- الحد الأقصى: 5 ميجابايت · صور بس (jpg/jpeg/png/gif/webp)
- الرد: { "success": true, "url": "/uploads/xxxxx.jpg" }
```
الـ `url` ده تحطه في حقل `heroImage` بتاع أي كيان.

## 3.2 مصدر الصور
```
business/Media/Services/          ← صور الخدمات (عمليات، أشعة، أسنان، طوارئ، عناية مركزة...)
business/Media/Facility/          ← صور المنشأة (واجهة، استقبال، محطات تمريض)
business/brand/logos/             ← الشعارات
```

## 3.3 اكتب سكربت الرفع
> ⚠️ **مهم:** الصور على القرص المحلي، والمتصفح **مش بيقدر يقراها**. لازم سكربت Node منفصل يشتغل من الطرفية.

أنشئ `website/scripts/upload-images.js`:
```javascript
const fs = require('fs');
const FormData = require('form-data');   // لو مش متثبت: npm i form-data

const TOKEN = 'الصق_التوكن_هنا';          // خده من المتصفح — صلاحيته 15 دقيقة
const BASE  = 'http://169.58.77.61/api/v1';

async function upload(localPath) {
  const form = new FormData();
  form.append('file', fs.createReadStream(localPath));
  const r = await fetch(`${BASE}/admin/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, ...form.getHeaders() },
    body: form,
  });
  const j = await r.json();
  console.log(localPath.split(/[\\/]/).pop(), '->', j.url || JSON.stringify(j));
  return j.url;
}

// حط هنا قائمة الصور اللي عايز ترفعها
const FILES = [
  'J:/My Drive/Insan/business/Media/Services/Operating Room/or-theatre-table-anaesthesia-light.jpeg',
  // ... كمّل
];

(async () => {
  const out = {};
  for (const f of FILES) { try { out[f] = await upload(f); } catch(e){ console.log('❌', f, e.message); } }
  fs.writeFileSync('uploaded-urls.json', JSON.stringify(out, null, 2));
  console.log('\nاتحفظت الروابط في uploaded-urls.json');
})();
```

شغّله: `node website/scripts/upload-images.js`

> **ارفع على دفعات 20–30 صورة** عشان التوكن ميخلصش صلاحيته نص الطريق.

## 3.4 اربط الصور بالكيانات
خريطة مقترحة (عدّلها لو لقيت صورة أنسب):

| الكيان | صورة مقترحة من `business/Media/` |
|---|---|
| `cardiac-internal-medicine-center` | `Services/Intensive Care Unit/icu-bay-beds-5-6-ventilator-monitors.jpeg` |
| `general-surgery-endoscopy-center` | `Services/Operating Room/or-theatre-table-anaesthesia-light.jpeg` |
| `bariatric-metabolic-surgeries-center` | `Services/Operating Room/or-corridor-theatre-1-door.jpeg` |
| `colorectal-anal-surgeries-center` | `Services/Operating Room/or-suite-entrance-sign.jpeg` |
| `ent-head-and-neck-surgery-center` | `Services/Outpatient Clinic/clinic-door-ent.jpeg` |
| `pediatrics-neonatology-center` | `Services/Neonatal Intensive Care Unit/nicu-entrance-sign.jpeg` |
| `womens-health-center` | `Services/Neonatal Intensive Care Unit/nicu-preparation-and-equipment-store.jpeg` |
| `urology-andrology-surgery-center` | `Services/Dialysis Unit/haemodialysis-machine-and-ro-unit.jpeg` |
| `emergency-department` | `Services/Emergency Department/emergency-exam-bays-wide.jpeg` |
| `intensive-care-unit` | `Services/Intensive Care Unit/icu-isolation-room-door-sign.jpeg` |
| `radiology-imaging` | `Services/Radiology Department/ct-control-console-and-gantry.jpeg` |
| `operating-rooms` | `Services/Operating Room/or-theatre-table-anaesthesia-light.jpeg` |
| `outpatient-clinics` | `Services/Outpatient Clinic/clinic-door-neurology.jpeg` |

بعد الرفع، من console المتصفح:
```javascript
const MAP = {
  'cardiac-internal-medicine-center': '/uploads/xxx.jpg',   // من uploaded-urls.json
  // ... كمّل الباقي
};
const all = (await (await fetch('/api/v1/admin/medical-centers?pageSize=60',{headers:H})).json()).data;
for (const [slug, url] of Object.entries(MAP)) {
  const c = all.find(x => x.slug === slug);
  if (!c) { console.log('❌ ملقيتش:', slug); continue; }
  const r = await fetch(`/api/v1/admin/medical-centers/${c.id}`, {
    method:'PATCH', headers:H, body: JSON.stringify({ heroImage: url })
  });
  console.log(r.status===200?'✅':'❌', slug);
}
```

## ✅ التحقّق (إجباري)
```bash
curl -s "http://169.58.77.61/api/v1/medical-centers?pageSize=60" | node -e "
let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const d=JSON.parse(s).data;
console.log('عندها صورة:', d.filter(c=>c.heroImage).length, 'من', d.length);
d.filter(c=>!c.heroImage).forEach(c=>console.log('  بلا صورة:',c.slug));});"
```
**المتوقّع:** "عندها صورة: 19 من 19" أو قريب منها.
**لو طلع 0** → الربط مانجحش. **قف وبلّغ.**

**وكمان:** افتح `http://169.58.77.61/medical-centers` وشوف الصور ظاهرة بعينك.

---

# 🚦 المهمة 4 — سلايدشو صور المستشفى

**المشكلة المفحوصة:** `heroImages` (سلايدشو) = **0** لكلا المستشفيين. الحقل موجود في قاعدة البيانات وبيتعرض في الواجهة — بس فاضي.

## الخطوات
ارفع 4–6 صور لكل مستشفى من `business/Media/Facility/` (واجهة المبنى، الاستقبال، محطات التمريض)، وبعدين:

```javascript
const hospitals = (await (await fetch('/api/v1/admin/hospitals?pageSize=50',{headers:H})).json()).data;
const delta = hospitals.find(h => h.slug === 'delta-hospital');

await fetch(`/api/v1/admin/hospitals/${delta.id}`, {
  method:'PATCH', headers:H,
  body: JSON.stringify({ heroImages: ['/uploads/a.jpg','/uploads/b.jpg','/uploads/c.jpg','/uploads/d.jpg'] })
});
```
كرّر لـ `future-hospital`.

> ⚠️ **`heroImages` مصفوفة كاملة** — لازم تبعتها كلها مرة واحدة. لو بعت عنصر واحد **هتمسح الباقي**.

## ✅ التحقّق (إجباري)
```bash
curl -s "http://169.58.77.61/api/v1/hospitals/delta-hospital" | node -e "
let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const h=JSON.parse(s).data;
console.log('heroImages:', Array.isArray(h.heroImages)?h.heroImages.length:0);});"
```
**المتوقّع:** رقم **أكبر من 1**. لو 0 → قف وبلّغ.

---

# 🚦 المهمة 5 — املأ محتوى صفحات الأقسام 🔴 أكبر مهمة

**المشكلة المفحوصة:** الحقول اتضافت في قاعدة البيانات والواجهة والأدمن ✅ — **بس فاضية تماماً**:

```
pediatrics          | وصف ✓ | صورة ✓ | خدمات: 0 | أجهزة: 0 | صور: 0
general-surgery     | وصف ✓ | صورة ✓ | خدمات: 0 | أجهزة: 0 | صور: 0
intensive-care-unit | وصف ✗ | صورة ✗ | خدمات: 0 | أجهزة: 0 | صور: 0
emergency-department| وصف ✓ | صورة ✗ | خدمات: 0 | أجهزة: 0 | صور: 0
outpatient-clinics  | وصف ✗ | صورة ✗ | خدمات: 0 | أجهزة: 0 | صور: 0
```

## مصدر المحتوى
```
business/knowledge/departments/     ← ملفات الأقسام
business/knowledge/hospitals/       ← ملفات المستشفيات (فيها تفاصيل الأقسام الداخلية)
```

> ⚠️ **ملفات المصدر مكتوبة بالإنجليزي.** لازم **تكتب** النسخة العربية بنفسك — صياغة عربية سليمة، مش ترجمة حرفية آلية.

## الشكل المطلوب لكل قسم
```javascript
{
  slug: 'emergency-department',
  name: { ar: '...', en: '...' },
  shortDescription: { ar: '...', en: '...' },
  description: { ar: 'فقرتين أو تلاتة', en: '...' },
  image: '/uploads/xxx.jpg',
  images: ['/uploads/a.jpg', '/uploads/b.jpg'],       // معرض صور
  services: [ {ar:'خدمة 1', en:'Service 1'}, ... ],   // الخدمات
  equipment: [ {ar:'جهاز 1', en:'Device 1'}, ... ],   // الأجهزة والتقنيات
  features: [ {ar:'ميزة 1', en:'Feature 1'}, ... ],   // المميزات
  videoUrl: ''                                        // اختياري
}
```

## الخطوات
```javascript
const hospitals = (await (await fetch('/api/v1/admin/hospitals?pageSize=50',{headers:H})).json()).data;
const delta = hospitals.find(h => h.slug === 'delta-hospital');
const full  = (await (await fetch(`/api/v1/admin/hospitals/${delta.id}`,{headers:H})).json()).data;

console.log('الأقسام الحالية:', full.departments.map(d=>d.slug));   // شوفها الأول

// عدّل على النسخة الموجودة — متبنيش من الصفر
const updated = full.departments.map(d => {
  if (d.slug === 'emergency-department') {
    return { ...d,
      services:  [ {ar:'استقبال الحالات الحرجة 24 ساعة', en:'24/7 critical case reception'} ],
      equipment: [ {ar:'أجهزة إنعاش', en:'Resuscitation equipment'} ],
      features:  [ {ar:'فريق طبي متكامل على مدار الساعة', en:'Round-the-clock medical team'} ],
    };
  }
  return d;   // القسم ده مش هيتغير
});

await fetch(`/api/v1/admin/hospitals/${delta.id}`, {
  method:'PATCH', headers:H, body: JSON.stringify({ departments: updated })
});
```

> 🔴 **أخطر تحذير في الملف ده:** حقل `departments` **مصفوفة كاملة**. الطريقة اللي فوق (`full.departments.map`) بتحافظ على كل الأقسام. **لو بعت قسم واحد لوحده هتمسح الباقي.** اقرا الأقسام الأول، عدّل، ابعت الكل.

## ⛔ ممنوعات
- **ممنوع تخترع معلومات طبية أو أجهزة.** لو مش في ملف المصدر، متكتبهاش.
- **ممنوع تسيب إنجليزي في حقل `ar`.**
- لو مالقتش محتوى كافي لقسم، سيبه وبلّغ عنه — أحسن من محتوى مخترع.

## ✅ التحقّق (إجباري)
```bash
curl -s "http://169.58.77.61/api/v1/hospitals/delta-hospital" | node -e "
let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const ds=JSON.parse(s).data.departments||[];
console.log('عدد الأقسام:', ds.length);
ds.forEach(d=>console.log(' ',d.slug,'| وصف:',!!d.description,'| خدمات:',(d.services||[]).length,'| أجهزة:',(d.equipment||[]).length,'| صور:',(d.images||[]).length));});"
```
**المتوقّع:** كل قسم عنده **خدمات > 0** و**أجهزة > 0**، وعدد الأقسام **زي ما كان** (مش أقل!).
**لو عدد الأقسام قلّ** → مسحت أقسام بالغلط. **قف وبلّغ فوراً.**

**وكمان:** افتح `http://169.58.77.61/hospitals/delta-hospital/departments/emergency-department` بعينك.

---

# 🚦 المهمة 6 — نظّف ربط المستشفى بالمراكز

**المشكلة:** مستشفى الدلتا مربوط بالـ **19 كيان كلهم** (بما فيهم البرامج والأقسام).

> ℹ️ **صفحة المستشفى اتصلحت بالكود بالفعل** (بتفلتر `type=CENTER`)، فالسيكشن هيبان صح. المهمة دي **تنظيف بيانات** عشان قاعدة البيانات تبقى صح كمان.

## الخطوات
```javascript
const centers = (await (await fetch('/api/v1/admin/medical-centers?pageSize=60',{headers:H})).json()).data;
const realCenterIds = centers.filter(c => c.type === 'CENTER').map(c => c.id);

const hospitals = (await (await fetch('/api/v1/admin/hospitals?pageSize=50',{headers:H})).json()).data;
const delta = hospitals.find(h => h.slug === 'delta-hospital');

console.log('هيتربط بـ', realCenterIds.length, 'مركز');
// للدلتا: كل المراكز. للمستقبل: الأربعة الأساسية بس (راجع ENTITY_REGISTRY.md)
```
**بعدين** حدّث كل مركز بـ `hospitalIds` المناسبة (الحقل موجود في `CreateMedicalCenterDto`).

> ⚠️ راجع `business/brand/ENTITY_REGISTRY.md` — المراكز 1–4 في المستشفيين، والباقي في الدلتا بس.

## ✅ التحقّق
```bash
curl -s "http://169.58.77.61/api/v1/hospitals/delta-hospital" | node -e "
let s='';process.stdin.on('data',d=>s+=d).on('end',()=>console.log('مراكز الدلتا:',(JSON.parse(s).data.medicalCenters||[]).length))"
```
**المتوقّع:** رقم **أقل من 19** ومطابق لعدد المراكز الحقيقية.

---

# 🚦 المهمة 7 — أصلح بناء الـ API (`@types/multer`)

**المشكلة المكتشفة:** `tsc` بيفشل بالخطأ:
```
src/modules/upload/upload.controller.ts(41,44):
error TS2694: Namespace 'global.Express' has no exported member 'Multer'.
```
`@types/multer` **معلَن في `package.json`** بس **مش متثبت**.

## الخطوات
```bash
cd website
pnpm install
```
لو مانفعش:
```bash
cd website/apps/api
pnpm add -D @types/multer
```

## ✅ التحقّق
```bash
cd website/apps/api && npx tsc --noEmit
```
**المتوقّع:** مفيش أي خطأ (خرج فاضي).

---

# 📋 قواعد ملزمة لكل المهام

## ⛔ ممنوعات مطلقة
1. **`prisma migrate dev` أو `migrate reset`** — قاعدة الإنتاج مُنحرِفة، الأمرين دول **هيمسحوا كل البيانات**. الآمن الوحيد: `prisma migrate deploy` + migration مكتوب بإيدك.
2. **تخترع بيانات** — أرقام، إحصائيات، معلومات طبية، أجهزة. لو مش في `business/`، متكتبهاش.
3. **تبعت عنصر واحد في حقل مصفوفة** (`departments`, `heroImages`, `heroStats`, `locations`, `journeySteps`) — لازم المصفوفة كاملة، وإلا **بتمسح الباقي**.
4. **تقول "خلصت" من غير ما تلصق نتيجة أمر التحقّق.**

## ✅ إلزاميات
1. **اقرا قبل ما تكتب:** `GET` الكيان → عدّل → `GET` تاني للتأكيد.
2. **أي حقل جديد = 4 خطوات:** schema → migration يدوي → **DTO** → الواجهة.
   > 🔴 **الفخّ اللي وقع فيه اللي قبلك:** الـ `ValidationPipe` بيحذف **بصمت** أي حقل مش معرّف في الـ DTO — من غير أي رسالة خطأ. ده بالظبط اللي خلّى `?type=` ميوصلش. **لو ضفت حقل query جديد، ضيفه في `PaginationQueryDto` كمان.**
3. **`t()` على كل حقل ثنائي اللغة** في الواجهة — كتابة `{field}` مباشرة = انهيار الصفحة.
4. **بعد كل مهمة:** commit + push + `./deploy-to-contabo.ps1` + **افتح الصفحة بعينك**.

---

# 📊 التقرير المطلوب منك في الآخر

لكل مهمة، اكتب:
```
المهمة N: [اسمها]
الحالة: ✅ خلصت / ⚠️ جزئي / ❌ متعملتش
أمر التحقّق: [الأمر اللي شغّلته]
النتيجة: [الصق المخرجات الفعلية]
ملاحظات: [أي حاجة واجهتك]
```

**وفي الآخر:** اكتب أي مشكلة قابلتك ومحلّتهاش، ومتحاولش تخفيها.

---

# 🎯 الترتيب المقترح

| # | المهمة | الأولوية | ليه |
|---|---|---|---|
| 1 | انشر إصلاح الفلتر | 🔴 أولاً | كل حاجة بعده بتعتمد عليه |
| 2 | صحّح التصنيف | 🔴 عالية | يكمّل إصلاح الفلتر |
| 7 | أصلح البناء | 🟠 بدري | عشان تقدر تبني وتنشر |
| 3 | الصور | 🔴 عالية | أكبر أثر بصري |
| 4 | سلايدشو المستشفى | 🟡 متوسطة | — |
| 5 | محتوى الأقسام | 🟠 أطول مهمة | تحتاج قراءة وكتابة كتير |
| 6 | تنظيف الربط | 🟡 أخيراً | الواجهة اتصلحت بالفعل |
