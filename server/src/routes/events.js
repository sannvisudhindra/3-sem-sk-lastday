import express from 'express';
import { getSupabaseAdmin } from '../services/supabaseAdmin.js';
import { AppError } from '../middleware/errorHandler.js';
import { requireAuth } from '../middleware/auth.js';
import { joinQueueHandler } from './queue.js';

const router = express.Router();

// GET /events?city=&type= (PRD §7.3)
router.get('/', async (req, res, next) => {
  try {
    const { city, type } = req.query;
    const supabase = getSupabaseAdmin();

    let query = supabase
      .from('events')
      .select(`
        id,
        title,
        event_type,
        poster_url,
        poster_description,
        starts_at,
        ends_at,
        seating_mode,
        venue:venues (
          name,
          city
        ),
        sections:event_sections (
          price_paise,
          capacity,
          sold
        )
      `)
      .order('starts_at', { ascending: true });

    if (type) {
      query = query.eq('event_type', type);
    }

    const { data: events, error } = await query;
    if (error) {
      throw new AppError('INTERNAL_ERROR', error.message);
    }

    // Filter by city if specified
    const filtered = (events || []).filter((ev) => {
      if (!city) return true;
      return ev.venue?.city?.toLowerCase() === String(city).toLowerCase();
    });

    const formatted = filtered.map((ev) => {
      const minPrice = ev.sections?.length
        ? Math.min(...ev.sections.map((s) => s.price_paise))
        : 0;

      const totalCap = ev.sections?.reduce((sum, s) => sum + (s.capacity || 0), 0) || 0;
      const totalSold = ev.sections?.reduce((sum, s) => sum + (s.sold || 0), 0) || 0;

      let availability = 'available';
      if (totalCap > 0 && totalSold >= totalCap) {
        availability = 'sold_out';
      } else if (totalCap > 0 && totalSold / totalCap >= 0.8) {
        availability = 'fast';
      }

      return {
        id: ev.id,
        title: ev.title,
        eventType: ev.event_type,
        posterUrl: ev.poster_url,
        posterDescription: ev.poster_description,
        venue: {
          name: ev.venue?.name || '',
          city: ev.venue?.city || '',
        },
        startsAt: ev.starts_at,
        endsAt: ev.ends_at,
        seatingMode: ev.seating_mode,
        minPricePaise: minPrice,
        availability,
      };
    });

    res.json(formatted);
  } catch (err) {
    next(err);
  }
});

// GET /events/:id (PRD §7.3)
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const supabase = getSupabaseAdmin();

    const { data: event, error } = await supabase
      .from('events')
      .select(`
        *,
        venue:venues (
          id,
          name,
          city,
          layout,
          image_url,
          instructions
        ),
        sections:event_sections (
          id,
          name,
          color,
          price_paise,
          capacity,
          sold
        )
      `)
      .eq('id', id)
      .maybeSingle();

    if (error || !event) {
      throw new AppError('NOT_FOUND', 'Event not found');
    }

    // Calculate user's ticket count if Authorization header is present
    let myTicketCount = 0;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice(7).trim();
      const { data: { user } } = await supabase.auth.getUser(token).catch(() => ({ data: {} }));
      if (user) {
        const { data: bookings } = await supabase
          .from('bookings')
          .select('items:booking_items(qty)')
          .eq('event_id', id)
          .eq('user_id', user.id);

        if (bookings) {
          myTicketCount = bookings.reduce((sum, b) => {
            const bQty = b.items?.reduce((iSum, i) => iSum + (i.qty || 0), 0) || 0;
            return sum + bQty;
          }, 0);
        }
      }
    }

    const sections = (event.sections || []).map((s) => ({
      id: s.id,
      name: s.name,
      color: s.color,
      pricePaise: s.price_paise,
      capacity: s.capacity,
      available: Math.max(0, (s.capacity || 0) - (s.sold || 0)),
    }));

    res.json({
      id: event.id,
      title: event.title,
      eventType: event.event_type,
      description: event.description,
      posterUrl: event.poster_url,
      posterDescription: event.poster_description,
      startsAt: event.starts_at,
      endsAt: event.ends_at,
      seatingMode: event.seating_mode,
      venue: {
        id: event.venue?.id,
        name: event.venue?.name,
        city: event.venue?.city,
        layout: event.venue?.layout,
        imageUrl: event.venue?.image_url,
        instructions: event.venue?.instructions,
      },
      sections,
      myTicketCount,
    });
  } catch (err) {
    next(err);
  }
});

// GET /events/:id/seats (PRD §7.3)
router.get('/:id/seats', async (req, res, next) => {
  try {
    const { id } = req.params;
    const supabase = getSupabaseAdmin();

    const { data: seats, error } = await supabase
      .from('event_seats')
      .select('id, label, section_id, x, y, status, held_until')
      .eq('event_id', id);

    if (error) {
      throw new AppError('INTERNAL_ERROR', error.message);
    }

    const now = new Date().toISOString();
    const formatted = (seats || []).map((seat) => {
      let status = seat.status;
      // Lazy expiry: if status is held but held_until < now, it's effectively available
      if (status === 'held' && seat.held_until && seat.held_until < now) {
        status = 'available';
      }
      return {
        id: seat.id,
        label: seat.label,
        sectionId: seat.section_id,
        x: seat.x,
        y: seat.y,
        status,
      };
    });

    res.json(formatted);
  } catch (err) {
    next(err);
  }
});

// POST /events/:id/queue/join (PRD §7.3)
router.post('/:id/queue/join', requireAuth, joinQueueHandler);

export default router;
