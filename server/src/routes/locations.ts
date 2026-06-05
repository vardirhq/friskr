import type { FastifyInstance } from 'fastify';
import { and, eq, isNull, or, count } from 'drizzle-orm';
import { db } from '../db/client.js';
import { locations, stockItems } from '../db/schema.js';
import { randomBytes } from 'node:crypto';

export async function locationsRoutes(app: FastifyInstance) {
  app.get('/locations', { preHandler: app.requireAuth }, async (req) => {
    const { householdId } = req.user;
    return db.select().from(locations).where(
      or(isNull(locations.householdId), eq(locations.householdId, householdId ?? ''))
    );
  });

  app.post('/locations', { preHandler: app.requireAuth }, async (req, reply) => {
    const { householdId } = req.user;
    if (!householdId) return reply.code(403).send({ error: 'Join a household first', code: 'FORBIDDEN' });

    const { label, icon, hue, freezer } = (req.body ?? {}) as Record<string, unknown>;
    if (!label || !icon) {
      return reply.code(400).send({ error: 'label and icon required', code: 'INVALID_INPUT' });
    }

    const id = `custom-${randomBytes(4).toString('hex')}`;
    const [loc] = await db.insert(locations).values({
      id,
      label: label as string,
      icon: icon as string,
      hue: hue != null ? Number(hue) : 160,
      freezer: (freezer as boolean) ?? false,
      householdId,
    }).returning();

    return reply.code(201).send(loc);
  });

  app.patch('/locations/:id', { preHandler: app.requireAuth }, async (req, reply) => {
    const { householdId } = req.user;
    const { id } = req.params as { id: string };

    const existing = await db.select().from(locations)
      .where(and(eq(locations.id, id), eq(locations.householdId, householdId ?? '')))
      .limit(1);
    if (!existing[0]) return reply.code(404).send({ error: 'Not found', code: 'NOT_FOUND' });

    const { label, icon, hue, freezer } = (req.body ?? {}) as Record<string, unknown>;
    await db.update(locations).set({
      ...(label != null && { label: label as string }),
      ...(icon != null && { icon: icon as string }),
      ...(hue != null && { hue: Number(hue) }),
      ...(freezer != null && { freezer: freezer as boolean }),
    }).where(eq(locations.id, id));

    const [updated] = await db.select().from(locations).where(eq(locations.id, id));
    return updated;
  });

  app.delete('/locations/:id', { preHandler: app.requireAuth }, async (req, reply) => {
    const { householdId } = req.user;
    const { id } = req.params as { id: string };

    const existing = await db.select().from(locations)
      .where(and(eq(locations.id, id), eq(locations.householdId, householdId ?? '')))
      .limit(1);
    if (!existing[0]) return reply.code(404).send({ error: 'Not found', code: 'NOT_FOUND' });

    const [{ itemCount }] = await db.select({ itemCount: count() }).from(stockItems)
      .where(and(eq(stockItems.locationId, id), eq(stockItems.status, 'in_stock')));

    if (itemCount > 0) {
      return reply.code(409).send({ error: 'Location has active items', code: 'CONFLICT' });
    }

    await db.delete(locations).where(eq(locations.id, id));
    return { ok: true };
  });
}
