import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestApp, cleanDb } from './helpers.js';
import { db } from '../db/client.js';
import { users, households, householdMembers } from '../db/schema.js';
import type { FastifyInstance } from 'fastify';

let app: FastifyInstance;
let jwt: string;

beforeAll(async () => {
  await cleanDb();
  app = await createTestApp();
  const [user] = await db.insert(users).values({ email: 'sse@example.com' }).returning();
  const [hh] = await db.insert(households).values({ name: 'SSE Test', inviteCode: 'FRISK-SS01' }).returning();
  await db.insert(householdMembers).values({ householdId: hh.id, userId: user.id, role: 'owner' });
  jwt = app.jwt.sign({ sub: user.id, householdId: hh.id });
});

afterAll(async () => { await cleanDb(); await app.close(); });

describe('GET /api/realtime/household', () => {
  it('returns 401 with no token', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/realtime/household' });
    expect(res.statusCode).toBe(401);
  });

  it('establishes SSE connection with valid token', async () => {
    const ticketRes = await app.inject({
      method: 'POST',
      url: '/api/realtime/ticket',
      headers: { authorization: `Bearer ${jwt}` },
    });
    expect(ticketRes.statusCode).toBe(200);

    const res = await app.inject({
      method: 'GET',
      url: `/api/realtime/household?ticket=${ticketRes.json().ticket}`,
      payloadAsStream: true,
    });
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toContain('text/event-stream');
  });

  it('rejects reuse of a realtime ticket', async () => {
    const ticketRes = await app.inject({
      method: 'POST',
      url: '/api/realtime/ticket',
      headers: { authorization: `Bearer ${jwt}` },
    });
    const ticket = ticketRes.json().ticket;
    const first = await app.inject({
      method: 'GET',
      url: `/api/realtime/household?ticket=${ticket}`,
      payloadAsStream: true,
    });
    expect(first.statusCode).toBe(200);
    first.raw.res.destroy();

    const second = await app.inject({
      method: 'GET',
      url: `/api/realtime/household?ticket=${ticket}`,
    });
    expect(second.statusCode).toBe(401);
  });
});
