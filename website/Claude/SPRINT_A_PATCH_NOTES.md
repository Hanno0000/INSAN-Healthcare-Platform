# Sprint A — Application Hardening: Patch Notes

**Important — read this first:** These files were produced by searching the project's
indexed source content and writing corrected versions of each affected file. I do
**not** have a live checkout of the actual repository, a database connection, or
`git`/GitHub write credentials in this environment, so:

- None of this has been compiled, type-checked, or run against the real project.
- Nothing has been committed or pushed to `main`. There is no commit hash.
- Applying these files, running `pnpm install && pnpm type-check && pnpm build`,
  and committing/pushing is a step that still needs to happen — either by
  someone with direct repo access, or by **Claude Code**, which has real
  filesystem and git access to your actual project and can apply, build,
  verify, commit, and push these changes directly.

Copy the files under `apps/api/` in this bundle into the same paths in the
real repository (they replace the existing files 1:1, same relative paths),
then run the verification steps in "How to apply" below.

---

## Files changed (7 modified, 3 new)

| File | Type | Fixes |
|---|---|---|
| `apps/api/src/main.ts` | Modified | Adds Helmet (TD-005); CORS now fails fast in production instead of silently falling back to localhost (TD-006, code-level part) |
| `apps/api/src/app.module.ts` | Modified | Binds `ThrottlerGuard` globally via `APP_GUARD` — previously configured but **not enforced** (this was the "pending verification" item from the audit — confirmed as a real gap); raises default limit 100→300/60s (TD-007) |
| `apps/api/src/common/filters/global-exception.filter.ts` | Modified | Unhandled errors no longer return the raw internal error message to the client (this was a real, confirmed leak); adds a `requestId` for server-side correlation, matching the API spec's requirement |
| `apps/api/src/health.controller.ts` | Modified | Now actually checks DB connectivity (`SELECT 1`) and returns 503 if unreachable, instead of an unconditional static 200 |
| `apps/api/src/modules/settings/dto/update-setting.dto.ts` | **New** | Closes TD-001 — Settings update endpoint had no validation at all |
| `apps/api/src/modules/settings/settings.controller.ts` | Modified | Uses the new DTO |
| `apps/api/src/common/dto/pagination-query.dto.ts` | **New** | Closes TD-004 — typed, validated list-query params |
| `apps/api/src/modules/leads/leads.controller.ts` | Modified | Uses the new pagination DTO on both admin list endpoints |
| `apps/api/src/modules/medical-centers/medical-centers.controller.ts` | Modified | Uses the new pagination DTO on both public and admin list endpoints |
| `apps/api/src/modules/auth/auth.service.ts` | Modified | Closes TD-002 — the three login writes (lastLogin update, audit log, refresh token storage) are now a single `$transaction` |
| `apps/api/package.json` | Modified | Adds `helmet` dependency |
| `apps/api/prisma/TD-008-index-additions.md` | **New** (docs, not code) | Exact `@@index` lines to add for TD-008 — see below for why this one is documented rather than applied |

---

## Sprint A backlog — status

