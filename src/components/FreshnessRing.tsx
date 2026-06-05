interface FreshnessRingProps {
  fresh: number;
  soon: number;
  expired: number;
  size?: number;
  stroke?: number;
}

export function FreshnessRing({ fresh, soon, expired, size = 132, stroke = 13 }: FreshnessRingProps) {
  const total = Math.max(fresh + soon + expired, 1);
  const R = (size - stroke) / 2;
  const C = 2 * Math.PI * R;
  const segs = [
    { v: expired, c: 'var(--expired)' },
    { v: soon, c: 'var(--soon)' },
    { v: fresh, c: 'var(--primary)' },
  ].filter((s) => s.v > 0);
  let acc = 0;
  const gap = segs.length > 1 ? 0.012 * C : 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size / 2} cy={size / 2} r={R} fill="none" stroke="var(--line)" strokeWidth={stroke} opacity="0.5" />
      {segs.map((s, i) => {
        const frac = s.v / total;
        const len = Math.max(frac * C - gap, 0);
        const dash = `${len} ${C - len}`;
        const off = -acc * C;
        acc += frac;
        return (
          <circle key={i} cx={size / 2} cy={size / 2} r={R} fill="none"
            stroke={s.c} strokeWidth={stroke} strokeLinecap="round"
            strokeDasharray={dash} strokeDashoffset={off} />
        );
      })}
    </svg>
  );
}
