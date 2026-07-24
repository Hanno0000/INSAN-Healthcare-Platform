# 06 — Admin Dashboard Specification (Replit Implementation)

# 06 — مواصفة لوحة التحكم شاشة بشاشة (Admin Dashboard Specification)

> **Document Version:** 1.1
> **Status:** Final
> **Last Updated:** 2025-07-16
> **Source of Truth:** Yes

> القالب الثابت لكل شاشة: `Purpose` · `Layout` · `Tabs/Sections` · `Table (Columns/Filters/Search)` · `Buttons & Forms` · `Permissions` · `Bulk Actions` · `Validation` · `UX Notes`
>
> لتفاصيل الصلاحيات على كل وحدة، راجع [05 — User Roles & Permissions](../security/05_USER_ROLES_AND_PERMISSIONS.md). لمواصفات التصميم التفصيلية والـ Responsive Behavior لكل شاشة، راجع [14 — UI Screen Specification](../ui/14_UI_SCREEN_SPECIFICATION.md). للمواصفات التفصيلية للمكونات المستخدمة، راجع [15 — Component Specification](../ui/15_COMPONENT_SPECIFICATION.md).

---

## 1. Login Screen

- **Purpose:** دخول آمن لفريق العمل.
- **Layout:** صفحة مركزية بسيطة (Logo + Card بيضاء)، بدون Sidebar.
- **Forms:** `email`, `password`, رابط "نسيت كلمة المرور؟".
- **Validation:** بريد صحيح، كلمة مرور غير فارغة؛ رسالة خطأ عامة "بيانات الدخول غير صحيحة" (بدون تحديد إن كانت المشكلة بالبريد أو الباسورد، لأسباب أمنية).
- **Permissions:** لا يوجد (نقطة الدخول).
- **UX Notes:** قفل مؤقت بعد 5 محاولات فاشلة (يتوافق مع Rate Limit في [04 — API Specification](../api/04_API_SPECIFICATION.md))، رسالة واضحة بعدد المحاولات المتبقية.

---

## 2. Dashboard (نظرة عامة)

- **Purpose:** ملخص سريع لحالة المنصة عند الدخول.
- **Layout:** Sidebar ثابت + شبكة Cards إحصائية أعلى الصفحة + جدولين (آخر الحجوزات، آخر رسائل التواصل).
- **Cards:** عدد الصفحات المنشورة، عدد الحجوزات الجديدة (النافذة)، رسائل تواصل غير مقروءة، محادثات AI اليوم، عدد الأخبار المزامنة بانتظار المراجعة.
- **Sections:** رسم بياني بسيط (حجوزات آخر 30 يوم)، قائمة "آخر نشاط" (من Audit Log).
- **Permissions:** كل الأدوار تشوفه، لكن الكروت المعروضة تتفلتر حسب صلاحيات المستخدم (مثال: Editor ما يشوفش كارت الإعدادات الحساسة).
- **UX Notes:** كل Card قابل للنقر وينقل مباشرة للشاشة التفصيلية المرتبطة. (تفاصيل Responsive في [14 — UI Screen Specification](../ui/14_UI_SCREEN_SPECIFICATION.md)).

### Widget Priority Classification

| Widget | الحالة | Visibility | التفاصيل |
|---|---|---|---|
| **الحجوزات الجديدة** | **Required** | كل الأدوار | عدد الطلبات `status=NEW` + قائمة آخر 5طلبات مع زر "عرض الكل" |
| **رسائل التواصل غير المقروءة** | **Required** | `contact:view` | عدد الرسائل `isRead=false` + آخر 3 رسائل |
| **الأخبار بانتظار المراجعة** | **Required** | `news:view` | عدد البوستات المزامنة `status=DRAFT` + زر الانتقال لشاشة المراجعة |
| **محادثات AI بدون إجابة** | **Required** | `ai-chat:view` | عدد الأسئلة `isUnanswered=true` آخر 24 ساعة |
| **آخر الأنشطة (Audit)** | **Required** | `audit:view` | آخر 10 أحداث مع روابط سريعة |
| **حجوزات آخر 30 يوم (Graph)** | **Optional** | `appointments:view` | رسم بياني خطي (Line Chart) — يُحمَّل من Analytics API |
| **ملخص الصفحات** | **Optional** | `pages:view` | عدد الصفحات حسب الحالة (DRAFT/PUBLISHED/ARCHIVED) |
| **إحصائيات الشات بوت** | **Optional** | `ai-chat:view` | إجمالي المحادثات، متوسط الرد، نسبة الردود التلقائية |
| **ملخص المستشفيات والمراكز** | **Future** | — | عدد المستشفيات/المراكز/NPS score — **غير مطلوب في MVP** |
| **Revenue / Billing** | **Future** | — | إحصائيات الدخل — **غير مطلوب حتى تفعيلBilling module** |
| **Team Activity Heatmap** | **Future** | — | خريطة حرارية لأنشطة الفريق — **تحسين مستقبلي** |

