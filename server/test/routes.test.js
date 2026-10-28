import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';

describe('API Route Protections & Validations', () => {
  describe('Auth & Role Guards', () => {
    it('GET /api/me without token should return 401 UNAUTHENTICATED', async () => {
      const res = await request(app).get('/api/me');
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHENTICATED');
    });

    it('POST /api/holds without token should return 401 UNAUTHENTICATED', async () => {
      const res = await request(app)
        .post('/api/holds')
        .send({ eventId: '00000000-0000-0000-0000-000000000000' });
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHENTICATED');
    });

    it('GET /api/bookings without token should return 401 UNAUTHENTICATED', async () => {
      const res = await request(app).get('/api/bookings');
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHENTICATED');
    });

    it('GET /api/organiser/events without token should return 401 UNAUTHENTICATED', async () => {
      const res = await request(app).get('/api/organiser/events');
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHENTICATED');
    });
  });

  describe('Validation & Headers', () => {
    it('POST /api/auth/signup with invalid email should return 400 VALIDATION_ERROR', async () => {
      const res = await request(app)
        .post('/api/auth/signup')
        .send({
          username: 'validuser',
          email: 'not-an-email',
          password: 'secretpassword',
          fullName: 'Valid User',
        });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('POST /api/auth/username-login with empty body should return 400 VALIDATION_ERROR', async () => {
      const res = await request(app)
        .post('/api/auth/username-login')
        .send({});
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('Undefined Routes', () => {
    it('GET /api/nonexistent should return 404 NOT_FOUND', async () => {
      const res = await request(app).get('/api/nonexistent');
      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });
  });

  describe('X-Instance-Id and X-Request-Id Headers', () => {
    it('Every response should carry X-Instance-Id and X-Request-Id', async () => {
      const res = await request(app).get('/api');
      expect(res.status).toBe(200);
      expect(res.headers['x-instance-id']).toBeDefined();
      expect(res.headers['x-request-id']).toBeDefined();
    });
  });
});
