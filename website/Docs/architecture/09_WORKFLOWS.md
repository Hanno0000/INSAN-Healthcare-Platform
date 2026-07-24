# 09 — Workflows (Replit Implementation)

# 09 — توثيق كل الـ Workflows التشغيلية (Complete Workflow Documentation)

> **Document Version:** 1.1
> **Status:** Final
> **Last Updated:** 2025-07-16
> **Source of Truth:** Yes

> لتوثيق الـ API endpoints المستخدمة في كل workflow، راجع [04 — API Specification](../api/04_API_SPECIFICATION.md). لتفاصيل شاشات لوحة التحكم المذكورة أدناه، راجع [06 — Admin Dashboard Specification](../admin/06_ADMIN_DASHBOARD_SPECIFICATION.md).

---

## 1. Authentication Workflow

1. المستخدم يفتح `/admin/login` ويدخل `email` + `password`.
2. الـ Frontend يستدعي `POST /auth/login` (وفقاً لـ [04 — API Specification](../api/04_API_SPECIFICATION.md)).
3. الـ Backend يتحقق من `email` موجود و`isActive=true`، ثم يقارن `password` بـ `passwordHash` (Argon2).
4. لو صحيح: يُنشأ `accessToken` (JWT، صلاحية 15 دقيقة) + `refreshToken` (صلاحية 7 أيام، يُخزَّن Hash منه في `RefreshToken` ويُرسَل كـ `httpOnly Secure Cookie`).
5. يُحدَّث `User.lastLoginAt` + يُسجَّل `AuditLog(action=login)`.
6. الـ Frontend يخزّن `accessToken` في الذاكرة (State) فقط — **ليس** في `localStorage` (حماية من XSS).
7. كل طلب لاحق للـ API يُرفَق بـ `Authorization: Bearer <accessToken>`.
8. عند انتهاء صلاحية الـ `accessToken` (401)، الـ Frontend يستدعي `POST /auth/refresh` تلقائياً (بالاعتماد على الـ Cookie) للحصول على واحد جديد، بدون تدخل المستخدم.
9. لو الـ `refreshToken` نفسه منتهي/مُبطَل → تحويل تلقائي لصفحة تسجيل الدخول.
10. تسجيل الخروج: `POST /auth/logout` يُبطل الـ `RefreshToken` الحالي ويمسح الـ Cookie + `AuditLog(action=logout)`.

---

## 2. User & Role Management Workflow

1. `SUPER_ADMIN`/`ADMIN` يفتح شاشة Users ← "دعوة مستخدم جديد" ([06 — Admin Dashboard Specification](../admin/06_ADMIN_DASHBOARD_SPECIFICATION.md)).
2. يدخل الاسم، البريد، الدور المطلوب (النظام يمنع اختيار دور أعلى من صلاحية الداعي نفسه — راجع [05 — User Roles & Permissions](../security/05_USER_ROLES_AND_PERMISSIONS.md)).
3. عند الحفظ: يُنشأ `User` بكلمة مرور مؤقتة عشوائية، وتُرسَل رسالة بريد فيها رابط "تعيين كلمة مرور" (صالح 24 ساعة).
4. المستخدم الجديد يفتح الرابط، يضع كلمة مرور دائمة (حسب قواعد Settings > Security)، ويصبح الحساب `isActive=true` وجاهز للدخول.
5. تعديل دور مستخدم لاحقاً: تغيير فوري، لكن الـ `accessToken` الحالي للمستخدم (لو شغّال حالياً) يفضل بالصلاحيات القديمة لحد ما ينتهي (Max 15 دقيقة) أو يعمل Refresh — هذا سلوك مقصود ومقبول أمنياً.
6. تعطيل مستخدم (`isActive=false`): يمنعه من تسجيل دخول جديد فوراً، لكن لا يبطل جلسته الحالية النشطة تلقائياً إلا بعد انتهاء الـ accessToken — **(نقطة تحتاج قرار مستقبلي لو مطلوب إبطال فوري، عبر قائمة Token Blacklist).**

---

## 3. Page Publishing Workflow (Draft → Review → Publish → Rollback)

### 3.1 الخطوات الأساسية

1. `EDITOR` ينشئ صفحة/يعدّل صفحة موجودة عبر Page Builder ([06 — Admin Dashboard Specification](../admin/06_ADMIN_DASHBOARD_SPECIFICATION.md)) → تُحفَظ تلقائياً كـ `status=DRAFT` (Autosave كل 30 ثانية).
2. `EDITOR` يضغط "إرسال للمراجعة" (اختياري - إشعار داخلي لـ `MANAGER`).
3. `MANAGER`/`ADMIN` يفتح الصفحة بوضع Preview، يراجع المحتوى (تحقق يدوي من مطابقة نبرة البراند حسب `AI_CREATIVE_CONSTITUTION.md`).
4. عند الموافقة: يضغط "نشر" → الـ API يتحقق من اكتمال الحقول الإجبارية (AR على الأقل) → `status=PUBLISHED`, `publishedAt=now()`.
5. `AuditLog(action=publish)` يُسجَّل مع نسخة كاملة من المحتوى وقت النشر.
6. لو احتاج رجوع لنسخة سابقة: من شاشة Audit Log ([06 — Admin Dashboard Specification](../admin/06_ADMIN_DASHBOARD_SPECIFICATION.md))، اختيار أي إصدار سابق لنفس الصفحة → زر "استرجاع هذا الإصدار" → يُنشئ تحديث جديد بنفس محتوى النسخة القديمة (وليس حذف تاريخ — الاسترجاع نفسه يُسجَّل كحدث Audit جديد).

