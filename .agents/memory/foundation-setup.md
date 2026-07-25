---
name: Foundation setup
description: Key decisions and environment facts for the INSAN platform monorepo
---

# Foundation Setup

## Package manager
Use **pnpm** (not npm). npm is blocked because a transitive dependency (`tar-6.2.1`) is flagged by the Replit Package Firewall. pnpm resolves this cleanly.

**Why:** `npm install` fails with 403 on that tar version. pnpm uses a different resolution chain.

**How to apply:** Always run `pnpm install`, never `npm install`. Root `pnpm-workspace.yaml` controls the workspace. `onlyBuiltDependencies` for Prisma/NestJS must be in the **root** `package.json`, not child packages.

## Password hashing
Using **bcryptjs** (not argon2). argon2 is a native module requiring compilation; bcryptjs is pure JS and works immediately in this environment.

**How to apply:** `bcrypt.hash(password, 12)` / `bcrypt.compare(plain, hash)` in auth service and seed.

## Ports
- Next.js (web): port **5000** (Replit webview)
- NestJS (api): port **4000** (console workflow)

## Database
Replit's built-in PostgreSQL. `DATABASE_URL` env var is pre-populated. Schema pushed with `prisma db push` for development (not `migrate dev`).

## cookie-parser import in NestJS
Must use `const cookieParser = require('cookie-parser')` — not `import * as cookieParser` — due to CommonJS/ESM interop with transpile-only mode.

## JWT decode in refresh endpoint
Use `Buffer.from(payloadB64, 'base64url').toString('utf8')` to extract `sub` from the refresh token without requiring `jsonwebtoken` as a dependency. Security: the AuthService then validates the token hash against the DB, so the unverified decode is safe.

## Health endpoint
Excluded from global prefix: `app.setGlobalPrefix('api/v1', { exclude: ['health'] })`.

## useSearchParams() in Next.js
Any component using `useSearchParams()` must be wrapped in `<Suspense>` at its call site or in its parent page, otherwise Next.js build fails during static prerender.

## Workflows
- `INSAN API (NestJS)`: `cd apps/api && pnpm run dev` → port 4000, console
- `Start application`: `cd apps/web && pnpm run dev` → port 5000, webview
