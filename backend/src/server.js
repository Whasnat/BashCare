import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import jwt from '@fastify/jwt';

// Route imports
import authRoutes from './routes/auth.js';
import propertiesRoutes from './routes/properties.js';
import unitsRoutes from './routes/units.js';
import tenantsRoutes from './routes/tenants.js';
import leasesRoutes from './routes/leases.js';
import invoicesRoutes from './routes/invoices.js';
import paymentsRoutes from './routes/payments.js';
import utilitiesRoutes from './routes/utilities.js';
import settingsRoutes from './routes/settings.js';
import reportsRoutes from './routes/reports.js';
import adminRoutes from './routes/admin.js';
import webhooksRoutes from './routes/webhooks.js';
import portalRoutes from './routes/portal.js';

const fastify = Fastify({
  logger: process.env.NODE_ENV !== 'production',
});

// ─── Security & CORS ──────────────────────────────────────────────────
await fastify.register(helmet, { global: true });
const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');

await fastify.register(cors, {
  origin: frontendUrl,
  credentials: true,
});

// ─── JWT ──────────────────────────────────────────────────────────────
await fastify.register(jwt, {
  secret: process.env.JWT_SECRET || 'bashacare_dev_secret',
  sign: { expiresIn: process.env.JWT_EXPIRES_IN || '7d' },
});

// ─── Auth Decorator ───────────────────────────────────────────────────
fastify.decorate('authenticate', async (request, reply) => {
  try {
    await request.jwtVerify();
  } catch (err) {
    reply.code(401).send({ error: 'Unauthorized', message: 'Invalid or expired token' });
  }
});

fastify.decorate('requireRole', (roles) => async (request, reply) => {
  await fastify.authenticate(request, reply);
  if (!roles.includes(request.user.role)) {
    reply.code(403).send({ error: 'Forbidden', message: 'Insufficient permissions' });
  }
});

// ─── Routes ───────────────────────────────────────────────────────────
fastify.register(authRoutes, { prefix: '/api/v1/auth' });
fastify.register(adminRoutes, { prefix: '/api/v1/admin' });
fastify.register(propertiesRoutes, { prefix: '/api/v1/properties' });
fastify.register(unitsRoutes, { prefix: '/api/v1/units' });
fastify.register(tenantsRoutes, { prefix: '/api/v1/tenants' });
fastify.register(leasesRoutes, { prefix: '/api/v1/leases' });
fastify.register(invoicesRoutes, { prefix: '/api/v1/invoices' });
fastify.register(paymentsRoutes, { prefix: '/api/v1/payments' });
fastify.register(utilitiesRoutes, { prefix: '/api/v1/utilities' });
fastify.register(settingsRoutes, { prefix: '/api/v1/settings' });
fastify.register(reportsRoutes, { prefix: '/api/v1/reports' });
fastify.register(webhooksRoutes, { prefix: '/api/v1/webhooks' });
fastify.register(portalRoutes, { prefix: '/api/v1/portal' });

// ─── Health Check ─────────────────────────────────────────────────────
fastify.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }));

// ─── Global Error Handler ─────────────────────────────────────────────
fastify.setErrorHandler((error, request, reply) => {
  fastify.log.error(error);
  const statusCode = error.statusCode || 500;
  reply.code(statusCode).send({
    error: error.name || 'InternalServerError',
    message: error.message || 'An unexpected error occurred',
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
  });
});

// ─── Start ────────────────────────────────────────────────────────────
const start = async () => {
  try {
    const port = parseInt(process.env.PORT || '3001');
    await fastify.listen({ port, host: '0.0.0.0' });
    console.log(`\n🏢 BashaCare API running on http://localhost:${port}\n`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
