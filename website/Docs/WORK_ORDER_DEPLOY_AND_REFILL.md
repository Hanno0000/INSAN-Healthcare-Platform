# أمر شغل — انشر إصلاح الـ DTO وأعِد إدخال محتوى الأقسام

> **للمنفّذ:** الإصلاح البرمجي **اتعمل بالفعل ومرفوع على GitHub** (كوميت `7df3458`). مهمتك: تنشره على السيرفر، وبعدين تعيد إدخال البيانات اللي اتشوّهت.
>
> **الترتيب إجباري.** لو أعدت إدخال البيانات **قبل** النشر، هتتشوّه تاني بنفس الطريقة.

---

## 🔍 خلفية: إيه اللي كان غلط ولماذا

المحتوى اللي أدخلته المرة اللي فاتت (خدمات ومميزات الأقسام) **اتحفظ مشوّه**. الشكل المفروض:
```json
{ "ar": "فرز فوري للحالات", "en": "Immediate triage" }
```
اللي اتحفظ فعلاً:
```json
[]
```

**السبب:** حقول `services` و `features` و `equipment` كانت معرّفة في الـ DTO كـ `any[]`. الـ `ValidationPipe` شغّال بـ `enableImplicitConversion`، فبيقرا نوع الحقل (`Array`) **ويحوّل كل عنصر جوّه لمصفوفة كمان** — فالكائن `{ar, en}` بيتحول لـ `[]`.

النتيجة على الموقع: عناوين "مميزات القسم" و"الخدمات الطبية" ظاهرة، وتحتيها نقط ملوّنة **بلا أي نص**.

**الإصلاح:** تغيير النوع من `any[]` لـ `any` (بيتقرا كـ `Object` فمفيش تحويل). اتصلحت 5 حقول: `services` · `features` · `equipment` · `heroStats` · `journeySteps` · `locations`.

> ℹ️ ده كان بيضرب المستشفيات بس. المراكز الطبية سليمة لأن حقولها معرّفة `any` أصلاً.

---

# 🚦 المهمة 1 — انشر الإصلاح (إجباري أولاً)

```bash
cd website
git pull
./deploy-to-contabo.ps1
```

## ✅ التحقّق — الصق النتيجة

بعد النشر، اختبر إن الـ API بقى بيحافظ على الشكل. من Console المتصفح بعد ما تدخل لوحة التحكم:

```javascript
// خد توكن الأول
const TOKEN = (await (await fetch('/api/v1/auth/refresh',{method:'POST',credentials:'include'})).json()).data.accessToken;
const H = { 'Authorization': `Bearer ${TOKEN}`, 'Content-Type': 'application/json' };

// اختبار: ابعت قيمة تجريبية وشوف رجعت إزاي
const hs = (await (await fetch('/api/v1/admin/hospitals?pageSize=50',{headers:H})).json()).data;
const delta = hs.find(h => h.slug === 'delta-hospital');
const full = (await (await fetch(`/api/v1/admin/hospitals/${delta.id}`,{headers:H})).json()).data;

const probe = full.departments.map(d =>
  d.slug === 'emergency-department'
    ? { ...d, features: [{ ar: 'اختبار', en: 'probe' }] }
    : d
);
await fetch(`/api/v1/admin/hospitals/${delta.id}`, {method:'PATCH', headers:H, body: JSON.stringify({departments: probe})});

const back = (await (await fetch(`/api/v1/admin/hospitals/${delta.id}`,{headers:H})).json()).data;
console.log('النتيجة:', JSON.stringify(back.departments.find(d=>d.slug==='emergency-department').features));
```

**المتوقّع:** `[{"ar":"اختبار","en":"probe"}]`
**لو طلع `[[]]` أو `[]`** → النشر مانجحش. **قف وبلّغ. متكملش للمهمة 2.**

---

# 🚦 المهمة 2 — أعِد إدخال محتوى الأقسام

**متبدأهاش قبل ما تنجح المهمة 1.**

## الخطوة 1: جهّز التوكن
```javascript
window.TOKEN = 'الصق_التوكن_هنا';
window.H = { 'Authorization': `Bearer ${window.TOKEN}`, 'Content-Type': 'application/json' };
```

## الخطوة 2: المحتوى — انسخه كما هو، ممنوع التعديل

