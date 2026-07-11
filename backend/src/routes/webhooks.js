import { queryWithRLS, queryAdmin } from '../config/database.js';

export default async function webhooksRoutes(fastify) {
  // bKash payment webhook - called by bKash after successful payment
  fastify.post('/bkash', async (req, reply) => {
    const { paymentID, status, trxID, amount, merchantInvoiceNumber } = req.body;
    fastify.log.info({ webhookType: 'bKash', paymentID, status, trxID }, 'Received bKash webhook');

    if (status !== 'Completed') {
      return reply.send({ status: 'acknowledged', action: 'none' });
    }

    try {
      // merchantInvoiceNumber contains our invoice_id
      const invoiceId = merchantInvoiceNumber;
      const invoiceRes = await queryAdmin(
        `SELECT landlord_id, tenant_id FROM ledger_invoices WHERE id = $1`,
        [invoiceId]
      );
      if (!invoiceRes.rows[0]) {
        return reply.code(404).send({ error: 'Invoice not found' });
      }
      const { landlord_id, tenant_id } = invoiceRes.rows[0];

      // Record the payment transaction
      await queryWithRLS(landlord_id,
        `INSERT INTO payment_transactions
           (landlord_id, invoice_id, tenant_id, amount, method, trx_id, gateway_response, status, verified_at)
         VALUES ($1, $2, $3, $4, 'MFS_MERCHANT', $5, $6, 'VERIFIED', NOW())`,
        [landlord_id, invoiceId, tenant_id, amount, trxID, JSON.stringify(req.body)]
      );

      // Allocate the payment
      await queryWithRLS(landlord_id, `
        UPDATE ledger_invoices SET
          amount_paid = amount_paid + $1,
          status = CASE
            WHEN amount_paid + $1 >= (SELECT total_calculated_due FROM invoice_calculated_totals WHERE id = $2) THEN 'PAID'
            ELSE 'PARTIALLY_PAID'
          END,
          updated_at = NOW()
        WHERE id = $2`, [amount, invoiceId]);

      return { status: 'success', message: 'Payment recorded' };
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({ error: 'Webhook processing failed' });
    }
  });

  // Nagad webhook
  fastify.post('/nagad', async (req, reply) => {
    fastify.log.info({ webhookType: 'Nagad', body: req.body }, 'Received Nagad webhook');
    // Similar logic to bKash - process when implemented with live credentials
    return { status: 'acknowledged' };
  });

  // Rocket webhook
  fastify.post('/rocket', async (req, reply) => {
    fastify.log.info({ webhookType: 'Rocket', body: req.body }, 'Received Rocket webhook');
    return { status: 'acknowledged' };
  });
}
