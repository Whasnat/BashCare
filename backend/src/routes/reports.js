import { queryWithRLS } from '../config/database.js';

export default async function reportsRoutes(fastify) {
  const auth = { preHandler: [fastify.authenticate] };

  // Financial overview dashboard data
  fastify.get('/overview', auth, async (req) => {
    const lid = req.user.landlord_id;

    const result = await queryWithRLS(lid, `
      SELECT
        (SELECT row_to_json(o) FROM (
          SELECT
            COUNT(*) AS total_units,
            COUNT(*) FILTER (WHERE status = 'OCCUPIED' OR status = 'CHECKED_IN') AS occupied,
            COUNT(*) FILTER (WHERE status = 'VACANT' OR status = 'AVAILABLE') AS vacant,
            COUNT(*) FILTER (WHERE status = 'MAINTENANCE' OR status = 'HOUSEKEEPING') AS maintenance,
            ROUND(COUNT(*) FILTER (WHERE status = 'OCCUPIED' OR status = 'CHECKED_IN')::NUMERIC / NULLIF(COUNT(*),0) * 100, 1) AS occupancy_rate
          FROM units
        ) o) AS occupancy,
        
        (SELECT property_type FROM properties ORDER BY created_at ASC LIMIT 1) AS primary_property_type,
        
        (SELECT COALESCE(json_agg(r), '[]'::json) FROM (
          SELECT DATE_TRUNC('month', billing_month) AS month,
                 SUM(amount_due) AS total_due,
                 SUM(amount_paid) AS total_collected,
                 COUNT(*) AS invoice_count
          FROM ledger_invoices
          WHERE billing_month >= NOW() - INTERVAL '6 months'
          GROUP BY DATE_TRUNC('month', billing_month)
          ORDER BY month ASC
        ) r) AS revenue_monthly,
        
        (SELECT COALESCE(json_agg(p), '[]'::json) FROM (
          SELECT method, COUNT(*) AS count, SUM(amount) AS total
          FROM payment_transactions
          WHERE status = 'VERIFIED'
          GROUP BY method
        ) p) AS payment_methods,
        
        (SELECT row_to_json(ov) FROM (
          SELECT COUNT(*) AS count, SUM(amount_due - amount_paid) AS total_outstanding
          FROM ledger_invoices
          WHERE status IN ('UNPAID','OVERDUE','PARTIALLY_PAID')
        ) ov) AS overdue,
        
        (SELECT COALESCE(json_agg(ra), '[]'::json) FROM (
          SELECT pt.created_at, pt.amount, pt.method, pt.status,
                 tp.full_name AS tenant_name, u.unit_number, p.name AS property_name
          FROM payment_transactions pt
          JOIN occupant_profiles tp ON tp.id = pt.occupant_id
          JOIN ledger_invoices li ON li.id = pt.invoice_id
          JOIN agreements l ON l.id = li.agreement_id
          JOIN units u ON u.id = l.unit_id
          JOIN properties p ON p.id = u.property_id
          ORDER BY pt.created_at DESC
          LIMIT 10
        ) ra) AS recent_activity
    `);

    const row = result.rows[0];

    return {
      occupancy: row.occupancy || { total_units: 0, occupied: 0, vacant: 0, maintenance: 0, occupancy_rate: 0 },
      primary_property_type: row.primary_property_type || 'RESIDENTIAL',
      revenue_monthly: row.revenue_monthly || [],
      payment_methods: row.payment_methods || [],
      overdue: row.overdue || { count: 0, total_outstanding: 0 },
      recent_activity: row.recent_activity || [],
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
      JOIN occupant_profiles tp ON tp.id = li.occupant_id
      JOIN agreements l ON l.id = li.agreement_id
      JOIN units u ON u.id = l.unit_id
      JOIN properties p ON p.id = u.property_id
      ORDER BY li.billing_month DESC, tp.full_name`);
    return result.rows;
  });
}