### 3.2 النشر الفوري مقابل المجدول (Immediate vs Scheduled Publishing)

| نوع النشر | آلية التنفيذ | متى يظهر المحتوى |
|---|---|---|
| **نشر فوري** | `POST /admin/pages/:id/publish` → `status=PUBLISHED`, `publishedAt=now()` | فوراً — ISR revalidation ينفَّذ خلال ثوانٍ |
| **جدولة نشر** | `POST /admin/pages/:id/publish` مع `scheduledAt: "2026-08-01T09:00:00Z"` → `status=SCHEDULED`, `scheduledAt` يُخزَّن | عند الوصول للوقت المحدد عبر Background Job (Cron يتحقق كل دقيقة) |

**سلوك الجدولة:**
- الصفحة تبقى بحالة `DRAFT` حتى يصل الوقت → ثم تتحول `PUBLISHED` تلقائياً
- يُمكن إلغاء الجدولة (إرجاع لـ `DRAFT`) قبل الوصول للوقت
- لو الخادم توقف قبل الوصول للوقت → عند التشغيل يتحقق من كل الصفحات `status=SCHEDULED` وينشر المتأخرة
- لا يُسمح بجدولة تاريخ في الماضي (FAL 400: "scheduledAt must be in the future")

### 3.3 Cache Invalidation بعد النشر

```
بعد كل نشر/تعديل/حذف لصفحة:

1. ISR Revalidation:
   → revalidatePath(`/${locale}/${page.slug}`)
   → revalidatePath(`/${locale}`)          // الصفحة الرئيسية (لو الصفحة تظهر فيها)
   → revalidatePath(`/sitemap.xml`)        // خريطة الموقع

2. CDN Cache Purge (لو مُستخدَم):
   → Purge: `/en/${slug}`, `/ar/${slug}`
   → Purge: `/en`, `/ar` (الرئيسية)
   → لا يُبرَّأ كل الموقع — فقط المسارات المتأثرة

3. Client-side Cache (React Query):
   → queryClient.invalidateQueries({ queryKey: ['page', slug] })
   → لا يُبرَّأ cache المستخدمين الآخرين — ينتظرون انتهاء stale time (60s)
```

| نوع التغيير | نطاق Cache Invalidation |
|---|---|
| **نشر صفحة جديدة** | الصفحة + الرئيسية + sitemap |
| **تعديل صفحة منشورة** | الصفحة + الرئيسية (لو تظهر فيها) + sitemap |
| **حذف صفحة** | الرئيسية + sitemap + صفحة 404 مخصصة |
| **تعديل إعدادات عامة** (Brand, SEO) | كل الصفحات ISR تتم إعادة توليدها (full revalidation) |
| **تعديل Navigation** | Header + Footer في كل الصفحات |

### 3.4 تجديد خريطة الموقع (Sitemap Regeneration)

| الحدث | السلوك |
|---|---|
| **نشر/تعديل/حذف صفحة** | `revalidatePath('/sitemap.xml')` — Next.js يعيد توليدها تلقائياً |
| **إضافة/حذف مستشفى أو مركز** | إعادة توليد sitemap لأن URLs تتغير |
| **تغيير slug** | sitemap يتحدث فوراً + يُنشأ redirect من slug القديم (انظر `03_DATABASE_SCHEMA.md` §7) |
| **تغيير `robotsIndex`** | الصفحة تختفي/تظهر من sitemap فوراً |

**محتوى sitemap.xml:**
```xml
<urlset>
  <url>
    <loc>https://insan-platform.com/en</loc>
    <xhtml:link rel="alternate" hreflang="ar" href="https://insan-platform.com/ar" />
    <xhtml:link rel="alternate" hreflang="en" href="https://insan-platform.com/en" />
    <lastmod>2026-07-16</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  <!-- ... كل صفحة status=PUBLISHED + robotsIndex=true -->
  <!-- صفحة Investors غائبة تماماً (noindex + غير موجودة في sitemap) -->
</urlset>
```

### 3.5 تجديد Metadata (Metadata Refresh)

بعد كل نشر/تعديل:

| الحقل | السلوك |
|---|---|
| **metaTitle / metaDescription** | يتحدث فوراً في الـ `<head>` عبر ISR |
| **ogImage** | يتحدث في Open Graph tags (يُختبر بـ `curl` أو Facebook Sharing Debugger) |
| **canonicalUrl** | يتحدث تلقائياً حسب slug الحالي |
| **hreflang tags** | يتحدثان تلقائياً (روابط AR/EN互为替代) |
| **JSON-LD (Structured Data)** | يتحدث تلقائياً حسب نوع الصفحة + البيانات المنظمة |

