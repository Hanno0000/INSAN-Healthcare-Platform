# خطة معمارية لبناء منصة INSAN الرقمية (Architecture Phase)
**قبل كتابة أي كود — هذه هي مرحلة التصميم المعماري الكاملة.**

---

## 0. ملاحظة تعارض في النطاق (Scope Conflict — تحتاج قرارك)

الطلب العام وصف منصة SaaS ضخمة (اشتراكات، فوترة، Marketplace، Plugins، White-Label).
لكن ملفات المشروع (`AI_CREATIVE_CONSTITUTION`, `MASTER_BRAND_ARCHITECTURE`, `PROJECT_STRUCTURE`) تصف **موقع مؤسسي/تسويقي** لمنظومة INSAN (مستشفيات + مراكز طبية)، وليس منتج SaaS يُباع للعملاء.

**التوصية:** نبني الآن CMS كامل الصلاحيات (لا شيء Hardcoded) بنفس فلسفة "التحكم الكامل من الأدمن" المطلوبة، لكن **بدون** وحدات SaaS (اشتراكات/فوترة/Marketplace) لأنها غير مذكورة في مستندات البراند. قاعدة البيانات ستُصمَّم بمرونة تسمح بإضافتها لاحقاً دون إعادة هيكلة. **بانتظار تأكيدك.**

---

## 1. الفهم العام (من ملفات المشروع)

| المصدر | الخلاصة المستخدمة في التصميم |
|---|---|
| Master Brand Architecture | INSAN (Master) ← Hospitals (Sub-brands: Future, Delta) ← Medical Centers (Signature brands، حالياً 12 مركز، Future يشغّل 4 فقط، Delta يشغّل الـ12) |
| Platform Knowledge Base | كل مركز = مميزات + خدمات + عيادات + جدول عيادات (بنية موحدة قابلة لإعادة الاستخدام) |
| Creative Constitution | الهوية: هادئة، احترافية، بيضاء المساحات، بدون Clickbait/خصومات/ادعاءات غير مثبتة |
| Project Decisions | Audience Priority: Investors 50% / Doctors 30% / Patients 20% — يؤثر على ترتيب المحتوى والـ CTAs |
| خريطة الموقع (الصورة) | Sitemap فعلي + مكونات الصفحة الرئيسية بالترتيب + أزرار ثابتة (طوارئ/حجز/واتساب) في كل صفحة |

---

## 2. Information Architecture (مطابقة الصورة)

```
Home (INSAN)
├── عن المجموعة (About)
├── مستشفياتنا (Our Hospitals)
│   ├── Future Hospital
│   │   └── عن المستشفى | مراكزه الطبية (4) | الأطباء | جدول العيادات | أخبار | معرض | تواصل/حجز
│   └── Delta Hospital
│       └── عن المستشفى | مراكزه الطبية (12) | الأطباء | جدول العيادات | أخبار | معرض | تواصل/حجز
├── الأخبار والأنشطة (News & Media)
└── تواصل معنا (Contact)

Global (تظهر في كل صفحة): زر الطوارئ | احجز موعد | واتساب
```

**صفحة الهوم — ترتيب الأقسام (من الصورة):**
Hero → Why Choose Us → Our Hospitals → Featured Medical Services → Doctors → Patient Journey → Latest News → Contact → Footer

**نقطتان تحتاجان قرارك (تعارض بين الصورة والمستندات):**
- الصورة لا تُظهر "Medical Centers" أو "Investor Page" كعناصر في القائمة الرئيسية، بينما المستندات تذكرهما كطبقتين مستقلتين.
 **توصيتي:** المراكز الطبية تُعرض كصفحات فرعية داخل كل مستشفى (متوافق مع Ownership Model في `MASTER_BRAND_ARCHITECTURE`)، مع رابط "مراكزنا الطبية" اختياري في الفوتر لا في القائمة الرئيسية — حفاظاً على البساطة (بند 11 في الدستور الإبداعي). صفحة Investor تبقى مخفية بدون أي رابط ظاهر.

---

## 3. Content / Component Model

