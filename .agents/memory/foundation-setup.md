---
name: Foundation setup
description: Monorepo layout, env vars, pnpm workspace, workflow config, and initial migration decisions.
---

## Monorepo layout
- Root: `pnpm-workspace.yaml` covers `apps/*` and `packages/*`
- `apps/api` — NestJS (port 4000), `apps/web` — Next.js (port 5000)
- Turbo orchestrates both; root `package.json` delegates `db:*` to `@insan/api`

## Workflows
- `INSAN API (NestJS)`: `cd apps/api && pnpm run dev` → ts-node-dev → port 4000
- `Start application`: `cd apps/web && pnpm run dev` → next dev → port 5000

## Environment variables (shared)
All non-secret vars set via Replit env vars (shared environment):
NODE_ENV, PORT, JWT_ACCESS_EXPIRES, JWT_REFRESH_EXPIRES, S3_BUCKET, LLM_PROVIDER,
CORS_ORIGIN, RATE_LIMIT_WINDOW, RATE_LIMIT_MAX, NEXT_PUBLIC_API_BASE_URL,
NEXT_PUBLIC_DEFAULT_LOCALE, NEXT_PUBLIC_SITE_URL

JWT_ACCESS_SECRET, JWT_REFRESH_SECRET, ENCRYPTION_KEY also stored as shared env vars
(dev-only values generated with `openssl rand -hex 32`).

DATABASE_URL is runtime-managed by Replit — do not set manually.

**Why:** .env files cannot be written by agent (platform restriction); all config must go through Replit env var system.

## Database
- Provider: Replit PostgreSQL (host: `helium`, db: `heliumdb`)
- ORM: Prisma 5.x; schema at `apps/api/prisma/schema.prisma`
- Initial migration created: `20260725085354_init` (full schema)
- Seed run: 5 roles, super admin (`admin@insan-platform.com` / `INSAN@Admin2026!`), 30 settings, 2 hospitals, 12 medical centers, navigation, pages, news categories, AI KB, media folders, testimonials, feature flags

## Post-merge script
- Location: `scripts/post-merge.sh`
- Configured via `setPostMergeConfig({ scriptPath: "scripts/post-merge.sh", timeoutMs: 180000 })`
- Steps: pnpm install → db:generate → db:migrate → db:seed

## Critical pre-implementation decisions (from arch review)
- **C1**: Change `SourceEntity` enum → `String` in schema BEFORE next migration
- **C2**: Add `PageDraft` + `DraftSection` tables BEFORE Phase 3 (Page Builder)
- ISR revalidation: NestJS cannot call `revalidatePath` directly — must use a Next.js Route Handler webhook that NestJS calls after publish

## Known issues to fix later
- `pnpm.onlyBuiltDependencies` in per-app `package.json` has no effect; should be at workspace root
- Cross-origin warning in Next.js dev: configure `allowedDevOrigins` in `next.config.js`
