import type { FastifyInstance } from 'fastify';
import { and, eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import { householdMembers } from '../db/schema.js';
import { addSSEClient, removeSSEClient } from '../plugins/notify.js';
import { consumeRealtimeTicket, issueRealtimeTicket } from '../lib/realtime-tickets.js';

export async function realtimeRoutes(app: FastifyInstance) {
  app.post('/realtime/ticket', { preHandler: app.requireAuth }, async (req, reply) => {
    const { userId, householdId } = req.user;
    if (!householdId) {
      return reply.code(403).send({ error: 'No household', code: 'FORBIDDEN' });
    }
    return { ticket: issueRealtimeTicket(userId, householdId) };
  });

  app.get('/realtime/household', async (req, reply) => {
    const { ticket } = req.query as { ticket?: string };
    if (!ticket) {
      return reply.code(401).send({ error: 'ticket required', code: 'UNAUTHORIZED' });
    }

    const session = consumeRealtimeTicket(ticket);
    if (!session) {
      return reply.code(401).send({ error: 'Invalid or expired ticket', code: 'UNAUTHORIZED' });
    }
    const { userId, householdId } = session;

    const raw = reply.raw;
    raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    });
    raw.write(':\n\n');

    addSSEClient(householdId, raw);

    const keepalive = setInterval(async () => {
      const [membership] = await db.select({ id: householdMembers.id })
        .from(householdMembers)
        .where(and(
          eq(householdMembers.userId, userId),
          eq(householdMembers.householdId, householdId),
        ))
        .limit(1);
      if (!membership) {
        raw.end();
        return;
      }
      raw.write(':\n\n');
    }, 30_000);

    req.raw.on('close', () => {
      clearInterval(keepalive);
      removeSSEClient(householdId, raw);
    });

    await new Promise<void>((resolve) => req.raw.on('close', resolve));
  });
}
