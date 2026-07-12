import 'dotenv/config';
import { Pool } from 'pg';

const poolConfig = process.env.DATABASE_URL ? {
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 15000,
} : {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'bashacare',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 15000,
};

const pool = new Pool(poolConfig);

pool.on('error', (err) => {
  console.error('Unexpected error on idle pg client', err);
});

/**
 * Execute query with RLS context set for the current landlord.
 * This is the core of our multi-tenancy security model.
 */
export async function queryWithRLS(landlordId, query, params = []) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // Inject the landlord context into the DB session
    await client.query(
      `SET LOCAL app.current_landlord_id = '${landlordId}';`
    );
    const result = await client.query(query, params);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Execute a query without RLS (admin operations only).
 */
export async function queryAdmin(query, params = []) {
  return pool.query(query, params);
}

/**
 * Execute multiple queries in a single transaction with RLS context.
 */
export async function transactionWithRLS(landlordId, operations) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      `SET LOCAL app.current_landlord_id = '${landlordId}';`
    );
    const results = [];
    for (const op of operations) {
      const result = await client.query(op.query, op.params || []);
      results.push(result);
    }
    await client.query('COMMIT');
    return results;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export default pool;
