import { queryWithRLS, queryAdmin } from '../config/database.js';

export default async function settingsRoutes(fastify) {
  const auth = { preHandler: [fastify.authenticate] };

  // GET /api/v1/settings
  fastify.get('/', auth, async (req) => {
    const result = await queryAdmin(
      `SELECT id, company_name, contact_email, contact_phone, plan_tier,
              mfs_personal_number,
              bkash_personal_number, nagad_personal_number, rocket_personal_number,
              bank_account_name, bank_account_number, bank_routing_number, bank_name
       FROM landlord_profiles WHERE id = $1`,
      [req.user.landlord_id]
    );
    return result.rows[0];
  });

  // PATCH /api/v1/settings/payment
  fastify.patch('/payment', auth, async (req, reply) => {
    const {
      mfs_personal_number,
      bkash_personal_number, nagad_personal_number, rocket_personal_number,
      bank_account_name, bank_account_number, bank_routing_number, bank_name,
    } = req.body;

    const result = await queryAdmin(
      `UPDATE landlord_profiles SET
         mfs_personal_number       = COALESCE($1,  mfs_personal_number),
         bkash_personal_number     = COALESCE($2,  bkash_personal_number),
         nagad_personal_number     = COALESCE($3,  nagad_personal_number),
         rocket_personal_number    = COALESCE($4,  rocket_personal_number),
         bank_account_name         = COALESCE($5,  bank_account_name),
         bank_account_number       = COALESCE($6,  bank_account_number),
         bank_routing_number       = COALESCE($7,  bank_routing_number),
         bank_name                 = COALESCE($8,  bank_name),
         updated_at = NOW()
       WHERE id = $9
       RETURNING id, company_name, contact_email`,
      [
        mfs_personal_number || null,
        bkash_personal_number || null,
        nagad_personal_number || null,
        rocket_personal_number || null,
        bank_account_name || null,
        bank_account_number || null,
        bank_routing_number || null,
        bank_name || null,
        req.user.landlord_id,
      ]
    );
    return { message: 'Payment settings saved', ...result.rows[0] };
  });

  // PATCH /api/v1/settings/profile
  fastify.patch('/profile', auth, async (req, reply) => {
    const { company_name, contact_phone } = req.body;
    const result = await queryAdmin(
      `UPDATE landlord_profiles SET
         company_name   = COALESCE($1, company_name),
         contact_phone  = COALESCE($2, contact_phone),
         updated_at     = NOW()
       WHERE id = $3
       RETURNING id, company_name, contact_email, contact_phone`,
      [company_name || null, contact_phone || null, req.user.landlord_id]
    );
    return { message: 'Profile updated', ...result.rows[0] };
  });
}
