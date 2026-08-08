# أمر شغل — استكمال محتوى الأقسام (3 مهام)

> **للمنفّذ:** كل المحتوى العربي مكتوب جاهز في الملف ده. **مطلوب منك تنسخ وتلصق وتنفّذ — مش مطلوب منك تكتب أي محتوى ولا تترجم ولا تجتهد.**
>
> **ممنوع تغيّر أي نص عربي موجود هنا. ممنوع تضيف معلومات من عندك.**

---

## ⚠️ الخطوة صفر — إجبارية قبل أي حاجة

الباب الخلفي **مقفول**، فمحتاج توكن. اطلب من صاحب المشروع يعمل الآتي:

1. يفتح `http://169.58.77.61/admin` ويسجّل دخول بنفسه
2. يضغط **F12** ← تبويب **Console**
3. يلصق السطر ده ويضغط Enter:
```javascript
(await (await fetch('/api/v1/auth/refresh',{method:'POST',credentials:'include'})).json()).data.accessToken
```
4. ينسخ النص الطويل اللي هيطلع (بيبدأ بـ `eyJ...`) ويديهولك

**لو مجبتش التوكن — قف. متكملش.**

بعد ما تاخده، افتح `http://169.58.77.61` في المتصفح، ونفّذ في Console:
```javascript
window.TOKEN = 'الصق_التوكن_هنا';
window.H = { 'Authorization': `Bearer ${window.TOKEN}`, 'Content-Type': 'application/json' };
console.log('جاهز');
```

> ⏱️ **التوكن صلاحيته 15 دقيقة.** لو خلص، اطلب واحد جديد وكرّر السطر ده.

---

# 🚦 المهمة 1 — سلايدشو صور مستشفى الدلتا

**المشكلة:** مستشفى المستقبل عنده 5 صور في السلايدشو، ومستشفى الدلتا **صفر**.

## الخطوة 1: اعرف صور المستقبل عاملة إزاي (عشان تقلّدها)
```javascript
const hs = (await (await fetch('/api/v1/admin/hospitals?pageSize=50',{headers:H})).json()).data;
const future = hs.find(h => h.slug === 'future-hospital');
const delta  = hs.find(h => h.slug === 'delta-hospital');
const fullF = (await (await fetch(`/api/v1/admin/hospitals/${future.id}`,{headers:H})).json()).data;
console.log('صور المستقبل:', fullF.heroImages);
console.log('DELTA_ID =', delta.id);
```
**انسخ قيمة `DELTA_ID` — هتحتاجها.**

## الخطوة 2: هات صور متاحة على السيرفر
```javascript
const cs = (await (await fetch('/api/v1/admin/medical-centers?pageSize=60',{headers:H})).json()).data;
const pics = cs.map(c => c.heroImage).filter(Boolean);
console.log('صور متاحة:', pics.length);
console.log(JSON.stringify(pics.slice(0, 10), null, 1));
```

## الخطوة 3: حط 5 صور للدلتا
```javascript
const DELTA_ID = 'الصق_الـ_id_هنا';

// اختار 5 روابط مختلفة من اللي طلعت في الخطوة 2
const IMAGES = [
  '/uploads/xxx1.jpeg',
  '/uploads/xxx2.jpeg',
  '/uploads/xxx3.jpeg',
  '/uploads/xxx4.jpeg',
  '/uploads/xxx5.jpeg',
];

const r = await fetch(`/api/v1/admin/hospitals/${DELTA_ID}`, {
  method: 'PATCH', headers: H,
  body: JSON.stringify({ heroImages: IMAGES })
});
console.log('HTTP', r.status, r.status === 200 ? '✅' : '❌ ' + await r.text());
```

> 🔴 **تحذير:** `heroImages` **مصفوفة كاملة**. لازم تبعت الخمسة مع بعض. لو بعت واحدة، الباقي بيتمسح.

## ✅ التحقّق — الصق النتيجة
```javascript
const chk = (await (await fetch('/api/v1/hospitals/delta-hospital')).json()).data;
console.log('heroImages بتاعة الدلتا:', (chk.heroImages||[]).length);
```
**المتوقّع: 5**. لو صفر → قف وبلّغ.

---

# 🚦 المهمة 2 — أوصاف عربية للأقسام الناقصة

**المشكلة:** 3 أقسام في كل مستشفى عندهم وصف **إنجليزي بس** بلا عربي. النتيجة إن الصفحة العربية بتعرض إنجليزي.

**الأقسام المتأثرة:** `intensive-care-unit` · `emergency-department` · `outpatient-clinics` (في المستشفيين الاتنين)

## المحتوى العربي — جاهز، انسخه كما هو