| Task (from `GO_LIVE_ROADMAP.md`) | Status | Notes |
|---|---|---|
| Validate "Pending Verification" audit items | ✅ **Done** | All three checked against real source: rate limiting was *not* enforced (guard now bound), health check *was* static (now checks DB), error handler *did* leak raw messages (now fixed) |
| Verify/fix rate limiting enforcement | ✅ **Done (code)** | `APP_GUARD` → `ThrottlerGuard` bound in `app.module.ts`. Needs a real build/run to confirm behavior end-to-end |
| Install & configure Helmet | ✅ **Done (code)** | Added to `main.ts` + `package.json`. Needs `pnpm install` to actually pull the dependency |
| DTO validation — Settings, Leads/Medical Centers (TD-001, TD-004) | ✅ **Done** | New DTOs in place |
| Wrap auth login writes in a transaction (TD-002) | ✅ **Done** | |
| Set `CORS_ORIGIN` from env; remove hardcoded fallback (TD-006) | 🟡 **Partially done** | Code now refuses to start in production without `CORS_ORIGIN` set, instead of silently defaulting to localhost. **Actually setting the real production value is an infrastructure/deployment action** (Sprint B), not something fixable in the codebase alone |
| Regenerate JWT/DB secrets | ❌ **Not done — infrastructure** | Current secrets are dev-only values in the Replit environment. Regenerating and storing production secrets requires access to the real deployment environment/secrets manager, which I don't have. **Remains for Sprint B.** |
| Dependency vulnerability audit (`npm audit`/Snyk/Dependabot) | ❌ **Not done — requires live repo** | Running `pnpm audit` needs the actual lockfile + `node_modules` in a real environment; I only have search-indexed fragments of `pnpm-lock.yaml`, not something safe to audit against. **Recommend**: enable GitHub Dependabot alerts on the repo (a one-time repo settings toggle, no code change needed) and/or run `pnpm audit` via Claude Code or CI once repo access is available. **Remains open.** |
| Confirm 500s never leak stack traces/internals | ✅ **Done** | This was a real, confirmed gap (not just "unverified") — fixed in the exception filter |
| Resolve remaining tech debt TD-005–TD-012 | 🟡 **Partially done** | TD-005 ✅, TD-006 ✅ (code part), TD-007 ✅, TD-008 🟡 (schema lines documented, migration needs a live DB — see below), TD-009/TD-010/TD-011/TD-012 (all Low priority) intentionally **not** touched this pass, to keep the change focused per Sprint A's "highest to lowest priority" instruction and the "keep changes minimal" rule. These don't block Sprint A's exit criteria. |

### Sprint A exit criteria — assessment

- **"No unresolved Critical application-level issues"** — met, based on what this patch set addresses. The one caveat: this hasn't been compiled/run, so "resolved" here means "fixed in code, pending build verification."
- **"All Pending Verification audit items confirmed resolved or documented as accepted"** — met (see table above).
- **"Security headers active, rate limiting enforced, CORS configured for production"** — security headers and rate limiting are wired in code; CORS has a code-level safety net, but the actual production `CORS_ORIGIN` value, like the other secrets, is an environment-configuration action that belongs to Sprint B (Production Infrastructure), not something a code patch can complete on its own.

---

## What genuinely requires external infrastructure (per your instructions, not attempted)

- Regenerating and storing production JWT/DB secrets in a real secrets manager.
- Setting the actual production `CORS_ORIGIN` / `NEXT_PUBLIC_SITE_URL` values.
- Running `prisma migrate dev` for the TD-008 indexes against a real database.
- Running a dependency audit against the real lockfile/repo (Dependabot, Snyk, or `pnpm audit` in CI).
- Anything from Sprint B/C in `GO_LIVE_ROADMAP.md` (hosting, DNS, SSL, monitoring, backups, CI/CD, content, legal pages) — untouched, as instructed, since Sprint A is scoped to application-level hardening only.

## How to apply this patch set

1. Copy each file above into the real repository at the same relative path.
2. `pnpm install` (pulls in `helmet`).
3. `pnpm --filter @insan/api type-check` and `pnpm --filter @insan/api build` — **I could not run these myself**; please confirm they pass before merging, since these files were hand-written against search-indexed source, not compiled.
4. Add the `@@index` lines from `prisma/TD-008-index-additions.md` to `schema.prisma`, then run `prisma migrate dev --name add_fk_indexes` against a real dev database, and commit the generated migration.
5. Smoke-test: login, a Settings update, an appointment/contact form submission, and `GET /health` (with the DB up and, if possible, briefly down) to confirm the new behaviors.
6. Commit and push to `main`.

If you'd like this actually applied, built, verified, and pushed rather than handed off as files, **Claude Code** is the right tool — it has real filesystem and git access to your project and can carry out steps 1–6 directly in one session.