**ملاحظة:** لا يوجد "Search Engine Ping" يدوي — Google/Bing يزور sitemap.xml بشكل دوري (عادة كل 24-48 ساعة). يُمكن إضافة IndexNow API مستقبلاً للإخطار الفوري.

### 3.6 محركات البحث والفهرسة (Search Indexing)

| الحدث | Indexed؟ | الآلية |
|---|---|---|
| **نشر صفحة جديدة** | **نعم** (متأخر) | Google/Bing يزور sitemap.xml ويفهرس الصفحة خلال 24-78 ساعة |
| **تعديل صفحة منشورة** | **نعم** (متأخر) | يُحدَّث عند إعادة الزوار |
| **حذف صفحة** | يُإزالة من sitemap | يُزال تلقائياً من sitemap — ينتظار Google لإعادة الزوار (أسبوع تقريباً) |
| **صفحة `robotsIndex=false`** | **لا** | تظهر في sitemap بـ `<robots>noindex</robots>` + meta tag |

**ملاحظة MVP:** لا يوجد Algolia/MeiliSearch/TypeSense للبحث الداخلي. بحث الموقع العام يعتمد على Google Site Search أو بحث بسيط عبر API. يُمكن إضافة محرك بحث داخلي مستقبلاً.

---

## 4. Hospital / Medical Center Content Management Workflow

1. إنشاء مستشفى/مركز جديد بحالة `DRAFT`.
2. ربط المركز الطبي بمستشفى واحد أو أكثر عبر Tab "المراكز المرتبطة" (`HospitalMedicalCenter`).
3. إضافة العيادات وجداول عملها داخل تبويب المركز.
4. ربط الأطباء بالمستشفى/المركز.
5. مراجعة SEO (meta عربي/إنجليزي).
6. نشر (`publish`) — يتطلب `hospitals:publish` أو `medical-centers:publish` (وفقاً لـ [05 — User Roles & Permissions](../security/05_USER_ROLES_AND_PERMISSIONS.md)).
7. أي تعديل لاحق بعد النشر يُحفَظ فوراً (لا يوجد "مسودة منفصلة" بعد أول نشر إلا لو النظام طُوِّر لاحقاً بميزة Draft-after-publish — **غير مطلوبة في MVP**، التعديل الحالي = تحديث مباشر مع تسجيل Audit).

---

## 5. Doctor & Clinic Schedule Management Workflow

1. إضافة طبيب جديد بحالة `DRAFT`، رفع صورة من Media Library.
2. ربطه بمستشفى/مركز واحد أو أكثر.
3. داخل شاشة Medical Center → Tab العيادات: إضافة عيادة، تحديد الأيام والأوقات (`schedule Json`).
4. عند تعارض أوقات (نفس اليوم مكرر لنفس العيادة) → الفاليديشن يمنع الحفظ برسالة واضحة.
5. نشر الطبيب → يظهر تلقائياً في Doctors Directory + صفحات المستشفى/المركز المرتبط.

---

## 6. News Publishing Workflow (يدوي)

1. `EDITOR` يفتح "خبر جديد" ([06 — Admin Dashboard Specification](../admin/06_ADMIN_DASHBOARD_SPECIFICATION.md)) → يكتب العنوان والمحتوى (AR/EN)، يختار تصنيف ومستشفى مرتبط (اختياري)، يرفع صورة رئيسية.
2. حفظ كـ `DRAFT`.
3. خيار "جدولة نشر" (`publishedAt` بتاريخ مستقبلي) — Job مجدول يغيّر `status` تلقائياً لـ `PUBLISHED` عند وصول الموعد.
4. أو نشر فوري (`MANAGER`+).
5. الخبر يظهر تلقائياً في News List + NewsGrid بالصفحة الرئيسية.

---

## 7. Social Media Sync Workflow (تلقائي)

1. مهمة مجدولة (Cron، كل 30-60 دقيقة حسب Settings) تعمل داخل الـ Background Worker.
2. لكل حساب مفعّل في `IntegrationSetting` (facebook_page_insan, facebook_page_future, ...): استدعاء الـ API الرسمي لجلب آخر المنشورات.
3. لكل منشور جديد (بمقارنة `externalPostId` غير موجود مسبقاً): تحميل الوسائط ونسخها لتخزيننا، إنشاء `NewsPost` بـ `sourceType=social_sync`, `status=DRAFT` (أو `PUBLISHED` مباشرة لو خيار "نشر تلقائي" مفعّل من Settings).
4. إشعار داخلي لفريق News بعدد البوستات الجديدة بانتظار المراجعة.
5. `MANAGER` يراجع كل بوست في Tab "بانتظار المراجعة" ([06 — Admin Dashboard Specification](../admin/06_ADMIN_DASHBOARD_SPECIFICATION.md)) → يعدّل الترجمة الإنجليزية لو ناقصة → ينشر أو يتجاهل.
6. لو فشلت المزامنة (Token منتهي الصلاحية مثلاً) → تسجيل الخطأ + إشعار للأدمن لتجديد الـ Token من Settings.

---

## 8. Media Upload & Reuse Workflow

