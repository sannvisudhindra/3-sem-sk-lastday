import express from 'express';
import { z } from 'zod';
import { callRpc } from '../lib/rpc.js';
import { getSupabaseAdmin } from '../services/supabaseAdmin.js';
import { config } from '../config.js';
import { AppError } from '../middleware/errorHandler.js';
import { validate } from '../middleware/validate.js';
import { paymentLimiter } from '../middleware/rateLimiters.js';
import { requireAuth } from '../middleware/auth.js';
import {
  generateOtp,
  hashOtp,
  generatePaymentToken,
  hashPaymentToken,
} from '../services/otp.js';
import {
  sendOtpEmail,
  sendPaymentLinkEmail,
  sendTicketEmail,
} from '../services/mailer.js';

const router = express.Router();

const createPaymentSchema = z.object({
  holdId: z.string().uuid(),
  method: z.enum(['upi_qr', 'netbanking']),
});

const verifyOtpSchema = z.object({
  otp: z.string().min(4).max(8),
});

function maskEmail(email = '') {
  const parts = email.split('@');
  if (parts.length !== 2) return email;
  const name = parts[0];
  const maskedName = name.length > 2 ? `${name[0]}***${name[name.length - 1]}` : `${name[0]}***`;
  return `${maskedName}@${parts[1]}`;
}

// POST /payments (PRD §7.3 & §9)
router.post('/', requireAuth, paymentLimiter, validate(createPaymentSchema), async (req, res, next) => {
  try {
    const { holdId, method } = req.body;

    let token = null;
    let tokenHash = null;
    if (method === 'upi_qr') {
      token = generatePaymentToken();
      tokenHash = hashPaymentToken(token);
    }

    const result = await callRpc('create_payment', {
      p_user: req.user.id,
      p_hold: holdId,
      p_method: method,
      p_payment_seconds: config.business.paymentSeconds,
      p_max_attempts: config.business.maxPaymentAttempts,
      p_token_hash: tokenHash,
    });

    let qrUrl;
    let devLink;
    if (method === 'upi_qr' && token) {
      const confirmLink = `${config.clientUrl}/pay/${token}`;
      qrUrl = confirmLink;
      devLink = confirmLink;

      // Send email in background
      sendPaymentLinkEmail({
        to: req.user.email,
        link: confirmLink,
        amountPaise: result.amountPaise,
      }).catch((err) => req.log?.warn?.({ err }, 'Failed to send payment link email'));
    }

    res.status(201).json({
      ...result,
      qrUrl,
      ...(config.email.mode === 'console' && config.nodeEnv !== 'production' && devLink
        ? { devLink }
        : {}),
    });
  } catch (err) {
    next(err);
  }
});

// POST /payments/:id/send-otp (PRD §7.3)
router.post('/:id/send-otp', requireAuth, paymentLimiter, async (req, res, next) => {
  try {
    const paymentId = req.params.id;
    const otp = generateOtp();
    const otpHash = hashOtp(paymentId, otp);

    await callRpc('set_payment_otp', {
      p_user: req.user.id,
      p_payment: paymentId,
      p_otp_hash: otpHash,
    });

    // Send OTP email
    sendOtpEmail({
      to: req.user.email,
      otp,
      eventTitle: 'Ticket Checkout',
    }).catch((err) => req.log?.warn?.({ err }, 'Failed to send OTP email'));

    const emailHint = maskEmail(req.user.email);

    res.json({
      sent: true,
      emailHint,
      ...(config.email.mode === 'console' && config.nodeEnv !== 'production'
        ? { devOtp: otp }
        : {}),
    });
  } catch (err) {
    next(err);
  }
});

// POST /payments/:id/verify-otp (PRD §7.3)
router.post('/:id/verify-otp', requireAuth, paymentLimiter, validate(verifyOtpSchema), async (req, res, next) => {
  try {
    const paymentId = req.params.id;
    const { otp } = req.body;
    const otpHash = hashOtp(paymentId, otp);

    const result = await callRpc('verify_payment_otp', {
      p_user: req.user.id,
      p_payment: paymentId,
      p_otp_hash: otpHash,
      p_max_otp: config.business.maxOtpAttempts,
    });

    if (result.ok === false) {
      throw new AppError(result.code || 'OTP_INVALID', 'Invalid OTP verification code', result);
    }

    // Trigger ticket email in background
    if (result.bookingId) {
      const supabase = getSupabaseAdmin();
      supabase
        .from('bookings')
        .select(`
          id,
          ticket_code,
          total_paise,
          event:events (title),
          items:booking_items (qty, label, section_name)
        `)
        .eq('id', result.bookingId)
        .maybeSingle()
        .then(({ data: b }) => {
          if (b) {
            sendTicketEmail({
              to: req.user.email,
              booking: {
                ticketCode: b.ticket_code,
                totalPaise: b.total_paise,
                event: b.event,
                items: b.items,
              },
            }).catch(() => {});
          }
        })
        .catch(() => {});
    }

    res.json({
      status: 'succeeded',
      bookingId: result.bookingId,
    });
  } catch (err) {
    next(err);
  }
});

// GET /payments/link/:token (PRD §7.3: Public mock bank page)
router.get('/link/:token', async (req, res, next) => {
  try {
    const tokenHash = hashPaymentToken(req.params.token);
    const result = await callRpc('get_payment_by_token', {
      p_token_hash: tokenHash,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// POST /payments/link/:token/approve (PRD §7.3: Public token approval)
router.post('/link/:token/approve', async (req, res, next) => {
  try {
    const tokenHash = hashPaymentToken(req.params.token);
    const result = await callRpc('approve_payment_link', {
      p_token_hash: tokenHash,
    });

    if (result.ok === false) {
      throw new AppError(result.code || 'PAYMENT_EXPIRED', 'Payment link cannot be approved', result);
    }

    res.json({
      status: 'succeeded',
      bookingId: result.bookingId,
    });
  } catch (err) {
    next(err);
  }
});

// GET /payments/:id (PRD §7.3: Poll fallback)
router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const supabase = getSupabaseAdmin();
    const { data: payment, error } = await supabase
      .from('payments')
      .select('id, status, failure_reason, booking_id, expires_at')
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .maybeSingle();

    if (error || !payment) {
      throw new AppError('NOT_FOUND', 'Payment record not found');
    }

    res.json({
      status: payment.status,
      failureReason: payment.failure_reason,
      bookingId: payment.booking_id,
      expiresAt: payment.expires_at,
    });
  } catch (err) {
    next(err);
  }
});

export default router;

