import { queryWithRLS, queryAdmin } from '../config/database.js';
import crypto from 'crypto';

/**
 * Webhook signature verification helper.
 * Returns true if the webhook has a valid HMAC signature.
 * When no secret is configured, webhooks are rejected for safety.
 */
function verifyWebhookSignature(secret, payload, signature) {
  if (!secret || !signature) return false;
  const expected = crypto.createHmac('sha256', secret).update(JSON.stringify(payload)).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

export default async function webhooksRoutes(fastify) {
  // ─── bKash payment webhook ─────────────────────────────────────────
  fastify.post('/bkash', async (req, reply) => {
    const webhookSecret = process.env.BKASH_WEBHOOK_SECRET;
    if (!webhookSecret) {
      fastify.log.warn('bKash webhook received but BKASH_WEBHOOK_SECRET is not configured — rejecting for safety');
      return reply.code(503).send({ error: 'Webhook endpoint not configured' });
    }

    const signature = req.headers['x-bkash-signature'] || req.headers['x-webhook-signature'];
    if (!verifyWebhookSignature(webhookSecret, req.body, signature)) {
      fastify.log.warn({ webhookType: 'bKash' }, 'Invalid webhook signature — rejecting');
      return reply.code(401).send({ error: 'Invalid signature' });
    }

    const { paymentID, status, trxID, amount, merchantInvoiceNumber } = req.body;
    fastify.log.info({ webhookType: 'bKash', paymentID, status, trxID }, 'Received verified bKash webhook');

    if (status !== 'Completed') {
      return reply.send({ status: 'acknowledged', action: 'none' });
    }

    try {
      const invoiceId = merchantInvoiceNumber;
      const invoiceRes = await queryAdmin(
        `SELECT landlord_id, occupant_id FROM ledger_invoices WHERE id = $1`,
        [invoiceId]
      );
      if (!invoiceRes.rows[0]) {
        return reply.code(404).send({ error: 'Invoice not found' });
      }
      const { landlord_id, occupant_id } = invoiceRes.rows[0];

      await queryWithRLS(landlord_id,
        `INSERT INTO payment_transactions
           (landlord_id, invoice_id, occupant_id, amount, method, trx_id, gateway_response, status, verified_at)
         VALUES ($1, $2, $3, $4, 'MFS_MERCHANT', $5, $6, 'VERIFIED', NOW())`,
        [landlord_id, invoiceId, occupant_id, amount, trxID, JSON.stringify(req.body)]
      );

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

  // ─── Nagad webhook ─────────────────────────────────────────────────
  fastify.post('/nagad', async (req, reply) => {
    const webhookSecret = process.env.NAGAD_WEBHOOK_SECRET;
    if (!webhookSecret) {
      fastify.log.warn('Nagad webhook received but NAGAD_WEBHOOK_SECRET is not configured — rejecting');
      return reply.code(503).send({ error: 'Webhook endpoint not configured' });
    }
    fastify.log.info({ webhookType: 'Nagad', body: req.body }, 'Received Nagad webhook');
    return { status: 'acknowledged' };
  });

  // ─── Rocket webhook ────────────────────────────────────────────────
  fastify.post('/rocket', async (req, reply) => {
    const webhookSecret = process.env.ROCKET_WEBHOOK_SECRET;
    if (!webhookSecret) {
      fastify.log.warn('Rocket webhook received but ROCKET_WEBHOOK_SECRET is not configured — rejecting');
      return reply.code(503).send({ error: 'Webhook endpoint not configured' });
    }
    fastify.log.info({ webhookType: 'Rocket', body: req.body }, 'Received Rocket webhook');
    return { status: 'acknowledged' };
  });
}