1. رفع ملف من أي شاشة (مباشرة أو من مكتبة الوسائط) → يُخزَّن على S3-compatible storage، يُرجَع `url`.
2. توليد نسخ مصغّرة (Thumbnails) تلقائياً للصور (عدة مقاسات لتحسين الأداء).
3. الملف يظهر فوراً في Media Library، قابل للبحث بالاسم/الوسوم/النوع.
4. إعادة الاستخدام: أي حقل صورة بأي نموذج يفتح Media Library ويختار الملف الموجود بدل رفع نسخة مكررة.
5. استبدال ملف (Replace): يحافظ على نفس `id`/`url`، فكل الأماكن المستخدم فيها تتحدث تلقائياً بدون تعديل يدوي.
6. حذف ملف: تحذير لو مستخدَم في أي مكان حالياً (Reference check) قبل الحذف النهائي.

---

## 9. Appointment Request Workflow

1. زائر يملأ `AppointmentForm` من أي صفحة → `POST /appointments` (وفقاً لـ [04 — API Specification](../api/04_API_SPECIFICATION.md)).
2. تحقق من الفاليديشن + Rate Limit.
3. إنشاء سجل `AppointmentRequest(status=NEW)`.
4. إشعار فوري لفريق العمليات (بريد/لوحة تحكم — تنبيه بصري بعدد الحالة "جديد").
5. فريق العمليات يتواصل مع العميل يدوياً (تليفون/واتساب) خارج النظام، ثم يحدّث الحالة من لوحة التحكم ([06 — Admin Dashboard Specification](../admin/06_ADMIN_DASHBOARD_SPECIFICATION.md)): `NEW → CONTACTED → CONFIRMED → COMPLETED` (أو `CANCELLED` في أي مرحلة).
6. كل تغيير حالة يُسجَّل بـ `AuditLog`.

---

## 10. Contact Form Workflow

1. زائر يملأ `ContactForm` → `POST /contact`.
2. تحقق من الفاليديشن + Rate Limit.
3. إنشاء `ContactSubmission(isRead=false)`.
4. إشعار لفريق العمليات.
5. المستخدم الإداري يفتح الرسالة ([06 — Admin Dashboard Specification](../admin/06_ADMIN_DASHBOARD_SPECIFICATION.md)) (تُصبح `isRead=true` تلقائياً)، ويرد يدوياً عبر البريد المباشر (لا يوجد رد داخل النظام في MVP).

---

## 11. AI Chat Conversation Workflow

1. الزائر يفتح `ChatWidget` من أي صفحة → يُنشأ `visitorId` (UUID) في Cookie لو مش موجود.
2. يكتب سؤال → `POST /ai-chat/message`.
3. الـ `AiChatModule`:
   a. يبحث في `AiKnowledgeBase` عن أقرب تطابق (بحث نصي/دلالي حسب التنفيذ).
   b. يجمع سياق إضافي من بيانات المنصة (أسماء المستشفيات/المراكز/جداول العيادات) ذات الصلة بالسؤال.
   c. يستدعي `AiProviderAdapter` (LLM) مع الـ System Prompt الثابت (Guardrails: معلوماتي فقط، لا تشخيص طبي) + السياق المجموع + إعدادات النبرة من `AiSettings`.
4. الرد يُحفَظ في `ChatMessage`، ويُعاد للزائر مع أزرار اقتراح (واتساب/حجز موعد) لو مناسب.
5. لو الرد بثقة منخفضة أو خارج نطاق قاعدة المعرفة → `isUnanswered=true` + رسالة تصعيد تلقائية تقترح التواصل المباشر.
6. الأدمن يراجع دورياً تبويب "التحليلات" في شاشة AI Assistant ([06 — Admin Dashboard Specification](../admin/06_ADMIN_DASHBOARD_SPECIFICATION.md))، يلاحظ الأسئلة متكررة الظهور "بدون إجابة"، ويضيفها كمُدخلات جديدة في `AiKnowledgeBase` — **حلقة تحسين ذاتي مستمرة**.

---

## 12. Notifications Workflow (أساسي الآن، جاهز للتوسّع)

1. الأحداث التالية تُولّد إشعار داخلي فوري في لوحة التحكم (Badge/Counter): حجز جديد، رسالة تواصل جديدة، بوست سوشيال ميديا جديد بانتظار المراجعة، سؤال AI بدون إجابة متكرر.
2. **جاهز للتوسع مستقبلاً:** إرسال هذه الإشعارات أيضاً كبريد إلكتروني أو رسالة WhatsApp Business API — البنية (Job Queue) تسمح بإضافتها كـ Handler جديد بدون تغيير منطق الإنشاء نفسه.

---

## 13. Settings Update Workflow

1. `ADMIN`/`SUPER_ADMIN` يفتح تبويب معيّن في Settings ([06 — Admin Dashboard Specification](../admin/06_ADMIN_DASHBOARD_SPECIFICATION.md)).
2. يعدّل القيم → `PATCH /admin/settings/:group` (وفقاً لـ [04 — API Specification](../api/04_API_SPECIFICATION.md)).
3. القيم الحساسة (Integrations tokens) تُشفَّر قبل التخزين ولا تُعرض كاملة لاحقاً.
4. كل تغيير يُسجَّل بـ `AuditLog(entity=Setting)`.
5. بعض الإعدادات (اللغة الافتراضية، الألوان الأساسية) قد تتطلب Cache invalidation فوري للصفحات العامة (ISR revalidate) حتى يظهر التغيير مباشرة بدون انتظار.

