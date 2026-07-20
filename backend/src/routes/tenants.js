import { queryWithRLS, queryAdmin } from '../config/database.js';
import crypto from 'crypto';
import bcrypt from 'bcrypt';
import { sendInviteEmail } from '../services/emailService.js';
import activityService from '../services/activityService.js';

const ENCRYPTION_KEY = process.env.NID_ENCRYPTION_KEY || (
  process.env.NODE_ENV === 'production'
    ? (() => { throw new Error('FATAL: NID_ENCRYPTION_KEY is required in production'); })()
    : 'bashacare_nid_key_32bytes_secret!!'
);
const IV_LENGTH = 16;

function encryptNID(text) {
  if (!text) return null;
  const key = Buffer.from(ENCRYPTION_KEY.slice(0, 32));
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  const encrypted = Buffer.concat([cipher.update(text), cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

function decryptNID(text) {
  if (!text) return null;
  const key = Buffer.from(ENCRYPTION_KEY.slice(0, 32));
  const [ivHex, encHex] = text.split(':');
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, Buffer.from(ivHex, 'hex'));
  const decrypted = Buffer.concat([decipher.update(Buffer.from(encHex, 'hex')), decipher.final()]);
  return decrypted.toString();
}

export default async function tenantsRoutes(fastify) {
  const auth = { preHandler: [fastify.authenticate] };

  fastify.get('/', auth, async (req) => {
    const { page = 1, limit = 50, search = '', status = 'all' } = req.query;
    const offset = (page - 1) * limit;

    let query = `SELECT tp.*,
              COUNT(*) OVER() AS total_count,
              l.id AS lease_id, l.is_active,
              u.unit_number, p.name AS property_name,
              l.base_rent,
              (SELECT COUNT(*) FROM users u2 WHERE u2.linked_entity_id = tp.id AND u2.role = 'tenant') > 0 AS has_login
       FROM tenant_profiles tp
       LEFT JOIN leases l ON l.tenant_id = tp.id AND l.is_active = TRUE
       LEFT JOIN units u ON u.id = l.unit_id
       LEFT JOIN properties p ON p.id = u.property_id
       WHERE 1=1`;
       
    const params = [];
    
    if (search) {
      params.push(`%${search}%`);
      query += ` AND (tp.full_name ILIKE $${params.length} OR tp.phone_number ILIKE $${params.length} OR tp.email ILIKE $${params.length})`;
    }

    if (status === 'active') {
      query += ` AND l.id IS NOT NULL`;
    } else if (status === 'inactive') {
      query += ` AND l.id IS NULL`;
    }

    query += ` ORDER BY tp.full_name LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await queryWithRLS(req.user.landlord_id, query, params);

    const total = result.rows.length > 0 ? Number(result.rows[0].total_count) : 0;
    
    // Mask NID in list view and remove total_count
    const data = result.rows.map(r => {
      const { total_count, ...row } = r;
      return { ...row, encrypted_national_id: row.encrypted_national_id ? '***ENCRYPTED***' : null };
    });

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
      `SELECT tp.*,
              l.id AS lease_id, l.base_rent, l.start_date, l.end_date,
              u.unit_number, p.name AS property_name
       FROM tenant_profiles tp
       LEFT JOIN leases l ON l.tenant_id = tp.id AND l.is_active = TRUE
       LEFT JOIN units u ON u.id = l.unit_id
       LEFT JOIN properties p ON p.id = u.property_id
       WHERE tp.id = $1`,
      [req.params.id]
    );
    const tenant = result.rows[0];
    if (!tenant) return reply.code(404).send({ error: 'Tenant not found' });
    // Decrypt NID for detail view (landlord only)
    if (req.user.role === 'landlord' && tenant.encrypted_national_id) {
      tenant.national_id_decrypted = decryptNID(tenant.encrypted_national_id);
    }
    return tenant;
  });

  fastify.post('/', auth, async (req, reply) => {
    const { full_name, phone_number, email, national_id, emergency_contact, emergency_phone } = req.body;
    if (!full_name || !phone_number) return reply.code(400).send({ error: 'full_name and phone_number are required' });
    const encryptedNID = encryptNID(national_id);
    const result = await queryWithRLS(
      req.user.landlord_id,
      `INSERT INTO tenant_profiles
         (landlord_id, full_name, phone_number, email, encrypted_national_id, emergency_contact, emergency_phone)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [req.user.landlord_id, full_name, phone_number, email, encryptedNID, emergency_contact, emergency_phone]
    );
    const newTenant = result.rows[0];

    activityService.logActivity(
      req.user.landlord_id,
      req.user.id,
      'TENANT',
      newTenant.id,
      'CREATED',
      `Added new tenant: ${full_name}`
    );

    return reply.code(201).send({ ...newTenant, encrypted_national_id: undefined });
  });

  fastify.patch('/:id', auth, async (req, reply) => {
    const { full_name, phone_number, email, emergency_contact, emergency_phone } = req.body;
    const result = await queryWithRLS(
      req.user.landlord_id,
      `UPDATE tenant_profiles SET
         full_name = COALESCE($1, full_name),
         phone_number = COALESCE($2, phone_number),
         email = COALESCE($3, email),
         emergency_contact = COALESCE($4, emergency_contact),
         emergency_phone = COALESCE($5, emergency_phone),
         updated_at = NOW()
       WHERE id = $6 RETURNING *`,
      [full_name, phone_number, email, emergency_contact, emergency_phone, req.params.id]
    );
    if (!result.rows[0]) return reply.code(404).send({ error: 'Tenant not found' });
    return { ...result.rows[0], encrypted_national_id: undefined };
  });

  // ─── Create login account for a tenant ────────────────────────────────
  fastify.post('/:id/create-login', auth, async (req, reply) => {
    const { email, password } = req.body;
    if (!email || !password) return reply.code(400).send({ error: 'email and password are required' });
    if (password.length < 8) return reply.code(400).send({ error: 'Password must be at least 8 characters' });

    // Verify tenant belongs to this landlord
    const tenantRes = await queryWithRLS(
      req.user.landlord_id,
      `SELECT id, landlord_id FROM tenant_profiles WHERE id = $1`,
      [req.params.id]
    );
    if (!tenantRes.rows[0]) return reply.code(404).send({ error: 'Tenant not found' });

    // Check for existing login
    const existingRes = await queryAdmin(
      `SELECT id FROM users WHERE linked_entity_id = $1 AND role = 'tenant'`,
      [req.params.id]
    );
    if (existingRes.rows[0]) return reply.code(409).send({ error: 'This tenant already has a login account' });

    const hash = await bcrypt.hash(password, 12);
    try {
      await queryAdmin(
        `INSERT INTO users (landlord_id, linked_entity_id, role, email, password_hash, full_name, is_active, must_change_password)
         SELECT $1, tp.id, 'tenant', $2, $3, tp.full_name, TRUE, TRUE
         FROM tenant_profiles tp WHERE tp.id = $4`,
        [req.user.landlord_id, email, hash, req.params.id]
      );
      return reply.code(201).send({ message: 'Tenant login created successfully. They will be required to change their password on first login.' });
    } catch (err) {
      if (err.code === '23505') return reply.code(409).send({ error: 'This email is already in use' });
      throw err;
    }
  });

  // ─── Invite a tenant (generates setup link) ───────────────────────────
  fastify.post('/:id/invite', auth, async (req, reply) => {
    const { email } = req.body;
    if (!email) return reply.code(400).send({ error: 'Email is required' });

    // Verify tenant belongs to this landlord
    const tenantRes = await queryWithRLS(
      req.user.landlord_id,
      `SELECT id, landlord_id, full_name FROM tenant_profiles WHERE id = $1`,
      [req.params.id]
    );
    if (!tenantRes.rows[0]) return reply.code(404).send({ error: 'Tenant not found' });

    // Check for existing login
    const existingRes = await queryAdmin(
      `SELECT id FROM users WHERE linked_entity_id = $1 AND role = 'tenant'`,
      [req.params.id]
    );
    if (existingRes.rows[0]) return reply.code(409).send({ error: 'This tenant already has a login account' });

    const { randomBytes } = await import('crypto');
    const inviteToken = randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    try {
      await queryAdmin(
        `INSERT INTO users (landlord_id, linked_entity_id, role, email, full_name, invite_token, invite_token_expires_at, invited_by, is_active, password_hash)
         VALUES ($1, $2, 'tenant', $3, $4, $5, $6, $7, FALSE, 'INVITED_PENDING_SETUP')`,
        [req.user.landlord_id, req.params.id, email, tenantRes.rows[0].full_name, inviteToken, expiresAt.toISOString(), req.user.id]
      );
      
      const setupLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/setup?token=${inviteToken}`;

      // Get landlord details for the email
      const landlordRes = await queryAdmin(`SELECT company_name FROM landlord_profiles WHERE id = $1`, [req.user.landlord_id]);
      const landlordName = landlordRes.rows[0]?.company_name || 'BashaCare Property';

      // Send the invite email automatically in the background
      sendInviteEmail(email, tenantRes.rows[0].full_name, setupLink, landlordName);

      activityService.logActivity(
        req.user.landlord_id,
        req.user.id,
        'TENANT',
        req.params.id,
        'INVITED',
        `Sent setup invitation to tenant via email`
      );

      return reply.code(201).send({ message: 'Invite link generated and email sent', setupLink });
    } catch (err) {
      if (err.code === '23505') return reply.code(409).send({ error: 'This email is already in use' });
      throw err;
    }
  });

  // ─── Delete a tenant (only if no active lease) ────────────────────────
  fastify.delete('/:id', auth, async (req, reply) => {
    // Block deletion if active lease exists
    const leaseCheck = await queryWithRLS(
      req.user.landlord_id,
      `SELECT id FROM leases WHERE tenant_id = $1 AND is_active = TRUE`,
      [req.params.id]
    );
    if (leaseCheck.rows[0]) {
      return reply.code(409).send({ error: 'Cannot delete tenant with an active lease. Terminate the lease first.' });
    }
    await queryWithRLS(
      req.user.landlord_id,
      `DELETE FROM tenant_profiles WHERE id = $1`,
      [req.params.id]
    );

    activityService.logActivity(
      req.user.landlord_id,
      req.user.id,
      'TENANT',
      req.params.id,
      'DELETED',
      `Deleted tenant profile`
    );

    return reply.code(204).send();
  });
}
