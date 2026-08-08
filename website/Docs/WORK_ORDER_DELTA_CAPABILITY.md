# أمر شغل — تحديث وصف مستشفى الدلتا بمعلومات حقيقية موثّقة

> **للمنفّذ:** المحتوى جاهز بالكامل، منسوخ حرفيًا من `business/knowledge/hospitals/HOSPITAL_DELTA.md`
> (قسم "Capability on record") — مصدره مستند وصف المستشفى الرسمي وتأكيد
> صاحب المشروع بتاريخ 2026-08-08. **انسخ والصق. ممنوع تكتب أو تترجم أو تخترع
> أي حاجة.**

---

## الخلفية

فحصت صفحة الدلتا الحية بعيني، ومفيش أي حاجة من المعلومات دي ظاهرة عليها —
رغم إنها موثّقة ومؤكَّدة. الحقل الموجود بالفعل في قاعدة البيانات (`description`)
فاضي/عام، وده اللي هنملاه.

**⚠️ ملحوظتين من نفس ملف المصدر، لازم تتوقف عندهم:**
1. **قدرة غرفة العمليات على إجراء تخصص جراحي معيّن ≠ وجود "مركز" له.** المحتوى تحت ده بيوصف التخصصات اللي المستشفى قادر يجريها في غرف العمليات — **مش** إعلان عن مراكز جديدة. متربطش أي تخصص من دول بصفحة مركز.
2. **متكتبش سنة تأسيس محددة.** الملف المصدري بيقول "سنوات طويلة" بس، وده كافي.

---

## ⚠️ الخطوة صفر — إجبارية

```javascript
(await (await fetch('/api/v1/auth/refresh',{method:'POST',credentials:'include'})).json()).data.accessToken
```
```javascript
window.TOKEN = 'الصق_التوكن_هنا';
window.H = { 'Authorization': `Bearer ${window.TOKEN}`, 'Content-Type': 'application/json' };
```

---

# المهمة — تحديث حقل الوصف الكامل لمستشفى الدلتا

## المحتوى — جاهز، انسخه كما هو

```javascript
// ⛔ ممنوع تعديل أي نص هنا
const DELTA_DESCRIPTION = {
  ar: 'مستشفى الدلتا الدولي يعمل منذ سنوات طويلة، وانتقلت إدارته إلى منظومة إنسان ولافونير الطبية منذ نحو سنتين.\n\nتعمل العيادات الخارجية المتخصصة يوميًا من الساعة 10 صباحًا حتى 10 مساءً، بينما يعمل قسم الطوارئ والمعمل على مدار 24 ساعة طوال أيام الأسبوع. يستقبل قسم الطوارئ الحالات الحرجة وإصابات الطرق والحوادث.\n\nيضم المستشفى وحدة العناية المركزة، وغرفًا فندقية للمرضى المقيمين بدرجات متعددة من الدرجة الأولى القياسية حتى الأجنحة المميزة، ووحدة لحديثي الولادة والأطفال الخدّج، ووحدة عناية بالأطفال، ووحدة غسيل كلوي طارئ، وقسمًا شاملًا للفحص الدوري، ووحدة مناظير للجهاز الهضمي والقولون والقنوات المرارية.\n\nيوفر المعمل، على مدار الساعة، تحاليل أمراض الدم والمناعة والفيروسات والهرمونات وكل الكيمياء الحيوية والمزارع البكتيرية والباثولوجيا والخلوية. وتوفر الأشعة بشكل متكامل الأشعة السينية والدوبلر والإيكو والموجات فوق الصوتية والأشعة المقطعية.\n\nتغطي غرف العمليات تخصصات الجراحة العامة وجراحة الأورام والجراحة بالمنظار وجراحة النساء والتوليد وجراحة العظام وإصابات الملاعب وجراحة الوجه والفكين وجراحة المخ والأعصاب وجراحة الأنف والأذن والحنجرة وجراحة اليد والجراحة التجميلية والترميمية وجراحة الأوعية الدموية والصدر والجهاز الهضمي والمسالك البولية، بالإضافة إلى جراحات الأسنان المتخصصة للكبار والأطفال.\n\nتُقدَّم الخدمة الطبية على يد أساتذة واستشاريين من جامعات مصرية متعددة.',
  en: "Delta International Hospital has been operating for many years, and came under the management of the INSAN platform and L'Avenir Medical about two years ago.\n\nSpecialized outpatient clinics run daily from 10:00 AM to 10:00 PM, while the Emergency Department and Laboratory operate 24 hours a day, seven days a week. The Emergency Department receives critical cases, road-traffic injuries and accidents.\n\nThe hospital includes an Intensive Care Unit, graded inpatient rooms from standard first class up to premium suites, a neonatal and premature baby unit, a paediatric care unit, an emergency renal dialysis unit, a comprehensive check-up department, and a gastro, colon and biliary-duct endoscopy unit.\n\nThe Laboratory, operating 24 hours, covers haematology and immunology, virology, hormones, all chemistry panels and cultures, histopathology and cytology. Radiology is fully integrated, covering plain X-ray, Doppler, echocardiography, ultrasound and CT.\n\nOperating theatres cover general surgery, oncological surgery, laparoscopic surgery, obstetrics & gynaecology, orthopaedics & sports injuries, maxillofacial surgery, neurosurgery, ENT, hand surgery, plastic and reconstructive surgery, vascular surgery, thoracic surgery, gastrointestinal surgery and urological surgery, alongside specialised dental surgery for children and adults.\n\nMedical care is delivered by professors and consultants drawn from multiple Egyptian universities."
};
console.log('المحتوى جاهز:', DELTA_DESCRIPTION.ar.length, 'حرف عربي');
```

