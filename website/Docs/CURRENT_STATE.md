# INSAN Website Platform -- Current State

> **Version:** 2.0
> **Date:** 2026-07-25
> **Status:** Pre-Implementation (Documentation Complete)
> **Canonical Handoff Document** -- Primary entry point for Website Platform development only.
> **Scope:** Website Platform only. For Campaign OS, see `campaign-os/docs/CURRENT_STATE.md`.

---

## Executive Summary

| Dimension | Status |
|-----------|--------|
| **Project Phase** | Pre-Implementation |
| **Documentation** | 100% complete (18 specification documents, ~4,500+ lines) |
| **Source Code** | 0% -- no code files exist anywhere in the repository |
| **Database** | Schema fully designed in Prisma (26 models, 8 enums), not instantiated |
| **API** | 101+ endpoints fully specified across 22 modules, not implemented |
| **Frontend** | 15 public pages + 16 admin screens fully specified, not implemented |
| **Deployment** | Docker, CI/CD, monitoring fully specified, not configured |
| **Brand Assets** | Complete (5 logo variants, multi-format) |

**Overall:** This is a fully-designed but completely unbuilt platform. The architecture, database schema, API contracts, UI specifications, security model, and deployment pipeline are all documented in exhaustive detail. Implementation has not started. The `99_REPLIT_BUILD_GUIDE.md` provides a clear 12-phase execution roadmap ready to follow.

---

## Repository Status

**Branch:** `main` (up to date with `origin/main`)
**Remote:** `origin/main` only
**Uncommitted changes:** None within `website/` directory.

### Recent Commits

| Hash | Message |
|------|---------|
| `fdac352` | Sprint 1 Step 1 refinement: INSAN Visual Language creative philosophy |
| `e70eb1a` | Sprint 1 Step 1: INSAN Visual Language integration + Project Assets hook |
| `e9adf29` | Add missing campaign-os docs, prompts, visual-assets and fix .gitignore |
| `40e205d` | Reorganize project structure and update Drive Folder IDs |
| `fa05909` | Initial INSAN project structure |

### Project Structure

```
Insan/                              (Git root)
├── website/                        (THIS PROJECT)
│   ├── README.md                   (States: "Source code not yet started")
│   ├── assets/logo/                (Full brand identity: 5 logo variants)
│   │   ├── Symbol/
│   │   ├── Arabic Monogram/
│   │   ├── Arabic Logotype/
│   │   ├── English Logotype/
│   │   └── Horizontal Version/
│   └── Docs/                       (18 specification documents)
│       ├── architecture/           (00, 01, 02, 09, 10, 99)
│       ├── database/               (03, 16)
│       ├── api/                    (04)
│       ├── security/               (05)
│       ├── admin/                  (06)
│       ├── ui/                     (07, 08, 14, 15)
│       ├── state/                  (11)
│       ├── deployment/             (12)
│       └── future/                 (13)
├── campaign-os/                    (Separate product — AI content production, see campaign-os/docs/CURRENT_STATE.md)
├── business/                       (Business documentation & strategy)
└── archive/                        (Deprecated files)
```

### Planned Monorepo Structure (When Built)

```
insan-platform/
├── apps/
│   ├── web/          (Next.js 14+ -- public website + admin dashboard)
│   └── api/          (NestJS -- standalone REST API)
├── packages/
│   ├── types/        (shared DTOs/Types)
│   ├── ui/           (shared component library)
│   └── config/       (shared eslint/tsconfig/tailwind)
├── infra/
│   ├── docker-compose.dev.yml
│   ├── docker-compose.prod.yml
│   └── nginx/
├── turbo.json
└── package.json
```

---

## Backend Status

> **No backend code has been implemented.** All modules below exist only as specifications in `Docs/api/04_API_SPECIFICATION.md` and related documents. The planned framework is NestJS with standalone deployment.

### Auth

| Field | Detail |
|-------|--------|
| **Status** | NOT IMPLEMENTED -- specification only |
| **Planned Path** | `apps/api/src/modules/auth/` |
| **Framework** | NestJS + Passport.js + Argon2id |

**Planned Endpoints:**

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| `POST` | `/api/v1/auth/login` | None | Login, returns accessToken + refreshToken (httpOnly cookie) |
| `POST` | `/api/v1/auth.refresh` | Cookie | Refresh accessToken via httpOnly cookie |
| `POST` | `/api/v1/auth/logout` | JWT | Revoke refresh token + clear cookie |
| `POST` | `/api/v1/auth/forgot-password` | None | Send reset link (30 min expiry) |
| `POST` | `/api/v1/auth/reset-password` | None | Reset with token + new password |

---

### Users

