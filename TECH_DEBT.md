# Technical Debt Register

> Last updated: 2026-07-25
> Policy: Fix only when a debt directly blocks the feature under development.

---

## 🟠 High — Fix when first encountered as a blocker

### TD-001: Settings endpoint missing DTO validation
- **File:** `apps/api/src/modules/settings/settings.controller.ts` L43
- **Issue:** `@Body() body: { value: any }` — no class-validator decorators, accepts garbage input
- **Risk:** Invalid data silently persists to DB
- **Fix:** Create `UpdateSettingDto` with `@IsNotEmpty() value: any`

### TD-002: Auth login — 3 non-atomic DB writes
- **File:** `apps/api/src/modules/auth/auth.service.ts`
- **Issue:** `updateLastLogin` + `createAuditLog` + `storeRefreshToken` not in `$transaction`
- **Risk:** Partial state if DB fails mid-login (audit log written but token not stored)
- **Fix:** Wrap all three writes in `prisma.$transaction`

### TD-003: Leads service — FK validation missing
- **File:** `apps/api/src/modules/leads/leads.service.ts`
- **Issue:** `hospitalId` / `medicalCenterId` / `doctorId` not validated before insert; Prisma P2003 → 500
- **Risk:** Public form submission returns 500 instead of 400 on invalid IDs
- **Fix:** Now handled by Prisma error filter (returns 400); full fix is explicit pre-check

### TD-004: Query DTOs without validation (Leads, Medical Centers)
- **Files:** `leads.controller.ts` L43, L77; `medical-centers.controller.ts` L38, L54
- **Issue:** `@Query() query: any` — no class-validator on pagination params
- **Risk:** Malformed `page` / `limit` propagates to Prisma
- **Fix:** Replace with typed `PaginationQueryDto`

---

## 🟡 Medium — Address in a dedicated hardening sprint

### TD-005: Helmet not installed
- **File:** `apps/api/src/main.ts`
- **Issue:** No HTTP security headers (X-Frame-Options, CSP, HSTS, etc.)
- **Fix:** `pnpm add helmet` → `app.use(helmet())` before CORS

### TD-006: CORS origin hardcoded to localhost
- **File:** `apps/api/src/main.ts` L21
- **Issue:** `process.env.CORS_ORIGIN || 'http://localhost:5000'` — breaks on deploy
- **Fix:** Set `CORS_ORIGIN` env var to production domain at deploy time

### TD-007: Rate limit too low for Dashboard use
- **File:** `apps/api/src/app.module.ts`
- **Issue:** `{ ttl: 60000, limit: 100 }` — a single dashboard page load = ~5–8 calls; breaks under concurrent admins
- **Fix:** Raise to `{ ttl: 60000, limit: 500 }` or configure per-route overrides

### TD-008: Missing DB indexes on FK fields
- **Tables:** `NewsPost` (categoryId, sourceBrandId), `AppointmentRequest` (hospitalId, medicalCenterId, doctorId), `NavigationItem` (parentId), `MediaFolder` (parentId), `AuditLog` (action, entityType)
- **Issue:** Full table scans on list queries as data grows
- **Fix:** Add `@@index` in schema + `prisma migrate dev`

---

## 🟢 Low — Backlog only

### TD-009: DTOs missing `@Transform` string trim
- **Issue:** Leading/trailing whitespace stored in DB
- **Fix:** Add `@Transform(({ value }) => value?.trim?.() ?? value)` to string fields in DTOs

### TD-010: `NewsCategory` missing `createdAt` / `updatedAt`
- **Issue:** Can't sort categories by creation date in admin
- **Fix:** Add fields + migration

### TD-011: `DoctorHospital` / `DoctorMedicalCenter` junction tables missing `createdAt`
- **Issue:** Inconsistency with `HospitalMedicalCenter` which has `createdAt`
- **Fix:** Schema migration + seed update

### TD-012: `omitPassword` doesn't future-proof sensitive fields
- **File:** `apps/api/src/modules/users/users.service.ts`
- **Issue:** Only strips `passwordHash`; any new sensitive field on User leaks by default
- **Fix:** Use explicit `select` instead of omit pattern

---

## ✅ Fixed

| ID | Description | Fixed in |
|---|---|---|
| — | Prisma P2025/P2002/P2003 returned 500 | GlobalExceptionFilter — 2026-07-25 |
| — | `audit.service.findOne` returned null with 200 | AuditService — 2026-07-25 |
| — | Race condition in Section + Navigation ordering | Wrapped in `$transaction` — 2026-07-25 |
