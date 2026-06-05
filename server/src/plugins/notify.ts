import fp from 'fastify-plugin';
import postgres from 'postgres';
import type { FastifyInstance } from 'fastify';
import type { ServerResponse } from 'node:http';

const connections = new Map<string, Set<ServerResponse>>();

export function addSSEClient(householdId: string, raw: ServerResponse) {
  if (!connections.has(householdId)) connections.set(householdId, new Set());
  connections.get(householdId)!.add(raw);
}

export function removeSSEClient(householdId: string, raw: ServerResponse) {
  connections.get(householdId)?.delete(raw);
}

export function broadcastChange(householdId: string) {
  const clients = connections.get(householdId);
  if (!clients) return;
  for (const raw of clients) {
    raw.write('data: changed\n\n');
  }
}

export const notifyPlugin = fp(async (app: FastifyInstance) => {
  if (!process.env.DATABASE_URL) return;

  let listenSql: ReturnType<typeof postgres> | null = null;
  try {
    listenSql = postgres(process.env.DATABASE_URL, { max: 1 });
    await listenSql.listen('friskr_changes', broadcastChange);
  } catch (err) {
    app.log.warn({ err }, 'pg LISTEN failed — realtime push disabled');
  }

  app.addHook('onClose', async () => {
    await listenSql?.end();
  });
});
