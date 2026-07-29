import bcrypt from 'bcryptjs';
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
              COUNT(DISTINCT l.id) AS active_agreements
       FROM landlord_profiles lp
       LEFT JOIN properties p ON p.landlord_id = lp.id
       LEFT JOIN units u ON u.landlord_id = lp.id
       LEFT JOIN agreements l ON l.landlord_id = lp.id AND l.is_active = TRUE
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

  // ─── Invite landlord (generates setup link) ─────────────────────────
  fastify.post('/landlords/invite', adminOnly, async (req, reply) => {
    const { company_name, email, full_name, contact_phone } = req.body;
    if (!company_name || !email) {
      return reply.code(400).send({ error: 'company_name and email are required' });
    }

    const { randomBytes } = await import('crypto');
    const inviteToken = randomBytes(32).toString('hex');
    // Expires in 7 days
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    try {
      // Pre-create landlord profile (pending activation via setup)
      const landlordResult = await queryAdmin(
        `INSERT INTO landlord_profiles (company_name, contact_email, contact_phone, is_active)
         VALUES ($1, $2, $3, FALSE) RETURNING id`,
        [company_name, email, contact_phone]
      );
      const landlordId = landlordResult.rows[0].id;

      // Create pending user account with token
      await queryAdmin(
        `INSERT INTO users (landlord_id, role, email, full_name, invite_token, invite_token_expires_at, invited_by, is_active)
         VALUES ($1, 'landlord', $2, $3, $4, $5, $6, FALSE)`,
        [landlordId, email, full_name || company_name, inviteToken, expiresAt.toISOString(), req.user.id]
      );

      // In a real app, send an email here. We just return the link for the admin to copy.
      const setupLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/setup?token=${inviteToken}`;
      
      return reply.code(201).send({
        message: 'Invite link generated',
        setupLink,
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
    const [landlords, properties, units, agreements, invoices, userCount, outstanding, trendData] = await Promise.all([
      queryAdmin(`SELECT COUNT(*) FROM landlord_profiles`),
      queryAdmin(`SELECT COUNT(*) FROM properties`),
      queryAdmin(`SELECT COUNT(*) FROM units`),
      queryAdmin(`SELECT COUNT(*) FROM agreements WHERE is_active = TRUE`),
      queryAdmin(`SELECT SUM(amount_paid) AS total_collected FROM ledger_invoices WHERE status = 'PAID'`),
      queryAdmin(`SELECT COUNT(*) FROM users`),
      queryAdmin(`
        SELECT SUM(ict.balance_remaining) AS total_outstanding 
        FROM ledger_invoices i
        JOIN invoice_calculated_totals ict ON ict.id = i.id
        WHERE i.status != 'PAID'
      `),
      queryAdmin(`
        SELECT 
          TO_CHAR(billing_month, 'Mon YYYY') AS month,
          SUM(amount_paid) AS revenue
        FROM ledger_invoices
        WHERE status = 'PAID' 
          AND billing_month >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '5 months')
        GROUP BY billing_month
        ORDER BY billing_month ASC
      `)
    ]);

    const totalUnits = parseInt(units.rows[0].count);
    const activeLeases = parseInt(agreements.rows[0].count);
    const occupancyRate = totalUnits > 0 ? ((activeLeases / totalUnits) * 100).toFixed(1) : 0;

    return {
      total_landlords: parseInt(landlords.rows[0].count),
      total_properties: parseInt(properties.rows[0].count),
      total_units: totalUnits,
      active_agreements: activeLeases,
      occupancy_rate: occupancyRate,
      total_collected: invoices.rows[0].total_collected || 0,
      total_outstanding: outstanding.rows[0].total_outstanding || 0,
      total_users: parseInt(userCount.rows[0].count),
      revenue_trend: trendData.rows
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
