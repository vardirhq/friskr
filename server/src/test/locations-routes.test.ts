import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestApp, cleanDb } from './helpers.js';
import { db } from '../db/client.js';
import { users, households, householdMembers, locations } from '../db/schema.js';
import type { FastifyInstance } from 'fastify';

let app: FastifyInstance;
let jwt: string;
let householdId: string;

beforeAll(async () => {
  app = await createTestApp();
  await cleanDb();
  const [user] = await db.insert(users).values({ email: 'loc@example.com' }).returning();
  const [hh] = await db.insert(households).values({ name: 'LocHH', inviteCode: 'LOC-HH' }).returning();
  householdId = hh.id;
  await db.insert(householdMembers).values({ householdId: hh.id, userId: user.id, role: 'owner' });
  await db.insert(locations).values({ id: 'kjoleskap', label: 'Kjøleskap', icon: 'locFridge', hue: 198 }).onConflictDoNothing();
  jwt = app.jwt.sign({ sub: user.id, householdId: hh.id });
});

afterAll(async () => {
  await cleanDb();
  await app.close();
});

describe('GET /api/locations', () => {
  it('returns shared + household locations', async () => {
    const res = await app.inject({
      method: 'GET', url: '/api/locations',
      headers: { authorization: `Bearer ${jwt}` },
    });
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.json())).toBe(true);
    expect(res.json().length).toBeGreaterThan(0);
  });
});

describe('POST /api/locations', () => {
  it('creates a household location', async () => {
    const res = await app.inject({
      method: 'POST', url: '/api/locations',
      headers: { authorization: `Bearer ${jwt}` },
      payload: { label: 'Bod', icon: 'locBox', hue: 30 },
    });
    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.label).toBe('Bod');
    expect(body.householdId).toBe(householdId);
  });
});

describe('PATCH /api/locations/:id', () => {
  it('updates a household location', async () => {
    const createRes = await app.inject({
      method: 'POST', url: '/api/locations',
      headers: { authorization: `Bearer ${jwt}` },
      payload: { label: 'Skuff', icon: 'locBox', hue: 45 },
    });
    const locId = createRes.json().id;

    const res = await app.inject({
      method: 'PATCH', url: `/api/locations/${locId}`,
      headers: { authorization: `Bearer ${jwt}` },
      payload: { label: 'Stor skuff', hue: 50 },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().label).toBe('Stor skuff');
  });
});

describe('DELETE /api/locations/:id', () => {
  it('deletes a household location with no items', async () => {
    const createRes = await app.inject({
      method: 'POST', url: '/api/locations',
      headers: { authorization: `Bearer ${jwt}` },
      payload: { label: 'Tom plass', icon: 'locBox', hue: 60 },
    });
    const locId = createRes.json().id;

    const res = await app.inject({
      method: 'DELETE', url: `/api/locations/${locId}`,
      headers: { authorization: `Bearer ${jwt}` },
    });
    expect(res.statusCode).toBe(200);
  });
});