---

## 14. Audit Log Review & Rollback Workflow

1. أي `ADMIN`/`SUPER_ADMIN` يفتح شاشة Audit Log ([06 — Admin Dashboard Specification](../admin/06_ADMIN_DASHBOARD_SPECIFICATION.md))، يفلتر حسب المستخدم/الكيان/التاريخ.
2. يفتح أي سجل لعرض `AuditDiffViewer` (قبل/بعد).
3. لو الكيان يدعم Rollback (حالياً: Pages) → زر "استرجاع" يُنشئ تحديث جديد بمحتوى النسخة القديمة (مع تسجيل Audit جديد يوضح أنه استرجاع).
4. باقي الكيانات (Hospitals, Doctors...) تُعرض للمراجعة فقط في MVP، ويمكن توسيع الـ Rollback لتشملها لاحقاً بنفس النمط.

---

## 15. سياسة التعامل مع تعطل مزوّد الذكاء الاصطناعي (AI Provider Failover Policy)

### آليّة إعادة المحاولة (Retry Strategy)

```
عند فشل استدعاء AiProviderAdapter:

1. المحاولة الأولى: فوري
2. المحاولة الثانية: بعد 1 ثانية (exponential backoff base)
3. المحاولة الثالثة: بعد 3 ثوانٍ
4. المحاولة الرابعة: بعد 7 ثوانٍ

إجمالي: 4 محاولات خلال ~11 ثانية
```

| الخاصية | القيمة |
|---|---|
| **عدد المحاولات** | 4 (أولى فورية + 3 إعادة) |
| **Backoff** | Exponential: 1s → 3s → 7s (base=1, multiplier=2, jitter=±500ms) |
| **المهلة لكل محاولة** | 10 ثوانٍ (timeout per request) |
| **إجمالي المهلة** | ≤ 21 ثانية (11s retry + 10s timeout الأ最后一次) |

### السلوك عند الفشل الكامل (Fallback Behavior)

```
بعد فشل كل المحاولات:

1. تسجيل الخطأ كاملاً:
   logger.error('AI provider failed after 4 attempts', {
     provider: aiProvider.name,
     conversationId,
     visitorId,
     errorMessage: lastError.message,
     errorCode: lastError.code,
     attempts: 4,
     totalDuration: '11.2s',
   });

2. البحث في AiKnowledgeBase عن إجابة مباشرة (fallback exact match):
   → لو وُجد سؤال متطابق → إرجاع الإجابة المخزنة مع علامة "رد من القاعدة"
   → لو لا → المتابعة للخطوة 3

3. إرجاع رد fallback ودّي للمستخدم:
```

### الرد المُرجَع للمستخدم (User-Facing Message)

```
{
  "conversationId": "abc123",
  "reply": "عذراً، المساعد الذكي غير متاح حالياً. يمكنك التواصل معنا مباشرة عبر:",
  "suggestedActions": [
    { "type": "whatsapp", "label": { "ar": "تواصل واتساب", "en": "Contact via WhatsApp" } },
    { "type": "appointment", "label": { "ar": "احجز موعد", "en": "Book Appointment" } }
  ],
  "isEscalated": false,
  "isFallback": true
}
```

| الحالة | الرد |
|---|---|
| **AI Provider offline** | الرد الودّي أعلاه + اقتراح واتساب/موعد |
| **AI Provider يُرجع خطأ 429 (Rate Limit)** | "المساعد الذكي يشهد ازدحاماً. يرجى المحاولة بعد بضع دقائق." + اقتراح واتساب |
| **AI Provider يُرجع خطأ 401 (Auth failed)** | **لا يُعرض للمستخدم** — يُسجَّل كـ Critical Alert للأدمن فوراً |

### متطلبات التسجيل (Logging Requirements)

| الحالة | مستوى التسجيل | المحتوى |
|---|---|---|
| **نجاح** | `info` | conversationId, tokensUsed, responseTime |
| **فشل محاولة واحدة** | `warn` | attempt, errorCode, provider |
| **فشل كل المحاولات** | `error` | all attempts, fallback used (yes/no), visitorId |
| **Auth failure (401)** | `critical` | sofort alert to admin, provider, timestamp |
| **Fallback match found** | `info` | matchedKbId, originalQuestion |
| **Fallback match not found** | `warn` | question excerpt, no match available |

---

## 16. سياسة إعادة المحاولة للتكاملات الخارجية (Global External Integration Retry Policy)

### القاعدة العامة

كل تكامل خارجي يتبع نفس نمط إعادة المحاولة ما لم يُحدد خلاف ذلك:

| الخاصية | القيمة الافتراضية |
|---|---|
| **عدد المحاولات** | 3 |
| **Backoff** | Exponential: 2s → 8s → 30s |
| **Jitter** | ±1 ثانية على كل محاولة |
| **مهلة كل محاولة** | تختلف حسب التكامل (انظر الجدول) |
| **إجمالي المهلة** | ≤ 45 ثانية |

