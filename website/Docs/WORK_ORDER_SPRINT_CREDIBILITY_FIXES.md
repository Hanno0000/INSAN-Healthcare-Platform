# أمر شغل — سبرينت واحد: مصداقية الموقع + تعبئة 6 مراكز

> **للمنفّذ:** الملف ده فيه **6 مهام منفصلة**. نفّذهم بالترتيب المكتوب. كل
> النصوص جاهزة — **انسخ والصق. ممنوع تكتب أو تترجم أو تخترع أي حاجة.**
>
> هذا سبرينت واحد متكامل — لا تقسّمه على جلسات، ولا تتوقف بين مهمة والتانية
> إلا لو فشلت مهمة واحتجت تبلّغ.

---

## ⚠️ الخطوة صفر — إجبارية قبل أي حاجة

```javascript
(await (await fetch('/api/v1/auth/refresh',{method:'POST',credentials:'include'})).json()).data.accessToken
```
```javascript
window.TOKEN = 'الصق_التوكن_هنا';
window.H = { 'Authorization': `Bearer ${window.TOKEN}`, 'Content-Type': 'application/json' };
```
> ⏱️ صلاحيته 15 دقيقة. لو خلص أثناء الشغل، اطلب واحد جديد وكرّر.

---

# المهمة 1 — تصحيح بيانات التواصل

**المشكلة:** الإعدادات الحالية فيها إيميل شركة تانية تمامًا (`info@lavenir-medical.com`)
وعنوان غلط (القاهرة بدل الغربية) وأرقام هاتف مش موجودة في دليل التواصل المعتمد.
المصدر: `business/brand/CONTACT_DIRECTORY.md`، معتمد من صاحب المشروع بتاريخ 2026-08-05.

```javascript
const SETTINGS_FIX = {
  contact_email: 'info@insan-platform.com',
  contact_phone: '01500668657',
  whatsapp_number: '01500668657',
  contact_address: { ar: 'الغربية، مصر', en: 'Gharbia, Egypt' },
};

for (const [key, value] of Object.entries(SETTINGS_FIX)) {
  const r = await fetch(`/api/v1/admin/settings/${key}`, {
    method: 'PATCH', headers: H, body: JSON.stringify({ value })
  });
  console.log(key, r.status === 200 ? '✅' : '❌ ' + r.status + ' ' + await r.text());
}
```

**⚠️ ملحوظة مهمة — سؤال مفتوح لصاحب المشروع مش لك تحسمه:**
دليل التواصل نفسه فيه ملاحظة صريحة إن رقم `01500668657` مستخدم لمنصة إنسان
**ولمستشفى الدلتا مع بعض** وده يحتاج تأكيد. وفيه أرقام تليفون أرضي (طنطا) في
`receptionist/data/hospitals.json` **لم يعتمدها صاحب المشروع للنشر العام بعد**.
**متضفهاش للموقع.** استخدم بس الرقمين المعتمدين فوق.

**✅ التحقّق:**
```javascript
const s = (await (await fetch('/api/v1/settings')).json()).data;
console.log('email:', s.contact_email, '| phone:', s.contact_phone, '| whatsapp:', s.whatsapp_number);
```
**المتوقّع:** `info@insan-platform.com` و`01500668657` في الحقول التلاتة.

---

# المهمة 2 — حذف كيان شبح مكرّر

**المشكلة:** `ENTITY_REGISTRY.md` بيقول صراحة إن `MED-007` (نفس الكيان اللي
اندمج في `CEN-004`) **خطأ واتحذف رسميًا**. لكنه لسه منشور وشغّال على الموقع
بصيغة تانية، فمركز الجراحة العامة ظاهر **مرتين**.

