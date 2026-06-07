import { randomBytes } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { eq, and, isNull, gt } from 'drizzle-orm';
import { db } from '../db/client.js';
import { households, householdMembers, householdInvites, users } from '../db/schema.js';
import { sendInviteEmail } from '../lib/email.js';

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

    // mark invite accepted if any
    const [userRecord] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (userRecord) {
      await db.update(householdInvites)
        .set({ acceptedAt: new Date() })
        .where(and(
          eq(householdInvites.householdId, hh.id),
          eq(householdInvites.email, userRecord.email),
          isNull(householdInvites.acceptedAt),
        ));
    }

    const jwt = app.jwt.sign({ sub: userId, householdId: hh.id });
    const household = await getHouseholdWithMembers(hh.id);
    return { jwt, household };
  });

  // POST /household/invite — send an email invite
  app.post('/household/invite', { preHandler: app.requireAuth }, async (req, reply) => {
    const { userId, householdId } = req.user;
    if (!householdId) return reply.code(403).send({ error: 'Not in a household', code: 'FORBIDDEN' });

    const { email } = (req.body ?? {}) as { email?: string };
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return reply.code(400).send({ error: 'Valid email required', code: 'INVALID_INPUT' });
    }

    // confirm requester is a member
    const [requesterMember] = await db
      .select()
      .from(householdMembers)
      .where(and(eq(householdMembers.householdId, householdId), eq(householdMembers.userId, userId)))
      .limit(1);
    if (!requesterMember) return reply.code(403).send({ error: 'Not a member', code: 'FORBIDDEN' });

    // check if invited email already has an account and is already a member
    const [existingUser] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (existingUser) {
      const [existingMember] = await db
        .select()
        .from(householdMembers)
        .where(and(
          eq(householdMembers.householdId, householdId),
          eq(householdMembers.userId, existingUser.id),
        ))
        .limit(1);
      if (existingMember) {
        return reply.code(409).send({ error: 'Already a member', code: 'ALREADY_MEMBER' });
      }
    }

    const [hh] = await db.select().from(households).where(eq(households.id, householdId)).limit(1);
    if (!hh) return reply.code(404).send({ error: 'Household not found', code: 'NOT_FOUND' });

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const [existing] = await db.select()
      .from(householdInvites)
      .where(and(
        eq(householdInvites.householdId, householdId),
        eq(householdInvites.email, email),
        isNull(householdInvites.acceptedAt),
        gt(householdInvites.expiresAt, new Date()),
      ))
      .limit(1);
    if (existing) {
      return { id: existing.id, email: existing.email, createdAt: existing.createdAt };
    }

    const [invite] = await db
      .insert(householdInvites)
      .values({ householdId, email, sentByUserId: userId, expiresAt })
      .returning();

    await sendInviteEmail(email, hh.name, hh.inviteCode);

    return reply.code(201).send({
      id: invite.id,
      email: invite.email,
      createdAt: invite.createdAt,
    });
  });

  // GET /household/invites — list pending invites
  app.get('/household/invites', { preHandler: app.requireAuth }, async (req, reply) => {
    const { householdId } = req.user;
    if (!householdId) return reply.code(403).send({ error: 'Not in a household', code: 'FORBIDDEN' });

    const now = new Date();
    const invites = await db
      .select()
      .from(householdInvites)
      .where(and(
        eq(householdInvites.householdId, householdId),
        isNull(householdInvites.acceptedAt),
        gt(householdInvites.expiresAt, now),
      ))
      .orderBy(householdInvites.createdAt);

    return invites.map((inv) => ({
      id: inv.id,
      email: inv.email,
      sentAt: inv.createdAt.toISOString(),
      daysAgo: Math.floor((now.getTime() - inv.createdAt.getTime()) / 86400000),
    }));
  });

  // DELETE /household/invites/:id — cancel an invite
  app.delete('/household/invites/:id', { preHandler: app.requireAuth }, async (req, reply) => {
    const { householdId } = req.user;
    if (!householdId) return reply.code(403).send({ error: 'Not in a household', code: 'FORBIDDEN' });

    const { id } = req.params as { id: string };
    const [invite] = await db
      .select()
      .from(householdInvites)
      .where(and(eq(householdInvites.id, id), eq(householdInvites.householdId, householdId)))
      .limit(1);
    if (!invite) return reply.code(404).send({ error: 'Invite not found', code: 'NOT_FOUND' });

    await db.delete(householdInvites).where(eq(householdInvites.id, id));
    return { ok: true };
  });

  // DELETE /household/leave — leave the household
  app.delete('/household/leave', { preHandler: app.requireAuth }, async (req, reply) => {
    const { userId, householdId } = req.user;
    if (!householdId) return reply.code(403).send({ error: 'Not in a household', code: 'FORBIDDEN' });

    const members = await db
      .select()
      .from(householdMembers)
      .where(eq(householdMembers.householdId, householdId))
      .orderBy(householdMembers.joinedAt);

    const self = members.find(m => m.userId === userId);
    if (!self) return reply.code(403).send({ error: 'Not a member', code: 'FORBIDDEN' });

    if (members.length === 1) {
      // only member — delete the household (cascade removes members/invites)
      await db.delete(households).where(eq(households.id, householdId));
    } else {
      if (self.role === 'owner') {
        // transfer ownership to oldest non-self member
        const newOwner = members.find((m) => m.userId !== userId);
        if (newOwner) {
          await db
            .update(householdMembers)
            .set({ role: 'owner' })
            .where(eq(householdMembers.id, newOwner.id));
        }
      }
      await db
        .delete(householdMembers)
        .where(and(
          eq(householdMembers.householdId, householdId),
          eq(householdMembers.userId, userId),
        ));
    }

    const jwt = app.jwt.sign({ sub: userId, householdId: null });
    return { jwt };
  });

  // DELETE /household/members/:userId — kick a member
  app.delete('/household/members/:userId', { preHandler: app.requireAuth }, async (req, reply) => {
    const { userId: requesterId, householdId } = req.user;
    if (!householdId) return reply.code(403).send({ error: 'Not in a household', code: 'FORBIDDEN' });

    const { userId: targetUserId } = req.params as { userId: string };

    // requester must be owner
    const [requesterMember] = await db
      .select()
      .from(householdMembers)
      .where(and(
        eq(householdMembers.householdId, householdId),
        eq(householdMembers.userId, requesterId),
      ))
      .limit(1);
    if (!requesterMember || requesterMember.role !== 'owner') {
      return reply.code(403).send({ error: 'Only owners can kick members', code: 'FORBIDDEN' });
    }

    // cannot kick self
    if (targetUserId === requesterId) {
      return reply.code(400).send({ error: 'Use /household/leave to leave', code: 'INVALID_INPUT' });
    }

    // find target
    const [targetMember] = await db
      .select()
      .from(householdMembers)
      .where(and(
        eq(householdMembers.householdId, householdId),
        eq(householdMembers.userId, targetUserId),
      ))
      .limit(1);
    if (!targetMember) return reply.code(404).send({ error: 'Member not found', code: 'NOT_FOUND' });

    // cannot kick another owner
    if (targetMember.role === 'owner') {
      return reply.code(403).send({ error: 'Cannot kick an owner', code: 'FORBIDDEN' });
    }

    await db
      .delete(householdMembers)
      .where(and(
        eq(householdMembers.householdId, householdId),
        eq(householdMembers.userId, targetUserId),
      ));

    return { ok: true };
  });
}
