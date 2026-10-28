import rateLimit from 'express-rate-limit';
import { AppError } from './errorHandler.js';

// Auth routes: 10 req/min per IP (PRD §7.4)
export const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next) => {
    next(new AppError('RATE_LIMITED', 'Too many authentication attempts. Please try again later.'));
  },
});

// Holds creation: 20 req/min per user ID (PRD §7.4)
export const holdLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  keyGenerator: (req) => req.user?.id || req.ip,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next) => {
    next(new AppError('RATE_LIMITED', 'Too many hold attempts. Please slow down.'));
  },
});

// Payments & OTP: 10 req/min per user ID (PRD §7.4)
export const paymentLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  keyGenerator: (req) => req.user?.id || req.ip,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next) => {
    next(new AppError('RATE_LIMITED', 'Too many payment requests. Please try again later.'));
  },
});
