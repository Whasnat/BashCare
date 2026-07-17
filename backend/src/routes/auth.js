import bcrypt from 'bcrypt';
import { queryAdmin, queryWithRLS } from '../config/database.js';

export default async function authRoutes(fastify) {
  // ─── Register (Landlord) ────────────────────────────────────────────
  fastify.post('/register', async (request, reply) => {
    const { company_name, email, password, full_name, contact_phone } = request.body;

    if (!email || !password || !company_name) {
      return reply.code(400).send({ error: 'Missing required fields' });
    }
    if (password.length < 8) {
      return reply.code(400).send({ error: 'Password must be at least 8 characters' });
    }

    const hash = await bcrypt.hash(password, 12);

    try {
      // Create landlord profile first
      const landlordResult = await queryAdmin(
        `INSERT INTO landlord_profiles (company_name, contact_email, contact_phone)
         VALUES ($1, $2, $3) RETURNING id`,
        [company_name, email, contact_phone]
      );
      const landlordId = landlordResult.rows[0].id;

      // Create user account linked to landlord profile
      await queryAdmin(
        `INSERT INTO users (landlord_id, role, email, password_hash, full_name)
         VALUES ($1, 'landlord', $2, $3, $4)`,
        [landlordId, email, hash, full_name || company_name]
      );

      return reply.code(201).send({
        message: 'Registration successful. Please await admin approval before logging in.',
        landlordId,
      });
    } catch (err) {
      if (err.code === '23505') {
        return reply.code(409).send({ error: 'An account with this email already exists' });
      }
      throw err;
    }
  });

  // ─── Login ──────────────────────────────────────────────────────────
  fastify.post('/login', async (request, reply) => {
    const { email, password } = request.body;

    if (!email || !password) {
      return reply.code(400).send({ error: 'Email and password are required' });
    }

    const result = await queryAdmin(
      `SELECT u.*, lp.is_active AS landlord_active, lp.company_name
       FROM users u
       LEFT JOIN landlord_profiles lp ON lp.id = u.landlord_id
       WHERE u.email = $1 AND u.is_active = TRUE`,
      [email]
    );

    if (result.rows.length === 0) {
      return reply.code(401).send({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return reply.code(401).send({ error: 'Invalid credentials' });
    }

    // Check landlord approval (not needed for admin role)
    if (user.role === 'landlord' && !user.landlord_active) {
      return reply.code(403).send({ error: 'Your account is pending admin approval' });
    }

    // Update last login
    await queryAdmin('UPDATE users SET last_login = NOW() WHERE id = $1', [user.id]);

    const token = fastify.jwt.sign({
      id: user.id,
      landlord_id: user.landlord_id,
      role: user.role,
      email: user.email,
    });

    return {
      token,
      user: {
        id: user.id,
        landlord_id: user.landlord_id,
        role: user.role,
        email: user.email,
        full_name: user.full_name,
        company_name: user.company_name,
        must_change_password: user.must_change_password || false,
      },
    };
  });

  // ─── Get Current User ───────────────────────────────────────────────
  fastify.get('/me', { preHandler: [fastify.authenticate] }, async (request) => {
    const result = await queryAdmin(
      `SELECT u.id, u.email, u.full_name, u.role, u.phone_number,
              u.must_change_password,
              lp.id AS landlord_id, lp.company_name, lp.plan_tier,
              lp.bkash_merchant_key IS NOT NULL AS has_bkash_merchant,
              lp.nagad_merchant_id IS NOT NULL AS has_nagad_merchant,
              lp.mfs_personal_number IS NOT NULL AS has_mfs_personal,
              lp.bank_account_number IS NOT NULL AS has_bank
       FROM users u
       LEFT JOIN landlord_profiles lp ON lp.id = u.landlord_id
       WHERE u.id = $1`,
      [request.user.id]
    );
    return result.rows[0];
  });

  // ─── Change Password (voluntary) ───────────────────────────────────
  fastify.patch('/password', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { current_password, new_password } = request.body;
    if (!current_password || !new_password) {
      return reply.code(400).send({ error: 'Current and new passwords are required' });
    }
    if (new_password.length < 8) {
      return reply.code(400).send({ error: 'New password must be at least 8 characters' });
    }
    const result = await queryAdmin('SELECT password_hash FROM users WHERE id = $1', [request.user.id]);
    const valid = await bcrypt.compare(current_password, result.rows[0].password_hash);
    if (!valid) return reply.code(400).send({ error: 'Current password is incorrect' });
    const hash = await bcrypt.hash(new_password, 12);
    await queryAdmin(
      'UPDATE users SET password_hash = $1, password_changed_at = NOW() WHERE id = $2',
      [hash, request.user.id]
    );
    return { message: 'Password updated successfully' };
  });

  // ─── Force Change Password (mandatory first-login) ─────────────────
  fastify.post('/force-change-password', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { new_password } = request.body;
    if (!new_password || new_password.length < 8) {
      return reply.code(400).send({ error: 'Password must be at least 8 characters' });
    }

    // Verify this user actually needs to change password
    const check = await queryAdmin(
      'SELECT must_change_password FROM users WHERE id = $1',
      [request.user.id]
    );
    if (!check.rows[0]?.must_change_password) {
      return reply.code(400).send({ error: 'Password change is not required for this account' });
    }

    const hash = await bcrypt.hash(new_password, 12);
    await queryAdmin(
      `UPDATE users SET
         password_hash = $1,
         must_change_password = FALSE,
         password_changed_at = NOW()
       WHERE id = $2`,
      [hash, request.user.id]
    );

    return { message: 'Password changed successfully. You may now use the application.' };
  });
}
