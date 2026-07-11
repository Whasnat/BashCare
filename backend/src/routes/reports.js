import { queryWithRLS } from '../config/database.js';

export default async function reportsRoutes(fastify) {
  const auth = { preHandler: [fastify.authenticate] };

  // Financial overview dashboard data
  fastify.get('/overview', auth, async (req) => {
    const { year, month } = req.query;
    const lid = req.user.landlord_id;

    const [occupancy, revenueMonthly, paymentMethods, overdueInvoices, recentActivity] = await Promise.all([
      queryWithRLS(lid, `
        SELECT
          COUNT(*) AS total_units,
          COUNT(*) FILTER (WHERE status = 'OCCUPIED') AS occupied,
          COUNT(*) FILTER (WHERE status = 'VACANT') AS vacant,
          COUNT(*) FILTER (WHERE status = 'MAINTENANCE') AS maintenance,
          ROUND(COUNT(*) FILTER (WHERE status = 'OCCUPIED')::NUMERIC / NULLIF(COUNT(*),0) * 100, 1) AS occupancy_rate
        FROM units`),
      queryWithRLS(lid, `
        SELECT DATE_TRUNC('month', billing_month) AS month,
               SUM(amount_due) AS total_due,
               SUM(amount_paid) AS total_collected,
               COUNT(*) AS invoice_count
        FROM ledger_invoices
        WHERE billing_month >= NOW() - INTERVAL '6 months'
        GROUP BY DATE_TRUNC('month', billing_month)
        ORDER BY month ASC`),
      queryWithRLS(lid, `
        SELECT method, COUNT(*) AS count, SUM(amount) AS total
        FROM payment_transactions
        WHERE status = 'VERIFIED'
        GROUP BY method`),
      queryWithRLS(lid, `
        SELECT COUNT(*) AS count, SUM(amount_due - amount_paid) AS total_outstanding
        FROM ledger_invoices
        WHERE status IN ('UNPAID','OVERDUE','PARTIALLY_PAID')`),
      queryWithRLS(lid, `
        SELECT pt.created_at, pt.amount, pt.method, pt.status,
               tp.full_name AS tenant_name, u.unit_number, p.name AS property_name
        FROM payment_transactions pt
        JOIN tenant_profiles tp ON tp.id = pt.tenant_id
        JOIN ledger_invoices li ON li.id = pt.invoice_id
        JOIN leases l ON l.id = li.lease_id
        JOIN units u ON u.id = l.unit_id
        JOIN properties p ON p.id = u.property_id
        ORDER BY pt.created_at DESC
        LIMIT 10`),
    ]);

    return {
      occupancy: occupancy.rows[0],
      revenue_monthly: revenueMonthly.rows,
      payment_methods: paymentMethods.rows,
      overdue: overdueInvoices.rows[0],
      recent_activity: recentActivity.rows,
    };
  });

  // Landlord-level collection report
  fastify.get('/collections', auth, async (req) => {
    const result = await queryWithRLS(req.user.landlord_id, `
      SELECT li.billing_month, tp.full_name AS tenant_name, u.unit_number,
             p.name AS property_name, li.amount_due, li.amount_paid,
             ict.total_calculated_due, ict.balance_remaining, li.status
      FROM ledger_invoices li
      JOIN invoice_calculated_totals ict ON ict.id = li.id
      JOIN tenant_profiles tp ON tp.id = li.tenant_id
      JOIN leases l ON l.id = li.lease_id
      JOIN units u ON u.id = l.unit_id
      JOIN properties p ON p.id = u.property_id
      ORDER BY li.billing_month DESC, tp.full_name`);
    return result.rows;
  });
}
