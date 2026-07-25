#!/bin/bash
set -e

echo "=== Post-merge setup ==="

echo "--- Installing dependencies ---"
pnpm install

echo "--- Generating Prisma client ---"
pnpm --filter @insan/api run db:generate

echo "--- Running database migrations ---"
pnpm --filter @insan/api run db:migrate

echo "--- Seeding database (idempotent) ---"
pnpm --filter @insan/api run db:seed

echo "=== Post-merge setup complete ==="
