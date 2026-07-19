import { queryWithRLS, transactionWithRLS } from '../config/database.js';
import notificationService from '../services/notificationService.js';

/**
 * Double-entry payment allocation.
 * Priority: 1) Late Fees -> 2) Utility Charges -> 3) Base Rent
 */
async function allocatePayment(landlordId, invoiceId, paymentAmount) {
  const invoiceRes = await queryWithRLS(
    landlordId,
    `SELECT * FROM invoice_calculated_totals WHERE id = $1`,
    [invoiceId]
  );
  const invoice = invoiceRes.rows[0];
  if (!invoice) throw new Error('Invoice not found');

  let remaining = parseFloat(paymentAmount);
  const newAmountPaid = parseFloat(invoice.amount_paid) + remaining;
  const totalDue = parseFloat(invoice.total_calculated_due);

  let newStatus = 'PARTIALLY_PAID';
  if (newAmountPaid >= totalDue) newStatus = 'PAID';
  else if (newAmountPaid === 0) newStatus = 'UNPAID';

  await queryWithRLS(
    landlordId,
    `UPDATE ledger_invoices SET
       amount_paid = amount_paid + $1,
       status = $2,
       updated_at = NOW()
     WHERE id = $3`,
    [paymentAmount, newStatus, invoiceId]
  );

  return newStatus;
}

