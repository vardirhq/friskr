import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../db/client.js';
import { users, otpCodes } from '../db/schema.js';
import { createOrFindUser, issueOtp, verifyOtp } from '../lib/otp.js';
import { cleanDb } from './helpers.js';
import { eq } from 'drizzle-orm';

beforeEach(cleanDb);

describe('OTP flow', () => {
  it('creates a user on first OTP request', async () => {
    const user = await createOrFindUser('test@example.com');
    const [row] = await db.select().from(users).where(eq(users.email, 'test@example.com'));
    expect(row.id).toBe(user.id);
  });

  it('returns existing user on second request', async () => {
    const u1 = await createOrFindUser('test@example.com');
    const u2 = await createOrFindUser('test@example.com');
    expect(u1.id).toBe(u2.id);
  });

  it('issueOtp stores a 6-digit code with 10min TTL', async () => {
    const user = await createOrFindUser('test@example.com');
    const code = await issueOtp(user.id);
    expect(code).toMatch(/^\d{6}$/);
    const [row] = await db.select().from(otpCodes).where(eq(otpCodes.userId, user.id));
    expect(row.used).toBe(false);
    expect(row.expiresAt.getTime()).toBeGreaterThan(Date.now() + 9 * 60 * 1000);
  });

  it('verifyOtp returns userId on correct code', async () => {
    const user = await createOrFindUser('test@example.com');
    const code = await issueOtp(user.id);
    const result = await verifyOtp('test@example.com', code);
    expect(result).toBe(user.id);
  });

  it('verifyOtp returns null on wrong code', async () => {
    const user = await createOrFindUser('test@example.com');
    await issueOtp(user.id);
    const result = await verifyOtp('test@example.com', '000000');
    expect(result).toBeNull();
  });

  it('verifyOtp returns null on reuse', async () => {
    const user = await createOrFindUser('test@example.com');
    const code = await issueOtp(user.id);
    await verifyOtp('test@example.com', code);
    const result = await verifyOtp('test@example.com', code);
    expect(result).toBeNull();
  });

  it('verifyOtp returns null on expired code', async () => {
    const user = await createOrFindUser('test@example.com');
    const code = await issueOtp(user.id);
    // Backdate the expiry directly in the DB
    await db.update(otpCodes)
      .set({ expiresAt: new Date(Date.now() - 1000) })
      .where(eq(otpCodes.userId, user.id));
    const result = await verifyOtp('test@example.com', code);
    expect(result).toBeNull();
  });
});
