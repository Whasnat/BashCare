import { queryWithRLS, queryAdmin } from '../config/database.js';
import crypto from 'crypto';
import bcrypt from 'bcrypt';

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
    const result = await queryWithRLS(
      req.user.landlord_id,
      `SELECT tp.*,
              l.id AS lease_id, l.is_active,
              u.unit_number, p.name AS property_name,
              l.base_rent,
              (SELECT COUNT(*) FROM users u2 WHERE u2.linked_entity_id = tp.id AND u2.role = 'tenant') > 0 AS has_login
       FROM tenant_profiles tp
       LEFT JOIN leases l ON l.tenant_id = tp.id AND l.is_active = TRUE
       LEFT JOIN units u ON u.id = l.unit_id
       LEFT JOIN properties p ON p.id = u.property_id
       ORDER BY tp.full_name`
    );
    // Mask NID in list view
    return result.rows.map(r => ({ ...r, encrypted_national_id: r.encrypted_national_id ? '***ENCRYPTED***' : null }));
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
    return reply.code(201).send({ ...result.rows[0], encrypted_national_id: undefined });
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
    return reply.code(204).send();
  });
}