| Field | Detail |
|-------|--------|
| **Status** | NOT IMPLEMENTED -- specification only |
| **Planned Path** | `apps/api/src/modules/users/` |

**Planned Endpoints:**

| Method | Route | Auth | Permission |
|--------|-------|------|------------|
| `GET` | `/admin/users` | JWT | `users:manage` |
| `POST` | `/admin/users` | JWT | `users:manage` |
| `PATCH` | `/admin/users/:id` | JWT | `users:manage` |
| `DELETE` | `/admin/users/:id` | JWT | `users:manage` |

**Notes:** Super Admin can create Super Admin users only. Password sent via email on creation.

---

### Roles

| Field | Detail |
|-------|--------|
| **Status** | NOT IMPLEMENTED -- specification only |
| **Planned Path** | `apps/api/src/modules/roles/` |

**Planned Endpoints:**

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| `GET` | `/admin/roles` | JWT (Super Admin only) | List roles with permission matrices |
| `PATCH` | `/admin/roles` | JWT (Super Admin only) | Update role permissions |

**Notes:** 5 roles: SUPER_ADMIN, ADMIN, MANAGER, EDITOR, VIEWER. Permissions stored as JSON blob per role across 15 modules.

---

### Hospitals

| Field | Detail |
|-------|--------|
| **Status** | NOT IMPLEMENTED -- specification only |
| **Planned Path** | `apps/api/src/modules/hospitals/` |

**Planned Endpoints:**

| Method | Route | Auth | Permission |
|--------|-------|------|------------|
| `GET` | `/hospitals` | None (public) | -- |
| `GET` | `/hospitals/:slug` | None (public) | -- |
| `GET` | `/admin/hospitals` | JWT | `hospitals:view` |
| `GET` | `/admin/hospitals/:id` | JWT | `hospitals:view` |
| `POST` | `/admin/hospitals` | JWT | `hospitals:create` |
| `PATCH` | `/admin/hospitals/:id` | JWT | `hospitals:edit` |
| `POST` | `/admin/hospitals/:id/publish` | JWT | `hospitals:publish` |
| `DELETE` | `/admin/hospitals/:id` | JWT | `hospitals:delete` |

**Notes:** Bilingual JSON fields (`name`, `description`). `brandColor` hex validation. `customFields` JSON extensibility. Slug-based public routes.

---

### Medical Centers

| Field | Detail |
|-------|--------|
| **Status** | NOT IMPLEMENTED -- specification only |
| **Planned Path** | `apps/api/src/modules/medical-centers/` |

**Planned Endpoints:** Same 6-action pattern at `/medical-centers` (public) and `/admin/medical-centers` (admin).

**Notes:** M:N relationship with Hospitals via `HospitalMedicalCenter` junction table. `features[]` and `services[]` JSON arrays. Must link to at least one hospital before publishing.

---

### Clinics

| Field | Detail |
|-------|--------|
| **Status** | NOT IMPLEMENTED -- specification only |
| **Planned Path** | `apps/api/src/modules/clinics/` |

**Planned Endpoints:**

| Method | Route | Auth | Permission |
|--------|-------|------|------------|
| `GET` | `/admin/medical-centers/:centerId/clinics` | JWT | `doctors:view` |
| `POST` | `/admin/medical-centers/:centerId/clinics` | JWT | `doctors:create` |
| `PATCH` | `/admin/medical-centers/:centerId/clinics/:id` | JWT | `doctors:edit` |
| `DELETE` | `/admin/medical-centers/:centerId/clinics/:id` | JWT | `doctors:delete` |

**Notes:** Nested under medical centers (no independent public route). `schedule[]` JSON with day/from/to validation. `from` must be before `to`. No duplicate days per clinic.

---

### Doctors

| Field | Detail |
|-------|--------|
| **Status** | NOT IMPLEMENTED -- specification only |
| **Planned Path** | `apps/api/src/modules/doctors/` |

**Planned Endpoints:** Same 6-action pattern at `/doctors` (public) and `/admin/doctors` (admin).

**Notes:** M:N with both Hospitals and Medical Centers via junction tables. `isFeatured` flag. Must link to at least one hospital before publishing.

---

### News

| Field | Detail |
|-------|--------|
| **Status** | NOT IMPLEMENTED -- specification only |
| **Planned Path** | `apps/api/src/modules/news/` |

**Planned Endpoints:** Same 6-action pattern at `/news` (public) and `/admin/news` (admin).

**Notes:** Dual source: `MANUAL` (admin-entered) + `SOCIAL_SYNC` (auto-synced from social media). `sourcePlatform`/`externalPostId` unique constraint for dedup. `relatedHospitalId` optional FK.

---

### CMS Pages

