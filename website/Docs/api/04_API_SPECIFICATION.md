# 04 — التوثيق الكامل للـ API (Complete API Specification)

> **Document Version:** 1.1
> **Status:** Final
> **Last Updated:** 2025-07-16
> **Source of Truth:** Yes

> **نسخة Replit Implementation** — هذه النسخة مُعدّة لبيئة Replit. راجع `architecture_blueprints Claude/` للنسخة الأصلية.
>
> **ملاحظات تقنية:**
> - للحقول والموديلات: راجع `../database/03_DATABASE_SCHEMA.md` لتعريفات النماذج والعلاقات.
> - للصلاحيات والأدوار: راجع `../security/05_USER_ROLES_AND_PERMISSIONS.md` لتفاصيل الأدوار وصفوف الصلاحيات.
> - **التحقق (Validation):** الواجهة الأمامية تستخدم **React Hook Form + Zod**، والخادم يستخدم **class-validator + DTOs**.

Base URL: `https://api.insan-platform.com/api/v1` (مثال — يتغيّر حسب بيئة النشر)
كل الاستجابات JSON. كل الأخطاء بصيغة موحّدة:
```json
{ "success": false, "error": { "code": "VALIDATION_ERROR", "message": "...", "details": [ { "field": "email", "message": "invalid email" } ] } }
```
كل الاستجابات الناجحة:
```json
{ "success": true, "data": { ... }, "meta": { "page": 1, "pageSize": 20, "total": 134 } }
```

---

## 0. الاتفاقيات العامة (Global API Conventions)

> **كل Endpoint في هذا الملف يلتزم بالاتفاقيات التالية.** في حالة التعارض، تُحمَّل هذه الاتفاقيات.

### 0.1 صيغة الخطأ الموحّدة (Standard Error Response)

