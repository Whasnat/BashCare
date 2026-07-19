import 'dotenv/config';
import pkg from 'pg';
import bcrypt from 'bcrypt';
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

async function seedRasheda() {
  await client.connect();
  console.log('🔗 Connected to database');

  try {
    // 1. Get or create Rasheda Hoque in landlord_profiles and users
    let rashedaUser = await client.query(`SELECT id, landlord_id FROM users WHERE email = $1`, ['rasheda@email.com']);
    let landlordId, userId;

    if (rashedaUser.rowCount === 0) {
      console.log('rasheda@email.com not found, creating her profile and user account...');
      
      const llResult = await client.query(`
        INSERT INTO landlord_profiles (company_name, contact_email, is_active)
        VALUES ('Rasheda Properties', 'rasheda@email.com', true)
        RETURNING id
      `);
      landlordId = llResult.rows[0].id;

      const hash = await bcrypt.hash('123456', 12);
      const userResult = await client.query(`
        INSERT INTO users (email, password_hash, full_name, role, landlord_id, is_active)
        VALUES ('rasheda@email.com', $1, 'Rasheda Hoque', 'landlord', $2, true)
        RETURNING id
      `, [hash, landlordId]);
      userId = userResult.rows[0].id;
    } else {
      userId = rashedaUser.rows[0].id;
      landlordId = rashedaUser.rows[0].landlord_id;
      console.log(`Found rasheda@email.com (User ID: ${userId}, Landlord ID: ${landlordId})`);
    }

    // 2. Add Properties
    console.log('Adding properties...');
    const p1 = await client.query(`INSERT INTO properties (landlord_id, name, address) VALUES ($1, 'Gulshan Heights', 'Road 12, Gulshan 1, Dhaka') RETURNING id`, [landlordId]);
    const p2 = await client.query(`INSERT INTO properties (landlord_id, name, address) VALUES ($1, 'Banani Villa', 'Road 4, Banani, Dhaka') RETURNING id`, [landlordId]);
    const prop1 = p1.rows[0].id;
    const prop2 = p2.rows[0].id;

    // 3. Add Units
    console.log('Adding units...');
    const u1 = await client.query(`INSERT INTO units (property_id, landlord_id, unit_number, floor, bedrooms, status) VALUES ($1, $2, 'A1', '1', 3, 'OCCUPIED') RETURNING id`, [prop1, landlordId]);
    const u2 = await client.query(`INSERT INTO units (property_id, landlord_id, unit_number, floor, bedrooms, status) VALUES ($1, $2, 'A2', '1', 2, 'OCCUPIED') RETURNING id`, [prop1, landlordId]);
    const u3 = await client.query(`INSERT INTO units (property_id, landlord_id, unit_number, floor, bedrooms, status) VALUES ($1, $2, 'B1', '2', 4, 'OCCUPIED') RETURNING id`, [prop2, landlordId]);
    const unit1 = u1.rows[0].id;
    const unit2 = u2.rows[0].id;
    const unit3 = u3.rows[0].id;

    // 4. Add Tenant Profiles
    console.log('Adding tenants...');
    const t1 = await client.query(`INSERT INTO tenant_profiles (landlord_id, full_name, email, phone_number) VALUES ($1, 'Kamal Hossain', 'kamal@example.com', '01711000001') RETURNING id`, [landlordId]);
    const t2 = await client.query(`INSERT INTO tenant_profiles (landlord_id, full_name, email, phone_number) VALUES ($1, 'Salma Begum', 'salma@example.com', '01711000002') RETURNING id`, [landlordId]);
    const t3 = await client.query(`INSERT INTO tenant_profiles (landlord_id, full_name, email, phone_number) VALUES ($1, 'Tech Solutions Ltd', 'info@techsolutions.com', '01711000003') RETURNING id`, [landlordId]);
    const tenant1 = t1.rows[0].id;
    const tenant2 = t2.rows[0].id;
    const tenant3 = t3.rows[0].id;

    // 5. Add Leases
    console.log('Adding leases...');
    const l1 = await client.query(`INSERT INTO leases (landlord_id, unit_id, tenant_id, base_rent, security_deposit, start_date) VALUES ($1, $2, $3, 25000, 50000, '2023-01-01') RETURNING id`, [landlordId, unit1, tenant1]);
    const l2 = await client.query(`INSERT INTO leases (landlord_id, unit_id, tenant_id, base_rent, security_deposit, start_date) VALUES ($1, $2, $3, 22000, 44000, '2023-06-15') RETURNING id`, [landlordId, unit2, tenant2]);
    const l3 = await client.query(`INSERT INTO leases (landlord_id, unit_id, tenant_id, base_rent, security_deposit, start_date) VALUES ($1, $2, $3, 50000, 100000, '2024-02-01') RETURNING id`, [landlordId, unit3, tenant3]);
    const lease1 = l1.rows[0].id;
    const lease2 = l2.rows[0].id;
    const lease3 = l3.rows[0].id;

    // 6. Add Invoices
    console.log('Adding invoices...');
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const i1 = await client.query(`INSERT INTO ledger_invoices (landlord_id, lease_id, tenant_id, billing_month, base_rent, amount_due, amount_paid, status, due_date) VALUES ($1, $2, $3, $4, 25000, 25000, 25000, 'PAID', $5) RETURNING id`, [landlordId, lease1, tenant1, lastMonth, new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 10)]);
    const i2 = await client.query(`INSERT INTO ledger_invoices (landlord_id, lease_id, tenant_id, billing_month, base_rent, amount_due, amount_paid, status, due_date) VALUES ($1, $2, $3, $4, 25000, 25000, 0, 'UNPAID', $5) RETURNING id`, [landlordId, lease1, tenant1, thisMonth, new Date(thisMonth.getFullYear(), thisMonth.getMonth(), 10)]);
    const i3 = await client.query(`INSERT INTO ledger_invoices (landlord_id, lease_id, tenant_id, billing_month, base_rent, amount_due, amount_paid, status, due_date) VALUES ($1, $2, $3, $4, 50000, 50500, 0, 'OVERDUE', $5) RETURNING id`, [landlordId, lease3, tenant3, lastMonth, new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 10)]); // Overdue with 500 late fee included implicitly here for testing
    // Let's actually set late_fees on i3
    await client.query(`UPDATE ledger_invoices SET late_fees = 500, amount_due = 50500 WHERE id = $1`, [i3.rows[0].id]);

    // 7. Add Payments
    console.log('Adding payments...');
    await client.query(`INSERT INTO payment_transactions (landlord_id, invoice_id, tenant_id, amount, method, status, trx_id) VALUES ($1, $2, $3, 25000, 'MFS_PERSONAL', 'VERIFIED', 'TRX123456')`, [landlordId, i1.rows[0].id, tenant1]);
    await client.query(`INSERT INTO payment_transactions (landlord_id, invoice_id, tenant_id, amount, method, status, trx_id) VALUES ($1, $2, $3, 10000, 'BANK_TRANSFER', 'PENDING', 'BNK789')`, [landlordId, i2.rows[0].id, tenant1]); // pending partial payment

    // 8. Add Utility Logs
    console.log('Adding utility logs...');
    await client.query(`INSERT INTO utility_meter_logs (landlord_id, unit_id, lease_id, meter_type, meter_reading, reading_date) VALUES ($1, $2, $3, 'ELECTRICITY', 1500, $4)`, [landlordId, unit1, lease1, lastMonth]);
    await client.query(`INSERT INTO utility_meter_logs (landlord_id, unit_id, lease_id, meter_type, meter_reading, calculated_units, charge_amount, reading_date) VALUES ($1, $2, $3, 'ELECTRICITY', 1650, 150, 1500, $4)`, [landlordId, unit1, lease1, thisMonth]);

    console.log('✅ Dummy data added successfully for Rasheda Hoque.');

  } catch (err) {
    console.error('Error seeding data:', err);
  } finally {
    await client.end();
  }
}

seedRasheda();
