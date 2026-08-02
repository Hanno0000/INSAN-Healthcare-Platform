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

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host " INSAN Healthcare Platform - Deployment Script" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Connecting to Contabo Server ($ServerIP)..." -ForegroundColor Yellow
Write-Host "Please enter the password when prompted." -ForegroundColor Yellow
Write-Host ""

# Commands to run on the remote server
$RemoteCommands = @"
echo '--- Connected to server successfully ---'
echo 'Navigating to project directory...'
cd /app || cd /root/website

echo 'Pulling latest changes from GitHub...'
git checkout main
git pull origin main

echo 'Rebuilding and restarting Docker containers...'
docker compose down
docker compose up -d --build

echo 'Cleaning up dangling images to save space...'
docker image prune -f

echo '--- Deployment Completed Successfully! ---'
"@

# Execute SSH command
ssh ${Username}@${ServerIP} $RemoteCommands

Write-Host ""
Write-Host "Deployment process finished." -ForegroundColor Green
Write-Host "Please verify the website is running correctly." -ForegroundColor Green
