# 99 — Master Build Guide for Replit Agent

> **Document Version:** 1.1
> **Status:** Final
> **Last Updated:** 2025-07-16
> **Source of Truth:** Yes

**هذا الملف مخصص لك أنت — Replit Agent. اقرأه كاملاً أولاً قبل فتح أي ملف كود أو تنفيذ أي أمر.**
هدفك: بناء منصة INSAN الرقمية بالكامل (موقع عام + لوحة تحكم) بأقل قدر ممكن من الافتراضات، بالاعتماد **حصراً** على ملفات هذا المجلد كمصدر حقيقة وحيد.

---

## 1. ملخص المشروع (Project Summary)

**INSAN** منصة مصرية لإدارة منظومة رعاية صحية متكاملة (Healthcare Ecosystem)، تضم حالياً مستشفيين (Future Hospital, Delta Hospital) و12 مركزاً طبياً متخصصاً. المطلوب بناء:

1. **موقع عام (Public Website)** ثنائي اللغة (عربي/إنجليزي، RTL/LTR) بالكامل قابل للإدارة من لوحة تحكم بدون أي تعديل كود، محسّن لمحركات البحث (SEO)، يعرض المستشفيات والمراكز الطبية والأطباء والأخبار (يدوية + مُزامَنة من السوشيال ميديا)، ويحتوي على نموذج حجز مواعيد ونافذة شات بالذكاء الاصطناعي ثابتة في كل صفحة.
2. **لوحة تحكم (Admin Dashboard)** بصلاحيات متدرجة (5 أدوار) تتحكم في كل حرف وصورة وإعداد بالموقع.

**Tech Stack المعتمد نهائياً (تفاصيل كاملة في `01_ARCHITECTURE.md`):**
Next.js (Frontend، موقع عام + لوحة تحكم) + NestJS (Backend API مستقل) + PostgreSQL + Prisma + JWT Auth مخصص + S3-compatible Storage + Docker — كله مُصمَّم عمداً بدون Vendor Lock-in.

---

## 2. ترتيب قراءة الملفات (إلزامي — بهذا الترتيب بالضبط)

| # | الملف | ماذا تستفيد منه |
|---|---|---|
| 1 | `00_README_FOR_BUILDER.md` | القرارات المعتمدة النهائية (لا تبدأ بدونها) |
| 2 | `01_ARCHITECTURE.md` | الـ Tech Stack الكامل + معمارية كل موديول (i18n, SEO, Social Sync, AI Chat, Security) |
| 3 | `02_INFORMATION_ARCHITECTURE_AND_PAGES.md` | كل صفحة عامة بالتفصيل الكامل |
| 4 | `../database/03_DATABASE_SCHEMA.md` | Prisma Schema الكامل جاهز للنسخ المباشر |
| 5 | `../api/04_API_SPECIFICATION.md` | كل Endpoint بالتفصيل (Request/Response/Validation/Errors) |
| 6 | `../security/05_USER_ROLES_AND_PERMISSIONS.md` | الأدوار الخمسة ومصفوفة الصلاحيات الكاملة |
| 7 | `../admin/06_ADMIN_DASHBOARD_SPECIFICATION.md` | كل شاشة إدارية بالتفصيل |
| 8 | `../ui/07_UI_COMPONENT_INVENTORY.md` | كل مكوّن قابل لإعادة الاستخدام |
| 9 | `../ui/08_DESIGN_SYSTEM.md` | الألوان/الخطوط/المسافات/الحركة |
| 10 | `09_WORKFLOWS.md` | كل عملية تشغيلية خطوة بخطوة |
| 11 | `10_FOLDER_STRUCTURE.md` | هيكل المجلدات الكامل جاهز للإنشاء المباشر |
| 12 | `../state/11_STATE_MANAGEMENT.md` | كيف تُدار البيانات والحالة بالواجهة |
| 13 | `../deployment/12_DEPLOYMENT.md` | Docker وبيئات التشغيل والنسخ الاحتياطي |
| 14 | `../future/13_FUTURE_EXPANSION.md` | كيف يُوسَّع كل موديول مستقبلاً بدون إعادة هيكلة (اقرأه، لكن لا تبني أي شيء منه الآن) |
| 15 | `../ui/14_UI_SCREEN_SPECIFICATION.md` | تفاصيل كل شاشة بالتصميم الدقيق (Layout، الأبعاد، الحالات) |
| 16 | `../ui/15_COMPONENT_SPECIFICATION.md` | مواصفات كل مكوّن تقنياً (Props، States، سلوك التفاعل) |
| 17 | `../database/16_SEED_DATA_SPECIFICATION.md` | البيانات الأولية المطلوب إدخالها عند أول تشغيل (المستشفيات، المراكز، الأدوار) |
| 18 | **هذا الملف (`99`)** | خطة التنفيذ النهائية التي تجمع كل ما سبق |

