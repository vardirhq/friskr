import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestApp, cleanDb } from './helpers.js';
import { db } from '../db/client.js';
import { users } from '../db/schema.js';
import type { FastifyInstance } from 'fastify';

let app: FastifyInstance;
let jwtNoHousehold: string;

beforeAll(async () => {
  await cleanDb();
  app = await createTestApp();
  const [user] = await db.insert(users).values({ email: 'hh@example.com' }).returning();
  jwtNoHousehold = app.jwt.sign({ sub: user.id, householdId: null });
});

afterAll(async () => { await cleanDb(); await app.close(); });

describe('POST /api/household', () => {
  it('creates a household and returns a new JWT with householdId', async () => {
    const res = await app.inject({
      method: 'POST', url: '/api/household',
      headers: { authorization: `Bearer ${jwtNoHousehold}` },
      payload: { name: 'Familien Test', displayName: 'Tester' },
    });
    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.jwt).toBeDefined();
    expect(body.household.name).toBe('Familien Test');
    expect(body.household.code).toMatch(/^FRISK-/);
    const payload = app.jwt.decode<{ sub: string; householdId: string }>(body.jwt);
    expect(payload?.householdId).toBeDefined();
  });
});

describe('POST /api/household/join', () => {
  it('joins a household by invite code', async () => {
    const [user2] = await db.insert(users).values({ email: 'hh2@example.com' }).returning();
    const jwt2 = app.jwt.sign({ sub: user2.id, householdId: null });

    const createRes = await app.inject({
      method: 'POST', url: '/api/household',
      headers: { authorization: `Bearer ${jwtNoHousehold}` },
      payload: { name: 'Delt Hus', displayName: 'Eier' },
    });
    const code = createRes.json().household.code;

    const joinRes = await app.inject({
      method: 'POST', url: '/api/household/join',
      headers: { authorization: `Bearer ${jwt2}` },
      payload: { code, displayName: 'Gjest' },
    });
    expect(joinRes.statusCode).toBe(200);
    const joinPayload = app.jwt.decode<{ householdId: string }>(joinRes.json().jwt);
    expect(joinPayload?.householdId).toBeDefined();
  });
});

describe('GET /api/household', () => {
  it('returns household info and members', async () => {
    const createRes = await app.inject({
      method: 'POST', url: '/api/household',
      headers: { authorization: `Bearer ${jwtNoHousehold}` },
      payload: { name: 'Get-test', displayName: 'Tester' },
    });
    const { jwt: newJwt } = createRes.json();
    const res = await app.inject({
      method: 'GET', url: '/api/household',
      headers: { authorization: `Bearer ${newJwt}` },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().name).toBe('Get-test');
    expect(res.json().members).toHaveLength(1);
  });
});
