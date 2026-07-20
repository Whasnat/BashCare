import { queryAdmin } from './src/config/database.js';

async function test() {
  try {
    const outstanding = await queryAdmin(`
      SELECT SUM(ict.balance_remaining) AS total_outstanding 
      FROM ledger_invoices i
      JOIN invoice_calculated_totals ict ON ict.id = i.id
      WHERE i.status != 'PAID'
    `);
    console.log('Outstanding:', outstanding.rows);

    const trend = await queryAdmin(`
      SELECT 
        TO_CHAR(billing_month, 'Mon YYYY') AS month,
        SUM(amount_paid) AS revenue
      FROM ledger_invoices
      WHERE status = 'PAID' 
        AND billing_month >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '5 months')
      GROUP BY billing_month
      ORDER BY billing_month ASC
    `);
    console.log('Trend:', trend.rows);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    process.exit(0);
  }
}

test();