## سكربت التنفيذ — انسخه كما هو

> 🔴 دي تحديث لحقل واحد بس (`description`) — مش مصفوفة، فمفيش خطر مسح بيانات
> تانية. السكربت بيبعت `description` بس، وباقي الحقول (الاسم، الصور، الأقسام،
> إلخ) بتفضل زي ما هي.

```javascript
const hs = (await (await fetch('/api/v1/admin/hospitals?pageSize=50',{headers:H})).json()).data;
const delta = hs.find(x => x.slug === 'delta-hospital');

const before = (await (await fetch(`/api/v1/admin/hospitals/${delta.id}`,{headers:H})).json()).data;
console.log('الوصف الحالي (عربي):', (before.description?.ar || '(فاضي)').slice(0, 60));

const r = await fetch(`/api/v1/admin/hospitals/${delta.id}`, {
  method: 'PATCH', headers: H, body: JSON.stringify({ description: DELTA_DESCRIPTION })
});
console.log(r.status === 200 ? '✅ اتحفظ' : '❌ HTTP ' + r.status + ' ' + await r.text());
```

## ✅ التحقّق — الصق النتيجة

```javascript
const d = (await (await fetch('/api/v1/hospitals/delta-hospital')).json()).data;
console.log('طول الوصف الجديد (عربي):', (d.description?.ar || '').length, 'حرف');
console.log('أول 100 حرف:', (d.description?.ar || '').slice(0, 100));
console.log('اسم المستشفى لسه سليم؟:', d.name?.ar);
console.log('عدد الأقسام لسه زي ما هو (7)؟:', (d.departments || []).length);
```

**المتوقّع:**
- طول الوصف الجديد أكتر من 900 حرف (مش فاضي ومش النص القديم القصير)
- اسم المستشفى وعدد الأقسام **زي ما هم بالظبط** — لو اتغيّروا، قف وبلّغ فورًا

**وافتح بعينك:** `http://169.58.77.61/hospitals/delta-hospital` — لازم تشوف
الفقرات الجديدة (المواعيد والوحدات والتخصصات) ظاهرة في مكان الوصف.

---

# 📋 قواعد ملزمة

## ⛔ ممنوعات
1. **متغيّرش أي نص في `DELTA_DESCRIPTION`.**
2. **متضيفش سنة تأسيس محددة** ولا أي رقم مش مكتوب هنا (عدد أسرّة، إلخ).
3. **متربطش أي تخصص جراحي بصفحة "مركز"** — دي قدرات غرف عمليات بس.
4. **متبعتش حقول تانية غير `description`** — الاسم والصور والأقسام والمواقع لازم تفضل زي ما هي بدون إرسال.

## ✅ إلزاميات
1. اسم المستشفى وعدد الأقسام لازم يفضلوا **بالضبط زي ما كانوا** بعد التحديث.
2. الصق نتيجة أمر التحقّق كما هي.
3. افتح صفحة الدلتا بعينك بعد التنفيذ.

## 📊 التقرير المطلوب
```
المهمة (وصف الدلتا): ✅/❌
  نتيجة التحقّق: [الصق]

مشاكل واجهتني: [اكتبها، متخفيش حاجة]
```

---

# ℹ️ ملاحظة: مفيش commit ولا push

المهمة دي **بيانات بس** — بتتكتب مباشرة في قاعدة البيانات عن طريق الـ API. **مش
محتاجة أي `git commit` ولا `git push` ولا `deploy`.**