```javascript
const cs = (await (await fetch('/api/v1/admin/medical-centers?pageSize=60',{headers:H})).json()).data;
const phantom = cs.find(c => c.slug === 'general-surgery-specialized-surgical-clinics');

if (!phantom) {
  console.log('⚠️ مش لاقي الكيان — يمكن اتشال بالفعل. وقف هنا.');
} else {
  console.log('لاقيته:', phantom.id, phantom.name?.ar);
  const r = await fetch(`/api/v1/admin/medical-centers/${phantom.id}`, {
    method: 'PATCH', headers: H, body: JSON.stringify({ status: 'DRAFT' })
  });
  console.log(r.status === 200 ? '✅ اتحوّل لمسودة (اتشال من العرض العام)' : '❌ ' + r.status + ' ' + await r.text());
}
```

> ℹ️ حوّلته لمسودة (`DRAFT`) مش حذف نهائي — عشان لو غلطت في التحديد يبقى
> رجّاعه سهل. الحذف النهائي قرار لاحق بعد ما نتأكد بصريًا إن مفيش حاجة
> مرتبطة بيه (أطباء، أخبار، إلخ).

**✅ التحقّق:**
```javascript
const code = (await fetch('http://169.58.77.61/medical-centers/general-surgery-specialized-surgical-clinics')).status;
console.log('صفحة الكيان الشبح الآن:', code, code === 404 ? '✅ اختفت' : '❌ لسه ظاهرة');
```

---

# المهمة 3 — إخفاء بيانات تجريبية تُعرَض كأنها حقيقية

**المشكلة:** طبيبان بلا صور وبسِيَر عامة، ورأي مريض واحد منسوب لأحدهما،
وخبر مخترع عن افتتاح فرع بالعاصمة الإدارية (والمستشفيات فعليًا في الغربية).
دول بيانات اختبار معروضة للجمهور كأنها حقيقية — مخاطرة مصداقية على موقع طبي.

```javascript
// 3أ — إخفاء الطبيبين التجريبيين
for (const slug of ['dr-sara', 'dr-ahmed']) {
  const ds = (await (await fetch('/api/v1/admin/doctors?pageSize=100',{headers:H})).json()).data;
  const d = ds.find(x => x.slug === slug);
  if (!d) { console.log(slug, '⚠️ مش موجود'); continue; }
  const r = await fetch(`/api/v1/admin/doctors/${d.id}/unpublish`, { method: 'POST', headers: H });
  console.log('طبيب', slug, r.status === 200 ? '✅ اتخفى' : '❌ ' + r.status);
}

// 3ب — إخفاء رأي المريض الوهمي (منسوب لطبيب تجريبي)
const ts = (await (await fetch('/api/v1/admin/testimonials?pageSize=50',{headers:H})).json()).data;
for (const t of ts) {
  if (t.name?.ar === 'د. أحمد محمد') {
    const r = await fetch(`/api/v1/admin/testimonials/${t.id}/unpublish`, { method: 'POST', headers: H });
    console.log('رأي', t.id, r.status === 200 ? '✅ اتخفى' : '❌ ' + r.status);
  }
}

// 3ج — إخفاء الخبر المخترع (المستشفيات في الغربية مش العاصمة الإدارية)
const ns = (await (await fetch('/api/v1/admin/news?pageSize=50',{headers:H})).json()).data;
const fakeNews = ns.find(n => n.slug === 'opening-new-branch');
if (fakeNews) {
  const r = await fetch(`/api/v1/admin/news/${fakeNews.id}`, { method: 'PATCH', headers: H, body: JSON.stringify({ status: 'DRAFT' }) });
  console.log('خبر الفرع الجديد', r.status === 200 ? '✅ اتخفى' : '❌ ' + r.status + ' ' + await r.text());
} else {
  console.log('⚠️ الخبر مش لاقيه بالـ slug ده — تأكد بنفسك');
}
```

**✅ التحقّق:**
```javascript
console.log('أطباء ظاهرين الآن:', (await (await fetch('/api/v1/doctors')).json()).data.length, '(المتوقع: 0)');
console.log('آراء ظاهرة الآن:', (await (await fetch('/api/v1/testimonials')).json()).data.length, '(المتوقع: 0)');
console.log('أخبار ظاهرة الآن:', (await (await fetch('/api/v1/news')).json()).data.length, '(المتوقع: 1 — خبر ADHD بس)');
```