### سياسة كل تكامل

| التكامل | المحاولات | Timeout/محاولة | المهلة الإجمالية | عند الفشل |
|---|---|---|---|---|
| **Email (إرسال)** | 3 | 10s | ~48s | يُسجَّل في Job Queue كـ "failed" + إشعار للأدمن. لا يُرسَل البريد التالبي. |
| **Social Sync (Facebook/Instagram/LinkedIn APIs)** | 3 | 15s | ~53s | يُسجَّل الخطأ + يُ停掉 المزامنة لهذا الحساب. لا يتأثر حساب آخر. إشعار للأدمن: "مزامنة Facebook توقفت — يرجى تجديد التوكن". |
| **Analytics (GA4/GTM)** | 3 | 5s | ~18s | **لا يُعيد محاولة** — Analytics غير حرج. يُسجَّل الخطأ ويتوقف. لا يؤثر على أي ميزة أخرى. |
| **S3 Storage (Upload)** | 3 | 30s | ~98s | يُرجع خطأ للمستخدم: "فشل رفع الملف — يرجى المحاولة لاحقاً". لا يحدث فقدان بيانات (الملف لم يُرفع بعد). |
| **S3 Storage (Download/Read)** | 3 | 10s | ~48s | يُعرض الصورة البديلة (placeholder) إن وُجدت، أو يُرجع خطأ 502. |
| **AI Provider** | 4 | 10s | ~21s | (انظر §15 أعلاه — سياسة مخصصة) |
| **Future: WhatsApp Business API** | 3 | 10s | ~48s | يُسجَّل كـ "failed message" + إعادة محاولة لاحقة عبر Job Queue. |

### تسجيل الفشل (Failure Logging)

كل فشل خارجي يُسجَّل بالشكل التالي:

```json
{
  "level": "error",
  "integration": "facebook_sync",
  "action": "fetch_posts",
  "provider": "facebook_graph_api",
  "errorCode": "OAuthException",
  "errorMessage": "Error validating access token",
  "attempt": 3,
  "maxAttempts": 3,
  "backoff": "30s",
  "totalDuration": "47.2s",
  "accountKey": "facebook_page_insan",
  "userId": "user_cuid",
  "timestamp": "2026-07-16T10:30:00Z"
}
```

**Alert Thresholds:**
| الحالة | الإجراء |
|---|---|
| **فشل 1 محاولة** | `warn` log فقط |
| **فشل كل المحاولات** | `error` log + إشعار Admin Dashboard (Badge) |
| **فشل 3 مرات متتالية (同じ integration)** | `critical` alert + إشعار Admin فوري |
| **فشل ≥ 5 مرات في 24 ساعة** | Email alert لـ Super Admin |

---

## 17. سياسة تدوير الأسرار (Secrets Rotation Policy)

### المبدأ

**لا يُسمح بترك API keys/tokens ثابتة لأكثر من 90 يوم** — التدوير إجباري حتى لو لم تُكشف.

### جدول التدوير

| السر / التوكن | العمر الأقصى | طريقة التدوير | وقت التوقف | ملاحظات |
|---|---|---|---|---|
| **JWT Access Token** | 15 دقيقة | تلقائي (Auto-refresh) | 0 | يُولَّد عند كل Refresh |
| **JWT Refresh Token** | 7 أيام | تلقائي (Cookie rotation) | 0 | يُستبدل عند كل Refresh |
| **Facebook Page Access Token** | 60 يوم | يدوي من Settings > Integrations | لا يوجد | يُحدَّث من الأدمن قبل انتهاء الصلاحية |
| **Instagram Basic Display Token** | 60 يوم | يدوي | لا يوجد | — |
| **LinkedIn Access Token** | 60 يوم | يدوي | لا يوجد | — |
| **S3 / R2 Access Key** | 90 يوم | يدوي من Provider Console | لا يوجد (old key يعمل حتى تغييره) | تحديث في `.env` + restart |
| **GA4 Measurement ID** | لا ينتهي | لا يحتاج تدوير | — | معرّف عام فقط |
| **Database Password** | 90 يوم | يدوي من Provider Console | 0 (rolling restart) | — |
| **reCAPTCHA Secret Key** | لا ينتهي | لا يحتاج تدوير | — | — |

### آليّة التدوير بدون توقف (Zero-Downtime Rotation)

```
لكل سر يتطلب تدوير:

1. التدوير يبدأ ب יצירת مفتاح جديد بجانب القديم
   (Dual-key period: القديم والجديد يعملان معاً)

2. تحديث القيمة في IntegrationSetting أو Environment Variable
   → الخادم يقرأ القيمة الجديدة في الطلب التالي

3. الانتظار لمدة 24 ساعة (grace period)
   → خلالها كل الطلبات القديمة تنجح بالتوكن القديم
   → الطلبات الجديدة تستخدم التوكن الجديد

4. إبطال التوكن القديم من الـ Provider Console

5. التأكد من أن لا أي طلبات تفشل:
   → مراقبة Error rate لمدة 1 ساعة بعد الإبطال
```

