import { queryWithRLS, queryAdmin } from '../config/database.js';

export default async function propertiesRoutes(fastify) {
  const auth = { preHandler: [fastify.authenticate] };

  // GET /api/v1/properties
  fastify.get('/', auth, async (req) => {
    const result = await queryWithRLS(
      req.user.landlord_id,
      `SELECT p.*, 
              COUNT(u.id) AS total_units,
              COUNT(u.id) FILTER (WHERE u.status = 'OCCUPIED') AS occupied_units,
              COUNT(u.id) FILTER (WHERE u.status = 'VACANT') AS vacant_units
       FROM properties p
       LEFT JOIN units u ON u.property_id = p.id
       GROUP BY p.id
       ORDER BY p.created_at DESC`
    );
    return result.rows;
  });

  // GET /api/v1/properties/:id
  fastify.get('/:id', auth, async (req, reply) => {
    const result = await queryWithRLS(
      req.user.landlord_id,
      `SELECT p.*, 
              COUNT(u.id) AS total_units,
              COUNT(u.id) FILTER (WHERE u.status = 'OCCUPIED') AS occupied_units
       FROM properties p
       LEFT JOIN units u ON u.property_id = p.id
       WHERE p.id = $1
       GROUP BY p.id`,
      [req.params.id]
    );
    if (!result.rows[0]) return reply.code(404).send({ error: 'Property not found' });
    return result.rows[0];
  });

  // POST /api/v1/properties
  fastify.post('/', auth, async (req, reply) => {
    const { name, address } = req.body;
    if (!name || !address) return reply.code(400).send({ error: 'Name and address are required' });
    const result = await queryWithRLS(
      req.user.landlord_id,
      `INSERT INTO properties (landlord_id, name, address) VALUES ($1, $2, $3) RETURNING *`,
      [req.user.landlord_id, name, address]
    );
    return reply.code(201).send(result.rows[0]);
  });

  // PATCH /api/v1/properties/:id
  fastify.patch('/:id', auth, async (req, reply) => {
    const { name, address } = req.body;
    const result = await queryWithRLS(
      req.user.landlord_id,
      `UPDATE properties SET
         name = COALESCE($1, name),
         address = COALESCE($2, address),
         updated_at = NOW()
       WHERE id = $3 RETURNING *`,
      [name, address, req.params.id]
    );
    if (!result.rows[0]) return reply.code(404).send({ error: 'Property not found' });
    return result.rows[0];
  });

  // DELETE /api/v1/properties/:id
  fastify.delete('/:id', auth, async (req, reply) => {
    const result = await queryWithRLS(
      req.user.landlord_id,
      `DELETE FROM properties WHERE id = $1 RETURNING id`,
      [req.params.id]
    );
    if (!result.rows[0]) return reply.code(404).send({ error: 'Property not found' });
    return { message: 'Property deleted successfully' };
  });
}
