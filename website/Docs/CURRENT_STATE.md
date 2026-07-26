# INSAN Website Platform -- Current State

> **Version:** 6.0
> **Date:** 2026-07-26
> **Status:** Phase 2 -- Sprint B Complete (Production Infrastructure)
> **Canonical Handoff Document** -- Primary entry point for Website Platform development only.
> **Scope:** Website Platform only. For Campaign OS, see `campaign-os/docs/CURRENT_STATE.md`.

---

## Executive Summary

| Dimension | Status |
|-----------|--------|
| **Project Phase** | Phase 2 -- Production Readiness (Sprint B Complete) |
| **Documentation** | 100% complete (18 specification documents, ~4,500+ lines) |
| **Source Code** | ~206 files across backend (NestJS) and frontend (Next.js) |
| **Database** | Prisma schema with 28 models, 2 migrations applied, comprehensive seed data |
| **API** | 14 modules implemented with ~106 endpoints (auth, CRUD, RBAC, audit) |
| **Frontend** | 14 public pages + 14 admin modules implemented; 2 admin placeholders |
| **Deployment** | Docker multi-stage, nginx, CI/CD, deployment scripts implemented |
| **Brand Assets** | Complete (5 logo variants, multi-format) |

**Overall:** The core platform is implemented and functional. The backend provides a complete REST API with JWT authentication, RBAC permissions, audit logging, and 14 NestJS modules. The frontend delivers a public website (14 pages) and admin dashboard (14 modules) built with Next.js 14, Tailwind CSS, and React Query. The database schema is applied with seed data. A Production Readiness Audit was completed (score: 38/100, No-Go). Sprint A (Application Hardening) resolved TD-001 through TD-006, TD-008. Sprint B (Production Infrastructure) has added Docker multi-stage builds, docker-compose.prod.yml, nginx reverse proxy, structured request logging, environment validation, graceful shutdown, CI/CD pipeline, deployment scripts, and a Production Deployment Checklist. Remaining work is manual infrastructure provisioning (VPS, managed PostgreSQL, SSL, domain), monitoring, backups, compliance pages, and content. See `GO_LIVE_ROADMAP.md` for the execution roadmap.

---

## Repository Status

**Branch:** `main` (up to date with `origin/main`)
**Remote:** `origin/main` only
**Uncommitted changes:** None.

### Recent Commits

| Hash | Message |
|------|---------|
| `dbca761` | feat(sprint-b): production infrastructure — Docker, nginx, CI/CD, logging, deployment scripts |
| `c84ef43` | feat(sprint-a): application hardening — Helmet, CORS, rate limiting, DTO validation |
| `6ded56d` | refactor(repo): relocate brand assets and clean untracked files |
| `ba3330f` | docs: separate CURRENT_STATE documents for Website Platform and Campaign OS |
| `dbafbb6` | docs(sprint-1): add Direction Correction -- refocus on production quality |
| `0ef5520` | Update typescript build info |
| `d56edaf` | refactor(repo): reorganize website into dedicated workspace |
| `e1f2091` | Fix Next.js build: move html/body to root layout, remove from nested layouts |
| `b0014ed` | Update API modules and documentation with replit setup guide |
| `eb0fd2a` | Update API services and implement dynamic content pages in web app |
| `bb7dcf5` | Update database schema and seed data while refining admin dashboard components |
| `8a80d5d` | Clean up replit configuration |
| `0140355` | Update foundation setup documentation and replit configuration |
| `b5ef3e8` | Initialize database schema and configure project environment scripts |
| `32589d0` | Build foundation: Turborepo monorepo, full Prisma schema (27 models), seed data, NestJS JWT auth, Next.js admin shell |

### Project Structure

```
Insan/                              (Git root)
├── website/                        (THIS PROJECT -- complete website workspace)
│   ├── apps/
│   │   ├── api/                    (NestJS backend -- 14 modules, ~90 source files)
│   │   └── web/                    (Next.js frontend -- ~107 source files)
│   ├── Docs/                       (18 specification documents)
│   │   ├── architecture/           (00, 01, 02, 09, 10, 99)
│   │   ├── database/               (03, 16)
│   │   ├── api/                    (04)
│   │   ├── security/               (05)
│   │   ├── admin/                  (06)
│   │   ├── ui/                     (07, 08, 14, 15)
│   │   ├── state/                  (11)
│   │   ├── deployment/             (12)
│   │   └── future/                 (13)
│   ├── assets/                     (Brand logos, reference materials)
│   ├── scripts/                    (post-merge hook)
│   ├── package.json                (Turborepo root)
│   ├── turbo.json
│   ├── pnpm-workspace.yaml
│   ├── .env.example
│   ├── TECH_DEBT.md
│   └── replit.md
├── campaign-os/                    (Separate product -- AI content production)
├── business/                       (Business documentation & strategy)
└── archive/                        (Deprecated files)
```

---

## Backend Status

> **14 NestJS modules fully implemented** with ~106 endpoints. All core CMS domain modules have complete CRUD with auth guards, permission checks, audit logging, slug history/redirects, and validation. The planned framework is NestJS with standalone deployment.

### Auth

| Field | Detail |
|-------|--------|
| **Status** | FULLY IMPLEMENTED |
| **Path** | `apps/api/src/modules/auth/` |
| **Framework** | NestJS + Passport.js + bcryptjs |

**Implemented Endpoints:**

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| `POST` | `/api/v1/auth/login` | None | Login, returns accessToken + refreshToken (httpOnly cookie) |
| `POST` | `/api/v1/auth/refresh` | Cookie | Refresh accessToken via httpOnly cookie (token rotation) |
| `POST` | `/api/v1/auth/logout` | JWT | Revoke refresh token + clear cookie |
| `GET` | `/api/v1/auth/me` | JWT | Get current authenticated user |

**Notes:** JWT access token (15min) stored in memory. Refresh token (7d) in httpOnly Secure cookie, rotated on every use. bcrypt hashing (12 rounds). Audit logging on login/logout. Passwords hashed with bcrypt (not Argon2id as originally specified — see TECH_DEBT.md TD-002).

---

### Users

| Field | Detail |
|-------|--------|
| **Status** | FULLY IMPLEMENTED |
| **Path** | `apps/api/src/modules/users/` |

**Implemented Endpoints:**

| Method | Route | Auth | Permission |
|--------|-------|------|------------|
| `GET` | `/api/v1/admin/roles` | JWT | `users:view` |
| `GET` | `/api/v1/admin/users` | JWT | `users:view` |
| `GET` | `/api/v1/admin/users/:id` | JWT | `users:view` |
| `POST` | `/api/v1/admin/users` | JWT | `users:manage` |
| `PATCH` | `/api/v1/admin/users/:id` | JWT | `users:manage` |
| `DELETE` | `/api/v1/admin/users/:id` | JWT | `users:manage` |

**Notes:** Class-level guard on admin controller. Passwords hashed with bcrypt. `passwordHash` stripped from all responses. Prevents self-deactivation, deletion of last super admin, and demotion of last active super admin.

---

### Roles

| Field | Detail |
|-------|--------|
| **Status** | FULLY IMPLEMENTED (read-only via Users module) |
| **Path** | `apps/api/src/modules/users/` (roles endpoint) |

**Implemented Endpoints:**

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| `GET` | `/api/v1/admin/roles` | JWT (`users:view`) | List roles with permission matrices |

**Notes:** 5 roles: SUPER_ADMIN, ADMIN, MANAGER, EDITOR, VIEWER. Permissions stored as JSON blob per role across 15 modules. Roles are seeded and managed via seed data; no separate role CRUD API (by design — role structure is fixed).

---

### Hospitals

| Field | Detail |
|-------|--------|
| **Status** | FULLY IMPLEMENTED |
| **Path** | `apps/api/src/modules/hospitals/` |

**Implemented Endpoints:**

