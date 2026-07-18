import { describe, it, expect, beforeAll, beforeEach, afterAll, vi } from 'vitest';
import { createTestApp, cleanDb } from './helpers.js';
import { db } from '../db/client.js';
import {
  users, households, householdMembers, products, locations, stockItems, categories,
} from '../db/schema.js';
import { issueRefreshToken, rotateRefreshToken } from '../lib/otp.js';
import { issueRealtimeTicket, consumeRealtimeTicket, sweepExpiredTickets } from '../lib/realtime-tickets.js';
import { eq } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';

vi.mock('../lib/email.js', () => ({
  sendOtpEmail: vi.fn().mockResolvedValue(undefined),
  sendInviteEmail: vi.fn().mockResolvedValue(undefined),
}));
import { sendOtpEmail } from '../lib/email.js';

let app: FastifyInstance;

beforeAll(async () => { app = await createTestApp(); });
beforeEach(async () => { vi.clearAllMocks(); await cleanDb(); });
afterAll(async () => { await cleanDb(); await app.close(); });

async function loginEmail(email: string) {
  await app.inject({ method: 'POST', url: '/auth/otp/request', payload: { email } });
  const code = (sendOtpEmail as ReturnType<typeof vi.fn>).mock.calls.at(-1)?.[1];
  const res = await app.inject({ method: 'POST', url: '/auth/otp/verify', payload: { email, code } });
  return res.json() as { jwt: string; refreshToken: string };
}

describe('refresh token rotation', () => {
  it('rejects replay of a rotated (old) token', async () => {
    const { refreshToken } = await loginEmail('replay@example.com');

    const first = await app.inject({ method: 'POST', url: '/auth/refresh', payload: { refreshToken } });
    expect(first.statusCode).toBe(200);

    // The original token has been rotated away and must no longer be accepted.
    const replay = await app.inject({ method: 'POST', url: '/auth/refresh', payload: { refreshToken } });
    expect(replay.statusCode).toBe(401);
  });

  it('is atomic under concurrent rotation — exactly one winner', async () => {
    const [user] = await db.insert(users).values({ email: 'race@example.com' }).returning();
    const token = await issueRefreshToken(user.id);

    // Fire two rotations of the same token concurrently. The compare-and-swap in
    // rotateRefreshToken must let only one succeed; the other must get null.
    const [a, b] = await Promise.all([
      rotateRefreshToken(token),
      rotateRefreshToken(token),
    ]);

    const winners = [a, b].filter((r) => r !== null);
    expect(winners).toHaveLength(1);
  });

  it('does not store the refresh token in plaintext', async () => {
    const { refreshToken } = await loginEmail('hashed@example.com');
    const rows = await db.select().from(users).where(eq(users.email, 'hashed@example.com'));
    const stored = await db.query.refreshTokens.findFirst({ where: (t, { eq: e }) => e(t.userId, rows[0].id) });
    expect(stored?.token).toBeDefined();
    expect(stored?.token).not.toBe(refreshToken);
    expect(stored?.token).toMatch(/^[a-f0-9]{64}$/); // sha256 hex
  });
});

describe('OTP input validation', () => {
  it('rejects malformed codes with 401, never a 500', async () => {
    await app.inject({ method: 'POST', url: '/auth/otp/request', payload: { email: 'otp@example.com' } });
    for (const code of ['1234567', 'abcdef', '12345', '', '12 456']) {
      const res = await app.inject({
        method: 'POST', url: '/auth/otp/verify', payload: { email: 'otp@example.com', code },
      });
      expect(res.statusCode).toBe(code === '' ? 400 : 401);
    }
  });
});

