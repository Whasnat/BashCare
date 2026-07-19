import { pool } from '../db/index.js';

class NotificationService {
  constructor() {
    // Map of userId -> Fastify Reply (SSE Stream)
    this.clients = new Map();
  }

  /**
   * Register a new client for SSE
   */
  addClient(userId, reply) {
    if (!this.clients.has(userId)) {
      this.clients.set(userId, new Set());
    }
    this.clients.get(userId).add(reply);

    // Remove client on close
    reply.raw.on('close', () => {
      this.removeClient(userId, reply);
    });
  }

  /**
   * Remove a client stream
   */
  removeClient(userId, reply) {
    if (this.clients.has(userId)) {
      this.clients.get(userId).delete(reply);
      if (this.clients.get(userId).size === 0) {
        this.clients.delete(userId);
      }
    }
  }

  /**
   * Push an event to a specific user's active SSE streams
   */
  pushToUser(userId, data) {
    if (this.clients.has(userId)) {
      const streams = this.clients.get(userId);
      streams.forEach((reply) => {
        reply.raw.write(`data: ${JSON.stringify(data)}\n\n`);
      });
    }
  }

  /**
   * Send a notification (Saves to DB and pushes via SSE)
   */
  async sendNotification(userId, type, title, message, referenceId = null, referenceType = null) {
    try {
      // 1. Save to Database
      const result = await pool.query(
        `INSERT INTO notifications (user_id, type, title, message, reference_id, reference_type)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [userId, type, title, message, referenceId, referenceType]
      );

      const notification = result.rows[0];

      // 2. Push real-time event if online
      this.pushToUser(userId, notification);

      return notification;
    } catch (err) {
      console.error('Error sending notification:', err);
      // Fail silently to avoid breaking main business logic
    }
  }
}

export default new NotificationService();