| Method | Route | Auth | Permission |
|--------|-------|------|------------|
| `GET` | `/api/v1/hospitals` | None (public) | -- |
| `GET` | `/api/v1/hospitals/:slug` | None (public) | -- |
| `GET` | `/api/v1/admin/hospitals` | JWT | `hospitals:view` |
| `GET` | `/api/v1/admin/hospitals/:id` | JWT | `hospitals:view` |
| `POST` | `/api/v1/admin/hospitals` | JWT | `hospitals:create` |
| `PATCH` | `/api/v1/admin/hospitals/:id` | JWT | `hospitals:edit` |
| `POST` | `/api/v1/admin/hospitals/:id/publish` | JWT | `hospitals:publish` |
| `POST` | `/api/v1/admin/hospitals/:id/unpublish` | JWT | `hospitals:publish` |
| `DELETE` | `/api/v1/admin/hospitals/:id` | JWT | `hospitals:delete` |

**Notes:** Bilingual JSON fields (`name`, `description`). `brandColor` hex validation. Slug uniqueness enforced. Slug changes create `SlugHistory` + `Redirect` (301) per locale. Publish validates bilingual names. Delete blocks published records and records with appointment references.

---

### Medical Centers

| Field | Detail |
|-------|--------|
| **Status** | FULLY IMPLEMENTED |
| **Path** | `apps/api/src/modules/medical-centers/` |

**Implemented Endpoints:**

| Method | Route | Auth | Permission |
|--------|-------|------|------------|
| `GET` | `/api/v1/medical-centers` | None (public) | -- |
| `GET` | `/api/v1/medical-centers/:slug` | None (public) | -- |
| `GET` | `/api/v1/admin/medical-centers` | JWT | `medical-centers:view` |
| `GET` | `/api/v1/admin/medical-centers/:id` | JWT | `medical-centers:view` |
| `POST` | `/api/v1/admin/medical-centers` | JWT | `medical-centers:create` |
| `PATCH` | `/api/v1/admin/medical-centers/:id` | JWT | `medical-centers:edit` |
| `POST` | `/api/v1/admin/medical-centers/:id/publish` | JWT | `medical-centers:publish` |
| `POST` | `/api/v1/admin/medical-centers/:id/unpublish` | JWT | `medical-centers:publish` |
| `DELETE` | `/api/v1/admin/medical-centers/:id` | JWT | `medical-centers:delete` |

**Notes:** M:N relationship with Hospitals via `HospitalMedicalCenter` junction table. Publish requires at least one linked hospital. Slug change handling with redirects.

---

### Clinics

| Field | Detail |
|-------|--------|
| **Status** | FULLY IMPLEMENTED (nested under Medical Centers) |
| **Path** | `apps/api/src/modules/medical-centers/` (ClinicsService) |

**Implemented Endpoints:**

| Method | Route | Auth | Permission |
|--------|-------|------|------------|
| `GET` | `/api/v1/admin/medical-centers/:centerId/clinics` | JWT | `medical-centers:view` |
| `POST` | `/api/v1/admin/medical-centers/:centerId/clinics` | JWT | `medical-centers:edit` |
| `PATCH` | `/api/v1/admin/medical-centers/:centerId/clinics/:id` | JWT | `medical-centers:edit` |
| `DELETE` | `/api/v1/admin/medical-centers/:centerId/clinics/:id` | JWT | `medical-centers:edit` |

**Notes:** Nested under medical centers (no independent public route). `schedule[]` JSON with day/from/to validation. No duplicate days per clinic. `from` must be before `to`.

---

### Doctors

| Field | Detail |
|-------|--------|
| **Status** | FULLY IMPLEMENTED |
| **Path** | `apps/api/src/modules/doctors/` |

**Implemented Endpoints:**

| Method | Route | Auth | Permission |
|--------|-------|------|------------|
| `GET` | `/api/v1/doctors` | None (public) | -- |
| `GET` | `/api/v1/doctors/:slug` | None (public) | -- |
| `GET` | `/api/v1/admin/doctors` | JWT | `doctors:view` |
| `GET` | `/api/v1/admin/doctors/:id` | JWT | `doctors:view` |
| `POST` | `/api/v1/admin/doctors` | JWT | `doctors:create` |
| `PATCH` | `/api/v1/admin/doctors/:id` | JWT | `doctors:edit` |
| `POST` | `/api/v1/admin/doctors/:id/publish` | JWT | `doctors:publish` |
| `POST` | `/api/v1/admin/doctors/:id/unpublish` | JWT | `doctors:publish` |
| `DELETE` | `/api/v1/admin/doctors/:id` | JWT | `doctors:delete` |

**Notes:** M:N with both Hospitals and Medical Centers via junction tables. Publish requires bilingual names + at least one hospital. Slug change with redirect.

---

### News

| Field | Detail |
|-------|--------|
| **Status** | FULLY IMPLEMENTED |
| **Path** | `apps/api/src/modules/news/` |

**Implemented Endpoints:**

| Method | Route | Auth | Permission |
|--------|-------|------|------------|
| `GET` | `/api/v1/news-categories` | None (public) | -- |
| `GET` | `/api/v1/news` | None (public) | -- |
| `GET` | `/api/v1/news/:slug` | None (public) | -- |
| `GET` | `/api/v1/admin/news-categories` | JWT | `news:view` |
| `POST` | `/api/v1/admin/news-categories` | JWT | `news:create` |
| `PATCH` | `/api/v1/admin/news-categories/:id` | JWT | `news:edit` |
| `DELETE` | `/api/v1/admin/news-categories/:id` | JWT | `news:delete` |
| `GET` | `/api/v1/admin/news` | JWT | `news:view` |
| `GET` | `/api/v1/admin/news/:id` | JWT | `news:view` |
| `POST` | `/api/v1/admin/news` | JWT | `news:create` |
| `PATCH` | `/api/v1/admin/news/:id` | JWT | `news:edit` |
| `POST` | `/api/v1/admin/news/:id/publish` | JWT | `news:publish` |
| `POST` | `/api/v1/admin/news/:id/unpublish` | JWT | `news:publish` |
| `DELETE` | `/api/v1/admin/news/:id` | JWT | `news:delete` |

**Notes:** Dual source: `MANUAL` (admin-entered) + `SOCIAL_SYNC` (auto-synced). `sourcePlatform`/`externalPostId` unique constraint for dedup. Category deletion blocked if posts exist. Auto-slugify from title.

---

### CMS Pages

| Field | Detail |
|-------|--------|
| **Status** | FULLY IMPLEMENTED |
| **Path** | `apps/api/src/modules/pages/` |

**Implemented Endpoints:**

| Method | Route | Auth | Permission |
|--------|-------|------|------------|
| `GET` | `/api/v1/pages/:slug` | None (public) | -- |
| `GET` | `/api/v1/admin/pages` | JWT | `pages:view` |
| `GET` | `/api/v1/admin/pages/:id` | JWT | `pages:view` |
| `POST` | `/api/v1/admin/pages` | JWT | `pages:create` |
| `PATCH` | `/api/v1/admin/pages/:id` | JWT | `pages:edit` |
| `POST` | `/api/v1/admin/pages/:id/publish` | JWT | `pages:publish` |
| `POST` | `/api/v1/admin/pages/:id/unpublish` | JWT | `pages:publish` |
| `DELETE` | `/api/v1/admin/pages/:id` | JWT | `pages:delete` |
| `GET` | `/api/v1/admin/pages/:pageId/sections` | JWT | `pages:view` |
| `POST` | `/api/v1/admin/pages/:pageId/sections` | JWT | `pages:edit` |
| `PATCH` | `/api/v1/admin/pages/:pageId/sections/:id` | JWT | `pages:edit` |
| `DELETE` | `/api/v1/admin/pages/:pageId/sections/:id` | JWT | `pages:edit` |
| `POST` | `/api/v1/admin/pages/:pageId/sections/reorder` | JWT | `pages:edit` |

**Notes:** Page Builder pattern: pages contain ordered Sections. Manual slug. SEO fields (metaTitle, metaDescription, ogImage, canonicalUrl, robotsIndex). Section reorder via ordered ID array. Publish requires Arabic title. Public pages exclude type=hidden.

---

### Navigation