describe('cross-household integrity', () => {
  async function seedTwoHouseholds() {
    const [userA] = await db.insert(users).values({ email: 'a@example.com' }).returning();
    const [userB] = await db.insert(users).values({ email: 'b@example.com' }).returning();
    const [hhA] = await db.insert(households).values({ name: 'A', inviteCode: 'FRISK-AA01' }).returning();
    const [hhB] = await db.insert(households).values({ name: 'B', inviteCode: 'FRISK-BB01' }).returning();
    await db.insert(householdMembers).values({ householdId: hhA.id, userId: userA.id, role: 'owner' });
    await db.insert(householdMembers).values({ householdId: hhB.id, userId: userB.id, role: 'owner' });
    await db.insert(categories).values({ id: 'meieri', label: 'Meieri', icon: 'cat' }).onConflictDoNothing();
    await db.insert(locations).values({ id: 'kjoleskap', label: 'Kjøleskap', icon: 'locFridge' }).onConflictDoNothing();
    const [prodB] = await db.insert(products)
      .values({ name: 'B-melk', categoryId: 'meieri', householdId: hhB.id }).returning();
    return { userA, hhA, hhB, prodB };
  }

  it('the API rejects stocking another household\'s product', async () => {
    const { userA, hhA, prodB } = await seedTwoHouseholds();
    const jwt = app.jwt.sign({ sub: userA.id, householdId: hhA.id });
    const res = await app.inject({
      method: 'POST', url: '/api/stock',
      headers: { authorization: `Bearer ${jwt}` },
      payload: { productId: prodB.id, locationId: 'kjoleskap', quantity: 1 },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().code).toBe('INVALID_INPUT');
  });

  it('the database trigger blocks a direct cross-household insert', async () => {
    const { hhA, prodB } = await seedTwoHouseholds();
    await expect(
      db.insert(stockItems).values({
        householdId: hhA.id,          // household A
        productId: prodB.id,          // product owned by household B
        locationId: 'kjoleskap',
        quantity: '1',
      }),
    ).rejects.toThrow();
  });
});

describe('account deletion and ownership transfer', () => {
  it('promotes the remaining member to owner when the owner deletes', async () => {
    const [owner] = await db.insert(users).values({ email: 'owner@example.com' }).returning();
    const [member] = await db.insert(users).values({ email: 'member@example.com' }).returning();
    const [hh] = await db.insert(households).values({ name: 'Shared', inviteCode: 'FRISK-SH01' }).returning();
    await db.insert(householdMembers).values({ householdId: hh.id, userId: owner.id, role: 'owner' });
    await db.insert(householdMembers).values({ householdId: hh.id, userId: member.id, role: 'member' });

    const jwt = app.jwt.sign({ sub: owner.id, householdId: hh.id });
    const res = await app.inject({ method: 'DELETE', url: '/api/me', headers: { authorization: `Bearer ${jwt}` } });
    expect(res.statusCode).toBe(200);

    const remaining = await db.select().from(householdMembers).where(eq(householdMembers.householdId, hh.id));
    expect(remaining).toHaveLength(1);
    expect(remaining[0].userId).toBe(member.id);
    expect(remaining[0].role).toBe('owner');
    const stillThere = await db.select().from(households).where(eq(households.id, hh.id));
    expect(stillThere).toHaveLength(1);
  });

  it('deletes the household when the last member deletes their account', async () => {
    const [solo] = await db.insert(users).values({ email: 'solo@example.com' }).returning();
    const [hh] = await db.insert(households).values({ name: 'Solo', inviteCode: 'FRISK-SO01' }).returning();
    await db.insert(householdMembers).values({ householdId: hh.id, userId: solo.id, role: 'owner' });

    const jwt = app.jwt.sign({ sub: solo.id, householdId: hh.id });
    const res = await app.inject({ method: 'DELETE', url: '/api/me', headers: { authorization: `Bearer ${jwt}` } });
    expect(res.statusCode).toBe(200);

    const gone = await db.select().from(households).where(eq(households.id, hh.id));
    expect(gone).toHaveLength(0);
  });
});

describe('realtime ticket lifecycle', () => {
  it('drops expired-but-unconsumed tickets on sweep', () => {
    const ticket = issueRealtimeTicket('u1', 'h1');
    // Sweep as if the TTL had elapsed; the ticket must then be gone.
    sweepExpiredTickets(Date.now() + 40_000);
    expect(consumeRealtimeTicket(ticket)).toBeNull();
  });

  it('consumes a valid ticket exactly once', () => {
    const ticket = issueRealtimeTicket('u2', 'h2');
    expect(consumeRealtimeTicket(ticket)).toMatchObject({ userId: 'u2', householdId: 'h2' });
    expect(consumeRealtimeTicket(ticket)).toBeNull();
  });
});
