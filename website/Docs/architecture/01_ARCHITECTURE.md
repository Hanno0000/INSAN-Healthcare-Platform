# 01 — System Architecture (Replit Implementation)

# 01 — المعمارية الكاملة للنظام (System Architecture)

> **Document Version:** 1.1
> **Status:** Final
> **Last Updated:** 2025-07-16
> **Source of Truth:** Yes

---

## 1. قرار الـ Tech Stack النهائي

> **تحديث مهم:** بعد مراجعة النطاق المستقبلي الكامل (Patient Portal، AI Integrations، لوحات تشغيلية داخلية متعددة، API-first)، تم تغيير قرار الـ Backend من "يبدأ موحّد مع الـ Frontend" إلى **API منفصل تماماً من اليوم الأول**. السبب: لما يبقى عندك أكتر من مستهلك للـ API (الموقع العام، لوحة التحكم، وبعدين Patient Portal وربما تطبيق موبايل)، الأفضل إنهم كلهم يكلموا نفس الـ API الموحّد من البداية بدل ما نبنيه جوه الـ Frontend ونفصله بعدين بمجهود إعادة هيكلة.

| الطبقة | الاختيار | السبب | تجنّب الـ Vendor Lock-in |
|---|---|---|---|
| **Frontend** | Next.js 14+ (React, TypeScript, App Router) | أفضل أداء SEO عبر SSR/SSG/ISR، Mobile-first جاهز بالكامل، الأكثر انتشاراً حالياً مما يعني دقة أعلى لأدوات البناء بالـ AI (زي Replit) | يُبنى بصيغة `output: 'standalone'` (Docker) فيشتغل على أي سيرفر Node.js عادي — مش مربوط بـ Vercel أو أي منصة بعينها |
| **Backend** | NestJS (Node.js + TypeScript) — API مستقل تماماً | معمارية Modular جاهزة للمؤسسات (Modules / Providers / Guards / Interceptors)، تفرض RBAC والـ Validation بشكل منظم من البداية، ومصمم أصلاً ليكون API-first يخدم أي عدد من الواجهات (الموقع، لوحة التحكم، تطبيق مستقبلي) | Node.js قياسي، يُنشر كـ Docker Container على أي Provider |
| **Runtime** | Node.js 20 LTS | لغة واحدة (TypeScript) عبر كل الطبقات → الأنواع (Types) تُشارك بين الـ Frontend والـ Backend، وده بيقلل الأخطاء ويسهّل على أدوات AI فهم الكود ككل واحد متجانس | - |
| **Database** | PostgreSQL (مُدارة أو Self-hosted) | علائقية بالكامل (مهم جداً للعلاقات المعقدة: مستشفيات↔مراكز↔عيادات↔أطباء↔حجوزات)، تدعم JSONB للمرونة والـ Extensibility، وتدعم Full-Text Search بدون أي أداة خارجية | معيار SQL قياسي — النقل بين AWS RDS / Neon / Supabase / VPS عادي = تغيير Connection String فقط |
| **Authentication** | JWT (Access + Refresh Tokens) عبر Passport.js داخل NestJS، تشفير كلمات المرور بـ Argon2 | تحكم كامل في بيانات المستخدمين — مهم جداً لأن المشروع هيتوسع لبيانات مرضى حساسة مستقبلاً (Patient Portal)، وجاهز لإضافة MFA لاحقاً | بديل عن Auth0 / Clerk / Firebase Auth اللي بتقفل بياناتك جوه نظامها وتكلفتها بتزيد مع عدد المستخدمين |
| **ORM** | Prisma | Type-safe بالكامل، أدوات Migration واضحة، أفضل تكامل مع TypeScript + NestJS | تدعم أكتر من قاعدة بيانات (Postgres/MySQL/SQLite) — مفيش قفل على محرك استعلام واحد |
| **CMS Strategy** | Headless CMS **مبني داخلياً** (Page Builder + Component Registry فوق Postgres) — مش SaaS جاهز | تحكم كامل 100% في المحتوى، بدون اشتراكات شهرية بتزيد مع حجم المحتوى، والبيانات ملك المشروع بالكامل وقابلة للتصدير في أي لحظة | بديل عن Contentful / Sanity / Strapi Cloud اللي بتقفل المحتوى جوه نظامها الخاص |
| **File Storage** | تخزين متوافق مع S3 API (AWS S3 / Cloudflare R2 / DigitalOcean Spaces) | معيار صناعي موحّد لتخزين الملفات، مدعوم من كل مزوّدي الاستضافة تقريباً | تغيير المزوّد = تغيير Endpoint + Credentials فقط، بدون تعديل أي كود |
| **Search** | PostgreSQL Full-Text Search (المرحلة الأولى) → قابل للترقية لـ Meilisearch أو Typesense (Open Source, Self-hosted) عند الحاجة لبحث أذكى (Fuzzy, Facets) | يبدأ بدون أي تكلفة أو بنية إضافية | تجنّب Algolia / Elastic Cloud (مدفوعة ومقفولة على مزوّد واحد) |
| **API Architecture** | REST، موثّق بالكامل عبر OpenAPI/Swagger (يُنشأ تلقائياً من كود NestJS)، Versioned (`/api/v1/...`) | عقد واضح (Contract) لأي مستهلك مستقبلي، وسهل جداً لأدوات الـ AI إنها تفهم وتستهلك الـ API من التوثيق مباشرة | OpenAPI معيار مفتوح، مش مرتبط بأداة أو منصة معينة |
| **Deployment Model** | Docker Containers (Frontend container + Backend container) عبر Docker Compose، وقابل للترقية لـ Kubernetes وقت النمو الكبير | - | **أقوى ضمان ضد الـ Vendor Lock-in** — نفس الـ Containers تشتغل بدون تعديل على Replit Deployments / Railway / Render / DigitalOcean / AWS / أي VPS |
| **Hosting Requirements** | Node.js 20+، Postgres Instance، S3-compatible Bucket، CDN أمام الملفات الثابتة، Worker Process للمهام المجدولة (Cron) | - | - |
| **Scalability Strategy** | Containers عديمة الحالة (Stateless) خلف Load Balancer، Redis يُضاف عند الحاجة (Caching / Queue / Rate-limiting)، وISR/SSG على الـ Frontend لتقليل الضغط على القاعدة | - | Redis وLoad Balancer معايير مفتوحة، مش مربوطين بمزوّد معين |

