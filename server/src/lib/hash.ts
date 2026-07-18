import { createHash, createHmac } from 'node:crypto';

/**
 * Hash a high-entropy secret (e.g. a 256-bit refresh token) for storage at rest.
 * A plain SHA-256 is sufficient here because the input is already random and
 * long — an attacker who steals the hash cannot feasibly brute-force it, and we
 * need a fast, deterministic value to look the row up by.
 */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/**
 * Keyed hash for low-entropy secrets (6-digit OTP codes). A plain hash of a
 * 6-digit code is trivially reversible offline, so we HMAC with a server-side
 * secret: without the pepper a leaked database row is useless.
 */
export function hashOtp(code: string): string {
  const secret = process.env.OTP_PEPPER ?? process.env.JWT_SECRET ?? 'test-only-secret';
  return createHmac('sha256', secret).update(code).digest('hex');
}
