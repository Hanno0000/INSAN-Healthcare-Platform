# 02 — Information Architecture & Pages (Replit Implementation)

# 02 — العمارة المعلوماتية ومواصفة كل صفحة (Information Architecture & Pages)

> **Document Version:** 1.1
> **Status:** Final
> **Last Updated:** 2025-07-16
> **Source of Truth:** Yes

> كل صفحة موثّقة بنفس القالب الثابت أدناه حتى لا يوجد أي التباس. الصفحات الإدارية (Admin) موثّقة بالتفصيل في [06 — Admin Dashboard Specification](../admin/06_ADMIN_DASHBOARD_SPECIFICATION.md). للمواصفات التفصيلية للمكونات، راجع [15 — Component Specification](../ui/15_COMPONENT_SPECIFICATION.md). لتفاصيل النماذج والعلاقات، راجع [03 — Database Schema](../database/03_DATABASE_SCHEMA.md). للمسارات API، راجع [04 — API Specification](../api/04_API_SPECIFICATION.md). للمواصفات التفصيلية للشاشة (Responsive Behavior)، راجع [14 — UI Screen Specification](../ui/14_UI_SCREEN_SPECIFICATION.md).

## القالب المستخدم لكل صفحة
`Purpose` · `URL (ar/en)` · `User Type` · `SEO` · `Sections/Components` · `Editable Fields` · `Required Permissions` · `Navigation Behavior` · `Responsive Behavior` · `Validation Rules` · `Future Extensibility`

---

## خريطة الموقع (Sitemap)

```
/ar , /en                          → Home
/ar/about , /en/about              → About INSAN
/ar/hospitals , /en/hospitals      → Our Hospitals (List)
/ar/hospitals/:slug , /en/...      → Hospital Detail (Future / Delta)
/ar/medical-centers , /en/...      → Medical Centers (Hub/List)
/ar/medical-centers/:slug , /en/.. → Medical Center Detail
/ar/doctors , /en/doctors          → Doctors Directory
/ar/doctors/:slug , /en/...        → Doctor Detail
/ar/news , /en/news                → News & Media (List)
/ar/news/:slug , /en/news/...      → News Post Detail
/ar/contact , /en/contact          → Contact Us
/ar/investors , /en/investors      → Investor Page (مخفية — بدون رابط في أي Navigation)
/ar/privacy , /en/privacy          → Privacy Policy
/ar/terms , /en/terms              → Terms of Use
/404                                → Error Page
Global (تظهر فوق كل صفحة): StickyActionsBar (طوارئ/حجز/واتساب) + ChatWidget + Header + Footer
```

---

## 1. Home

- **Purpose:** نقطة الدخول الرئيسية، تلخّص منظومة INSAN وتوجّه الزوار الثلاثة (مستثمر/طبيب/مريض) بحسب أولوية الجمهور (50/30/20).
- **URL:** `/ar` (default) و `/en`
- **User Type:** Public — بدون تسجيل دخول.
- **SEO:** `meta_title`/`meta_description` من `Page` record (slug=`home`) بلغتين، `og:image` = Hero image افتراضياً أو صورة مخصصة، JSON-LD `Organization`/`MedicalOrganization` لـ INSAN، `canonical` self، `hreflang` alternate لـ `/en`.
- **Sections (بالترتيب، كلها قابلة لإعادة الترتيب من Page Builder):**
  1. `Hero` — عنوان، وصف، صورة/فيديو خلفية، زرّي CTA
  2. `FeatureGrid` ("لماذا تختارنا") — مصفوفة مميزات (أيقونة + عنوان + وصف قصير)
  3. `EntityCards` ("مستشفياتنا") — تُسحب تلقائياً من جدول `Hospital` (status=PUBLISHED)، مع خيار تثبيت ترتيب يدوي
  4. `ServiceCards` ("خدماتنا الطبية المتميزة") — تُسحب من `MedicalCenter`، الأدمن يختار أي مراكز تظهر هنا (Featured flag)
  5. `TeamGrid` ("أطباؤنا") — تُسحب من `Doctor`، بفلتر Featured
  6. `StepsTimeline` ("رحلة المريض") — خطوات ثابتة (نص+أيقونة) يحررها الأدمن
  7. `NewsGrid` ("آخر الأخبار") — أحدث 3 مقالات منشورة تلقائياً
  8. `ContactBlock` — بيانات تواصل + خريطة (من Settings)
  9. `Footer` (Global) + `StickyActionsBar` (Global)
