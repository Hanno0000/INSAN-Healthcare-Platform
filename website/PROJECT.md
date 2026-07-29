# Project: Hospital Page Redesign

## Architecture
- `apps/api`: NestJS backend, Prisma ORM (schema.prisma).
- `apps/admin`: Admin panel inside `apps/web/app/admin`. Next.js App Router.
- `apps/web`: Public website. Hospital page is at `apps/web/app/hospitals/[slug]/page.tsx`.

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | Backend API & DB | Update Prisma schema, Hospital module in NestJS to support departments and map locations. | none | PLANNED |
| 2 | Admin Panel | Update `/admin/hospitals` UI to manage departments and map locations. | M1 | PLANNED |
| 3 | Public Website | Redesign `/hospitals/:slug` to include 7 new sections (Hero, Clinics Schedule, Departments Grid, Medical Centers, Section 5, News, Contact Us Maps). | M1 | PLANNED |

## Interface Contracts
### API ↔ Admin & Web
- Prisma schema to include `HospitalDepartment` and map coordinates/links for `Contact Us`.
- Hospital API responses must include related departments, news, clinics, and medical centers to fulfill frontend requirements.
