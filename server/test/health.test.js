import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';

describe('GET /healthz', () => {
  it('should return 200 with instance id and status', async () => {
    const res = await request(app).get('/healthz');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('ok', true);
    expect(res.body).toHaveProperty('instance');
    expect(res.body).toHaveProperty('db', true);
    expect(res.headers['x-instance-id']).toBeDefined();
    expect(res.headers['x-request-id']).toBeDefined();
  });
});

