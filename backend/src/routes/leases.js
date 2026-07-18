import { queryWithRLS, transactionWithRLS } from '../config/database.js';

export default async function leasesRoutes(fastify) {
  const auth = { preHandler: [fastify.authenticate] };

  fastify.get('/', auth, async (req) => {
    const { is_active, search = '', page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    let query = `SELECT l.*,
                        COUNT(*) OVER() AS total_count,
                        u.unit_number, p.name AS property_name,
                        tp.full_name AS tenant_name, tp.phone_number AS tenant_phone
                 FROM leases l
                 JOIN units u ON u.id = l.unit_id
                 JOIN properties p ON p.id = u.property_id
                 JOIN tenant_profiles tp ON tp.id = l.tenant_id
                 WHERE 1=1`;
    const params = [];
    if (is_active !== undefined) { params.push(is_active === 'true'); query += ` AND l.is_active = $${params.length}`; }
    if (search) {
      params.push(`%${search}%`);
      query += ` AND (tp.full_name ILIKE $${params.length} OR u.unit_number ILIKE $${params.length})`;
    }
    
    query += ` ORDER BY l.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
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
    const result = await queryWithRLS(
      req.user.landlord_id,
      `SELECT l.*, u.unit_number, u.floor, p.name AS property_name, p.address,
              tp.full_name AS tenant_name, tp.phone_number AS tenant_phone, tp.email AS tenant_email
       FROM leases l
       JOIN units u ON u.id = l.unit_id
       JOIN properties p ON p.id = u.property_id
       JOIN tenant_profiles tp ON tp.id = l.tenant_id
       WHERE l.id = $1`,
      [req.params.id]
    );
    if (!result.rows[0]) return reply.code(404).send({ error: 'Lease not found' });
    return result.rows[0];
  });

  fastify.post('/', auth, async (req, reply) => {
    const { unit_id, tenant_id, base_rent, security_deposit, utility_tariff, start_date, end_date, notes } = req.body;
    if (!unit_id || !tenant_id || !base_rent || !start_date) {
      return reply.code(400).send({ error: 'unit_id, tenant_id, base_rent, and start_date are required' });
    }

    // Coerce empty strings to null for optional date fields
    const endDateValue = end_date && end_date.trim() !== '' ? end_date : null;

    // DB trigger will handle deactivating old lease and marking unit OCCUPIED
    const result = await queryWithRLS(
      req.user.landlord_id,
      `INSERT INTO leases
         (landlord_id, unit_id, tenant_id, base_rent, security_deposit, utility_tariff, start_date, end_date, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [req.user.landlord_id, unit_id, tenant_id, base_rent, security_deposit || 0, utility_tariff || 0, start_date, endDateValue, notes || null]
    );
    return reply.code(201).send(result.rows[0]);
  });

  // Terminate a lease
  fastify.patch('/:id/terminate', auth, async (req, reply) => {
    const result = await queryWithRLS(
      req.user.landlord_id,
      `UPDATE leases SET is_active = FALSE, terminated_at = NOW()
       WHERE id = $1 AND is_active = TRUE
       RETURNING *`,
      [req.params.id]
    );
    if (!result.rows[0]) return reply.code(404).send({ error: 'Active lease not found' });
    return result.rows[0];
  });
}
