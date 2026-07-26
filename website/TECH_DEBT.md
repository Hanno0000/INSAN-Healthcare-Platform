# Technical Debt Register

> Last updated: 2026-07-26
> Policy: Fix only when a debt directly blocks the feature under development.

---

## 🟠 High — Fix when first encountered as a blocker

### TD-003: Leads service — FK validation missing
- **File:** `apps/api/src/modules/leads/leads.service.ts`
- **Issue:** `hospitalId` / `medicalCenterId` / `doctorId` not validated before insert; Prisma P2003 → 500
- **Risk:** Public form submission returns 500 instead of 400 on invalid IDs
- **Fix:** Now handled by Prisma error filter (returns 400); full fix is explicit pre-check

---

## 🟡 Medium — Address in a dedicated hardening sprint

### TD-007: Rate limit too low for Dashboard use
- **File:** `apps/api/src/app.module.ts`
- **Issue:** `{ ttl: 60000, limit: 100 }` — a single dashboard page load = ~5–8 calls; breaks under concurrent admins
- **Fix:** Raise to `{ ttl: 60000, limit: 500 }` or configure per-route overrides

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
| TD-001 | Settings endpoint missing DTO validation | Sprint A — `UpdateSettingDto` with `@IsDefined` |
| TD-002 | Auth login — 3 non-atomic DB writes | Sprint A — wrapped in `prisma.$transaction` |
| TD-004 | Query DTOs without validation (Leads, Medical Centers) | Sprint A — `PaginationQueryDto` with class-validator |
| TD-005 | Helmet not installed (no HTTP security headers) | Sprint A — `pnpm add helmet`, configured in `main.ts` |
| TD-006 | CORS origin hardcoded to localhost | Sprint A — `CORS_ORIGIN` env var, production fail-fast |
| TD-008 | Missing DB indexes on FK fields | Sprint A — `@@index` added to schema (pending `migrate dev`) |
| — | Prisma P2025/P2002/P2003 returned 500 | GlobalExceptionFilter — 2026-07-25 |
| — | `audit.service.findOne` returned null with 200 | AuditService — 2026-07-25 |
| — | Race condition in Section + Navigation ordering | Wrapped in `$transaction` — 2026-07-25 |
