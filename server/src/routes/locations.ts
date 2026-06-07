import type { FastifyInstance } from 'fastify';
import { and, eq, isNull, or, count } from 'drizzle-orm';
import { db } from '../db/client.js';
import { locations, stockItems } from '../db/schema.js';
import { randomBytes } from 'node:crypto';
import { optionalBoolean, optionalText } from '../lib/validation.js';

function hueValue(value: unknown): number {
  const hue = Number(value);
  if (!Number.isInteger(hue) || hue < 0 || hue > 360) throw new Error('INVALID_HUE');
  return hue;
}

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
    let cleanLabel: string | null;
    let cleanIcon: string | null;
    let cleanHue: number;
    let cleanFreezer: boolean | undefined;
    try {
      cleanLabel = optionalText(label, 100);
      cleanIcon = optionalText(icon, 100);
      cleanHue = hue == null ? 160 : hueValue(hue);
      cleanFreezer = optionalBoolean(freezer);
    } catch {
      return reply.code(400).send({ error: 'Invalid location values', code: 'INVALID_INPUT' });
    }
    if (!cleanLabel || !cleanIcon) {
      return reply.code(400).send({ error: 'label and icon required', code: 'INVALID_INPUT' });
    }

    const id = `custom-${randomBytes(4).toString('hex')}`;
    const [loc] = await db.insert(locations).values({
      id,
      label: cleanLabel,
      icon: cleanIcon,
      hue: cleanHue,
      freezer: cleanFreezer ?? false,
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
    let cleanLabel: string | null | undefined;
    let cleanIcon: string | null | undefined;
    let cleanHue: number | undefined;
    let cleanFreezer: boolean | undefined;
    try {
      cleanLabel = label !== undefined ? optionalText(label, 100) : undefined;
      cleanIcon = icon !== undefined ? optionalText(icon, 100) : undefined;
      cleanHue = hue !== undefined ? hueValue(hue) : undefined;
      cleanFreezer = optionalBoolean(freezer);
    } catch {
      return reply.code(400).send({ error: 'Invalid location values', code: 'INVALID_INPUT' });
    }
    if (cleanLabel === null || cleanIcon === null) {
      return reply.code(400).send({ error: 'label and icon cannot be empty', code: 'INVALID_INPUT' });
    }
    await db.update(locations).set({
      ...(cleanLabel !== undefined && { label: cleanLabel }),
      ...(cleanIcon !== undefined && { icon: cleanIcon }),
      ...(cleanHue !== undefined && { hue: cleanHue }),
      ...(cleanFreezer !== undefined && { freezer: cleanFreezer }),
    }).where(and(eq(locations.id, id), eq(locations.householdId, householdId ?? '')));

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
