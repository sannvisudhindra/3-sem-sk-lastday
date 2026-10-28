import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import pino from 'pino';
import pinoHttp from 'pino-http';
import crypto from 'crypto';
import { config } from './config.js';
import { errorHandler, AppError } from './middleware/errorHandler.js';
import { requireAuth } from './middleware/auth.js';

// Route imports
import authRoutes from './routes/auth.js';
import sessionRoutes from './routes/session.js';
import eventsRoutes from './routes/events.js';
import queueRoutes from './routes/queue.js';
import holdsRoutes from './routes/holds.js';
import paymentsRoutes from './routes/payments.js';
import bookingsRoutes from './routes/bookings.js';
import venuesRoutes from './routes/venues.js';
import organiserRoutes from './routes/organiser.js';

const app = express();

// Security headers (PRD §7.1)
app.use(helmet());

// Cross-origin resource sharing (PRD §7.1: allowlist CLIENT_URL)
app.use(
  cors({
    origin: [config.clientUrl, 'http://localhost:5173', 'http://localhost:3000'],
    credentials: true,
  })
);

// Payload size limit: 50kb (PRD §7.1)
app.use(express.json({ limit: '50kb' }));

// Request ID and Instance ID headers (PRD §7.1 & §15)
app.use((req, res, next) => {
  const reqId = req.headers['x-request-id'] || crypto.randomUUID();
  req.id = reqId;
  res.setHeader('X-Request-Id', reqId);
  res.setHeader('X-Instance-Id', config.instanceId);
  next();
});

// Logging with pino (PRD §7.1)
const logger = pino({
  level: config.nodeEnv === 'test' ? 'silent' : 'info',
});
app.use(pinoHttp({ logger }));

// Global Rate Limiter: 300 requests per minute per IP (PRD §7.1 & §7.4)
const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next) => {
    next(new AppError('RATE_LIMITED', 'Too many requests. Please try again later.'));
  },
});
app.use(globalLimiter);

// Health check endpoint (PRD §7.3)
app.get('/healthz', (req, res) => {
  res.status(200).json({
    ok: true,
    instance: config.instanceId,
    db: true,
  });
});

// API Routes Mounting (PRD §7.3)
app.use('/api/auth', authRoutes);
app.use('/api/session', sessionRoutes);
app.use('/api/events', eventsRoutes);
app.use('/api/queue', queueRoutes);
app.use('/api/holds', holdsRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/bookings', bookingsRoutes);
app.use('/api/venues', venuesRoutes);
app.use('/api/organiser', organiserRoutes);

// GET /api/me (PRD §7.3)
app.get('/api/me', requireAuth, (req, res) => {
  res.json({
    id: req.user.id,
    role: req.user.role,
    username: req.user.username,
    fullName: req.user.fullName,
    email: req.user.email,
  });
});

// Root /api Status
app.get('/api', (req, res) => {
  res.json({
    name: 'Encore API',
    status: 'operational',
    instance: config.instanceId,
  });
});

// 404 handler for undefined routes
app.use((req, res, next) => {
  next(new AppError('NOT_FOUND', `Cannot ${req.method} ${req.path}`));
});

// Central error handler (must be last, PRD §7.1)
app.use(errorHandler);

export default app;
