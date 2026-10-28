import express from 'express';
import { z } from 'zod';
import { callRpc } from '../lib/rpc.js';
import { getSupabaseAdmin } from '../services/supabaseAdmin.js';
import { config } from '../config.js';
import { AppError } from '../middleware/errorHandler.js';
import { validate } from '../middleware/validate.js';
import { holdLimiter } from '../middleware/rateLimiters.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

const holdSchema = z.object({
  eventId: z.string().uuid(),
  seatIds: z.array(z.string().uuid()).optional(),
  sections: z
    .array(
      z.object({
        sectionId: z.string().uuid(),
        qty: z.number().int().min(1).max(10),
      })
    )
    .optional(),
});

// POST /holds (PRD §7.3 & WORK_DISTRIBUTION §4.1)
router.post('/', requireAuth, holdLimiter, validate(holdSchema), async (req, res, next) => {
  try {
    const idempotencyKey = req.headers['idempotency-key'] || req.headers['x-idempotency-key'];
    if (!idempotencyKey) {
      throw new AppError('VALIDATION_ERROR', 'Idempotency-Key header is required for holds');
    }

    const { eventId, seatIds, sections } = req.body;

    const result = await callRpc('create_hold', {
      p_user: req.user.id,
      p_event: eventId,
      p_seat_ids: seatIds || [],
      p_sections: sections || [],
      p_idem: idempotencyKey,
      p_hold_seconds: config.business.holdSeconds,
      p_max_tickets: config.business.maxTicketsPerUser,
    });

    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

// GET /holds/:id (PRD §7.3)
router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const supabase = getSupabaseAdmin();
    const { data: hold, error } = await supabase
      .from('holds')
      .select(`
        id,
        event_id,
        status,
        expires_at,
        created_at,
        items:hold_items (
          id,
          seat_id,
          section_id,
          qty,
          unit_price_paise,
          label,
          section_name
        )
      `)
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .maybeSingle();

    if (error || !hold) {
      throw new AppError('NOT_FOUND', 'Hold not found');
    }

    const expiresAt = new Date(hold.expires_at).getTime();
    const secondsLeft = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));

    res.json({
      ...hold,
      secondsLeft,
      isExpired: secondsLeft <= 0,
    });
  } catch (err) {
    next(err);
  }
});

// POST /holds/:id/release (PRD §7.3)
router.post('/:id/release', requireAuth, async (req, res, next) => {
  try {
    const result = await callRpc('release_hold', {
      p_user: req.user.id,
      p_hold: req.params.id,
    });
    res.json(result || { released: true });
  } catch (err) {
    next(err);
  }
});

export default router;
