import bcrypt from 'bcryptjs';
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
        `INSERT INTO users (landlord_id, role, email, username, password_hash, full_name)
         VALUES ($1, 'landlord', $2, $3, $4, $5)`,
        [landlordId, email, email.split('@')[0], hash, full_name || company_name]
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

  // ─── Login Step 1: Validate User ────────────────────────────────────
  fastify.post('/login/validate-user', async (request, reply) => {
    const { username, property_code } = request.body;

    if (!username) {
      return reply.code(400).send({ error: 'Username is required' });
    }

    let query = `
      SELECT u.id, u.role, u.full_name, lp.company_name
      FROM users u
      LEFT JOIN landlord_profiles lp ON lp.id = u.landlord_id
    `;
    const params = [username];

    if (property_code) {
      // Manager or Tenant path
      query += `
        LEFT JOIN manager_property_assignments mpa ON mpa.user_id = u.id
        LEFT JOIN properties p ON p.id = mpa.property_id
        WHERE (u.username = $1 OR u.email = $1) AND p.property_code = $2 AND u.is_active = TRUE
      `;
      params.push(property_code);
    } else {
      // Admin or Landlord path
      query += `
        WHERE (u.username = $1 OR u.email = $1) AND u.role IN ('admin', 'landlord') AND u.is_active = TRUE
      `;
    }

    const result = await queryAdmin(query, params);
    if (result.rows.length === 0) {
      return reply.code(404).send({ error: 'User not found or inactive' });
    }

    return { 
      user_exists: true, 
      role: result.rows[0].role, 
      display_name: result.rows[0].full_name || username,
      company_name: result.rows[0].company_name
    };
  });

  // ─── Login Step 2: Authenticate ──────────────────────────────────────
  fastify.post('/login', async (request, reply) => {
    const { username, password, property_code } = request.body;

    if (!username || !password) {
      return reply.code(400).send({ error: 'Username and password are required' });
    }

    let query = `
      SELECT u.*, lp.is_active AS landlord_active, lp.company_name
      FROM users u
      LEFT JOIN landlord_profiles lp ON lp.id = u.landlord_id
    `;
    const params = [username];

    if (property_code) {
      // Manager or Tenant path
      query += `
        LEFT JOIN manager_property_assignments mpa ON mpa.user_id = u.id
        LEFT JOIN properties p ON p.id = mpa.property_id
        WHERE (u.username = $1 OR u.email = $1) AND p.property_code = $2 AND u.is_active = TRUE
      `;
      params.push(property_code);
    } else {
      // Admin or Landlord path
      query += `
        WHERE (u.username = $1 OR u.email = $1) AND u.role IN ('admin', 'landlord') AND u.is_active = TRUE
      `;
    }

    const result = await queryAdmin(query, params);

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

    // Fetch permissions and property_id if manager and property_code is provided
    let module_permissions = [];
    let property_id = null;
    if (user.role === 'manager' && property_code) {
      const pData = await queryAdmin('SELECT id FROM properties WHERE property_code = $1', [property_code]);
      if (pData.rows.length > 0) {
        property_id = pData.rows[0].id;
        const permData = await queryAdmin(
          'SELECT permission FROM user_module_permissions WHERE user_id = $1 AND property_id = $2', 
          [user.id, property_id]
        );
        module_permissions = permData.rows.map(r => r.permission);
      }
    } else if (user.role === 'tenant' && property_code) {
        // Also fetch property_id for tenant
        const pData = await queryAdmin('SELECT id FROM properties WHERE property_code = $1', [property_code]);
        if (pData.rows.length > 0) {
            property_id = pData.rows[0].id;
        }
    }

    // Update last login
    await queryAdmin('UPDATE users SET last_login = NOW() WHERE id = $1', [user.id]);

    const token = fastify.jwt.sign({
      id: user.id,
      landlord_id: user.landlord_id,
      role: user.role,
      username: user.username,
      property_id: property_id,
      property_code: property_code || null,
      module_permissions: module_permissions,
      is_impersonating: false,
      impersonator_id: null
    });

    return {
      token,
      user: {
        id: user.id,
        landlord_id: user.landlord_id,
        role: user.role,
        username: user.username,
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
      `SELECT u.id, u.email, u.username, u.full_name, u.role, u.phone_number,
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

  // ─── Forgot Password (placeholder — no email integration yet) ──────
  fastify.post('/forgot-password', async (request, reply) => {
    const { email } = request.body;
    if (!email) return reply.code(400).send({ error: 'Email is required' });

    // Always return success to prevent email enumeration
    fastify.log.info({ email }, 'Password reset requested (no email integration — admin must manually reset)');
    return { message: 'If an account with that email exists, instructions have been sent.' };
  });

  // ─── Get Invite Info ────────────────────────────────────────────────
  fastify.get('/invite-info', async (request, reply) => {
    const { token } = request.query;
    if (!token) return reply.code(400).send({ error: 'Token is required' });

    const result = await queryAdmin(
      `SELECT u.email, u.full_name, u.role, lp.company_name
       FROM users u
       LEFT JOIN landlord_profiles lp ON lp.id = u.landlord_id
       WHERE u.invite_token = $1
         AND u.invite_token_expires_at > NOW()
         AND u.is_active = FALSE`,
      [token]
    );

    if (!result.rows[0]) {
      return reply.code(400).send({ error: 'Invalid or expired invite link' });
    }
    return result.rows[0];
  });

  // ─── Accept Invite ──────────────────────────────────────────────────
  fastify.post('/accept-invite', async (request, reply) => {
    const { token, password, company_name, full_name } = request.body;
    if (!token || !password) return reply.code(400).send({ error: 'Token and password are required' });
    if (password.length < 8) return reply.code(400).send({ error: 'Password must be at least 8 characters' });

    const result = await queryAdmin(
      `SELECT id, role, landlord_id FROM users
       WHERE invite_token = $1
         AND invite_token_expires_at > NOW()
         AND is_active = FALSE`,
      [token]
    );

    if (!result.rows[0]) {
      return reply.code(400).send({ error: 'Invalid or expired invite link' });
    }

    const user = result.rows[0];
    const hash = await bcrypt.hash(password, 12);

    try {
      // Begin transaction manually if needed, or rely on individual queries. 
      // We'll update the user and the landlord profile.
      await queryAdmin(
        `UPDATE users
         SET password_hash = $1,
             full_name = COALESCE($2, full_name),
             is_active = TRUE,
             invite_token = NULL,
             invite_token_expires_at = NULL,
             password_changed_at = NOW()
         WHERE id = $3`,
        [hash, full_name || null, user.id]
      );

      // If user is a landlord and they provided a company name, update the profile and activate it
      if (user.role === 'landlord') {
        await queryAdmin(
          `UPDATE landlord_profiles
           SET is_active = TRUE,
               company_name = COALESCE($1, company_name)
           WHERE id = $2`,
          [company_name || null, user.landlord_id]
        );
      }

      return reply.code(200).send({ message: 'Account activated successfully. You can now log in.' });
    } catch (err) {
      throw err;
    }
  });
}
