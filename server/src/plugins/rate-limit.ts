import fp from 'fastify-plugin';
import rateLimit from '@fastify/rate-limit';
import type { FastifyInstance } from 'fastify';

export const rateLimitPlugin = fp(async (app: FastifyInstance) => {
  await app.register(rateLimit, {
    global: false,
    errorResponseBuilder: () => ({
      error: 'Too many requests. Try again later.',
      code: 'RATE_LIMITED',
    }),
  });
});