**قواعد العرض:**
- Widget يتطلب صلاحية لا يملكها المستخدم → لا يظهر (لا يظهر كـ "greyed out" — اختفاء تام)
- Widget ببيانات فارغة → يظهر مع Empty State (انظر `08_DESIGN_SYSTEM.md` §13) بدلاً من الاختفاء
- ترتيب Widgets: Required أولاً → Optional → Future (محجوزة لكن غير ظاهرة)
- كل Widget قابل للطي (Collapsible) مع تذكر الحالة في `localStorage`

---

## 3. Pages (القائمة + محرر Page Builder)

### 3.1 قائمة الصفحات
- **Layout:** جدول كامل العرض + زر "صفحة جديدة" أعلى اليمين.
- **Table Columns:** العنوان (AR)، Slug، الحالة (Draft/Published Badge)، آخر تعديل، بواسطة من، إجراءات.
- **Filters:** الحالة، النوع (Standard/Hidden/Legal).
- **Search:** بحث بالعنوان أو الـ Slug.
- **Buttons:** صفحة جديدة، تكرار (Duplicate)، حذف، معاينة (Preview قبل النشر).
- **Bulk Actions:** نشر جماعي، حذف جماعي (بتأكيد Modal).
- **Permissions:** `pages:view` للعرض، الباقي حسب المصفوفة في [05 — User Roles & Permissions](../security/05_USER_ROLES_AND_PERMISSIONS.md).

### 3.2 محرر الصفحة (Page Builder)
- **Layout:** شاشة كاملة مقسومة: يسار = قائمة الأقسام المضافة (Drag Handle لإعادة الترتيب)، وسط = معاينة حيّة (Live Preview)، يمين = لوحة تعديل خصائص القسم المختار، مع Tabs عربي/إنجليزي لكل حقل نصي.
- **Sections Panel:** زر "+ إضافة قسم" يفتح Modal فيه كل الـ Components المسجّلة بالـ Registry (Hero, FeatureGrid, EntityCards...) مع صورة مصغّرة توضيحية لكل نوع. (لتفاصيل كل Component، راجع [15 — Component Specification](../ui/15_COMPONENT_SPECIFICATION.md)).
- **Per-Section Controls:** تعديل المحتوى، تبديل الإظهار/الإخفاء (Toggle)، حذف، نسخ.
- **Buttons:** حفظ كمسودة، معاينة، نشر (يتطلب `pages:publish`)، سجل الإصدارات (Version History → رابط لـ Audit Log الخاص بهذه الصفحة).
- **Validation:** تحذير واضح لأي حقل عربي فارغ في قسم قبل محاولة النشر؛ منع النشر لو `name.ar`/`title.ar` ناقص.
- **UX Notes:** Autosave كل 30 ثانية كمسودة داخلية بدون التأثير على النسخة المنشورة الحالية.

---

## 4. Hospitals

