import fp from 'fastify-plugin';
import jwtPlugin from '@fastify/jwt';
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { and, eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import { householdMembers, users } from '../db/schema.js';

export interface JWTPayload {
  sub: string;
  householdId: string | null;
}

// Augment @fastify/jwt so req.user has our mapped shape after requireAuth runs
declare module '@fastify/jwt' {
  interface FastifyJWT {
    user: { userId: string; householdId: string | null };
  }
}

declare module 'fastify' {
  interface FastifyInstance {
    requireAuth: (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

export const jwtAuthPlugin = fp(async (app: FastifyInstance) => {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret === 'change-me-256-bits' || secret === 'dev-secret-change-me') {
    if (process.env.NODE_ENV !== 'test') {
      throw new Error('JWT_SECRET must be configured with a strong, non-default value');
    }
  }

  await app.register(jwtPlugin, {
    secret: secret ?? 'test-only-secret',
    // Short-lived access token; clients transparently refresh via /auth/refresh
    // (rotating refresh tokens) on a 401. Tunable, but keep it minutes-to-an-hour.
    sign: { expiresIn: process.env.JWT_TTL ?? '1h' },
  });

  const requireAuth = async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      await req.jwtVerify();
      const payload = req.user as unknown as JWTPayload;
      const [user] = await db.select({ id: users.id }).from(users)
        .where(eq(users.id, payload.sub))
        .limit(1);
      if (!user) {
        return reply.code(401).send({ error: 'Authentication required', code: 'UNAUTHORIZED' });
      }

      if (payload.householdId) {
        const [membership] = await db.select({ id: householdMembers.id })
          .from(householdMembers)
          .where(and(
            eq(householdMembers.userId, payload.sub),
            eq(householdMembers.householdId, payload.householdId),
          ))
          .limit(1);
        if (!membership) {
          return reply.code(401).send({ error: 'Household access has changed', code: 'SESSION_STALE' });
        }
      }
      req.user = { userId: payload.sub, householdId: payload.householdId ?? null };
    } catch {
      return reply.code(401).send({ error: 'Authentication required', code: 'UNAUTHORIZED' });
    }
  };

  app.decorate('requireAuth', requireAuth);
});
