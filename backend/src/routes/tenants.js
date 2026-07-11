import { queryWithRLS } from '../config/database.js';
import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.NID_ENCRYPTION_KEY || 'bashacare_nid_key_32bytes_secret!!';
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
              l.base_rent
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
}