- **Layout:** جدول قائمة + شاشة نموذج (Create/Edit) بنظام Tabs: `معلومات أساسية` | `المراكز الطبية المرتبطة` | `SEO` | `الأقسام الإضافية (Sections زي صفحة المستشفى)`.
- **Table Columns:** الشعار، الاسم (AR/EN)، عدد المراكز المرتبطة، الحالة، آخر تحديث.
- **Filters/Search:** الحالة، بحث بالاسم.
- **Tab "المراكز الطبية المرتبطة":** قائمة Checkboxes لكل الـ 12 مركز، مع توضيح فوري "هذا المركز مرتبط أيضاً بـ [Delta Hospital]" لو الحال كذلك.
- **Buttons:** حفظ، نشر، حذف (بتأكيد يوضح تأثير الحذف على المراكز/الأطباء المرتبطين).
- **Permissions:** حسب مصفوفة `hospitals` في [05 — User Roles & Permissions](../security/05_USER_ROLES_AND_PERMISSIONS.md).
- **Validation:** `slug` فريد، `brandColor` Hex صالح، لازم مركز طبي واحد على الأقل مرتبط قبل النشر (تحذير غير حاجب).
- **UX Notes:** معاينة مباشرة للون البراند (Color Picker + Live Swatch). (تفاصيل Responsive في [14 — UI Screen Specification](../ui/14_UI_SCREEN_SPECIFICATION.md)).

---

## 5. Medical Centers

- **Layout:** نفس نمط Hospitals، بالإضافة لـ Tab فرعي `العيادات (Clinics)` يعرض جدول قابل للتوسّع Inline لإضافة/تعديل عيادات هذا المركز وجدول عملها.
- **Table Columns:** الاسم، المستشفيات المرتبطة (Chips)، مميز (Featured Badge)، الحالة.
- **Tab "العيادات":** جدول (اسم العيادة، أيام العمل، من-إلى، إجراءات) + زر "إضافة عيادة".
- **Buttons:** حفظ، نشر، حذف، تمييز كـ Featured (يظهر في Homepage).
- **Permissions:** حسب `medical-centers` في [05 — User Roles & Permissions](../security/05_USER_ROLES_AND_PERMISSIONS.md).
- **Validation:** لازم مستشفى واحد مرتبط على الأقل قبل النشر؛ في العيادات: `from < to` وعدم تكرار نفس اليوم لنفس العيادة.
- **UX Notes:** عند اختيار مستشفى جديد للربط، تظهر رسالة توضيحية عن عدد المراكز الطبية المرتبطة بكل مستشفى كمرجع فقط (Informational، غير مانعة). راجع بيانات الزراعة في 16_SEED_DATA_SPECIFICATION.md للتوزيع الحالي.

---

## 6. Doctors

- **Layout:** جدول + نموذج بـ Tabs: `بيانات أساسية` | `الارتباطات (مستشفيات/مراكز)` | `السيرة الذاتية`.
- **Table Columns:** الصورة، الاسم، التخصص، المستشفيات المرتبطة، مميز، الحالة.
- **Filters/Search:** حسب مستشفى، حسب مركز، حسب تخصص، بحث بالاسم.
- **Buttons:** حفظ، نشر، حذف، تمييز Featured.
- **Permissions:** حسب `doctors` في [05 — User Roles & Permissions](../security/05_USER_ROLES_AND_PERMISSIONS.md).
- **Validation:** لازم مستشفى واحد على الأقل مرتبط قبل النشر.
- **Bulk Actions:** تمييز/إلغاء تمييز جماعي.

---

## 7. News & Media

- **Layout:** Tabs علوية: `الكل` | `يدوي` | `من السوشيال ميديا (بانتظار المراجعة)`.
- **Table Columns:** الصورة المصغّرة، العنوان، المصدر (شارة Manual/Facebook/Instagram/LinkedIn)، التصنيف، الحالة، تاريخ النشر.
- **Filters/Search:** التصنيف، المصدر، المستشفى المرتبط، بحث بالعنوان.
- **Tab "بانتظار المراجعة":** لكل بوست متزامن — معاينة المحتوى الأصلي + رابط المصدر + زرّي "نشر" / "تجاهل"، وزر "مزامنة الآن" أعلى الصفحة (يستدعي `POST /admin/news/sync/trigger` وفقاً لـ [04 — API Specification](../api/04_API_SPECIFICATION.md)) مع مؤشر تقدّم.
- **Editor (يدوي):** محرر نصوص غني (Rich Text) بـ Tabs عربي/إنجليزي، رفع صورة رئيسية (من Media Library)، اختيار تصنيف ومستشفى مرتبط.
- **Buttons:** حفظ مسودة، جدولة نشر (Scheduled Publishing بتاريخ/وقت محدد)، نشر فوري، حذف.
- **Permissions:** حسب `news` في [05 — User Roles & Permissions](../security/05_USER_ROLES_AND_PERMISSIONS.md).
- **Bulk Actions:** نشر جماعي للمراجَعات المزامنة، حذف جماعي.
- **UX Notes:** شارة واضحة "منشور تلقائياً من فيسبوك — يحتاج مراجعة" لتفادي أي التباس مع المحتوى اليدوي.