**⚠️ ملحوظة:** بعد المهمة دي هيبقى عندنا **صفر أطباء وصفر آراء عملاء** ظاهرين
على الموقع. ده متوقّع ومقصود — أفضل من عرض بيانات وهمية. لازم يتحطوا أطباء
وآراء حقيقية لاحقًا (قرار صاحب المشروع، مش جزء من المهمة دي).

**خبر ADHD** (`adhd-in-women-breaking-the-stereotypes`) **سيبه زي ما هو** —
مش مخترع، بس محتاج قرار من صاحب المشروع هل يناسب نطاق مجموعة جراحية/رعاية
حرجة ولا لأ. مش جزء من المهمة دي.

---

# المهمة 4 — تعبئة 6 مراكز طبية بمحتوى حقيقي

**المشكلة:** 6 من 8 مراكز منشورة **بصفر خدمات وصفر أجهزة**، رغم إن ملفات
معرفتها كاملة وجاهزة. كل المحتوى تحت ده منسوخ حرفيًا من ملفات
`business/knowledge/centers/`.

```javascript
// ⛔ ممنوع تعديل أي نص هنا
const CENTER_CONTENT = {
  'pediatrics-neonatology-center': {
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

  'general-surgery-endoscopy-center': {
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

  'bariatric-metabolic-surgeries-center': {
    features: [
      { ar: 'استشاريون وأساتذة جامعات', en: 'University professors and consultants' },
      { ar: 'تقنيات المنظار الحديثة بأقل الشقوق الجراحية', en: 'Modern laparoscopic techniques with minimal incisions' },
      { ar: 'غرف عمليات وعناية مركزة مجهزة خصيصًا لحالات السمنة', en: 'ORs and ICUs specifically equipped for bariatric patients' },
      { ar: 'أخصائيو تغذية إكلينيكية مخصصون', en: 'Dedicated clinical nutritionists' },
      { ar: 'برنامج متابعة يمتد حتى 12 شهرًا بعد الجراحة', en: 'A follow-up programme extending up to 12 months after surgery' }
    ],
    services: [
      { ar: 'عيادة تقييم السمنة', en: 'Obesity assessment clinic' },
      { ar: 'جراحات السمنة (تكميم، تحويل مسار، تصحيحية)', en: 'Bariatric surgery (sleeve, bypass, corrective)' },
      { ar: 'عيادة السمنة والسكري', en: 'Obesity and diabetes clinic' },
      { ar: 'عيادة التغذية الإكلينيكية بعد الجراحة', en: 'Post-op clinical nutrition clinic' },
      { ar: 'عيادة متابعة ما بعد الجراحة (الوزن والتحاليل والفيتامينات)', en: 'Post-op follow-up clinic (weight, labs, vitamins)' }
    ]
  },

  'colorectal-anal-surgeries-center': {
    features: [
      { ar: 'استشاريون وأساتذة متخصصون في جراحات المستقيم', en: 'Consultants and professors specialized in colorectal surgery' },
      { ar: 'أحدث تقنيات الليزر', en: 'The latest laser technologies' },
      { ar: 'غرف عمليات مجهزة لاستئصال الأورام المتقدمة', en: 'ORs equipped for advanced tumour excision' },
      { ar: 'إمكانيات المنظار الداخلي للقولون داخل المركز', en: 'In-house colonoscopy capabilities' },
      { ar: 'خصوصية تامة واحترام كامل لكرامة المريض', en: 'Complete privacy and full respect for patient dignity' }
    ],
    services: [
      { ar: 'عيادة البواسير', en: 'Hemorrhoids clinic' },
      { ar: 'عيادة الشرخ الشرجي', en: 'Anal fissure clinic' },
      { ar: 'عيادة الناسور الشرجي', en: 'Anal fistula clinic' },
      { ar: 'عيادة الكيس العصعصي', en: 'Pilonidal cyst clinic' },
      { ar: 'عيادة أمراض القولون والمستقيم', en: 'Colorectal disease clinic' },
      { ar: 'عيادة أورام القولون والمستقيم', en: 'Colorectal tumours clinic' },
      { ar: 'عيادة الإمساك المزمن وسلس البراز', en: 'Chronic constipation and incontinence clinic' },
      { ar: 'متابعة ما بعد الجراحة', en: 'Post-op follow-up' }
    ]
  },

  'ent-head-and-neck-surgery-center': {
    features: [
      { ar: 'استشاريون وأساتذة جامعيون حاصلون على الدكتوراه', en: 'University professors and PhD-holding consultants' },
      { ar: 'تقنيات تنظير متقدمة للتشخيص الدقيق', en: 'Advanced endoscopic technology for precise diagnosis' },
      { ar: 'غرف عمليات مجهزة لجراحات الأذن الدقيقة والمناظير', en: 'ORs equipped for delicate ear microsurgery and endoscopic surgery' },
      { ar: 'طب أنف وأذن وحنجرة للأطفال بنهج آمن ومناسب لأعمارهم', en: 'Pediatric ENT with a safe, age-appropriate approach' },
      { ar: 'علاج تحفظي أولًا — الجراحة ليست الخيار الافتراضي', en: 'Conservative treatment first — surgery is not the default option' }
    ],
    services: [
      { ar: 'عيادات الأنف', en: 'Nose clinics' },
      { ar: 'عيادات الأذن', en: 'Ear clinics' },
      { ar: 'عيادات الحنجرة والأحبال الصوتية', en: 'Larynx and vocal cords clinics' },
      { ar: 'عيادات الجيوب الأنفية', en: 'Sinus clinics' },
      { ar: 'عيادات حساسية الأنف', en: 'Allergic rhinitis clinics' },
      { ar: 'عيادات السمع والتوازن', en: 'Hearing and balance clinics' },
      { ar: 'عيادات أنف وأذن وحنجرة الأطفال', en: 'Pediatric ENT clinics' },
      { ar: 'عيادات جراحات الرأس والرقبة', en: 'Head and neck surgery clinics' }
    ]
  },

  'urology-andrology-surgery-center': {
    features: [
      { ar: 'إشراف كامل من أساتذة واستشاريين حاصلين على الدكتوراه', en: 'Full supervision by university professors and PhD-holding consultants' },
      { ar: 'تفتيت حصوات الكلى بالمنظار والليزر', en: 'Endoscopic and laser lithotripsy for kidney stones' },
      { ar: 'طوارئ مسالك بولية على مدار الساعة', en: '24/7 urology emergency care' },
      { ar: 'تشخيصات شاملة (معمل وأشعة) داخل المستشفى قبل الجراحة', en: 'Comprehensive on-site diagnostics (lab and imaging) before surgery' },
      { ar: 'اختيار العلاج المناسب للحالة لا الأغلى ثمنًا', en: 'Treatment chosen to fit the condition, not the most expensive option' }
    ],
    services: [
      { ar: 'عيادة حصوات الكلى والحالب', en: 'Kidney and ureteral stones clinic' },
      { ar: 'عيادة البروستاتا', en: 'Prostate clinic' },
      { ar: 'عيادة المسالك البولية (الضيق والسلس)', en: 'Urinary tract clinic (strictures and incontinence)' },
      { ar: 'عيادة أورام المسالك البولية', en: 'Urological tumours clinic' },
      { ar: 'عيادة الذكورة (الدوالي، الخصية غير النازلة، القيلة المائية)', en: 'Andrology clinic (varicocele, undescended testicle, hydrocele)' },
      { ar: 'عيادة علاج العقم عند الرجال', en: 'Male infertility clinic' },
      { ar: 'عيادة مسالك بولية للأطفال', en: 'Pediatric urology clinic' }
    ]
  }
};
console.log('جاهز للتعبئة:', Object.keys(CENTER_CONTENT).length, 'مراكز');
```