export default async function paymentsRoutes(fastify) {
  const auth = { preHandler: [fastify.authenticate] };

  // Log a cash payment (instant settlement)
  fastify.post('/cash', auth, async (req, reply) => {
    const { invoice_id, amount, notes } = req.body;
    if (!invoice_id || !amount) return reply.code(400).send({ error: 'invoice_id and amount required' });

    const invoiceRes = await queryWithRLS(req.user.landlord_id, `SELECT tenant_id FROM ledger_invoices WHERE id = $1`, [invoice_id]);
    if (!invoiceRes.rows[0]) return reply.code(404).send({ error: 'Invoice not found' });
    const tenant_id = invoiceRes.rows[0].tenant_id;

    const paymentResult = await queryWithRLS(
      req.user.landlord_id,
      `INSERT INTO payment_transactions
         (landlord_id, invoice_id, tenant_id, amount, method, status, verified_by, verified_at, notes)
       VALUES ($1, $2, $3, $4, 'CASH', 'VERIFIED', $5, NOW(), $6)
       RETURNING *`,
      [req.user.landlord_id, invoice_id, tenant_id, amount, req.user.id, notes]
    );

    const newStatus = await allocatePayment(req.user.landlord_id, invoice_id, amount);
    return reply.code(201).send({ payment: paymentResult.rows[0], invoice_status: newStatus });
  });

  // Submit manual TrxID — tenant identifies which provider they used
  fastify.post('/submit-trxid', auth, async (req, reply) => {
    const { invoice_id, amount, method, trx_id, notes } = req.body;
    if (!invoice_id || !amount || !trx_id) return reply.code(400).send({ error: 'invoice_id, amount, and trx_id required' });

    // Accept specific MFS provider names from tenant
    const validMethods = ['BKASH', 'NAGAD', 'ROCKET', 'BANK_TRANSFER', 'MFS_PERSONAL', 'CASH'];
    const resolvedMethod = validMethods.includes(method) ? method : 'MFS_PERSONAL';

    const invoiceRes = await queryWithRLS(req.user.landlord_id, `SELECT tenant_id FROM ledger_invoices WHERE id = $1`, [invoice_id]);
    if (!invoiceRes.rows[0]) return reply.code(404).send({ error: 'Invoice not found' });

    const paymentResult = await queryWithRLS(
      req.user.landlord_id,
      `INSERT INTO payment_transactions
         (landlord_id, invoice_id, tenant_id, amount, method, trx_id, status, notes)
       VALUES ($1, $2, $3, $4, $5, $6, 'PENDING', $7) RETURNING *`,
      [req.user.landlord_id, invoice_id, invoiceRes.rows[0].tenant_id, amount, resolvedMethod, trx_id, notes || null]
    );

    // Update invoice status to PENDING_VERIFICATION
    await queryWithRLS(req.user.landlord_id,
      `UPDATE ledger_invoices SET status = 'PENDING_VERIFICATION', updated_at = NOW() WHERE id = $1`,
      [invoice_id]
    );

    return reply.code(201).send(paymentResult.rows[0]);
  });

  // Verify a pending payment — landlord chooses confirmed method and can add notes
  fastify.patch('/:id/verify', auth, async (req, reply) => {
    const { action, method, notes } = req.body; // action: 'approve'|'reject'; method: confirmed payment method
    if (!['approve', 'reject'].includes(action)) return reply.code(400).send({ error: 'action must be approve or reject' });

    const validMethods = ['BKASH', 'NAGAD', 'ROCKET', 'BANK_TRANSFER', 'MFS_PERSONAL', 'CASH'];
    const confirmedMethod = method && validMethods.includes(method) ? method : null;

    // Build update — optionally override method and notes
    const updateFields = [
      `status = $1`,
      `verified_by = $2`,
      `verified_at = NOW()`,
    ];
    const updateParams = [action === 'approve' ? 'VERIFIED' : 'REJECTED', req.user.id];

    if (confirmedMethod) {
      updateParams.push(confirmedMethod);
      updateFields.push(`method = $${updateParams.length}`);
    }
    if (notes) {
      updateParams.push(notes);
      updateFields.push(`notes = $${updateParams.length}`);
    }
    updateParams.push(req.params.id);

    const paymentRes = await queryWithRLS(req.user.landlord_id,
      `UPDATE payment_transactions SET ${updateFields.join(', ')}
       WHERE id = $${updateParams.length} AND status = 'PENDING'
       RETURNING *`,
      updateParams
    );
    if (!paymentRes.rows[0]) return reply.code(404).send({ error: 'Pending payment not found' });

    const payment = paymentRes.rows[0];
    let invoiceStatus = null;
    if (action === 'approve') {
      invoiceStatus = await allocatePayment(req.user.landlord_id, payment.invoice_id, payment.amount);
      
      // Notify Tenant
      notificationService.sendNotification(
        payment.tenant_id,
        'PAYMENT_CONFIRMED',
        'Payment Approved',
        `Your payment of ৳${payment.amount} has been approved and applied to your invoice.`,
        payment.id,
        'payment'
      );
    } else {
      // On reject, revert invoice status back to its prior state
      await queryWithRLS(req.user.landlord_id,
        `UPDATE ledger_invoices SET
           status = CASE WHEN amount_paid > 0 THEN 'PARTIALLY_PAID' ELSE 'UNPAID' END,
           updated_at = NOW()
         WHERE id = $1 AND status = 'PENDING_VERIFICATION'`,
        [payment.invoice_id]
      );
      
      // Notify Tenant
      notificationService.sendNotification(
        payment.tenant_id,
        'PAYMENT_REJECTED',
        'Payment Rejected',
        `Your payment of ৳${payment.amount} was rejected. ${notes ? `Reason: ${notes}` : 'Please contact your landlord.'}`,
        payment.id,
        'payment'
      );
    }

    return { payment, invoice_status: invoiceStatus };
  });

  // List pending verifications
  fastify.get('/pending', auth, async (req) => {
    const result = await queryWithRLS(req.user.landlord_id,
      `SELECT pt.*, tp.full_name AS tenant_name, tp.phone_number AS tenant_phone,
              li.billing_month, u.unit_number, p.name AS property_name
       FROM payment_transactions pt
       JOIN tenant_profiles tp ON tp.id = pt.tenant_id
       JOIN ledger_invoices li ON li.id = pt.invoice_id
       JOIN leases l ON l.id = li.lease_id
       JOIN units u ON u.id = l.unit_id
       JOIN properties p ON p.id = u.property_id
       WHERE pt.status = 'PENDING'
       ORDER BY pt.created_at DESC`
    );
    return result.rows;
  });

  // Full payment history with optional status filter
  fastify.get('/all', auth, async (req) => {
    const { status, search = '', page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    let query = `SELECT pt.*, tp.full_name AS tenant_name, tp.phone_number AS tenant_phone,
              COUNT(*) OVER() AS total_count,
              li.billing_month, u.unit_number, p.name AS property_name
       FROM payment_transactions pt
       JOIN tenant_profiles tp ON tp.id = pt.tenant_id
       JOIN ledger_invoices li ON li.id = pt.invoice_id
       JOIN leases l ON l.id = li.lease_id
       JOIN units u ON u.id = l.unit_id
       JOIN properties p ON p.id = u.property_id
       WHERE 1=1`;
    const params = [];
    if (status) { params.push(status); query += ` AND pt.status = $${params.length}`; }
    if (search) {
      params.push(`%${search}%`);
      query += ` AND (tp.full_name ILIKE $${params.length} OR u.unit_number ILIKE $${params.length} OR pt.transaction_id ILIKE $${params.length})`;
    }
    
    query += ` ORDER BY pt.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await queryWithRLS(req.user.landlord_id, query, params);
    const total = result.rows.length > 0 ? Number(result.rows[0].total_count) : 0;
    
    // Remove total_count from individual rows
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
}
