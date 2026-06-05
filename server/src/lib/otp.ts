import { randomInt, randomBytes } from 'node:crypto';
import { eq, and, gt } from 'drizzle-orm';
import { db } from '../db/client.js';
import { users, otpCodes, refreshTokens } from '../db/schema.js';

export async function createOrFindUser(email: string) {
  const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (existing[0]) return existing[0];
  const [created] = await db.insert(users).values({ email }).returning();
  return created;
}

export async function issueOtp(userId: string): Promise<string> {
  await db
    .update(otpCodes)
    .set({ used: true })
    .where(and(eq(otpCodes.userId, userId), eq(otpCodes.used, false)));

  const code = String(randomInt(100000, 999999));
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
  await db.insert(otpCodes).values({ userId, code, expiresAt });
  return code;
}

export async function verifyOtp(email: string, code: string): Promise<string | null> {
  const userRows = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (!userRows[0]) return null;
  const userId = userRows[0].id;

  const now = new Date();
  const rows = await db
    .select()
    .from(otpCodes)
    .where(
      and(
        eq(otpCodes.userId, userId),
        eq(otpCodes.code, code),
        eq(otpCodes.used, false),
        gt(otpCodes.expiresAt, now)
      )
    )
    .limit(1);

  if (!rows[0]) return null;

  await db.update(otpCodes).set({ used: true }).where(eq(otpCodes.id, rows[0].id));
  return userId;
}

export async function issueRefreshToken(userId: string): Promise<string> {
  const token = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  await db.insert(refreshTokens).values({ userId, token, expiresAt });
  return token;
}

export async function rotateRefreshToken(
  token: string
): Promise<{ userId: string; newToken: string } | null> {
  const now = new Date();
  const rows = await db
    .select()
    .from(refreshTokens)
    .where(
      and(
        eq(refreshTokens.token, token),
        eq(refreshTokens.revoked, false),
        gt(refreshTokens.expiresAt, now)
      )
    )
    .limit(1);

  if (!rows[0]) return null;

  await db.update(refreshTokens).set({ revoked: true }).where(eq(refreshTokens.id, rows[0].id));

  const newToken = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  await db.insert(refreshTokens).values({ userId: rows[0].userId, token: newToken, expiresAt });

  return { userId: rows[0].userId, newToken };
}

export async function revokeRefreshToken(token: string): Promise<void> {
  await db.update(refreshTokens).set({ revoked: true }).where(eq(refreshTokens.token, token));
}
