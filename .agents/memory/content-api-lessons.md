---
name: Content API implementation lessons
description: Schema facts and patterns discovered while building the 13 content-API modules — prevents repeating investigation.
---

## Schema facts (check before writing code)

- `publishedAt DateTime?` exists on: **Hospital** ❌ (no), **MedicalCenter** ❌ (no), **Doctor** ❌ (no), **Page** ✅, **NewsPost** ✅, **Testimonial** ❌ (no)
- AppointmentRequest fields: `name` (single string, not firstName/lastName), `phone`, `email?`, `hospitalId?`, `medicalCenterId?`, `doctorId?`, `preferredDate?`, `message?`, `status AppointmentStatus`
- Contact model is `ContactSubmission` (not ContactMessage), fields: `name`, `email`, `phone?`, `subject?`, `message`, `isRead Boolean`
- Status enums that exist: `AppointmentStatus {NEW, CONTACTED, CONFIRMED, CANCELLED, COMPLETED}`, `ContentStatus {DRAFT, PUBLISHED, ARCHIVED}`, `LeadStatus` does NOT exist
- `TestimonialAudience` enum exists; `Testimonial` has no `publishedAt` — publish just sets `status = PUBLISHED`
- `@nestjs/mapped-types` must be explicitly installed (not bundled) — `pnpm add @nestjs/mapped-types` in `apps/api`

## Audit interceptor pattern

`AuditInterceptor` reads `AUDIT_ACTION_KEY` from the **handler only** (`.get`, not `.getAllAndOverride`), so `@AuditAction` at method level is correct; putting it at class level does nothing. Apply `@UseInterceptors(AuditInterceptor)` at class level (safe — skips non-annotated handlers) and `@AuditAction('Entity', 'action')` at each write method.

## Multi-junction table pattern (Hospitals / Doctors)

For entities with M:N hospital + medical-center junctions, update strategy: delete all existing junction rows then createMany with `skipDuplicates: true` inside a `$transaction`. Pass `hospitalIds?: string[]` and `medicalCenterIds?: string[]` in DTOs; omitting the field means "no change", passing an empty array clears all links.

## Slug change → SlugHistory + Redirect

Must run inside `$transaction`. Create one `SlugHistory` row and two `Redirect` rows (one per locale `['ar', 'en']`) with `upsert` on `fromPath`. Path format: `/${locale}/${resourcePath}/${oldSlug}`. Resource path map lives in `common/helpers/slug.helper.ts`.

## Publish validation contract

Every publishable entity must validate before setting `PUBLISHED`:
- All bilingual text required: at minimum `name.ar` (hospitals, centers, doctors, testimonials) or `title.ar` (pages, posts)
- Entities that need a hospital link: MedicalCenter (≥1 hospital), Doctor (≥1 hospital)
- Throw `BadRequestException({ code: 'INCOMPLETE_CONTENT', message: '...' })`

## `filter[field]=value` query parsing

Express parses `?filter[status]=PUBLISHED` as `req.query.filter = { status: 'PUBLISHED' }`. Use `@Query('filter') filter: any` as a separate parameter. The `parseStatusFilter(filter, validStatuses)` helper in `pagination.helper.ts` handles extraction.

## Settings controller route ordering

`GET /admin/settings/feature-flags` and `PATCH /admin/settings/feature-flags/:key` must be declared **before** `PATCH /admin/settings/:key` so "feature-flags" is not captured as `:key`. NestJS matches literal segments before parameterised ones within the same controller when declared first.

## Admin Dashboard architecture

- **Stack:** Next.js 14 App Router + Tailwind CSS + React Query v5 + React Hook Form + Zod
- **Auth flow:** Access token in memory (`setAccessToken`), refresh token in httpOnly cookie, auto-refresh on 401 in `api-client.ts`
- **Shared UI components:** `DataTable`, `Modal`, `ConfirmDialog`, `StatusBadge`, `Pagination`, `SearchBar`, `PageHeader`, `FormField`, `BilingualInput`, `Toast` (ToastProvider) — all in `apps/web/components/admin/ui/`
- **Pattern:** Each screen = `{Module}Client.tsx` (list + state) + `{Module}Modal.tsx` (form); `page.tsx` is a thin wrapper
- **ToastProvider** must wrap children in `AdminLayoutClient` for `useToast()` to work anywhere

## Publish API routes (PATCH not POST)

The API uses `PATCH /{entity}/:id/publish` and `PATCH /{entity}/:id/unpublish`. Frontend `api-client.ts` uses PATCH for these. Pages controller uses POST — note the mismatch (see `pages.controller.ts`).

## Module status at completion

All 13 modules fully implemented, seeded, and smoke-tested:
Hospitals, MedicalCenters (+ Clinics nested), Doctors, Pages (+ Sections), News (Categories + Posts), Settings (+ FeatureFlags), Navigation, Testimonials, Leads (Appointments + ContactSubmission), Users (+ Roles), Brands (+ BrandSocialAccount), Audit.

Admin Dashboard: 14 screens built (Dashboard, Hospitals, Medical Centers, Doctors, News, Pages, Settings, Navigation, Testimonials, Appointments, Contact Submissions, Users, Brands, Audit Log) + 2 placeholders (Media, AI Assistant).