- **Editable Fields:** كل نص/صورة/ترتيب/إظهار-إخفاء لكل Section عبر Page Builder؛ لا حقول ثابتة بالكود.
- **Required Permissions:** العرض عام؛ التعديل يتطلب `pages:edit` (Editor فأعلى)، والنشر يتطلب `pages:publish` (Manager فأعلى).
- **Navigation Behavior:** رابط "الرئيسية" مربوط بالـ Logo في الـ Header دائماً.
- **Responsive Behavior:** Hero يتحول من صورة+نص جنب بعض (Desktop) إلى نص فوق صورة (Mobile <768px)؛ كل شبكات البطاقات تتحول من 3-4 أعمدة إلى عمود واحد بالتمرير الأفقي (Carousel) على الموبايل؛ `StickyActionsBar` يتحول من أزرار جانبية عائمة (Desktop) إلى شريط سفلي ثابت (Mobile). (تفاصيل أكتر في [14 — UI Screen Specification](../ui/14_UI_SCREEN_SPECIFICATION.md)).
- **Validation Rules:** لا يوجد إدخال بيانات من الزائر في هذه الصفحة مباشرة (النماذج داخل Sections منفصلة مثل ContactBlock تتبع قواعد `Contact Us`).
- **Future Extensibility:** أي Section جديد (مثال: "شركاؤنا"، "أرقام وإحصائيات") يُضاف كـ Component جديد في الـ Registry ويظهر فوراً كخيار في Page Builder دون كود إضافي في هذه الصفحة.

---

## 2. About INSAN

- **Purpose:** شرح فلسفة INSAN كمنصة أم (Master Brand)، القصة، الرؤية، القيم.
- **URL:** `/ar/about` , `/en/about`
- **User Type:** Public
- **SEO:** meta مخصصة، JSON-LD `AboutPage`
- **Sections:** `Hero` (بعنوان مختلف)، `RichTextBlock` (نص حر عن INSAN)، `FeatureGrid` (القيم/المبادئ)، `StatisticsBlock` (أرقام: عدد المستشفيات، المراكز، الأطباء — تُحسب تلقائياً أو تُدخَل يدوياً)، `TestimonialsCarousel` (بفلتر audience حسب الأولوية Investors أولاً)، `CTA` (تواصل/استثمر)، `Footer`.
- **Editable Fields:** نفس مبدأ Page Builder؛ `StatisticsBlock` له خيار Auto (من الـ DB) أو Manual (رقم يُدخَل يدوياً).
- **Required Permissions:** تعديل `pages:edit`.
- **Navigation Behavior:** عنصر "عن المجموعة" في القائمة الرئيسية.
- **Responsive Behavior:** `StatisticsBlock` شبكة 4 أعمدة → عمودين على تابلت → عمود واحد على موبايل. (تفاصيل أكتر في [14 — UI Screen Specification](../ui/14_UI_SCREEN_SPECIFICATION.md)).
- **Validation Rules:** لا يوجد.
- **Future Extensibility:** إمكانية إضافة Section "فريق القيادة" لاحقاً بنفس النمط.

---

## 3. Our Hospitals (List)

