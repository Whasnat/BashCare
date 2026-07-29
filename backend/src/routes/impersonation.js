import { queryAdmin } from '../config/database.js';

export default async function impersonationRoutes(fastify) {
  fastify.post('/start', { preHandler: [fastify.authenticate] }, async (req, reply) => {
    const { target_user_id, property_code } = req.body;
    const originalUser = req.user;

    // Validate target user exists
    const targetQuery = await queryAdmin(`SELECT * FROM users WHERE id = $1 AND is_active = TRUE`, [target_user_id]);
    if (!targetQuery.rows[0]) return reply.code(404).send({ error: 'Target user not found' });
    const targetUser = targetQuery.rows[0];

    // Logic checks
    if (originalUser.role === 'admin') {
      if (targetUser.role !== 'landlord') return reply.code(403).send({ error: 'Admins can only impersonate landlords' });
    } else if (originalUser.role === 'landlord') {
      if (targetUser.role !== 'manager' || targetUser.landlord_id !== originalUser.landlord_id) {
        return reply.code(403).send({ error: 'Landlords can only impersonate their own managers' });
      }
    } else {
      return reply.code(403).send({ error: 'Role not authorized for impersonation' });
    }

    // Fetch permissions if target is manager
    let permissions = [];
    let propertyId = null;
    if (targetUser.role === 'manager' && property_code) {
        // fetch property_id and permissions
        const pData = await queryAdmin(`SELECT id FROM properties WHERE property_code = $1`, [property_code]);
        if (pData.rows.length > 0) {
            propertyId = pData.rows[0].id;
            const permData = await queryAdmin(`SELECT permission FROM user_module_permissions WHERE user_id = $1 AND property_id = $2`, [targetUser.id, propertyId]);
            permissions = permData.rows.map(r => r.permission);
        }
    }

    // Generate new Impersonation JWT
    const token = fastify.jwt.sign({
      id: targetUser.id,
      landlord_id: targetUser.landlord_id,
      role: targetUser.role,
      username: targetUser.username,
      property_id: propertyId,
      property_code: property_code || null,
      module_permissions: permissions,
      
      // Impersonation Metadata
      is_impersonating: true,
      impersonator_id: originalUser.id,
      impersonator_role: originalUser.role
    });

    return { token, message: `Now impersonating ${targetUser.username}` };
  });
}
