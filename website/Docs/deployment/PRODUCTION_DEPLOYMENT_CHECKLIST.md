# Production Deployment Checklist

> **Created:** 2026-07-26 (Sprint B)
> **Parent:** `GO_LIVE_ROADMAP.md`, `CURRENT_STATE.md`

---

## Legend

- **Status:** Not Started / In Progress / Done / Blocked
- **Owner:** Repository (code changes) / Infrastructure (manual provisioning) / Manual (human action required)
- **Blocking:** Whether this blocks production deployment

---

## 1. Application Hardening

| # | Item | Status | Owner | Blocking | Effort |
|---|------|--------|-------|----------|--------|
| 1.1 | Helmet HTTP security headers installed | Done | Repository | Yes | Sprint A |
| 1.2 | Rate limiting enforced via APP_GUARD | Done | Repository | Yes | Sprint A |
| 1.3 | CORS reads CORS_ORIGIN env var with prod fail-fast | Done | Repository | Yes | Sprint A |
| 1.4 | DTO validation on Settings, Leads, MedicalCenters | Done | Repository | No | Sprint A |
| 1.5 | Auth login writes in DB transaction | Done | Repository | No | Sprint A |
| 1.6 | Database indexes on FK fields | Done | Repository | No | Sprint A |
| 1.7 | Health endpoint checks DB connectivity + version | Done | Repository | No | Sprint B |
| 1.8 | Graceful shutdown (SIGTERM/SIGINT) | Done | Repository | No | Sprint B |
| 1.9 | Structured request logging with request IDs | Done | Repository | No | Sprint B |
| 1.10 | Environment variable validation on startup | Done | Repository | Yes | Sprint B |
| 1.11 | Seed refuses to run in production | Done | Repository | No | Sprint B |

## 2. Docker Infrastructure

| # | Item | Status | Owner | Blocking | Effort |
|---|------|--------|-------|----------|--------|
| 2.1 | Multi-stage Dockerfile (API + Web) | Done | Repository | Yes | Sprint B |
| 2.2 | .dockerignore | Done | Repository | No | Sprint B |
| 2.3 | docker-compose.prod.yml | Done | Repository | Yes | Sprint B |
| 2.4 | Production startup script (scripts/start.sh) | Done | Repository | No | Sprint B |
| 2.5 | Deploy script (scripts/deploy.sh) | Done | Repository | No | Sprint B |

## 3. Reverse Proxy & TLS

| # | Item | Status | Owner | Blocking | Effort |
|---|------|--------|-------|----------|--------|
| 3.1 | nginx.conf (reverse proxy, rate limiting, gzip) | Done | Repository | Yes | Sprint B |
| 3.2 | SSL certificates in infra/ssl/ | Not Started | Infrastructure | Yes | 30 min |
| 3.3 | Domain DNS records pointing to server | Not Started | Infrastructure | Yes | 30 min |

**3.2 Details:** Place `fullchain.pem` and `privkey.pem` in `infra/ssl/`. Obtain from Let's Encrypt: `certbot certonly --webroot -w /var/www/certbot -d insan-platform.com`

**3.3 Details:** Create A record pointing `insan-platform.com` → server IP. Update `CORS_ORIGIN` and `NEXT_PUBLIC_*` URLs.

## 4. Production Environment

| # | Item | Status | Owner | Blocking | Effort |
|---|------|--------|-------|----------|--------|
| 4.1 | .env.production.example created | Done | Repository | No | Sprint B |
| 4.2 | .env.production filled with real values | Not Started | Manual | Yes | 30 min |
| 4.3 | JWT secrets regenerated (not dev values) | Not Started | Manual | Yes | 10 min |
| 4.4 | CORS_ORIGIN set to production domain | Not Started | Manual | Yes | 5 min |
| 4.5 | NEXT_PUBLIC_API_BASE_URL set to production API | Not Started | Manual | Yes | 5 min |
| 4.6 | NEXT_PUBLIC_SITE_URL set to production domain | Not Started | Manual | Yes | 5 min |

**4.2-4.6 Details:** Copy `.env.production.example` → `.env.production` and fill in:
```bash
openssl rand -base64 32  # for JWT_ACCESS_SECRET
openssl rand -base64 32  # for JWT_REFRESH_SECRET
```

## 5. Database

| # | Item | Status | Owner | Blocking | Effort |
|---|------|--------|-------|----------|--------|
| 5.1 | Managed PostgreSQL provisioned | Not Started | Infrastructure | Yes | 1 hr |
| 5.2 | DATABASE_URL points to managed instance | Not Started | Manual | Yes | 5 min |
| 5.3 | POSTGRES_PASSWORD set in .env.production | Not Started | Manual | Yes | 5 min |
| 5.4 | Prisma migrations applied (`prisma migrate deploy`) | Not Started | Manual | Yes | 5 min |
| 5.5 | Seed data loaded (dev environments only) | N/A | Manual | No | 5 min |

