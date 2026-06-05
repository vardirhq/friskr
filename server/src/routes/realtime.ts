import type { FastifyInstance } from 'fastify';
import type { JWTPayload } from '../plugins/jwt.js';
import { addSSEClient, removeSSEClient } from '../plugins/notify.js';

export async function realtimeRoutes(app: FastifyInstance) {
  app.get('/realtime/household', async (req, reply) => {
    const { token } = req.query as { token?: string };
    if (!token) {
      return reply.code(401).send({ error: 'token required', code: 'UNAUTHORIZED' });
    }

    let payload: JWTPayload;
    try {
      payload = app.jwt.verify<JWTPayload>(token);
    } catch {
      return reply.code(401).send({ error: 'Invalid token', code: 'UNAUTHORIZED' });
    }

    const householdId = payload.householdId;
    if (!householdId) {
      return reply.code(403).send({ error: 'No household', code: 'FORBIDDEN' });
    }

    const raw = reply.raw;
    raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    });
    raw.write(':\n\n');

    addSSEClient(householdId, raw);

    const keepalive = setInterval(() => raw.write(':\n\n'), 30_000);

    req.raw.on('close', () => {
      clearInterval(keepalive);
      removeSSEClient(householdId, raw);
    });

    await new Promise<void>((resolve) => req.raw.on('close', resolve));
  });
}
