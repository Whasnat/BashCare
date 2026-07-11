import { queryWithRLS, queryAdmin } from '../config/database.js';

/**
 * Tenant Portal Routes — /api/v1/portal
 * All routes require role = 'tenant'.
 * RLS is applied using the tenant's linked landlord_id from their JWT.
 */
export default async function portalRoutes(fastify) {
  const tenantAuth = {
    preHandler: [fastify.authenticate, async (req, reply) => {
      if (req.user.role !== 'tenant') {
        return reply.code(403).send({ error: 'Tenant access only' });
      }
    }],
  };

  // ─── Get tenant's own profile + active lease ───────────────────────
  fastify.get('/me', tenantAuth, async (req, reply) => {
    // linked_entity_id on users table maps to tenant_profile.id
    const result = await queryAdmin(
      `SELECT tp.*,
              l.id AS lease_id, l.base_rent, l.security_deposit,
              l.start_date, l.end_date, l.utility_tariff,
              u.unit_number, u.status AS unit_status,
              p.name AS property_name, p.address AS property_address,
              lp.company_name AS landlord_name,
              lp.mfs_personal_number,
              lp.bkash_personal_number, lp.nagad_personal_number, lp.rocket_personal_number,
              lp.bank_account_name, lp.bank_account_number,
              lp.bank_name, lp.bank_routing_number
       FROM users usr
       JOIN tenant_profiles tp ON tp.id = usr.linked_entity_id
       LEFT JOIN leases l ON l.tenant_id = tp.id AND l.is_active = TRUE
       LEFT JOIN units u ON u.id = l.unit_id
       LEFT JOIN properties p ON p.id = u.property_id
       LEFT JOIN landlord_profiles lp ON lp.id = tp.landlord_id
       WHERE usr.id = $1`,
      [req.user.id]
    );
    if (!result.rows[0]) return reply.code(404).send({ error: 'Tenant profile not found' });
    return result.rows[0];
  });

  // ─── Get tenant's invoices ─────────────────────────────────────────
  fastify.get('/invoices', tenantAuth, async (req, reply) => {
    // First resolve tenant_id from user
    const userRes = await queryAdmin(
      `SELECT linked_entity_id, landlord_id FROM users WHERE id = $1`,
      [req.user.id]
    );
    if (!userRes.rows[0]) return reply.code(404).send({ error: 'User not found' });
    const { linked_entity_id: tenantId, landlord_id: landlordId } = userRes.rows[0];

    const result = await queryWithRLS(
      landlordId,
      `SELECT i.*, ict.total_calculated_due, ict.balance_remaining, ict.total_adjustments,
              u.unit_number, p.name AS property_name
       FROM ledger_invoices i
       JOIN invoice_calculated_totals ict ON ict.id = i.id
       JOIN leases l ON l.id = i.lease_id
       JOIN units u ON u.id = l.unit_id
       JOIN properties p ON p.id = u.property_id
       WHERE i.tenant_id = $1
       ORDER BY i.billing_month DESC`,
      [tenantId]
    );
    return result.rows;
  });

  // ─── Get a single invoice (with payments & adjustments) ───────────
  fastify.get('/invoices/:id', tenantAuth, async (req, reply) => {
    const userRes = await queryAdmin(
      `SELECT linked_entity_id, landlord_id FROM users WHERE id = $1`,
      [req.user.id]
    );
    if (!userRes.rows[0]) return reply.code(404).send({ error: 'User not found' });
    const { linked_entity_id: tenantId, landlord_id: landlordId } = userRes.rows[0];

    const [invRes, paymentsRes, adjustRes] = await Promise.all([
      queryWithRLS(landlordId,
        `SELECT i.*, ict.total_calculated_due, ict.balance_remaining, ict.total_adjustments,
                u.unit_number, p.name AS property_name,
                lp.mfs_personal_number,
                lp.bkash_personal_number, lp.nagad_personal_number, lp.rocket_personal_number,
                lp.bank_account_name, lp.bank_account_number, lp.bank_name,
                lp.bank_routing_number
         FROM ledger_invoices i
         JOIN invoice_calculated_totals ict ON ict.id = i.id
         JOIN leases l ON l.id = i.lease_id
         JOIN units u ON u.id = l.unit_id
         JOIN properties p ON p.id = u.property_id
         JOIN landlord_profiles lp ON lp.id = i.landlord_id
         WHERE i.id = $1 AND i.tenant_id = $2`, [req.params.id, tenantId]),
      queryWithRLS(landlordId,
        `SELECT * FROM payment_transactions WHERE invoice_id = $1 ORDER BY created_at DESC`, [req.params.id]),
      queryWithRLS(landlordId,
        `SELECT * FROM ledger_adjustments WHERE invoice_id = $1 ORDER BY created_at`, [req.params.id]),
    ]);

    if (!invRes.rows[0]) return reply.code(404).send({ error: 'Invoice not found or access denied' });
    return { ...invRes.rows[0], payments: paymentsRes.rows, adjustments: adjustRes.rows };
  });

  // ─── Submit manual TrxID payment ──────────────────────────────────
  fastify.post('/invoices/:id/pay', tenantAuth, async (req, reply) => {
    const { amount, method, trx_id, notes } = req.body;
    if (!amount || !trx_id) return reply.code(400).send({ error: 'amount and trx_id are required' });

    const userRes = await queryAdmin(
      `SELECT linked_entity_id, landlord_id FROM users WHERE id = $1`, [req.user.id]
    );
    if (!userRes.rows[0]) return reply.code(404).send({ error: 'User not found' });
    const { linked_entity_id: tenantId, landlord_id: landlordId } = userRes.rows[0];

    // Verify invoice belongs to this tenant
    const invCheck = await queryWithRLS(landlordId,
      `SELECT id FROM ledger_invoices WHERE id = $1 AND tenant_id = $2`, [req.params.id, tenantId]);
    if (!invCheck.rows[0]) return reply.code(404).send({ error: 'Invoice not found or access denied' });

    const result = await queryWithRLS(landlordId,
      `INSERT INTO payment_transactions
         (landlord_id, invoice_id, tenant_id, amount, method, trx_id, status, notes)
       VALUES ($1, $2, $3, $4, $5, $6, 'PENDING', $7) RETURNING *`,
      [landlordId, req.params.id, tenantId, amount, method || 'MFS_PERSONAL', trx_id, notes]
    );

    // Mark invoice as pending verification
    await queryWithRLS(landlordId,
      `UPDATE ledger_invoices SET status = 'PENDING_VERIFICATION', updated_at = NOW() WHERE id = $1`,
      [req.params.id]
    );

    return reply.code(201).send(result.rows[0]);
  });
}
