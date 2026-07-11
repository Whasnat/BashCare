import { queryAdmin } from '../config/database.js';

export default async function adminRoutes(fastify) {
  const adminOnly = {
    preHandler: [async (req, reply) => {
      await fastify.authenticate(req, reply);
      if (req.user.role !== 'admin') {
        return reply.code(403).send({ error: 'Admin access required' });
      }
    }]
  };

  // List all landlords
  fastify.get('/landlords', adminOnly, async () => {
    const result = await queryAdmin(
      `SELECT lp.*, 
              COUNT(DISTINCT p.id) AS property_count,
              COUNT(DISTINCT u.id) AS unit_count,
              COUNT(DISTINCT l.id) AS active_leases
       FROM landlord_profiles lp
       LEFT JOIN properties p ON p.landlord_id = lp.id
       LEFT JOIN units u ON u.landlord_id = lp.id
       LEFT JOIN leases l ON l.landlord_id = lp.id AND l.is_active = TRUE
       GROUP BY lp.id
       ORDER BY lp.created_at DESC`
    );
    return result.rows;
  });

  // Approve a landlord
  fastify.patch('/landlords/:id/approve', adminOnly, async (req, reply) => {
    const result = await queryAdmin(
      `UPDATE landlord_profiles SET is_active = TRUE WHERE id = $1 RETURNING *`,
      [req.params.id]
    );
    if (!result.rows[0]) return reply.code(404).send({ error: 'Landlord not found' });
    return { message: 'Landlord approved', landlord: result.rows[0] };
  });

  // Suspend a landlord
  fastify.patch('/landlords/:id/suspend', adminOnly, async (req, reply) => {
    const result = await queryAdmin(
      `UPDATE landlord_profiles SET is_active = FALSE WHERE id = $1 RETURNING *`,
      [req.params.id]
    );
    if (!result.rows[0]) return reply.code(404).send({ error: 'Landlord not found' });
    return { message: 'Landlord suspended', landlord: result.rows[0] };
  });

  // Platform overview stats
  fastify.get('/stats', adminOnly, async () => {
    const [landlords, properties, units, leases, invoices] = await Promise.all([
      queryAdmin(`SELECT COUNT(*) FROM landlord_profiles`),
      queryAdmin(`SELECT COUNT(*) FROM properties`),
      queryAdmin(`SELECT COUNT(*) FROM units`),
      queryAdmin(`SELECT COUNT(*) FROM leases WHERE is_active = TRUE`),
      queryAdmin(`SELECT SUM(amount_paid) AS total_collected FROM ledger_invoices WHERE status = 'PAID'`),
    ]);
    return {
      total_landlords: parseInt(landlords.rows[0].count),
      total_properties: parseInt(properties.rows[0].count),
      total_units: parseInt(units.rows[0].count),
      active_leases: parseInt(leases.rows[0].count),
      total_collected: invoices.rows[0].total_collected || 0,
    };
  });
}