> **قاعدة صارمة:** لو وجدت أي غموض أثناء التنفيذ، ارجع لهذه الملفات أولاً قبل أي افتراض من عندك. لو الغموض ما زال قائماً بعد المراجعة، وثّق الافتراض الذي اتخذته بوضوح في تعليق بالكود (`// ASSUMPTION: ...`) بدل التوقف.

---

## 3. مراحل البناء التفصيلية (Build Phases)

### Phase 0 — تجهيز البيئة
- **المرجع:** `10_FOLDER_STRUCTURE.md`, `../deployment/12_DEPLOYMENT.md`
- **المطلوب:** إنشاء هيكل الـ Monorepo (Turborepo) بالضبط كما هو موضّح، `docker-compose.dev.yml` يشغّل Postgres+Redis+MinIO، مشروعي `apps/web` (Next.js) و `apps/api` (NestJS) فارغين لكن يعملان (`/health` يرجع 200).
- **معيار الاكتمال:** `docker compose up` يشتغل بدون أخطاء، والوصول لـ `localhost:3000` و `localhost:4000/health` ناجح.

### Phase 1 — قاعدة البيانات والمصادقة
- **المرجع:** `../database/03_DATABASE_SCHEMA.md`, `../security/05_USER_ROLES_AND_PERMISSIONS.md`, `09_WORKFLOWS.md` (قسم 1، 2), `../database/16_SEED_DATA_SPECIFICATION.md`
- **المطلوب:** نسخ الـ Prisma Schema كاملاً، تشغيل Migration، كتابة `seed.ts` وفق بيانات `../database/16_SEED_DATA_SPECIFICATION.md` (الأدوار الخمسة + مستخدم Super Admin أول ببيانات دخول تُطبع في الـ Console عند أول تشغيل)، بناء `AuthModule` بالكامل (login/refresh/logout/forgot-password) + `RolesGuard`/`PermissionsGuard`.
- **معيار الاكتمال:** تسجيل دخول ناجح عبر Postman/Thunder Client بحساب الـ Seed، والحصول على `accessToken` صالح، ومحاولة الوصول لـ Endpoint محمي بدون Token ترجع `401`.

### Phase 2 — الموديولات الأساسية للمحتوى (API)
- **المرجع:** `03`, `04` (أقسام Hospitals/Medical Centers/Clinics/Doctors)
- **المطلوب:** بناء موديولات NestJS الكاملة (Hospitals, MedicalCenters, Clinics, Doctors) بنفس العقد الموحّد (List/Get/Create/Update/Publish/Delete) + `AuditInterceptor` مطبّق على كل عملية كتابة.
- **معيار الاكتمال:** كل Endpoint موثّق في `04` قابل للاستدعاء فعلياً ويرجع الشكل المتوقع بالضبط، والصلاحيات تُفرض صح (اختبار بحساب `EDITOR` يحاول `publish` يرجع `403`).

