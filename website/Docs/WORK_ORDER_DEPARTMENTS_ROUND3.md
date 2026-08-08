# أمر شغل — إضافة قسمين جديدين لمستشفى الدلتا

> **للمنفّذ:** المهمة دي مختلفة عن أوامر الشغل اللي فاتت — هنا مش بنعدّل أقسام
> موجودة، **بنضيف قسمين جديدين** لقائمة أقسام مستشفى الدلتا. المحتوى جاهز في
> الملف ده. **انسخ والصق ونفّذ — متضيفش ولا تترجم ولا تجتهد.**

---

## الخلفية — قرارات صاحب المشروع

راجعنا تعارضين لقيتهم بين `ENTITY_REGISTRY.md` وقاعدة البيانات الحية، وصاحب
المشروع حسم فيهم:

1. **مركز العظام (`CEN-010`) موجود في المستشفيين الاتنين** — مش دلتا بس زي ما
   كان مكتوب قبل كده. (السجل نفسه اتصلح بالفعل من طرف تاني — راجعت
   `ENTITY_REGISTRY.md` سطر 108: `CEN-010 → Future, Delta`. **مفيش حاجة تتعدّل
   في السجل، هو مظبوط دلوقتي.**)
2. **مركز القلب (`CEN-001`) متاح في المستشفيين أصلًا في السجل**، لكن مستشفى
   الدلتا **مالوش قسم "قلب" في قائمة أقسامه على الموقع** — فجوة بيانات حقيقية.
   صاحب المشروع قرر: **نضيفه.**

## اللي هنضيفه بالظبط

| القسم الجديد | المستشفى | المحتوى |
|---|---|---|
| `cardiology` | الدلتا | **كامل** — نفس محتوى قسم القلب الموجود بالفعل في المستقبل، لأن ملف المعرفة (`CEN-001`) بيغطي المستشفيين الاتنين بنفس النص |
| `orthopedics` | الدلتا | **هيكل بس، بلا محتوى طبي** — **لسه محدش كتب ملف معرفة لمركز العظام خالص** (فحصت `business/knowledge/centers/` تاني قبل ما أكتب الملف ده — مفيش). القسم هيتضاف بالاسم والصورة بس، بالظبط زي حالة `orthopedics` في المستقبل النهاردة (0 مميزات، 0 خدمات) — **مش نقص في التنفيذ، ده الواقع الفعلي لحد ما حد يكتب المحتوى** |

⚠️ **متلمسش قسم `orthopedics` الموجود في المستقبل ولا أي قسم تاني — المهمة دي بتضيف بس لمستشفى الدلتا.**

---

## ⚠️ الخطوة صفر — إجبارية

نفس خطوة التوكن المعتادة:
```javascript
(await (await fetch('/api/v1/auth/refresh',{method:'POST',credentials:'include'})).json()).data.accessToken
```
```javascript
window.TOKEN = 'الصق_التوكن_هنا';
window.H = { 'Authorization': `Bearer ${window.TOKEN}`, 'Content-Type': 'application/json' };
```

---

## المحتوى — جاهز، انسخه كما هو

