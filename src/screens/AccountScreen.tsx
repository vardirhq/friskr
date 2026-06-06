import { useState } from 'react';
import { useUiStore } from '../stores/ui';
import { useAuthStore } from '../stores/auth';
import { useHouseholdStore } from '../stores/household';
import {
  IconChevL, IconCheck, IconUsers, IconMail, IconApple,
  IconHome, IconKey, IconTrash, IconImage, IconChevR,
} from '../components/icons';
import { Card } from '../components/Card';
import { Btn } from '../components/Btn';
import { Press } from '../components/Press';
import type { ComponentType } from 'react';

type IconCmp = ComponentType<{ size?: number }>;

function Row({
  icon: I,
  label,
  sub,
  right,
  onClick,
  tint = 'var(--primary-tint)',
  ic = 'var(--on-primary-tint)',
  last,
}: {
  icon: IconCmp;
  label: string;
  sub?: string;
  right?: React.ReactNode;
  onClick?: () => void;
  tint?: string;
  ic?: string;
  last?: boolean;
}) {
  return (
    <Press onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '13px 4px', width: '100%', borderBottom: last ? 'none' : '1px solid var(--line-2)' }}>
      <span style={{ width: 38, height: 38, borderRadius: 11, background: tint, color: ic, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <I size={20} />
      </span>
      <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
        <p style={{ margin: 0, fontSize: 14.5, fontWeight: 700 }}>{label}</p>
        {sub && <p style={{ margin: '1px 0 0', fontSize: 12.5, color: 'var(--ink-3)' }}>{sub}</p>}
      </div>
      {right ?? (onClick ? <IconChevR size={18} style={{ color: 'var(--ink-3)' } as React.CSSProperties} /> : null)}
    </Press>
  );
}

export function AccountScreen() {
  const { setTab, showToast } = useUiStore();
  const { user } = useAuthStore();
  const { household, reload: reloadHousehold } = useHouseholdStore();

  const member = household?.members.find((m) => m.userId === user?.id) ?? household?.members[0];
  const [name, setName] = useState(member?.name ?? '');
  const [email, setEmail] = useState('');
  const [dirty, setDirty] = useState(false);

  const initial = member?.initial ?? (name?.[0]?.toUpperCase() ?? '?');
  const hue = member?.hue ?? 145;

  const save = () => {
    setDirty(false);
    showToast('Profil lagret', 'check');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh' }}>
      {/* SubHeader */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px 6px' }}>
        <Press
          onClick={() => setTab('settings')}
          style={{ width: 40, height: 40, borderRadius: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink-2)', flexShrink: 0 }}
        >
          <IconChevL size={24} />
        </Press>
        <h1 style={{ margin: 0, flex: 1, fontSize: 22, fontWeight: 800, letterSpacing: -0.5 }}>Konto</h1>
      </div>

      <div className="noscroll" style={{ flex: 1, overflow: 'auto', padding: '4px 16px 24px' }}>
        {/* avatar */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '8px 0 22px' }}>
          <div style={{ position: 'relative' }}>
            <div style={{ width: 92, height: 92, borderRadius: 999, background: `hsl(${hue} 45% 42%)`, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 38 }}>
              {initial}
            </div>
            <Press
              onClick={() => showToast('Velg nytt bilde', 'image')}
              style={{ position: 'absolute', bottom: -2, right: -2, width: 32, height: 32, borderRadius: 999, background: 'var(--surface)', border: '1px solid var(--line)', boxShadow: 'var(--shadow-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink-2)' }}
            >
              <IconImage size={16} />
            </Press>
          </div>
        </div>

        {/* editable fields */}
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--ink-3)', margin: '0 0 7px 2px', textTransform: 'uppercase', letterSpacing: 0.4 }}>Navn</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 11, background: 'var(--surface)', border: '1.5px solid var(--line)', borderRadius: 'var(--r-sm)', padding: '0 14px', boxShadow: 'var(--shadow-sm)' }}>
            <IconUsers size={18} style={{ color: 'var(--ink-3)' } as React.CSSProperties} />
            <input
              value={name}
              onChange={(e) => { setName(e.target.value); setDirty(true); }}
              style={{ flex: 1, border: 'none', outline: 'none', background: 'none', fontFamily: 'var(--font)', fontSize: 15, color: 'var(--ink)', padding: '13px 0' }}
            />
          </div>
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--ink-3)', margin: '0 0 7px 2px', textTransform: 'uppercase', letterSpacing: 0.4 }}>E-post</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 11, background: 'var(--surface)', border: '1.5px solid var(--line)', borderRadius: 'var(--r-sm)', padding: '0 14px', boxShadow: 'var(--shadow-sm)' }}>
            <IconMail size={18} style={{ color: 'var(--ink-3)' } as React.CSSProperties} />
            <input
              value={email}
              onChange={(e) => { setEmail(e.target.value); setDirty(true); }}
              type="email"
              style={{ flex: 1, border: 'none', outline: 'none', background: 'none', fontFamily: 'var(--font)', fontSize: 15, color: 'var(--ink)', padding: '13px 0' }}
            />
          </div>
        </div>

        <div style={{ height: 6 }} />
        <Btn
          full
          icon={IconCheck}
          onClick={save}
          style={{ opacity: dirty ? 1 : 0.5, pointerEvents: dirty ? 'auto' : 'none', marginBottom: 22 }}
        >
          Lagre endringer
        </Btn>

        {/* Konto section */}
        <p style={{ margin: '0 4px 8px', fontSize: 12, fontWeight: 800, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: 0.6 }}>Konto</p>
        <Card pad={4} style={{ padding: '4px 14px', marginBottom: 18 }}>
          <Row
            icon={IconApple}
            label="Tilkoblet med Apple"
            sub={email || 'Ikke tilkoblet'}
            tint="var(--surface-2)"
            ic="var(--ink)"
          />
          <Row
            icon={IconHome}
            label={household?.name ?? 'Ingen husholdning'}
            sub={`${household?.members.length ?? 0} medlemmer`}
            onClick={() => reloadHousehold()}
          />
          <Row
            icon={IconKey}
            label="Endre passord"
            sub="Send tilbakestillingslenke"
            onClick={() => showToast('Lenke sendt på e-post', 'mail')}
            last
          />
        </Card>

        {/* danger */}
        <p style={{ margin: '0 4px 8px', fontSize: 12, fontWeight: 800, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: 0.6 }}>Faresone</p>
        <Press
          onClick={() => showToast('Kontaktet support', 'check')}
          style={{ display: 'flex', alignItems: 'center', gap: 11, width: '100%', padding: '14px 16px', borderRadius: 'var(--r-sm)', background: 'var(--expired-tint)', color: 'var(--expired)', fontSize: 14, fontWeight: 700 }}
        >
          <IconTrash size={19} /> Slett konto
        </Press>
      </div>
    </div>
  );
}
