import { queryWithRLS, queryAdmin } from '../config/database.js';

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

  // ─── Get All Activity Logs (Admin) ──────────────────────────
  fastify.get('/admin/all', auth, async (req, reply) => {
    if (req.user.role !== 'admin') return reply.code(403).send({ error: 'Unauthorized' });

    const { limit = 100, offset = 0, entity_type, action, landlord_id } = req.query;
    
    let query = `
      SELECT a.*, 
             u.full_name AS user_name, u.role AS user_role,
             imp.full_name AS impersonator_name,
             lp.company_name,
             p.name AS property_name
      FROM activity_logs a
      LEFT JOIN users u ON u.id = a.user_id
      LEFT JOIN users imp ON imp.id = a.impersonator_id
      LEFT JOIN landlord_profiles lp ON lp.id = a.landlord_id
      LEFT JOIN properties p ON p.id = a.property_id
      WHERE 1=1
    `;
    const params = [];
    
    if (entity_type) { params.push(entity_type); query += ` AND a.entity_type = $${params.length}`; }
    if (action) { params.push(action); query += ` AND a.action = $${params.length}`; }
    if (landlord_id) { params.push(landlord_id); query += ` AND a.landlord_id = $${params.length}`; }

    query += ` ORDER BY a.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await queryAdmin(query, params);
    return result.rows;
  });
}
