---
name: Content API implementation lessons
description: Schema facts and patterns discovered while building all API modules and the public website — prevents repeating investigation.
---

## Schema facts (check before writing code)

- `publishedAt DateTime?` exists on: **Hospital** ❌ (no), **MedicalCenter** ❌ (no), **Doctor** ❌ (no), **Page** ✅, **NewsPost** ✅, **Testimonial** ❌ (no)
- AppointmentRequest fields: `name` (single string, not firstName/lastName), `phone`, `email?`, `hospitalId?`, `medicalCenterId?`, `doctorId?`, `preferredDate?`, `message?`, `status AppointmentStatus`
- Contact model is `ContactSubmission` (not ContactMessage), fields: `name`, `email`, `phone?`, `subject?`, `message`, `isRead Boolean`
- Status enums that exist: `AppointmentStatus {NEW, CONTACTED, CONFIRMED, CANCELLED, COMPLETED}`, `ContentStatus {DRAFT, PUBLISHED, ARCHIVED}`, `LeadStatus` does NOT exist
- `TestimonialAudience` enum exists; `Testimonial` has no `publishedAt` — publish just sets `status = PUBLISHED`
- `@nestjs/mapped-types` must be explicitly installed (not bundled) — `pnpm add @nestjs/mapped-types` in `apps/api`

## Unpublish routes — were missing, now added

All 6 entities (hospitals, medical-centers, doctors, news, pages, testimonials) were missing their `unpublish` route and service method. Both were added:
- Services: `unpublish()` sets `status: 'DRAFT'` (news/pages also clear `publishedAt: null`)
- Controllers: `@Post('admin/{entity}/:id/unpublish')` with same `publish` permission guard
Pattern to follow for any future entity that needs publish/unpublish.

## Publish API routes — all POST, not PATCH

All publish/unpublish routes use `@Post` not `@Patch`:
`POST /admin/{entity}/:id/publish` and `POST /admin/{entity}/:id/unpublish`
Frontend api-client must use `method: 'POST'` for these calls.

## Audit interceptor pattern

`AuditInterceptor` reads `AUDIT_ACTION_KEY` from the **handler only** (`.get`, not `.getAllAndOverride`), so `@AuditAction` at method level is correct; putting it at class level does nothing.

## Multi-junction table pattern (Hospitals / Doctors)

For entities with M:N hospital + medical-center junctions, update strategy: delete all existing junction rows then createMany with `skipDuplicates: true` inside a `$transaction`. Pass `hospitalIds?: string[]` and `medicalCenterIds?: string[]` in DTOs; omitting the field means "no change", passing an empty array clears all links.

## Slug change → SlugHistory + Redirect

Must run inside `$transaction`. Create one `SlugHistory` row and two `Redirect` rows (one per locale `['ar', 'en']`) with `upsert` on `fromPath`. Path format: `/${locale}/${resourcePath}/${oldSlug}`. Resource path map lives in `common/helpers/slug.helper.ts`.

## Publish validation contract

Every publishable entity must validate before setting `PUBLISHED`:
- All bilingual text required: at minimum `name.ar` (hospitals, centers, doctors, testimonials) or `title.ar` (pages, posts)
- Entities that need a hospital link: MedicalCenter (≥1 hospital), Doctor (≥1 hospital)
- Throw `BadRequestException({ code: 'INCOMPLETE_CONTENT', message: '...' })`

## Auth controller — refresh endpoint crash bug (fixed)

`auth/refresh` endpoint used `@Res({ passthrough: true })` but also called `res.status(401).json()` directly for error cases. This sends the response twice: Express sends it once, NestJS tries to JSON-serialize the returned `Response` object (circular Socket reference), crashes the process. Fix: replace `return res.status().json()` with `throw new UnauthorizedException()` and let the GlobalExceptionFilter handle it.

## Admin credentials (seeded)

Email: `admin@insan-platform.com`, Password: `INSAN@Admin2026!` — in `apps/api/prisma/seed.ts` as `TEMP_PASSWORD`.

## Arabic search in JSON fields (Prisma)

Services originally searched slug only (English). Must use JSON path search for bilingual fields:
```typescript
where.OR = [
  { slug: { contains: query.search, mode: 'insensitive' } },
  { name: { path: ['ar'], string_contains: query.search } },
  { name: { path: ['en'], string_contains: query.search } },
];
```
Arabic doesn't need `mode: 'insensitive'` (no case distinction). JSON path `string_contains` works for partial match inside JSON string values. Applied to: hospitals, medical-centers, doctors, news services.

## `filter[field]=value` query parsing

Express parses `?filter[status]=PUBLISHED` as `req.query.filter = { status: 'PUBLISHED' }`. Use `@Query('filter') filter: any` as a separate parameter.

## Settings controller route ordering

`GET /admin/settings/feature-flags` and `PATCH /admin/settings/feature-flags/:key` must be declared **before** `PATCH /admin/settings/:key`.

## Public Website Architecture (apps/web)

**Foundation:**
- `lib/public-api.ts` — server-side only fetch utility, ISR revalidate=60s, returns null on error
- `lib/utils.ts` — `t(bilingual, locale)`, `formatDate`, `truncate`, `qs` helpers
- `components/public/PublicLayout.tsx` — async server component, fetches header+footer nav, wraps with `<html lang="ar" dir="rtl">`
- Root `app/layout.tsx` returns `children` only (no html tag) — each layout provides its own html wrapper

**Component locations:** `apps/web/components/public/` (inside the web app, matching `@/*` alias)

**Pages (all server components except forms):**
- `/` — home with hero, hospital/center/doctor/news/testimonials sections
- `/hospitals`, `/hospitals/[slug]` — listing + detail
- `/medical-centers`, `/medical-centers/[slug]` — listing + detail
- `/doctors`, `/doctors/[slug]` — listing + detail
- `/news`, `/news/[slug]` — listing + detail with category filter
- `/book` — appointment booking form (server page + AppointmentForm client component)
- `/contact` — contact form (server page + ContactForm client component)
- `/search` — cross-entity search (hospitals, centers, doctors, news)
- `/[slug]` — CMS page catch-all (handles: text, hero, cta, faq sections)
- `not-found.tsx`, `sitemap.ts`, `robots.ts`

**Module status:**
All 13 API modules complete. Admin Dashboard 14 screens + 2 placeholders. Public Website all 16 requirements delivered.
