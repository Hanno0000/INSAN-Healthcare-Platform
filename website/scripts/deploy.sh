#!/bin/sh
set -e

echo "=== INSAN Deployment ==="
echo "This script should be run on the production server."
echo ""

# Check Docker
if ! command -v docker >/dev/null 2>&1; then
  echo "ERROR: Docker is not installed"
  exit 1
fi

if ! command -v docker-compose >/dev/null 2>&1 && ! docker compose version >/dev/null 2>&1; then
  echo "ERROR: Docker Compose is not available"
  exit 1
fi

# Check env file
if [ ! -f .env.production ]; then
  echo "ERROR: .env.production file not found"
  echo "Copy .env.production.example to .env.production and fill in production values."
  exit 1
fi

# Check SSL certificates
if [ ! -f infra/ssl/fullchain.pem ] || [ ! -f infra/ssl/privkey.pem ]; then
  echo "WARNING: SSL certificates not found in infra/ssl/"
  echo "HTTPS will not work until certificates are placed:"
  echo "  - infra/ssl/fullchain.pem"
  echo "  - infra/ssl/privkey.pem"
fi

echo "Building and starting services..."
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d

echo ""
echo "Waiting for services to be healthy..."
sleep 10

# Health check
API_HEALTH=$(docker inspect --format='{{.State.Health.Status}}' insan-api 2>/dev/null || echo "unknown")
WEB_HEALTH=$(docker inspect --format='{{.State.Health.Status}}' insan-web 2>/dev/null || echo "unknown")
DB_HEALTH=$(docker inspect --format='{{.State.Health.Status}}' insan-db 2>/dev/null || echo "unknown")

echo "Service Status:"
echo "  API: $API_HEALTH"
echo "  Web: $WEB_HEALTH"
echo "  DB:  $DB_HEALTH"

if [ "$API_HEALTH" = "healthy" ] && [ "$WEB_HEALTH" = "healthy" ] && [ "$DB_HEALTH" = "healthy" ]; then
  echo ""
  echo "Deployment complete. All services healthy."
else
  echo ""
  echo "WARNING: Some services are not yet healthy. Check logs:"
  echo "  docker compose -f docker-compose.prod.yml logs api"
  echo "  docker compose -f docker-compose.prod.yml logs web"
fi