---

## 8. Media Library

- **Layout:** شبكة صور/ملفات (Grid) + شريط جانبي للمجلدات (Tree) + شريط علوي للرفع والبحث.
- **Filters/Search:** النوع (صورة/فيديو/PDF)، المجلد، الوسوم (Tags)، بحث بالاسم.
- **Buttons:** رفع ملف (Drag & Drop متعدد)، مجلد جديد، حذف، استبدال ملف (Replace — يحافظ على نفس الـ URL فتتحدث كل الأماكن المستخدم فيها تلقائياً).
- **Bulk Actions:** نقل لمجلد آخر، حذف جماعي، إضافة وسم جماعي.
- **Permissions:** حسب `media` في [05 — User Roles & Permissions](../security/05_USER_ROLES_AND_PERMISSIONS.md).
- **Validation:** حدود الحجم/النوع حسب Settings (راجع [04 — API Specification](../api/04_API_SPECIFICATION.md) قسم 2).
- **UX Notes:** عرض "مُستخدَم في: [قائمة الصفحات/الكيانات]" لأي ملف قبل حذفه لمنع كسر الروابط بالخطأ.

---

## 9. Appointments / Leads

- **Layout:** جدول + شريط Kanban اختياري (حسب الحالة: جديد/تم التواصل/مؤكد/ملغي/مكتمل).
- **Table Columns:** الاسم، الهاتف، المستشفى/المركز المطلوب، التاريخ المفضل، الحالة، تاريخ الإرسال.
- **Filters/Search:** الحالة، المستشفى، المركز، نطاق تاريخ.
- **Buttons:** تغيير الحالة (Dropdown مباشر بالجدول)، عرض التفاصيل، تصدير Excel/CSV.
- **Permissions:** حسب `appointments` في [05 — User Roles & Permissions](../security/05_USER_ROLES_AND_PERMISSIONS.md).
- **Bulk Actions:** تغيير حالة جماعي، تصدير محدد.
- **UX Notes:** تنبيه بصري (نقطة حمراء) على الشريط الجانبي لعدد الطلبات "جديد" غير المُتابَعة.

---

## 10. Contact Submissions

- **Layout:** جدول بسيط + Drawer لعرض تفاصيل الرسالة كاملة.
- **Table Columns:** الاسم، البريد، الموضوع، تاريخ الإرسال، حالة القراءة.
- **Filters/Search:** مقروء/غير مقروء، بحث بالاسم/البريد.
- **Buttons:** تحديد كمقروء، رد عبر البريد (يفتح Mail Client)، حذف.
- **Permissions:** حسب `contact` في [05 — User Roles & Permissions](../security/05_USER_ROLES_AND_PERMISSIONS.md).

---

## 11. Testimonials

- **Layout:** جدول + نموذج بسيط (Modal).
- **Table Columns:** الاسم، الفئة (مستثمر/طبيب/مريض)، الحالة، الترتيب.
- **Buttons:** إضافة، تعديل، حذف، إعادة ترتيب (Drag).
- **Permissions:** حسب `testimonials` في [05 — User Roles & Permissions](../security/05_USER_ROLES_AND_PERMISSIONS.md).
- **Validation:** `quote.ar` مطلوب، الفئة مطلوبة.

---

## 12. Navigation & Footer

- **Layout:** شجرة عناصر (Tree) قابلة للسحب لإعادة الترتيب، تبويب منفصل لـ Header و Footer.
- **Buttons:** إضافة عنصر (يربط بصفحة داخلية من Dropdown أو رابط خارجي)، حذف، تفعيل/تعطيل ظهور.
- **Permissions:** حسب `navigation` في [05 — User Roles & Permissions](../security/05_USER_ROLES_AND_PERMISSIONS.md).
- **Validation:** منع أكتر من مستوى تداخل واحد (Parent > Child فقط).
- **UX Notes:** معاينة حيّة مصغّرة للـ Header/Footer جنب المحرر.

