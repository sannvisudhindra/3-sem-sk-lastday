import express from 'express';
import { z } from 'zod';
import crypto from 'crypto';
import { callRpc } from '../lib/rpc.js';
import { validate } from '../middleware/validate.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

const claimSchema = z.object({
  force: z.boolean().default(false),
  deviceLabel: z.string().optional().default('Web Browser'),
});

// POST /session/claim (PRD §7.3 & WORK_DISTRIBUTION §4.1)
router.post('/claim', requireAuth, validate(claimSchema), async (req, res, next) => {
  try {
    const { force, deviceLabel } = req.body;
    const sessionId =
      req.headers['x-session-id'] ||
      req.jwtPayload?.session_id ||
      crypto.randomUUID();

    const result = await callRpc('claim_session', {
      p_user: req.user.id,
      p_session: sessionId,
      p_device: deviceLabel,
      p_force: force,
    });

    res.json({
      claimed: true,
      sessionId,
      ...result,
    });
  } catch (err) {
    next(err);
  }
});

export default router;