### Phase 3 — محرك الصفحات ومكتبة الوسائط
- **المرجع:** `03` (Page/Section)، `04` (قسم Sections)، `06` (شاشة 3، 8)، `07` (PageBuilderCanvas, ImagePicker), `../ui/15_COMPONENT_SPECIFICATION.md`
- **المطلوب:** موديول `Pages`/`Sections` بالكامل + رفع الوسائط لـ S3-compatible storage + شاشة Page Builder بالواجهة (سحب/إفلات، Tabs عربي/إنجليزي).
- **معيار الاكتمال:** إنشاء صفحة تجريبية بها 3 أقسام مختلفة، إعادة ترتيبها، حفظها، ونشرها بنجاح، وظهورها في الموقع العام بنفس الترتيب.

### Phase 4 — الموقع العام (كل الصفحات)
- **المرجع:** `02` (كل الصفحات بالتفصيل)، `08` (Design System)، `01` (قسم i18n), `../ui/14_UI_SCREEN_SPECIFICATION.md`, `../ui/15_COMPONENT_SPECIFICATION.md`
- **المطلوب:** بناء كل صفحة مذكورة في `02` بالضبط كما هي موصوفة (Sections، SEO، Responsive)، مع تفعيل التوجيه الثنائي اللغة `/ar` و `/en` وربط `next-intl`.
- **معيار الاكتمال:** كل رابط في خريطة الموقع (قسم Sitemap في `02`) يعمل بنسختيه العربية والإنجليزية، ومطابق للتصميم في `08`، ومتجاوب على 3 مقاسات (Mobile/Tablet/Desktop) كما هو موصوف لكل صفحة.

### Phase 5 — لوحة التحكم (كل الشاشات)
- **المرجع:** `06` (كل شاشة)، `05` (فرض الصلاحيات بالواجهة أيضاً، بجانب الـ API)، `11` (State Management), `../ui/14_UI_SCREEN_SPECIFICATION.md`, `../ui/15_COMPONENT_SPECIFICATION.md`
- **المطلوب:** بناء كل شاشة مذكورة في `06` بالضبط — الجداول، الفلاتر، النماذج، الإجراءات الجماعية.
- **معيار الاكتمال:** كل عملية CRUD من كل شاشة تعمل فعلياً وتنعكس فوراً (React Query invalidation)، وكل شاشة تُخفي/تعطّل العناصر التي لا يملك المستخدم الحالي صلاحية لها.

### Phase 6 — الأخبار + مزامنة السوشيال ميديا
- **المرجع:** `01` (قسم 6)، `09` (قسم 7)، `06` (شاشة 7)
- **المطلوب:** News CMS اليدوي كامل + `SocialSyncModule` (Worker مجدول + Adapters لـ Facebook/Instagram/LinkedIn) + شاشة المراجعة بالأدمن.
- **معيار الاكتمال:** تشغيل "مزامنة الآن" يدوياً (حتى بدون توكنز حقيقية بالبداية، Mock Adapter مقبول للاختبار) يُنشئ سجلات `NewsPost(sourceType=social_sync, status=DRAFT)` بنجاح، وتظهر في تبويب المراجعة.

### Phase 7 — النماذج العامة (Leads)
- **المرجع:** `02` (Contact Us, Book Appointment)، `04` (قسم 4)، `09` (قسم 9، 10), `../ui/15_COMPONENT_SPECIFICATION.md`
- **المطلوب:** `AppointmentForm` + `ContactForm` بكل قواعد التحقق، Rate Limiting فعلي، وشاشتي المتابعة بالأدمن.
- **معيار الاكتمال:** إرسال نموذج ناجح يظهر فوراً في لوحة التحكم بالحالة الصحيحة، ومحاولة إرسال أكتر من 5 مرات بالساعة من نفس IP تُرفَض بـ `429`.

