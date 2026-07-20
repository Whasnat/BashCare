import { queryAdmin } from '../config/database.js';

class ActivityService {
  /**
   * Log an activity event.
   * @param {string} landlordId - UUID of the landlord.
   * @param {string|null} userId - UUID of the user performing the action (null for system actions).
   * @param {string} entityType - e.g. 'TENANT', 'INVOICE', 'MAINTENANCE', 'PAYMENT', 'LEASE'
   * @param {string} entityId - UUID of the affected entity.
   * @param {string} action - e.g. 'CREATED', 'UPDATED', 'DELETED', 'PAID', 'RESOLVED'
   * @param {string} description - Human-readable description of the event.
   */
  async logActivity(landlordId, userId, entityType, entityId, action, description) {
    try {
      await queryAdmin(
        `INSERT INTO activity_logs (landlord_id, user_id, entity_type, entity_id, action, description)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [landlordId, userId || null, entityType, entityId || null, action, description]
      );
    } catch (err) {
      console.error('[ActivityService] Error logging activity:', err);
      // We don't throw here to prevent disrupting the main business logic if logging fails
    }
  }
}

export default new ActivityService();
