# 10 — Folder Structure (Replit Implementation)

> **Document Version:** 1.1
> **Status:** Final
> **Last Updated:** 2025-07-16
> **Source of Truth:** Yes

> **Cross-references:** This document defines the directory layout for the entire project. For the architecture rationale behind each module, see `01_ARCHITECTURE.md`. For the database schema referenced within the API module, see `../database/03_DATABASE_SCHEMA.md`.

---

## 1. الشكل العام (Monorepo — Turborepo)

```
insan-platform/
├── apps/
│   ├── web/                          # Next.js — الموقع العام + لوحة التحكم
│   │   ├── app/
│   │   │   ├── [locale]/             # (ar|en) — next-intl routing
│   │   │   │   ├── (public)/         # مسارات الموقع العام
│   │   │   │   │   ├── page.tsx              # Home
│   │   │   │   │   ├── about/page.tsx
│   │   │   │   │   ├── hospitals/
│   │   │   │   │   │   ├── page.tsx          # List
│   │   │   │   │   │   └── [slug]/page.tsx   # Detail
│   │   │   │   │   ├── medical-centers/
│   │   │   │   │   ├── doctors/
│   │   │   │   │   ├── news/
│   │   │   │   │   ├── contact/page.tsx
│   │   │   │   │   ├── investors/page.tsx    # مخفية، بدون رابط تنقّل
│   │   │   │   │   ├── privacy/page.tsx
│   │   │   │   │   └── terms/page.tsx
│   │   │   │   └── (admin)/          # لوحة التحكم — محمية بـ Middleware
│   │   │   │       ├── login/page.tsx
│   │   │   │       ├── dashboard/page.tsx
│   │   │   │       ├── pages/
│   │   │   │       ├── hospitals/
│   │   │   │       ├── medical-centers/
│   │   │   │       ├── doctors/
│   │   │   │       ├── news/
│   │   │   │       ├── media/
│   │   │   │       ├── appointments/
│   │   │   │       ├── contact-submissions/
│   │   │   │       ├── testimonials/
│   │   │   │       ├── navigation/
│   │   │   │       ├── users/
│   │   │   │       ├── settings/
│   │   │   │       ├── ai-assistant/
│   │   │   │       └── audit-log/
│   │   │   ├── sitemap.ts            # توليد sitemap.xml ديناميكي
│   │   │   ├── robots.ts
│   │   │   └── layout.tsx            # Root layout: StickyActionsBar + ChatWidget
│   │   ├── components/
│   │   │   ├── ui/                   # Base UI elements: Button, Input, Modal, Toast, Select, etc.
│   │   │   ├── blocks/               # Layout sections: Hero, Footer, Header, FeatureGrid, etc.
│   │   │   ├── features/             # Domain-specific: HospitalCard, DoctorCard, NewsCard, etc.
│   │   │   ├── admin/                # Admin-only: DataTable, PageBuilderCanvas, EntityForm, etc.
│   │   │   └── shared/               # Cross-cutting: ErrorBoundary, LoadingSpinner, etc.
│   │   ├── lib/
│   │   │   ├── api-client.ts         # طبقة استدعاء NestJS API (typed)
│   │   │   ├── auth.ts               # إدارة accessToken في الذاكرة + refresh logic
│   │   │   └── query-client.ts       # إعداد React Query
│   │   ├── locales/
│   │   │   ├── ar.json               # نصوص الواجهة الثابتة
│   │   │   └── en.json
│   │   ├── middleware.ts             # حماية مسارات /admin + i18n routing
│   │   ├── public/                   # Static assets (favicon, fonts محليّة إن وُجدت)
│   │   ├── next.config.js            # output: 'standalone' (Docker-ready)
│   │   ├── Dockerfile
│   │   └── package.json
│   │
│   └── api/                          # NestJS — الـ Backend المستقل
│       ├── src/
│       │   ├── modules/
│       │   │   ├── auth/             # AuthModule (JWT, Guards, Strategies)
│       │   │   ├── users/
│       │   │   ├── roles/
│       │   │   ├── pages/
│       │   │   ├── sections/
│       │   │   ├── hospitals/
│       │   │   ├── medical-centers/
│       │   │   ├── clinics/
│       │   │   ├── doctors/
│       │   │   ├── news/
│       │   │   ├── news-categories/
│       │   │   ├── social-sync/      # Worker + Adapters (Facebook, LinkedIn)
│       │   │   ├── media/
│       │   │   ├── navigation/
│       │   │   ├── settings/
│       │   │   ├── integrations/     # تخزين/تشفير التوكنز الخارجية
│       │   │   ├── appointments/
│       │   │   ├── contact/
│       │   │   ├── testimonials/
│       │   │   ├── ai-chat/          # ChatModule + AiProviderAdapter (قابل للتبديل)
│       │   │   ├── audit-log/
│       │   │   └── analytics/
│       │   ├── common/
│       │   │   ├── guards/           # RolesGuard, PermissionsGuard, JwtAuthGuard
│       │   │   ├── decorators/       # @RequirePermission(), @CurrentUser()
│       │   │   ├── interceptors/     # AuditInterceptor, ResponseEnvelopeInterceptor
│       │   │   ├── filters/          # GlobalExceptionFilter (صيغة الأخطاء الموحّدة)
│       │   │   └── pipes/            # ValidationPipe المخصص
│       │   ├── jobs/                 # BullMQ Processors (social-sync, notifications)
│       │   ├── config/               # تحميل متغيرات البيئة (typed, validated)
│       │   ├── app.module.ts
│       │   └── main.ts
│       ├── prisma/
│       │   ├── schema.prisma         # (المحتوى الكامل في 03_DATABASE_SCHEMA.md)
│       │   ├── migrations/
│       │   └── seed.ts               # بيانات أولية (الأدوار الخمسة، مستخدم Super Admin أول)
│       ├── test/
│       ├── Dockerfile
│       └── package.json
│
├── packages/
│   ├── types/                        # DTOs/Types مشتركة بين web و api (TypeScript)
│   ├── ui/                           # مكتبة تصميم مشتركة (لو احتجنا مستقبلاً apps إضافية)
│   └── config/                       # eslint/tsconfig/tailwind config مشتركة
│
├── infra/
│   ├── docker-compose.dev.yml        # web + api + postgres + minio (S3 محلي) + redis
│   ├── docker-compose.prod.yml       # مرجعي — يُستبدل بخدمات مُدارة عند النشر الفعلي
│   └── nginx/ (اختياري)               # Reverse proxy config لو النشر على VPS مباشر
│
├── .env.example                      # قائمة كاملة بمتغيرات البيئة المطلوبة
├── turbo.json
├── package.json                      # Workspace root
└── README.md
```

