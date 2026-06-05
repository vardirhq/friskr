import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestApp, cleanDb } from './helpers.js';
import { db } from '../db/client.js';
import { users, households, householdMembers, categories } from '../db/schema.js';
import type { FastifyInstance } from 'fastify';

let app: FastifyInstance;
let jwt: string;
let householdId: string;

beforeAll(async () => {
  app = await createTestApp();
  await cleanDb();
  const [user] = await db.insert(users).values({ email: 'prod@example.com' }).returning();
  const [hh] = await db.insert(households).values({ name: 'ProdHH', inviteCode: 'PROD-HH' }).returning();
  householdId = hh.id;
  await db.insert(householdMembers).values({ householdId: hh.id, userId: user.id, role: 'owner' });
  await db.insert(categories).values({ id: 'meieri', label: 'Meieri', icon: 'cat', hue: 200, sort: 1 }).onConflictDoNothing();
  jwt = app.jwt.sign({ sub: user.id, householdId: hh.id });
});

afterAll(async () => {
  await cleanDb();
  await app.close();
});

describe('GET /api/products', () => {
  it('returns global + household products', async () => {
    const res = await app.inject({
      method: 'GET', url: '/api/products',
      headers: { authorization: `Bearer ${jwt}` },
    });
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.json())).toBe(true);
  });
});

describe('POST /api/products', () => {
  it('creates a household product', async () => {
    const res = await app.inject({
      method: 'POST', url: '/api/products',
      headers: { authorization: `Bearer ${jwt}` },
      payload: { name: 'Yoghurt', brand: 'Yoplait', categoryId: 'meieri', defaultShelfDays: 7 },
    });
    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.name).toBe('Yoghurt');
    expect(body.householdId).toBe(householdId);
  });
});
