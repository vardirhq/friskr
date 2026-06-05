import { randomBytes } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { eq, and } from 'drizzle-orm';
import { db } from '../db/client.js';
import { households, householdMembers } from '../db/schema.js';

function generateInviteCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = randomBytes(4);
  const code = Array.from(bytes)
    .map((b) => alphabet[b % alphabet.length])
    .join('')
    .slice(0, 4);
  return `FRISK-${code}`;
}

async function getHouseholdWithMembers(householdId: string) {
  const [hh] = await db.select().from(households).where(eq(households.id, householdId)).limit(1);
  if (!hh) return null;
  const members = await db
    .select()
    .from(householdMembers)
    .where(eq(householdMembers.householdId, householdId))
    .orderBy(householdMembers.joinedAt);
  return {
    id: hh.id,
    name: hh.name,
    code: hh.inviteCode,
    members: members.map((m) => ({
      userId: m.userId,
      name: m.displayName ?? 'Medlem',
      role: m.role === 'owner' ? 'Eier' : 'Medlem',
      initial: (m.displayName ?? '?').charAt(0).toUpperCase(),
      hue: m.colorHue ?? 145,
    })),
  };
}

export async function householdRoutes(app: FastifyInstance) {
  app.get('/household', { preHandler: app.requireAuth }, async (req, reply) => {
    const { householdId } = req.user;
    if (!householdId) return reply.code(404).send({ error: 'No household', code: 'NOT_FOUND' });
    const result = await getHouseholdWithMembers(householdId);
    if (!result) return reply.code(404).send({ error: 'Not found', code: 'NOT_FOUND' });
    return result;
  });

  app.get('/household/members', { preHandler: app.requireAuth }, async (req, reply) => {
    const { householdId } = req.user;
    if (!householdId) return reply.code(404).send({ error: 'No household', code: 'NOT_FOUND' });
    const members = await db
      .select()
      .from(householdMembers)
      .where(eq(householdMembers.householdId, householdId))
      .orderBy(householdMembers.joinedAt);
    return members.map((m) => ({
      userId: m.userId,
      name: m.displayName ?? 'Medlem',
      role: m.role === 'owner' ? 'Eier' : 'Medlem',
      initial: (m.displayName ?? '?').charAt(0).toUpperCase(),
      hue: m.colorHue ?? 145,
    }));
  });

  app.post('/household', { preHandler: app.requireAuth }, async (req, reply) => {
    const { userId } = req.user;
    const { name, displayName } = (req.body ?? {}) as { name?: string; displayName?: string };
    if (!name) return reply.code(400).send({ error: 'name required', code: 'INVALID_INPUT' });

    const inviteCode = generateInviteCode();
    const [hh] = await db.insert(households).values({ name, inviteCode }).returning();
    await db.insert(householdMembers).values({
      householdId: hh.id, userId, role: 'owner', displayName: displayName ?? null,
    });

    const jwt = app.jwt.sign({ sub: userId, householdId: hh.id });
    const household = await getHouseholdWithMembers(hh.id);
    return reply.code(201).send({ jwt, household });
  });

  app.post('/household/join', { preHandler: app.requireAuth }, async (req, reply) => {
    const { userId } = req.user;
    const { code, displayName } = (req.body ?? {}) as { code?: string; displayName?: string };
    if (!code) return reply.code(400).send({ error: 'code required', code: 'INVALID_INPUT' });

    const [hh] = await db.select().from(households).where(eq(households.inviteCode, code)).limit(1);
    if (!hh) return reply.code(404).send({ error: 'Invalid invite code', code: 'NOT_FOUND' });

    const alreadyMember = await db
      .select()
      .from(householdMembers)
      .where(and(eq(householdMembers.householdId, hh.id), eq(householdMembers.userId, userId)))
      .limit(1);
    if (!alreadyMember[0]) {
      await db.insert(householdMembers).values({
        householdId: hh.id, userId, role: 'member', displayName: displayName ?? null,
      });
    }

    const jwt = app.jwt.sign({ sub: userId, householdId: hh.id });
    const household = await getHouseholdWithMembers(hh.id);
    return { jwt, household };
  });
}