```javascript
// ⛔ ممنوع تعديل أي نص هنا
const DEPT_CONTENT = {
  'emergency-department': {
    name: { ar: 'قسم الطوارئ', en: 'Emergency Department' },
    shortDescription: {
      ar: 'مركز استجابة سريعة يعمل على مدار الساعة، تتحرك فيه إمكانيات المستشفى كاملة من الدقيقة الأولى.',
      en: 'A 24/7 rapid response center where the hospital\'s full capabilities mobilize from the first minute.'
    },
    description: {
      ar: 'قسم الطوارئ في منظومة إنسان ليس مجرد غرفة استقبال، بل مركز استجابة سريعة متكامل يعمل على مدار الساعة طوال أيام الأسبوع. من اللحظة الأولى لوصول المريض، تتحرك إمكانيات المستشفى بالكامل — كل التخصصات، والمعامل، والأشعة، وغرف العمليات، ووحدات العناية المركزة، والحضّانات.\n\nيقدّم القسم فرزًا فوريًا للحالات وإنعاشًا عاجلًا، ويستقبل طوارئ الكبار والأطفال وطوارئ النساء والتوليد، ويتعامل مع حالات الحوادث والإصابات. وتتوفر خدمات التشخيص من معامل وأشعة على مدار الساعة، مع إمكانية النقل المباشر إلى العناية المركزة للكبار والأطفال أو إلى غرف العمليات المجهزة بالكامل.\n\nفلسفتنا أن أساس الخدمة الطبية هو احترام الإنسان. نحن لا نعالج بالتخمين، بل نُشخّص بدقة أولًا. ونحترم قلق الأسرة والمرافقين بشرح كل خطوة، ونتعامل مع الجوانب المالية بشفافية ووضوح دون وعود غير واقعية.',
      en: 'The Emergency Department at INSAN is not a reception area but a fully integrated Rapid Response Center operating 24/7. From the patient\'s first minute, the entire hospital\'s capabilities mobilize — every specialty, the laboratories, imaging, operating rooms, intensive care units and incubators.\n\nThe department provides immediate triage and resuscitation, adult and paediatric emergency care, obstetric and gynaecological emergencies, and trauma and accident management. Round-the-clock laboratory and radiology diagnostics are available, with direct access to adult and paediatric intensive care and fully equipped operating rooms.\n\nOur philosophy is that respect for the human being is the foundation of medical service. We do not treat by guessing; we diagnose accurately first. We respect the anxious family by explaining every step, and we handle financial matters with clarity and transparency, without false promises.'
    },
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
    name: { ar: 'وحدة العناية المركزة', en: 'Intensive Care Unit' },
    shortDescription: {
      ar: 'منظومة رعاية حرجة منظّمة تقدّم رعاية متصلة ومنسّقة متعددة التخصصات للحالات الحرجة.',
      en: 'An organized critical care system providing continuous, coordinated multidisciplinary care.'
    },
    description: {
      ar: 'وحدة العناية المركزة في منظومة إنسان ليست مجرد قسم به أسرّة، بل منظومة رعاية حرجة متكاملة صُمّمت لتقديم رعاية متصلة ومنسّقة ومتعددة التخصصات للمرضى في الحالات الحرجة.\n\nتُقدَّم الرعاية عبر فريق منسّق يضم أطباء العناية المركزة والتمريض والأخصائيين والصيادلة وأخصائيي العلاج التنفسي وفريق الدعم. لا يملك فرد واحد تجربة العناية المركزة — المنظومة هي التي تملكها، وهذا ما يجعل مستوى الرعاية قابلًا للتكرار ولا يعتمد على شخص بعينه.\n\nالأسرة ليست طرفًا خارجيًا أثناء رعاية العناية المركزة، بل شريك أصيل. نحرص على إبقاء الأسرة على اطلاع دائم ومشاركة وطمأنينة طوال الرحلة، لأن الصمت يصنع الخوف والتواصل يصنع الثقة. والشفافية عندنا ليست اختيارية، بل جزء من المنظومة نفسها.\n\nتعمل الوحدة داخل منظومة إنسان للرعاية الصحية عبر مستشفى الدلتا الدولي ومستشفى المستقبل التخصصي، تحت معيار موحّد للتطوير والحوكمة والتحسين التشغيلي.',
      en: 'The Intensive Care Unit at INSAN is not merely a department with beds but an organized critical care system designed to provide continuous, coordinated and multidisciplinary care for critically ill patients.\n\nCare is delivered by a coordinated team of intensivists, nurses, specialists, pharmacists, respiratory therapists and support staff. No single individual owns the ICU experience — the system owns it, which is what makes the standard repeatable rather than dependent on any one person.\n\nFamilies are not outsiders during ICU care; they are partners. We keep families informed, included and reassured throughout the journey, because silence creates fear and communication creates trust. Transparency here is not optional — it is part of the system itself.\n\nThe unit operates within the INSAN Healthcare Ecosystem across Delta International Hospital and Future Specialized Hospital, under one standard of development, governance and operational improvement.'
    },
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
    name: { ar: 'العيادات الخارجية', en: 'Outpatient Clinics' },
    shortDescription: {
      ar: 'البوابة الأساسية للرعاية الطبية المجدولة، بتشخيص دقيق واحترام كامل وشفافية مالية ودون انتظار.',
      en: 'The primary gateway for scheduled care — accurate diagnosis, respect, financial transparency and no waiting.'
    },
    description: {
      ar: 'العيادات الخارجية في منظومة إنسان هي البوابة الأساسية للرعاية الطبية المجدولة وغير الطارئة. وهي أكثر من قسم تقليدي في مستشفى — إذ تعمل كمنصّة متكاملة للتشخيص والاستشارات تستضيف عددًا من البرامج المتخصصة.\n\nتغطي العيادات معظم التخصصات الطبية، ومنها العظام والجراحة العامة والمخ والأعصاب والمسالك البولية والنساء والتوليد. ويصاحب الاستشارات خدمات تشخيصية أساسية تشمل الأشعة السينية والموجات فوق الصوتية وإيكو القلب والتحاليل المعملية.\n\nكما تعمل المنصّة كمحرّك تشغيلي لثلاثة برامج متميزة: برنامج كبارنا لرعاية كبار السن وهو الأول من نوعه في الغربية باقتصادية عالية، والعيادات التخصصية المجمّعة شهريًا حسب توافر الاستشاريين، وزيارات الخبراء التي تستضيف كبار الأساتذة والاستشاريين من الجامعات المصرية والأجنبية.\n\nتجربتنا في العيادات مبنية على تشخيص دقيق، ومعاملة تحترم المريض، وشفافية مالية كاملة — ودون أوقات الانتظار المعتادة في المستشفيات.',
      en: 'The Outpatient Clinics at INSAN are the primary gateway for scheduled, non-emergency medical care. More than a traditional hospital department, they operate as an integrated diagnostic and consultation platform hosting several specialized programmes.\n\nThe clinics cover almost all medical specialties, including orthopaedics, general surgery, neurology, urology and obstetrics and gynaecology. Consultations are supported by essential diagnostics including X-ray, ultrasound, echocardiography and laboratory testing.\n\nThe platform also serves as the operational engine for three distinct programmes: the Kabarona Programme for elderly care — the first of its kind in Gharbia and highly economical; sub-specialty clinics grouped monthly according to consultant availability; and Expert Visits hosting leading professors and consultants from Egyptian and international universities.\n\nOur clinic experience is built on accurate diagnosis, respectful treatment and complete financial transparency — without the usual hospital waiting times.'
    },
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
console.log('المحتوى جاهز:', Object.keys(DEPT_CONTENT));
```

