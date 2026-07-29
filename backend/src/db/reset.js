import 'dotenv/config';
import pkg from 'pg';
import bcrypt from 'bcryptjs';
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

async function reset() {
  await client.connect();
  const hash = await bcrypt.hash('password123', 12);
  await client.query(`UPDATE users SET password_hash = $1 WHERE email = 'rasheda@example.com'`, [hash]);
  console.log('Password reset to password123 successfully!');
  await client.end();
}

reset();
