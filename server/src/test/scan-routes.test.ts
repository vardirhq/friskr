import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { createTestApp, cleanDb } from './helpers.js';
import { db } from '../db/client.js';
import { users, households, householdMembers, products, categories } from '../db/schema.js';
import type { FastifyInstance } from 'fastify';

let app: FastifyInstance;
let jwt: string;

beforeAll(async () => {
  await cleanDb();
  app = await createTestApp();
  const [user] = await db.insert(users).values({ email: 'scan@example.com' }).returning();
  const [hh] = await db.insert(households).values({ name: 'Test', inviteCode: 'FRISK-SC01' }).returning();
  await db.insert(householdMembers).values({ householdId: hh.id, userId: user.id, role: 'owner' });
  await db.insert(categories).values({ id: 'meieri', label: 'Meieri', icon: 'catDairy', hue: 198 }).onConflictDoNothing();
  await db.insert(products).values({
    name: 'Tine Melk', brand: 'Tine', categoryId: 'meieri', barcode: '7038010009887',
  });
  jwt = app.jwt.sign({ sub: user.id, householdId: hh.id });
});

afterAll(async () => { await cleanDb(); await app.close(); });

describe('GET /api/scan', () => {
  it('returns catalogue hit when barcode found', async () => {
    const res = await app.inject({
      method: 'GET', url: '/api/scan?barcode=7038010009887',
      headers: { authorization: `Bearer ${jwt}` },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().source).toBe('catalogue');
    expect(res.json().product.name).toBe('Tine Melk');
  });

  it('returns none for unknown barcode (mocking fetch)', async () => {
    vi.stubGlobal('fetch', async () => ({ ok: false }));
    const res = await app.inject({
      method: 'GET', url: '/api/scan?barcode=0000000000000',
      headers: { authorization: `Bearer ${jwt}` },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().source).toBe('none');
    vi.unstubAllGlobals();
  });

  it('returns 400 if barcode missing', async () => {
    const res = await app.inject({
      method: 'GET', url: '/api/scan',
      headers: { authorization: `Bearer ${jwt}` },
    });
    expect(res.statusCode).toBe(400);
  });
});
