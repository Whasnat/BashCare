import { queryWithRLS, transactionWithRLS } from '../config/database.js';

export default async function invoicesRoutes(fastify) {
  const auth = { preHandler: [fastify.authenticate] };

  fastify.get('/', auth, async (req) => {
    const { status, tenant_id, month } = req.query;
    let query = `SELECT i.*, ict.total_calculated_due, ict.balance_remaining, ict.total_adjustments,
                        tp.full_name AS tenant_name, tp.phone_number AS tenant_phone,
                        u.unit_number, p.name AS property_name
                 FROM ledger_invoices i
                 JOIN invoice_calculated_totals ict ON ict.id = i.id
                 JOIN tenant_profiles tp ON tp.id = i.tenant_id
                 JOIN leases l ON l.id = i.lease_id
                 JOIN units u ON u.id = l.unit_id
                 JOIN properties p ON p.id = u.property_id
                 WHERE 1=1`;
    const params = [];
    if (status) { params.push(status); query += ` AND i.status = $${params.length}`; }
    if (tenant_id) { params.push(tenant_id); query += ` AND i.tenant_id = $${params.length}`; }
    if (month) { params.push(month); query += ` AND i.billing_month = $${params.length}`; }
    query += ' ORDER BY i.billing_month DESC, tp.full_name';
    const result = await queryWithRLS(req.user.landlord_id, query, params);
    return result.rows;
  });

  fastify.get('/:id', auth, async (req, reply) => {
    const [invoiceRes, adjustRes, paymentRes] = await Promise.all([
      queryWithRLS(req.user.landlord_id,
        `SELECT i.*, ict.total_calculated_due, ict.balance_remaining, ict.total_adjustments,
                tp.full_name AS tenant_name, tp.phone_number AS tenant_phone,
                u.unit_number, p.name AS property_name
         FROM ledger_invoices i
         JOIN invoice_calculated_totals ict ON ict.id = i.id
         JOIN tenant_profiles tp ON tp.id = i.tenant_id
         JOIN leases l ON l.id = i.lease_id
         JOIN units u ON u.id = l.unit_id
         JOIN properties p ON p.id = u.property_id
         WHERE i.id = $1`, [req.params.id]),
      queryWithRLS(req.user.landlord_id,
        `SELECT * FROM ledger_adjustments WHERE invoice_id = $1 ORDER BY created_at`, [req.params.id]),
      queryWithRLS(req.user.landlord_id,
        `SELECT * FROM payment_transactions WHERE invoice_id = $1 ORDER BY created_at DESC`, [req.params.id]),
    ]);
    if (!invoiceRes.rows[0]) return reply.code(404).send({ error: 'Invoice not found' });
    return { ...invoiceRes.rows[0], adjustments: adjustRes.rows, payments: paymentRes.rows };
  });

  // Generate invoice for a lease for a given month
  fastify.post('/generate', auth, async (req, reply) => {
    const { lease_id, billing_month } = req.body;
    if (!lease_id || !billing_month) return reply.code(400).send({ error: 'lease_id and billing_month required' });

    const leaseRes = await queryWithRLS(
      req.user.landlord_id,
      `SELECT * FROM leases WHERE id = $1 AND is_active = TRUE`,
      [lease_id]
    );
    if (!leaseRes.rows[0]) return reply.code(404).send({ error: 'Active lease not found' });
    const lease = leaseRes.rows[0];

    const dueDate = new Date(billing_month);
    dueDate.setDate(10); // Due on the 10th of the billing month

    const result = await queryWithRLS(
      req.user.landlord_id,
      `INSERT INTO ledger_invoices
         (landlord_id, lease_id, tenant_id, billing_month, base_rent, amount_due, due_date)
       VALUES ($1, $2, $3, $4, $5, $5, $6)
       ON CONFLICT (lease_id, billing_month) DO NOTHING
       RETURNING *`,
      [req.user.landlord_id, lease_id, lease.tenant_id, billing_month, lease.base_rent, dueDate]
    );
    if (!result.rows[0]) return reply.code(409).send({ error: 'Invoice already exists for this month' });
    return reply.code(201).send(result.rows[0]);
  });

  // Add adjustment to an invoice
  fastify.post('/:id/adjustments', auth, async (req, reply) => {
    const { adjustment_type, amount, note } = req.body;
    const result = await queryWithRLS(
      req.user.landlord_id,
      `INSERT INTO ledger_adjustments (landlord_id, invoice_id, adjustment_type, amount, note, created_by)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [req.user.landlord_id, req.params.id, adjustment_type, amount, note, req.user.id]
    );
    return reply.code(201).send(result.rows[0]);
  });
}
