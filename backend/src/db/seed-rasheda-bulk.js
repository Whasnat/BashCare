import 'dotenv/config';
import pkg from 'pg';
import { faker } from '@faker-js/faker';

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

async function seedBulk() {
  await client.connect();
  console.log('🔗 Connected to database for BULK seeding');

  try {
    const userRes = await client.query(`SELECT id, landlord_id FROM users WHERE email = $1`, ['rasheda@email.com']);
    if (userRes.rowCount === 0) {
      console.log('User rasheda@email.com not found. Run seed-rasheda.js first!');
      return;
    }
    const landlordId = userRes.rows[0].landlord_id;
    console.log(`Using Landlord ID: ${landlordId}`);

    // Generate 5 Properties
    const propertyIds = [];
    console.log('Generating 5 properties...');
    for (let i = 0; i < 5; i++) {
      const p = await client.query(
        `INSERT INTO properties (landlord_id, name, address) VALUES ($1, $2, $3) RETURNING id`,
        [landlordId, faker.company.name() + ' Tower', faker.location.streetAddress() + ', Dhaka']
      );
      propertyIds.push(p.rows[0].id);
    }

    // For each property, generate 5-10 units
    const units = [];
    console.log('Generating units...');
    for (const propId of propertyIds) {
      const numUnits = faker.number.int({ min: 5, max: 10 });
      for (let i = 1; i <= numUnits; i++) {
        const u = await client.query(
          `INSERT INTO units (property_id, landlord_id, unit_number, floor, bedrooms, status) VALUES ($1, $2, $3, $4, $5, 'OCCUPIED') RETURNING id`,
          [propId, landlordId, `Unit-${faker.string.alphanumeric(3).toUpperCase()}`, String(faker.number.int({ min: 1, max: 10 })), faker.number.int({ min: 1, max: 4 })]
        );
        units.push(u.rows[0].id);
      }
    }

    // Generate Tenants & Leases
    const leases = [];
    console.log(`Generating ${units.length} tenants and leases...`);
    for (const unitId of units) {
      const t = await client.query(
        `INSERT INTO tenant_profiles (landlord_id, full_name, email, phone_number) VALUES ($1, $2, $3, $4) RETURNING id`,
        [landlordId, faker.person.fullName(), faker.internet.email(), faker.phone.number({ style: 'national' })]
      );
      const tenantId = t.rows[0].id;

      const baseRent = faker.number.int({ min: 10000, max: 80000 });
      const l = await client.query(
        `INSERT INTO leases (landlord_id, unit_id, tenant_id, base_rent, security_deposit, start_date) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
        [landlordId, unitId, tenantId, baseRent, baseRent * 2, faker.date.past({ years: 2 })]
      );
      leases.push({ id: l.rows[0].id, tenant_id: tenantId, unit_id: unitId, base_rent: baseRent });
    }

    // Generate Invoices for the last 6 months
    console.log('Generating historical invoices and payments...');
    for (const lease of leases) {
      for (let monthOffset = 0; monthOffset < 6; monthOffset++) {
        const now = new Date();
        // Go back in time
        now.setMonth(now.getMonth() - monthOffset);
        const billingMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const dueDate = new Date(now.getFullYear(), now.getMonth(), 10);
        
        let status = 'PAID';
        let amountPaid = lease.base_rent;
        let lateFees = 0;
        let amountDue = lease.base_rent;

        if (monthOffset === 0) {
          // Current month could be unpaid, partially paid, or paid
          const rand = Math.random();
          if (rand < 0.3) {
            status = 'UNPAID';
            amountPaid = 0;
          } else if (rand < 0.6) {
            status = 'PARTIALLY_PAID';
            amountPaid = faker.number.int({ min: 1000, max: lease.base_rent - 1000 });
          }
        } else if (monthOffset === 1) {
          // Last month might be overdue
          if (Math.random() < 0.2) {
            status = 'OVERDUE';
            amountPaid = 0;
            lateFees = 500;
            amountDue += lateFees;
          }
        }

        const inv = await client.query(
          `INSERT INTO ledger_invoices (landlord_id, lease_id, tenant_id, billing_month, base_rent, late_fees, amount_due, amount_paid, status, due_date) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
          [landlordId, lease.id, lease.tenant_id, billingMonth, lease.base_rent, lateFees, amountDue, amountPaid, status, dueDate]
        );

        if (amountPaid > 0) {
          const methods = ['MFS_MERCHANT', 'MFS_PERSONAL', 'BANK_TRANSFER', 'CASH'];
          await client.query(
            `INSERT INTO payment_transactions (landlord_id, invoice_id, tenant_id, amount, method, status, trx_id, created_at) VALUES ($1, $2, $3, $4, $5, 'VERIFIED', $6, $7)`,
            [landlordId, inv.rows[0].id, lease.tenant_id, amountPaid, faker.helpers.arrayElement(methods), faker.string.alphanumeric(10).toUpperCase(), faker.date.recent()]
          );
        }
      }
    }

    console.log('✅ Bulk dummy data successfully added for Rasheda!');

  } catch (err) {
    console.error('Error in bulk seeding:', err);
  } finally {
    await client.end();
  }
}

seedBulk();