### Component Directory Naming Convention

| Directory | Purpose | Examples |
|---|---|---|
| `components/ui/` | Base UI elements — generic, reusable anywhere | Button, Input, Modal, Toast, Select, Badge, Avatar |
| `components/blocks/` | Layout sections — compose full-page layouts | Hero, Footer, Header, FeatureGrid, TestimonialCarousel |
| `components/features/` | Domain-specific — tied to a business entity | HospitalCard, DoctorCard, NewsCard, AppointmentForm |
| `components/admin/` | Admin-only — never imported in public pages | DataTable, PageBuilderCanvas, EntityForm, FilterBar |

> **⚠ DO NOT use Vercel-specific KV, Edge Config, or Blob storage.** Use standard Postgres, standard S3-compatible API, and standard Node.js patterns throughout.

---

## 2. قواعد التسمية (Naming Conventions)

| العنصر | القاعدة | مثال |
|---|---|---|
| ملفات الصفحات (Next.js) | `page.tsx` داخل مجلد باسم المسار | `hospitals/[slug]/page.tsx` |
| المكونات (Components) | PascalCase | `HospitalCard.tsx` |
| الدوال/المتغيرات | camelCase | `getPublishedHospitals()` |
| جداول قاعدة البيانات (Prisma Models) | PascalCase مفرد | `Hospital`, `NewsPost` |
| مسارات الـ API | kebab-case جمع | `/medical-centers`, `/news-categories` |
| المتغيرات البيئية | UPPER_SNAKE_CASE | `DATABASE_URL` |
| فروع Git | `feature/`, `fix/`, `chore/` + وصف مختصر | `feature/ai-chat-widget` |

---

## 3. متغيرات البيئة (.env.example)

### apps/api/.env
```
NODE_ENV=development
PORT=4000
DATABASE_URL=postgresql://user:pass@localhost:5432/insan
JWT_ACCESS_SECRET=
JWT_REFRESH_SECRET=
JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_EXPIRES=7d
S3_ENDPOINT=
S3_ACCESS_KEY=
S3_SECRET_KEY=
S3_BUCKET=insan-media
ENCRYPTION_KEY=                 # لتشفير IntegrationSetting.encryptedValue
REDIS_URL=                      # اختياري بالبداية — للـ Queue/Cache
LLM_PROVIDER=anthropic
LLM_API_KEY=
CORS_ORIGIN=http://localhost:3000
RATE_LIMIT_WINDOW=15m
RATE_LIMIT_MAX=100
```

### apps/web/.env
```
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000/api/v1
NEXT_PUBLIC_DEFAULT_LOCALE=ar
NEXT_PUBLIC_SITE_URL=https://insan-platform.com
```

> **ملاحظة أمان:** `.env` الحقيقي لا يُرفَع أبداً على Git — فقط `.env.example` بدون قيم فعلية. في بيئة Replit، المتغيرات تُضاف عبر "Secrets" الخاصة بالمنصة.

---

## 4. سكريبتات أساسية (Root package.json scripts)

```
dev            → تشغيل web + api معاً (turbo run dev)
build          → بناء كل الـ apps للإنتاج
db:migrate     → prisma migrate deploy
db:seed        → تشغيل seed.ts (الأدوار + مستخدم Super Admin أول)
db:studio      → فتح Prisma Studio لمعاينة البيانات
lint / test    → فحص الكود واختباره عبر كل الـ Workspaces
```

---

**التالي:** `11_STATE_MANAGEMENT.md`
