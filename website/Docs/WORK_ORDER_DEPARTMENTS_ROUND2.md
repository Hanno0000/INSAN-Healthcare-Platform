# أمر شغل — تعبئة 4 من الأقسام الفاضية (مش الخمسة)

> **للمنفّذ:** كل المحتوى العربي والإنجليزي جاهز في الملف ده، مأخوذ حرفيًا من ملفات
> المعرفة الرسمية في `business/knowledge/centers/`. **مطلوب منك تنسخ وتلصق وتنفّذ —
> مش مطلوب منك تكتب أو تترجم أو تجتهد.**
>
> **ممنوع تغيّر أي نص عربي أو إنجليزي موجود هنا. ممنوع تضيف معلومات من عندك.**

---

## ⚠️ مهم جدًا — قسم `orthopedics` غير موجود في الملف ده عمدًا

من الخمسة أقسام الفاضية، اتقفل منهم 4 بس. **قسم `orthopedics` (مستشفى المستقبل)
مُستبعد تمامًا ولازم يفضل زي ما هو.**

**السبب:** فحصت `business/knowledge/centers/` و`business/brand/ENTITY_REGISTRY.md`
بالكامل. مركز العظام (`CEN-010`) **مالوش ملف معرفة خالص** — ولا حتى سجل في جدول
المراكز الطبية على السيرفر نفسه. مفيش نص واحد معتمد أقدر أبني منه محتوى، وكتابة
حاجة من عندي هنا تكون بالظبط المخالفة اللي طلب صاحب المشروع نتجنبها.

**كمان لاحظت تعارض في البيانات يستاهل قرار من صاحب المشروع:**
- السجل (`ENTITY_REGISTRY.md` سطر 79) بيقول مركز العظام متاح في **الدلتا فقط**.
- لكن قاعدة البيانات الحية حاليًا حاطة قسم `orthopedics` تحت **مستشفى المستقبل**، مش الدلتا.
- وفي نفس الوقت، مركز القلب (`CEN-001`) مسجّل في السجل إنه متاح في **الاتنين**، لكن
  مستشفى الدلتا **مالوش قسم "قلب" خالص** في قائمة أقسامه.

**ما تحاولش تصلح التعارض ده بنفسك ولا تحذف ولا تنقل القسم. بلّغ بيه بس، والقرار لصاحب المشروع.**

---

## ⚠️ الخطوة صفر — إجبارية قبل أي حاجة

الباب الخلفي محتاج توكن صالح. لو مالكش واحد:

1. صاحب المشروع يفتح `http://169.58.77.61/admin` ويسجّل دخول بنفسه
2. يضغط **F12** ← تبويب **Console**
3. يلصق السطر ده ويضغط Enter:
```javascript
(await (await fetch('/api/v1/auth/refresh',{method:'POST',credentials:'include'})).json()).data.accessToken
```
4. ينسخ النص الطويل اللي هيطلع (بيبدأ بـ `eyJ...`) ويديهولك

بعد ما تاخده، افتح `http://169.58.77.61` في المتصفح، ونفّذ في Console:
```javascript
window.TOKEN = 'الصق_التوكن_هنا';
window.H = { 'Authorization': `Bearer ${window.TOKEN}`, 'Content-Type': 'application/json' };
console.log('جاهز');
```

> ⏱️ **التوكن صلاحيته 15 دقيقة.** لو خلص، اطلب واحد جديد وكرّر السطر ده.

---

# 🚦 المهمة — محتوى ثلاثة أقسام (وتصحيح صورتين معطوبتين)

**الأقسام:** `pediatrics` (الدلتا فقط) · `general-surgery` (الدلتا والمستقبل — نفس
المركز مسجّل متاح في الاتنين) · `cardiology` (المستقبل فقط — الدلتا مفيهاش القسم ده
أصلًا، شوف التنبيه فوق)

**مصدر كل نص:** `MEDICAL_CENTER_PEDIATRICS.md` (CEN-015) ·
`MEDICAL_CENTER_GENERAL_SURGERY.md` (CEN-004) ·
`MEDICAL_CENTER_CARDIAC_INTERNAL_MEDICINE.md` (CEN-001)

