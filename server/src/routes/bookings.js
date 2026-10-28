import express from 'express';
import { getSupabaseAdmin } from '../services/supabaseAdmin.js';
import { AppError } from '../middleware/errorHandler.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// GET /bookings (PRD §7.3)
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const supabase = getSupabaseAdmin();
    const { data: bookings, error } = await supabase
      .from('bookings')
      .select(`
        id,
        ticket_code,
        total_paise,
        created_at,
        event:events (
          id,
          title,
          event_type,
          poster_url,
          starts_at,
          ends_at,
          venue:venues (
            name,
            city
          )
        ),
        items:booking_items (
          id,
          seat_id,
          qty,
          unit_price_paise,
          label,
          section_name
        )
      `)
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });

    if (error) {
      throw new AppError('INTERNAL_ERROR', error.message);
    }

    const formatted = (bookings || []).map((b) => ({
      id: b.id,
      ticketCode: b.ticket_code,
      totalPaise: b.total_paise,
      createdAt: b.created_at,
      event: {
        id: b.event?.id,
        title: b.event?.title,
        eventType: b.event?.event_type,
        posterUrl: b.event?.poster_url,
        startsAt: b.event?.starts_at,
        endsAt: b.event?.ends_at,
        venue: {
          name: b.event?.venue?.name,
          city: b.event?.venue?.city,
        },
      },
      items: b.items || [],
    }));

    res.json(formatted);
  } catch (err) {
    next(err);
  }
});

// GET /bookings/:id (PRD §7.3 & §10: IDOR protection returns 404 for others)
router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const supabase = getSupabaseAdmin();
    const { data: booking, error } = await supabase
      .from('bookings')
      .select(`
        id,
        ticket_code,
        total_paise,
        created_at,
        event:events (
          id,
          title,
          event_type,
          poster_url,
          starts_at,
          ends_at,
          venue:venues (
            name,
            city,
            instructions
          )
        ),
        items:booking_items (
          id,
          seat_id,
          qty,
          unit_price_paise,
          label,
          section_name
        )
      `)
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .maybeSingle();

    if (error || !booking) {
      throw new AppError('NOT_FOUND', 'Booking not found');
    }

    res.json({
      id: booking.id,
      ticketCode: booking.ticket_code,
      totalPaise: booking.total_paise,
      createdAt: booking.created_at,
      event: booking.event,
      items: booking.items || [],
    });
  } catch (err) {
    next(err);
  }
});

export default router;
