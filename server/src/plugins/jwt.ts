import fp from 'fastify-plugin';
import jwtPlugin from '@fastify/jwt';
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

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
  await app.register(jwtPlugin, {
    secret: process.env.JWT_SECRET ?? 'dev-secret-change-me',
    sign: { expiresIn: '7d' },
  });

  const requireAuth = async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      await req.jwtVerify();
      const payload = req.user as unknown as JWTPayload;
      req.user = { userId: payload.sub, householdId: payload.householdId ?? null };
    } catch {
      return reply.code(401).send({ error: 'Authentication required', code: 'UNAUTHORIZED' });
    }
  };

  app.decorate('requireAuth', requireAuth);
});
