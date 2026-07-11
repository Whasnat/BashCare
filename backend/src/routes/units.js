import { queryWithRLS } from '../config/database.js';

export default async function unitsRoutes(fastify) {
  const auth = { preHandler: [fastify.authenticate] };

  fastify.get('/', auth, async (req) => {
    const { property_id, status } = req.query;
    let query = `SELECT u.*, p.name AS property_name,
                        tp.full_name AS current_tenant_name,
                        l.base_rent AS current_rent
                 FROM units u
                 JOIN properties p ON p.id = u.property_id
                 LEFT JOIN leases l ON l.unit_id = u.id AND l.is_active = TRUE
                 LEFT JOIN tenant_profiles tp ON tp.id = l.tenant_id
                 WHERE 1=1`;
    const params = [];
    if (property_id) { params.push(property_id); query += ` AND u.property_id = $${params.length}`; }
    if (status) { params.push(status); query += ` AND u.status = $${params.length}`; }
    query += ' ORDER BY p.name, u.unit_number';
    const result = await queryWithRLS(req.user.landlord_id, query, params);
    return result.rows;
  });

  fastify.get('/:id', auth, async (req, reply) => {
    const result = await queryWithRLS(
      req.user.landlord_id,
      `SELECT u.*, p.name AS property_name,
              tp.full_name AS current_tenant_name, tp.phone_number AS tenant_phone,
              l.id AS lease_id, l.base_rent, l.start_date, l.end_date, l.is_active
       FROM units u
       JOIN properties p ON p.id = u.property_id
       LEFT JOIN leases l ON l.unit_id = u.id AND l.is_active = TRUE
       LEFT JOIN tenant_profiles tp ON tp.id = l.tenant_id
       WHERE u.id = $1`,
      [req.params.id]
    );
    if (!result.rows[0]) return reply.code(404).send({ error: 'Unit not found' });
    return result.rows[0];
  });

  fastify.post('/', auth, async (req, reply) => {
    const { property_id, unit_number, floor, bedrooms } = req.body;
    if (!property_id || !unit_number) return reply.code(400).send({ error: 'property_id and unit_number are required' });
    const result = await queryWithRLS(
      req.user.landlord_id,
      `INSERT INTO units (landlord_id, property_id, unit_number, floor, bedrooms)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [req.user.landlord_id, property_id, unit_number, floor, bedrooms || 1]
    );
    return reply.code(201).send(result.rows[0]);
  });

  fastify.patch('/:id', auth, async (req, reply) => {
    const { unit_number, floor, bedrooms, status } = req.body;
    const result = await queryWithRLS(
      req.user.landlord_id,
      `UPDATE units SET
         unit_number = COALESCE($1, unit_number),
         floor = COALESCE($2, floor),
         bedrooms = COALESCE($3, bedrooms),
         status = COALESCE($4, status)
       WHERE id = $5 RETURNING *`,
      [unit_number, floor, bedrooms, status, req.params.id]
    );
    if (!result.rows[0]) return reply.code(404).send({ error: 'Unit not found' });
    return result.rows[0];
  });

  fastify.delete('/:id', auth, async (req, reply) => {
    const result = await queryWithRLS(
      req.user.landlord_id,
      `DELETE FROM units WHERE id = $1 AND status = 'VACANT' RETURNING id`,
      [req.params.id]
    );
    if (!result.rows[0]) return reply.code(400).send({ error: 'Cannot delete an occupied or non-existent unit' });
    return { message: 'Unit deleted successfully' };
  });
}