---

## 13. Users & Roles

### 13.1 Users
- **Table Columns:** الاسم، البريد، الدور، الحالة (نشط/معطّل)، آخر دخول.
- **Buttons:** دعوة مستخدم جديد (بريد بدعوة + كلمة مرور مؤقتة)، تعطيل/تفعيل، تغيير الدور، حذف.
- **Permissions:** `users:manage` (Admin/Super Admin فقط).
- **Validation:** لا يمكن لدور أقل إنشاء دور أعلى منه (راجع [05 — User Roles & Permissions](../security/05_USER_ROLES_AND_PERMISSIONS.md)).

### 13.2 Roles
- **Layout:** قائمة الأدوار الخمسة + محرر مصفوفة صلاحيات (Checkboxes) لكل وحدة×فعل — **مقصور على `SUPER_ADMIN` فقط**.
- **UX Notes:** تحذير واضح عند تعديل صلاحيات دور له مستخدمون نشطون حالياً.

---

## 14. Settings

**Layout عام:** Tabs جانبية: `عام` | `الهوية البصرية (Brand)` | `SEO` | `اللغات` | `السوشيال ميديا والتكاملات` | `الأمان`

- **عام:** بيانات تواصل المنصة، الشعار، Favicon، الوقت (Timezone)، نص صفحة 404.
- **Brand:** الألوان الأساسية (تُستخدم كـ Fallback لو مستشفى معين ما حدّدش لون خاص)، الخطوط، الشعار بصيغ متعددة.
- **SEO:** meta افتراضية للموقع، ربط `GA4 Measurement ID` / `GTM Container ID`، تفعيل/تعطيل Sitemap العام، robots.txt مخصص.
- **اللغات:** اللغة الافتراضية، تفعيل/تعطيل لغة، (بنية جاهزة لإضافة لغة ثالثة مستقبلاً).
- **السوشيال ميديا والتكاملات:** روابط صفحات INSAN/Future/Delta، توكنز Facebook/Instagram/LinkedIn (مموّهة بعد الحفظ)، تفعيل/تعطيل المزامنة التلقائية وتكرارها.
- **الأمان:** سياسة كلمة المرور، مدة صلاحية الجلسة، تفعيل reCAPTCHA للنماذج العامة.
- **Permissions:** حسب `settings` في [05 — User Roles & Permissions](../security/05_USER_ROLES_AND_PERMISSIONS.md) (Integrations مقصورة على Admin/Super Admin).

---

## 15. AI Assistant

- **Tabs:** `الإعدادات العامة` | `قاعدة المعرفة (Knowledge Base)` | `المحادثات` | `التحليلات`
- **الإعدادات العامة:** تفعيل/تعطيل الميزة، رسالة الترحيب (AR/EN)، تفعيل التصعيد لواتساب، رقم واتساب المستخدَم للتصعيد.
- **قاعدة المعرفة:** جدول (الموضوع، السؤال، الإجابة، الحالة) + نموذج إضافة/تعديل بـ Tabs عربي/إنجليزي + Bulk Import (رفع ملف CSV/Excel للأسئلة الشائعة دفعة واحدة).
- **المحادثات:** جدول (تاريخ البدء، عدد الرسائل، تم التصعيد؟) + معاينة كاملة للمحادثة عند الفتح.
- **التحليلات:** أكتر الأسئلة تكراراً، نسبة الأسئلة "بدون إجابة واضحة" (مصدر ممتاز لتغذية قاعدة المعرفة باستمرار).
- **Permissions:** حسب `ai-chat` في [05 — User Roles & Permissions](../security/05_USER_ROLES_AND_PERMISSIONS.md).

---

## 16. Audit Log

