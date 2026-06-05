import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { createTestApp, cleanDb } from './helpers.js';
import { db } from '../db/client.js';
import { users, households, householdMembers, products, locations, stockItems, categories } from '../db/schema.js';
import type { FastifyInstance } from 'fastify';

let app: FastifyInstance;
let jwt: string;
let householdId: string;
let productId: string;

beforeAll(async () => {
  app = await createTestApp();
  await cleanDb();

  const [user] = await db.insert(users).values({ email: 'test@example.com' }).returning();
  const [hh] = await db.insert(households).values({ name: 'Test', inviteCode: 'FRISK-TEST' }).returning();
  householdId = hh.id;
  await db.insert(householdMembers).values({
    householdId: hh.id, userId: user.id, role: 'owner', displayName: 'Tester',
  });

  await db.insert(categories).values({ id: 'meieri', label: 'Meieri', icon: 'cat', hue: 200, sort: 1 }).onConflictDoNothing();

  const [prod] = await db
    .insert(products)
    .values({ name: 'Melk', brand: 'Tine', categoryId: 'meieri', householdId: hh.id })
    .returning();
  productId = prod.id;

  await db
    .insert(locations)
    .values({ id: 'kjoleskap', label: 'Kjøleskap', icon: 'locFridge', hue: 198 })
    .onConflictDoNothing();

  jwt = app.jwt.sign({ sub: user.id, householdId: hh.id });
});

beforeEach(async () => {
  await db.delete(stockItems);
});

afterAll(async () => {
  await cleanDb();
  await app.close();
});

describe('GET /api/stock', () => {
  it('returns empty list when no items', async () => {
    const res = await app.inject({
      method: 'GET', url: '/api/stock',
      headers: { authorization: `Bearer ${jwt}` },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual([]);
  });
});

describe('POST /api/stock', () => {
  it('creates a stock item and returns it', async () => {
    const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
    const res = await app.inject({
      method: 'POST', url: '/api/stock',
      headers: { authorization: `Bearer ${jwt}` },
      payload: {
        productId, locationId: 'kjoleskap',
        quantity: 2, expiryDate: tomorrow.toISOString().slice(0, 10),
      },
    });
    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.id).toBeDefined();
    expect(body.pid).toBe(productId);
    expect(body.qty).toBe(2);
    expect(body.status).toBe('in_stock');
  });
});

describe('PATCH /api/stock/:id/consume', () => {
  it('marks item as used_up', async () => {
    const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
    const createRes = await app.inject({
      method: 'POST', url: '/api/stock',
      headers: { authorization: `Bearer ${jwt}` },
      payload: { productId, locationId: 'kjoleskap', quantity: 1, expiryDate: tomorrow.toISOString().slice(0, 10) },
    });
    const itemId = createRes.json().id;

    const res = await app.inject({
      method: 'PATCH', url: `/api/stock/${itemId}/consume`,
      headers: { authorization: `Bearer ${jwt}` },
    });
    expect(res.statusCode).toBe(200);

    const listRes = await app.inject({
      method: 'GET', url: '/api/stock',
      headers: { authorization: `Bearer ${jwt}` },
    });
    expect(listRes.json()).toHaveLength(0);
  });
});