**5.1 Details:** Options: Supabase (free tier), Neon (free tier), Railway ($5/mo), AWS RDS, DigitalOcean Managed DB.

## 6. CI/CD

| # | Item | Status | Owner | Blocking | Effort |
|---|------|--------|-------|----------|--------|
| 6.1 | GitHub Actions CI workflow (.github/workflows/ci.yml) | Done | Repository | No | Sprint B |
| 6.2 | CI runs on push to main and PRs | Done | Repository | No | Sprint B |
| 6.3 | Docker build verification in CI | Done | Repository | No | Sprint B |

## 7. Logging & Monitoring

| # | Item | Status | Owner | Blocking | Effort |
|---|------|--------|-------|----------|--------|
| 7.1 | Structured JSON request logging | Done | Repository | No | Sprint B |
| 7.2 | Request ID in all log entries and response headers | Done | Repository | No | Sprint B |
| 7.3 | Uptime monitoring (UptimeRobot / BetterStack) | Not Started | Infrastructure | No | 15 min |
| 7.4 | Error tracking (Sentry) | Not Started | Infrastructure | No | 30 min |

**7.3 Details:** Point uptime monitor at `https://insan-platform.com/health`. Should return 200 with `{ "status": "ok" }`.

**7.4 Details:** Install `@sentry/nestjs`, configure DSN in env var. Optional but recommended for production error tracking.

## 8. Backup & Recovery

| # | Item | Status | Owner | Blocking | Effort |
|---|------|--------|-------|----------|--------|
| 8.1 | Automated daily pg_dump cron job | Not Started | Infrastructure | Yes | 30 min |
| 8.2 | Backup stored off-site (S3/R2) | Not Started | Infrastructure | Yes | 1 hr |
| 8.3 | Restore procedure documented and tested | Not Started | Infrastructure | Yes | 2 hr |
| 8.4 | RPO/RTO targets: RPO 24h, RTO 4h (MVP) | Not Started | Infrastructure | No | 30 min |

**8.1 Example cron:**
```bash
0 2 * * * pg_dump -U insan insan | gzip > /backups/insan-$(date +\%Y\%m\%d).sql.gz
```

## 9. Compliance & Content

| # | Item | Status | Owner | Blocking | Effort |
|---|------|--------|-------|----------|--------|
| 9.1 | Privacy Policy page | Not Started | Manual | Yes | 2 hr |
| 9.2 | Terms of Use page | Not Started | Manual | Yes | 1 hr |
| 9.3 | Replace seed data with real content | Not Started | Manual | No | 8 hr |
| 9.4 | SSL/TLS certificate | Not Started | Infrastructure | Yes | 30 min |

## 10. Verification

| # | Item | Status | Owner | Blocking | Effort |
|---|------|--------|-------|----------|--------|
| 10.1 | TypeScript compiles (API + Web) | Done | Repository | Yes | Sprint B |
| 10.2 | Prisma schema valid | Done | Repository | Yes | Sprint A |
| 10.3 | Docker build succeeds | Done | Repository | Yes | Sprint B |
| 10.4 | Health endpoint returns 200 | Done | Repository | No | Sprint A |
| 10.5 | API starts and responds | Not Started | Infrastructure | Yes | 15 min |
| 10.6 | Login works end-to-end | Not Started | Infrastructure | Yes | 15 min |
| 10.7 | Admin CRUD works | Not Started | Infrastructure | Yes | 1 hr |
| 10.8 | Public pages render | Not Started | Infrastructure | Yes | 1 hr |

---

## Quick Start (Deploy to Production)

```bash
# 1. Set up infrastructure
#    - Provision managed PostgreSQL
#    - Provision VPS/Docker hosting
#    - Register domain, configure DNS

# 2. Clone and configure
git clone https://github.com/Hanno0000/INSAN-Healthcare-Platform.git
cd INSAN-Healthcare-Platform
cp .env.production.example .env.production
# Edit .env.production with real secrets

# 3. Place SSL certificates
mkdir -p infra/ssl
# Copy fullchain.pem and privkey.pem to infra/ssl/

# 4. Deploy
bash scripts/deploy.sh

# 5. Verify
curl -s https://insan-platform.com/health | jq .
```

---

*This checklist is maintained alongside `GO_LIVE_ROADMAP.md` and `CURRENT_STATE.md`. Last updated: 2026-07-26.*
