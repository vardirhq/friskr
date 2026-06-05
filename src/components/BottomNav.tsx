import type { TabKey } from '../stores/ui';
import { IconHome, IconBox, IconScan, IconFilter, IconSliders } from './icons';

interface NavTab {
  key: TabKey;
  label: string;
  Icon: React.ComponentType<{ size?: number }>;
}

const TABS: NavTab[] = [
  { key: 'home', label: 'Hjem', Icon: IconHome },
  { key: 'stock', label: 'Lager', Icon: IconBox },
  { key: 'scan', label: 'Skann', Icon: IconScan },
  { key: 'products', label: 'Produkter', Icon: IconFilter },
  { key: 'settings', label: 'Innst.', Icon: IconSliders },
];

interface BottomNavProps {
  tab: TabKey;
  onChange: (t: TabKey) => void;
}

export function BottomNav({ tab, onChange }: BottomNavProps) {
  return (
    <div style={{
      position: 'absolute', bottom: 0, left: 0, right: 0,
      display: 'flex', background: 'var(--surface)',
      borderTop: '1px solid var(--line)', paddingBottom: 'env(safe-area-inset-bottom)',
    }}>
      {TABS.map(({ key, label, Icon }) => {
        const active = key === tab;
        return (
          <button key={key} onClick={() => onChange(key)} style={{
            flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
            padding: '10px 4px 8px', border: 'none', background: 'none', cursor: 'pointer',
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
