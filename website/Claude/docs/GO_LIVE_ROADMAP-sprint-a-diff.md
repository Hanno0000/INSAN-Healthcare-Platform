# GO_LIVE_ROADMAP.md — Sprint A section update

Apply these edits to the "Sprint A -- Application Hardening" section.
Presented as exact before → after text rather than a full file rewrite,
since I only have this file via search fragments and want to avoid
silently altering anything outside the Sprint A section.

## Replace the task list

**Before:**
```
### Tasks

- [ ] Validate all audit findings marked "Pending Verification" (rate limiting enforcement, health check depth, error handler stack trace leakage)
- [ ] Verify rate limiting -- confirm `ThrottlerGuard` is bound via `APP_GUARD` or per-route; fix if not
- [ ] Install and configure Helmet for HTTP security headers (CSP, X-Frame-Options, HSTS, X-Content-Type-Options)
- [ ] Improve DTO validation -- add proper class-validator rules to Settings endpoint and Leads/Medical Centers query params (TD-001, TD-004)
- [ ] Wrap auth login writes in a database transaction (TD-002)
- [ ] Set `CORS_ORIGIN` from environment variable; remove hardcoded localhost fallback (TD-006)
- [ ] Regenerate all JWT and database secrets (do not copy dev values)
- [ ] Run dependency vulnerability audit (`npm audit` / Snyk / Dependabot); address severe/critical findings
- [ ] Confirm generic 500 errors never leak stack traces or internal paths in production responses
- [ ] Resolve remaining application-level tech debt as needed (TD-005 through TD-012)
```

**After:**
```
### Tasks

- [x] Validate all audit findings marked "Pending Verification" -- confirmed all three were real gaps, not false positives: rate limiting was configured but not enforced, health check was a static 200, error handler leaked raw internal messages. All three fixed (see below).
- [x] Verify rate limiting -- `ThrottlerGuard` was NOT bound anywhere; fixed by adding an `APP_GUARD` provider in `app.module.ts`. *(Implemented in code; needs a build/run verification pass before being marked fully closed.)*
- [x] Install and configure Helmet for HTTP security headers -- added to `main.ts`, dependency added to `package.json`. *(Needs `pnpm install` to pull the new dependency.)*
- [x] Improve DTO validation -- `UpdateSettingDto` (TD-001) and a shared `PaginationQueryDto` (TD-004) added and wired into Settings, Leads, and Medical Centers controllers.
- [x] Wrap auth login writes in a database transaction (TD-002) -- `AuthService.login()` now performs the lastLogin update, audit log entry, and refresh token storage as a single `$transaction`.
- [~] Set `CORS_ORIGIN` from environment variable; remove hardcoded localhost fallback (TD-006) -- **code-level fix done**: the API now refuses to start in production if `CORS_ORIGIN` is unset, instead of silently falling back to localhost. Setting the actual production value is an environment/deployment action -- moved to Sprint B.
- [ ] Regenerate all JWT and database secrets (do not copy dev values) -- **requires access to the live deployment environment/secrets manager; not code-fixable. Moved to Sprint B.**
- [ ] Run dependency vulnerability audit (`npm audit` / Snyk / Dependabot) -- **requires either a live checkout with lockfile+node_modules, or Dependabot enabled on the GitHub repo (repo-settings action, not a code change). Recommend enabling Dependabot alerts directly on the repo. Remains open.**
- [x] Confirm generic 500 errors never leak stack traces or internal paths in production responses -- **this was a real, confirmed leak** (the filter returned `exception.message` verbatim for any unrecognized error type); fixed to return a generic message + `requestId`, with full detail logged server-side only.
- [~] Resolve remaining application-level tech debt as needed (TD-005 through TD-012) -- TD-005, TD-007 done; TD-006 partial (see above); TD-008 index lines documented in `apps/api/prisma/TD-008-index-additions.md` but the actual migration needs a live database connection to generate and apply -- remains open, needs DB access. TD-009/010/011/012 (all Low priority) intentionally deferred to keep this pass focused; tracked in `TECH_DEBT.md` as before.
```

## Update Exit Criteria assessment (add a note under the existing criteria)

```
**Sprint A status (as of this pass):** Code-level hardening is complete for
every item that could be resolved without live infrastructure or database
access. Two items remain genuinely blocked on infrastructure (secret
regeneration, dependency audit against the real lockfile) and are carried
forward to Sprint B. The FK-index migration (TD-008) is drafted but needs a
live DB connection to generate/apply. All code changes are unverified by an
actual build/type-check in this pass -- run `pnpm install && pnpm type-check
&& pnpm build` before considering this sprint fully closed.
```
