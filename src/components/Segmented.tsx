interface Tab {
  key: string;
  label: string;
  count?: number;
  tint?: string;
  color?: string;
}

interface SegmentedProps {
  tabs: Tab[];
  value: string;
  onChange: (key: string) => void;
}

export function Segmented({ tabs, value, onChange }: SegmentedProps) {
  return (
    <div style={{
      display: 'flex', gap: 4, padding: 4, borderRadius: 999,
      background: 'var(--surface-2)', border: '1px solid var(--line)',
    }}>
      {tabs.map((tb) => {
        const active = tb.key === value;
        return (
          <button key={tb.key} onClick={() => onChange(tb.key)} style={{
            flex: 1, border: 'none', cursor: 'pointer',
            padding: '8px 6px', borderRadius: 999,
            background: active ? 'var(--surface)' : 'transparent',
            color: active ? 'var(--ink)' : 'var(--ink-3)',
            fontFamily: 'var(--font)', fontSize: 13, fontWeight: active ? 700 : 600,
            boxShadow: active ? 'var(--shadow-sm)' : 'none',
            transition: 'all .18s ease',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}>
            {tb.label}
            {tb.count != null && (
              <span className="tnum" style={{
                fontSize: 11, fontWeight: 700, minWidth: 18, padding: '0 5px', height: 18,
                borderRadius: 999, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                background: active ? (tb.tint || 'var(--primary-tint)') : 'var(--line)',
                color: active ? (tb.color || 'var(--primary)') : 'var(--ink-3)',
              }}>{tb.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
