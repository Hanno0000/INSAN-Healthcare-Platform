# 07 — UI Component Inventory (Replit Implementation)

# 07 — جرد المكونات القابلة لإعادة الاستخدام (UI Component Inventory)

> **Document Version:** 1.1
> **Status:** Final
> **Last Updated:** 2025-07-16
> **Source of Truth:** Yes

> القالب: `الاسم` · `الغرض` · `الخصائص القابلة للتعديل` · `الحالات (States)` · `السلوك المتجاوب` · `ملاحظات الوصولية (Accessibility)` · `أماكن الاستخدام`
>
> لمواصفات تفصيلية لكل مكون (Props, States, Events)، راجع [15 — Component Specification](15_COMPONENT_SPECIFICATION.md). لتصميم الألوان والخطوط والمسافات، راجع [08 — Design System](08_DESIGN_SYSTEM.md).
>
> **ملاحظة تسمية:** المكونات التي تُستخدم كعناصر هيكلية للصفحات (Hero, Footer, Header) تُسمّى "blocks" (مكوّنات بناء)، بينما المكونات التفاعلية مثل HospitalCard تُسمّى "features" (ميزات). هذا التقسيم يساعد على تنظيم الـ Component Registry.

---

## أ. مكونات الموقع العام (Public Site Components)

| المكون | الغرض | الخصائص القابلة للتعديل | الحالات | السلوك المتجاوب | أماكن الاستخدام |
|---|---|---|---|---|---|
| **Hero** | افتتاحية الصفحة، أول انطباع | عنوان، وصف، صورة/فيديو خلفية، زرّي CTA (نص+رابط لكل زر) | Default, Loading (Skeleton), Video-playing | صورة+نص جنب بعض ← نص فوق صورة على الموبايل | Home, Hospital Detail, Medical Center Detail, About |
| **FeatureGrid** | عرض مميزات/قيم في شبكة | قائمة عناصر {أيقونة، عنوان، وصف} | Default, Empty (لو القائمة فاضية تُخفى تلقائياً) | 4 أعمدة → 2 → 1 | Home, About |
| **EntityCards** | بطاقات كيانات (مستشفيات) | مصدر البيانات (تلقائي من DB) + ترتيب يدوي اختياري | Default, Loading, Empty | 3 أعمدة → 2 → 1 (Carousel) | Home, Hospitals List |
| **ServiceCards** | بطاقات المراكز الطبية | فلتر Featured، مصدر تلقائي من DB | Default, Loading, Empty | 4 أعمدة → 2 → 1 | Home, Medical Centers |
| **TeamGrid** | بطاقات الأطباء | فلتر (مستشفى/مركز/تخصص/Featured) | Default, Loading, Empty, No-Results (بعد فلترة) | 4 أعمدة → 2 → 1 | Home, Doctors, Hospital/Center Detail |
| **DoctorCard** | بطاقة طبيب مفردة (تُستخدم داخل TeamGrid) | صورة، اسم، تخصص، رابط | Default, Hover | صورة مربعة ثابتة النسبة على كل المقاسات | داخل TeamGrid |
| **HospitalCard** | بطاقة مستشفى مفردة | شعار، اسم، وصف مختصر، لون البراند | Default, Hover | - | داخل EntityCards |
| **StepsTimeline** | عرض خطوات متسلسلة (رحلة المريض) | قائمة خطوات {رقم/أيقونة، عنوان، وصف} | Default | أفقي (Desktop) ← عمودي (Mobile) | Home |
| **NewsGrid / NewsCard** | عرض بطاقات الأخبار | مصدر تلقائي (أحدث/مفلتر)، شارة المصدر (Manual/Social) | Default, Loading, Empty | 3 أعمدة → 1 | Home, News List |
| **TestimonialsCarousel** | عرض دوّار للشهادات | فلتر الفئة (Investor/Doctor/Patient) | Default, Auto-play/Paused on hover | كارت واحد على الموبايل، 2-3 على الديسكتوب | About, Home (اختياري) |
| **StatisticsBlock** | عرض أرقام/إحصائيات | Auto (من DB) أو Manual، عداد متحرك (Count-up) | Default, In-view (يبدأ العدّ عند الظهور بالشاشة) | 4 أعمدة → 2 | About |
| **ScheduleTable** | جدول عيادات/مواعيد | مصدر تلقائي من `Clinic.schedule` | Default, Empty | جدول أفقي (Desktop) ← Accordion قابل للطي (Mobile) | Hospital/Center/Doctor Detail |
| **ContactBlock** | بيانات تواصل + خريطة | من Settings (بريد، هاتف، عنوان، إحداثيات) | Default, Map-loading | خريطة فوق/تحت البيانات حسب الحجم | Home, Contact Us |
| **ContactForm** | نموذج تواصل عام | حقول ديناميكية (راجع قواعد التحقق في [02 — Information Architecture](../architecture/02_INFORMATION_ARCHITECTURE_AND_PAGES.md)) | Default, Submitting, Success, Error, Field-error | عمود واحد دائماً، اتساع كامل | Contact Us |
| **AppointmentForm/Drawer** | نموذج طلب حجز موعد | Dropdowns تعتمد على بعضها (مستشفى→مركز) | Default, Submitting, Success, Error | Drawer (Desktop) ← Full-screen Modal (Mobile) | Global (زر عائم) |
| **FilterBar** | شريط فلاتر (مستشفى/تخصص/تصنيف) | قائمة فلاتر ديناميكية حسب الصفحة | Default, Active-filters (Chips قابلة للحذف) | أفقي ← Dropdown/Drawer على الموبايل | Doctors, Medical Centers, News |
| **SearchInput** | بحث نصي | Debounce 300ms، حد أدنى حرفين | Default, Typing, No-results | اتساع كامل على الموبايل | Doctors, News |
| **Pagination** | تصفح الصفحات | عدد العناصر لكل صفحة | Default, Disabled (أول/آخر صفحة) | أزرار مبسّطة (Prev/Next فقط) على الموبايل | كل القوائم |
| **StickyActionsBar** | أزرار ثابتة (طوارئ/حجز/واتساب) | روابط الأزرار الثلاثة من Settings | Default | عائم جانبي (Desktop) ← شريط سفلي ثابت (Mobile) | Global — كل الصفحات |
| **ChatWidget** | نافذة الشات بالذكاء الاصطناعي | تُدار بالكامل من AI Assistant Settings | Closed, Open, Typing (AI يكتب), Escalated | فقاعة عائمة صغيرة (Desktop) ← تحتل الشاشة كاملة عند الفتح (Mobile) | Global — كل الصفحات |
| **Header/Navigation** | القائمة الرئيسية | تُسحب تلقائياً من `NavigationItem` (location=header) | Default, Scrolled (خلفية معتمة) | قائمة أفقية ← Hamburger Menu (Mobile) | Global |
| **Footer** | تذييل الموقع | يُسحب من `NavigationItem` (location=footer) + Settings | Default | 4 أعمدة → عمود واحد قابل للطي (Accordion) | Global |
| **Breadcrumb** | مسار التنقل | تلقائي حسب هيكل الصفحة | Default | يختصر لآخر عنصرين على الموبايل | Medical Center Detail, Doctor Detail, News Post |
| **LanguageSwitcher** | تبديل عربي/إنجليزي | يحافظ على نفس الصفحة عند التبديل | Default | أيقونة فقط على الموبايل (بدون نص) | Global (Header) |

