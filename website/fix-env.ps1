$script = @"
cd ~/INSAN-Healthcare-Platform/website
sed -i '/ENCRYPTION_KEY/d' .env.production
echo 'ENCRYPTION_KEY=b4a72d3e9c8f1a5b6d4e2c8a7f9b1d3e' >> .env.production
docker compose --env-file .env.production -f docker-compose.prod.yml up -d
"@
ssh root@vmi3466639.contaboserver.net $script