| Field | Detail |
|-------|--------|
| **Status** | FULLY IMPLEMENTED |
| **Path** | `apps/api/src/modules/navigation/` |

**Implemented Endpoints:**

| Method | Route | Auth | Permission |
|--------|-------|------|------------|
| `GET` | `/api/v1/navigation` | None (public) | -- |
| `GET` | `/api/v1/admin/navigation` | JWT | `navigation:view` |
| `POST` | `/api/v1/admin/navigation` | JWT | `navigation:edit` |
| `PATCH` | `/api/v1/admin/navigation/:id` | JWT | `navigation:edit` |
| `DELETE` | `/api/v1/admin/navigation/:id` | JWT | `navigation:edit` |
| `POST` | `/api/v1/admin/navigation/reorder` | JWT | `navigation:edit` |

**Notes:** Header + Footer locations. Auto-order assignment. Reorder via ID array. Data-driven public header/footer.

---

### Settings

| Field | Detail |
|-------|--------|
| **Status** | FULLY IMPLEMENTED |
| **Path** | `apps/api/src/modules/settings/` |

**Implemented Endpoints:**

| Method | Route | Auth | Permission |
|--------|-------|------|------------|
| `GET` | `/api/v1/settings` | None (public) | -- |
| `GET` | `/api/v1/admin/settings` | JWT | `settings:view` |
| `PATCH` | `/api/v1/admin/settings/:key` | JWT | `settings:manage` |
| `GET` | `/api/v1/admin/settings/feature-flags` | JWT | `settings:view` |
| `PATCH` | `/api/v1/admin/settings/feature-flags/:key` | JWT | `settings:manage` |

**Notes:** Key-value store grouped by: general, brand, seo, languages, security. Public endpoint returns only safe groups. Feature flag toggle is a dedicated endpoint.

---

### Brands

| Field | Detail |
|-------|--------|
| **Status** | FULLY IMPLEMENTED |
| **Path** | `apps/api/src/modules/brands/` |

**Implemented Endpoints:**

| Method | Route | Auth | Permission |
|--------|-------|------|------------|
| `GET` | `/api/v1/admin/brands` | JWT | `settings:view` |
| `GET` | `/api/v1/admin/brands/:id` | JWT | `settings:view` |
| `POST` | `/api/v1/admin/brands` | JWT | `settings:manage` |
| `PATCH` | `/api/v1/admin/brands/:id` | JWT | `settings:manage` |
| `DELETE` | `/api/v1/admin/brands/:id` | JWT | `settings:manage` |
| `POST` | `/api/v1/admin/brands/:id/social-accounts` | JWT | `settings:manage` |
| `PATCH` | `/api/v1/admin/brands/:id/social-accounts/:accountId` | JWT | `settings:manage` |
| `DELETE` | `/api/v1/admin/brands/:id/social-accounts/:accountId` | JWT | `settings:manage` |

**Notes:** Brand code uniqueness. Nested CRUD for social accounts. Integration setting linkage. Added via second migration (not in original spec).

---

### Testimonials

| Field | Detail |
|-------|--------|
| **Status** | FULLY IMPLEMENTED |
| **Path** | `apps/api/src/modules/testimonials/` |

**Implemented Endpoints:**

| Method | Route | Auth | Permission |
|--------|-------|------|------------|
| `GET` | `/api/v1/testimonials` | None (public) | -- |
| `GET` | `/api/v1/admin/testimonials` | JWT | `testimonials:view` |
| `GET` | `/api/v1/admin/testimonials/:id` | JWT | `testimonials:view` |
| `POST` | `/api/v1/admin/testimonials` | JWT | `testimonials:create` |
| `PATCH` | `/api/v1/admin/testimonials/:id` | JWT | `testimonials:edit` |
| `POST` | `/api/v1/admin/testimonials/:id/publish` | JWT | `testimonials:edit` |
| `POST` | `/api/v1/admin/testimonials/:id/unpublish` | JWT | `testimonials:edit` |
| `DELETE` | `/api/v1/admin/testimonials/:id` | JWT | `testimonials:edit` |

**Notes:** Filter by audience. Ordered by `order` then `createdAt` desc. Auto-increment order on create.

---

### Leads (Appointments + Contact)

| Field | Detail |
|-------|--------|
| **Status** | FULLY IMPLEMENTED |
| **Path** | `apps/api/src/modules/leads/` |

**Implemented Endpoints:**

| Method | Route | Auth | Permission |
|--------|-------|------|------------|
| `POST` | `/api/v1/appointments` | None (public) | -- |
| `GET` | `/api/v1/admin/appointments` | JWT | `appointments:view` |
| `GET` | `/api/v1/admin/appointments/:id` | JWT | `appointments:view` |
| `PATCH` | `/api/v1/admin/appointments/:id/status` | JWT | `appointments:manage` |
| `POST` | `/api/v1/contact` | None (public) | -- |
| `GET` | `/api/v1/admin/contact` | JWT | `contact:view` |
| `GET` | `/api/v1/admin/contact/:id` | JWT | `contact:view` |
| `PATCH` | `/api/v1/admin/contact/:id/read` | JWT | `contact:manage` |

**Notes:** Appointments: 5 statuses (NEW, CONTACTED, CONFIRMED, CANCELLED, COMPLETED). Filters by status, hospitalId, doctorId. Contact: `isRead` flag, auto-marks on view. Phone number validation via regex.

---

### Audit Log

| Field | Detail |
|-------|--------|
| **Status** | FULLY IMPLEMENTED |
| **Path** | `apps/api/src/modules/audit/` |

**Implemented Endpoints:**

| Method | Route | Auth | Permission |
|--------|-------|------|------------|
| `GET` | `/api/v1/admin/audit-logs` | JWT | `audit:view` |
| `GET` | `/api/v1/admin/audit-logs/:id` | JWT | `audit:view` |

**Notes:** Read-only. Auto-recorded via `AuditInterceptor` on all write operations. Filters by entity, action, userId, dateFrom/dateTo. Includes user info in response. Append-only (never deleted).

---

### Health Check

| Field | Detail |
|-------|--------|
| **Status** | FULLY IMPLEMENTED |
| **Path** | `apps/api/src/health.controller.ts` |

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| `GET` | `/health` | None | Returns `{ status: 'ok', timestamp }` |

---

### Not Yet Implemented (Schema Exists, No API)

The following models exist in the Prisma schema but have no corresponding NestJS modules:

| Model | Status | Notes |
|-------|--------|-------|
| `PageDraft` | Schema only | No autosave API |
| `Media` / `MediaFolder` | Schema + seed folders | No upload/download/CRUD endpoints |
| `ChatConversation` / `ChatMessage` | Schema only | No AI chat endpoints |
| `AiKnowledgeBase` / `AiSettings` | Schema + seed data | No CRUD endpoints |
| `IntegrationSetting` | Schema + seed data | Read by BrandsService, no dedicated CRUD |
| `SlugHistory` / `Redirect` | Written by other services | No dedicated read/update API |

---

## Frontend Status

> **14 public pages and 14 admin modules implemented** with Next.js 14 (App Router), Tailwind CSS, React Query, and a custom component library. The site is currently Arabic-only (RTL). i18n routing is not yet wired.

### Public Website

