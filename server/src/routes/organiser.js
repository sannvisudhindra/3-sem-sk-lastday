import express from 'express';
import { z } from 'zod';
import { callRpc } from '../lib/rpc.js';
import { getSupabaseAdmin } from '../services/supabaseAdmin.js';
import { config } from '../config.js';
import { AppError } from '../middleware/errorHandler.js';
import { validate } from '../middleware/validate.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = express.Router();

// Enforce organiser authentication for all routes in this file
router.use(requireAuth, requireRole('organiser'));

const availabilitySchema = z.object({
  venueId: z.string().uuid(),
  title: z.string().min(1),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
});

const createEventSchema = z.object({
  venueId: z.string().uuid(),
  title: z.string().min(1),
  eventType: z.string().min(1),
  description: z.string().optional().default(''),
  posterUrl: z.string().url().optional().nullable(),
  posterDescription: z.string().optional().default(''),
  seatingMode: z.enum(['assigned', 'sectioned', 'free']),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  capacity: z.number().int().min(1).optional(),
  sections: z
    .array(
      z.object({
        venueSectionId: z.string().uuid().optional(),
        name: z.string().optional(),
        color: z.string().optional(),
        pricePaise: z.number().int().min(0),
        capacity: z.number().int().min(1).optional(),
      })
    )
    .optional(),
});

// POST /organiser/events/check-availability (PRD §7.3)
router.post('/events/check-availability', validate(availabilitySchema), async (req, res, next) => {
  try {
    const { venueId, title, startsAt, endsAt } = req.body;
    const result = await callRpc('check_event_availability', {
      p_organiser: req.user.id,
      p_venue: venueId,
      p_title: title,
      p_starts: startsAt,
      p_ends: endsAt,
      p_turnover_min: config.business.venueTurnoverMinutes,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// POST /organiser/events (PRD §7.3)
router.post('/events', validate(createEventSchema), async (req, res, next) => {
  try {
    const payload = req.body;
    const result = await callRpc('create_event', {
      p_organiser: req.user.id,
      p_payload: payload,
      p_turnover_min: config.business.venueTurnoverMinutes,
    });
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

// GET /organiser/events (PRD §7.3: My events list)
router.get('/events', async (req, res, next) => {
  try {
    const supabase = getSupabaseAdmin();
    const { data: events, error } = await supabase
      .from('events')
      .select(`
        id,
        title,
        event_type,
        poster_url,
        starts_at,
        ends_at,
        seating_mode,
        venue:venues (name, city),
        stats:event_stats (capacity, sold, revenue_paise)
      `)
      .eq('organiser_id', req.user.id)
      .order('starts_at', { ascending: false });

    if (error) {
      throw new AppError('INTERNAL_ERROR', error.message);
    }

    const formatted = (events || []).map((ev) => {
      const stats = Array.isArray(ev.stats) ? ev.stats[0] : ev.stats || {};
      return {
        id: ev.id,
        title: ev.title,
        eventType: ev.event_type,
        posterUrl: ev.poster_url,
        startsAt: ev.starts_at,
        endsAt: ev.ends_at,
        seatingMode: ev.seating_mode,
        venue: ev.venue,
        capacity: stats.capacity || 0,
        sold: stats.sold || 0,
        revenuePaise: stats.revenue_paise || 0,
      };
    });

    res.json(formatted);
  } catch (err) {
    next(err);
  }
});

// Helper: verify event belongs to organiser (IDOR protection)
async function verifyOrganiserEvent(supabase, eventId, organiserId) {
  const { data: event } = await supabase
    .from('events')
    .select('id')
    .eq('id', eventId)
    .eq('organiser_id', organiserId)
    .maybeSingle();

  if (!event) {
    throw new AppError('NOT_FOUND', 'Event not found or not owned by you');
  }
}

// GET /organiser/events/:id/stats (PRD §7.3 & §11)
router.get('/events/:id/stats', async (req, res, next) => {
  try {
    const supabase = getSupabaseAdmin();
    const eventId = req.params.id;

    await verifyOrganiserEvent(supabase, eventId, req.user.id);

    const { data: stats } = await supabase
      .from('event_stats')
      .select('*')
      .eq('event_id', eventId)
      .maybeSingle();

    const { data: sectionStats } = await supabase
      .from('event_section_stats')
      .select('*')
      .eq('event_id', eventId);

    res.json({
      ...(stats || {
        capacity: 0,
        sold: 0,
        held_now: 0,
        available: 0,
        revenue_paise: 0,
        bookings: 0,
        attempts_succeeded: 0,
        attempts_failed: 0,
        attempts_expired: 0,
      }),
      sections: sectionStats || [],
    });
  } catch (err) {
    next(err);
  }
});

// GET /organiser/events/:id/bookings (PRD §7.3)
router.get('/events/:id/bookings', async (req, res, next) => {
  try {
    const supabase = getSupabaseAdmin();
    const eventId = req.params.id;

    await verifyOrganiserEvent(supabase, eventId, req.user.id);

    const { data: bookings, error } = await supabase
      .from('bookings')
      .select(`
        ticket_code,
        total_paise,
        created_at,
        customer:profiles (full_name),
        items:booking_items (qty, label, section_name)
      `)
      .eq('event_id', eventId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new AppError('INTERNAL_ERROR', error.message);
    }

    const formatted = (bookings || []).map((b) => {
      const ticketCount = (b.items || []).reduce((sum, item) => sum + (item.qty || 0), 0);
      const seats = (b.items || []).map((i) => i.label || i.section_name).filter(Boolean);
      return {
        ticketCode: b.ticket_code,
        customerName: b.customer?.full_name || 'Customer',
        ticketCount,
        totalPaise: b.total_paise,
        seats,
        createdAt: b.created_at,
      };
    });

    res.json(formatted);
  } catch (err) {
    next(err);
  }
});

// GET /organiser/events/:id/payments (PRD §7.3)
router.get('/events/:id/payments', async (req, res, next) => {
  try {
    const supabase = getSupabaseAdmin();
    const eventId = req.params.id;

    await verifyOrganiserEvent(supabase, eventId, req.user.id);

    const { data: payments, error } = await supabase
      .from('payments')
      .select('attempt_no, method, status, failure_reason, amount_paise, created_at')
      .eq('event_id', eventId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new AppError('INTERNAL_ERROR', error.message);
    }

    const formatted = (payments || []).map((p) => ({
      attemptNo: p.attempt_no,
      method: p.method,
      status: p.status,
      failureReason: p.failure_reason,
      amountPaise: p.amount_paise,
      createdAt: p.created_at,
    }));

    res.json(formatted);
  } catch (err) {
    next(err);
  }
});

export default router;
