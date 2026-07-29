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
  async logActivity(landlordId, userId, entityType, entityId, action, description, req = null) {
    try {
      let actualUserId = userId;
      let impersonatorId = null;
      let username = null;
      let propertyId = null;
      let propertyCode = null;
      let ctx = null;

      if (req && req.user) {
        username = req.user.username;
        propertyId = req.user.property_id || null;
        propertyCode = req.user.property_code || null;

        if (req.user.is_impersonating) {
          actualUserId = req.user.impersonator_id; // impersonator is the real actor
          impersonatorId = req.user.impersonator_id;
          ctx = {
            impersonator_role: req.user.impersonator_role,
            target_role: req.user.role,
            target_username: req.user.username
          };
        }
      }

      await queryAdmin(
        `INSERT INTO activity_logs (landlord_id, user_id, impersonator_id, entity_type, entity_id, action, description, username, property_id, property_code, impersonation_context)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [landlordId, actualUserId || null, impersonatorId, entityType, entityId || null, action, description, username, propertyId, propertyCode, ctx]
      );
    } catch (err) {
      console.error('[ActivityService] Error logging activity:', err);
      // We don't throw here to prevent disrupting the main business logic if logging fails
    }
  }
}

export default new ActivityService();
