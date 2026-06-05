import { randomInt, randomBytes, timingSafeEqual } from 'node:crypto';
import { eq, and, gt } from 'drizzle-orm';
import { db } from '../db/client.js';
import { users, otpCodes, refreshTokens } from '../db/schema.js';

export async function createOrFindUser(email: string) {
  // ON CONFLICT DO UPDATE with a no-op set avoids TOCTOU between select and insert
  const [row] = await db
    .insert(users)
    .values({ email })
    .onConflictDoUpdate({ target: users.email, set: { email } })
    .returning();
  return row;
}

export async function issueOtp(userId: string): Promise<string> {
  await db
    .update(otpCodes)
    .set({ used: true })
    .where(and(eq(otpCodes.userId, userId), eq(otpCodes.used, false)));

  // randomInt(min, max) is exclusive of max — use 1_000_000 for full [100000, 999999] range
  const code = String(randomInt(100_000, 1_000_000));
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
  await db.insert(otpCodes).values({ userId, code, expiresAt });
  return code;
}

export async function verifyOtp(email: string, code: string): Promise<string | null> {
  const userRows = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (!userRows[0]) return null;
  const userId = userRows[0].id;

  const now = new Date();
  // Fetch by userId only; compare code in app to avoid timing side-channel via DB query plan
  const rows = await db
    .select()
    .from(otpCodes)
    .where(
      and(
        eq(otpCodes.userId, userId),
        eq(otpCodes.used, false),
        gt(otpCodes.expiresAt, now)
      )
    )
    .limit(1);

  if (!rows[0]) return null;

  const storedBuf = Buffer.from(rows[0].code.padStart(6, '0'));
  const inputBuf = Buffer.from(code.padStart(6, '0'));
  if (!timingSafeEqual(storedBuf, inputBuf)) return null;

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
