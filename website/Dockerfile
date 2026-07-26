FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# ---------- Pruned installer ----------
FROM base AS installer
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/api/package.json ./apps/api/package.json
COPY apps/web/package.json ./apps/web/package.json
RUN pnpm install --frozen-lockfile

# ---------- API build ----------
FROM base AS api-builder
COPY --from=installer /app/node_modules ./node_modules
COPY --from=installer /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=installer /app/apps/web/node_modules ./apps/web/node_modules
COPY apps/api ./apps/api
COPY apps/web ./apps/web
WORKDIR /app/apps/api
RUN npx prisma generate
RUN pnpm build

# ---------- Web build ----------
FROM base AS web-builder
COPY --from=installer /app/node_modules ./node_modules
COPY --from=installer /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=installer /app/apps/web/node_modules ./apps/web/node_modules
COPY apps/web ./apps/web
COPY apps/api/prisma ./apps/api/prisma
WORKDIR /app/apps/web
RUN pnpm build

# ---------- API production ----------
FROM node:20-alpine AS api-production
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app
ENV NODE_ENV=production
RUN corepack enable && corepack prepare pnpm@latest --activate

COPY --from=installer /app/node_modules ./node_modules
COPY --from=api-builder /app/apps/api/dist ./dist
COPY --from=api-builder /app/apps/api/node_modules/.prisma ./node_modules/.prisma
COPY --from=api-builder /app/apps/api/node_modules/@prisma ./node_modules/@prisma
COPY --from=api-builder /app/apps/api/package.json ./
COPY --from=api-builder /app/apps/api/prisma ./prisma
COPY scripts/start.sh ./
RUN chmod +x start.sh

EXPOSE 4000
CMD ["sh", "start.sh"]

# ---------- Web production ----------
FROM node:20-alpine AS web-production
RUN apk add --no-cache libc6-compat
WORKDIR /app
ENV NODE_ENV=production
RUN corepack enable && corepack prepare pnpm@latest --activate

COPY --from=web-builder /app/apps/web/.next/standalone ./
COPY --from=web-builder /app/apps/web/.next/static ./.next/static
COPY --from=web-builder /app/apps/web/public ./public

EXPOSE 5000
CMD ["node", "server.js"]