> **ملاحظة:** لتفاصيل هيكل المجلدات المُوصى بها، راجع [10 — Folder Structure](10_FOLDER_STRUCTURE.md). لمواصفات النماذج التفصيلية، راجع [03 — Database Schema](../database/03_DATABASE_SCHEMA.md). للمواصفات التفصيلية للمكونات، راجع [15 — Component Specification](../ui/15_COMPONENT_SPECIFICATION.md).

---

## 2. مخطط النظام العام (High-Level Diagram)

```
الزائر (متصفح/موبايل)
        │
        ▼
Next.js — الموقع العام (SSR / SSG / ISR)  ── /ar/...  و /en/...
        │  REST (fetch من الـ API)
        ▼
┌─────────────────────────────────────────────┐
│           NestJS API (v1) — Docker           │
│  Modules: Pages · Hospitals · MedicalCenters │
│  Doctors · News · Media · Users · AiChat ...  │
└───────────────┬───────────────┬──────────────┘
                │               │
                ▼               ▼
        PostgreSQL       S3-Compatible Storage
                │
                ▼
        Background Worker (Cron)
   - مزامنة السوشيال ميديا (News)
   - تنظيف/تحسين الوسائط
   - إشعارات (حجوزات/تواصل)

Next.js — لوحة التحكم (/admin) ──┐
                                  ├─► نفس الـ API (Auth + RBAC)
Admin Users (Super Admin/Admin/Manager/Editor/Viewer)

Chat Widget (على كل صفحات الموقع) ──► /api/v1/ai-chat/message ──► AiChat Module
                                        (Knowledge Base + بيانات المنصة + LLM API)
```

---

## 3. مبادئ المعمارية الأساسية

- **Extensibility أولاً:** أي كيان أساسي (Page, Hospital, MedicalCenter...) عنده حقل `custom_fields (JSONB)` يسمح بإضافة بيانات جديدة مستقبلاً بدون Migration.
- **لا Hardcoding:** أي نص/رابط/ترتيب يظهر في الموقع مصدره الـ Database أو Settings، مش الكود.
- **Page Builder Pattern:** كل صفحة = مجموعة Sections مرتبة، كل Section له `component_type` + `config (JSON)` — الأدمن يبني الصفحة بالسحب والإفلات من مكونات جاهزة (مسجّلة في Component Registry).
- **RBAC مفروض من الـ API:** الصلاحيات تتفحص في الـ Backend (NestJS Guards) مش بس في واجهة الأدمن.
- **Audit شامل:** أي عملية إنشاء/تعديل/حذف/نشر تُسجَّل تلقائياً (قبل/بعد) في `audit_logs`.

---

## 4. معمارية ثنائية اللغة (i18n Architecture)

- **التوجيه:** مسارات مسبوقة باللغة `/ar/...` و `/en/...` (next-intl)، مع `hreflang` تلقائي يربط بين نسختي كل صفحة لصالح SEO.
- **تخزين المحتوى:** كل حقل نصي في القاعدة يُخزَّن كـ JSON: `{ "ar": "...", "en": "..." }` بدل تكرار الأعمدة أو الجداول. الفايدة: إضافة لغة تالتة مستقبلاً (أو تحديث نص) بدون أي Migration.
  - ينطبق على: Pages, Hospitals, MedicalCenters, Doctors (bio), NewsPosts, Testimonials, Sections config (عناوين/أزرار), Settings labels.