| # | Route | Page | Status |
|---|-------|------|--------|
| 1 | `/` | **Home** | IMPLEMENTED -- Hero, stats, featured hospitals/centers/doctors/news/testimonials, CTA. Server-side data fetching. |
| 2 | `/hospitals` | **Hospitals List** | IMPLEMENTED -- Paginated listing with search, server-rendered. |
| 3 | `/hospitals/[slug]` | **Hospital Detail** | IMPLEMENTED -- Hero image, breadcrumb, description, custom fields, linked centers/doctors. |
| 4 | `/medical-centers` | **Medical Centers List** | IMPLEMENTED -- Paginated listing with search, server-rendered. |
| 5 | `/medical-centers/[slug]` | **Medical Center Detail** | IMPLEMENTED -- Hero, breadcrumbs, description, linked hospitals. |
| 6 | `/doctors` | **Doctors Directory** | IMPLEMENTED -- Paginated listing with search, server-rendered. |
| 7 | `/doctors/[slug]` | **Doctor Detail** | IMPLEMENTED -- Photo, specialty, bio, linked hospitals/centers, book CTA. |
| 8 | `/news` | **News & Media List** | IMPLEMENTED -- Paginated listing with search + category filter tabs. |
| 9 | `/news/[slug]` | **News Post Detail** | IMPLEMENTED -- Article with cover image, breadcrumb, category badge, OG meta tags. |
| 10 | `/book` | **Book Appointment** | IMPLEMENTED -- Full form with hospital/center/doctor dropdowns, query param pre-selection. |
| 11 | `/contact` | **Contact Us** | IMPLEMENTED -- Contact form with info cards (address, phone, hours). |
| 12 | `/search` | **Global Search** | IMPLEMENTED -- Search across hospitals, centers, doctors, news. Grouped results with counts. |
| 13 | `/[slug]` | **CMS Pages** | IMPLEMENTED -- Dynamic renderer for text/hero/cta/faq sections. Reserved slug exclusion list. |
| 14 | 404 | **404 Error Page** | IMPLEMENTED -- Custom Arabic 404 with navigation links. |

**Not yet implemented:**
- `/about` -- About INSAN page (no dedicated route; would be served via CMS page renderer).
- `/investors` -- Hidden investor page (noindex, no sitemap).
- `/privacy` / `/terms` -- Legal pages (footer links currently point to `/contact`).
- `/ar/` + `/en/` locale routing -- Site is Arabic-only. `next-intl` is installed but not wired.
- `loading.tsx` / `error.tsx` -- No route-level loading or error boundary files.

**Implemented Global Components:**

| Component | Status |
|-----------|--------|
| Header (sticky, mobile hamburger, Book CTA) | IMPLEMENTED |
| Footer (brand, quick links, contact) | IMPLEMENTED |
| PublicLayout (server component, fetches nav) | IMPLEMENTED |
| HospitalCard | IMPLEMENTED |
| MedicalCenterCard | IMPLEMENTED |
| DoctorCard | IMPLEMENTED |
| NewsCard (with featured mode) | IMPLEMENTED |
| TestimonialCard (glassmorphism) | IMPLEMENTED |
| AppointmentForm (full client form) | IMPLEMENTED |
| ContactForm (full client form) | IMPLEMENTED |
| Pagination (smart page numbers) | IMPLEMENTED |
| Breadcrumb | IMPLEMENTED |
| SectionTitle | IMPLEMENTED |
| EmptyState | IMPLEMENTED |
| StickyActionsBar | NOT IMPLEMENTED |
| ChatWidget (AI chat bubble) | NOT IMPLEMENTED |
| LanguageSwitcher | NOT IMPLEMENTED |

---

### Admin Dashboard

| # | Module/View | Route | Status |
|---|-------------|-------|--------|
| 1 | **Login Screen** | `/admin/login` | IMPLEMENTED -- Zod-validated form, redirect support, error handling. |
| 2 | **Dashboard (Overview)** | `/admin/dashboard` | IMPLEMENTED -- 8 stat cards with live counts, 3 quick-action cards. |
| 3 | **Pages (CMS)** | `/admin/pages` | IMPLEMENTED -- DataTable, CRUD, publish toggle, bilingual title + SEO fields. **Section editor UI not yet implemented** (API supports it). |
| 4 | **Hospitals** | `/admin/hospitals` | IMPLEMENTED -- DataTable, CRUD modal with bilingual fields, publish toggle. |
| 5 | **Medical Centers** | `/admin/medical-centers` | IMPLEMENTED -- DataTable, CRUD, publish toggle, hospital multi-select. |
| 6 | **Doctors** | `/admin/doctors` | IMPLEMENTED -- DataTable, CRUD, publish toggle, bilingual fields, hospital/center multi-select. |
| 7 | **News** | `/admin/news` | IMPLEMENTED -- Tabbed (Posts / Categories), CRUD, publish toggle, category filter. |
| 8 | **Appointments** | `/admin/appointments` | IMPLEMENTED -- DataTable with status filter, detail modal, status workflow. |
| 9 | **Contact Submissions** | `/admin/contact-submissions` | IMPLEMENTED -- DataTable, unread indicator, detail modal, auto-mark read. |
| 10 | **Testimonials** | `/admin/testimonials` | IMPLEMENTED -- DataTable, CRUD, publish toggle, audience filter. |
| 11 | **Navigation** | `/admin/navigation` | IMPLEMENTED -- Tabbed (header/footer), CRUD, bilingual labels. |
| 12 | **Users** | `/admin/users` | IMPLEMENTED -- DataTable, CRUD, role select, active toggle. |
| 13 | **Brands** | `/admin/brands` | IMPLEMENTED -- DataTable, CRUD, color picker. Social account UI not yet implemented. |
| 14 | **Audit Log** | `/admin/audit-log` | IMPLEMENTED -- Read-only DataTable, detail modal with change diff. |
| 15 | **Settings** | `/admin/settings` | IMPLEMENTED -- Sidebar tabs (general/contact/social/seo/appearance), inline editing, feature flags. |
| 16 | **Media Library** | `/admin/media` | PLACEHOLDER -- "Coming soon" static page. No upload/management UI. |
| 17 | **AI Assistant** | `/admin/ai-assistant` | PLACEHOLDER -- "Coming soon" static page. No chat or knowledge base UI. |

**Admin UI Component Library (10 components):**

| Component | Description |
|-----------|-------------|
| `DataTable` | Generic typed data table with loading skeleton, empty state |
| `Modal` | Backdrop + panel modal, 4 sizes, Escape key support |
| `Toast` | Toast notification system with context provider |
| `StatusBadge` | Colored badge for all status enums |
| `SearchBar` | RTL search input with icon |
| `Pagination` | Client-side pagination with "showing X-Y of Z" |
| `PageHeader` | Title + subtitle + action button |
| `FormField` | Form field wrapper with label, error, hint |
| `BilingualInput` | Tab-switching AR/EN input, RTL/LTR auto |
| `ConfirmDialog` | Delete confirmation with warning, loading state |

---

## Database Status

> **Prisma schema applied with 2 migrations, 28 models, 8 enums, and comprehensive seed data.** Database is PostgreSQL.

### Prisma

- **Status:** Schema implemented and applied.
- **Path:** `apps/api/prisma/schema.prisma` (554 lines)
- **Database:** PostgreSQL
- **Models:** 28 models (26 core + Brand + BrandSocialAccount added via second migration)
- **Enums:** 8 (RoleName, ContentStatus, NewsSourceType, SocialPlatform, AppointmentStatus, TestimonialAudience, ChatSender, MediaType)
- **All translatable fields:** JSON `{ar, en}` format -- no separate translation tables.

### Migrations

| # | Migration | Date | Description |
|---|-----------|------|-------------|
| 1 | `20260725085354_init` | 2026-07-25 | Creates all base tables, enums, indexes |
| 2 | `20260725105221_add_brand_social_account` | 2026-07-25 | Adds Brand + BrandSocialAccount tables, drops SourceEntity enum |

- **Path:** `apps/api/prisma/migrations/`
- **Status:** Both migrations applied.

### Seed

- **Status:** Fully implemented.
- **Path:** `apps/api/prisma/seed.ts` (752 lines)
- **Command:** `pnpm db:seed` (or `npm run db:seed`)

### Models (Complete List)

| Category | Models |
|----------|--------|
| Auth/Users | `Role`, `User`, `RefreshToken` |
| CMS | `Page`, `PageDraft`, `Section` |
| Slug/Redirects | `SlugHistory`, `Redirect` |
| Brands | `Brand`, `BrandSocialAccount` |
| Feature Flags | `FeatureFlag` |
| Healthcare | `Hospital`, `MedicalCenter`, `HospitalMedicalCenter`, `Clinic`, `Doctor`, `DoctorHospital`, `DoctorMedicalCenter` |
| News | `NewsCategory`, `NewsPost` |
| Media | `MediaFolder`, `Media` |
| Navigation/Settings | `NavigationItem`, `Setting`, `IntegrationSetting` |
| Leads | `AppointmentRequest`, `ContactSubmission` |
| Content | `Testimonial` |
| Audit | `AuditLog` |
| AI Chat | `ChatConversation`, `ChatMessage`, `AiKnowledgeBase`, `AiSettings` |