| Component | يُستخدم في | الحقول القابلة للتحرير من الأدمن |
|---|---|---|
| Hero | Home, Hospital pages | عنوان، وصف، صورة/فيديو خلفية، أزرار CTA |
| FeatureGrid ("Why Choose Us") | Home | قائمة مميزات (أيقونة + نص) |
| EntityCards ("Our Hospitals") | Home | بطاقات مربوطة بجدول Hospitals |
| ServiceCards ("Featured Medical Services") | Home | بطاقات مربوطة بجدول Medical Centers |
| TeamGrid ("Doctors") | Home, Hospital pages | بطاقات مربوطة بجدول Doctors |
| StepsTimeline ("Patient Journey") | Home | خطوات (نص + أيقونة) |
| NewsGrid | Home, News page | مربوط بجدول News Posts |
| ContactBlock | Home, Contact page | بيانات تواصل + خريطة |
| StickyActionsBar | كل الصفحات (Global) | روابط الطوارئ / الحجز / واتساب |
| Footer | كل الصفحات (Global) | روابط سريعة، سوشيال ميديا، بيانات تواصل |

كل Component يُخزَّن كـ Section بإعدادات JSON، فيمكن للأدمن سحب/إفلات وترتيب الأقسام في أي صفحة دون كود.

---

## 4. Database Schema (الكيانات الأساسية)

| الجدول | حقول رئيسية | العلاقات |
|---|---|---|
| `users` | name, email, password_hash, role_id, status | ينتمي لـ role |
| `roles` | name, permissions (json) | له عدة users |
| `pages` | slug, title_ar/en, status, seo (json) | له عدة sections |
| `sections` | page_id, component_type, order, config (json) | ينتمي لـ page |
| `hospitals` | slug, name_ar/en, logo, hero_image, brand_color | M:N مع medical_centers, له doctors, news |
| `medical_centers` | slug, name_ar/en, features (json), services (json) | M:N مع hospitals, له clinics, doctors |
| `clinics` | center_id, name, schedule (json) | ينتمي لـ medical_center |
| `doctors` | name, title, specialty, photo, bio | M:N مع hospitals و medical_centers |
| `news_posts` | title, slug, category_id, author_id, body, status, published_at, related_hospital_id (nullable) | ينتمي لـ category, author |
| `news_categories` | name | له عدة posts |
| `testimonials` | name, audience_type (investor/doctor/patient), quote, photo | - |
| `media` / `media_folders` | url, type, alt, tags (json), folder_id | - |
| `navigation` | label, target, parent_id, location, order | - |
| `settings` | key, value (json), group | - |
| `appointment_requests` | name, phone, hospital_id, center_id, preferred_date, status | ينتمي لـ hospital/center |
| `audit_logs` | user_id, action, entity, entity_id, diff (json), created_at | ينتمي لـ user |

> ملاحظة: علاقة `hospitals` ↔ `medical_centers` هي Many-to-Many حتى تعكس الفرق الحقيقي (Future = 4 مراكز، Delta = 12 مركز) دون تكرار بيانات المركز.

---

## 5. API Design (REST — مختصر)

**Public (Read-only, Cached):**
`GET /api/pages/:slug` · `/api/hospitals[/:slug]` · `/api/medical-centers[/:slug]` · `/api/doctors` · `/api/news[/:slug]` · `/api/navigation` · `/api/settings/public`
`POST /api/appointments` · `POST /api/contact` *(مع Rate Limiting وحماية Spam)*

**Admin (Auth + RBAC):**
`/admin/api/pages` · `/sections` · `/hospitals` · `/medical-centers` · `/doctors` · `/news` · `/media` · `/users` · `/roles` · `/settings` · `/audit-logs` · `/analytics`
*(كل مسار يدعم CRUD كامل + صلاحيات حسب الدور)*

---

## 6. هيكل لوحة التحكم (Admin Dashboard)

```
Dashboard (تحليلات عامة)
├── Pages (Page Builder)
├── Hospitals
├── Medical Centers
├── Doctors & Clinics Schedule
├── News & Media (Blog CMS)
├── Media Library
├── Appointment / Leads
├── Testimonials
├── Navigation & Footer
├── Users & Roles
├── Settings (Brand / SEO / Integrations / Languages / Security)
└── Audit Log
```