- **الـ Slug:** واحد موحّد لكل كيان (مش عربي/إنجليزي منفصل) لتفادي تعقيد الروابط وتشتت SEO — قابل للمراجعة لاحقاً لو احتجتم Slugs مختلفة لكل لغة.
- **لوحة التحكم:** كل حقل نصي يظهر بـ Tab عربي/إنجليزي جنب بعض، مع تنبيه لو حقل ناقص ترجمة قبل النشر.
- **نصوص الواجهة الثابتة** (أزرار عامة، رسائل الأخطاء): ملفات ترجمة `ar.json` / `en.json` منفصلة عن المحتوى.

---

## 5. معمارية SEO

- **حقول SEO على كل صفحة/كيان:** `meta_title{ar,en}`, `meta_description{ar,en}`, `og_image`, `canonical_url`, `robots(index/noindex)`.
- **Sitemap.xml** يُولَّد تلقائياً (ديناميكي) ويشمل كل الصفحات/المستشفيات/المراكز/الأطباء/الأخبار المنشورة بنسختيها، مع `hreflang alternate links`.
- **robots.txt** قابل للتحكم من الإعدادات (افتراضياً يسمح بكل شيء ويمنع `/admin`).
- **Structured Data (JSON-LD):** `MedicalOrganization` لـ INSAN والمستشفيات، `Physician` للأطباء، `NewsArticle` للأخبار، `BreadcrumbList` للتنقل.
- **الأداء:** Next/Image لتحسين الصور تلقائياً (WebP/AVIF + Lazy Load)، ISR للصفحات العامة (تحديث كل فترة بدل إعادة بناء كامل)، وده بيخدم كل من السرعة و Core Web Vitals.
- **نقطة تكامل Google Analytics/GTM:** حقلين في Settings → Integrations (`GA4 Measurement ID`, `GTM Container ID`) — السكريبت يتحمّل فقط لو القيم موجودة، بدون أي كود تتبّع مكتوب يدوياً في الصفحات. يُنصح بإضافة Cookie Consent Banner بسيط قبل تفعيل التتبع (ممارسة سليمة، مش إلزامية قانونياً في مصر لكنها تعزّز الثقة أمام المستثمرين).

---

## 6. معمارية الأخبار ومزامنة السوشيال ميديا

`news_posts` تُضاف لها حقول:
`source_type` (`manual` | `social_sync`) · `source_platform` (`facebook`/`instagram`/`linkedin`) · `source_entity` (`insan`/`future`/`delta`) · `external_post_id` · `external_permalink` · `synced_at`

**آلية المزامنة (Social Sync Worker):**
1. مهمة مجدولة (كل 30-60 دقيقة) تنادي الـ API الرسمي لكل منصة (Facebook Graph API لصفحات فيسبوك وإنستجرام، LinkedIn API للصفحة المؤسسية) باستخدام Access Tokens مخزّنة **مشفّرة** في `integrations_settings` (تُدخَل من الأدمن، مش Hardcoded في الكود).
2. البوستات الجديدة تُحفَظ في `news_posts` بحالة **Draft** افتراضياً (قابل للتعديل لاحقاً إلى نشر تلقائي من الإعدادات) — كده الأدمن يراجع قبل الظهور، حفاظاً على نبرة البراند (بند 8 في الدستور الإبداعي).
3. الوسائط (صور/فيديو) تُنسخ لتخزيننا الخاص (S3) بدل الاعتماد على رابط المنصة الأصلي، لتفادي الروابط المكسورة لو البوست انحذف من هناك.
4. المحتوى اليدوي (من الأدمن مباشرة) يعمل بشكل مستقل تماماً بنفس جدول `news_posts` بـ `source_type = manual`.

> **ملاحظة تشغيلية:** ربط صفحات فيسبوك/إنستجرام يتطلب Business Verification من Meta و Page Access Token لكل صفحة (INSAN, Future, Delta) — ده إجراء إداري وليس تقني، يُنصح بالبدء فيه بالتوازي مع التطوير حتى لا يؤخر الإطلاق.

---

## 7. معمارية مساعد الشات بالذكاء الاصطناعي (AI Chat Assistant)