### Phase 8 — مساعد الشات بالذكاء الاصطناعي
- **المرجع:** `01` (قسم 7)، `04` (قسم 7)، `06` (شاشة 15)، `09` (قسم 11)
- **المطلوب:** `ChatWidget` عائم في كل صفحة + `AiChatModule` كاملاً (بما فيه الـ Guardrails الثابتة بالكود) + شاشات إدارة قاعدة المعرفة.
- **معيار الاكتمال:** إرسال رسالة تجريبية من الويدجت يرجع رد فعلي، تسجيله في المحادثات بالأدمن، وسؤال طبي تجريبي ("عندي ألم في صدري") يُوجَّه تلقائياً لزر "احجز استشارة" **وليس** لأي إجابة تشخيصية.
- **ملاحظة:** محتوى قاعدة المعرفة الفعلي والشخصية النهائية للمساعد **لن يتم تحديدهما الآن** — ابنِ البنية التحتية فقط بإجابات افتراضية عامة (Placeholder)، صاحب المشروع سيُدخل المحتوى الحقيقي لاحقاً بنفسه من لوحة التحكم.

### Phase 9 — SEO والتحليلات
- **المرجع:** `01` (قسم 5)، `02` (حقول SEO بكل صفحة)، `06` (شاشة Settings > SEO)
- **المطلوب:** Sitemap.xml ديناميكي، robots.txt، JSON-LD لكل نوع صفحة، حقول GA4/GTM في الإعدادات (بدون تفعيل فعلي حتى يوفر صاحب المشروع الـ IDs).
- **معيار الاكتمال:** فحص أي صفحة بأداة Rich Results Test يُظهر الـ Structured Data صحيحة، و `/sitemap.xml` يحتوي كل الصفحات المنشورة بنسختيها.

### Phase 10 — الأمان والنشر
- **المرجع:** `01` (قسم 8)، `12` (كامل)
- **المطلوب:** مراجعة كل الـ Rate Limits والـ Guards، بناء صور Docker النهائية، اختبار `docker-compose.prod.yml` محلياً.
- **معيار الاكتمال:** الصورتان (`web`, `api`) تُبنيان بنجاح وتعملان معاً من الصفر بدون أي اعتماد على بيئة التطوير.

### Phase 11 — الجودة والإطلاق
- **المطلوب:** فحص شامل ثنائي اللغة (كل صفحة بالعربي والإنجليزي)، فحص Responsive على 3 مقاسات لكل صفحة، فحص الوصولية الأساسي (تباين الألوان، Alt text)، فحص الأداء (Core Web Vitals).
- **معيار الاكتمال:** قائمة المراجعة النهائية في القسم 6 أدناه بالكامل ✅.

---

## 4. قواعد غير قابلة للمخالفة أثناء التطوير

1. **لا Hardcoding إطلاقاً** لأي نص/رابط/صورة يفترض أنه محتوى — كل شيء من قاعدة البيانات أو Settings.
2. **الصلاحيات تُفرض في الـ API دائماً**، مش بس بإخفاء الزرار بالواجهة.
3. **كل حقل نصي موجّه للزائر = `Json {ar, en}`** — بدون استثناء، حتى لو بدا بسيطاً وقت الكتابة.
4. **كل عملية كتابة إدارية (Create/Update/Delete/Publish) تُسجَّل في `AuditLog`** تلقائياً عبر Interceptor مركزي، وليس كود مكرر في كل موديول.
5. **مساعد الذكاء الاصطناعي لا يقدّم تشخيصاً طبياً تحت أي ظرف** — هذا Guardrail بالكود نفسه (System Prompt ثابت)، وليس إعداداً قابلاً للتعطيل من لوحة التحكم.
6. **صفحة Investors تبقى `noindex` ومخفية من كل Navigation دائماً**، إلا لو صدر قرار صريح جديد بخلاف ذلك.
7. **لا يُستخدَم `localStorage`/`sessionStorage` لتخزين أي Token** — `accessToken` بالذاكرة فقط، `refreshToken` بـ httpOnly Cookie فقط.
8. **أي كيان جديد يُبنى بحقل `customFields Json`** لضمان قابلية التوسع دون Migration لاحق.
9. **لا يُستدعى أي مزوّد خارجي (LLM, Social APIs) مباشرة من كود متعدد الأماكن** — يجب المرور عبر Adapter موحّد واحد لكل تكامل (`AiProviderAdapter`, Social Sync Adapters) لضمان قابلية الاستبدال.
10. **كل Endpoint جديد يتبع صيغة الاستجابة والأخطاء الموحّدة** المذكورة في `../api/04_API_SPECIFICATION.md` بدون استثناء.
11. **Default to React Server Components.** Only use `'use client'` when the component needs `useState`, `useEffect`, `onClick`, or browser APIs.
12. **No Vendor Lock-in.** Do not use Vercel-specific services (KV, Edge Config, Blob, Vercel Postgres). Use standard Postgres, standard S3 API, standard Node.js.
13. **Form validation:** React Hook Form + Zod on the frontend, class-validator DTOs on the backend. Never trust client-side validation alone.
14. **Component naming:** `components/ui/` (Button, Input), `components/blocks/` (Hero, Footer), `components/features/` (HospitalCard), `components/admin/` (DataTable).