- **Purpose:** عرض كل المستشفيات التابعة للمنظومة كبوابة للدخول لصفحة كل مستشفى.
- **URL:** `/ar/hospitals` , `/en/hospitals`
- **User Type:** Public
- **SEO:** meta مخصصة، `ItemList` JSON-LD يضم المستشفيات.
- **Sections:** `Hero` بسيط + `EntityCards` (Grid كامل لكل المستشفيات المنشورة) + `CTA` + `Footer`.
- **Editable Fields:** ترتيب العرض (drag)، حالة كل مستشفى (Draft/Published) تُدار من شاشة Hospitals في الأدمن ([06 — Admin Dashboard Specification](../admin/06_ADMIN_DASHBOARD_SPECIFICATION.md)).
- **Required Permissions:** العرض عام.
- **Navigation Behavior:** عنصر "مستشفياتنا" في القائمة الرئيسية، مع Dropdown اختياري يعرض أسماء المستشفيات مباشرة عند الـ Hover (Desktop).
- **Responsive Behavior:** Grid 2 عمود → عمود واحد على الموبايل، الصورة تحتل العرض الكامل.
- **Validation Rules:** لا يوجد.
- **Future Extensibility:** إضافة مستشفى ثالث مستقبلاً = سطر جديد في جدول `Hospital`، الصفحة تعرضه تلقائياً بدون تعديل كود.

---

## 4. Hospital Detail (قالب مشترك لـ Future & Delta)

- **Purpose:** صفحة تعريفية كاملة لكل مستشفى — تعمل كـ Sub-brand صفحة تحت مظلة INSAN.
- **URL:** `/ar/hospitals/:slug` مثال `/ar/hospitals/future-hospital` , `/ar/hospitals/delta-hospital`
- **User Type:** Public
- **SEO:** meta مستقلة لكل مستشفى، JSON-LD `Hospital`/`MedicalOrganization`، `parentOrganization` يشير لـ INSAN.
- **Sections:** `Hero` (بهوية بصرية بلون المستشفى الفرعي `brand_color`) → `RichTextBlock` (نبذة) → `ServiceCards` (المراكز الطبية التابعة لهذا المستشفى فقط — عبر `HospitalMedicalCenter`) → `TeamGrid` (أطباء هذا المستشفى) → `ScheduleTable` (جدول العيادات، مجمّع من `Clinic.schedule` لكل مراكزه) → `NewsGrid` (أخبار بها `related_hospital_id` = هذا المستشفى) → `Gallery` (صور/فيديو) → `ContactBlock` (بيانات تواصل/حجز خاصة بالمستشفى) → `Footer`.
- **Editable Fields:** كل الأقسام أعلاه + `brand_color` + `logo` + `hero_image` من شاشة Hospitals بالأدمن.
- **Required Permissions:** العرض عام؛ التعديل `hospitals:edit`.
- **Navigation Behavior:** يُفتح من صفحة "مستشفياتنا" أو مباشرة من الـ Dropdown في الهيدر.
- **Responsive Behavior:** `ScheduleTable` يتحول لبطاقات قابلة للطي (Accordion) بدل جدول أفقي على الموبايل. (تفاصيل أكتر في [14 — UI Screen Specification](../ui/14_UI_SCREEN_SPECIFICATION.md)).
- **Validation Rules:** لا يوجد إدخال مباشر؛ زر "احجز موعد" يفتح `AppointmentDrawer` (نموذج منفصل، قواعده في القسم 4 من [04 — API Specification](../api/04_API_SPECIFICATION.md)).
- **Future Extensibility:** إضافة مستشفى جديد = نفس القالب تلقائياً، بدون صفحة كود مستقلة.

---

## 5. Medical Centers (Hub/List)

