import { queryWithRLS, queryAdmin } from '../config/database.js';

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
      JOIN tenant_profiles t ON t.id = m.tenant_id
      JOIN units u ON u.id = m.unit_id
      JOIN properties p ON p.id = m.property_id
      WHERE 1=1
    `;
    const params = [];
    
    if (req.user.role === 'tenant') {
      const userRes = await queryAdmin(`SELECT linked_entity_id, landlord_id FROM users WHERE id = $1`, [req.user.id]);
      if (!userRes.rows[0]) return reply.code(404).send({ error: 'Tenant not found' });
      const { linked_entity_id: tenantId, landlord_id: landlordId } = userRes.rows[0];
      
      query += ` AND m.tenant_id = $1 ORDER BY m.created_at DESC`;
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
       FROM leases l
       JOIN units u ON u.id = l.unit_id
       WHERE l.tenant_id = $1 AND l.is_active = TRUE`,
      [tenantId]
    );

    if (!leaseRes.rows[0]) return reply.code(400).send({ error: 'No active lease found' });
    const { unit_id, property_id } = leaseRes.rows[0];

    const result = await queryWithRLS(
      landlordId,
      `INSERT INTO maintenance_requests 
        (landlord_id, tenant_id, property_id, unit_id, issue_type, priority, title, description, photo_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [landlordId, tenantId, property_id, unit_id, issue_type, priority || 'LOW', title, description, photo_url]
    );

    return reply.code(201).send(result.rows[0]);
  });

  // ─── Update maintenance status (Landlord) ──────────────────────────
  fastify.patch('/:id/status', auth, async (req, reply) => {
    if (req.user.role === 'tenant') return reply.code(403).send({ error: 'Unauthorized' });
    const { status } = req.body;

    const result = await queryWithRLS(
      req.user.landlord_id,
      `UPDATE maintenance_requests SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
      [status, req.params.id]
    );

    if (!result.rows[0]) return reply.code(404).send({ error: 'Request not found' });
    return result.rows[0];
  });
}
