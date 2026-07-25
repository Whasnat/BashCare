import { queryWithRLS, queryAdmin } from '../config/database.js';
import activityService from '../services/activityService.js';

export default async function maintenanceRoutes(fastify) {
  const auth = {
    preHandler: [fastify.authenticate]
  };

  // ─── Get all maintenance requests ──────────────────────────────────
  fastify.get('/', auth, async (req, reply) => {
    // If tenant, only their requests
    let query = `
      SELECT m.*, 
             t.full_name AS tenant_name, t.phone_number AS tenant_phone,
             u.unit_number, p.name AS property_name
      FROM maintenance_requests m
      JOIN occupant_profiles t ON t.id = m.occupant_id
      JOIN units u ON u.id = m.unit_id
      JOIN properties p ON p.id = m.property_id
      WHERE 1=1
    `;
    const params = [];
    
    if (req.user.role === 'tenant') {
      const userRes = await queryAdmin(`SELECT linked_entity_id, landlord_id FROM users WHERE id = $1`, [req.user.id]);
      if (!userRes.rows[0]) return reply.code(404).send({ error: 'Tenant not found' });
      const { linked_entity_id: tenantId, landlord_id: landlordId } = userRes.rows[0];
      
      query += ` AND m.occupant_id = $1 ORDER BY m.created_at DESC`;
      const result = await queryWithRLS(landlordId, query, [tenantId]);
      return result.rows;
    } else {
      // Landlord/Manager
      query += ` ORDER BY m.created_at DESC`;
      const result = await queryWithRLS(req.user.landlord_id, query, []);
      return result.rows;
    }
  });

  // ─── Create a maintenance request (Tenant) ─────────────────────────
  fastify.post('/', auth, async (req, reply) => {
    if (req.user.role !== 'tenant') return reply.code(403).send({ error: 'Only tenants can create requests' });
    
    const { issue_type, priority, title, description, photo_url } = req.body;

    const userRes = await queryAdmin(`SELECT linked_entity_id, landlord_id FROM users WHERE id = $1`, [req.user.id]);
    const { linked_entity_id: tenantId, landlord_id: landlordId } = userRes.rows[0];

    // Find the active lease to get property_id and unit_id
    const leaseRes = await queryAdmin(
      `SELECT l.unit_id, u.property_id 
       FROM agreements l
       JOIN units u ON u.id = l.unit_id
       WHERE l.occupant_id = $1 AND l.is_active = TRUE`,
      [tenantId]
    );

    if (!leaseRes.rows[0]) return reply.code(400).send({ error: 'No active lease found' });
    const { unit_id, property_id } = leaseRes.rows[0];

    const result = await queryWithRLS(
      landlordId,
      `INSERT INTO maintenance_requests 
        (landlord_id, occupant_id, property_id, unit_id, issue_type, priority, title, description, photo_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [landlordId, tenantId, property_id, unit_id, issue_type, priority || 'LOW', title, description, photo_url]
    );

    const newReq = result.rows[0];
    
    // Only log if tenant created it (which is always the case here, but using their ID)
    activityService.logActivity(
      landlordId,
      req.user.id,
      'MAINTENANCE',
      newReq.id,
      'CREATED',
      `Tenant submitted a maintenance request: ${title}`
    );

    return reply.code(201).send(newReq);
  });

  // ─── Update maintenance request (Landlord) ──────────────────────────
  fastify.patch('/:id', auth, async (req, reply) => {
    if (req.user.role === 'tenant') return reply.code(403).send({ error: 'Unauthorized' });
    const { status, cost } = req.body;

    const reqId = req.params.id;
    const landlordId = req.user.landlord_id;

    // Get the request to ensure it exists and get occupant_id/billed_invoice_id
    const currentReq = await queryWithRLS(
      landlordId,
      `SELECT occupant_id, billed_invoice_id, cost FROM maintenance_requests WHERE id = $1`,
      [reqId]
    );

    if (!currentReq.rows[0]) return reply.code(404).send({ error: 'Request not found' });
    const { occupant_id, billed_invoice_id } = currentReq.rows[0];

    // Build dynamic update query
    let updates = [];
    let values = [];
    let idx = 1;
    
    if (status) {
      updates.push(`status = $${idx++}`);
      values.push(status);
    }
    
    let newInvoiceId = billed_invoice_id;
    
    if (cost !== undefined) {
      updates.push(`cost = $${idx++}`);
      values.push(cost);
      
      // If cost > 0 and it hasn't been billed yet
      if (cost > 0 && !billed_invoice_id) {
        // Find the active UNPAID invoice for this tenant's active lease
        const invoiceRes = await queryWithRLS(
          landlordId,
          `SELECT i.id 
           FROM ledger_invoices i
           JOIN agreements l ON l.id = i.agreement_id
           WHERE l.occupant_id = $1 AND l.is_active = TRUE AND i.status = 'UNPAID'
           ORDER BY i.due_date ASC
           LIMIT 1`,
          [occupant_id]
        );
        
        if (invoiceRes.rows[0]) {
          newInvoiceId = invoiceRes.rows[0].id;
          
          // Insert adjustment
          await queryWithRLS(
            landlordId,
            `INSERT INTO ledger_adjustments (landlord_id, invoice_id, adjustment_type, amount, note, created_by)
             VALUES ($1, $2, 'REPAIR_FEE', $3, 'Maintenance Request Charge', $4)`,
            [landlordId, newInvoiceId, cost, req.user.id]
          );
          
          updates.push(`billed_invoice_id = $${idx++}`);
          values.push(newInvoiceId);
        }
      }
    }

    if (updates.length === 0) return reply.code(400).send({ error: 'No fields to update' });

    updates.push(`updated_at = NOW()`);
    values.push(reqId);

    const result = await queryWithRLS(
      landlordId,
      `UPDATE maintenance_requests SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`,
      values
    );

    const updatedReq = result.rows[0];

    let descParts = [];
    if (status) descParts.push(`status to ${status}`);
    if (cost !== undefined) descParts.push(`cost to ৳${cost}`);
    
    activityService.logActivity(
      landlordId,
      req.user.id,
      'MAINTENANCE',
      updatedReq.id,
      'UPDATED',
      `Updated maintenance request ${descParts.join(' and ')}`
    );

    return updatedReq;
  });
}