```javascript
const DEPT_CONTENT = {
  'emergency-department': {
    features: [
      { ar: 'عمل متواصل 24 ساعة طوال أيام الأسبوع', en: 'Operating 24 hours a day, seven days a week' },
      { ar: 'فرز فوري للحالات حسب درجة الخطورة', en: 'Immediate triage by severity' },
      { ar: 'تحرّك إمكانيات المستشفى كاملة من الدقيقة الأولى', en: 'Full hospital capability mobilized from minute one' },
      { ar: 'شرح كل خطوة للمريض والمرافقين', en: 'Every step explained to patient and companions' },
      { ar: 'شفافية كاملة في الجوانب المالية', en: 'Complete financial transparency' }
    ],
    services: [
      { ar: 'الفرز الفوري والإنعاش', en: 'Immediate triage and resuscitation' },
      { ar: 'طوارئ الكبار', en: 'Adult emergency care' },
      { ar: 'طوارئ الأطفال', en: 'Paediatric emergency care' },
      { ar: 'طوارئ النساء والتوليد', en: 'Obstetric and gynaecological emergencies' },
      { ar: 'التعامل مع الحوادث والإصابات', en: 'Trauma and accident management' },
      { ar: 'تشخيص على مدار الساعة (معامل وأشعة)', en: 'Round-the-clock diagnostics (labs and radiology)' },
      { ar: 'نقل مباشر للعناية المركزة وغرف العمليات', en: 'Direct transfer to intensive care and operating rooms' }
    ]
  },

  'intensive-care-unit': {
    features: [
      { ar: 'فريق متعدد التخصصات يعمل بتنسيق كامل', en: 'A fully coordinated multidisciplinary team' },
      { ar: 'متابعة متصلة على مدار الساعة', en: 'Continuous round-the-clock monitoring' },
      { ar: 'تواصل منتظم مع الأسرة كشريك في الرعاية', en: 'Regular family communication as care partners' },
      { ar: 'شفافية كاملة في الحالة والتكلفة', en: 'Full transparency on condition and cost' },
      { ar: 'معيار موحّد عبر مستشفيات المنظومة', en: 'One unified standard across the ecosystem' }
    ],
    services: [
      { ar: 'رعاية الحالات الحرجة على مدار الساعة', en: 'Round-the-clock critical care' },
      { ar: 'رعاية متعددة التخصصات منسّقة', en: 'Coordinated multidisciplinary care' },
      { ar: 'تواصل منظّم مع الأسرة', en: 'Structured family communication' },
      { ar: 'تنسيق سريع مع الأقسام الأخرى', en: 'Rapid coordination with other departments' },
      { ar: 'انتقالات منظّمة للرعاية', en: 'Organized transitions of care' }
    ]
  },

  'outpatient-clinics': {
    features: [
      { ar: 'تغطية شبه كاملة للتخصصات الطبية', en: 'Near-complete coverage of medical specialties' },
      { ar: 'خدمات تشخيصية مصاحبة في نفس المكان', en: 'On-site diagnostic support services' },
      { ar: 'سياسة تقليل أوقات الانتظار', en: 'A policy of minimizing waiting times' },
      { ar: 'شفافية مالية كاملة', en: 'Complete financial transparency' },
      { ar: 'استضافة أساتذة واستشاريين زائرين', en: 'Hosting visiting professors and consultants' }
    ],
    services: [
      { ar: 'استشارات في معظم التخصصات', en: 'Consultations across most specialties' },
      { ar: 'الأشعة السينية', en: 'X-ray imaging' },
      { ar: 'الموجات فوق الصوتية', en: 'Ultrasound' },
      { ar: 'إيكو القلب', en: 'Echocardiography' },
      { ar: 'التحاليل المعملية', en: 'Laboratory testing' },
      { ar: 'برنامج كبارنا لرعاية كبار السن', en: 'Kabarona elderly care programme' },
      { ar: 'العيادات التخصصية المجمّعة', en: 'Grouped sub-specialty clinics' },
      { ar: 'زيارات الخبراء', en: 'Expert visits' }
    ]
  }
};
console.log('جاهز:', Object.keys(DEPT_CONTENT));
```

## الخطوة 3: التنفيذ

