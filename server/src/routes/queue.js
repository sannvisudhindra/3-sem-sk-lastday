import express from 'express';
import { callRpc } from '../lib/rpc.js';
import { config } from '../config.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// POST /events/:id/queue/join (PRD §7.3 & WORK_DISTRIBUTION §4.1)
export async function joinQueueHandler(req, res, next) {
  try {
    const result = await callRpc('queue_join', {
      p_user: req.user.id,
      p_event: req.params.id,
      p_max_active: config.business.queueMaxActive,
      p_admission_seconds: config.business.queueAdmissionSeconds,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
}

// GET /queue/:entryId (PRD §7.3)
router.get('/:entryId', requireAuth, async (req, res, next) => {
  try {
    const result = await callRpc('queue_status', {
      p_user: req.user.id,
      p_entry: req.params.entryId,
      p_max_active: config.business.queueMaxActive,
      p_admission_seconds: config.business.queueAdmissionSeconds,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
