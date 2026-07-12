/**
 * Seed script: creates the initial System Admin user.
 * Run: node src/db/seed-admin.js
 *
 * Default credentials (change after first login):
 *   Email:    admin@bashacare.com
 *   Password: Admin@1234
 */

import 'dotenv/config';
import bcrypt from 'bcrypt';
import pkg from 'pg';
const { Client } = pkg;

const config = process.env.DATABASE_URL ? {
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
} : {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'bashacare',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'admin',
};

const client = new Client(config);

async function seedAdmin() {
  await client.connect();
  console.log('🔗 Connected to database:', process.env.DB_NAME || 'bashacare');

  const email = 'admin@bashacare.com';
  const password = 'Admin@1234';
  const fullName = 'System Administrator';

  // Check if admin already exists
  const existing = await client.query(
    `SELECT id FROM users WHERE email = $1 AND role = 'admin'`,
    [email]
  );

  if (existing.rowCount > 0) {
    console.log(`✅ Admin user already exists: ${email}`);
    await client.end();
    return;
  }

  const hash = await bcrypt.hash(password, 12);

  await client.query(
    `INSERT INTO users (role, email, password_hash, full_name, is_active)
     VALUES ('admin', $1, $2, $3, TRUE)`,
    [email, hash, fullName]
  );

  console.log('\n✅ System Admin created successfully!\n');
  console.log('─────────────────────────────────────');
  console.log(`  Email   : ${email}`);
  console.log(`  Password: ${password}`);
  console.log('─────────────────────────────────────');
  console.log('⚠️  Please change the password after first login.\n');

  await client.end();
}

seedAdmin().catch((err) => {
  console.error('❌ Seed failed:', err.message);
  process.exit(1);
});
