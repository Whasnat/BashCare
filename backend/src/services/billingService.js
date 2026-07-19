import { queryAdmin } from '../config/database.js';
import notificationService from './notificationService.js';

class BillingService {
  /**
   * Generates invoices for ALL active leases across ALL landlords
   * for the given billing month.
   */
  async generateSystemWideInvoices(targetDate = new Date()) {
    const billing_month = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}-01`;
    const dueDate = new Date(billing_month);
    dueDate.setDate(10); // Invoices due on the 10th

    try {
      console.log(`[BillingService] Starting system-wide invoice generation for ${billing_month}`);
      
      const result = await queryAdmin(
        `INSERT INTO ledger_invoices
           (landlord_id, lease_id, tenant_id, billing_month, base_rent, amount_due, due_date)
         SELECT l.landlord_id, l.id, l.tenant_id, $1, l.base_rent, l.base_rent, $2
         FROM leases l
         WHERE l.is_active = TRUE
           AND NOT EXISTS (
             SELECT 1 FROM ledger_invoices li
             WHERE li.lease_id = l.id AND li.billing_month = $1
           )
         RETURNING id, tenant_id, landlord_id`,
        [billing_month, dueDate.toISOString().split('T')[0]]
      );

      const generated = result.rowCount;

      // Send notifications for generated invoices
      for (const row of result.rows) {
        notificationService.sendNotification(
          row.tenant_id,
          'INVOICE_GENERATED',
          'New Invoice Generated',
          `Your invoice for ${billing_month} has been generated and is due on the 10th.`,
          row.id,
          'invoice'
        );
      }

      console.log(`[BillingService] Successfully generated ${generated} invoices.`);
      return { success: true, generated, billing_month };
    } catch (err) {
      console.error('[BillingService] Failed to generate system-wide invoices:', err);
      throw err;
    }
  }
}

export default new BillingService();
