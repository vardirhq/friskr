import { statusOf, relLabel, STATUS_META } from '../lib/dates';

interface StatusPillProps {
  off: number | null;
  dense?: boolean;
}

export function StatusPill({ off, dense }: StatusPillProps) {
  const st = statusOf(off);
  const m = STATUS_META[st];
  const label = off != null ? relLabel(off) : 'Ukjent';
  return (
    <span className="tnum" style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: dense ? '3px 8px' : '4px 10px', borderRadius: 999,
      background: m.tint, color: m.varc,
      fontSize: dense ? 11.5 : 12.5, fontWeight: 600, whiteSpace: 'nowrap',
    }}>
      <span style={{ width: 6, height: 6, borderRadius: 999, background: m.varc }} />
      {label}
    </span>
  );
}
