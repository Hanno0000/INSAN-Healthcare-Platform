#!/bin/sh
set -e

echo "=== INSAN Production Startup ==="
echo "Time: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo "Node: $(node --version)"

# Validate environment
if [ -z "$DATABASE_URL" ]; then
  echo "ERROR: DATABASE_URL is not set"
  exit 1
fi

if [ "$NODE_ENV" = "production" ]; then
  if [ -z "$CORS_ORIGIN" ]; then
    echo "ERROR: CORS_ORIGIN is not set in production"
    exit 1
  fi
fi

# Generate Prisma client
echo "Generating Prisma client..."
npx prisma generate

# Run migrations (safe for production)
echo "Running database migrations..."
npx prisma migrate deploy

# Start the API
echo "Starting INSAN API on port ${PORT:-4000}..."
exec node dist/main.js
