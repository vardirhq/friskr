import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from '../index.js';
import type { FastifyInstance } from 'fastify';

let app: FastifyInstance;

beforeAll(async () => {
  app = await buildApp({ logger: false });
  // Add a protected test route
  app.get('/test-protected', { preHandler: app.requireAuth }, async (req) => ({
    userId: req.user.userId,
  }));
  await app.ready();
});

afterAll(async () => { await app.close(); });

describe('requireAuth middleware', () => {
  it('rejects request with no token', async () => {
    const res = await app.inject({ method: 'GET', url: '/test-protected' });
    expect(res.statusCode).toBe(401);
    expect(res.json().code).toBe('UNAUTHORIZED');
  });

  it('rejects request with invalid token', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/test-protected',
      headers: { authorization: 'Bearer not-a-real-token' },
    });
    expect(res.statusCode).toBe(401);
    expect(res.json().code).toBe('UNAUTHORIZED');
  });

  it('accepts a valid JWT', async () => {
    const token = app.jwt.sign({ sub: 'user-123', householdId: null });
    const res = await app.inject({
      method: 'GET',
      url: '/test-protected',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().userId).toBe('user-123');
  });
});