> 🔴 حقل `departments` **مصفوفة كاملة**. السكربت بيقرا الكل، يعدّل المطلوب، ويبعت الكل. **متغيّرش الطريقة دي.**

```javascript
for (const slug of ['delta-hospital', 'future-hospital']) {
  const hs = (await (await fetch('/api/v1/admin/hospitals?pageSize=50',{headers:H})).json()).data;
  const h = hs.find(x => x.slug === slug);
  const full = (await (await fetch(`/api/v1/admin/hospitals/${h.id}`,{headers:H})).json()).data;

  const before = full.departments.length;
  const updated = full.departments.map(d => {
    const c = DEPT_CONTENT[d.slug];
    return c ? { ...d, ...c } : d;
  });

  if (updated.length !== before) { console.log('❌ العدد اتغير! وقف.'); break; }

  const r = await fetch(`/api/v1/admin/hospitals/${h.id}`, {
    method:'PATCH', headers:H, body: JSON.stringify({ departments: updated })
  });
  console.log(slug, r.status === 200 ? '✅' : '❌ ' + await r.text());
}
```

## ✅ التحقّق — الصق النتيجة

> ⚠️ **المرة اللي فاتت التحقّق فشل لأنه عدّ العناصر بس.** المرة دي **لازم** يفحص **محتوى** العنصر.

```javascript
for (const slug of ['delta-hospital','future-hospital']) {
  const d = (await (await fetch(`/api/v1/hospitals/${slug}`)).json()).data;
  const ds = d.departments || [];
  console.log('---', slug, '— أقسام:', ds.length);
  ds.forEach(x => {
    const f = x.features || [], s = x.services || [];
    if (!f.length && !s.length) return;
    const okF = f.every(i => i && typeof i === 'object' && !Array.isArray(i) && i.ar);
    const okS = s.every(i => i && typeof i === 'object' && !Array.isArray(i) && i.ar);
    console.log('   ', x.slug.padEnd(22),
      '| مميزات:', f.length, okF ? '✅' : '❌ مشوّهة',
      '| خدمات:',  s.length, okS ? '✅' : '❌ مشوّهة',
      '| أول ميزة:', JSON.stringify(f[0] || null).slice(0, 45));
  });
}
```

**المتوقّع:**
- عدد الأقسام: الدلتا **5** · المستقبل **6** ← لو قلّ، **قف فورًا**
- كل الأقسام التلاتة → **✅** في المميزات والخدمات
- "أول ميزة" لازم تكون زي `{"ar":"عمل متواصل 24 ساعة...","en":"..."}` **مش** `[]`

## 👁️ التحقّق البصري — إجباري

افتح الصفحة دي **بعينك** في المتصفح:
```
http://169.58.77.61/hospitals/delta-hospital/departments/emergency-department
```

**لازم تشوف تحت "مميزات القسم" و"الخدمات الطبية" نصوص عربية مكتوبة فعلاً** — مش نقط ملوّنة فاضية.

> 💡 لو لسه شايف القديم، ده الـ ISR cache. جرّب بـ `Cache-Control: no-cache` أو استنى دقيقة.

**متقولش "خلصت" قبل ما تشوف النصوص بعينك.**

---

# 📋 قواعد

## ⛔ ممنوعات
1. **متبدأش المهمة 2 قبل نجاح تحقّق المهمة 1.**
2. **متغيّرش أي نص عربي** في الملف ده.
3. **متبعتش قسم واحد لوحده** — اقرا الكل، عدّل، ابعت الكل.
4. **متقولش "خلصت"** من غير نتيجة التحقّق + الفحص البصري.

## ✅ لو حصل خطأ
- عدد الأقسام **قلّ** → وقف فورًا وبلّغ (مسحت بيانات).
- التوكن رجّع 401 → خلصت صلاحيته (15 دقيقة)، اطلب جديد.
- التحقّق طلّع **❌ مشوّهة** → النشر مانجحش، ارجع للمهمة 1.

## 📊 التقرير المطلوب
```
المهمة 1 (النشر): ✅/❌
  نتيجة اختبار الشكل: [الصق]

المهمة 2 (إعادة الإدخال): ✅/❌
  نتيجة التحقّق: [الصق]
  الفحص البصري: شفت النصوص؟ نعم/لا

مشاكل: [اكتبها، متخفيش حاجة]
```