- **Layout:** جدول قابل للفلترة فقط (Read-only بالكامل).
- **Table Columns:** التاريخ/الوقت، المستخدم، الفعل (Create/Update/Delete/Publish/Login)، الكيان، رابط "عرض التفاصيل" (يفتح Diff قبل/بعد).
- **Filters:** المستخدم، نوع الفعل، الكيان، نطاق تاريخ.
- **Permissions:** `audit:view`.
- **UX Notes:** لا يوجد أي زر تعديل أو حذف على الإطلاق في هذه الشاشة — سجل غير قابل للتلاعب.

---

## 17. سياسة تعارض التعديل (Draft Editing Conflict Policy)

### النموذج: Last-Write-Wins مع Optimistic Locking

| الخاصية | القرار |
|---|---|
| **النموذج** | **Optimistic Locking** — كل سجل يحتوي على حقل `updatedAt` |
| **آليّة العمل** | عند فتح تحرير: الـ Frontend يحفظ `updatedAt` الحالي كـ `savedVersion`. عند الحفظ: يُرسل `PATCH` مع `expectedUpdatedAt=savedVersion`. إذا تغيّر `updatedAt` على السيرفر (أي أحد حفظ قبلنا): يُرفض الطلب بخطأ `409 CONFLICT`. |
| **Record Locking (قفل دائم)** | **غير مُستخدَم** — يسبب تعليق المستخدمين ومشاكل في بيئة Multi-tab |

### سلوك التعامل مع التعارض

**عند اكتشاف تعارض (409):**
1. يظهر Dialog للمستخدم:

```
┌──────────────────────────────────────────┐
│  ⚠ تعديل متزامن مكتشف  │
│                                          │
│  مستخدم آخر (Ahmed) قام بتعديل هذا      │
│  السجل في 2:34 م.                        │
│                                          │
│  ╭─────────────╮  ╭──────────────╮       │
│  │ استرجاع إصداري │  │ الحفظ على أي حال │       │
│  ╰─────────────╯  ╰──────────────╯       │
│                                          │
│  ╭──────────────────╮                    │
│  │ عرض التغييرات      │                    │
│  ╰──────────────────╯                    │
└──────────────────────────────────────────┘
```

2. **خيارات المستخدم:**
   - **"استرجاع إصداري"** → يُحمَّل الإصدار الحالي من السيرفر (الذي حفظه المستخدم الآخر) ويُعرض في المحرر
   - **"الحف�� على أي حال"** → يُرسل الطلب مرة أخرى بدون `expectedUpdatedAt` (يتجاوز الـ Lock)
   - **"عرض التغييرات"** → يفتح `AuditDiffViewer` مقارنة بين نسخة المستخدم والإصدار الحالي

**في areas غير حرجة (News, Testimonials):**
- يمكن ت简单化 لـ **Last-Write-Wins بدون Dialog** — الإشعار فقط: "تم تحديث هذا السجل من مستخدم آخر. التغييرات الحالية تعكس آخر إصدار."

### الاستثناءات

| الكيان | السلوك |
|---|---|
| **Pages (Page Builder)** | Autosave مُستقل عن النسخة المنشورة — لا تعارض ممكن مع النشر لأن Autosave يخزّن في Draft فقط |
| **Settings** | Last-Write-Wins بحت (آخر من يحفظ يفوز) — الأثر جيد لأن الإعدادات عادة تُعدَّل من شخص واحد |
| **Navigation** | Optimistic Locking — لأن إعادة الترتيب قد تتداخل |

---

## 18. مصفوفة تغطية Audit Log (Audit Log Coverage Matrix)

> **القاعدة العامة:** كل عملية CRUD + Publish + Login/Logout تُسجَّل. الاستثناءات مُوضّحة أدناه.

