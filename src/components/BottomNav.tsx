import type { TabKey } from '../stores/ui';
import { IconHome, IconBox, IconScan, IconLeaf, IconSliders } from './icons';

interface NavTab {
  key: TabKey;
  label: string;
  Icon: React.ComponentType<{ size?: number }>;
  center?: boolean;
}

const TABS: NavTab[] = [
  { key: 'home', label: 'Hjem', Icon: IconHome },
  { key: 'stock', label: 'Lager', Icon: IconBox },
  { key: 'scan', label: 'Skann', Icon: IconScan, center: true },
  { key: 'products', label: 'Produkter', Icon: IconLeaf },
  { key: 'settings', label: 'Innstillinger', Icon: IconSliders },
];

interface BottomNavProps {
  tab: TabKey;
  onChange: (t: TabKey) => void;
}

export function BottomNav({ tab, onChange }: BottomNavProps) {
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-end', justifyContent: 'space-around',
      background: 'var(--surface)', borderTop: '1px solid var(--line)',
      padding: '8px 12px 6px', paddingBottom: 'calc(6px + env(safe-area-inset-bottom))',
      flexShrink: 0,
    }}>
      {TABS.map(({ key, label, Icon, center }) => {
        const active = key === tab;
        if (center) {
          return (
            <button key={key} onClick={() => onChange(key)} style={{
              flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
              marginTop: -30, border: 'none', background: 'none', cursor: 'pointer',
              fontFamily: 'var(--font)',
            }}>
              <div style={{
                width: 60, height: 60, borderRadius: 22,
                background: 'var(--primary)', color: 'var(--on-primary)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 12px 26px -8px color-mix(in srgb, var(--primary) 70%, transparent)',
                border: '4px solid var(--surface)',
              }}>
                <Icon size={28} />
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, color: active ? 'var(--primary)' : 'var(--ink-3)' }}>{label}</span>
            </button>
          );
        }
        return (
          <button key={key} onClick={() => onChange(key)} style={{
            flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
            padding: '4px 0', border: 'none', background: 'none', cursor: 'pointer',
            color: active ? 'var(--primary)' : 'var(--ink-3)',
            fontFamily: 'var(--font)', fontSize: 10, fontWeight: active ? 700 : 600,
            transition: 'color .15s',
          }}>
            <Icon size={22} />
            {label}
          </button>
        );
      })}
    </div>
  );
}
