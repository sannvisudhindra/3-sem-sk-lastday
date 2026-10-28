import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import express from 'express';
import request from 'supertest';
import { validate } from '../src/middleware/validate.js';
import { requireRole } from '../src/middleware/auth.js';
import { errorHandler } from '../src/middleware/errorHandler.js';
import { generateOtp, hashOtp, generatePaymentToken, hashPaymentToken } from '../src/services/otp.js';

describe('Middleware & Services Tests', () => {
  describe('Zod Validation Middleware', () => {
    const app = express();
    app.use(express.json());

    const schema = z.object({
      email: z.string().email(),
      qty: z.number().int().min(1).max(10),
    });

    app.post('/test-validate', validate(schema), (req, res) => {
      res.json({ ok: true, data: req.body });
    });
    app.use(errorHandler);

    it('should return 400 VALIDATION_ERROR on invalid input', async () => {
      const res = await request(app)
        .post('/test-validate')
        .send({ email: 'invalid-email', qty: 0 });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.details.issues.length).toBeGreaterThan(0);
    });

    it('should pass with 200 on valid input', async () => {
      const res = await request(app)
        .post('/test-validate')
        .send({ email: 'user@test.com', qty: 2 });

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
    });
  });

  describe('Role Guard Middleware', () => {
    const app = express();
    app.use(express.json());

    app.get('/customer-only', (req, res, next) => {
      req.user = { id: 'u1', role: 'customer' };
      next();
    }, requireRole('customer'), (req, res) => res.json({ ok: true }));

    app.get('/organiser-only', (req, res, next) => {
      req.user = { id: 'u1', role: 'customer' };
      next();
    }, requireRole('organiser'), (req, res) => res.json({ ok: true }));

    app.use(errorHandler);

    it('should allow customer on customer route', async () => {
      const res = await request(app).get('/customer-only');
      expect(res.status).toBe(200);
    });

    it('should return 403 FORBIDDEN when customer accesses organiser route', async () => {
      const res = await request(app).get('/organiser-only');
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });
  });

  describe('OTP & Payment Token Service', () => {
    it('should generate 6-digit numeric OTP and sha256 hash', () => {
      const otp = generateOtp();
      expect(otp).toMatch(/^\d{6}$/);

      const hash1 = hashOtp('pay-123', otp);
      const hash2 = hashOtp('pay-123', otp);
      expect(hash1).toBe(hash2);
      expect(hash1.length).toBe(64);
    });

    it('should generate secure 32-byte payment token and hash', () => {
      const token = generatePaymentToken();
      expect(typeof token).toBe('string');
      expect(token.length).toBeGreaterThan(30);

      const hash = hashPaymentToken(token);
      expect(hash.length).toBe(64);
    });
  });
});
