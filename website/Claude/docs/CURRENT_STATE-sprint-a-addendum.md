# CURRENT_STATE.md — addendum (append under "Phase 2: Production Readiness")

Insert this as a new subsection after the existing Phase 2 summary, before
the priority table, without altering anything else in the file:

```
### Sprint A: Application Hardening -- CODE CHANGES COMPLETE, PENDING BUILD VERIFICATION

A focused hardening pass addressed every Sprint A backlog item that could be
resolved within the codebase alone:

- Rate limiting: `ThrottlerGuard` was configured but never actually enforced
  (no `APP_GUARD` binding existed) -- this is now fixed, closing what the
  Production Readiness Audit flagged as "pending verification."
- Helmet (HTTP security headers) added.
- Health check now verifies real database connectivity instead of returning
  a static 200.
- The global exception filter previously forwarded raw internal error
  messages to clients for any unrecognized error type -- confirmed as a real
  leak (not just theoretical) and fixed; a `requestId` is now attached to
  500 responses for server-side correlation instead.
- Settings endpoint and Leads/Medical Centers list endpoints now have typed,
  validated DTOs (TD-001, TD-004).
- Auth login's three writes (lastLogin, audit log, refresh token) now run in
  a single transaction (TD-002).
- CORS now fails fast in production if `CORS_ORIGIN` is unset, rather than
  silently defaulting to localhost (code-level part of TD-006).

**Not resolved in this pass -- require external infrastructure or a live
repository/database connection, carried forward to Sprint B:**
- Regenerating production JWT/database secrets.
- Setting the real production `CORS_ORIGIN` / `NEXT_PUBLIC_SITE_URL` values.
- Generating and applying the Prisma migration for the TD-008 FK indexes
  (lines drafted, needs a live DB to run `prisma migrate dev`).
- Dependency vulnerability audit (`npm audit`/Snyk/Dependabot) -- needs
  either live repo access or Dependabot enabled at the GitHub repo level.

**Verification status:** all code changes were written against the actual
source content but have not yet been compiled, type-checked, or run.
Run `pnpm install && pnpm type-check && pnpm build` (and a manual smoke
test of login, settings update, and appointment/contact submission) before
treating Sprint A as fully closed.
```
