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

echo 'Rebuilding and restarting Docker containers...'
docker compose --env-file .env.production -f "$ComposeFile" down
docker compose --env-file .env.production -f "$ComposeFile" up -d --build

echo 'Container status:'
docker compose -f "$ComposeFile" ps

echo 'Cleaning up dangling images to save space...'
docker image prune -f

echo '--- Deployment Completed Successfully! ---'
"@

# Execute SSH command
ssh ${Username}@${ServerIP} $RemoteCommands

Write-Host ""
Write-Host "Deployment process finished." -ForegroundColor Green
Write-Host "Please verify the website is running correctly." -ForegroundColor Green
