const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
  console.log('Client :: ready');
  conn.exec(`
    pwd
    ls -la
    find / -name "INSAN-Healthcare-Platform" -type d 2>/dev/null
  `, (err, stream) => {
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
