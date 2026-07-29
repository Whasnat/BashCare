import { queryWithRLS } from '../config/database.js';

export default async function managersRoutes(fastify) {
  // ─── Update Manager Permissions ─────────────────────────────────────
  fastify.patch('/:userId/permissions', { preHandler: [fastify.authenticate] }, async (req, reply) => {
    const { userId } = req.params;
    const { property_id, permissions } = req.body;
    const landlordId = req.user.landlord_id;

    if (!property_id || !Array.isArray(permissions)) {
      return reply.code(400).send({ error: 'property_id and permissions array are required' });
    }

    if (req.user.role !== 'admin' && req.user.role !== 'landlord') {
       return reply.code(403).send({ error: 'Only admins or landlords can assign permissions' });
    }

    // 1. Delete existing permissions for this user + property
    await queryWithRLS(landlordId, `DELETE FROM user_module_permissions WHERE user_id = $1 AND property_id = $2`, [userId, property_id]);

    // 2. Insert new permissions using UNNEST for batch insert
    if (permissions.length > 0) {
      await queryWithRLS(landlordId, `
        INSERT INTO user_module_permissions (landlord_id, user_id, property_id, permission, granted_by)
        SELECT $1, $2, $3, unnest($4::module_permission[]), $5
      `, [landlordId, userId, property_id, permissions, req.user.id]);
    }

    return { message: 'Permissions updated successfully' };
  });
}
