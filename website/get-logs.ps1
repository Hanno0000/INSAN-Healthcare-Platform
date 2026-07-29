ssh root@vmi3466639.contaboserver.net "cd ~/INSAN-Healthcare-Platform/website && docker compose -f docker-compose.prod.yml logs --tail 200 api"
