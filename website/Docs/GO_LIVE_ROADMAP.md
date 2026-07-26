# Phase 2 -- Go Live Preparation

> **Status:** Execution Roadmap
> **Created:** 2026-07-26
> **Baseline:** Production Readiness Audit (score: 38/100, recommendation: No-Go)
> **Parent Document:** `CURRENT_STATE.md` (v6.0)

---

## Overview

The Production Readiness Audit confirmed that the application layer (backend, frontend, RBAC, database, audit system) is substantially complete. However, the platform scored 38/100 on production readiness due to absent deployment infrastructure, security hardening, monitoring, backups, and compliance pages.

Phase 2 focuses on transitioning the completed application into a production-ready platform. This roadmap defines three sprints followed by a final deployment stage. No implementation changes are made to the application logic -- the work is hardening, infrastructure, compliance, and launch preparation.

---

## Sprint A -- Application Hardening

**Goal:** Resolve all application-level production findings from the audit.
**Status:** ✅ COMPLETED (2026-07-26)

### Tasks

- [x] Validate all audit findings marked "Pending Verification" (rate limiting enforcement, health check depth, error handler stack trace leakage)
- [x] Verify rate limiting -- confirm `ThrottlerGuard` is bound via `APP_GUARD` or per-route; fix if not
- [x] Install and configure Helmet for HTTP security headers (CSP, X-Frame-Options, HSTS, X-Content-Type-Options)
- [x] Improve DTO validation -- add proper class-validator rules to Settings endpoint and Leads/Medical Centers query params (TD-001, TD-004)
- [x] Wrap auth login writes in a database transaction (TD-002)
- [x] Set `CORS_ORIGIN` from environment variable; remove hardcoded localhost fallback (TD-006)
- [ ] Regenerate all JWT and database secrets (do not copy dev values)
- [ ] Run dependency vulnerability audit (`npm audit` / Snyk / Dependabot); address severe/critical findings
- [x] Confirm generic 500 errors never leak stack traces or internal paths in production responses
- [x] Resolve remaining application-level tech debt as needed (TD-005, TD-008 added to schema)

### Exit Criteria

- ~~No unresolved Critical application-level issues~~ ✅
- ~~All "Pending Verification" audit items confirmed resolved or documented as accepted~~ ✅
- ~~Security headers active, rate limiting enforced, CORS configured for production~~ ✅
- **Remaining (deferred):** Secret regeneration and dependency audit (must be done at deploy time or Sprint B)

---

## Sprint B -- Production Infrastructure

**Goal:** Prepare the production environment and operational foundation.
**Status:** ✅ COMPLETED (2026-07-26) — repository-side tasks done; manual provisioning remains.

### Tasks

- [ ] Provision managed production PostgreSQL instance (not Replit dev database)
- [ ] Provision VPS or cloud hosting for application deployment
- [ ] Register and configure production domain
- [ ] Set up DNS records pointing to production server
- [ ] Provision and configure SSL certificates (HTTPS enforcement)
- [x] Set up reverse proxy (nginx or equivalent) with TLS termination — `infra/nginx.conf`
- [x] Build Docker infrastructure -- Dockerfiles for API and Web, `docker-compose.prod.yml`
- [x] Configure production environment variables — `.env.production.example` + startup validation
- [ ] Set up uptime monitoring (e.g., UptimeRobot, BetterStack)
- [ ] Set up error tracking service (e.g., Sentry)
- [x] Implement structured application logging (JSON output, request IDs, request logging interceptor)
- [ ] Write and test database backup strategy
- [ ] Write and test database restore procedure
- [ ] Define RPO/RTO targets
- [x] Confirm seed/migration scripts cannot destructively run against a populated production database — seed refuses in production
- [x] Set up CI/CD pipeline (build, test, deploy automation) — GitHub Actions

### Exit Criteria

- ~~Production infrastructure fully operational~~ — Repository-side complete; manual provisioning remains
- Database backed up and restore tested — Not started (requires managed PG)
- ~~Monitoring and error tracking active~~ — Not started (requires external services)
- ~~Structured logging operational~~ ✅
- ~~Deployment pipeline functional~~ ✅

---

## Sprint C -- Launch Readiness

**Goal:** Prepare for public launch -- compliance, content, and final validation.

### Tasks

- [ ] Write and publish Privacy Policy page (required -- forms collect PII)
- [ ] Write and publish Terms of Use page
- [ ] Replace all seed/demo data with real production content (hospitals, medical centers, doctors, news)
- [ ] Run end-to-end smoke testing across all public pages and admin workflows
- [ ] Validate SEO -- sitemap, robots.txt, meta tags, structured data (JSON-LD)
- [ ] Run accessibility review (WCAG 2.1 AA) -- keyboard navigation, screen reader, contrast
- [ ] Make explicit business decision on i18n: bilingual (AR+EN) at launch or Arabic-only
- [ ] Decide if Media Library is required at launch; if yes, resource its build before this sprint
- [x] ~~Confirm `/health` endpoint verifies real dependency connectivity (database)~~ (Sprint A)
- [ ] Complete Final Go-Live Checklist (see below)

### Exit Criteria

- Legal pages published (Privacy Policy, Terms of Use)
- Real content populated across all public pages
- Smoke testing passed
- SEO and accessibility validated
- Platform ready for production deployment

---

## Final Stage -- Production Deployment

**Goal:** Deploy, verify, and go live.

### Steps

1. **Deploy** -- Run production build, deploy via Docker/compose, verify all services start
2. **Verify** -- Smoke test production URLs, confirm API responses, test login, submit test appointment/contact forms, verify audit logging
3. **Monitor** -- Watch error tracking, uptime monitoring, and logs for the first 24-48 hours
4. **Go Live** -- Switch DNS to production, confirm SSL, announce launch

### Exit Criteria

- Production site accessible at configured domain
- All public pages rendering correctly
- Admin dashboard functional with production data
- Monitoring and alerting active
- No critical errors in first 48 hours

---

## Appendix -- Audit Scorecard Summary

| Dimension | Audit Assessment | Target |
|-----------|-----------------|--------|
| Core feature completeness | Strong (~75%) | Maintain |
| Security hardening | Weak (~20%) | Sprint A |
| Deployment infrastructure | Absent (~5%) | Sprint B |
| Monitoring/Observability | Absent (~5%) | Sprint B |
| Backup/Recovery | Absent (0%) | Sprint B |
| Compliance (Privacy/Terms) | Absent (0%) | Sprint C |
| Data validation/integrity | Partial (~65%) | Sprint A |
| Content readiness | Absent (seed data only) | Sprint C |

---

*This roadmap is execution-oriented and does not include implementation details. For full audit findings, see the Production Readiness Audit section in `CURRENT_STATE.md` (v6.0). For itemized status, see `Docs/deployment/PRODUCTION_DEPLOYMENT_CHECKLIST.md`. For technical debt items, see `TECH_DEBT.md`.*
