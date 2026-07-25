import { queryWithRLS } from '../config/database.js';

export default async function utilitiesRoutes(fastify) {
  const auth = { preHandler: [fastify.authenticate] };

  // List all meter logs
  fastify.get('/', auth, async (req) => {
    const result = await queryWithRLS(
      req.user.landlord_id,
      `SELECT uml.*, u.unit_number, p.name AS property_name,
              usr.full_name AS logged_by_name
       FROM utility_meter_logs uml
       JOIN units u ON u.id = uml.unit_id
       JOIN properties p ON p.id = u.property_id
       LEFT JOIN users usr ON usr.id = uml.logged_by
       ORDER BY uml.reading_date DESC, uml.created_at DESC
       LIMIT 200`
    );
    return result.rows;
  });

  // Log a meter reading (DB trigger auto-calculates delta and invoice charge)
  // Accepts both /log and /meter-log for compatibility
  async function handleMeterLog(req, reply) {
    const { unit_id, agreement_id, meter_type, meter_reading, reading_date } = req.body;
    if (!unit_id || !agreement_id || !meter_reading) {
      return reply.code(400).send({ error: 'unit_id, agreement_id, and meter_reading are required' });
    }
    const result = await queryWithRLS(
      req.user.landlord_id,
      `INSERT INTO utility_meter_logs
         (landlord_id, unit_id, agreement_id, meter_type, meter_reading, reading_date, logged_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [req.user.landlord_id, unit_id, agreement_id, meter_type || 'ELECTRICITY', meter_reading, reading_date || new Date().toISOString().split('T')[0], req.user.id]
    );
    return reply.code(201).send(result.rows[0]);
  }

  fastify.post('/log', auth, handleMeterLog);
  fastify.post('/meter-log', auth, handleMeterLog);

  // Get meter history for a unit
  fastify.get('/unit/:unit_id', auth, async (req) => {
    const result = await queryWithRLS(
      req.user.landlord_id,
      `SELECT uml.*, u.full_name AS logged_by_name
       FROM utility_meter_logs uml
       LEFT JOIN users u ON u.id = uml.logged_by
       WHERE uml.unit_id = $1
       ORDER BY uml.reading_date DESC
       LIMIT 24`,
      [req.params.unit_id]
    );
    return result.rows;
  });
}