| الكيان | Create | Update | Delete | Publish | Unpublish | Status Change | Bulk Actions | Login/Logout |
|---|---|---|---|---|---|---|---|---|
| **Page** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ (bulk publish/delete) | — |
| **Section** (under Page) | ✅ | ✅ | ✅ | — | — | — | ✅ (reorder) | — |
| **Hospital** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — | — |
| **MedicalCenter** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — | — |
| **Clinic** | ✅ | ✅ | ✅ | — | — | — | — | — |
| **Doctor** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ (feature toggle) | — |
| **NewsPost** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ (bulk publish/delete) | — |
| **NewsCategory** | ✅ | ✅ | ✅ | — | — | — | — | — |
| **Media** | ✅ | ✅ | ✅ | — | — | — | ✅ (bulk delete/move) | — |
| **MediaFolder** | ✅ | ✅ | ✅ | — | — | — | — | — |
| **NavigationItem** | ✅ | ✅ | ✅ | — | — | — | ✅ (reorder) | — |
| **Testimonial** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — | — |
| **User** | ✅ | ✅ | ✅ | — | — | ✅ (activate/disable) | — | — |
| **Role** | — | ✅ | — | — | — | — | — | — |
| **Setting** | — | ✅ | — | — | — | — | — | — |
| **IntegrationSetting** | — | ✅ | ✅ | — | — | ✅ (enable/disable) | — | — |
| **AiKnowledgeBase** | ✅ | ✅ | ✅ | — | — | — | ✅ (bulk import) | — |
| **AiSettings** | — | ✅ | — | — | — | — | — | — |
| **AppointmentRequest** | — | — | — | — | — | ✅ | ✅ (bulk status) | — |
| **ContactSubmission** | — | — | ✅ | — | — | ✅ (read/unread) | ✅ (bulk delete) | — |
| **Auth** | — | — | — | — | — | — | — | ✅ (login, logout, refresh, forgot-password) |

### هيكل Audit Log Record

```json
{
  "id": "audit_cuid",
  "userId": "user_cuid",
  "action": "create | update | delete | publish | unpublish | status_change | bulk | login | logout",
  "entity": "Page | Hospital | ...",
  "entityId": "entity_cuid",
  "before": { /* snapshot قبل التغيير — null للإنشاء */ },
  "after": { /* snapshot بعد التغيير — null للحذف */ },
  "metadata": {
    "bulkCount": 5,           // فقط للعمليات الجماعية
    "source": "admin_ui",     // أو "api", "sync", "scheduled_job"
    "reason": "scheduled_publish" // اختياري — سبب العملية
  },
  "ipAddress": "192.168.1.x",
  "createdAt": "2026-07-16T10:30:00Z"
}
```

### الاستثناءات (لا يُسجَّل في Audit Log)

| العملية | السبب |
|---|---|
| **قراءة (GET)** | تأثير الأداء — لا قيمة تأريخية |
| ** Autosave** | يُسجَّل كـ Draft version وليس Audit — كثرة التسجيل تُثقل القاعدة |
| **تعديل Profile الخاص** | المستخدم يعدل بياناته الخاصة — لا يتطلب تدقيقاً |
| **البحث (Search)** | لا قيمة تأريخية |

---

## 19. قواعد الحماية عند حذف الوسائط (Media Usage Protection Rules)

### القاعدة العامة

**لا يُسمح بحذف ملف وسائط مُستخدَم حالياً في أي كيان آخر** — الحذف يُرفض برسالة واضحة.

### آليّة الفحص

```
عند محاولة حذف Media ID:

1. البحث في كل الحقول من نوع String في كل الكيانات:
   - Page.ogImage, Section.config (كل المكونات)
   - Hospital.heroImage, Hospital.logoUrl
   - MedicalCenter.heroImage
   - Doctor.photo
   - NewsPost.featuredImage
   - Testimonial.photo
   - Setting.value (الصور في الإعدادات العامة)
   - AiKnowledgeBase (أي مرجع لصورة)

2. لو وُجد أي مرجع → رفض الحذف:
   {
     "success": false,
     "error": {
       "code": "MEDIA_IN_USE",
       "message": "لا يمكن حذف هذا الملف لأنه مستخدم في 3 أماكن",
       "details": {
         "references": [
           { "entity": "Hospital", "field": "heroImage", "id": "hospital_abc" },
           { "entity": "NewsPost", "field": "featuredImage", "id": "news_xyz" },
           { "entity": "Section", "field": "config.backgroundImage", "id": "section_123" }
         ]
       }
     }
   }
```

### سلوك الحذف الجماعي (Bulk Delete)

