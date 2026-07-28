# deploy.ps1
# Automated Deployment Script for INSAN Healthcare Platform

$ErrorActionPreference = "Stop"

$ServerUser = "root"
$ServerHost = "vmi3466639.contaboserver.net" # ضع عنوان الـ IP الخاص بالسيرفر هنا إذا لم يعمل الدومين
$RemoteDir = "~/INSAN-Healthcare-Platform/website"

$Version = Get-Date -Format "yyyyMMdd-HHmmss"
$ArchiveName = "website-update-$Version.tar.gz"

Write-Host "Compressing files (excluding unnecessary files and configs)..." -ForegroundColor Cyan
tar -czvf $ArchiveName `
    --exclude="node_modules" `
    --exclude="dist" `
    --exclude=".next" `
    --exclude=".git" `
    --exclude=".env.production" `
    --exclude="docker-compose.prod.yml" `
    --exclude="*.tar.gz" `
    --exclude="*.zip" `
    -C . .

Write-Host "`nUploading update to server ($ServerHost)..." -ForegroundColor Cyan
Write-Host "You may be prompted for the server password." -ForegroundColor Yellow
scp $ArchiveName "${ServerUser}@${ServerHost}:${RemoteDir}/${ArchiveName}"

Write-Host "`nInstalling update and restarting Docker on server..." -ForegroundColor Cyan

# Write remote commands to a temp file with LF-only endings (Linux requires LF, not CRLF)
$TempScript = [System.IO.Path]::GetTempFileName() + ".sh"
$ScriptContent = @'
set -e
cd ~/INSAN-Healthcare-Platform/website
tar -xzvf __ARCHIVE__
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build
echo "Waiting 20s for API container to start..."
sleep 20
API_CONTAINER=$(docker ps --filter 'name=api' --format '{{.Names}}' | head -1)
if [ -n "$API_CONTAINER" ]; then
  echo "Running seed on container: $API_CONTAINER"
  docker exec $API_CONTAINER npx ts-node prisma/seed.ts 2>&1 || echo "Seed skipped (data may already exist)"
else
  echo "Warning: API container not found - seed skipped"
fi
rm -f __ARCHIVE__
echo "Done!"
'@
# Replace placeholder and convert CRLF -> LF
$ScriptContent = $ScriptContent -replace '__ARCHIVE__', $ArchiveName
$ScriptContent = $ScriptContent -replace "`r`n", "`n"
[System.IO.File]::WriteAllText($TempScript, $ScriptContent, [System.Text.Encoding]::UTF8)

Get-Content $TempScript -Raw | ssh "${ServerUser}@${ServerHost}" "bash -s"

Remove-Item $TempScript -ErrorAction SilentlyContinue

Write-Host "`nCleaning up local temporary files..." -ForegroundColor Cyan
Remove-Item $ArchiveName

Write-Host "`nUpdate successfully deployed!" -ForegroundColor Green