**استثناء:** JWT tokens لا تحتاج dual-key — التدوير تلقائي وفوري.

### إخطار التدوير

| المدة المتبقية | الإجراء |
|---|---|
| **30 يوم** | تنبيه في Admin Dashboard: "توكن {provider} ينتهي خلال 30 يوم" |
| **7 أيام** | تنبيه أحمر: "مُلح! توكن {provider} ينتهي خلال أسبوع" |
| **1 يوم** | إشعار عاجل + تسجيل في Audit Log |
| **منتهي** | كل الطلبات تفشل → Error logged → Admin يُجبر على التحديث |

---

## 18. مصفوفة فحص صحة التكاملات (Integration Health Check Matrix)

### الفحص الدوري (Periodic Health Checks)

| التكامل | Health Check Endpoint | تكرار الفحص | مهلة الفحص | عند الفشل |
|---|---|---|---|---|
| **Database (PostgreSQL)** | `SELECT 1` | كل 30 ثانية | 5s | `critical` alert — الخادم يُعاد تشغيله تلقائياً |
| **S3 Storage** | `HEAD /health-check-bucket` | كل 5 دقائق | 10s | `error` — رفع الملفات يتوقف مؤقتاً |
| **Facebook Graph API** | `GET /me?fields=id` (بالتونك) | كل 30 دقيقة | 15s | `warn` — مزامنة الأخبار تتوقف |
| **Instagram API** | `GET /me?fields=id` | كل 30 دقيقة | 15s | `warn` — نفس Facebook |
| **LinkedIn API** | `GET /v2/me` | كل 30 دقيقة | 15s | `warn` — نفس Facebook |
| **AI Provider (OpenAI/Anthropic)** | `GET /v1/models` | كل 10 دقائق | 10s | `error` — الشات بوت يتحول لوضع Fallback |
| **Email Service (SMTP/API)** | ping / account verification | كل ساعة | 10s | `warn` — إشعارات البريد تتوقف |
| **GA4 (Analytics)** | لا يوجد health check | — | — | غير حرج — لا يتطلب فحص |

### هيكل Health Check Response

```json
{
  "status": "healthy" | "degraded" | "unhealthy",
  "timestamp": "2026-07-16T10:30:00Z",
  "checks": {
    "database": { "status": "healthy", "latency": "2ms" },
    "s3": { "status": "healthy", "latency": "45ms" },
    "facebook_sync": { "status": "degraded", "latency": "timeout", "error": "OAuth token expired" },
    "ai_provider": { "status": "healthy", "latency": "1.2s" }
  }
}
```

### Dashboard Health Widget

يظهر في Admin Dashboard كـ Status Bar علوي:
- 🟢 **All systems operational** — كل التكاملات سليمة
- 🟡 **Degraded** — تكامل واحد معطّل لكن لا يؤثر على الميزات الأساسية
- 🔴 **Service disruption** — تكامل حرج معطّل (DB أو Auth)

---

## 19. الحدود التشغيلية لمحادثات الذكاء الاصطناعي (AI Conversation Operational Limits)

### حدود المحادثة (Conversation Limits)

| الخاصية | القيمة | السلوك عند الوصول |
|---|---|---|
| **الحد الأقصى لرسائل المحادثة الواحدة** | **50 رسالة** (25 من المستخدم + 25 رد) | يُعرض: "وصلت إلى حد المحادثة. يرجى بدء محادثة جديدة أو التواصل معنا مباشرة." + أزرار اقتراح |
| **الحد الأقصى لطول الرسالة الواحدة** | **1000 حرف** | يُرفض الطلب: `400 VALIDATION_ERROR: "Message must be 1-1000 characters"` |
| **الحد الأقصى لكل كلمة مفتاحية في الرد** | **500 token** (تقريباً 375 كلمة) | الرد يُقصَّ تلقائياً عند هذا الحد |

### حدود الـ Rate Limit (لكل زائر)

| الخاصية | القيمة | المعرّف |
|---|---|---|
| **الرسائل لكل 10 دقائق** | **20 رسالة** | Visitor ID (Cookie) |
| **الرسائل لكل ساعة** | **50 رسالة** | Visitor ID |
| **المحادثات النشطة في نفس الوقت** | **1 محادثة فقط** | Visitor ID — لا يُسمح بفتح محادثات متعددة |

### سياسة الاحتفاظ بالبيانات (Retention Policy)

| نوع البيانات | مدة الاحتفاظ | طريقة الحذف |
|---|---|---|
| **المحادثات (ChatConversation)** | **90 يوم** من آخر رسالة | Job مجدول يحذف المحادثات المنتهية (>90 يوم) |
| **الرسائل (ChatMessage)** | **90 يوم** من تاريخ الإنشاء | Cascade مع المحادثة الأصلية |
| **سجلات التحليلات** (isUnanswered, matchedKbId) | **12 شهراً** | Job سنوي يلخّص ويحذف التفاصيل |
| **visitorId (Cookie)** | **30 يوم** | Cookie ينتهي تلقائياً — المحادثات تبقى مربوطة بـ visitorId حتى انتهاء الاحتفاظ |