- **Purpose:** عرض المراكز الطبية الـ12 كواجهة Signature Brands، بفلترة حسب المستشفى.
- **URL:** `/ar/medical-centers` , `/en/medical-centers`
- **User Type:** Public
- **SEO:** meta مخصصة، `ItemList` JSON-LD.
- **Sections:** `Hero` + `FilterBar` (فلتر حسب المستشفى: الكل/Future/Delta) + `ServiceCards` Grid (كل المراكز المنشورة) + `CTA` + `Footer`.
- **Editable Fields:** ترتيب العرض، تفعيل/تعطيل الفلتر من إعدادات الصفحة.
- **Required Permissions:** العرض عام.
- **Navigation Behavior:** عنصر رئيسي مستقل "مراكزنا الطبية" في القائمة الرئيسية (حسب القرار المعتمد).
- **Responsive Behavior:** `FilterBar` يتحول من أزرار أفقية إلى Dropdown على الموبايل؛ Grid يتحول لعمود واحد. (تفاصيل أكتر في [14 — UI Screen Specification](../ui/14_UI_SCREEN_SPECIFICATION.md)).
- **Validation Rules:** لا يوجد.
- **Future Extensibility:** إضافة مركز طبي رقم 13 مستقبلاً = سطر جديد بجدول `MedicalCenter` مربوط بالمستشفى المناسب عبر `HospitalMedicalCenter`.

---

## 6. Medical Center Detail

- **Purpose:** الصفحة الأهم تسويقياً (بند "Centers over Departments" في الدستور الإبداعي) — تبيع الأثر والثقة وليس الخدمة المجردة.
- **URL:** `/ar/medical-centers/:slug` , `/en/...`
- **User Type:** Public
- **SEO:** meta مستقلة، JSON-LD `MedicalClinic`، Breadcrumb يربط بالمستشفى/المستشفيات المضيفة.
- **Sections:** `Hero` → `FeatureGrid` (مميزات المركز) → `ServicesList` (خدمات المركز) → `ClinicsScheduleTable` (من `Clinic`) → `TeamGrid` (أطباء المركز) → `HostedByBlock` (يوضح تبعية المركز لمستشفى/مستشفيين مع روابط، تنفيذاً لمبدأ Cross-Platform Reinforcement في الدستور) → `CTA` (احجز موعد) → `Footer`.
- **Editable Fields:** كل الأقسام من شاشة Medical Centers بالأدمن (بما فيها ربط/فك ربط بمستشفى عبر Checkbox).
- **Required Permissions:** العرض عام؛ التعديل `medical-centers:edit`.
- **Navigation Behavior:** يُفتح من صفحة Medical Centers أو من صفحة المستشفى.
- **Responsive Behavior:** نفس نمط Hospital Detail. (تفاصيل أكتر في [14 — UI Screen Specification](../ui/14_UI_SCREEN_SPECIFICATION.md)).
- **Validation Rules:** لا يوجد إدخال مباشر بخلاف زر الحجز.
- **Future Extensibility:** إمكانية إضافة "قصص نجاح/Case Studies" كـ Section جديد لاحقاً.

---

## 7. Doctors Directory

- **Purpose:** دليل شامل للأطباء قابل للفلترة (حسب المستشفى/المركز/التخصص).
- **URL:** `/ar/doctors` , `/en/doctors`
- **User Type:** Public
- **SEO:** meta مخصصة، `ItemList` لكل طبيب.
- **Sections:** `Hero` بسيط + `FilterBar` (مستشفى/مركز/تخصص، Multi-select) + `SearchInput` + `TeamGrid` (Paginated) + `Footer`.
- **Editable Fields:** إظهار/إخفاء طبيب من القائمة العامة (Featured/Hidden flag) من شاشة Doctors بالأدمن.
- **Required Permissions:** العرض عام.
- **Navigation Behavior:** رابط ثانوي (يظهر داخل صفحات المستشفى/المركز أو من الفوتر — غير مطلوب في القائمة الرئيسية الأساسية المعتمدة).
- **Responsive Behavior:** الفلاتر تتحول لـ Drawer قابل للفتح على الموبايل بدل شريط جانبي ثابت. (تفاصيل أكتر في [14 — UI Screen Specification](../ui/14_UI_SCREEN_SPECIFICATION.md)).
- **Validation Rules:** حقل البحث `SearchInput` — الحد الأدنى حرفين قبل تنفيذ البحث (Debounce 300ms).
- **Future Extensibility:** إضافة فلتر "اللغة التي يتحدثها الطبيب" مستقبلاً بدون تعديل الجدول (يُضاف كحقل JSON إضافي).

