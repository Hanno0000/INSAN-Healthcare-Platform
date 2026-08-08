<#
.SYNOPSIS
Deploys the INSAN Healthcare Platform updates to the Contabo server.

.DESCRIPTION
This script connects to the Contabo production server via SSH, pulls the latest 
changes from the GitHub repository, and rebuilds the Docker containers to apply the updates.

.NOTES
You will be prompted to enter the SSH password for the root user.
#>

$ServerIP = "169.58.77.61"
$Username = "root"
# Absolute path of the checkout on the production server. If this is ever wrong,
# the script must abort — never fall through and run docker compose elsewhere.
$ProjectDir = "/root/INSAN-Healthcare-Platform"
# docker-compose.prod.yml, the Dockerfile, and infra/ all live in website/, not
# the repo root — the Dockerfile's COPY paths (apps/, package.json) and the
# compose file's `context: .` / `env_file: .env.production` are only correct
# when the working directory is website/. Compose also only auto-discovers
# files literally named docker-compose.yml/compose.yaml, never *.prod.yml, so
# every invocation below passes -f explicitly.
$ComposeDir = "$ProjectDir/website"
$ComposeFile = "docker-compose.prod.yml"

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host " INSAN Healthcare Platform - Deployment Script" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Connecting to Contabo Server ($ServerIP)..." -ForegroundColor Yellow
Write-Host "Please enter the password when prompted." -ForegroundColor Yellow
Write-Host ""

# Commands to run on the remote server
$RemoteCommands = @"
set -e
echo '--- Connected to server successfully ---'
echo 'Navigating to project directory: $ProjectDir'
cd "$ProjectDir"

echo 'Pulling latest changes from GitHub...'
git checkout main
git pull origin main
echo 'Now on commit:'
git rev-parse --short HEAD

echo 'Switching to compose directory: $ComposeDir'
cd "$ComposeDir"
if [ ! -f "$ComposeFile" ]; then
  echo "ABORT: $ComposeFile not found in `$(pwd)` — refusing to guess."
  exit 1
fi
if [ ! -f .env.production ]; then
  echo "ABORT: .env.production not found in `$(pwd)` — containers would start without config. Refusing to continue."
  exit 1
fi

# No `down` first. `down` stopped every container — including nginx — and the
# site then stayed unreachable for the whole rebuild, which is minutes, not
# seconds. That was tolerable while this was an IP nobody had yet; it is not
# now that insan-eg.com is live and taking real traffic.
#
# `up -d --build` builds the new images first and only then recreates the
# containers whose image actually changed, so downtime is the restart itself.
# nginx is untouched unless its own config changed, so requests keep being
# served right up to the swap.
echo 'Building new images and swapping containers...'
docker compose --env-file .env.production -f "$ComposeFile" up -d --build

echo 'Container status:'
docker compose -f "$ComposeFile" ps

echo 'Cleaning up dangling images to save space...'
docker image prune -f

# Build cache is the real disk hog on this host, not images or volumes —
# confirmed 2026-08-08: `docker system df` showed 75GB of build cache eating
# 80% of the disk while images (2.6GB) and volumes (52MB, i.e. the actual
# database and uploads) were fine. `docker image prune` above does not touch
# this. Keep a week of cache for faster incremental builds; drop the rest.
echo 'Cleaning up build cache older than 7 days...'
docker builder prune -af --filter until=168h

echo 'Disk usage after cleanup:'
df -h / | tail -n 1

echo '--- Deployment Completed Successfully! ---'
"@

# Execute SSH command
ssh ${Username}@${ServerIP} $RemoteCommands

Write-Host ""
Write-Host "Deployment process finished." -ForegroundColor Green
Write-Host "Please verify the website is running correctly." -ForegroundColor Green