### Current Seeded Data

| Seeder | Data | Count |
|--------|------|-------|
| Roles | SUPER_ADMIN, ADMIN, MANAGER, EDITOR, VIEWER (with full permission JSON) | 5 |
| Super Admin | `admin@insan-platform.com` / `INSAN@Admin2026!` | 1 |
| Settings | General, Brand, SEO, Languages, Security groups | 28 |
| Integration Settings | Facebook, Instagram, LinkedIn placeholders | 5 |
| Brands | INSAN, FUTURE, DELTA (with social accounts) | 3 |
| AI Settings | isEnabled, greeting, escalation config | 5 |
| Hospitals | Future Specialized Hospital (#1B4FCC), Delta International Hospital (#0E7C86) | 2 |
| Medical Centers | Orthopedic, Cardiac, Women's Health, Digestive, Neurology, Emergency, ICU, Senior Care, Ophthalmology, Dermatology, Pediatrics, Dental (4 featured) | 12 |
| Navigation | Header (6) + Footer (8) items | 14 |
| Pages | Home (with Hero section), About, Hospitals, Medical Centers, News, Contact, Investors (hidden), Privacy, Terms | 9 |
| News Categories | Ecosystem News, Hospital News, Medical Center News, Events, Health Tips | 5 |
| AI Knowledge Base | Sample Q&A entries | 4 |
| Media Folders | Hospitals, Medical Centers, Doctors, News, General, Logos & Brand (with sub-folders) | 8 |
| Testimonials | 1 Doctor, 1 Investor | 2 |
| Feature Flags | ai_chat_enabled, social_sync_enabled, appointment_booking_enabled | 3 |

---

## Authentication

> **Fully implemented** with JWT access/refresh token pattern, httpOnly cookies, and RBAC guards.

### JWT

- **Access Token:** Short-lived (15 min), stored in memory (not localStorage), sent in response body on login.
- **Refresh Token:** Long-lived (7 days), stored in httpOnly Secure cookie, rotated on every refresh (one-time use).
- **Signing:** bcrypt for passwords (12 rounds); JWT for tokens with separate access/refresh secrets.

### Cookies

- **Refresh Token Cookie:** `httpOnly: true`, `secure: true`, `sameSite: 'strict'`, `path: '/api/v1/auth'`.
- **Clear on logout:** Cookie expired + refresh token revoked server-side.
- **Admin session cookie:** Frontend uses a non-httpOnly `admin_session` flag cookie for middleware route protection.

### Middleware

- **JwtAuthGuard:** Validates JWT on every protected route.
- **PermissionsGuard:** Checks `user.permissions[module]` contains required action string.
- **@RequirePermission(module, action) decorator:** Endpoint-level permission check.
- **@CurrentUser() decorator:** Extracts authenticated user from request.
- **AuditInterceptor:** Auto-logs all write operations with userId, action, entity, entityId, ipAddress.

### Route Protection

- **Backend:** Public routes unguarded; Admin routes require JWT + permission via `@UseGuards(JwtAuthGuard, PermissionsGuard)`.
- **Frontend:** `middleware.ts` checks for `admin_session` cookie; redirects to `/admin/login` if missing.
- **Admin layout:** On mount, calls `api.auth.refresh()` then `api.auth.me()`; redirects to login on failure.

### Global Exception Filter

- Catches all exceptions and returns unified `{success: false, error: {code, message, path, timestamp, requestId}}` format.
- Handles Prisma errors: P2025 (not found), P2002 (unique constraint), P2003 (foreign key), P2014 (required relation).
- Never leaks stack traces or internal paths in production responses (Sprint A hardening).

### Common Infrastructure

| Component | Path | Description |
|-----------|------|-------------|
| `ApiResponse` helper | `common/helpers/api-response.helper.ts` | Standardized success/paginated/error envelopes |
| `Pagination` helper | `common/helpers/pagination.helper.ts` | Page/pageSize parsing, sort whitelist, status filter |
| `Slug` helper | `common/helpers/slug.helper.ts` | Slugify, resource paths, locale support |
| `BilingualDto` | `common/dto/bilingual.dto.ts` | `{ar: required, en: optional}` and `{ar: required, en: required}` |
| `GlobalValidationPipe` | `main.ts` | whitelist, transform, implicit conversion |
| `Helmet` | `main.ts` | HTTP security headers (CSP, HSTS, X-Frame-Options, etc.) — TD-005 |
| Rate Limiting | `main.ts` + `app.module.ts` | ThrottlerModule: 100 requests per 60s per IP; enforced via `APP_GUARD` |
| CORS | `main.ts` | `CORS_ORIGIN` env var; production fail-fast if missing (TD-006) |
| `PaginationQueryDto` | `common/dto/pagination-query.dto.ts` | Typed pagination with class-validator — TD-004 |

---

## Recent Fixes

> **Sprint A (Application Hardening) completed: 2026-07-26.** Followed by implementation session and repository reorganization.

### Sprint A -- Application Hardening (2026-07-26)

- **TD-001:** Settings endpoint now uses `UpdateSettingDto` with `@IsDefined` validation.
- **TD-002:** Auth login writes (`updateLastLogin`, `createAuditLog`, `storeRefreshToken`) wrapped in `prisma.$transaction`.
- **TD-004:** New `PaginationQueryDto` with typed class-validator rules; applied to Leads and Medical Centers controllers.
- **TD-005:** Helmet installed and configured before CORS in `main.ts`. HTTP security headers active.
- **TD-006:** CORS origin reads from `CORS_ORIGIN` env var; production fail-fast if missing; dev fallback to `http://localhost:5000`.
- **TD-008:** Database indexes added for `NewsPost.categoryId`, `NewsPost.sourceBrandId`, `MediaFolder.parentId`, `NavigationItem.parentId`, `AppointmentRequest.hospitalId/medicalCenterId/doctorId`, `AuditLog.action`.
- **Rate limiting enforcement:** `ThrottlerGuard` bound as `APP_GUARD` in `app.module.ts`.
- **Health endpoint:** `/health` now verifies real database connectivity via Prisma.
- **Global exception filter:** Added `requestId` to 500 responses; catch default Prisma errors; never leaks internals.
- **Build verified:** TypeScript type-check + build pass clean for both API and web apps.

### Independent Review Fixes (2026-07-26)

Following an independent production readiness review, the following defects were identified and fixed:

- **Prisma migrations in Docker:** API Docker image now copies `start.sh` + `prisma/` directory; CMD runs `start.sh` which executes `prisma migrate deploy` before starting the API. `.dockerignore` no longer excludes `scripts/`.
- **Trust proxy:** `app.set('trust proxy', 1)` enabled in production for correct client IP resolution behind nginx — critical for rate limiting and audit logging accuracy.
- **Request ID correlation:** Exception filter now reads `x-request-id` from request headers (set by the logging interceptor) instead of generating a separate UUID, enabling log correlation for 500 errors.
- **CI lint:** Removed `continue-on-error: true` from the lint step so lint failures now fail the build.
- **Documentation:** Updated CURRENT_STATE.md commit history, clarified `db` service in docker-compose.prod.yml and `.env.production.example` is for dev/testing — production should use a managed PostgreSQL provider.

### Core Platform Implementation

- **Turborepo monorepo** initialized with `apps/api` (NestJS) and `apps/web` (Next.js).
- **Prisma schema** created with 28 models, 8 enums, applied via 2 migrations.
- **Seed data** implemented: 5 roles, 1 super admin, 28 settings, 2 hospitals, 12 medical centers, 9 pages, 14 navigation items, 5 news categories, 3 brands, 3 feature flags, and more.
- **14 NestJS modules** implemented with ~106 endpoints, RBAC guards, audit logging, slug history/redirects.
- **14 public pages** implemented with server-side data fetching, search, pagination, and forms.
- **14 admin modules** implemented with React Query, DataTable, modals, and CRUD operations.
- **10 admin UI components** built (DataTable, Modal, Toast, StatusBadge, SearchBar, Pagination, PageHeader, FormField, BilingualInput, ConfirmDialog).
- **15 public components** built (Header, Footer, cards, forms, pagination, breadcrumb, etc.).

### Documentation Improvements (IRA-01 through IRA-07)

Seven Implementation Readiness Audits were performed on the specification documents, resulting in:

- **IRA-01:** Cross-reference standardization, metadata headers, AI decision policy.
- **IRA-02:** Delete Behavior Matrix, Deletion Policy, Slug Rules, Ordering Policy, customFields JSON structure, seed data clarifications.
- **IRA-03:** Standard error response format, pagination contract, filtering/sorting convention, API versioning, rate limiting table, HTTP status codes.
- **IRA-04:** Empty State library, Loading States, Global Form UX, Responsive Priority Rules, Icon library (Lucide), Motion Policy.
- **IRA-05:** Draft Editing Conflict Policy (Optimistic Locking), Audit Log Coverage Matrix, Publish Workflow expansion, Media Usage Protection, Dashboard Widget Priority, Bulk Operation Rules.
- **IRA-06:** AI Provider Failover Policy, Global Integration Retry Policy, Secrets Rotation Policy, Integration Health Check Matrix, AI Conversation Limits, Feature Flag Policy.
- **IRA-07:** DR Objectives (RPO/RTO), DR Playbook (5 phases), Go-Live Checklist (30 items), Logging & Monitoring Matrix, Security Headers Matrix, Password & Session Security Policy.

### Repository Reorganization

- 18 specification documents reorganized from flat `Docs/` directory into categorized subdirectories.
- All cross-directory references updated to correct relative paths.
- Website workspace moved under `/website` directory.
- Brand assets relocated outside the website runtime assets directory.
- Git history preserved throughout reorganization.
- Repository synchronized with GitHub.

---

## Known Technical Debt

> **All items below are tracked in `TECH_DEBT.md` at the project root.** Intentional placeholders are documented separately.

### Confirmed Technical Debt

| ID | Priority | Issue |
|----|----------|-------|
| ~~TD-001~~ | ~~HIGH~~ | ~~Settings endpoint missing DTO validation~~ — **Fixed (Sprint A)** |
| ~~TD-002~~ | ~~HIGH~~ | ~~Auth login has 3 non-atomic DB writes~~ — **Fixed (Sprint A)** |
| TD-003 | HIGH | Leads service FK validation missing |
| ~~TD-004~~ | ~~HIGH~~ | ~~Query DTOs without validation (Leads, Medical Centers)~~ — **Fixed (Sprint A)** |
| ~~TD-005~~ | ~~MEDIUM~~ | ~~Helmet not installed (no HTTP security headers)~~ — **Fixed (Sprint A)** |
| ~~TD-006~~ | ~~MEDIUM~~ | ~~CORS origin hardcoded to localhost~~ — **Fixed (Sprint A)** |
| TD-007 | MEDIUM | Rate limit too low for Dashboard use |
| ~~TD-008~~ | ~~MEDIUM~~ | ~~Missing DB indexes on FK fields~~ — **Fixed (Sprint A)** |
| TD-009 | LOW | DTOs missing @Transform string trim |
| TD-010 | LOW | NewsCategory missing createdAt/updatedAt |
| TD-011 | LOW | Junction tables missing createdAt |
| TD-012 | LOW | omitPassword doesn't future-proof sensitive fields |

**9 items already fixed:** Prisma error filter, audit findOne, section ordering race condition (pre-Sprint A) + TD-001, TD-002, TD-004, TD-005, TD-006, TD-008 (Sprint A).

### Repository-Level Debt

- `tsconfig.tsbuildinfo` in `apps/web/` should eventually be removed from git tracking (currently gitignored but may appear).
- Large brand master assets (AI, EPS, PDF source files) were relocated outside the website runtime assets directory.

### Intentional Placeholders (Deferred Features)

> **These are fully specified but intentionally deferred. Not bugs.**

| Feature | Status | Notes |
|---------|--------|-------|
| **Media Module** | Schema + seed folders exist; no upload API or UI | S3 env vars defined but unused. Implement per Phase 3 of build guide. |
| **AI Assistant** | Schema + seed data exist; no chat API or UI | Requires LLM provider API key. Implement per Phase 8. |
| **Clinics Public API** | Admin CRUD implemented; no public listing endpoint | Nested under Medical Centers by design. |
| **Social Sync** | Schema exists; no sync worker | Facebook/Instagram/LinkedIn auto-sync. Implement per Phase 6. |
| **Extended Seed Data** | No doctor or news post seed records | By design — requires real photos/content. Enter via Admin Dashboard. |
| **i18n Routing** | `next-intl` installed; locale files exist; NOT wired | No `[locale]` routing, no `NextIntlClientProvider`. Site is Arabic-only. |
| **Docker** | Specified in docs; no Dockerfiles or docker-compose | Implement per Phase 10. |
| **About Page** | No dedicated route | Could be served via CMS page renderer. |
| **Investors Page** | Not implemented | Hidden page, noindex, no sitemap. |
| **Privacy / Terms Pages** | Not implemented | Footer links point to `/contact` as placeholder. |

---

## Build Verification

> **Last verified: 2026-07-26** (post-Sprint A changes)

### What Has Been Verified

| Area | Status | Details |
|------|--------|---------|
| **API Build** | Builds successfully | `tsc -p tsconfig.build.json` compiles without errors |
| **Web Build** | Builds successfully | `next build` completes; standalone output configured |
| **TypeScript (API)** | Compiles | `tsc --noEmit` passes. Strict checks disabled (`strictNullChecks: false`, `noImplicitAny: false`) |
| **TypeScript (Web)** | Compiles | `tsc --noEmit` passes. `strict: false` |
| **Prisma Schema** | Valid | `prisma generate` produces client successfully |
| **Prisma Migrations** | Applied | Both migrations (init + brand_social_account) applied |
| **Seed Data** | Runs successfully | All seed functions execute in order; upsert-based idempotency |
| **API Dev Server** | Starts | `ts-node-dev` starts on port 4000; health endpoint returns 200 |
| **Web Dev Server** | Starts | `next dev` starts on port 5000 |
| **Login** | Works | `POST /api/v1/auth/login` returns accessToken + sets httpOnly cookie |
| **Auth Flow** | Works | Login -> me -> refresh -> logout cycle verified |
| **CRUD (Hospitals)** | Works | Create, read, update, publish, unpublish, delete all functional |
| **CRUD (Medical Centers)** | Works | Full CRUD with hospital junction table management |
| **CRUD (Doctors)** | Works | Full CRUD with hospital + medical center junction tables |
| **CRUD (Pages)** | Works | Full CRUD + section management + reorder |
| **CRUD (News)** | Works | Posts + categories, publish workflow |
| **CRUD (Navigation)** | Works | CRUD + reorder |
| **CRUD (Settings)** | Works | Public + admin endpoints, feature flags |
| **CRUD (Testimonials)** | Works | Full CRUD with publish workflow |
| **CRUD (Users)** | Works | User management with role assignment |
| **CRUD (Brands)** | Works | Brand + social account management |
| **Leads** | Works | Appointment + contact form submission |
| **Audit Log** | Works | Write operations logged; read endpoint filters correctly |
| **Public Routes** | Work | All 14 public pages render with server-side data |
| **Admin Login** | Works | Zod-validated form, redirect on success |
| **Admin Dashboard** | Works | Stat cards display live counts |
| **Admin CRUD** | Works | All 14 admin modules with DataTable, modals, publish toggle |
| **Admin Middleware** | Works | Route protection via `admin_session` cookie |

### What Has NOT Been Verified

| Area | Reason |
|------|--------|
| Docker build | No Dockerfiles exist yet |
| Production deployment | No prod environment configured |
| i18n routing | Not wired up (Arabic-only) |
| Media upload | No API or UI implemented |
| AI chat | No API or UI implemented |
| Social sync | No worker implemented |
| Performance testing | No load testing performed |
| Accessibility audit | No WCAG verification done |

---

## Repository Reorganization

> **The repository was reorganized during the implementation session.** The website workspace is now a self-contained monorepo under `/website`.

### What Changed

| Aspect | Before | After |
|--------|--------|-------|
| Website location | Flat files in repo root | `website/` workspace directory |
| Monorepo setup | None | Turborepo + pnpm workspaces |
| Backend | Not created | `website/apps/api/` (NestJS) |
| Frontend | Not created | `website/apps/web/` (Next.js) |
| Brand assets | Mixed with code | `website/assets/` (relocated outside runtime) |
| Documentation | Flat `Docs/` | Categorized subdirectories in `website/Docs/` |

### Details

- **Website workspace** moved under `/website` directory as a self-contained monorepo.
- **Replit workspace integration** configured via `replit.md` and `.replit` files.
- **Updated workflow paths** — all pnpm scripts, turbo tasks, and Prisma commands use the new workspace structure.
- **Git history preserved** — reorganization committed as refactoring commits; no history lost.
- **Repository synchronized with GitHub** — all changes pushed to `origin/main`.
- **Local repository synchronized** — working tree is clean, up to date with remote.

### Post-Merge Hook

A `scripts/post-merge.sh` hook exists that automatically:
1. Installs dependencies (`pnpm install`)
2. Generates Prisma client (`pnpm db:generate`)
3. Runs migrations (`pnpm db:migrate`)
4. Seeds database (`pnpm db:seed`)

---

## Environment Setup

> **Environment file exists.** Copy `.env.example` to `.env` and fill in secrets.

### Setup Steps

1. Install dependencies: `pnpm install`
2. Copy environment: `cp .env.example .env` (then fill in secrets)
3. Generate Prisma client: `pnpm db:generate`
4. Run migrations: `pnpm db:migrate`
5. Seed database: `pnpm db:seed`
6. Start dev servers: `pnpm dev` (runs API on :4000 and Web on :5000)

### Backend (`apps/api/.env`)

| Variable | Purpose | Example | Actually Used? |
|----------|---------|---------|----------------|
| `NODE_ENV` | Environment mode | `development` | Yes |
| `PORT` | API server port | `4000` | Yes |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@localhost:5432/insan` | Yes |
| `JWT_ACCESS_SECRET` | Access token signing key | (generate, 32+ chars) | Yes |
| `JWT_REFRESH_SECRET` | Refresh token signing key | (generate, 32+ chars) | Yes |
| `JWT_ACCESS_EXPIRES` | Access token lifetime | `15m` | Yes |
| `JWT_REFRESH_EXPIRES` | Refresh token lifetime | `7d` | Yes |
| `CORS_ORIGIN` | Allowed frontend origin | `http://localhost:5000` | Yes |
| `S3_ENDPOINT` | S3-compatible storage endpoint | (provider-specific) | No (placeholder) |
| `S3_ACCESS_KEY` | S3 access key | (provider-specific) | No (placeholder) |
| `S3_SECRET_KEY` | S3 secret key | (provider-specific) | No (placeholder) |
| `S3_BUCKET` | S3 bucket name | `insan-media` | No (placeholder) |
| `ENCRYPTION_KEY` | Key for encrypting IntegrationSettings | (generate) | No (placeholder) |
| `REDIS_URL` | Redis connection | `redis://localhost:6379` | No (placeholder) |
| `LLM_PROVIDER` | AI chat provider | `anthropic` | No (placeholder) |
| `LLM_API_KEY` | AI provider API key | (provider-specific) | No (placeholder) |

### Frontend (`apps/web/.env`)

| Variable | Purpose | Example | Actually Used? |
|----------|---------|---------|----------------|
| `NEXT_PUBLIC_API_BASE_URL` | Backend API URL | `http://localhost:4000/api/v1` | Yes |
| `NEXT_PUBLIC_DEFAULT_LOCALE` | Default language | `ar` | No (hardcoded) |
| `NEXT_PUBLIC_SITE_URL` | Public site URL | `https://insan-platform.com` | No (placeholder) |

### Local Development Services

| Service | Image | Port | Purpose | Required? |
|---------|-------|------|---------|-----------|
| PostgreSQL | `postgres:16-alpine` | 5432 | Database | Yes |
| Redis | `redis:7-alpine` | 6379 | Cache/Queue | No (placeholder) |
| MinIO | `minio/minio` | 9000, 9001 | Local S3-compatible storage | No (placeholder) |

---

## Production Readiness

> **Current readiness: Sprint B Complete.** Application hardening + production infrastructure code complete. Remaining work is manual infrastructure provisioning (VPS, managed PostgreSQL, SSL, domain), monitoring setup, backup configuration, compliance pages, and content. See `GO_LIVE_ROADMAP.md` for the execution plan and `PRODUCTION_DEPLOYMENT_CHECKLIST.md` for itemized status.

### What Exists

- Complete backend API with 14 modules, ~106 endpoints, RBAC, audit logging.
- Complete frontend with 14 public pages, 14 admin modules, responsive design.
- Database with 28 models, 2 migrations, comprehensive seed data.
- Documentation suite (18 specification documents).
- TECH_DEBT.md tracking 3 remaining issues.

### What Remains Before Production

**Infrastructure provisioning (Manual):**
1. Provision managed PostgreSQL instance (Supabase, Neon, Railway, or AWS RDS).
2. Provision VPS or Docker hosting (DigitalOcean, Hetzner, AWS EC2).
3. Register and configure production domain.
4. Set up DNS A record pointing domain to server IP.
5. Provision and configure SSL certificates (Let's Encrypt via certbot).

**Configuration (Manual):**
6. Fill in `.env.production` with real secrets (JWT, DB password, CORS_ORIGIN, etc.).
7. Place SSL certificates in `infra/ssl/`.

**Monitoring (Infrastructure):**
8. Set up uptime monitoring (UptimeRobot, BetterStack) pointing at `/health`.
9. Set up error tracking (Sentry) — optional but recommended.

**Backup (Infrastructure):**
10. Configure automated daily pg_dump cron job.
11. Set up off-site backup storage (S3/R2).
12. Test restore procedure.

**Compliance (Manual):**
13. Write and publish Privacy Policy page.
14. Write and publish Terms of Use page.

**Content (Manual):**
15. Replace seed data with real production content.

**Remaining Application Tasks (Repository):**
16. i18n routing — Wire up `next-intl` (pending business decision).
17. SEO — Dynamic sitemap, structured data, meta tags.
18. Media module — S3 upload, folder management.
19. AI chat — LLM integration.
20. Admin section editor UI — Page Builder.
21. TD-003, TD-007, TD-009 through TD-012 resolution.

---

## Technical Debt

> **Tracked in `TECH_DEBT.md` at the project root.** 9 items fixed (3 pre-Sprint A + 6 in Sprint A). 3 remaining: TD-003, TD-007, TD-009 through TD-012.

When new technical debt is identified during development, add it to `TECH_DEBT.md` with:
- ID, priority, description.
- Why it exists (time constraint, dependency limitation, etc.).
- Recommended resolution.

---

## Production Readiness Audit

> **Audit completed: 2026-07-26.** Read-only review. No code was modified.

| Field | Detail |
|-------|--------|
| **Scope** | `website/` workspace only (NestJS API + Next.js frontend) |
| **Baseline** | CURRENT_STATE.md v3.0, cross-checked against actual source files |
| **Readiness Score** | **38 / 100** |
| **Recommendation** | **No-Go** |

### Summary

The application layer (backend API, admin dashboard, public website, database, RBAC, audit system) is substantially complete and functional. The core platform is not the problem -- production readiness spans security hardening, infrastructure, monitoring, backups, legal/compliance, and content population, which are almost entirely outstanding.

### Key Findings

| Category | Finding | Status |
|----------|---------|--------|
| **Security** | No Helmet / HTTP security headers (TD-005) | **Fixed (Sprint A)** |
| **Security** | Rate limiting may not be enforced despite being documented (pending verification) | **Fixed (Sprint A)** — `APP_GUARD` bound |
| **Security** | CORS hardcoded to localhost (TD-006), no dependency audit, no pen test | CORS **fixed (Sprint A)**; dependency audit pending |
| **Security** | JWT/DB secrets are ad-hoc dev values, no rotation process | Still open (Sprint B) |
| **Auth** | 3 non-atomic DB writes on login (TD-002) | **Fixed (Sprint A)** |
| **Backend** | DTOs typed `any` instead of validated classes (TD-001, TD-004) | **Fixed (Sprint A)** |
| **Frontend** | i18n routing not wired -- bilingual requirement is ambiguous | Still open (Sprint C decision) |
| **Frontend** | No Page Builder / drag-and-drop editor for content staff | Still open (Sprint C) |
| **Database** | No managed production PostgreSQL selected | Still open (Sprint B) |
| **Database** | Missing indexes on multiple FK columns (TD-008) | **Fixed (Sprint A)** |
| **Deployment** | No deployment pipeline or infrastructure exists | Still open (Sprint B) |
| **Deployment** | Dockerfiles / docker-compose / nginx not in repository | Still open (Sprint B) |
| **Deployment** | No CI/CD pipeline | Still open (Sprint B) |
| **Infrastructure** | No domain, DNS, SSL, or reverse proxy configured | Still open (Sprint B) |
| **Infrastructure** | No object storage (S3/R2) configured | Still open (Sprint B) |
| **Monitoring** | No uptime monitoring, error tracking, or structured logging | Still open (Sprint B) |
| **Backup** | No backup strategy or restore procedure | Still open (Sprint B) |
| **Compliance** | No Privacy Policy or Terms of Use pages (PII collection via forms) | Still open (Sprint C) |
| **Content** | Only seed/demo data -- no real content | Still open (Sprint C) |

### Prioritized Blockers

**Must-fix before any production deployment (Critical):**

- [ ] Deployment pipeline: Dockerfiles, production compose, reverse proxy, TLS
- [ ] Managed production PostgreSQL
- [ ] Domain, DNS, SSL certificates
- [x] ~~Verify rate limiting enforcement; add Helmet~~ (Sprint A)
- [x] ~~Set production CORS_ORIGIN; regenerate all secrets~~ CORS env-configured (Sprint A); secrets TBD at deploy
- [ ] Database backup + restore procedure
- [ ] Privacy Policy and Terms of Use pages
- [ ] Basic monitoring: uptime, error tracking, structured logging
- [ ] Confirm seed script cannot destructively run against production data

**Should-fix before launch (High):**

- [x] ~~Wrap auth login writes in DB transaction (TD-002)~~ (Sprint A)
- [x] ~~DTO validation on Settings, Leads, Medical Centers (TD-001, TD-004)~~ (Sprint A)
- [ ] Dependency vulnerability audit
- [ ] Decide: bilingual (AR+EN) or Arabic-only at launch
- [x] ~~Add missing FK indexes (TD-008)~~ (Sprint A)
- [ ] Confirm 500 errors never leak stack traces
- [ ] Replace seed content with real data
- [ ] Decide if Media Library is required at launch

**Recommended before or shortly after launch (Medium/Low):**

- [ ] WCAG 2.1 AA accessibility pass
- [ ] JSON-LD structured data, meta-tag coverage audit
- [ ] Load testing on public form and booking endpoints
- [ ] Resolve remaining tech debt (TD-003, TD-007, TD-009 through TD-012)
- [ ] Admin Page Builder UI if non-technical staff will manage content

> **Full audit details:** See `GO_LIVE_ROADMAP.md` for the execution roadmap. Original audit document available on request.

---

## Recommended Next Phase

### Phase 1: Core Platform Development -- COMPLETE

All core modules are implemented and functional:
- Backend: 14 NestJS modules with ~106 endpoints.
- Frontend: 14 public pages + 14 admin modules.
- Database: 28 models, 2 migrations, seed data.
- Auth: JWT with RBAC, audit logging.

### Phase 2: Production Readiness -- IN PROGRESS

The Production Readiness Audit has been completed. Sprint A (Application Hardening) and Sprint B (Production Infrastructure) are complete. Remaining work is manual infrastructure provisioning, monitoring, backups, compliance pages, and content.

**Execution roadmap:** See [`GO_LIVE_ROADMAP.md`](GO_LIVE_ROADMAP.md) for the sprint-by-sprint execution plan (Sprint A: Application Hardening ✅, Sprint B: Production Infrastructure ✅, Sprint C: Launch Readiness, Final Stage: Go Live).

| Priority | Area | Focus |
|----------|------|-------|
| ~~P0~~ | ~~Security~~ | ~~Helmet, CORS, rate limiting~~ ✅ Sprint A |
| ~~P0~~ | ~~Deployment~~ | ~~Docker, docker-compose, nginx, CI/CD, scripts~~ ✅ Sprint B |
| P0 | Infrastructure | Provision managed PostgreSQL, domain, DNS, SSL (manual) |
| P0 | Backup & Recovery | Configure automated backup, test restore (manual) |
| P0 | Compliance | Privacy Policy, Terms of Use (manual content) |
| P1 | Monitoring | Uptime monitoring, error tracking (manual setup) |
| ~~P1~~ | ~~Auth Hardening~~ | ~~Transaction wrapping (TD-002), DTO validation (TD-001, TD-004)~~ ✅ Sprint A |
| P1 | Content | Replace seed data with real content |
| P2 | i18n | Wire up `next-intl`, `/ar/` + `/en/` routing (pending business decision) |
| P2 | SEO | Structured data, meta tags, sitemap validation |
| P2 | Accessibility | WCAG 2.1 AA audit |
| P2 | Performance | Core Web Vitals, bundle analysis, image optimization |
| P3 | Media Module | S3 upload, folder management, admin UI |
| P3 | AI Chat | LLM integration, knowledge base admin |
| P3 | Social Sync | Facebook/Instagram/LinkedIn auto-sync |
| P3 | Technical Debt | Resolve TD-003, TD-007, TD-009 through TD-012 |

---

## AI Handoff Notes

> **This section provides explicit instructions for future AI assistants working on this project.**

### Current State Summary

The core platform is **implemented and functional**. The backend has 14 NestJS modules with ~106 endpoints. The frontend has 14 public pages and 14 admin modules. The database has 28 models, 2 migrations, and seed data. The site runs on ports 4000 (API) and 5000 (Web). Login credentials: `admin@insan-platform.com` / `INSAN@Admin2026!`.

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
- i18n routing (next-intl is installed but not wired)
- Docker infrastructure
- Missing pages (About, Investors, Privacy, Terms)

### Do NOT Perform Large Architectural Refactoring

Before any significant refactoring:

1. Read ALL documents in `Docs/architecture/` first.
2. Read the specific module specification you intend to change.
3. Check for cross-references to the module in other documents.
4. Document the proposed change and its rationale.
5. If the change affects the database schema, API contracts, or auth model, stop and request explicit approval.

### Build Execution

Follow `99_REPLIT_BUILD_GUIDE.md` for remaining phases. The core platform (Phases 0-5 equivalent) is complete. Focus on production hardening, i18n, SEO, and deferred features.

### Document Maintenance

If you modify any specification during development:

1. Update the version number and `Last Updated` date in the document header.
2. Add a change entry to the document's changelog (if one exists).
3. Update cross-references if you rename or move sections.
4. Keep `CURRENT_STATE.md` (this document) updated with implementation progress.

---

*This document is the primary entry point for anyone continuing development on the INSAN Website Platform. Campaign OS documentation is maintained separately at `campaign-os/docs/CURRENT_STATE.md`. Last updated: 2026-07-26. Version 6.0 -- Sprint B (Production Infrastructure) completed.*