- **الواجهة:** نافذة شات عائمة (Widget) ثابتة في كل صفحات الموقع (عربي/إنجليزي، متوافقة مع RTL).
- **المسار:** `POST /api/v1/ai-chat/message { conversationId?, message, locale }`
- **خطوات المعالجة داخل `AiChatModule`:**
  1. حفظ الرسالة في `chat_conversations` / `chat_messages`.
  2. جلب سياق ذي صلة: `ai_knowledge_base` (أسئلة/أجوبة يديرها الأدمن) + بيانات هيكلية من المنصة نفسها (مستشفيات، مراكز، أطباء، جداول عيادات).
  3. استدعاء مزوّد الذكاء الاصطناعي عبر واجهة داخلية `AiProviderAdapter` (**وليس استدعاء مباشر لمزوّد واحد**) — يسمح بتغيير المزوّد مستقبلاً بدون لمس منطق العمل.
  4. **Guardrails ثابتة بالكود (غير قابلة للتعطيل):** المساعد يتعامل مع استفسارات معلوماتية/إدارية فقط (بيانات المستشفيات، مساعدة في الحجز، مواعيد العمل، الاتجاهات) **ولا يقدّم تشخيصاً طبياً أبداً** — أي سؤال طبي يُوجَّه تلقائياً لزر "احجز استشارة".
  5. كل ما هو **قابل للتخصيص من لوحة التحكم:** رسالة الترحيب، قاعدة المعرفة (الأسئلة/الأجوبة)، نبرة الردود، قواعد التصعيد لبشري (واتساب)، تفعيل/تعطيل الميزة بالكامل، تفعيلها بلغة دون الأخرى.
  6. تسجيل كل محادثة + تمييز الأسئلة "بدون إجابة واضحة" تلقائياً، عشان الأدمن يضيف معرفة جديدة بانتظام (حلقة تحسين ذاتي للـ FAQ).
- **وحدة الأدمن المرتبطة:** AI Assistant Settings (تفعيل/رسالة ترحيب/تصعيد) + Knowledge Base (CRUD) + سجل المحادثات + تحليلات (أكتر الأسئلة تكراراً، نسبة الأسئلة بدون إجابة).

---

## 8. معمارية الأمان

- كل مسارات الأدمن محمية بـ JWT + Guards للأدوار/الصلاحيات على مستوى الـ API نفسه.
- Rate Limiting على النماذج العامة (تواصل، حجز موعد، شات AI) لمنع الإساءة.
- تحقق صارم من المدخلات (DTOs + class-validator) على كل Endpoint.
  > **ملاحظة للـ Frontend:** يُستخدم React Hook Form مع Zod schemas للتحقق من صحة المدخلات في واجهة المستخدم قبل إرسالها إلى الـ API. هذا يوفّر تجربة مستخدم أسرع (أخطاء فورية) بينما يظلّ class-validator هو حارس الأمان النهائي على جانب الخادم.
- تسجيل تلقائي (Audit) لأي عملية كتابة إدارية.
- كل الأسرار (بيانات القاعدة، مفاتيح S3، توكنز السوشيال ميديا، مفتاح الـ LLM) في متغيرات بيئة/Secrets Manager، والتوكنز المخزّنة بالقاعدة (لو لزم) تكون مشفّرة.
- HTTPS إجباري، وCORS مقفول على النطاقات المعروفة فقط.

---

## 9. استراتيجية التوسع (Scalability)

Containers عديمة الحالة خلف Load Balancer → قابلة للتكرار أفقياً عند الحاجة · Read Replicas لقاعدة البيانات وقت زيادة الحمل · Redis يُضاف كطبقة Cache/Queue/Rate-limit عند الحاجة الفعلية (مش من اليوم الأول لتفادي تعقيد زيادة) · CDN + ISR يقلّلوا الضغط على القاعدة والـ API لصفحات الموقع العام.

---

## 10. نقاط تمديد جاهزة للمستقبل (Future Extensibility Hooks)

| الإضافة المستقبلية | كيف البنية الحالية جاهزة لها |
|---|---|
| Subscriptions/Billing | Module منفصل جديد في NestJS، بدون تعديل الجداول الأساسية |
| Patient Portal | يمتد من نفس نظام الـ Auth بإضافة نوع مستخدم "Patient" وصلاحيات مستقلة |
| Telemedicine | نقطة تكامل جديدة (Video SDK) داخل موديول الحجز الحالي |
| لوحات تشغيلية داخلية إضافية | تُضاف كـ `apps/*` جديدة في نفس الـ Monorepo، تستهلك نفس الـ API |
| تطبيق موبايل | نفس REST API (موثّق بـ OpenAPI) جاهز للاستهلاك مباشرة |
| توسّع لمجموعات مستشفيات تانية (Multi-tenant) | البيانات أصلاً مربوطة بـ `hospital_id` — يسهل تحويلها لعزل بيانات كامل بين عملاء لو احتاج المشروع ده مستقبلاً |

---

**التالي:** `02_INFORMATION_ARCHITECTURE_AND_PAGES.md` — خريطة الموقع الكاملة ومواصفة كل صفحة بالتفصيل.