كل خطأ — أي status code ≥ 400 — يُرجَع بالصيغة التالية بالضبط:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "A human-readable summary in the request locale",
    "details": [
      { "field": "email", "message": "Invalid email format" },
      { "field": "name.ar", "message": "Required" }
    ]
  }
}
```

| الحقل | النوع | مطلوب | الوصف |
|---|---|---|---|
| `success` | `boolean` | نعم | دائمًا `false` في حالة الخطأ |
| `error.code` | `string` | نعم | رمز الخطأ الموحّد (انظر جدول HTTP Status Codes أدناه) |
| `error.message` | `string` | نعم | وصف موجز بالغة الطلب (`ar` أو `en`) — يظهر للمستخدم مباشرة |
| `error.details` | `array?` | لا | مصفوفة أخطاء التحقق الفعلية — تُرجَع فقط مع `400 VALIDATION_ERROR` |

**قواعد:**
- لا تُرجَع أبداً تفاصيل تقنية (stack traces, SQL queries, internal paths) في بيئة الإنتاج.
- `message` يجب أن يكون مفهومًا لمستخدم نهائي (ليس مطورًا).
- `details` تحتوي فقط على أخطاء الحقول المدخلة — لا تُرجَع أخطاء النظام في `details`.

### 0.2 عقد Pagination الموحّد (Standard Pagination Contract)

#### طلب (Request Parameters)

| Param | النوع | الافتراضي | الحد الأقصى | الوصف |
|---|---|---|---|---|
| `page` | `integer` | `1` | — | رقم الصفحة (يبدأ من 1) |
| `pageSize` | `integer` | `20` | `100` | عدد العناصر في كل صفحة |

**ال例子:**
```
GET /admin/hospitals?page=2&pageSize=50
GET /news?page=1&pageSize=20
```

#### استجابة (Response Structure)

```json
{
  "success": true,
  "data": [ ... ],
  "meta": {
    "page": 2,
    "pageSize": 50,
    "total": 134,
    "totalPages": 3,
    "hasNext": true,
    "hasPrev": true
  }
}
```

| الحقل | النوع | الوصف |
|---|---|---|
| `meta.page` | `integer` | الصفحة الحالية |
| `meta.pageSize` | `integer` | العناصر المطلوبة/المُرجَعة في الصفحة |
| `meta.total` | `integer` | إجمالي العناصر المطابقة (قبل التقسيم للصفحات) |
| `meta.totalPages` | `integer` | العدد الإجمالي للصفحات (`Math.ceil(total / pageSize)`) |
| `meta.hasNext` | `boolean` | هل توجد صفحة تالية |
| `meta.hasPrev` | `boolean` | هل توجد صفحة سابقة |

**ملاحظات:**
- `total` يُحسب **قبل** تطبيق الفلاتر النهائية (مثل الإخفاء القائم على الصلاحيات) لكن **بعد** فلاتر البحث والفلترة.
- للعناصر التي لا تدعم Pagination (مثل القوائم القصيرة)، يُرجَع `data` كمصفوفة مباشرة بدون `meta`.

### 0.3 اتفاقية الفلترة والترتيب (Filtering & Sorting Convention)

كل `GET` endpoint للقوائم يدعم نفس أسماء المعاملات:

#### الفلترة (Filtering)

| نمط المعاملة | الوصف | ال例子 |
|---|---|---|
| `filter[field]=value` | فلترة دقيقة (Exact Match) | `?filter[status]=PUBLISHED` |
| `filter[field]=val1,val2` | فلترة بعدة قيم (IN) | `?filter[status]=DRAFT,PUBLISHED` |
| `search=text` | بحث نصي شامل (Full-Text) بالاسم/الوصف حسب كل مورد | `?search=future` |
| `filter[dateFrom]=ISO` | فلترة من تاريخ | `?filter[dateFrom]=2026-01-01` |
| `filter[dateTo]=ISO` | فلترة إلى تاريخ | `?filter[dateTo]=2026-12-31` |

**ال例子:**
```
GET /admin/hospitals?filter[status]=PUBLISHED&search=future
GET /admin/news?filter[sourceType]=social_sync&filter[dateFrom]=2026-06-01
GET /admin/appointments?filter[status]=NEW,CONTACTED&filter[dateFrom]=2026-07-01
```

#### الترتيب (Sorting)

| Param | النوع | الافتراضي | الوصف |
|---|---|---|---|
| `sortBy` | `string` | `createdAt` | اسم الحقل للترتيب حسبه |
| `sortDir` | `asc` \| `desc` | `desc` | اتجاه الترتيب |

**ال例子:**
```
GET /admin/hospitals?sortBy=name&sortDir=asc
GET /news?sortBy=publishedAt&sortDir=desc
```

**ملاحظات:**
- لا يُسمح بـ `sortBy` على حقول `Json` (مثل `name`، `description`) — استخدم حقل `slug` أو `createdAt` بدلاً منها.
- كل endpoint يحدد في وصفه أي الحقول تدعم `sortBy` (انظر جدول الفروقات في القسم 2).

### 0.4 استراتيجية ترقيع API (API Versioning Strategy)

| الجوانب | القرار |
|---|---|
| **الترقيم** | URL-based: `/api/v1/...` |
| **داخل الإصدار** | لا تغييرات مكسّرة (Breaking Changes) داخل إصدار واحد |
| **رقم الإصدار** | يزداد فقط عند وجود تغييرات مكسّرة (إضافة حقل إجباري جديد، تغيير هيكل الاستجابة، حذف endpoint) |
| **إخطار التخلي** | عند التخطيط لـ v2: إضافة `Sunset` header مع تاريخ الانتهاء + `Deprecation` header على كل endpoint متأثر — لمدة 6 أشهر على الأقل |
| **التوائم (Parallel)** | يُسمح بتشغيل v1 و v2 معًا في وقت واحد عبر reverse proxy (Nginx) — v1 يخاطب `/api/v1/*` و v2 يخاطب `/api/v2/*` |
| **التوثيق** | كل إصدار له ملف توثيق مستقل (`04_API_SPECIFICATION.md` للإصدار الحالي) |

### 0.5 توقعات عدم التكرار (Idempotency Expectations)

| نوع العملية | Idempotent؟ | الآلية | ملاحظات |
|---|---|---|---|
| `POST /admin/{resource}` (Create) | لا | — | كل طلب يُنشئ سجل جديد |
| `PATCH /admin/{resource}/:id` (Update) | نعم | Same payload → same result | تحديثات جزئية طبيعياً idempotent |
| `DELETE /admin/{resource}/:id` | نعم | حذف مكرر = نفس النتيجة (404 لو سبق الحذف) | — |
| `POST /admin/{resource}/:id/publish` | نعم | نشر سجل منشور = لا تغيير | يُرجَع `200` مع الحالة الحالية |
| `POST /admin/news/sync/trigger` | **لا** | كل طلب يُنشئ مهمة جديدة | يُرجَع `202` مع `jobId` جديد |
| `POST /ai-chat/message` | **لا** | كل رسالة تُنشئ رد جديد | — |
| `POST /appointments` | **لا** | كل طلب حجز مستقل | يُسمح بتكرار البيانات |
| `POST /contact` | **لا** | كل رسالة مستقلة | — |
| `POST /admin/pages/:pageId/sections/reorder` | **نعم** | Same order array → same result | استبدال كامل للترتيب |
| `PATCH /admin/settings/:group` | **نعم** | Same payload → same result | — |

**تطبيق:**
- للعمليات غير-idempotent المُعلَّمة بـ "لا"، يجب على الـ Frontend منع الإرسال المكرر (disable button بعد الضغط + debounce).
- لا حاجة لـ `Idempotency-Key` header في هذا الإصدار — التعقيد غير مبرر لمقياس المشروع الحالي.

### 0.6 Rate Limiting العام (Global Rate Limits)

| المجموعة | الحد | النافذة الزمنية | المُعرّف | الاستجابة عند التجاوز |
|---|---|---|---|---|
| **تسجيل الدخول** | 5 محاولات | 15 دقيقة | IP + Email | `429 TOO_MANY_REQUESTS` مع `Retry-After` header |
| **إعادة تعيين كلمة المرور** | 3 محاولات | 1 ساعة | Email | `429` |
| **نماذج عامة** (Appointments, Contact) | 5 طلبات | 1 ساعة | IP | `429` |
| **الموقع العام** (Pages, Hospitals, Doctors, News) | 100 طلب | 1 دقيقة | IP | `429` |
| **لوحة التحكم** (Admin endpoints) | 200 طلب | 1 دقيقة | User ID (JWT) | `429` |
| **الشات بوت** (AI Chat) | 20 رسالة | 10 دقائق | Visitor ID (Cookie) | `429` مع `Retry-After` |
| **رفع الملفات** (Media Upload) | 20 رفع | 1 ساعة | User ID | `429` |
| **مزامنة الأخبار** (Sync Trigger) | 1 طلب | 5 دقائق | User ID | `429` مع رسالة "sync already in progress" |

**الاستجابة عند التجاوز:**
```json
{
  "success": false,
  "error": {
    "code": "TOO_MANY_REQUESTS",
    "message": "Rate limit exceeded. Try again in 340 seconds.",
    "retryAfter": 340
  }
}
```

**الـ Headers المُرجَعة في كل استجابة:**
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 42
X-RateLimit-Reset: 1721312400
```

### 0.7 جدول رموز HTTP Status Codes المرجعي (Standard HTTP Status Codes)

| HTTP Status | Error Code | الاستخدام |
|---|---|---|
| `200 OK` | — | نجاح طلب (GET, PATCH, DELETE) |
| `201 Created` | — | إنشاء ناجح (POST Create) |
| `202 Accepted` | — | طلب مقبول للتنفيذ.Async (Sync Trigger) |
| `400 Bad Request` | `VALIDATION_ERROR` | بيانات مدخلة غير صحيحة — مع `details[]` |
| `400 Bad Request` | `INCOMPLETE_CONTENT` | نواقص إجبارية قبل النشر (Publish) |
| `401 Unauthorized` | `UNAUTHORIZED` | لا يوجد JWT صالح أو منتهي الصلاحية |
| `401 Unauthorized` | `INVALID_CREDENTIALS` | كلمة المرور غير صحيحة |
| `401 Unauthorized` | `INVALID_REFRESH_TOKEN` | Refresh Token غير صالح أو منتهي أو مُلغى |
| `403 Forbidden` | `FORBIDDEN` | المستخدم مُصادَق لكن لا يملك الصلاحية المطلوبة |
| `404 Not Found` | `NOT_FOUND` | المورد غير موجود أو غير منشور (للعامة) |
| `409 Conflict` | `CONFLICT` | تعارض بيانات (slug مكرر، ارتباطات نشطة) |
| `409 Conflict` | `ACCOUNT_DISABLED` | الحساب معطّل (`isActive=false`) |
| `413 Payload Too Large` | `FILE_TOO_LARGE` | حجم الملف يتجاوز الحد المسموح |
| `422 Unprocessable Entity` | `UNIQUE_CONSTRAINT` | انتهاك قيد فريد (مختلف عن Conflict — يتعلق بالتحقق من البيانات) |
| `429 Too Many Requests` | `TOO_MANY_REQUESTS` | تجاوز Rate Limit — مع `Retry-After` |
| `500 Internal Server Error` | `INTERNAL_ERROR` | خطأ غير متوقع بالخادم — لا تُرجَع تفاصيل تقنية |
| `502 Bad Gateway` | `AI_PROVIDER_UNAVAILABLE` | مزوّد الذكاء الاصطناعي غير متاح — يُرجَع fallback message |
| `503 Service Unavailable` | `SERVICE_UNAVAILABLE` | الخادم في وضع الصيانة أو غير متاح مؤقتاً |

**ملاحظات تنفيذية:**
- لا يُسمح بأكواد خطأ مخصصة (Custom Error Codes) خارج الجدول أعلاه.
- كل response يجب أن يحتوي على `Content-Type: application/json`.
- لا تُرجَع أبداً `500` مع تفاصيل الخطأ في بيئة الإنتاج — سجّل الخطأ داخلياً وأعد `INTERNAL_ERROR` مع `requestId` للتتبع.

---

## 1. العقد الموحّد لأي Resource محتوى (Standard Content Resource Contract)

> **ملاحظة التحقق:** قواعد التحقق الموضّحة أدناه تُطبَّق عبر **class-validator DTOs** على الخادم. راجع `../database/03_DATABASE_SCHEMA.md` لتعريفات الحقول والنماذج.

كل الموارد التالية: `pages`, `hospitals`, `medical-centers`, `clinics`, `doctors`, `news`, `news-categories`, `testimonials`, `navigation`, `media`, `media-folders` — **تتبع نفس النمط** الموضّح بالتفصيل هنا مرة واحدة (باستخدام `hospitals` كمثال كامل)، ثم القسم 2 يوضّح الفروقات الخاصة بكل مورد فقط (الحقول + قواعد التحقق).

### `GET /admin/hospitals` — List (Admin)
- **Auth:** JWT مطلوب. **Authorization:** `hospitals:view` (راجع `../security/05_USER_ROLES_AND_PERMISSIONS.md` لتفاصيل الصلاحيات)
- **Query Params:** `page` (default 1), `pageSize` (default 20, max 100), `status` (`DRAFT`|`PUBLISHED`|`ARCHIVED`), `search` (بحث بالاسم)، `sortBy`, `sortDir`
- **Response 200:** `{ success:true, data: Hospital[], meta:{page,pageSize,total} }`
- **Errors:** `401 UNAUTHORIZED`, `403 FORBIDDEN`

### `GET /hospitals` — List (Public)
- **Auth:** لا يوجد. يعرض فقط `status=PUBLISHED`.
- **Query Params:** `page`, `pageSize`, `locale` (`ar`|`en`, افتراضي حسب الـ URL)
- **Response 200:** نفس الشكل، لكن بدون حقول إدارية (`createdBy`, `customFields` الداخلية إلخ)
- **Caching:** `Cache-Control: public, max-age=60, stale-while-revalidate=300`

### `GET /hospitals/:slug` — Get One (Public)
- **Response 200:** كائن `Hospital` كامل بعلاقاته (medicalCenters, doctors مختصرة) — راجع `../database/03_DATABASE_SCHEMA.md` لتعريف العلاقات
- **Errors:** `404 NOT_FOUND` لو غير موجود أو غير منشور

### `GET /admin/hospitals/:id` — Get One (Admin)
- **Auth:** `hospitals:view`
- **Response 200:** الكائن كاملاً بكل الحقول الإدارية

### `POST /admin/hospitals` — Create
- **Auth:** `hospitals:create`
- **Request Body:**
```json
{
  "slug": "future-hospital",
  "name": { "ar": "مستشفى المستقبل", "en": "Future Hospital" },
  "description": { "ar": "...", "en": "..." },
  "brandColor": "#0B5FFF",
  "status": "DRAFT"
}
```
- **Validation:** `slug` مطلوب، فريد، `^[a-z0-9-]+$` فقط · `name.ar` مطلوب (`name.en` اختياري وقت الإنشاء لكن إجباري قبل النشر) · `brandColor` صيغة Hex صحيحة
- **Response 201:** الكائن الكامل مع `id`
- **Errors:** `400 VALIDATION_ERROR`, `409 CONFLICT` (slug مكرر), `401`, `403`
- **Side Effect:** يُسجَّل تلقائياً في `AuditLog` (`action=create`)

### `PATCH /admin/hospitals/:id` — Update
- **Auth:** `hospitals:edit`
- **Request Body:** أي مجموعة جزئية من الحقول أعلاه
- **Response 200:** الكائن بعد التحديث
- **Errors:** `400`, `404`, `401`, `403`
- **Side Effect:** `AuditLog` (`action=update`, يحفظ `before`/`after`)

### `POST /admin/hospitals/:id/publish` — Publish
- **Auth:** `hospitals:publish`
- **Validation قبل النشر:** لازم `name.ar` و `name.en` موجودين، و `slug` فريد، و صورة `heroImage` موجودة (تحذير غير إجباري لو ناقصة)
- **Response 200:** `{ status: "PUBLISHED", publishedAt: "..." }`
- **Errors:** `400 INCOMPLETE_CONTENT` (لو نواقص إجبارية)، `403`
- **ملاحظة:** راجع `../architecture/09_WORKFLOWS.md` لخطوات سير النشر الكاملة.

### `DELETE /admin/hospitals/:id` — Delete
- **Auth:** `hospitals:delete`
- **Response 200:** `{ success:true }`
- **Errors:** `404`, `403`, `409 CONFLICT` لو مربوط بمراكز طبية نشطة (يتطلب تأكيد إضافي `?force=true`)
- **Side Effect:** `AuditLog` (`action=delete`, يحفظ نسخة كاملة قبل الحذف لإمكانية الاسترجاع)

> **باقي الموارد (`medical-centers`, `doctors`, `news`...) تتبع بالضبط نفس الأفعال الستة أعلاه** (List Public / List Admin / Get / Create / Update / Publish / Delete) على نفس نمط المسارات `/{resource}` و `/admin/{resource}`.

---

## 2. جدول الفروقات لكل مورد (الحقول الخاصة + قواعد التحقق)

> **ملاحظة:** لتعريفات الحقول والعلاقات التفصيلية، راجع `../database/03_DATABASE_SCHEMA.md`. قواعد التحقق أعلاه تُطبَّق عبر **class-validator DTOs** على الخادم، وعبر **Zod schemas** في الواجهة الأمامية.

| Resource | Base Path | حقول إضافية خاصة | قواعد تحقق مهمة |
|---|---|---|---|
| `medical-centers` | `/medical-centers` | `features[]`, `services[]`, `isFeatured`, علاقة `hospitalIds[]` (M:N) | لازم مربوط بمستشفى واحد على الأقل قبل النشر |
| `clinics` | `/admin/medical-centers/:centerId/clinics` (Nested، بدون نسخة عامة مستقلة) | `schedule[]` `{day, from, to}` | `from` < `to`، الأيام لا تتكرر لنفس العيادة |
| `doctors` | `/doctors` | `specialty`, `photo`, `isFeatured`, علاقات `hospitalIds[]`, `medicalCenterIds[]` | لازم مربوط بمستشفى واحد على الأقل قبل النشر |
| `news` | `/news` | `sourceType`, `sourcePlatform`, `sourceEntity`, `categoryId`, `relatedHospitalId` | لو `sourceType=social_sync` الحقول `sourcePlatform`+`externalPostId` إجبارية وفريدة معاً (unique) |
| `news-categories` | `/news-categories` | - | `slug` فريد |
| `testimonials` | `/admin/testimonials` (بدون نسخة عامة مستقلة — تُسحب داخل صفحات أخرى) | `audience` (`investor`\|`doctor`\|`patient`) | - |
| `navigation` | `/admin/navigation` | `location` (`header`\|`footer`), `parentId`, `order` | لا يُسمح بأكثر من 2 مستوى تداخل (Parent > Child فقط، بدون Grandchild) |
| `media` | `/admin/media` | `type`, `tags[]`, `folderId` | حجم الملف حسب `type` (صور ≤ 10MB، فيديو ≤ 200MB، مستندات ≤ 20MB) — قابل للتعديل من Settings |
| `media-folders` | `/admin/media-folders` | `parentId` | - |
| `pages` | `/admin/pages` + `/pages/:slug` (public) | `sections[]` (تُدار عبر Endpoints منفصلة أدناه) | - |

### `Sections` (فرعية تحت `pages`)
- `POST /admin/pages/:pageId/sections` — إضافة Section جديد `{componentType, order, config}`
- `PATCH /admin/pages/:pageId/sections/:id` — تعديل محتوى/إظهار Section
- `POST /admin/pages/:pageId/sections/reorder` — `{ order: [sectionId1, sectionId2, ...] }` لإعادة الترتيب بالسحب والإفلات
- `DELETE /admin/pages/:pageId/sections/:id`

---

## 3. Endpoints خاصة بالمصادقة (Authentication)

### `POST /auth/login`
- **Request:** `{ email, password }`
- **Response 200:** `{ accessToken, user: {id,name,email,role} }` + `refreshToken` يُرسَل كـ `httpOnly Secure Cookie`
- **Errors:** `401 INVALID_CREDENTIALS`, `423 ACCOUNT_DISABLED`
- **Rate Limit:** 5 محاولات/15 دقيقة لكل IP+email (حماية من Brute-force)

### `POST /auth/refresh`
- **Request:** يعتمد على الـ `httpOnly Cookie` (لا Body)
- **Response 200:** `{ accessToken }` جديد
- **Errors:** `401 INVALID_REFRESH_TOKEN`

### `POST /auth/logout`
- **Auth:** JWT مطلوب
- **Effect:** إبطال الـ `RefreshToken` الحالي (`revoked=true`) + مسح الـ Cookie
- **Response 200:** `{ success:true }`

### `POST /auth/forgot-password` / `POST /auth/reset-password`
- **Request forgot:** `{ email }` → يرسل رابط إعادة تعيين (صالح 30 دقيقة)
- **Request reset:** `{ token, newPassword }`
- **Validation:** `newPassword` 8 أحرف على الأقل، حرف كبير وصغير ورقم

---

## 4. Endpoints العملاء العامة (Leads)

### `POST /appointments`
- **Auth:** لا يوجد (عام)
- **Request:**
```json
{ "name":"...", "phone":"01xxxxxxxxx", "email":"...", "hospitalId":"...", "medicalCenterId":"...", "preferredDate":"2026-08-01", "message":"..." }
```
- **Validation:** حسب قسم "Book Appointment" في `../architecture/02_INFORMATION_ARCHITECTURE_AND_PAGES.md`
- **Response 201:** `{ id, status:"NEW" }`
- **Rate Limit:** 5/ساعة لكل IP
- **Side Effect:** إشعار (بريد/لوحة تحكم) لفريق العمليات
- **ملاحظة:** راجع `../architecture/09_WORKFLOWS.md` لخطوات سير معالجة الحجوزات من الإنشاء إلى الإتمام.

### `GET /admin/appointments` (List) + `PATCH /admin/appointments/:id/status`
- **Auth:** `appointments:view` / `appointments:manage` (راجع `../security/05_USER_ROLES_AND_PERMISSIONS.md`)
- **Request (status):** `{ status: "CONTACTED" | "CONFIRMED" | "CANCELLED" | "COMPLETED" }`
- **Side Effect:** `AuditLog`

### `POST /contact`
- **Auth:** لا يوجد
- **Request:** `{ name, email, phone?, subject?, message }`
- **Validation:** كما في صفحة Contact Us
- **Response 201:** `{ id }`
- **Rate Limit:** 5/ساعة لكل IP

---

## 5. Endpoints الإعدادات والتكاملات

### `GET /settings/public`
- **Auth:** لا يوجد — يرجع فقط المجموعات الآمنة للعرض العام (`general`, `brand`, `social` روابط، `seo` الافتراضي)
### `GET /admin/settings/:group` + `PATCH /admin/settings/:group`
- **Auth:** `settings:view` / `settings:manage`
- **مجموعات:** `general | brand | seo | languages | security`
### `GET/PATCH /admin/integrations`
- **Auth:** `settings:manage` (صلاحية حساسة، Super Admin/Admin فقط — راجع `../security/05_USER_ROLES_AND_PERMISSIONS.md`)
- **Request PATCH:** `{ provider: "ga4", value: "G-XXXXXXX" }` أو `{ provider: "facebook_page_insan", value: "<page_access_token>" }`
- **Effect:** القيمة تُشفَّر قبل التخزين (`IntegrationSetting.encryptedValue`)، ولا تُعاد أبداً كاملة في أي GET لاحق (تُعرض Masked مثل `••••1234`)

---

## 6. Endpoints مزامنة الأخبار (Social Sync)

> **ملاحظة:** راجع `../architecture/09_WORKFLOWS.md` لخطوات سير مزامنة الأخبار بالتفصيل (من الجدولة إلى المراجعة إلى النشر).

### `POST /admin/news/sync/trigger`
- **Auth:** `news:manage` — تشغيل يدوي فوري (بجانب الجدولة التلقائية)
- **Request:** `{ sourceEntity?: "INSAN"|"FUTURE"|"DELTA" }` (اختياري لتحديد كيان واحد)
- **Response 202:** `{ jobId, status:"queued" }`
### `GET /admin/news/sync/status/:jobId`
- **Response 200:** `{ status:"running"|"completed"|"failed", fetchedCount, newCount, errors:[] }`
### `GET /admin/news?sourceType=social_sync&status=DRAFT`
- لمراجعة البوستات المزامنة قبل النشر (نفس Endpoint الـ List القياسي بفلتر)

---

## 7. Endpoints مساعد الشات (AI Chat)

### `POST /ai-chat/message` (Public)
- **Auth:** لا يوجد (Rate Limited)
- **Request:** `{ conversationId?: string, message: string, locale: "ar"|"en" }`
- **Response 200:**
```json
{
  "conversationId": "...",
  "reply": "...",
  "suggestedActions": [ { "type":"whatsapp", "label":{"ar":"تواصل واتساب"} }, { "type":"appointment", "label":{"ar":"احجز موعد"} } ],
  "isEscalated": false
}
```
- **Validation:** `message` 1-1000 حرف
- **Rate Limit:** 20 رسالة/10 دقائق لكل Visitor (بمعرّف Cookie)
- **Errors:** `429 TOO_MANY_REQUESTS`, `503 AI_PROVIDER_UNAVAILABLE` (مع رسالة fallback ودّية + اقتراح واتساب مباشرة)

### `GET /admin/ai-chat/conversations` + `GET /admin/ai-chat/conversations/:id`
- **Auth:** `ai-chat:view`
### `GET /admin/ai-chat/knowledge-base` + CRUD كامل (`POST`/`PATCH`/`DELETE`)
- **Auth:** `ai-chat:manage`
- **Request POST:** `{ topic:{ar,en}, question:{ar,en}, answer:{ar,en}, category }`
### `GET /admin/ai-chat/settings` + `PATCH /admin/ai-chat/settings`
- **Request PATCH:** `{ isEnabled, greetingMessage:{ar,en}, escalationEnabled, escalationChannel:"whatsapp" }`
### `GET /admin/ai-chat/analytics`
- **Response:** أكتر الأسئلة تكراراً، نسبة الأسئلة "بدون إجابة" (`isUnanswered=true`)، متوسط طول المحادثة

---

## 8. Endpoints المستخدمين والصلاحيات

> **ملاحظة:** راجع `../security/05_USER_ROLES_AND_PERMISSIONS.md` لتعريف الأدوار الكاملة وصفوف الصلاحيات لكل دور.

### `GET/POST/PATCH/DELETE /admin/users` — CRUD كامل
- **Auth:** `users:manage` (Admin/Super Admin فقط — راجع `../security/05_USER_ROLES_AND_PERMISSIONS.md`)
- **Request POST:** `{ name, email, roleId, password (مؤقتة، تُرسل بالبريد لتغييرها) }`
- **Validation:** `email` فريد، `roleId` موجود
- **قيد خاص:** لا يمكن لأي دور غير `SUPER_ADMIN` إنشاء مستخدم بدور `SUPER_ADMIN`
### `GET/PATCH /admin/roles` — عرض/تعديل مصفوفة الصلاحيات لكل دور
- **Auth:** `SUPER_ADMIN` فقط (راجع `../security/05_USER_ROLES_AND_PERMISSIONS.md` لتعريفات الصلاحيات)

---

## 9. Endpoints سجل المراجعة والتحليلات

### `GET /admin/audit-logs`
- **Auth:** `audit:view`
- **Query:** `entity`, `userId`, `dateFrom`, `dateTo`, `page`
### `GET /admin/analytics/overview`
- **Auth:** `analytics:view`
- **Response:** عدد الزيارات (لو مربوط GA API لاحقاً)، عدد طلبات الحجز الجديدة، عدد رسائل التواصل غير المقروءة، عدد محادثات AI اليوم، آخر الأنشطة

---

## 10. رموز الأخطاء الموحّدة (Global Error Codes)

> **المرجع الكامل:** انظر [§0.7 — جدول HTTP Status Codes المرجعي](#07-جدول-رموز-http-status-codes- المرجعي) في началه هذا الملف للجدول الشامل مع كل الاستخدامات. الجدول أدناه هو ملخص مُبسّط للمراجعة السريعة.

| Code | HTTP Status | المعنى |
|---|---|---|
| `VALIDATION_ERROR` | 400 | بيانات مدخلة غير صحيحة |
| `INCOMPLETE_CONTENT` | 400 | نواقص إجبارية قبل النشر |
| `UNAUTHORIZED` | 401 | لا يوجد JWT صالح |
| `INVALID_CREDENTIALS` | 401 | كلمة المرور غير صحيحة |
| `FORBIDDEN` | 403 | لا يملك الصلاحية المطلوبة |
| `NOT_FOUND` | 404 | المورد غير موجود |
| `CONFLICT` | 409 | تعارض (slug مكرر، ارتباطات نشطة) |
| `FILE_TOO_LARGE` | 413 | حجم الملف يتجاوز الحد |
| `UNIQUE_CONSTRAINT` | 422 | انتهاك قيد فريد |
| `TOO_MANY_REQUESTS` | 429 | تجاوز Rate Limit |
| `INTERNAL_ERROR` | 500 | خطأ غير متوقع بالخادم |
| `AI_PROVIDER_UNAVAILABLE` | 502 | مزوّد الذكاء الاصطناعي غير متاح |
| `SERVICE_UNAVAILABLE` | 503 | الخادم غير متاح مؤقتاً |

---

**التالي:** `../security/05_USER_ROLES_AND_PERMISSIONS.md`