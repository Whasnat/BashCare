import 'dotenv/config';
import { readFileSync, readdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import pkg from 'pg';
const { Pool, Client } = pkg;

const __dirname = dirname(fileURLToPath(import.meta.url));

async function createDbIfNotExists() {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'admin',
    database: 'postgres',
  });

  try {
    await client.connect();
    const dbName = process.env.DB_NAME || 'bashacare';
    const res = await client.query(
      `SELECT datname FROM pg_catalog.pg_database WHERE datname = $1`, [dbName]
    );
    if (res.rowCount === 0) {
      console.log(`Creating database "${dbName}"...`);
      await client.query(`CREATE DATABASE "${dbName}"`);
      console.log(`✅ Database "${dbName}" created.\n`);
    } else {
      console.log(`ℹ️  Database "${dbName}" already exists.\n`);
    }
  } finally {
    await client.end();
  }
}

async function getAppliedMigrations(pool) {
  // Ensure tracking table exists
  await pool.query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      name TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  const res = await pool.query(`SELECT name FROM _migrations ORDER BY name`);
  return new Set(res.rows.map(r => r.name));
}

async function migrate() {
  await createDbIfNotExists();

  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'bashacare',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'admin',
  });

  console.log('🚀 Running BashaCare database migrations...\n');

  const migrationsDir = join(__dirname, 'migrations');
  const files = readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort(); // ensures 001, 002, 003... order

  const applied = await getAppliedMigrations(pool);

  let ran = 0;
  for (const file of files) {
    if (applied.has(file)) {
      console.log(`  ⏭️  Skipping ${file} (already applied)`);
      continue;
    }

    const sql = readFileSync(join(migrationsDir, file), 'utf8');
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query(`INSERT INTO _migrations (name) VALUES ($1)`, [file]);
      await client.query('COMMIT');
      console.log(`  ✅ Applied ${file}`);
      ran++;
    } catch (err) {
      await client.query('ROLLBACK');
      console.error(`  ❌ Failed on ${file}:`, err.message);
      process.exit(1);
    } finally {
      client.release();
    }
  }

  if (ran === 0) {
    console.log('\n✅ All migrations already applied. Database is up to date.\n');
  } else {
    console.log(`\n✅ ${ran} migration(s) applied successfully.\n`);
  }

  await pool.end();
}

migrate().catch((err) => {
  console.error('❌ Migration runner failed:', err.message);
  process.exit(1);
});
