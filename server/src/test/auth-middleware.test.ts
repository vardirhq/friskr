import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { createTestApp, cleanDb } from './helpers.js';
import { db } from '../db/client.js';
import { householdMembers, households, users } from '../db/schema.js';
import type { FastifyInstance } from 'fastify';

let app: FastifyInstance;

beforeAll(async () => {
  app = await createTestApp();
  // Add a protected test route
  app.get('/test-protected', { preHandler: app.requireAuth }, async (req) => ({
    userId: req.user.userId,
  }));
  await app.ready();
});

beforeEach(cleanDb);
afterAll(async () => { await cleanDb(); await app.close(); });

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
    const [user] = await db.insert(users).values({ email: 'auth@example.com' }).returning();
    const token = app.jwt.sign({ sub: user.id, householdId: null });
    const res = await app.inject({
      method: 'GET',
      url: '/test-protected',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().userId).toBe(user.id);
  });

  it('rejects a token after household membership is removed', async () => {
    const [user] = await db.insert(users).values({ email: 'removed@example.com' }).returning();
    const [household] = await db.insert(households)
      .values({ name: 'Removed', inviteCode: 'FRISK-RM01' })
      .returning();
    await db.insert(householdMembers)
      .values({ householdId: household.id, userId: user.id, role: 'member' });
    const token = app.jwt.sign({ sub: user.id, householdId: household.id });

    await db.delete(householdMembers);
    const res = await app.inject({
      method: 'GET',
      url: '/test-protected',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(401);
    expect(res.json().code).toBe('SESSION_STALE');
  });
});
