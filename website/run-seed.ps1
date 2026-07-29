#!/usr/bin/env pwsh
# run-seed.ps1 — يرسل أوامر تشغيل الـ migration والـ seed على السيرفر

param(
    [string]$Server = "vmi3466639.contaboserver.net",
    [string]$User = "root"
)

Write-Host "🔄 Running database migration and seed on server..." -ForegroundColor Cyan

$commands = @'
echo '--- Running migration for appointment status ---'
docker exec website-api-1 npx prisma migrate deploy 2>/dev/null || \
docker exec website_api_1 npx prisma migrate deploy 2>/dev/null || \
docker exec $(docker ps --filter 'name=api' -q | head -1) npx prisma migrate deploy

echo ''
echo '--- Running seed to populate settings data ---'
docker exec website-api-1 npx -y tsx prisma/seed.ts 2>/dev/null || \
docker exec website_api_1 npx -y tsx prisma/seed.ts 2>/dev/null || \
docker exec $(docker ps --filter 'name=api' -q | head -1) npx -y tsx prisma/seed.ts

echo '✅ Done!'
'@

$remoteScript = $commands.Replace("`r", "")
ssh "${User}@${Server}" "$remoteScript"

Write-Host "✅ Migration and seed complete!" -ForegroundColor Green
