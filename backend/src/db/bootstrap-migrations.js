import 'dotenv/config';
import pkg from 'pg';
const { Client } = pkg;

const client = new Client({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'bashacare',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'admin',
});

await client.connect();
await client.query(`
  CREATE TABLE IF NOT EXISTS _migrations (
    name TEXT PRIMARY KEY,
    applied_at TIMESTAMPTZ DEFAULT NOW()
  )
`);
await client.query(`
  INSERT INTO _migrations (name) VALUES ('001_initial_schema.sql') ON CONFLICT DO NOTHING
`);
const res = await client.query(`SELECT name, applied_at FROM _migrations ORDER BY name`);
console.log('Migration tracking table ready. Applied migrations:');
res.rows.forEach(r => console.log(' ✅', r.name));
await client.end();