---

## 7. Tech Stack والسبب

| الطبقة | الاختيار | لماذا |
|---|---|---|
| Public Frontend | Next.js (App Router) | SSR/SSG لأداء و SEO قوي، دعم ممتاز لـ i18n و RTL |
| Admin Dashboard | نفس تطبيق Next.js (route group منفصل) | إعادة استخدام مكتبة المكونات، تقليل التعقيد التشغيلي |
| Backend/API | Next.js Route Handlers الآن (قابل للفصل لاحقاً إلى NestJS) | بداية بسيطة وسريعة؛ Prisma schema تسمح بالفصل لاحقاً دون إعادة بناء |
| Database | PostgreSQL | علائقية وموثوقة، تدعم JSONB لإعدادات الأقسام المرنة |
| ORM | Prisma | Type-safe، Migrations واضحة |
| Auth | NextAuth.js / JWT + Middleware أدوار | يدعم RBAC بسهولة |
| Media Storage | Cloudflare R2 أو AWS S3 | تخزين قابل للتوسع بتكلفة منخفضة |
| Hosting | Vercel (Frontend) + Neon/Supabase (Postgres) | نشر سريع وScaling تلقائي |
| i18n | next-intl | عربي RTL + إنجليزي |
| Page Builder | dnd-kit + Component Registry Pattern | الأدمن يجمّع الأقسام دون كود |

---

## 8. هيكل المجلدات (Monorepo)

```
insan-platform/
├── apps/web/                # Next.js: الموقع العام + /admin
│   ├── app/(public)/  (admin)/  api/
│   ├── components/sections/   # Hero, FeatureGrid, Doctors...
│   └── components/admin/
├── packages/
│   ├── db/                  # Prisma schema + client
│   ├── ui/                  # مكتبة تصميم مشتركة
│   └── config/              # i18n, brand tokens, constants
└── infra/                   # ملفات النشر
```

---

## 9. خارطة الطريق (Roadmap)

| المرحلة | المحتوى | تقدير |
|---|---|---|
| 0 | اعتماد هذا التصميم | — |
| 1 | البنية الأساسية: DB + Auth + Roles + Design Tokens | 1-2 أسبوع |
| 2 | Page Builder + مكتبة المكونات + Media Library | 2 أسبوع |
| 3 | نماذج المحتوى: Hospitals / Medical Centers / Doctors / Clinics | 1-2 أسبوع |
| 4 | صفحات الموقع العام حسب الخريطة (Home/About/Hospitals/News/Contact) | 2 أسبوع |
| 5 | News/Blog CMS + SEO | 1 أسبوع |
| 6 | نماذج التواصل: حجز موعد / واتساب / زر الطوارئ | 1 أسبوع |
| 7 | Users/Roles + Audit Log + Analytics | 1-2 أسبوع |
| 8 | إطلاق: أداء، أمان، SEO Audit، QA عربي/إنجليزي | 1 أسبوع |
| 9+ | توسعات مستقبلية: Investor Portal, Telemedicine, EMR hooks | حسب الأولوية |

---

## 10. قرارات بانتظار موافقتك

1. **نطاق المنصة:** بناء CMS تسويقي كامل الآن بدون وحدات SaaS (اشتراكات/فوترة)، مع قاعدة بيانات مرنة للتوسع لاحقاً؟
2. **موقع "المراكز الطبية" و"صفحة المستثمرين":** إبقاؤهما خارج القائمة الرئيسية (فرعية داخل المستشفيات + رابط مخفي للمستثمرين) حفاظاً على بساطة الصورة المرفقة؟
3. **الفصل المستقبلي للـ Backend:** البدء بـ Next.js موحّد الآن مع تصميم يسمح بالانتقال لـ NestJS لاحقاً إن كبر المشروع؟

بعد تأكيدك على الثلاث نقاط (أو تعديلها) أبدأ مباشرة في **Phase 1**.
