import bcrypt from 'bcrypt';
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

  // ─── List all landlords ─────────────────────────────────────────────
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

  // ─── Create landlord (admin-created, pre-approved) ──────────────────
  fastify.post('/landlords', adminOnly, async (req, reply) => {
    const { company_name, email, password, full_name, contact_phone } = req.body;
    if (!company_name || !email || !password) {
      return reply.code(400).send({ error: 'company_name, email, and password are required' });
    }
    if (password.length < 8) {
      return reply.code(400).send({ error: 'Password must be at least 8 characters' });
    }

    const hash = await bcrypt.hash(password, 12);
    try {
      // Create landlord profile (pre-approved since admin is creating it)
      const landlordResult = await queryAdmin(
        `INSERT INTO landlord_profiles (company_name, contact_email, contact_phone, is_active)
         VALUES ($1, $2, $3, TRUE) RETURNING id`,
        [company_name, email, contact_phone]
      );
      const landlordId = landlordResult.rows[0].id;

      // Create user account
      await queryAdmin(
        `INSERT INTO users (landlord_id, role, email, password_hash, full_name, must_change_password)
         VALUES ($1, 'landlord', $2, $3, $4, TRUE)`,
        [landlordId, email, hash, full_name || company_name]
      );

      return reply.code(201).send({
        message: 'Landlord account created and activated',
        landlordId,
      });
    } catch (err) {
      if (err.code === '23505') {
        return reply.code(409).send({ error: 'An account with this email already exists' });
      }
      throw err;
    }
  });

  // ─── Approve a landlord ─────────────────────────────────────────────
  fastify.patch('/landlords/:id/approve', adminOnly, async (req, reply) => {
    const result = await queryAdmin(
      `UPDATE landlord_profiles SET is_active = TRUE WHERE id = $1 RETURNING *`,
      [req.params.id]
    );
    if (!result.rows[0]) return reply.code(404).send({ error: 'Landlord not found' });
    return { message: 'Landlord approved', landlord: result.rows[0] };
  });

  // ─── Suspend a landlord ─────────────────────────────────────────────
  fastify.patch('/landlords/:id/suspend', adminOnly, async (req, reply) => {
    const result = await queryAdmin(
      `UPDATE landlord_profiles SET is_active = FALSE WHERE id = $1 RETURNING *`,
      [req.params.id]
    );
    if (!result.rows[0]) return reply.code(404).send({ error: 'Landlord not found' });
    return { message: 'Landlord suspended', landlord: result.rows[0] };
  });

  // ─── Platform overview stats ────────────────────────────────────────
  fastify.get('/stats', adminOnly, async () => {
    const [landlords, properties, units, leases, invoices, userCount] = await Promise.all([
      queryAdmin(`SELECT COUNT(*) FROM landlord_profiles`),
      queryAdmin(`SELECT COUNT(*) FROM properties`),
      queryAdmin(`SELECT COUNT(*) FROM units`),
      queryAdmin(`SELECT COUNT(*) FROM leases WHERE is_active = TRUE`),
      queryAdmin(`SELECT SUM(amount_paid) AS total_collected FROM ledger_invoices WHERE status = 'PAID'`),
      queryAdmin(`SELECT COUNT(*) FROM users`),
    ]);
    return {
      total_landlords: parseInt(landlords.rows[0].count),
      total_properties: parseInt(properties.rows[0].count),
      total_units: parseInt(units.rows[0].count),
      active_leases: parseInt(leases.rows[0].count),
      total_collected: invoices.rows[0].total_collected || 0,
      total_users: parseInt(userCount.rows[0].count),
    };
  });

  // ─── List all users (global directory) ──────────────────────────────
  fastify.get('/users', adminOnly, async () => {
    const result = await queryAdmin(
      `SELECT u.id, u.email, u.full_name, u.role, u.is_active,
              u.last_login, u.created_at, u.must_change_password,
              lp.company_name
       FROM users u
       LEFT JOIN landlord_profiles lp ON lp.id = u.landlord_id
       ORDER BY u.created_at DESC`
    );
    return result.rows;
  });

  // ─── Toggle user active status ──────────────────────────────────────
  fastify.patch('/users/:id/toggle-active', adminOnly, async (req, reply) => {
    const result = await queryAdmin(
      `UPDATE users SET is_active = NOT is_active WHERE id = $1 RETURNING id, is_active`,
      [req.params.id]
    );
    if (!result.rows[0]) return reply.code(404).send({ error: 'User not found' });
    return {
      message: result.rows[0].is_active ? 'User activated' : 'User deactivated',
      user: result.rows[0],
    };
  });
}