### انتهاء صلاحية المحادثة (Conversation Expiration)

```
محادثة تنتهي صلاحيتها عندما:

1. مر 30 دقيقة من آخر رسالة (Idle timeout):
   → المحادثة تصبح "غير نشطة"
   → رسالة تلقائية: "تم إغلاق المحادثة بسبب عدم النشاط. ابدأ محادثة جديدة!"
   → visitorId يبقى صالحاً لمحادثة جديدة

2. المستخدم يمسح الكوكيز:
   → visitorId يختفي
   → المحادثات القديمة تبقى في السيرفر (مرتبطة بالـ visitorId القديم)
   → محادثة جديدة تبدأ بـ visitorId جديد

3. الحد الأقصى للرسائل (50) يتحقق:
   → المحادثة تُغلق تلقائياً
   → يُعرض الرسالة الموضحة في الجدول أعلاه
```

### قيود Context Window

| الخاصية | القيمة |
|---|---|
| **عدد الرسائل المرسلة كـ Context** | آخر **10 رسائل** فقط (5 أزواج سؤال/رد) |
| **ال知识 القاعدة المُرفقة** | أقرب **3 نتائج** من `AiKnowledgeBase` |
| **System Prompt** | ثابت (غير قابل للتعديل من الأدمن) — يحتوي على: هوية المساعد، القيود (لا تشخيص طبي)، اللغة، النبرة |
| **إجمالي Context Budget** | ~4000 token (يترك مساحة للرد) |

---

## 20. سياسة Feature Flags (Feature Flag Policy)

### المبدأ

**كل ميزة اختيارية يجب أن تُدار عبر Feature Flag** — يُفعَّل/يُعطَّل من Admin Dashboard بدون تعديل كود أو إعادة نشر.

### التخزين

```prisma
model FeatureFlag {
  key         String   @id        // "enable_whatsapp_integration", "enable_patient_portal"
  name        Json                // { ar: "تفعيل واتساب", en: "Enable WhatsApp" }
  description Json?               // شرح الميزة للمدير
  isEnabled   Boolean  @default(false)
  rolloutPercentage Int  @default(100)  // 0-100: نسبة المستخدمين الذين يرون الميزة
  allowedRoles String[]           // الأدوار التي ترى الميزة (فارغ = الكل)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

**ملاحظة:** هذا الجدول يُضاف إلى Schema未来（غير موجود حالياً في MVP） — يُستخدم كمرجع للبنية المتوقعة.

### استخدام Feature Flags في الكود

```typescript
//مثال: شرط ميزة في Frontend
const { isEnabled } = useFeatureFlag('enable_whatsapp_integration');

if (isEnabled) {
  return <WhatsAppButton />;
}

//مثال: شرط ميزة في Backend (NestJS Guard)
@Injectable()
export class FeatureFlagGuard {
  constructor(private flags: FeatureFlagService) {}

  async canActivate(context: ExecutionContext) {
    const flag = context.getHandler().metadata.get('featureFlag');
    return this.flags.isEnabled(flag);
  }
}
```

### جدول الميزات وعلاقتها بـ Flags (MVP + مستقبل)

| الميزة | Feature Flag Key | الحالة في MVP | ملاحظات |
|---|---|---|---|
| **Chat Widget** | `enable_ai_chat` | **مفعّل** | يُعطَّل إذا AI Provider معطّل |
| **News Social Sync** | `enable_social_sync` | **مفعّل** | يُعطَّل إذا التوكنز منتهية |
| **Appointment Booking** | `enable_appointments` | **مفعّل** | — |
| **Contact Form** | `enable_contact_form` | **مفعّل** | — |
| **WhatsApp Integration** | `enable_whatsapp_integration` | **معطّل** (Future) | يُفعَّل عند تكامل WhatsApp Business API |
| **Patient Portal** | `enable_patient_portal` | **معطّل** (Future) | يُفعَّل في Phase 2 |
| **Multi-language (3rd)** | `enable_third_language` | **معطّل** (Future) | يُفعَّل عند إضافة لغة ثالثة |
| **Advanced Analytics** | `enable_advanced_analytics` | **معطّل** (Future) | يُفعَّل عند تكامل GA4 المتقدم |
| **A/B Testing** | `enable_ab_testing` | **معطّل** (Future) | يُفعَّل عند بناء نظام التجارب |

### قواعد Feature Flags

| القاعدة | التفاصيل |
|---|---|
| **لا flags في MVP code** | flags تُدار من قاعدة البيانات — لا `if (process.env.FEATURE_X)` في الكود |
| **Fallback آمن** | إذا الـ Feature Flag service معطّل → كل الميزات تُعطَّل (conservative default) |
| **لا تأثير على الأداء** | flags تُخزَّن في Memory Cache (TTL=60s) — لا query لكل request |
| **التدوين** | كل تغيير flag يُسجَّل في Audit Log (`entity=FeatureFlag`) |
| **Rollout التدريجي** | `rolloutPercentage` يُدار عبر sticky sessions (نفس المستخدم يرى نفس الحالة) |

---

**التالي:** [10 — Folder Structure](10_FOLDER_STRUCTURE.md)