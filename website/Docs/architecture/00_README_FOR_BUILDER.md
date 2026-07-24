# 00 — Master Build Instructions (دليل البناء الرئيسي)

> **Document Version:** 1.1
> **Status:** Final
> **Last Updated:** 2025-07-16
> **Source of Truth:** Yes

**ATTENTION REPLIT AI AGENT: Read this file first, in full, before opening any code file or executing any command.**

This folder contains the **complete implementation specification** for the INSAN Digital Platform (Public Website + Admin Panel) — built from scratch, ready for direct implementation without any architectural assumptions.

---

## 0. Master Document Map (Quick Reference)

| # | File | Purpose | Read When |
|---|---|---|---|
| 00 | **This file** | Decisions, scope, file index, build order | Always first |
| 01 | `01_ARCHITECTURE.md` | Tech stack, i18n, SEO, Social Sync, AI Chat, Security | Before any code |
| 02 | `02_INFORMATION_ARCHITECTURE_AND_PAGES.md` | Complete sitemap + every page specification | Building frontend |
| 03 | `../database/03_DATABASE_SCHEMA.md` | Full Prisma schema + ER diagram | Building backend |
| 04 | `../api/04_API_SPECIFICATION.md` | Every endpoint with request/response/errors | Building API |
| 05 | `../security/05_USER_ROLES_AND_PERMISSIONS.md` | 5 roles + full permission matrix | Building auth |
| 06 | `../admin/06_ADMIN_DASHBOARD_SPECIFICATION.md` | Every admin screen, screen-by-screen | Building admin |
| 07 | `../ui/07_UI_COMPONENT_INVENTORY.md` | All reusable components (public + admin) | Building components |
| 08 | `../ui/08_DESIGN_SYSTEM.md` | Colors, typography, spacing, motion | Building UI |
| 09 | `09_WORKFLOWS.md` | Every operational workflow, step-by-step | Understanding flows |
| 10 | `10_FOLDER_STRUCTURE.md` | Monorepo structure + env vars | Project setup |
| 11 | `../state/11_STATE_MANAGEMENT.md` | Data fetching + client state + auth state | Building frontend |
| 12 | `../deployment/12_DEPLOYMENT.md` | Docker, compose, backup, CI/CD, logging | Deployment |
| 13 | `../future/13_FUTURE_EXPANSION.md` | How every module extends (read-only, don't build now) | Reference |
| 14 | `../ui/14_UI_SCREEN_SPECIFICATION.md` | Screen hierarchy + responsive rules for every screen | Building UI |
| 15 | `../ui/15_COMPONENT_SPECIFICATION.md` | Props, states, events for every reusable component | Building components |
| 16 | `../database/16_SEED_DATA_SPECIFICATION.md` | Complete initial data for first deployment | Database setup |
| 99 | `99_REPLIT_BUILD_GUIDE.md` | Final phased execution plan for Replit Agent | Last file read |

> **Strict Rule:** If you encounter ambiguity during implementation, return to these files first before making any assumption. If ambiguity persists after review, document your assumption clearly in code (`// ASSUMPTION: ...`) rather than halting.

---

## 1. Confirmed Scope Decisions

| # | Decision | Details | Reference |
|---|---|---|---|
| 1 | **No billing/subscriptions now** | No Billing/Subscription module in this version. However, Database + Folder Structure must leave room for adding it as a separate module later without modifying core tables. | `01_ARCHITECTURE.md` §10 |
| 2 | **Main Navigation** | `Home` · `About` · `Our Hospitals` · `Our Medical Centers` · `News & Media` · `Contact Us`. **Investor page is completely hidden** (no link in any navigation, direct URL only). | `02_INFORMATION_ARCHITECTURE_AND_PAGES.md` §13 |
| 3 | **Backend** | Standalone NestJS API separate from Frontend from day one. Final decision after reviewing full future scope (Patient Portal, AI, internal dashboards, mobile app). | `01_ARCHITECTURE.md` §1 |
| 4 | **AI Chat Assistant** | Persistent chat widget on every page. **This phase builds infrastructure and admin controls only** — content/personality/responses are added by the project owner from the admin panel. | `01_ARCHITECTURE.md` §7, `09_WORKFLOWS.md` §11 |
| 5 | **Extensibility First** | Every entity, every page, every component must be designed so the owner can add pages/fields/workflows (e.g., a clinic table, a booking method, any extension) without changing the core structure. | `01_ARCHITECTURE.md` §3, `../future/13_FUTURE_EXPANSION.md` |
| 6 | **Bilingual (AR/EN)** | Full site (public + content) in Arabic and English. Every text field in the database stored as JSON `{ar, en}` — allows adding a third language in the future without migration. | `01_ARCHITECTURE.md` §4 |
| 7 | **News from Social Media + Manual** | News page aggregates auto-synced content from social media pages (INSAN, Future, Delta) + manually entered content from admin. | `01_ARCHITECTURE.md` §6, `09_WORKFLOWS.md` §7 |
| 8 | **SEO + Google Analytics** | SEO optimized by design (Meta, Sitemap, Structured Data, Hreflang), with a ready integration point for Google Analytics/GTM from Settings. | `01_ARCHITECTURE.md` §5 |

---

## 2. Complete File Index

> Note: `INSAN_Website_Architecture_Plan.md` (from an earlier draft) was a preliminary summary only, fully expanded in these 17 documents. Treat this folder as the sole source of truth.

---

## 3. Build Order

The detailed build order (with clear completion criteria for each phase) is exclusively in **`99_REPLIT_BUILD_GUIDE.md`** — this is the only official reference for execution order, to avoid any conflict between two different versions of the same plan.

**Read the documents in this order (mandatory):**

| # | File | What You Learn |
|---|---|---|
| 1 | `00_README_FOR_BUILDER.md` | Final confirmed decisions (do not start without this) |
| 2 | `01_ARCHITECTURE.md` | Full tech stack + module architecture |
| 3 | `02_INFORMATION_ARCHITECTURE_AND_PAGES.md` | Every public page in full detail |
| 4 | `../database/03_DATABASE_SCHEMA.md` | Complete Prisma schema ready for copy-paste |
| 5 | `../api/04_API_SPECIFICATION.md` | Every endpoint in full detail |
| 6 | `../security/05_USER_ROLES_AND_PERMISSIONS.md` | 5 roles + full permission matrix |
| 7 | `../admin/06_ADMIN_DASHBOARD_SPECIFICATION.md` | Every admin screen in full detail |
| 8 | `../ui/07_UI_COMPONENT_INVENTORY.md` | Every reusable component |
| 9 | `../ui/08_DESIGN_SYSTEM.md` | Colors/typography/spacing/motion |
| 10 | `09_WORKFLOWS.md` | Every operational workflow step-by-step |
| 11 | `10_FOLDER_STRUCTURE.md` | Complete folder structure ready for creation |
| 12 | `../state/11_STATE_MANAGEMENT.md` | Data/state management strategy |
| 13 | `../deployment/12_DEPLOYMENT.md` | Docker/deployment/backup/CI-CD |
| 14 | `../future/13_FUTURE_EXPANSION.md` | Future extension guide (read only, do not build) |
| 15 | `../ui/14_UI_SCREEN_SPECIFICATION.md` | Screen-level responsive specifications |
| 16 | `../ui/15_COMPONENT_SPECIFICATION.md` | Component-level props/states/events |
| 17 | `../database/16_SEED_DATA_SPECIFICATION.md` | Complete initial deployment data |
| 18 | **This file (`00`)** | Already reading |
| 19 | **`99_REPLIT_BUILD_GUIDE.md`** | Final execution plan — read last |

---

## 4. Definition of Done for the Entire Project

- Every entity in `../database/03_DATABASE_SCHEMA.md` has full CRUD in `../api/04_API_SPECIFICATION.md`.
- Every page in `02` is fully editable from admin (text, images, section ordering) without code.
- Every admin action (create/update/delete/publish) is logged in `audit_logs`.
- Permissions are enforced in the API middleware, not just in the UI.
- The site works RTL Arabic fully + English as a second language.
- No hardcoded text or link exists in code that assumes content — everything comes from Database/Settings.
- Every form uses React Hook Form + Zod for validation (client + server).
- Every component has full accessibility (ARIA, keyboard navigation, focus states).
- Docker containers build and run from scratch on any Docker-compatible environment.
- All secrets are in environment variables / Secrets Manager — nothing in code.

---

## 5. Naming Conventions (Applied Across All Documents)

| Element | Convention | Example |
|---|---|---|
| Page files (Next.js) | `page.tsx` inside a folder named after the route | `hospitals/[slug]/page.tsx` |
| Components | PascalCase | `HospitalCard.tsx` |
| Functions/Variables | camelCase | `getPublishedHospitals()` |
| Database models (Prisma) | PascalCase singular | `Hospital`, `NewsPost` |
| API paths | kebab-case plural | `/medical-centers`, `/news-categories` |
| Environment variables | UPPER_SNAKE_CASE | `DATABASE_URL` |
| Permission keys | `module:action` format | `hospitals:publish`, `news:manage` |
| Enum values | SCREAMING_SNAKE_CASE | `SUPER_ADMIN`, `SOCIAL_SYNC` |
