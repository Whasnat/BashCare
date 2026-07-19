import { queryWithRLS, transactionWithRLS } from '../config/database.js';
import notificationService from '../services/notificationService.js';

export default async function invoicesRoutes(fastify) {
  const auth = { preHandler: [fastify.authenticate] };

  fastify.get('/', auth, async (req) => {
    const { status, tenant_id, month, search = '', page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    let query = `SELECT i.*, ict.total_calculated_due, ict.balance_remaining, ict.total_adjustments,
                        COUNT(*) OVER() AS total_count,
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
    if (search) {
      params.push(`%${search}%`);
      query += ` AND (tp.full_name ILIKE $${params.length} OR u.unit_number ILIKE $${params.length})`;
    }
    
    query += ` ORDER BY i.billing_month DESC, tp.full_name LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await queryWithRLS(req.user.landlord_id, query, params);
    const total = result.rows.length > 0 ? Number(result.rows[0].total_count) : 0;
    
    // Remove total_count from individual rows to clean up response
    const data = result.rows.map(({ total_count, ...row }) => row);

    return {
      data,
      meta: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / limit)
      }
    };
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
    
    notificationService.sendNotification(
      lease.tenant_id,
      'INVOICE_GENERATED',
      'New Invoice Generated',
      `Your invoice for ${billing_month} has been generated and is due on the 10th.`,
      result.rows[0].id,
      'invoice'
    );

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

  // Waive the late fee for an invoice
  fastify.post('/:id/waive-late-fee', auth, async (req, reply) => {
    const result = await queryWithRLS(
      req.user.landlord_id,
      `UPDATE ledger_invoices 
       SET late_fees = 0, 
           late_fee_waived = TRUE,
           amount_due = base_rent + utility_charges,
           status = CASE WHEN amount_paid >= (base_rent + utility_charges) THEN 'PAID' ELSE status END,
           updated_at = NOW()
       WHERE id = $1 
       RETURNING *`,
      [req.params.id]
    );

    if (result.rowCount === 0) {
      return reply.code(404).send({ error: 'Invoice not found or unauthorized' });
    }
    
    return reply.code(200).send(result.rows[0]);
  });

  // ─── Generate invoices for ALL active leases for the current month ────
  fastify.post('/generate-all', auth, async (req, reply) => {
    const now = new Date();
    const billing_month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    const dueDate = new Date(billing_month);
    dueDate.setDate(10);

    // Single INSERT ... SELECT replaces the old N+1 loop
    const result = await queryWithRLS(
      req.user.landlord_id,
      `INSERT INTO ledger_invoices
         (landlord_id, lease_id, tenant_id, billing_month, base_rent, amount_due, due_date)
       SELECT $1, l.id, l.tenant_id, $2, l.base_rent, l.base_rent, $3
       FROM leases l
       WHERE l.is_active = TRUE
         AND NOT EXISTS (
           SELECT 1 FROM ledger_invoices li
           WHERE li.lease_id = l.id AND li.billing_month = $2
         )
       RETURNING id, tenant_id`,
      [req.user.landlord_id, billing_month, dueDate.toISOString().split('T')[0]]
    );

    const generated = result.rowCount;

    for (const row of result.rows) {
      notificationService.sendNotification(
        row.tenant_id,
        'INVOICE_GENERATED',
        'New Invoice Generated',
        `Your invoice for ${billing_month} has been generated and is due on the 10th.`,
        row.id,
        'invoice'
      );
    }

    // Count how many were skipped (already existed)
    const totalLeases = await queryWithRLS(
      req.user.landlord_id,
      `SELECT COUNT(*) AS cnt FROM leases WHERE is_active = TRUE`
    );
    const skipped = parseInt(totalLeases.rows[0].cnt) - generated;

    return reply.code(201).send({
      generated,
      skipped,
      billing_month,
      message: `Generated ${generated} invoice(s). ${skipped} already existed.`,
    });
  });

  // ─── Mark overdue: flip UNPAID past-due invoices to OVERDUE ──────────
  fastify.post('/mark-overdue', auth, async (req, reply) => {
    const result = await queryWithRLS(
      req.user.landlord_id,
      `UPDATE ledger_invoices
       SET status = 'OVERDUE', updated_at = NOW()
       WHERE status = 'UNPAID' AND due_date < CURRENT_DATE
       RETURNING id`
    );
    return { updated: result.rowCount };
  });
}