```javascript
// ⛔ ممنوع تعديل أي نص هنا
const NEW_DEPTS = [
  {
    slug: 'cardiology',
    name: { ar: 'قسم القلب', en: 'Cardiology' },
    shortDescription: {
      ar: 'مركز متكامل للباطنة والقلب والرعايات الحرجة، من العيادات الخارجية حتى العناية المركزة، بمتابعة صارمة تمنع تكرار دخول الحالات المزمنة للعناية المركزة.',
      en: 'An integrated internal medicine, cardiac and critical care center — from outpatient clinics to intensive care — with rigorous follow-up that prevents repeat ICU admissions.'
    },
    description: {
      ar: 'قسم القلب والباطنة في منظومة إنسان مركز متكامل ومتعدد التخصصات لإدارة حالات الباطنة المعقدة، وطوارئ القلب، وإحالات الرعاية الحرجة. يعمل عبر مستشفى المستقبل التخصصي ومستشفى الدلتا الدولي، ويقدّم رعاية متصلة من العيادات الخارجية وحتى وحدات العناية المركزة المتخصصة.\n\nيضم القسم عيادات خارجية للباطنة العامة والكبد والغدد الصماء والكلى والصدر والمخ والأعصاب وطب المسنين، بجانب أسرّة داخلي ورعاية متوسطة ورعاية مركزة، يحدَّد تصنيفها بقرار طبي من الاستشاري المعالج. تتوفر تشخيصات شاملة من معمل وأشعة، منها الموجات فوق الصوتية وإيكو القلب وإيكو الإجهاد.\n\nقسطرة القلب والمخ ليست متاحة داخل مبنى المستشفى، لكن القسم يتعاقد بشكل مباشر ومستمر على مدار الساعة مع مراكز متخصصة كبرى لتوفيرها، مع إشراف أساتذة واستشاريين متاحين للتدخلات العاجلة والمجدولة على حدٍّ سواء.\n\nفلسفتنا أن الوقت عامل حاسم في حالات القلب والباطنة الحرجة، فنعمل على استجابة سريعة وتشخيص دقيق وتدخل فوري، مع نظام متابعة صارم بعد الخروج يقلل بشكل كبير من احتمالات العودة لدخول العناية المركزة.',
      en: 'The Cardiac & Internal Medicine Department at INSAN is a comprehensive, multidisciplinary center for managing complex internal medicine cases, cardiac emergencies and critical care referrals. It operates across Future Specialized Hospital and Delta International Hospital, providing a seamless continuum of care from outpatient clinics to specialized intensive care units.\n\nThe department includes outpatient clinics for general internal medicine, hepatology, endocrinology, nephrology, pulmonology, neurology and geriatrics, alongside inpatient, intermediate care and intensive care beds, with bed classification decided by the treating consultant. Comprehensive diagnostics are available, including laboratory testing, ultrasound, echocardiography and stress echo.\n\nCardiac and cerebral catheterization are not physically located inside the hospital building, but the department maintains direct, round-the-clock contracts with major specialized centers to provide them, with professors and consultants available for both urgent and scheduled interventions.\n\nOur philosophy is that time is the critical factor in cardiac and internal medicine emergencies, so we focus on rapid response, accurate diagnosis and immediate intervention, backed by a strict post-discharge follow-up system that significantly reduces the likelihood of returning to intensive care.'
    },
    image: '/uploads/1786119063605-373317677.jpeg',
    features: [
      { ar: 'رعاية متصلة من العيادات الخارجية حتى العناية المركزة', en: 'Continuous care from outpatient clinics to intensive care' },
      { ar: 'عيادات متعددة التخصصات: باطنة، كبد، غدد صماء، كلى، صدر، مخ وأعصاب، مسنين', en: 'Multi-specialty clinics: internal medicine, hepatology, endocrinology, nephrology, pulmonology, neurology, geriatrics' },
      { ar: 'تعاقد مباشر على مدار الساعة مع مراكز القسطرة المتخصصة', en: 'Direct round-the-clock contracts with specialized catheterization centers' },
      { ar: 'متابعة صارمة بعد الخروج لتقليل تكرار دخول العناية المركزة', en: 'Strict post-discharge follow-up to reduce repeat ICU admissions' },
      { ar: 'أكثر من 21 عامًا من الخبرة في التعامل مع الحالات المعقدة', en: 'Over 21 years of experience managing complex cases' }
    ],
    services: [
      { ar: 'الباطنة العامة', en: 'General internal medicine' },
      { ar: 'الباطنة والكبد', en: 'Hepatology' },
      { ar: 'الباطنة والغدد الصماء', en: 'Endocrinology' },
      { ar: 'الباطنة والكلى', en: 'Nephrology' },
      { ar: 'الباطنة والصدر', en: 'Pulmonology' },
      { ar: 'مخ وأعصاب', en: 'Neurology' },
      { ar: 'طب المسنين', en: 'Geriatrics' },
      { ar: 'تشخيص شامل: معمل، أشعة، إيكو قلب، إيكو إجهاد', en: 'Comprehensive diagnostics: lab, imaging, echocardiography, stress echo' }
    ]
  },
  {
    // ⚠️ هيكل بس — بلا وصف وبلا مميزات وبلا خدمات، لأن مفيش مصدر معتمد بعد.
    // ممنوع تضيف أي حقل هنا من عندك.
    slug: 'orthopedics',
    name: { ar: 'قسم العظام', en: 'Orthopedics' }
  }
];
console.log('جاهز للإضافة:', NEW_DEPTS.map(d => d.slug));
```

## سكربت التنفيذ — انسخه كما هو