## سكربت التنفيذ — انسخه كما هو

> 🔴 **الأهم في الملف كله:** حقل `departments` **مصفوفة كاملة**. السكربت ده بيقرا الأقسام الموجودة، بيعدّل اللي محتاج تعديل بس، وبيبعت **الكل** تاني. **متغيّرش الطريقة دي.**

```javascript
for (const slug of ['delta-hospital', 'future-hospital']) {
  const hs = (await (await fetch('/api/v1/admin/hospitals?pageSize=50',{headers:H})).json()).data;
  const h = hs.find(x => x.slug === slug);
  const full = (await (await fetch(`/api/v1/admin/hospitals/${h.id}`,{headers:H})).json()).data;

  const before = full.departments.length;
  console.log(`\n=== ${slug} — عدد الأقسام قبل: ${before} ===`);

  const updated = full.departments.map(d => {
    const c = DEPT_CONTENT[d.slug];
    if (!c) return d;                       // قسم مش في القائمة — سيبه زي ما هو
    return { ...d, ...c };                  // دمج المحتوى الجديد
  });

  if (updated.length !== before) {
    console.log('❌ خطر: العدد اتغير! وقف.');
    break;
  }

  const r = await fetch(`/api/v1/admin/hospitals/${h.id}`, {
    method:'PATCH', headers:H, body: JSON.stringify({ departments: updated })
  });
  console.log(r.status === 200 ? '✅ اتحفظ' : '❌ HTTP ' + r.status + ' ' + await r.text());
}
```

## ✅ التحقّق — الصق النتيجة
```javascript
for (const slug of ['delta-hospital','future-hospital']) {
  const d = (await (await fetch(`/api/v1/hospitals/${slug}`)).json()).data;
  console.log('---', slug, '— عدد الأقسام:', (d.departments||[]).length);
  (d.departments||[]).forEach(x => {
    const ar = (x.description?.ar||'').trim();
    const ok = ar && !/^[A-Za-z"']/.test(ar);
    console.log('   ', x.slug, ok ? '✅ عربي' : (ar ? '❌ إنجليزي' : '⚠️ فاضي'),
                '| خدمات:', (x.services||[]).length, '| مميزات:', (x.features||[]).length);
  });
}
```

