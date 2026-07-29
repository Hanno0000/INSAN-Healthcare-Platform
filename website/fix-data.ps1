$commands = @"
cd ~/INSAN-Healthcare-Platform/website
echo "Seeding the database..."
docker exec insan-api npx tsc prisma/seed.ts --skipLibCheck --esModuleInterop
docker exec insan-api node prisma/seed.js
echo "Restarting the website frontend to clear cache..."
docker compose -f docker-compose.prod.yml restart web
echo "Done!"
"@
ssh root@vmi3466639.contaboserver.net $commands