| Field | Detail |
|-------|--------|
| **Status** | NOT IMPLEMENTED -- specification only |
| **Planned Path** | `apps/api/src/modules/pages/` |

**Planned Endpoints:**

| Method | Route | Auth | Permission |
|--------|-------|------|------------|
| `GET` | `/pages/:slug` | None (public) | -- |
| `GET` | `/admin/pages` | JWT | `pages:view` |
| `GET` | `/admin/pages/:id` | JWT | `pages:view` |
| `POST` | `/admin/pages` | JWT | `pages:create` |
| `PATCH` | `/admin/pages/:id` | JWT | `pages:edit` |
| `POST` | `/admin/pages/:id/publish` | JWT | `pages:publish` |
| `DELETE` | `/admin/pages/:id` | JWT | `pages:delete` |

**Notes:** Page Builder pattern: pages contain ordered Sections. Manual slug (unlike other entities). SEO fields (metaTitle, metaDescription, ogImage, canonicalUrl, robotsIndex). `customFields` JSON.

---

### Navigation

| Field | Detail |
|-------|--------|
| **Status** | NOT IMPLEMENTED -- specification only |
| **Planned Path** | `apps/api/src/modules/navigation/` |

**Planned Endpoints:** CRUD at `/admin/navigation`.

**Notes:** Header + Footer locations. Max 2-level nesting (Parent > Child only). Order management. Data-driven public header/footer.

---

### Settings

| Field | Detail |
|-------|--------|
| **Status** | NOT IMPLEMENTED -- specification only |
| **Planned Path** | `apps/api/src/modules/settings/` |

**Planned Endpoints:**

| Method | Route | Auth | Permission |
|--------|-------|------|------------|
| `GET` | `/settings/public` | None | -- |
| `GET` | `/admin/settings/:group` | JWT | `settings:view` |
| `PATCH` | `/admin/settings/:group` | JWT | `settings:manage` |

**Notes:** Key-value store grouped by: general, brand, seo, languages, security. Public endpoint returns only safe groups.

---

### Brands

| Field | Detail |
|-------|--------|
| **Status** | NOT IMPLEMENTED -- specification only |
| **Planned Path** | Part of Settings module |