## سكربت التنفيذ — انسخه كما هو

```javascript
const cs = (await (await fetch('/api/v1/admin/medical-centers?pageSize=60',{headers:H})).json()).data;

for (const slug of Object.keys(CENTER_CONTENT)) {
  const c = cs.find(x => x.slug === slug);
  if (!c) { console.log(slug, '❌ مش لاقي المركز'); continue; }

  const r = await fetch(`/api/v1/admin/medical-centers/${c.id}`, {
    method: 'PATCH', headers: H,
    body: JSON.stringify(CENTER_CONTENT[slug])
  });
  console.log(slug, r.status === 200 ? '✅' : '❌ HTTP ' + r.status + ' ' + await r.text());
}
```

**✅ التحقّق:**
```javascript
const cs2 = (await (await fetch('/api/v1/medical-centers?pageSize=60')).json()).data;
Object.keys(CENTER_CONTENT).forEach(slug => {
  const c = cs2.find(x => x.slug === slug);
  console.log(slug.padEnd(42), '| خدمات:', (c?.services||[]).length, '| مميزات:', (c?.features||[]).length);
});
```
**المتوقّع:** كل الستة عندهم خدمات ≥ 5 ومميزات = 5. لو أي واحد صفر، وقف وبلّغ.

---

# المهمة 5 — النشر (كود بس، مش بيانات)