| الحالة | السلوك |
|---|---|
| **كل الملفات متاحة للحذف** | يُنفَّذ الحذف مع عرض النتيجة: "تم حذف 5 ملفات" |
| **بعض الملفات مُستخدَمة** | يُنفَّذ حذف المتاحين فقط + تقرير: "تم حذف 3 ملفات. لم يتم حذف 2 ملفات لأنها مُستخدمة: [قائمة]" |
| **كل الملفات مُستخدمة** | لا حذف + رسالة: "لا يمكن حذف أي من الملفات المحددة لأنها جميعاً مُستخدمة حالياً" |

### الاستثناءات

| الحالة | السلوك |
|---|---|
| **"استبدال ملف" (Replace)** | يُسمَح — الملف القديم يُستبدل بالجديد،🤹保持 same `id`/`url` |
| **تأكيد يدوي مع "Force"** | غير مُستخدَم في MVP — **لا يوجد `?force=true` للوسائط** |

---

## 20. قواعد العمليات الجماعية (Bulk Operation Rules)

### الحد الأقصى للدفعة (Maximum Batch Size)

| نوع العملية | الحد الأقصى | السبب |
|---|---|---|
| **حذف جماعي** | **50 عنصر** | تجنب ازدحام القاعدة + ضمان أن العملية تنتهي بسرعة معقولة |
| **نشر/إلغاء نشر جماعي** | **50 عنصر** | — |
| **تغيير حالة جماعي** (Appointments) | **100 عنصر** | عمليات أخف وزناً (حقل واحد فقط يتغير) |
| **نقل وسائط جماعي** | **100 ملف** | — |
| **إضافة وسوم جماعية** | **100 ملف** | — |
| **تصدير** | **بدون حد** | تصدير لا يُعدّل بيانات |

### متطلبات التأكيد (Confirmation Requirements)

| نوع العملية | تأكيد مطلوب؟ | نوع التأكيد |
|---|---|---|
| **حذف جماعي** | **نعم** | Modal: "هل أنت متأكد من حذف {count} عنصر؟ هذا الإجراء لا يمكن التراجع عنه." + كتابة "حذف" للتأكيد |
| **نشر جماعي** | **نعم** | Modal: "نشر {count} عنصر. هل تريد المتابعة؟" |
| **تغيير حالة جماعي** | **نعم** | Modal يوضح الحالة الجديدة والعدد المتأثر |
| **نقل وسائط** | **نعم** | Modal: "نقل {count} ملف إلى مجلد '{folderName}'" |
| **تصدير** | **لا** | تنفيذ مباشر |

### معالجة الأخطاء الجزئية (Partial Failure)

```
عند تنفيذ عملية جماعية:

1. كل عنصر يُعالج في transaction مستقل داخل batch
2. العناصر الناجحة تُحفَظ، الفاشلة تتخطى
3. الاستجابة تُرجع دائماً:

{
  "success": true,
  "data": {
    "total": 10,
    "succeeded": 8,
    "failed": 2,
    "errors": [
      { "id": "abc", "reason": "MEDIA_IN_USE", "message": "الملف مُستخدم في صفحة Home" },
      { "id": "def", "reason": "VALIDATION_ERROR", "message": "العنوان مطلوب" }
    ]
  }
}
```

**القاعدة:** العملية تُعتبر "ناجحة جزئياً" (200) إذا نجح ≥ عنصر واحد. تُعتبر "فاشلة بالكامل" (400) إذا فشل كل العناصر.

### سياسة التراجع (Undo Policy)

| نوع العملية | تراجع ممكن؟ | الآلية |
|---|---|---|
| **حذف جماعي** | **لا** في MVP | لا يوجد Undo queue — يُسجَّل في Audit Log مع `before` snapshot فقط |
| **نشر جماعي** | **نعم** (غير مباشر) | يمكن إلغاء النشر جماعياً (unpublish) — الحالة تعود DRAFT |
| **تغيير حالة** | **نعم** | يمكن تغيير الحالة مرة أخرى يدوياً |
| **نقل وسائط** | **نعم** (غير مباشر) | يمكن نقل الملفات للمجلد الأصلي مرة أخرى |

**ملاحظة مستقبلية:** نظام Undo مُنقَّذ يُمكن إضافته عبر Audit Log + scheduled "revert" jobs — البنية الحالية تدعم ذلك بدون تعديل Schema.

---

**التالي:** [07 — UI Component Inventory](../ui/07_UI_COMPONENT_INVENTORY.md)