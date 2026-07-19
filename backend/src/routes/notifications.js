import pool from '../config/database.js';
import notificationService from '../services/notificationService.js';

export default async function notificationsRoutes(fastify, options) {
  
  // ─── SSE Stream for Real-time Notifications ───────────────────────────
  fastify.get('/stream', { preHandler: [fastify.authenticate] }, (request, reply) => {
    // Set headers for SSE
    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*'
    });
    
    // Write an initial connection message
    reply.raw.write(`data: ${JSON.stringify({ type: 'CONNECTED', message: 'SSE Connection established' })}\n\n`);

    // Register this client to the service
    notificationService.addClient(request.user.id, reply);
  });

  // ─── Get Historical/Unread Notifications ──────────────────────────────
  fastify.get('/', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const result = await pool.query(
      `SELECT * FROM notifications 
       WHERE user_id = $1 
       ORDER BY created_at DESC 
       LIMIT 50`,
      [request.user.id]
    );

    const unreadCountResult = await pool.query(
      `SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND is_read = false`,
      [request.user.id]
    );

    return { 
      notifications: result.rows,
      unreadCount: parseInt(unreadCountResult.rows[0].count)
    };
  });

  // ─── Mark Notification as Read ────────────────────────────────────────
  fastify.patch('/:id/read', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { id } = request.params;
    const result = await pool.query(
      `UPDATE notifications 
       SET is_read = true 
       WHERE id = $1 AND user_id = $2 
       RETURNING *`,
      [id, request.user.id]
    );

    if (result.rowCount === 0) {
      return reply.code(404).send({ error: 'Not Found', message: 'Notification not found' });
    }

    return result.rows[0];
  });

  // ─── Mark All as Read ───────────────────────────────────────────────
  fastify.post('/read-all', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    await pool.query(
      `UPDATE notifications 
       SET is_read = true 
       WHERE user_id = $1 AND is_read = false`,
      [request.user.id]
    );
    return { success: true };
  });
}