---

## 8. Doctor Detail

- **Purpose:** صفحة تعريفية للطبيب تبني الثقة (بند Human-Centered Care).
- **URL:** `/ar/doctors/:slug`
- **User Type:** Public
- **SEO:** JSON-LD `Physician`.
- **Sections:** `DoctorProfileHeader` (صورة، اسم، تخصص، المستشفيات/المراكز التابع لها) → `RichTextBlock` (السيرة الذاتية) → `ScheduleTable` (مواعيده) → `CTA` (احجز مع هذا الطبيب) → `RelatedDoctors` → `Footer`.
- **Editable Fields:** كل الحقول من شاشة Doctors بالأدمن.
- **Required Permissions:** العرض عام؛ التعديل `doctors:edit`.
- **Navigation Behavior:** يُفتح من Doctors Directory أو صفحات المستشفى/المركز.
- **Responsive Behavior:** `DoctorProfileHeader` يتحول من صف أفقي إلى عمودي على الموبايل. (تفاصيل أكتر في [14 — UI Screen Specification](../ui/14_UI_SCREEN_SPECIFICATION.md)).
- **Validation Rules:** لا يوجد.
- **Future Extensibility:** إضافة "تقييمات المرضى" مستقبلياً كـ Section منفصل (يتطلب موديول جديد، غير مطلوب الآن).

---

## 9. News & Media (List)

- **Purpose:** عرض الأخبار المجمّعة (يدوي + مزامنة سوشيال ميديا).
- **URL:** `/ar/news` , `/en/news`
- **User Type:** Public
- **SEO:** meta مخصصة، `Blog`/`CollectionPage` JSON-LD.
- **Sections:** `Hero` + `FilterBar` (حسب التصنيف/الكيان المصدر: INSAN/Future/Delta) + `NewsGrid` (Paginated، 12 لكل صفحة) + `Footer`.
- **Editable Fields:** لا يوجد على مستوى الصفحة؛ المحتوى يُدار من شاشة News بالأدمن.
- **Required Permissions:** العرض عام.
- **Navigation Behavior:** عنصر "الأخبار والأنشطة" بالقائمة الرئيسية.
- **Responsive Behavior:** Grid 3 أعمدة → عمود واحد. (تفاصيل أكتر في [14 — UI Screen Specification](../ui/14_UI_SCREEN_SPECIFICATION.md)).
- **Validation Rules:** لا يوجد.
- **Future Extensibility:** يمكن إضافة مصدر سوشيال ميديا رابع (مثلاً مركز طبي مستقل بصفحة خاصة) بإضافة قيمة جديدة لـ enum `SourceEntity` بدون تعديل بنية الجدول.

---

## 10. News Post Detail

- **Purpose:** عرض تفاصيل الخبر/المنشور.
- **URL:** `/ar/news/:slug`
- **User Type:** Public
- **SEO:** JSON-LD `NewsArticle`، `canonical` يشير للمصدر الأصلي لو كان `source_type=social_sync` ومُفعَّل خيار ذلك من الإعدادات.
- **Sections:** `ArticleHeader` (عنوان، صورة، تاريخ، تصنيف، شارة "من صفحاتنا على السوشيال ميديا" لو synced) → `ArticleBody` → `ShareButtons` → `RelatedNews` → `Footer`.
- **Editable Fields:** كل الحقول من شاشة News بالأدمن (سواء يدوي أو مراجعة بوست متزامن).
- **Required Permissions:** العرض عام؛ التعديل `news:edit`، النشر `news:publish`.
- **Navigation Behavior:** يُفتح من News List أو من NewsGrid بالصفحة الرئيسية.
- **Responsive Behavior:** عرض النص يتكيف لعرض القراءة المريح (max-width) على كل الشاشات.
- **Validation Rules:** لا يوجد.
- **Future Extensibility:** دعم التعليقات (مذكور كـ Future-ready في المتطلبات العامة) — الجدول لا يمنع إضافته لاحقاً كموديول `Comment` منفصل.