> 🔴 السكربت ده **بيضيف** الأقسام الجديدة لو مش موجودة، وبيتجاهلها لو موجودة
> بالفعل (عشان لو اتنفّذ مرتين بالغلط ما يكررش الإضافة). **بيقرا الدلتا بس —
> المستقبل متلمسش خالص.**

```javascript
const hs = (await (await fetch('/api/v1/admin/hospitals?pageSize=50',{headers:H})).json()).data;
const delta = hs.find(x => x.slug === 'delta-hospital');
const full = (await (await fetch(`/api/v1/admin/hospitals/${delta.id}`,{headers:H})).json()).data;

const before = full.departments.length;
console.log('عدد أقسام الدلتا قبل:', before, '←', full.departments.map(d => d.slug));

const existingSlugs = new Set(full.departments.map(d => d.slug));
const toAdd = NEW_DEPTS.filter(d => !existingSlugs.has(d.slug));

if (toAdd.length === 0) {
  console.log('⚠️ القسمين موجودين بالفعل — مفيش حاجة تتضاف. وقف هنا.');
} else {
  console.log('هيتضاف:', toAdd.map(d => d.slug));
  const updated = [...full.departments, ...toAdd];

  const r = await fetch(`/api/v1/admin/hospitals/${delta.id}`, {
    method: 'PATCH', headers: H, body: JSON.stringify({ departments: updated })
  });
  console.log(r.status === 200 ? '✅ اتحفظ' : '❌ HTTP ' + r.status + ' ' + await r.text());
}
```

## ✅ التحقّق — الصق النتيجة

```javascript
const d = (await (await fetch('/api/v1/hospitals/delta-hospital')).json()).data;
console.log('عدد أقسام الدلتا الآن:', d.departments.length, '(المتوقع: عدد الأول + 2)');
d.departments.forEach(x => {
  console.log('  ', x.slug, '| خدمات:', (x.services||[]).length, '| مميزات:', (x.features||[]).length);
});

const f = (await (await fetch('/api/v1/hospitals/future-hospital')).json()).data;
console.log('عدد أقسام المستقبل (لازم يفضل زي ما هو، متأثرش):', f.departments.length);
```

**المتوقّع:**
- عدد أقسام الدلتا **زاد باثنين بالظبط** (كان قبل كده 5 → يبقى 7)
- `cardiology` (الدلتا) ← خدمات 8، مميزات 5
- `orthopedics` (الدلتا) ← خدمات 0، مميزات 0 — **ده متوقّع ومقصود، مش خطأ**
- عدد أقسام **المستقبل ثابت زي ما هو** ← **لو اتغيّر، وقف فورًا وبلّغ**

**وافتح بعينك:**
`http://169.58.77.61/hospitals/delta-hospital/departments/cardiology`
لازم تشوف محتوى عربي كامل، زي صفحة `cardiology` بتاعة المستقبل بالظبط.

---

# 📋 قواعد ملزمة

## ⛔ ممنوعات
1. **متكتبش وصف ولا مميزات ولا خدمات لـ `orthopedics`** — لا هنا ولا في المستقبل. لسه مفيش مصدر.
2. **متلمسش قسم `orthopedics` الموجود في المستقبل ولا أي قسم تاني في أي مستشفى.**
3. **متغيّرش أي نص في `NEW_DEPTS`.**
4. **لو السكربت قال إن الأقسام موجودة بالفعل** (يعني حد نفّذ المهمة دي قبلك) — **قف، متبعتش تاني.**

## ✅ إلزاميات
1. عدد أقسام المستقبل لازم يفضل **ثابت بالضبط** بعد التنفيذ.
2. لو التوكن رجع 401 → اطلب واحد جديد.
3. افتح صفحة `cardiology` بتاعة الدلتا بعينك بعد التنفيذ.

## 📊 التقرير المطلوب
```
المهمة (إضافة قسمين للدلتا): ✅/❌
  نتيجة التحقّق: [الصق]
عدد أقسام المستقبل فضل ثابت؟: ✅/❌

مشاكل واجهتني: [اكتبها، متخفيش حاجة]
```

---

# ℹ️ ملاحظة: مفيش commit ولا push

المهمة دي **بيانات بس** — بتتكتب مباشرة في قاعدة البيانات عن طريق الـ API. **مش
محتاجة أي `git commit` ولا `git push` ولا `deploy`.**
