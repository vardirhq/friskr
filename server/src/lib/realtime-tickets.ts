import { randomBytes } from 'node:crypto';

interface RealtimeTicket {
  userId: string;
  householdId: string;
  expiresAt: number;
}

// NOTE: this store is in-process. It is correct for a single API instance. If the
// API is scaled horizontally, a ticket issued by one replica won't be found by
// another — move this to a shared store (e.g. Redis with a short TTL) before
// running more than one replica.
const tickets = new Map<string, RealtimeTicket>();
const TICKET_TTL_MS = 30_000;
const SWEEP_INTERVAL_MS = 60_000;

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

/** Drop any tickets that expired without being consumed, so the map can't grow unbounded. */
export function sweepExpiredTickets(now = Date.now()): void {
  for (const [ticket, record] of tickets) {
    if (record.expiresAt <= now) tickets.delete(ticket);
  }
}

// Periodically evict expired-but-unconsumed tickets. unref() so this timer never
// keeps the process (or a test runner) alive on its own.
const sweeper = setInterval(sweepExpiredTickets, SWEEP_INTERVAL_MS);
sweeper.unref?.();