---

## 5. كيفية التحقق من اكتمال كل مرحلة قبل الانتقال للتالية

بعد كل Phase أعلاه، نفّذ الأسئلة التالية **جميعها** قبل الانتقال:

- [ ] هل كل "معيار الاكتمال" المذكور لهذه المرحلة تحقق فعلياً (وليس افتراضاً)؟
- [ ] هل تم اختبار الصلاحيات (RBAC) لهذه المرحلة بحساب أقل من صلاحية كاملة؟
- [ ] هل كل نص جديد ظاهر للزائر مُدخَل بصيغة `{ar, en}` وليس نصاً ثابتاً بالكود؟
- [ ] هل تم تسجيل أي عملية كتابة جديدة في `AuditLog` بنجاح؟
- [ ] هل الموقع/الشاشة الجديدة متجاوبة على الموبايل فعلياً (وليس فقط Desktop)؟

لو أي إجابة "لا" — **لا تنتقل للمرحلة التالية**، ارجع وأكمل الناقص أولاً.

---

## 6. قائمة المراجعة النهائية (Final Checklist قبل اعتبار المشروع "مكتمل")

**البنية التحتية**
- [ ] `docker-compose` (Dev + Prod) يعمل من الصفر بدون أخطاء
- [ ] `/health` على `web` و`api` يرجع 200
- [ ] النسخ الاحتياطي التلقائي لقاعدة البيانات مفعّل ومُختبَر (استرجاع تجريبي ناجح مرة واحدة على الأقل)

**قاعدة البيانات والـ API**
- [ ] كل الجداول في `../database/03_DATABASE_SCHEMA.md` منشأة وتعمل
- [ ] كل Endpoint في `../api/04_API_SPECIFICATION.md` مُختبَر يدوياً ويرجع الشكل الصحيح
- [ ] كل الأخطاء ترجع بالصيغة الموحّدة مع الكود الصحيح

**الصلاحيات**
- [ ] الأدوار الخمسة تعمل تماماً حسب مصفوفة `../security/05_USER_ROLES_AND_PERMISSIONS.md`
- [ ] لا يمكن لأي دور تجاوز صلاحياته حتى لو عدّل الطلب مباشرة (Postman) متجاوزاً الواجهة

**الموقع العام**
- [ ] كل صفحة في `02` منشأة ومطابقة للمواصفة (Sections, SEO, Responsive)
- [ ] عربي/إنجليزي يعملان بالكامل مع `hreflang` صحيح
- [ ] `StickyActionsBar` و `ChatWidget` ظاهران في كل صفحة
- [ ] `sitemap.xml` و `robots.txt` صحيحان، صفحة Investors مُستثناة ومُعلَّمة `noindex`

**لوحة التحكم**
- [ ] كل شاشة في `06` تعمل بكل أزرارها وفلاترها
- [ ] Page Builder يسمح بإنشاء/تعديل/إعادة ترتيب/نشر صفحة كاملة بدون أي كود
- [ ] Audit Log يعرض تاريخ دقيق لكل التغييرات

