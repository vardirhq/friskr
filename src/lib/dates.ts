export type Urgency = 'fresh' | 'soon' | 'expired';

export const MONTHS_NB = ['jan.','feb.','mars','apr.','mai','juni','juli','aug.','sep.','okt.','nov.','des.'];
export const DAYS_NB = ['søndag','mandag','tirsdag','onsdag','torsdag','fredag','lørdag'];

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export function parseDate(iso: string | null): Date | null {
  if (!iso) return null;
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function daysUntil(date: Date | null): number | null {
  if (!date) return null;
  return Math.round((date.getTime() - startOfToday().getTime()) / 86_400_000);
}

export function fmtNO(d: Date): string {
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
}

export function fmtShort(d: Date): string {
  return `${d.getDate()}. ${MONTHS_NB[d.getMonth()]}`;
}

export function statusOf(off: number | null): Urgency {
  if (off == null) return 'fresh';
  if (off < 0) return 'expired';
  if (off <= 3) return 'soon';
  return 'fresh';
}

export function relLabel(off: number): string {
  if (off < -1) return `${Math.abs(off)} dager siden`;
  if (off === -1) return 'I går';
  if (off === 0) return 'I dag';
  if (off === 1) return 'I morgen';
  if (off <= 13) return `Om ${off} dager`;
  const weeks = Math.round(off / 7);
  if (off <= 60) return `Om ${weeks} uke${weeks > 1 ? 'r' : ''}`;
  return `Om ${Math.round(off / 30)} mnd`;
}

export const STATUS_META: Record<Urgency, { label: string; varc: string; tint: string }> = {
  expired: { label: 'Utløpt', varc: 'var(--expired)', tint: 'var(--expired-tint)' },
  soon: { label: 'Utløper snart', varc: 'var(--soon)', tint: 'var(--soon-tint)' },
  fresh: { label: 'Fersk', varc: 'var(--fresh)', tint: 'var(--primary-tint)' },
};

export function toISODate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function isoDateInDays(off: number): string {
  const d = startOfToday();
  d.setDate(d.getDate() + off);
  return toISODate(d);
}
