# INSAN Healthcare Platform

A bilingual (Arabic/English) healthcare content management and public-facing platform built as a pnpm monorepo.

## Architecture

| Layer | Technology | Port |
|---|---|---|
| API | NestJS + Prisma + PostgreSQL | 4000 |
| Web (Admin + Public) | Next.js 14 App Router | 5000 |

**Monorepo layout:**
- `apps/api/` — NestJS REST API (`/api/v1/...`)
- `apps/web/` — Next.js app (admin at `/admin/*`, public at `/`)
- `packages/` — shared types/config

## Running the project

Both workflows start automatically:
- **INSAN API (NestJS):** `cd apps/api && pnpm run dev`
- **Start application:** `cd apps/web && pnpm run dev`

## Seeded admin credentials

| Field | Value |
|---|---|
| Email | `admin@insan-platform.com` |
| Password | `INSAN@Admin2026!` |
| Role | `SUPER_ADMIN` |

> These credentials are for local development only. Change before deploying to production.

## Key design decisions

- All bilingual fields (name, description, etc.) are stored as `Json` columns with `{ ar: string, en: string }` shape.
- The `t(field)` utility in `apps/web/lib/utils.ts` extracts the Arabic value (primary locale).
- Public pages use ISR (`revalidate: 60`). Search queries use `cache: 'no-store'`.
- Admin auth: access token stored in memory (`api-client.ts`); refresh token in an HttpOnly cookie at path `/api/v1/auth`. The Next.js middleware checks a lightweight `admin_session=1` cookie as a UI gate.
- All publish/unpublish API routes are `POST` (not `PATCH`).

## User preferences

- Fix only real defects — no refactoring, no new features without explicit request.
- Server-side data fetching for all public pages (no client-side fetch on public routes).
- RTL-first layout throughout the public website.
