import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import pino from 'pino';
import pinoHttp from 'pino-http';
import crypto from 'crypto';
import { config } from './config.js';
import { errorHandler, AppError } from './middleware/errorHandler.js';

const app = express();

// Security headers
app.use(helmet());

// Cross-origin resource sharing
app.use(
  cors({
    origin: [config.clientUrl, 'http://localhost:5173', 'http://localhost:3000'],
    credentials: true,
  })
);

// Payload size limit
app.use(express.json({ limit: '50kb' }));

// Request ID and Instance ID headers
app.use((req, res, next) => {
  const reqId = req.headers['x-request-id'] || crypto.randomUUID();
  req.id = reqId;
  res.setHeader('X-Request-Id', reqId);
  res.setHeader('X-Instance-Id', config.instanceId);
  next();
});

// Logging with pino
const logger = pino({
  level: config.nodeEnv === 'test' ? 'silent' : 'info',
});
app.use(pinoHttp({ logger }));

// Global Rate Limiter: 300 requests per minute per IP (PRD §7.4)
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

// Root API Welcome / Status
app.get('/api', (req, res) => {
  res.json({
    name: 'Encore API',
    status: 'operational',
    instance: config.instanceId,
  });
});

// Central error handler (must be last)
app.use(errorHandler);

export default app;