**المتوقّع:**
- عدد الأقسام: الدلتا **5** · المستقبل **6** ← **لو قلّ، إنت مسحت أقسام. قف فورًا وبلّغ.**
- الأقسام التلاتة (`emergency-department`, `intensive-care-unit`, `outpatient-clinics`) → **✅ عربي** وخدمات > 0

**وافتح الصفحة دي بعينك:**
`http://169.58.77.61/hospitals/delta-hospital/departments/emergency-department`
لازم تشوف نص **عربي**، مش `"Emergency is where a person arrives..."`

---

# 🚦 المهمة 3 — صور الأقسام

**المشكلة:** أقسام كتير بلا صورة، وكلها بلا معرض صور.

## الخطوة 1: هات الصور المتاحة
```javascript
const cs = (await (await fetch('/api/v1/admin/medical-centers?pageSize=60',{headers:H})).json()).data;
console.log(JSON.stringify(cs.map(c => ({slug:c.slug, img:c.heroImage})), null, 1));
```

## الخطوة 2: اربط صورة لكل قسم
اختار من القائمة اللي طلعت صورة **مناسبة للموضوع** (مثلًا: صورة من مركز له علاقة بالقسم).

```javascript
const DEPT_IMAGES = {
  'emergency-department': '/uploads/xxx.jpeg',
  'intensive-care-unit':  '/uploads/xxx.jpeg',
  'outpatient-clinics':   '/uploads/xxx.jpeg',
};

for (const slug of ['delta-hospital','future-hospital']) {
  const hs = (await (await fetch('/api/v1/admin/hospitals?pageSize=50',{headers:H})).json()).data;
  const h = hs.find(x => x.slug === slug);
  const full = (await (await fetch(`/api/v1/admin/hospitals/${h.id}`,{headers:H})).json()).data;
  const before = full.departments.length;

  const updated = full.departments.map(d =>
    DEPT_IMAGES[d.slug] && !d.image ? { ...d, image: DEPT_IMAGES[d.slug] } : d
  );

  if (updated.length !== before) { console.log('❌ العدد اتغير! وقف.'); break; }

  const r = await fetch(`/api/v1/admin/hospitals/${h.id}`, {
    method:'PATCH', headers:H, body: JSON.stringify({ departments: updated })
  });
  console.log(slug, r.status === 200 ? '✅' : '❌ ' + r.status);
}
```

## ✅ التحقّق — الصق النتيجة
```javascript
for (const slug of ['delta-hospital','future-hospital']) {
  const d = (await (await fetch(`/api/v1/hospitals/${slug}`)).json()).data;
  const ds = d.departments||[];
  console.log(slug, '— أقسام:', ds.length, '| عندها صورة:', ds.filter(x=>x.image).length);
}
```
**المتوقّع:** عدد الأقسام **زي ما هو** (5 و 6)، و"عندها صورة" **زاد**.

---

# 📋 قواعد ملزمة

## ⛔ ممنوعات
1. **متغيّرش أي نص عربي في الملف ده.** منسوخ كما هو.
2. **متخترعش أي معلومة طبية** — لا خدمة ولا جهاز ولا رقم.
3. **متبعتش قسم واحد لوحده** — دايمًا اقرا الكل، عدّل، ابعت الكل.
4. **متقولش "خلصت"** من غير ما تلصق نتيجة أمر التحقّق.

## ✅ إلزاميات
1. لو عدد الأقسام **قلّ** بعد أي عملية → **قف فورًا وبلّغ**. ده معناه إنك مسحت بيانات.
2. لو التوكن رجع 401 → خلصت صلاحيته، اطلب واحد جديد.
3. بعد كل مهمة، افتح الصفحة في المتصفح وشوفها بعينك.

## 📊 التقرير المطلوب
```
المهمة 1 (سلايدشو الدلتا): ✅/❌
  نتيجة التحقّق: [الصق]
المهمة 2 (أوصاف الأقسام): ✅/❌
  نتيجة التحقّق: [الصق]
المهمة 3 (صور الأقسام): ✅/❌
  نتيجة التحقّق: [الصق]

مشاكل واجهتني: [اكتبها، متخفيش حاجة]
```

---

# ℹ️ ملاحظة: مفيش commit ولا push

المهام التلاتة دي **بيانات بس** — بتتكتب مباشرة في قاعدة البيانات عن طريق الـ API. **مش محتاجة أي `git commit` ولا `git push` ولا `deploy`.** التغييرات بتظهر على الموقع خلال دقيقة.
