import type { FastifyInstance } from 'fastify';
import { eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import { householdMembers, refreshTokens, users, stockItems, households } from '../db/schema.js';
import { sendOtpEmail } from '../lib/email.js';
import {
  createOrFindUser, issueOtp, verifyOtp,
  issueRefreshToken, rotateRefreshToken, revokeRefreshToken,
} from '../lib/otp.js';

async function getHouseholdId(userId: string): Promise<string | null> {
  const rows = await db
    .select({ householdId: householdMembers.householdId })
    .from(householdMembers)
    .where(eq(householdMembers.userId, userId))
    .limit(1);
  return rows[0]?.householdId ?? null;
}

export async function authRoutes(app: FastifyInstance) {
  app.post('/auth/otp/request', {
    config: { rateLimit: { max: process.env.NODE_ENV === 'test' ? 1000 : 5, timeWindow: '10 minutes' } },
  }, async (req, reply) => {
    const { email } = req.body as { email?: string };
    if (!email || !email.includes('@')) {
      return reply.code(400).send({ error: 'Valid email required', code: 'INVALID_INPUT' });
    }
    const user = await createOrFindUser(email.toLowerCase().trim());
    const code = await issueOtp(user.id);
    await sendOtpEmail(user.email, code);
    return { ok: true };
  });

  app.post('/auth/otp/verify', {
    config: { rateLimit: { max: process.env.NODE_ENV === 'test' ? 1000 : 10, timeWindow: '10 minutes' } },
  }, async (req, reply) => {
    const { email, code } = req.body as { email?: string; code?: string };
    if (!email || !code) {
      return reply.code(400).send({ error: 'email and code required', code: 'INVALID_INPUT' });
    }
    const userId = await verifyOtp(email.toLowerCase().trim(), code.trim());
    if (!userId) {
      return reply.code(401).send({ error: 'Invalid or expired code', code: 'UNAUTHORIZED' });
    }
    const householdId = await getHouseholdId(userId);
    const jwt = app.jwt.sign({ sub: userId, householdId });
    const refreshToken = await issueRefreshToken(userId);
    return { jwt, refreshToken };
  });

  app.post('/auth/refresh', {
    config: { rateLimit: { max: process.env.NODE_ENV === 'test' ? 1000 : 60, timeWindow: '10 minutes' } },
  }, async (req, reply) => {
    const { refreshToken } = req.body as { refreshToken?: string };
    if (!refreshToken) {
      return reply.code(400).send({ error: 'refreshToken required', code: 'INVALID_INPUT' });
    }
    const result = await rotateRefreshToken(refreshToken);
    if (!result) {
      return reply.code(401).send({ error: 'Invalid or expired refresh token', code: 'UNAUTHORIZED' });
    }
    const householdId = await getHouseholdId(result.userId);
    const jwt = app.jwt.sign({ sub: result.userId, householdId });
    return { jwt, refreshToken: result.newToken };
  });

  app.post('/auth/signout', { preHandler: app.requireAuth }, async (req, _reply) => {
    const body = (req.body ?? {}) as { refreshToken?: string };
    const userId = req.user.userId;
    if (body.refreshToken) {
      await revokeRefreshToken(body.refreshToken, userId);
    } else {
      await db.update(refreshTokens).set({ revoked: true }).where(eq(refreshTokens.userId, userId));
    }
    return { ok: true };
  });

  app.get('/api/me', { preHandler: app.requireAuth }, async (req, reply) => {
    const { userId } = req.user;
    const [user] = await db.select({ id: users.id, email: users.email }).from(users).where(eq(users.id, userId)).limit(1);
    if (!user) return reply.code(404).send({ error: 'User not found', code: 'NOT_FOUND' });
    return user;
  });

  app.patch('/api/me', { preHandler: app.requireAuth }, async (req, reply) => {
    const { userId, householdId } = req.user;
    const { displayName } = (req.body ?? {}) as { displayName?: string };
    if (!displayName?.trim()) return reply.code(400).send({ error: 'displayName required', code: 'INVALID_INPUT' });
    if (householdId) {
      await db.update(householdMembers)
        .set({ displayName: displayName.trim() })
        .where(eq(householdMembers.userId, userId));
    }
    return { ok: true };
  });

  app.delete('/api/me', { preHandler: app.requireAuth }, async (req, _reply) => {
    const { userId } = req.user;
    await db.transaction(async (tx) => {
      const [self] = await tx.select().from(householdMembers)
        .where(eq(householdMembers.userId, userId))
        .limit(1);

      if (self) {
        const members = await tx.select().from(householdMembers)
          .where(eq(householdMembers.householdId, self.householdId))
          .orderBy(householdMembers.joinedAt);

        if (members.length === 1) {
          await tx.delete(households).where(eq(households.id, self.householdId));
        } else if (self.role === 'owner') {
          const newOwner = members.find((member) => member.userId !== userId);
          if (newOwner) {
            await tx.update(householdMembers)
              .set({ role: 'owner' })
              .where(eq(householdMembers.id, newOwner.id));
          }
        }
      }

      await tx.update(stockItems).set({ addedBy: null }).where(eq(stockItems.addedBy, userId));
      await tx.update(refreshTokens).set({ revoked: true }).where(eq(refreshTokens.userId, userId));
      await tx.delete(householdMembers).where(eq(householdMembers.userId, userId));
      await tx.delete(users).where(eq(users.id, userId));
    });
    return { ok: true };
  });
}
