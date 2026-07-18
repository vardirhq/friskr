import { randomInt, randomBytes, timingSafeEqual } from 'node:crypto';
import { eq, and, gt } from 'drizzle-orm';
import { db } from '../db/client.js';
import { users, otpCodes, refreshTokens } from '../db/schema.js';
import { hashOtp, hashToken } from './hash.js';

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
  // Store only a keyed hash of the code; the plaintext is emailed and never persisted.
  await db.insert(otpCodes).values({ userId, code: hashOtp(code), expiresAt });
  return code;
}

export async function verifyOtp(email: string, code: string): Promise<string | null> {
  // Strict validation before any crypto: exactly 6 digits. Rejects malformed
  // input cleanly instead of letting a length mismatch throw inside timingSafeEqual.
  if (!/^\d{6}$/.test(code)) return null;

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

  // Both sides are fixed-length hex digests, so timingSafeEqual can never see a
  // length mismatch. Compare the hash of the input against the stored hash.
  const storedBuf = Buffer.from(rows[0].code, 'hex');
  const inputBuf = Buffer.from(hashOtp(code), 'hex');
  if (storedBuf.length !== inputBuf.length || !timingSafeEqual(storedBuf, inputBuf)) return null;

  await db.update(otpCodes).set({ used: true }).where(eq(otpCodes.id, rows[0].id));
  return userId;
}

export async function issueRefreshToken(userId: string): Promise<string> {
  const token = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  // Persist only the hash; the plaintext lives solely on the client.
  await db.insert(refreshTokens).values({ userId, token: hashToken(token), expiresAt });
  return token;
}

export async function rotateRefreshToken(
  token: string
): Promise<{ userId: string; newToken: string } | null> {
  const now = new Date();
  const tokenHash = hashToken(token);

  // Atomic compare-and-swap: flip revoked false -> true in a single UPDATE guarded
  // by revoked = false. Postgres row-locks the match, so under concurrent refreshes
  // exactly one request gets a row back; every other request gets zero rows and is
  // rejected. This closes the replay/race window a select-then-update flow leaves open.
  const revoked = await db
    .update(refreshTokens)
    .set({ revoked: true })
    .where(
      and(
        eq(refreshTokens.token, tokenHash),
        eq(refreshTokens.revoked, false),
        gt(refreshTokens.expiresAt, now)
      )
    )
    .returning();

  if (!revoked[0]) return null;

  const newToken = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  await db.insert(refreshTokens).values({
    userId: revoked[0].userId,
    token: hashToken(newToken),
    expiresAt,
  });

  return { userId: revoked[0].userId, newToken };
}

export async function revokeRefreshToken(token: string, userId: string): Promise<void> {
  await db.update(refreshTokens).set({ revoked: true }).where(
    and(eq(refreshTokens.token, hashToken(token)), eq(refreshTokens.userId, userId))
  );
}
