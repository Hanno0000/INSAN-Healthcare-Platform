const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres.ijqprkbrqtfwizyxuzxl:TPArun%401950A@aws-0-eu-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true',
});

client.connect()
  .then(() => {
    console.log('Connected successfully!');
    return client.query('SELECT 1');
  })
  .then((res) => {
    console.log('Query result:', res.rows);
    client.end();
  })
  .catch((err) => {
    console.error('Connection error:', err);
    client.end();
  });