---

## 11. Contact Us

- **Purpose:** نموذج تواصل عام + بيانات المنظومة.
- **URL:** `/ar/contact` , `/en/contact`
- **User Type:** Public
- **SEO:** meta مخصصة، `ContactPage` JSON-LD.
- **Sections:** `Hero` + `ContactForm` + `MapBlock` + `ContactInfoBlock` (من Settings) + `Footer`.
- **Editable Fields:** بيانات التواصل من Settings > General.
- **Required Permissions:** العرض عام؛ الإرسال بدون تسجيل دخول.
- **Navigation Behavior:** عنصر "تواصل معنا" بالقائمة الرئيسية + زر ثابت بالـ `StickyActionsBar`.
- **Responsive Behavior:** الخريطة تحت النموذج بدل جنبه على الموبايل. (تفاصيل أكتر في [14 — UI Screen Specification](../ui/14_UI_SCREEN_SPECIFICATION.md)).
- **Validation Rules (`ContactForm`):**
  - `name`: مطلوب، 2-100 حرف
  - `email`: مطلوب، صيغة بريد صحيحة
  - `phone`: اختياري، أرقام فقط، 8-15 رقم
  - `message`: مطلوب، 10-1000 حرف
  - Rate limit: 5 محاولات/ساعة لكل IP، + reCAPTCHA/hCaptcha اختياري قابل للتفعيل من الإعدادات
  - **ملاحظة:** التحقق من الصحة في الواجهة يتم بـ React Hook Form + Zod، بينما class-validator يتحقق على الـ API (انظر [01 — System Architecture](01_ARCHITECTURE.md)).
- **Future Extensibility:** إمكانية توجيه الرسالة تلقائياً لبريد/قسم مختلف حسب "الموضوع" (Subject) لاحقاً.

---

## 12. Book Appointment (Drawer/Modal — Global Component وليس صفحة مستقلة)

- **Purpose:** نموذج حجز موعد سريع، يُستدعى من أي زر "احجز موعد" في أي صفحة.
- **URL:** لا يملك URL مستقل (Drawer فوق الصفحة الحالية)؛ اختياري لاحقاً صفحة كاملة `/ar/book`.
- **User Type:** Public
- **SEO:** غير منطبق (Component وليس صفحة).
- **Sections:** `AppointmentForm` — حقول: الاسم، الهاتف، البريد (اختياري)، المستشفى (Dropdown)، المركز الطبي (Dropdown يعتمد على المستشفى المختار)، التاريخ المفضل، ملاحظات.
- **Editable Fields:** رسالة النجاح/الفشل، وقائمة المستشفيات/المراكز تُسحب تلقائياً من DB.
- **Required Permissions:** لا يوجد (عام)، إدارة الطلبات تتطلب `appointments:view` بالأدمن ([06 — Admin Dashboard Specification](../admin/06_ADMIN_DASHBOARD_SPECIFICATION.md)).
- **Navigation Behavior:** يُستدعى من `StickyActionsBar` وأي زر CTA بالموقع.
- **Responsive Behavior:** Drawer من اليمين (Desktop) ← يتحول لـ Full-screen Modal على الموبايل. (تفاصيل أكتر في [14 — UI Screen Specification](../ui/14_UI_SCREEN_SPECIFICATION.md)).
- **Validation Rules:**
  - `name`: مطلوب، 2-100 حرف
  - `phone`: مطلوب، صيغة رقم مصري (regex `^01[0-2,5]{1}[0-9]{8}$` قابل للتعديل لاحقاً لو التوسع دولي)
  - `preferred_date`: اختياري، لازم يكون تاريخ مستقبلي
  - Rate limit: 5 محاولات/ساعة لكل IP