**كمان لاحظت إن صورتين حاليًا معطوبتين (404) وواحدة تانية موضوعة غلط:**
- `pediatrics` (الدلتا): `/images/dept-pediatrics.jpg` → **404، مش موجودة على السيرفر أصلًا**
- `general-surgery` (الدلتا): `/images/dept-surgery.jpg` → **404**
- `general-surgery` (المستقبل): الصورة الحالية هي **نفس صورة قسم العيادات الخارجية بالظبط** — منقولة غلط
- `cardiology` (المستقبل): الصورة حاليًا صورة غرفة عمليات عامة — شغالة (200) بس مش الصورة المخصصة لمركز القلب

السكربت تحت بيصحح الصور الثلاثة الأولى بصور حقيقية شغّالة من نفس المراكز الطبية
المطابقة (اتأكد إنها بترجّع 200 قبل ما أحطها هنا).

## المحتوى — جاهز، انسخه كما هو

```javascript
// ⛔ ممنوع تعديل أي نص هنا
const DEPT_CONTENT = {
  'pediatrics': {
    shortDescription: {
      ar: 'مركز متكامل لصحة الطفل من الولادة حتى المراهقة، بـ11 عيادة تخصصية وحضّانات مجهزة وطوارئ أطفال على مدار الساعة.',
      en: 'An integrated center for child health from birth through adolescence, with 11 specialized clinics, equipped incubators and a 24/7 pediatric emergency room.'
    },
    description: {
      ar: 'قسم الأطفال وحديثي الولادة في منظومة إنسان مركز متكامل لرعاية الطفل من الولادة وحتى المراهقة، يضم 11 عيادة فرعية متخصصة، وحضّانات مجهزة بالكامل لحديثي الولادة، وطوارئ أطفال منفصلة تعمل على مدار الساعة طوال أيام الأسبوع.\n\nنؤمن بأن كل طفل يستحق رعاية بمستوى جامعي دون أن يشكّل ذلك عبئًا ماليًا ثقيلًا على الأسرة. نعطي الأولوية للتشخيص الدقيق على الدواء غير الضروري — فلا نصف مضادات حيوية لحمى فيروسية بلا داعٍ — ونحرص على توعية الأهل وطمأنتهم في كل خطوة.\n\nيعمل القسم بنظام فرز داخلي: يبدأ الطفل بالتقييم العام لدى طبيب الأطفال، وإذا احتاج تخصصًا فرعيًا — مثل قلب الأطفال أو مخ وأعصاب الأطفال أو الغدد الصماء — يُحال داخل نفس المركز، غالبًا في نفس اليوم، دون أن يضطر الأهل للبحث عن الطبيب المناسب بأنفسهم.',
      en: 'The Pediatrics & Neonatology Department at INSAN is an integrated center for child health from birth through adolescence, featuring 11 specialized sub-clinics, fully equipped neonatal incubators, and a separate pediatric emergency room operating 24 hours a day, seven days a week.\n\nWe believe every child deserves university-level care without placing a heavy financial burden on the family. We prioritise accurate diagnosis over unnecessary medication — we do not prescribe antibiotics for a viral fever without cause — and we make sure parents are informed and reassured at every step.\n\nThe department runs on an internal triage system: a child begins with a general assessment by a pediatrician, and if a sub-specialty is needed — such as pediatric cardiology, neurology, or endocrinology — they are referred within the same center, often on the same day, so parents never have to search for the right specialist themselves.'
    },
    image: '/uploads/1786119067839-698593065.jpeg',
    features: [
      { ar: '11 عيادة فرعية متخصصة تحت سقف واحد', en: '11 specialized sub-clinics under one roof' },
      { ar: 'حضّانات مجهزة بالكامل لحديثي الولادة', en: 'Fully equipped incubators for newborns' },
      { ar: 'طوارئ أطفال منفصلة على مدار الساعة', en: 'A dedicated 24/7 pediatric emergency room' },
      { ar: 'فرز داخلي يحيل الطفل للتخصص الفرعي المناسب غالبًا في نفس اليوم', en: 'Internal triage referring the child to the right sub-specialty, often same-day' },
      { ar: 'أولوية للتشخيص الدقيق على الدواء غير الضروري', en: 'Priority given to accurate diagnosis over unnecessary medication' }
    ],
    services: [
      { ar: 'طب الأطفال العام', en: 'General pediatrics' },
      { ar: 'رعاية حديثي الولادة ومتابعة الحضّانة', en: 'Neonatology and incubator follow-up' },
      { ar: 'الصدر والحساسية عند الأطفال', en: 'Pediatric pulmonology and allergy' },
      { ar: 'الجهاز الهضمي والتغذية', en: 'Gastroenterology and nutrition' },
      { ar: 'الغدد الصماء وسكري الأطفال', en: 'Pediatric endocrinology and diabetes' },
      { ar: 'مخ وأعصاب الأطفال', en: 'Pediatric neurology' },
      { ar: 'قلب الأطفال', en: 'Pediatric cardiology' },
      { ar: 'متابعة النمو والتطعيمات', en: 'Growth, development and vaccination' }
    ]
  },

  'general-surgery': {
    shortDescription: {
      ar: 'مركز جراحي متكامل يعمل بمبدأ التشخيص أولًا: التقييم الدقيق يسبق أي قرار بالجراحة، والتقنية تُختار لتناسب الحالة لا العكس.',
      en: 'An integrated surgical center built on diagnosis-first care: accurate evaluation comes before any decision to operate, and technique is chosen to fit the patient.'
    },
    description: {
      ar: 'قسم الجراحة العامة في منظومة إنسان برنامج متكامل لتشخيص وعلاج كل حالة قد تستدعي تدخلًا جراحيًا. لا يعمل القسم كمكان "لإجراء عمليات"، بل يعمل بمبدأ التشخيص أولًا: المريض لا يصل وقد اتُّخذ قرار الجراحة بالفعل، بل يصل بمشكلة، ومهمة القسم الأولى هي الوصول للإجابة الصحيحة عنها — وأحيانًا تكون الإجابة دواءً، وأحيانًا منظارًا، وأحيانًا عملية مفتوحة، وأحيانًا لا شيء على الإطلاق.\n\nيغطي القسم الجراحة العامة وعيادات التخصصات الفرعية التابعة لها، والجراحات الصغرى، وجراحة الأورام العامة، واستقبال طوارئ جراحية على مدار 24 ساعة في المستشفيين.\n\nنستخدم الجراحة بالمنظار والجراحة المفتوحة والليزر، كل تقنية في موضعها الطبي الصحيح — لا نفرض تقنية معينة لأنها الأكثر رواجًا تسويقيًا. القرار الجراحي يُتخذ بالمشاركة مع المريض بعد فهم كامل للخيارات المتاحة، ويتبعه متابعة يومية من الطبيب حتى الخروج، ثم متابعة هاتفية بعد ذلك.',
      en: 'The General Surgery Department at INSAN is an integrated program for diagnosing and treating any condition that may require surgical intervention. It does not operate as a place to "perform operations" — it runs on a diagnosis-first principle: a patient does not arrive having already decided on surgery; they arrive with a problem, and the department\'s first task is finding the correct answer to it — sometimes medication, sometimes a scope, sometimes an open operation, and sometimes nothing at all.\n\nThe department covers general surgery and its subspecialty clinics, minor surgical procedures, general surgical oncology, and 24-hour surgical emergency intake at both hospitals.\n\nWe use laparoscopic, open and laser techniques, each in its correct medical place — we do not push a particular technique because it markets well. The surgical decision is made together with the patient after a full understanding of the available options, followed by daily visits from the doctor through discharge, then a phone follow-up afterward.'
    },
    image: '/uploads/1786119064621-213726187.jpeg',
    features: [
      { ar: 'تشخيص أولًا — قرار الجراحة لا يُتخذ إلا بعد تقييم كامل', en: 'Diagnosis first — surgery is never decided before a full evaluation' },
      { ar: 'تقنيات المنظار والجراحة المفتوحة والليزر، كل واحدة في موضعها الصحيح', en: 'Laparoscopic, open and laser techniques, each used where medically appropriate' },
      { ar: 'استقبال طوارئ جراحية على مدار الساعة في المستشفيين', en: '24-hour surgical emergency intake at both hospitals' },
      { ar: 'استشاريون وأساتذة جامعات مصرية حاصلون على الدكتوراه', en: 'Consultants and professors from Egyptian universities, all PhD holders' },
      { ar: 'متابعة يومية أثناء التعافي ومكالمة متابعة بعد الخروج', en: 'Daily follow-up during recovery and a post-discharge phone call' }
    ],
    services: [
      { ar: 'عيادة الجراحة العامة', en: 'General surgery clinic' },
      { ar: 'عيادة جراحة الجهاز الهضمي', en: 'Gastrointestinal surgery clinic' },
      { ar: 'عيادة جراحة الثدي', en: 'Breast surgery clinic' },
      { ar: 'عيادة جراحة الغدة الدرقية', en: 'Thyroid surgery clinic' },
      { ar: 'جراحات المرارة بالمنظار', en: 'Laparoscopic gallbladder surgery' },
      { ar: 'جراحات الفتق بجميع أنواعها', en: 'All types of hernia surgery' },
      { ar: 'جراحة الزائدة الدودية', en: 'Appendectomy' },
      { ar: 'جراحة الأورام ضمن نطاق الجراحة العامة', en: 'General surgical oncology' }
    ]
  },

  'cardiology': {
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
  }
};
console.log('المحتوى جاهز:', Object.keys(DEPT_CONTENT));
```

