const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
  console.log('Client :: ready');
  conn.exec(`cd /root/INSAN-Healthcare-Platform/website && git pull origin main && docker compose -f docker-compose.prod.yml build api web && docker compose -f docker-compose.prod.yml up -d api web && docker exec insan-api npm run db:seed`, (err, stream) => {
    if (err) throw err;
    stream.on('close', (code, signal) => {
      console.log('Stream :: close :: code: ' + code + ', signal: ' + signal);
      conn.end();
    }).on('data', (data) => {
      console.log('STDOUT: ' + data);
    }).stderr.on('data', (data) => {
      console.log('STDERR: ' + data);
    });
  });
}).connect({
  host: '169.58.77.61',
  port: 22,
  username: 'root',
  password: 'TPArunA1950',
  readyTimeout: 30000
});
