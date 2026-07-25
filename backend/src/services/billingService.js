import { queryAdmin } from '../config/database.js';
import notificationService from './notificationService.js';

class BillingService {
  /**
   * Generates invoices for ALL active agreements across ALL landlords
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
           (landlord_id, agreement_id, occupant_id, billing_month, base_rent, amount_due, due_date)
         SELECT l.landlord_id, l.id, l.occupant_id, $1, l.base_rent, l.base_rent, $2
         FROM agreements l
         WHERE l.is_active = TRUE
           AND NOT EXISTS (
             SELECT 1 FROM ledger_invoices li
             WHERE li.agreement_id = l.id AND li.billing_month = $1
           )
         RETURNING id, occupant_id, landlord_id`,
        [billing_month, dueDate.toISOString().split('T')[0]]
      );

      const generated = result.rowCount;

      // Send notifications for generated invoices and process pending maintenance costs
      for (const row of result.rows) {
        // 1. Check for unbilled maintenance requests with a cost
        const maintenanceRes = await queryAdmin(
          `SELECT id, cost FROM maintenance_requests 
           WHERE occupant_id = $1 AND cost > 0 AND billed_invoice_id IS NULL`,
          [row.occupant_id]
        );

        for (const req of maintenanceRes.rows) {
          // Add ledger adjustment for the repair fee
          await queryAdmin(
            `INSERT INTO ledger_adjustments (landlord_id, invoice_id, adjustment_type, amount, note)
             VALUES ($1, $2, 'REPAIR_FEE', $3, 'Maintenance Request Charge')`,
            [row.landlord_id, row.id, req.cost]
          );

          // Mark maintenance request as billed
          await queryAdmin(
            `UPDATE maintenance_requests SET billed_invoice_id = $1 WHERE id = $2`,
            [row.id, req.id]
          );
        }

        // 2. Send invoice generation notification
        notificationService.sendNotification(
          row.occupant_id,
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

  /**
   * Scans for unpaid invoices due in exactly 3 days and sends reminders.
   */
  async sendPaymentReminders() {
    try {
      console.log(`[BillingService] Scanning for upcoming due dates (3 days away)`);
      
      const result = await queryAdmin(`
        SELECT i.id, i.occupant_id, i.billing_month, i.due_date, i.amount_due,
               i.base_rent + i.utility_charges + i.late_fees - i.amount_paid AS balance_remaining
        FROM ledger_invoices i
        WHERE i.status IN ('UNPAID', 'PARTIALLY_PAID')
          AND i.due_date = CURRENT_DATE + INTERVAL '3 days'
      `);

      for (const row of result.rows) {
        if (parseFloat(row.balance_remaining) > 0) {
          notificationService.sendNotification(
            row.occupant_id,
            'PAYMENT_REMINDER',
            'Upcoming Payment Due',
            `Your payment of ৳${row.balance_remaining} for ${row.billing_month.toISOString().split('T')[0]} is due in 3 days (${row.due_date.toISOString().split('T')[0]}).`,
            row.id,
            'invoice'
          );
        }
      }

      console.log(`[BillingService] Sent ${result.rowCount} payment reminders.`);
      return { success: true, count: result.rowCount };
    } catch (err) {
      console.error('[BillingService] Failed to send payment reminders:', err);
      throw err;
    }
  }

  /**
   * Generates a per-stay invoice for a checked-out booking
   */
  async generateCheckoutInvoice(landlord_id, booking) {
    const { id: agreement_id, occupant_id, check_in, check_out, rate_per_unit } = booking;
    
    const start = new Date(check_in);
    const end = new Date(check_out || new Date());
    
    let diffTime = Math.abs(end - start);
    let diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays === 0) diffDays = 1;

    const base_rent = diffDays * (Number(rate_per_unit) || 0);
    const billing_month = start.toISOString().split('T')[0];
    const due_date = end.toISOString().split('T')[0];

    const result = await queryAdmin(
      `INSERT INTO ledger_invoices
         (landlord_id, agreement_id, occupant_id, billing_month, base_rent, amount_due, due_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, occupant_id, landlord_id, base_rent, amount_due`,
      [landlord_id, agreement_id, occupant_id, billing_month, base_rent, base_rent, due_date]
    );

    return result.rows[0];
  }

  /**
   * Scans for unpaid invoices past their due date that haven't had a late fee applied or waived.
   * Applies a flat 500 BDT late fee and sends a warning.
   */
  async processOverdueInvoices() {
    try {
      console.log(`[BillingService] Processing overdue invoices`);
      
      const FLAT_LATE_FEE = 500.00;

      // Select invoices that need a late fee
      const result = await queryAdmin(`
        SELECT i.id, i.occupant_id, i.billing_month, i.amount_due
        FROM ledger_invoices i
        WHERE i.status IN ('UNPAID', 'PARTIALLY_PAID')
          AND i.due_date < CURRENT_DATE
          AND i.late_fees = 0
          AND i.late_fee_waived = FALSE
      `);

      let processedCount = 0;

      for (const row of result.rows) {
        // Update the invoice to add late fee
        await queryAdmin(`
          UPDATE ledger_invoices
          SET late_fees = $1,
              amount_due = base_rent + utility_charges + $1,
              status = 'OVERDUE',
              updated_at = NOW()
          WHERE id = $2
        `, [FLAT_LATE_FEE, row.id]);

        // Send warning
        notificationService.sendNotification(
          row.occupant_id,
          'OVERDUE_WARNING',
          'Invoice Overdue Penalty',
          `Your invoice for ${row.billing_month.toISOString().split('T')[0]} is overdue. A late fee of ৳${FLAT_LATE_FEE} has been applied.`,
          row.id,
          'invoice'
        );

        processedCount++;
      }

      console.log(`[BillingService] Applied late fees to ${processedCount} overdue invoices.`);
      return { success: true, count: processedCount };
    } catch (err) {
      console.error('[BillingService] Failed to process overdue invoices:', err);
      throw err;
    }
  }
}

export default new BillingService();