## سكربت التنفيذ — انسخه كما هو

> 🔴 **الأهم في الملف كله:** حقل `departments` **مصفوفة كاملة**. السكربت ده بيقرا
> الأقسام الموجودة، بيعدّل اللي في `DEPT_CONTENT` بس (وده تلقائيًا بيسيب `orthopedics`
> زي ما هو لأنه مش موجود في القائمة)، وبيبعت **الكل** تاني.

```javascript
for (const slug of ['delta-hospital', 'future-hospital']) {
  const hs = (await (await fetch('/api/v1/admin/hospitals?pageSize=50',{headers:H})).json()).data;
  const h = hs.find(x => x.slug === slug);
  const full = (await (await fetch(`/api/v1/admin/hospitals/${h.id}`,{headers:H})).json()).data;

  const before = full.departments.length;
  console.log(`\n=== ${slug} — عدد الأقسام قبل: ${before} ===`);

  const updated = full.departments.map(d => {
    const c = DEPT_CONTENT[d.slug];
    if (!c) return d;                       // قسم مش في القائمة (منها orthopedics) — سيبه زي ما هو
    return { ...d, ...c };                  // دمج المحتوى الجديد فوق الاسم/الصورة القديمة
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
    const ok = ar && !/^[A-Za-z"']/.test(ar) && ar.length > 30;
    console.log('   ', x.slug, ok ? '✅' : (ar ? '⚠️ قصير/إنجليزي' : '⚠️ فاضي'),
                '| خدمات:', (x.services||[]).length, '| مميزات:', (x.features||[]).length);
  });
}
```

