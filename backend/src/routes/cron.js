import billingService from '../services/billingService.js';

export default async function cronRoutes(fastify, options) {
  // ─── External Trigger for Monthly Invoices ────────────────────────────
  // This endpoint is meant to be called by external cron services (e.g. Render Cron)
  fastify.post('/trigger-invoices', async (request, reply) => {
    const cronSecret = process.env.CRON_SECRET;
    
    if (!cronSecret) {
      fastify.log.warn('Trigger endpoint called but CRON_SECRET is not configured.');
      return reply.code(503).send({ error: 'Endpoint not configured properly' });
    }

    const providedSecret = request.headers['x-cron-secret'];
    
    if (providedSecret !== cronSecret) {
      return reply.code(401).send({ error: 'Unauthorized', message: 'Invalid or missing CRON_SECRET' });
    }

    // Pass an optional target date for manual testing if needed
    const targetDate = request.body?.target_date ? new Date(request.body.target_date) : new Date();

    try {
      const result = await billingService.generateSystemWideInvoices(targetDate);
      return reply.code(200).send({
        message: 'Invoice generation triggered successfully',
        ...result
      });
    } catch (err) {
      fastify.log.error('Cron trigger failed:', err);
      return reply.code(500).send({ error: 'Internal Server Error', message: err.message });
    }
  });
}