الكوميتات دي كود اتعملله push على `main` ومحتاجة نشر عادي بـ
`website/deploy-to-contabo.ps1`:
- إصلاح صفحة الـ Hero الرئيسية (شيل ادعاءات مختلقة، صحّح رقم المرضى)
- إضافة صفحة إدارة الأسئلة الشائعة في لوحة التحكم
- إصلاح نموذج "آراء العملاء" في لوحة التحكم (كان بيحفظ حقول مش موجودة أصلًا في قاعدة البيانات فيفشل كل مرة)

```bash
pwsh website/deploy-to-contabo.ps1
```

**✅ التحقّق:**
```bash
cd /root/INSAN-Healthcare-Platform && git rev-parse --short HEAD
```
قارن الناتج بآخر كوميت على `main` وتأكد إنه مطابق.

**افتح بعينك:**
- `http://169.58.77.61/` — تأكد إن الكارت العلوي بيقول "الرعاية الضرورية فقط" و"أساس الخدمة الطبية / احترام الإنسان"، **مش** "د. سارة جونسون" ولا "4.9/5"
- `http://169.58.77.61/admin/faqs` — لازم تفتح صفحة فيها زرار "إضافة سؤال"

---

# 📋 قواعد ملزمة

## ⛔ ممنوعات
1. **متخترعش أي محتوى** — لا خدمة طبية، ولا رقم هاتف، ولا سؤال شائع وإجابته.
2. **متحطش أي إجابة للأسئلة الشائعة** — الملف المصدري نفسه بيمنع ده صراحة لحد ما صاحب المشروع يجاوب. صفحة الإدارة جاهزة، البيانات مش جاهزة.
3. **متحذفش حاجة نهائيًا (DELETE)** — استخدم `status: 'DRAFT'` أو `/unpublish` بس. الحذف النهائي قرار لاحق.
4. **متلمسش خبر ADHD** — سؤال مفتوح لصاحب المشروع.

## ✅ إلزاميات
1. نفّذ المهام بالترتيب المكتوب.
2. الصق نتيجة كل أمر تحقّق كما هي.
3. لو أي مهمة فشلت، قف وبلّغ — كمّل الباقي لو مقدرتش تحدد السبب بسرعة، لكن سجّل الفشل بوضوح.

## 📊 التقرير المطلوب
```
المهمة 1 (بيانات التواصل): ✅/❌ — [الصق التحقّق]
المهمة 2 (حذف الكيان الشبح): ✅/❌ — [الصق التحقّق]
المهمة 3 (إخفاء البيانات التجريبية): ✅/❌ — [الصق التحقّق]
المهمة 4 (تعبئة 6 مراكز): ✅/❌ — [الصق التحقّق]
المهمة 5 (النشر): ✅/❌ — commit = [اكتبه]

مشاكل واجهتني: [اكتبها، متخفيش حاجة]
```