- **Future Extensibility:** ربط مباشر بنظام حجز مواعيد حقيقي (Calendar/Slots) لاحقاً بدل مجرد "طلب" يُتابعه الأدمن يدوياً.

---

## 13. Investor Page (مخفية)

- **Purpose:** معلومات استثمارية (خطط، فرص نمو) — أولوية أعلى جمهور (50%) لكنها مخفية عمداً لحماية حساسية البيانات.
- **URL:** `/ar/investors` , `/en/investors` — **بدون ظهور في أي Navigation أو Sitemap.xml علني** (تُستثنى صراحة من الـ Sitemap ومن فهرسة محركات البحث `robots: noindex`).
- **User Type:** Public لكن بدون اكتشاف (Unlisted) — قابل للترقية لاحقاً لصفحة محمية بكلمة مرور أو تسجيل دخول مستثمرين.
- **SEO:** `robots: noindex, nofollow` إجباري.
- **Sections:** `Hero` + `RichTextBlock` + `DownloadableFile` (ملف العرض التقديمي/التمهيدي) + `ContactForm` مخصص (طلب تواصل استثماري).
- **Editable Fields:** كل المحتوى من شاشة Pages بالأدمن (نفس نظام الصفحات العادي، فقط `robots=noindex` مقفول ولا يمكن تغييره من الواجهة لهذه الصفحة تحديداً).
- **Required Permissions:** التعديل `pages:edit` + صلاحية خاصة `pages:manage-hidden`.
- **Navigation Behavior:** رابط مباشر فقط (يُشارك يدوياً)، اختياري رابط صغير جداً بالفوتر لاحقاً لو رغب صاحب المشروع.
- **Responsive Behavior:** قياسي مثل باقي الصفحات.
- **Validation Rules:** نفس `ContactForm`.
- **Future Extensibility:** ترقية لصفحة محمية Login-only (Investor Portal) دون تغيير الـ URL.

---

## 14. Privacy Policy / Terms of Use

- **Purpose:** صفحات قانونية ثابتة.
- **URL:** `/ar/privacy`, `/ar/terms` (+ en)
- **User Type:** Public
- **SEO:** meta بسيطة، `robots: index`.
- **Sections:** `Hero` بسيط + `RichTextBlock` طويل.
- **Editable Fields:** نص كامل من شاشة Pages بالأدمن (نوع صفحة Static).
- **Required Permissions:** `pages:edit`.
- **Navigation Behavior:** روابط بالفوتر فقط.
- **Responsive Behavior:** قياسي.
- **Validation Rules:** لا يوجد.
- **Future Extensibility:** إضافة صفحات ثابتة أخرى (مثال: Cookie Policy) بنفس النمط دون كود جديد.

---

## 15. 404 / Error Page

- **Purpose:** تجربة مستخدم لطيفة عند رابط غير موجود، متوافقة مع نبرة البراند (هادئة، غير مربكة).
- **URL:** يظهر تلقائياً لأي مسار غير معروف.
- **User Type:** Public
- **SEO:** `robots: noindex`، Status Code `404` حقيقي (مهم لـ SEO).
- **Sections:** رسالة + صورة/رسمة بسيطة + زر "العودة للرئيسية" + `SearchInput` اختياري.
- **Editable Fields:** النص من Settings > General > Error Page.
- **Required Permissions:** لا يوجد.
- **Navigation Behavior:** لا يظهر بأي قائمة.
- **Responsive Behavior:** قياسي.
- **Validation Rules:** لا يوجد.
- **Future Extensibility:** لا يوجد.

---

**التالي:** `../database/03_DATABASE_SCHEMA.md` — الـ ER Diagram وكود Prisma الكامل.