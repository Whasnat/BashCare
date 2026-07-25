import { queryWithRLS } from '../config/database.js';
import billingService from '../services/billingService.js';
import activityService from '../services/activityService.js';

export default async function reservationsRoutes(fastify) {
  const auth = { preHandler: [fastify.authenticate] };

  // GET /api/v1/reservations
  // Optionally filter by property_id or date range
  fastify.get('/', auth, async (req) => {
    const { property_id, start_date, end_date } = req.query;
    
    let sql = `
      SELECT a.*, u.unit_number, u.unit_type, o.full_name as guest_name, o.email as guest_email, o.phone_number as guest_phone
      FROM agreements a
      JOIN units u ON a.unit_id = u.id
      JOIN occupant_profiles o ON a.occupant_id = o.id
      WHERE a.agreement_type = 'BOOKING'
    `;
    const params = [];
    
    if (property_id) {
      params.push(property_id);
      sql += ` AND u.property_id = $${params.length}`;
    }
    
    // For calendar filtering
    if (start_date && end_date) {
      params.push(start_date, end_date);
      sql += ` AND (a.check_in <= $${params.length} AND a.check_out >= $${params.length - 1})`;
    }
    
    sql += ` ORDER BY a.check_in DESC`;
    
    const result = await queryWithRLS(req.user.landlord_id, sql, params);
    return result.rows;
  });

  // POST /api/v1/reservations (Create a Booking)
  fastify.post('/', auth, async (req, reply) => {
    const { unit_id, occupant_id, check_in, check_out, metadata, status } = req.body;
    
    if (!unit_id || !occupant_id || !check_in || !check_out) {
      return reply.code(400).send({ error: 'Missing required fields' });
    }

    // Default status logic
    const initialStatus = status || 'RESERVED';

    const result = await queryWithRLS(
      req.user.landlord_id,
      `INSERT INTO agreements (
         landlord_id, unit_id, occupant_id, agreement_type, billing_cycle,
         check_in, check_out, metadata, is_active
       ) VALUES ($1, $2, $3, 'BOOKING', 'PER_STAY', $4, $5, $6, $7) RETURNING *`,
      [req.user.landlord_id, unit_id, occupant_id, check_in, check_out, metadata || {}, true]
    );
    
    const newBooking = result.rows[0];

    // Update unit status to RESERVED or CHECKED_IN
    await queryWithRLS(
      req.user.landlord_id,
      `UPDATE units SET status = $1 WHERE id = $2`,
      [initialStatus, unit_id]
    );

    activityService.log(req.user.landlord_id, req.user.id, 'LEASE_CREATED', 'Created new booking', { booking_id: newBooking.id });

    return reply.code(201).send(newBooking);
  });

  // POST /api/v1/reservations/:id/check-in
  fastify.post('/:id/check-in', auth, async (req, reply) => {
    const { id } = req.params;
    
    // Get booking
    const bookingRes = await queryWithRLS(req.user.landlord_id, `SELECT * FROM agreements WHERE id = $1`, [id]);
    const booking = bookingRes.rows[0];
    if (!booking) return reply.code(404).send({ error: 'Booking not found' });
    
    // Update unit
    await queryWithRLS(req.user.landlord_id, `UPDATE units SET status = 'CHECKED_IN' WHERE id = $1`, [booking.unit_id]);
    
    activityService.log(req.user.landlord_id, req.user.id, 'UNIT_UPDATED', `Checked in guest for booking ${id}`, { unit_id: booking.unit_id });
    
    return { success: true, message: 'Checked in successfully' };
  });

  // POST /api/v1/reservations/:id/check-out
  fastify.post('/:id/check-out', auth, async (req, reply) => {
    const { id } = req.params;
    
    // Get booking and unit info
    const bookingRes = await queryWithRLS(
      req.user.landlord_id, 
      `SELECT a.*, u.rate_per_unit 
       FROM agreements a 
       JOIN units u ON a.unit_id = u.id 
       WHERE a.id = $1`, 
      [id]
    );
    const booking = bookingRes.rows[0];
    if (!booking) return reply.code(404).send({ error: 'Booking not found' });

    // Mark unit as HOUSEKEEPING
    await queryWithRLS(req.user.landlord_id, `UPDATE units SET status = 'HOUSEKEEPING' WHERE id = $1`, [booking.unit_id]);
    
    // Mark agreement as inactive
    await queryWithRLS(req.user.landlord_id, `UPDATE agreements SET is_active = false, terminated_at = NOW() WHERE id = $1`, [id]);

    // Generate Invoice
    try {
      const invoice = await billingService.generateCheckoutInvoice(req.user.landlord_id, booking);
      activityService.log(req.user.landlord_id, req.user.id, 'INVOICE_GENERATED', `Checked out guest and generated invoice for booking ${id}`, { unit_id: booking.unit_id });
      return { success: true, message: 'Checked out successfully', invoice };
    } catch (e) {
      req.log.error('Error generating checkout invoice:', e);
      return reply.code(500).send({ error: 'Checked out, but failed to generate invoice.' });
    }
  });

  // PATCH /api/v1/reservations/:id
  fastify.patch('/:id', auth, async (req, reply) => {
    const { check_in, check_out, metadata, is_active } = req.body;
    
    const result = await queryWithRLS(
      req.user.landlord_id,
      `UPDATE agreements SET
         check_in = COALESCE($1, check_in),
         check_out = COALESCE($2, check_out),
         metadata = COALESCE($3, metadata),
         is_active = COALESCE($4, is_active),
         updated_at = NOW()
       WHERE id = $5 RETURNING *`,
      [check_in, check_out, metadata, is_active, req.params.id]
    );
    if (!result.rows[0]) return reply.code(404).send({ error: 'Booking not found' });
    return result.rows[0];
  });
}
