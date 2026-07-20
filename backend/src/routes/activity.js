import { queryWithRLS } from '../config/database.js';

export default async function activityRoutes(fastify) {
  // Ensure user is authenticated
  const auth = { preValidation: [fastify.authenticate] };

  // ─── Get Activity Logs (Landlord) ──────────────────────────
  fastify.get('/', auth, async (req, reply) => {
    if (req.user.role === 'tenant') return reply.code(403).send({ error: 'Unauthorized' });
    const landlordId = req.user.landlord_id;
    const { entity_type, limit = 50, offset = 0 } = req.query;

    let query = `
      SELECT a.*, 
             u.full_name as user_name
      FROM activity_logs a
      LEFT JOIN users u ON u.id = a.user_id
      WHERE a.landlord_id = $1
    `;
    let values = [landlordId];
    let idx = 2;

    if (entity_type) {
      query += ` AND a.entity_type = $${idx++}`;
      values.push(entity_type);
    }

    query += ` ORDER BY a.created_at DESC LIMIT $${idx++} OFFSET $${idx}`;
    values.push(limit, offset);

    const result = await queryWithRLS(landlordId, query, values);
    return result.rows;
  });
}
