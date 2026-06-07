import { randomBytes } from 'node:crypto';

interface RealtimeTicket {
  userId: string;
  householdId: string;
  expiresAt: number;
}

const tickets = new Map<string, RealtimeTicket>();
const TICKET_TTL_MS = 30_000;

export function issueRealtimeTicket(userId: string, householdId: string): string {
  const ticket = randomBytes(32).toString('base64url');
  tickets.set(ticket, {
    userId,
    householdId,
    expiresAt: Date.now() + TICKET_TTL_MS,
  });
  return ticket;
}

export function consumeRealtimeTicket(ticket: string): RealtimeTicket | null {
  const record = tickets.get(ticket);
  tickets.delete(ticket);
  if (!record || record.expiresAt <= Date.now()) return null;
  return record;
}