**المتوقّع:**
- عدد الأقسام: الدلتا **5** · المستقبل **6** ← **لو قلّ، إنت مسحت أقسام. قف فورًا وبلّغ.**
- `pediatrics` (الدلتا) ✅، `general-surgery` (الاتنين) ✅، `cardiology` (المستقبل) ✅ — خدمات ≥ 8، مميزات = 5
- `orthopedics` (المستقبل) يفضل **بالضبط زي ما كان** — لو اتغيّر حرف واحد فيه، وقف وبلّغ فورًا

**وافتح الصفحتين دول بعينك وتأكد إن الصور بتفتح وموضوعها مناسب:**
- `http://169.58.77.61/hospitals/delta-hospital/departments/pediatrics`
- `http://169.58.77.61/hospitals/future-hospital/departments/general-surgery`

---

# 📋 قواعد ملزمة

## ⛔ ممنوعات
1. **متلمسش `orthopedics` خالص** — لا محتوى ولا صورة ولا نقله بين المستشفيين.
2. **متغيّرش أي نص عربي أو إنجليزي في الملف ده.** منسوخ كما هو من ملفات المعرفة الرسمية.
3. **متخترعش أي معلومة طبية** — لا خدمة ولا جهاز ولا رقم.
4. **متبعتش قسم واحد لوحده** — دايمًا اقرا الكل، عدّل، ابعت الكل.
5. **متقولش "خلصت"** من غير ما تلصق نتيجة أمر التحقّق.

## ✅ إلزاميات
1. لو عدد الأقسام **قلّ** بعد أي عملية → **قف فورًا وبلّغ**.
2. لو التوكن رجع 401 → خلصت صلاحيته، اطلب واحد جديد.
3. بعد التنفيذ، افتح الصفحتين المذكورتين فوق بعينك.

## 📊 التقرير المطلوب
```
المهمة (3 أقسام + تصحيح صورتين): ✅/❌
  نتيجة التحقّق: [الصق]
orthopedics فضل من غير تغيير؟: ✅/❌

مشاكل واجهتني: [اكتبها، متخفيش حاجة]
```

---

# ℹ️ ملاحظة: مفيش commit ولا push

المهمة دي **بيانات بس** — بتتكتب مباشرة في قاعدة البيانات عن طريق الـ API. **مش
محتاجة أي `git commit` ولا `git push` ولا `deploy`.** التغييرات بتظهر على الموقع خلال دقيقة.