**Notes:** Brand identity is stored as Settings (brand group). 2 hospitals with sub-brand colors: Future (#1B4FCC), Delta (#0E7C86). Logo uploads via Media module.

---

### Testimonials

| Field | Detail |
|-------|--------|
| **Status** | NOT IMPLEMENTED -- specification only |
| **Planned Path** | `apps/api/src/modules/testimonials/` |

**Planned Endpoints:** Admin-only CRUD at `/admin/testimonials`.

**Notes:** No independent public endpoint (pulled into other pages). Audience enum: INVESTOR, DOCTOR, PATIENT. `order` field for display sequencing.

---

### Leads (Appointments + Contact)

| Field | Detail |
|-------|--------|
| **Status** | NOT IMPLEMENTED -- specification only |
| **Planned Path** | `apps/api/src/modules/appointments/`, `apps/api/src/modules/contact/` |

**Planned Endpoints:**

| Method | Route | Auth | Permission |
|--------|-------|------|------------|
| `POST` | `/appointments` | None (public, rate-limited) | -- |
| `GET` | `/admin/appointments` | JWT | `appointments:view` |
| `PATCH` | `/admin/appointments/:id/status` | JWT | `appointments:manage` |
| `POST` | `/contact` | None (public, rate-limited) | -- |
| `GET` | `/admin/contact-submissions` | JWT | `contact:view` |
| `PATCH` | `/admin/contact-submissions/:id` | JWT | `contact:manage` |

**Notes:** Appointments: 5 statuses (NEW, CONTACTED, CONFIRMED, CANCELLED, COMPLETED). Contact: `isRead` flag. Both rate-limited to 5/hour/IP.

---

### Audit Log

| Field | Detail |
|-------|--------|
| **Status** | NOT IMPLEMENTED -- specification only |
| **Planned Path** | `apps/api/src/modules/audit-log/` |

**Planned Endpoints:**

| Method | Route | Auth | Permission |
|--------|-------|------|------------|
| `GET` | `/admin/audit-logs` | JWT | `audit:view` |

**Notes:** Auto-recorded via `AuditInterceptor` on all write operations. Stores `before`/`after` JSON snapshots. Append-only (never deleted).

---

## Frontend Status

> **No frontend code has been implemented.** All pages and components below exist only as specifications. The planned framework is Next.js 14+ with App Router, Tailwind CSS, and a custom component library.

### Public Website

| # | Route (AR / EN) | Page | Status |
|---|-----------------|------|--------|
| 1 | `/ar` / `/en` | **Home** | NOT BUILT -- 9 sections: Hero, FeatureGrid, EntityCards, ServiceCards, TeamGrid, StepsTimeline, NewsGrid, ContactBlock, Footer |
| 2 | `/ar/about` / `/en/about` | **About INSAN** | NOT BUILT -- Hero, RichTextBlock, FeatureGrid, StatisticsBlock, TestimonialsCarousel, CTA |
| 3 | `/ar/hospitals` / `/en/hospitals` | **Hospitals List** | NOT BUILT -- Hero + EntityCards grid + CTA |
| 4 | `/ar/hospitals/[slug]` / `/en/hospitals/[slug]` | **Hospital Detail** | NOT BUILT -- Shared template for Future/Delta; 10 sections |
| 5 | `/ar/medical-centers` / `/en/medical-centers` | **Medical Centers List** | NOT BUILT -- Hero + FilterBar + ServiceCards grid |
| 6 | `/ar/medical-centers/[slug]` / `/en/medical-centers/[slug]` | **Medical Center Detail** | NOT BUILT -- 7 sections including ClinicsScheduleTable |
| 7 | `/ar/doctors` / `/en/doctors` | **Doctors Directory** | NOT BUILT -- Hero + FilterBar + SearchInput + TeamGrid (paginated) |
| 8 | `/ar/doctors/[slug]` / `/en/doctors/[slug]` | **Doctor Detail** | NOT BUILT -- DoctorProfileHeader, RichTextBlock, ScheduleTable, RelatedDoctors |
| 9 | `/ar/news` / `/en/news` | **News & Media List** | NOT BUILT -- Hero + FilterBar + NewsGrid (paginated, 12/page) |
| 10 | `/ar/news/[slug]` / `/en/news/[slug]` | **News Post Detail** | NOT BUILT -- ArticleHeader, ArticleBody, ShareButtons, RelatedNews |
| 11 | `/ar/contact` / `/en/contact` | **Contact Us** | NOT BUILT -- Hero, ContactForm, MapBlock, ContactInfoBlock |
| 12 | (global component) | **Book Appointment** | NOT BUILT -- Drawer/Modal with AppointmentForm, dependent dropdowns |
| 13 | `/ar/investors` / `/en/investors` | **Investor Page** (hidden) | NOT BUILT -- Noindex, no sitemap, no nav link; Hero, RichText, DownloadableFile |
| 14 | `/ar/privacy` `/en/privacy` + `/ar/terms` `/en/terms` | **Privacy / Terms** | NOT BUILT -- Static legal pages, RichTextBlock |
| 15 | `/404` | **404 Error Page** | NOT BUILT -- Message, illustration, "Back to Home" button |

**Global Components (planned, not built):**
- StickyActionsBar (emergency/booking/WhatsApp -- floating side on desktop, bottom bar on mobile)
- ChatWidget (AI chat bubble -- every page)
- Header/Navigation (data-driven from NavigationItem table)
- Footer (data-driven from NavigationItem table)
- LanguageSwitcher (AR/EN toggle)
- Breadcrumb

---

### Admin Dashboard

| # | Module/View | Route (planned) | Status |
|---|-------------|-----------------|--------|
| 1 | **Login Screen** | `/admin/login` | NOT BUILT |
| 2 | **Dashboard (Overview)** | `/admin/dashboard` | NOT BUILT -- Stats cards, 30-day chart, activity feed |
| 3 | **Pages (Page Builder)** | `/admin/pages` + `/admin/pages/[id]` | NOT BUILT -- DnD section registry, live preview, AR/EN tabs, autosave |
| 4 | **Hospitals** | `/admin/hospitals` | NOT BUILT -- CRUD + tabbed form, brand color picker |
| 5 | **Medical Centers** | `/admin/medical-centers` | NOT BUILT -- CRUD + inline Clinics sub-table |
| 6 | **Doctors** | `/admin/doctors` | NOT BUILT -- CRUD with tabs, multi-filter, bulk feature |
| 7 | **News & Media** | `/admin/news` | NOT BUILT -- Tabs: All/Manual/Social; rich text; scheduled publishing |
| 8 | **Media Library** | `/admin/media` | NOT BUILT -- Grid + folder tree + DnD upload |
| 9 | **Appointments/Leads** | `/admin/appointments` | NOT BUILT -- Table + optional Kanban; status workflow; export |
| 10 | **Contact Submissions** | `/admin/contact-submissions` | NOT BUILT -- Table + detail drawer; read/unread |
| 11 | **Testimonials** | `/admin/testimonials` | NOT BUILT -- Table + modal form; audience filter; drag reorder |
| 12 | **Navigation & Footer** | `/admin/navigation` | NOT BUILT -- Tree view with DnD reorder |
| 13 | **Users & Roles** | `/admin/users` + `/admin/roles` | NOT BUILT -- User CRUD + role permission matrix |
| 14 | **Settings** | `/admin/settings` | NOT BUILT -- 6 tabs: General, Brand, SEO, Languages, Integrations, Security |
| 15 | **AI Assistant** | `/admin/ai-assistant` | NOT BUILT -- Settings, Knowledge Base CRUD, Conversations, Analytics |
| 16 | **Audit Log** | `/admin/audit-log` | NOT BUILT -- Read-only filterable table; before/after diff viewer |

---

## Database Status

> **No database has been provisioned.** The schema exists only as a specification in `Docs/database/03_DATABASE_SCHEMA.md`.

### Prisma

- **Status:** Schema fully designed, not instantiated as a `.prisma` file.
- **Planned Path:** `apps/api/prisma/schema.prisma`
- **Database:** PostgreSQL 16+
- **Models:** 26 core models + 2 recommended additions (SlugHistory, Redirect)
- **Enums:** 8 (RoleName, ContentStatus, NewsSourceType, SocialPlatform, SourceEntity, AppointmentStatus, TestimonialAudience, ChatSender)
- **All translatable fields:** JSON `{ar, en}` format -- no separate translation tables.

### Migrations

- **Status:** None. Schema not yet applied.
- **Planned Path:** `apps/api/prisma/migrations/`

### Seed

- **Status:** Fully specified in `Docs/database/16_SEED_DATA_SPECIFICATION.md`, not implemented.
- **Planned Path:** `apps/api/prisma/seed.ts`
- **Planned Command:** `npm run db:seed`

### Models (Complete List)

| Category | Models |
|----------|--------|
| Auth/Users | `Role`, `User`, `RefreshToken` |
| CMS | `Page`, `Section` |
| Healthcare | `Hospital`, `MedicalCenter`, `HospitalMedicalCenter`, `Clinic`, `Doctor`, `DoctorHospital`, `DoctorMedicalCenter` |
| News | `NewsCategory`, `NewsPost` |
| Media | `MediaFolder`, `Media` |
| Navigation/Settings | `NavigationItem`, `Setting`, `IntegrationSetting` |
| Leads | `AppointmentRequest`, `ContactSubmission` |
| Content | `Testimonial` |
| Audit | `AuditLog` |
| AI Chat | `ChatConversation`, `ChatMessage`, `AiKnowledgeBase`, `AiSettings` |

### Current Seeded Data (Planned)

| Seeder | Data | Count |
|--------|------|-------|
| Roles | SUPER_ADMIN, ADMIN, MANAGER, EDITOR, VIEWER (with full permission JSON) | 5 |
| Super Admin | `admin@insan-platform.com` / `INSAN@Admin2026!` | 1 |
| Settings | General, Brand, SEO, Languages, Security groups | ~30 |
| Integration Settings | Facebook, Instagram, LinkedIn placeholders | 5 |
| AI Settings | isEnabled, greeting, escalation config | 5 |
| Hospitals | Future Specialized Hospital (#1B4FCC), Delta International Hospital (#0E7C86) | 2 |
| Medical Centers | Orthopedic, Cardiac, Women's Health, Digestive, Neurology, Emergency, ICU, Senior Care, Ophthalmology, Dermatology, Pediatrics, Dental | 12 |
| Navigation | Header (6) + Footer (8) items | 14 |
| Pages | Home, About, Hospitals, Medical Centers, News, Contact, Investors (hidden), Privacy, Terms | 9 |
| News Categories | Ecosystem News, Hospital News, Medical Center News, Events, Health Tips | 5 |
| AI Knowledge Base | Sample Q&A entries | 4 |
| Media Folders | Hospitals, Medical Centers, Doctors, News, General, Logos & Brand (with sub-folders) | 8 |
| Testimonials | 1 Doctor, 1 Investor | 2 |

---

## Authentication

> **Not implemented.** The following describes the designed authentication system.

### JWT

- **Access Token:** Short-lived (15 min), stored in memory (not localStorage), sent in response body on login.
- **Refresh Token:** Long-lived (7 days), stored in httpOnly Secure cookie, rotated on every refresh.
- **Signing:** Argon2id for passwords; JWT for tokens with separate access/refresh secrets.

### Cookies

- **Refresh Token Cookie:** `httpOnly: true`, `secure: true`, `sameSite: 'strict'`, `path: '/api/v1/auth'`.
- **Clear on logout:** Cookie expired + refresh token revoked server-side.

### Middleware

- **JwtAuthGuard:** Validates JWT on every protected route.
- **RolesGuard:** Checks user role level (SUPER_ADMIN > ADMIN > MANAGER > EDITOR > VIEWER).
- **PermissionsGuard:** Checks `permissions[module]` contains required action string.
- **@RequirePermission() decorator:** Endpoint-level permission check.
- **@CurrentUser() decorator:** Extracts authenticated user from request.

### Route Protection

- Public routes: No auth required (hospitals list, medical centers list, news list, forms).
- Admin routes: All require valid JWT + appropriate permission.
- Role hierarchy enforced: Only SUPER_ADMIN can manage roles/users.

---

## Recent Fixes

> **No code fixes have been performed.** This section documents the most recent documentation improvements.

### Documentation Improvements (IRA-01 through IRA-07)

Seven Implementation Readiness Audits were performed on the specification documents, resulting in:

- **IRA-01:** Cross-reference standardization, metadata headers, AI decision policy.
- **IRA-02:** Delete Behavior Matrix, Deletion Policy, Slug Rules, Ordering Policy, customFields JSON structure, seed data clarifications.
- **IRA-03:** Standard error response format, pagination contract, filtering/sorting convention, API versioning, rate limiting table, HTTP status codes.
- **IRA-04:** Empty State library, Loading States, Global Form UX, Responsive Priority Rules, Icon library (Lucide), Motion Policy.
- **IRA-05:** Draft Editing Conflict Policy (Optimistic Locking), Audit Log Coverage Matrix, Publish Workflow expansion, Media Usage Protection, Dashboard Widget Priority, Bulk Operation Rules.
- **IRA-06:** AI Provider Failover Policy, Global Integration Retry Policy, Secrets Rotation Policy, Integration Health Check Matrix, AI Conversation Limits, Feature Flag Policy.
- **IRA-07:** DR Objectives (RPO/RTO), DR Playbook (5 phases), Go-Live Checklist (30 items), Logging & Monitoring Matrix, Security Headers Matrix, Password & Session Security Policy.

### Documentation Reorganization

- 18 specification documents reorganized from flat `Docs/` directory into categorized subdirectories (`architecture/`, `database/`, `api/`, `security/`, `admin/`, `ui/`, `state/`, `deployment/`, `future/`).
- All cross-directory references updated to correct relative paths.

---

## Known Limitations

> **All items below are intentional placeholders, not bugs.** They represent features deferred to later phases.

### Media Module

The Media Library (S3 upload, folder management, bulk operations) is fully specified but deferred. During initial development, hardcoded image URLs or local static files can be used as placeholders. The Media module should be implemented in Phase 3 per the build guide.

### AI Assistant

The AI Chat system (AiProviderAdapter pattern, knowledge base, conversation history, medical guardrails) is fully specified but deferred. This is a complex integration requiring an LLM provider API key and careful safety controls. Should be implemented in Phase 8 per the build guide.

### Clinics API

The Clinics module (nested under Medical Centers, schedule JSON) is fully specified but may be deferred if initial content does not require clinic-level granularity. Can be implemented alongside or after the Medical Centers module.

### Missing Doctors Seed

The seed specification does not include individual doctor records (only the schema and junction tables). Doctor data should be added via the Admin Dashboard after initial deployment, or a supplementary seed can be created. This is by design -- doctor profiles require real photos and biographical content.

### Missing News Seed

The seed specification does not include individual news posts (only categories). News content should be entered via the Admin Dashboard or synced from social media after deployment. This is by design -- news content is inherently dynamic.

### Social Sync Worker

The Facebook/Instagram/LinkedIn auto-sync worker (BullMQ + adapters) is fully specified but deferred to Phase 6. Requires valid social media API tokens configured in the Integrations settings.

---

## Build Verification

> **No build has been performed.** No source code exists to build.

When implementation begins, verification should follow the completion criteria defined in `99_REPLIT_BUILD_GUIDE.md` for each phase:

| Phase | Verification |
|-------|-------------|
| Phase 0 | `docker compose up` works; health endpoints return 200 |
| Phase 1 | Prisma schema valid; seed runs; login works via Postman |
| Phase 2 | All CRUD endpoints working with RBAC enforcement |
| Phase 3 | Pages publish/unpublish; S3 upload works |
| Phase 4 | Every public route renders in AR + EN, matches design spec |
| Phase 5 | All admin CRUD operations working with React Query |
| Phase 6 | Social sync creates draft posts |
| Phase 7 | Form submissions visible in admin, rate limiting active |
| Phase 8 | Chat widget functional, knowledge base works |
| Phase 9 | Sitemap generates, JSON-LD valid |
| Phase 10 | Docker images build, prod compose runs |
| Phase 11 | Bilingual, responsive, accessible, performant |

---

## Environment Setup

> **No environment files exist.** The following documents required variables for when implementation begins.

### Backend (`apps/api/.env`)

| Variable | Purpose | Example |
|----------|---------|---------|
| `NODE_ENV` | Environment mode | `development` |
| `PORT` | API server port | `4000` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@localhost:5432/insan` |
| `JWT_ACCESS_SECRET` | Access token signing key | (generate, 32+ chars) |
| `JWT_REFRESH_SECRET` | Refresh token signing key | (generate, 32+ chars) |
| `JWT_ACCESS_EXPIRES` | Access token lifetime | `15m` |
| `JWT_REFRESH_EXPIRES` | Refresh token lifetime | `7d` |
| `S3_ENDPOINT` | S3-compatible storage endpoint | (provider-specific) |
| `S3_ACCESS_KEY` | S3 access key | (provider-specific) |
| `S3_SECRET_KEY` | S3 secret key | (provider-specific) |
| `S3_BUCKET` | S3 bucket name | `insan-media` |
| `ENCRYPTION_KEY` | Key for encrypting IntegrationSettings | (generate) |
| `REDIS_URL` | Redis connection (optional initially) | `redis://localhost:6379` |
| `LLM_PROVIDER` | AI chat provider | `anthropic` |
| `LLM_API_KEY` | AI provider API key | (provider-specific) |
| `CORS_ORIGIN` | Allowed frontend origin | `http://localhost:3000` |

### Frontend (`apps/web/.env`)

| Variable | Purpose | Example |
|----------|---------|---------|
| `NEXT_PUBLIC_API_BASE_URL` | Backend API URL | `http://localhost:4000/api/v1` |
| `NEXT_PUBLIC_DEFAULT_LOCALE` | Default language | `ar` |
| `NEXT_PUBLIC_SITE_URL` | Public site URL | `https://insan-platform.com` |

### Local Development Services (Docker Compose)

| Service | Image | Port | Purpose |
|---------|-------|------|---------|
| PostgreSQL | `postgres:16-alpine` | 5432 | Database |
| Redis | `redis:7-alpine` | 6379 | Cache/Queue |
| MinIO | `minio/minio` | 9000, 9001 | Local S3-compatible storage |

---

## Production Readiness

> **Current readiness: None.** The project is pre-implementation.

### What Exists

- Comprehensive architectural specifications (18 documents).
- Complete database schema design.
- Full API contract documentation.
- Detailed deployment playbook with Docker, CI/CD, monitoring, and DR procedures.
- 30-item go-live checklist.

### What Remains Before Production

1. **All source code** -- frontend, backend, database, infrastructure (Phases 0-11).
2. **Security hardening** -- penetration testing, dependency audit, CSP tuning.
3. **Performance optimization** -- Core Web Vitals, bundle analysis, image optimization.
4. **Accessibility audit** -- WCAG 2.1 AA compliance verification.
5. **SEO verification** -- sitemap, structured data, meta tags, page speed.
6. **Content population** -- real hospital/center/doctor data, news, testimonials.
7. **Domain & DNS** -- production domain configuration.
8. **SSL certificates** -- HTTPS enforcement.
9. **Monitoring setup** -- uptime monitoring, error tracking, logging aggregation.
10. **Backup verification** -- test restore procedures.

---

## Technical Debt

> **No TECH_DEBT.md file exists.** Technical debt will accumulate during implementation.

When technical debt is identified during development, it should be documented in `TECH_DEBT.md` at the project root with:
- Description of the debt.
- Why it exists (time constraint, dependency limitation, etc.).
- Recommended resolution.
- Priority (high/medium/low).

---

## Recommended Next Phase

### Phase 1: Core Platform Development -- COMPLETE (Documentation)

All specification documents are finalized and reviewed through 7 Implementation Readiness Audits. The architecture is stable and should not be changed without review.

### Recommended Next Phase: Production Readiness Review

Before any code is written, or immediately after initial implementation, a **Production Readiness Review** should be conducted covering:

| Area | Focus |
|------|-------|
| **Architecture Review** | Validate tech stack choices, verify specification completeness, identify gaps. |
| **Security Audit** | Review auth design, RBAC model, rate limiting, input validation, encryption approach. |
| **Performance Audit** | Review caching strategy, query optimization plans, bundle size expectations. |
| **Deployment** | Validate Docker configs, CI/CD pipeline design, environment management. |
| **Monitoring** | Review logging strategy, alerting thresholds, uptime monitoring approach. |
| **Backups** | Verify backup/restore procedures, RPO/RTO targets. |
| **Accessibility** | Review component specs for WCAG 2.1 AA compliance. |
| **SEO Review** | Validate sitemap strategy, structured data, meta tag approach. |
| **Technical Debt** | Identify and prioritize any existing shortcuts or known issues. |

After the Production Readiness Review, implementation should proceed following the 12-phase build guide in `99_REPLIT_BUILD_GUIDE.md`.

---

## AI Handoff Notes

> **This section provides explicit instructions for future AI assistants working on this project.**

### Source of Truth

The **canonical source of truth** for all architectural decisions is the `Docs/` directory:

```
Docs/
├── architecture/00_README_FOR_BUILDER.md     (START HERE)
├── architecture/01_ARCHITECTURE.md            (System architecture)
├── architecture/02_INFORMATION_ARCHITECTURE_AND_PAGES.md  (All page specs)
├── database/03_DATABASE_SCHEMA.md             (Prisma schema)
├── api/04_API_SPECIFICATION.md                (All API endpoints)
├── security/05_USER_ROLES_AND_PERMISSIONS.md  (RBAC model)
├── admin/06_ADMIN_DASHBOARD_SPECIFICATION.md  (Admin screens)
├── ui/07_UI_COMPONENT_INVENTORY.md            (Component catalog)
├── ui/08_DESIGN_SYSTEM.md                     (Design tokens)
├── architecture/09_WORKFLOWS.md               (Business workflows)
├── architecture/10_FOLDER_STRUCTURE.md        (File organization)
├── state/11_STATE_MANAGEMENT.md               (State strategy)
├── deployment/12_DEPLOYMENT.md                (Docker, CI/CD, DR)
├── future/13_FUTURE_EXPANSION.md              (Post-MVP features)
├── ui/14_UI_SCREEN_SPECIFICATION.md           (Screen-level specs)
├── ui/15_COMPONENT_SPECIFICATION.md           (Component details)
├── database/16_SEED_DATA_SPECIFICATION.md     (Seed data)
└── architecture/99_REPLIT_BUILD_GUIDE.md      (Build execution plan)
```

**Always read `00_README_FOR_BUILDER.md` first.** It provides the recommended reading order and links to all other documents.

### Architectural Decisions That Must Not Be Changed Without Review

The following decisions are fundamental and should not be altered without explicit review and approval:

1. **Database i18n approach:** JSON `{ar, en}` fields in all tables. Do NOT introduce separate translation tables.
2. **Auth model:** Custom JWT with httpOnly cookies for refresh, access token in memory. Do NOT switch to session-based auth or store tokens in localStorage.
3. **Backend framework:** NestJS as standalone API. Do NOT merge into the Next.js app.
4. **Monorepo structure:** Turborepo with `apps/web` + `apps/api`. Do NOT create a single-app architecture.
5. **Role hierarchy:** 5 roles (SUPER_ADMIN, ADMIN, MANAGER, EDITOR, VIEWER) with JSON permission blobs. Do NOT switch to a permission-group model.
6. **Hard delete policy:** All deletes are hard deletes with no soft-delete. Do NOT add `deletedAt` columns.
7. **Slug management:** Manual slugs for pages, auto-generated slugs for entities. Slug history tracked via `SlugHistory` table.
8. **API response envelope:** All responses wrapped in `{ success, data, meta }`. Do NOT return raw arrays or objects.
9. **Component naming:** `components/ui/`, `components/blocks/`, `components/features/`, `components/admin/`. Do NOT use flat component directories.
10. **Anti-Vendor-Lock-in:** Avoid Vercel-specific services. Use `output: 'standalone'` for Docker deployment.

### Placeholders Are Intentional

The following features are **fully specified but intentionally deferred**. Do NOT implement them until explicitly requested:

- Media Module (S3 upload, folder management)
- AI Assistant (LLM integration, knowledge base)
- Social Sync Worker (Facebook/Instagram/LinkedIn auto-sync)
- Clinics API (nested under Medical Centers)
- Doctors seed data (requires real content)
- News seed data (requires real content)

### Do NOT Perform Large Architectural Refactoring

Before any significant refactoring:

1. Read ALL documents in `Docs/architecture/` first.
2. Read the specific module specification you intend to change.
3. Check for cross-references to the module in other documents.
4. Document the proposed change and its rationale.
5. If the change affects the database schema, API contracts, or auth model, stop and request explicit approval.

### Build Execution

Follow `99_REPLIT_BUILD_GUIDE.md` strictly. It defines 12 phases with clear completion criteria. Do NOT skip phases or reorder them without understanding the dependency chain.

### Document Maintenance

If you modify any specification during implementation:

1. Update the version number and `Last Updated` date in the document header.
2. Add a change entry to the document's changelog (if one exists).
3. Update cross-references if you rename or move sections.
4. Keep `CURRENT_STATE.md` (this document) updated with implementation progress.

---

*This document is the primary entry point for anyone continuing development on the INSAN Website Platform. Campaign OS documentation is maintained separately at `campaign-os/docs/CURRENT_STATE.md`. Last updated: 2026-07-25.*