**الأخبار والتكاملات**
- [ ] News CMS اليدوي يعمل بالكامل
- [ ] Social Sync يعمل (على الأقل بـ Mock Adapter لو التوكنز الحقيقية غير متوفرة بعد)

**النماذج والمساعد الذكي**
- [ ] Appointment + Contact forms يعملان مع Rate Limiting فعلي
- [ ] ChatWidget يرد فعلياً، ويُصعِّد الأسئلة الطبية دون تشخيص، ويُسجِّل كل محادثة

**التصميم والجودة**
- [ ] الألوان/الخطوط/المسافات مطابقة تماماً لـ `../ui/08_DESIGN_SYSTEM.md`
- [ ] فحص وصولية أساسي ناجح (تباين، Alt text، Focus states)
- [ ] فحص أداء أساسي (Core Web Vitals) ضمن نطاق مقبول على الصفحات الرئيسية

**الأمان**
- [ ] كل الأسرار في Environment Variables/Secrets، لا شيء بالكود
- [ ] JWT + RBAC مُفعَّلان وصحيحان على كل مسار إداري
- [ ] Rate Limiting مفعّل على كل نموذج/Endpoint عام

---

## 10. AI Implementation Decision Policy (سياسة اتخاذ القرارات للوكيل المنفّذ)

هذه السياسة رسمية ومُلزمة لوكيل البناء (Replit AI Agent) طوال مدة المشروع.

### ما يُسمّح للوكيل اتخاذه بحرية (Best Practices بدون سؤال)

في المناطق التالية، يجوز للوكيل استخدام أفضل الممارسات المعتادة في الإطارamework (Next.js / NestJS / React) دون طلب إذن من المستخدم:

- تفاصيل الحركة البصرية (Animation curves, durations)
- تصميم أنيميشن التحميل (Loading spinner styles)
- الانتقالات البصرية الطفيفة (Minor visual transitions, hover effects)
- مظهر الإشعارات المنبثقة (Toast appearance, positioning)
- تفاصيل التنسيق التفصيلية (Spacing tweaks, responsive breakpoint fine-tuning within defined ranges)
- تسمية المتغيرات pomocniczych (Helper variable naming that doesn't affect API contracts)
- كتابة تعليقات الكود التوضيحية (Code comments)

### ما يُمنع الوكيل من اتخاذه بمفرده (يجب التوقف والسؤال)

في المناطق التالية، إذا كانت التوثيقات الحالية غير كافية أو غامضة، **يجب على الوكيل التوقف فوراً** وطلب توضيح من المستخدم بدلاً من افتراض أي شيء:

| المنطقة | أمثلة على ما لا يُسمّح بافتراضه |
|---|---|
| **المعمارية (Architecture)** | تغيير هيكل الخدمات، إضافة أدوات غير مذكورة، تغيير نمط الـ Monorepo |
| **قاعدة البيانات (Database)** | تعديل Schema، إضافة جداول، تغيير أنواع الحقول، تعديل العلاقات |
| **الـ API Contracts** | تغيير أسماء المسارات، تعديل هيكل الاستجابة، إضافة endpoints غير موثقة |
| **المصادقة (Authentication)** | أي تغيير على آلية JWT، إضافة طرق تسجيل دخول، تعديل token lifecycle |
| **التفويض (Authorization)** | إضافة أدوار، تعديل صلاحيات، تغيير نمط RBAC |
| **الأمان (Security)** | تعديل rate limiting، تغيير تشفير، إضافة middleware أمان غير موثق |
| **قواعد العمل (Business Rules)** | أي سلوك وظيفي غير موثّق صراحةً في ملفات التوثيق |
| **سلوك CMS** | طريقة حفظ المحتوى، آلية النشر، سلوك Page Builder |

**القاعدة الذهبية:** إذا لم تجد الإجابة في ملفات التوثيق — **لا تخمّن، اسأل.**

---

**عند اكتمال كل ما سبق:** المنصة جاهزة للمراجعة النهائية من صاحب المشروع قبل إطلاقها فعلياً على بيئة الإنتاج.