---

## ب. مكونات لوحة التحكم (Admin Components)

| المكون | الغرض | الخصائص القابلة للتعديل | الحالات | السلوك المتجاوب | أماكن الاستخدام |
|---|---|---|---|---|---|
| **DataTable** | جدول بيانات موحّد لكل الشاشات الإدارية | أعمدة، فلاتر، بحث، ترقيم صفحات، فرز | Default, Loading (Skeleton rows), Empty, Error | يتحول لبطاقات (Cards) بدل جدول أفقي على الموبايل | كل شاشات القوائم في [06 — Admin Dashboard](../admin/06_ADMIN_DASHBOARD_SPECIFICATION.md) |
| **Sidebar Navigation** | قائمة جانبية للوحة التحكم | تظهر/تختفي العناصر حسب صلاحيات المستخدم | Default, Collapsed | يتحول لقائمة منسدلة (Drawer) على الموبايل/التابلت | Global (Admin) |
| **FormBuilder Field (Bilingual Tabs)** | حقل نصي بتبويب AR/EN | نوع الحقل (Text/RichText/Number/Date) | Default, Error, Missing-translation (تحذير) | - | كل نماذج المحتوى |
| **ImagePicker/Uploader** | اختيار صورة من مكتبة الوسائط أو رفع جديدة | حد الحجم/النوع من Settings | Default, Uploading (progress), Error | Modal كامل الشاشة على الموبايل | كل النماذج التي تحتاج صور |
| **PageBuilderCanvas** | لوحة تصميم الصفحة بالسحب والإفلات | - | Default, Dragging, Section-selected | تعطيل السحب البصري على الموبايل، استبداله بأزرار "نقل لأعلى/لأسفل" | شاشة Pages |
| **ConfirmDialog** | تأكيد قبل أي إجراء تدميري (حذف) | نص تحذيري مخصص حسب السياق | Default, Loading (أثناء التنفيذ) | Modal مركزي على كل المقاسات | كل عمليات الحذف |
| **Toast/Alert** | إشعارات نجاح/خطأ فورية | نوع (success/error/warning/info)، مدة الظهور | Visible, Dismissing | أسفل الشاشة على الموبايل بدل الزاوية | Global (Admin) |
| **StatusBadge** | شارة حالة (Draft/Published/Archived...) | لون تلقائي حسب الحالة | - | - | كل الجداول |
| **BulkActionsBar** | شريط يظهر عند تحديد عناصر متعددة بالجدول | الإجراءات المتاحة حسب الشاشة | Hidden, Visible (عند التحديد) | يتحول لشريط سفلي ثابت على الموبايل | شاشات القوائم |
| **AuditDiffViewer** | عرض الفرق بين قبل/بعد لأي تعديل | - | Default | عرض عمودي (قبل فوق، بعد تحت) على الموبايل بدل جنب بعض | شاشة Audit Log |

---

## ج. مبادئ عامة على كل المكونات

- **الوصولية (Accessibility):** تباين ألوان ≥ 4.5:1 للنصوص، كل عنصر تفاعلي له `focus state` واضح، كل صورة لها `alt text` إجباري (يُخزَّن `{ar,en}`)، كل نموذج له `label` مرتبط فعلياً بالحقل (مش placeholder فقط).
- **RTL:** كل مكون يُبنى بـ CSS منطقي (`margin-inline-start` بدل `margin-left`) عشان ينعكس صح تلقائياً بين عربي/إنجليزي بدون كود مكرر.
- **إعادة الاستخدام:** أي مكون هنا مسجّل في **Component Registry** مركزي — إضافة نوع جديد = تسجيله مرة واحدة، ويظهر تلقائياً كخيار في Page Builder (للمكونات العامة) دون تكرار كود. (لتفاصيل كل component، راجع [15 — Component Specification](15_COMPONENT_SPECIFICATION.md)).

---

**التالي:** [08 — Design System](08_DESIGN_SYSTEM.md)