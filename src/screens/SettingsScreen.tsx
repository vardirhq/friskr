import type { ComponentType } from 'react';
import { useHouseholdStore } from '../stores/household';
import { useAuthStore } from '../stores/auth';
import { useSettingsStore } from '../stores/settings';
import { useUiStore } from '../stores/ui';
import { Card } from '../components/Card';
import { Press } from '../components/Press';
import {
  IconHome, IconUsers, IconBell, IconClock, IconMoon, IconGlobe,
  IconLocFridge, IconSpark, IconLeaf, IconLogout, IconChevR, IconPlus, IconMinus,
} from '../components/icons';

function Toggle({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <Press onClick={onClick} style={{ width: 46, height: 28, borderRadius: 999, background: on ? 'var(--primary)' : 'var(--line)', position: 'relative', transition: 'background .2s', flexShrink: 0 }}>
      <span style={{ position: 'absolute', top: 3, left: on ? 21 : 3, width: 22, height: 22, borderRadius: 999, background: '#fff', transition: 'left .2s cubic-bezier(.3,1.4,.5,1)', boxShadow: '0 1px 3px rgba(0,0,0,.25)' }} />
    </Press>
  );
}

function Row({ icon: I, label, sub, right, onClick, tint = 'var(--primary-tint)', ic = 'var(--on-primary-tint)', last }: {
  icon: ComponentType<{ size?: number }>;
  label: string; sub?: string;
  right?: React.ReactNode; onClick?: () => void;
  tint?: string; ic?: string; last?: boolean;
}) {
  return (
    <Press onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '13px 4px', width: '100%', borderBottom: last ? 'none' : '1px solid var(--line-2)' }}>
      <span style={{ width: 38, height: 38, borderRadius: 11, background: tint, color: ic, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><I size={20} /></span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: 14.5, fontWeight: 700 }}>{label}</p>
        {sub && <p style={{ margin: '1px 0 0', fontSize: 12.5, color: 'var(--ink-3)' }}>{sub}</p>}
      </div>
      {right ?? <IconChevR size={18} style={{ color: 'var(--ink-3)' }} />}
    </Press>
  );
}

function Section({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 18 }}>
      {title && <p style={{ margin: '0 4px 8px', fontSize: 12, fontWeight: 800, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: 0.6 }}>{title}</p>}
      <Card pad={4} style={{ padding: '4px 14px' }}>{children}</Card>
    </div>
  );
}

export function SettingsScreen() {
  const { household } = useHouseholdStore();
  const { signOut } = useAuthStore();
  const { darkMode, pushEnabled, notifyDaysAhead, setDark, setPush, setNotifyDays } = useSettingsStore();
  const { openSheet } = useUiStore();
  const member = household?.members[0];

  return (
    <div className="noscroll" style={{ height: '100%', overflow: 'auto', padding: '14px 16px 24px' }}>
      <h1 style={{ margin: '0 2px 16px', fontSize: 25, fontWeight: 800, letterSpacing: -0.5 }}>Innstillinger</h1>

      {/* profile */}
      <Card pad={16} style={{ marginBottom: 18, display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ width: 54, height: 54, borderRadius: 999, background: `hsl(${member?.hue ?? 145} 45% 42%)`, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 22 }}>
          {member?.initial ?? '?'}
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ margin: 0, fontSize: 17, fontWeight: 800 }}>{member?.name ?? 'Profil'}</p>
          <p style={{ margin: '2px 0 0', fontSize: 13, color: 'var(--ink-3)' }}>{member?.role ?? ''}</p>
        </div>
        <IconChevR size={20} style={{ color: 'var(--ink-3)' }} />
      </Card>

      <Section title="Husholdning">
        <Row icon={IconHome} label={household?.name ?? 'Ingen husholdning'} sub={`${household?.members.length ?? 0} medlemmer`} onClick={() => openSheet({ type: 'household' })} right={
          <div style={{ display: 'flex' }}>
            {(household?.members ?? []).map((m, i) => (
              <span key={m.userId} style={{ width: 28, height: 28, borderRadius: 999, background: `hsl(${m.hue} 45% 45%)`, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, border: '2px solid var(--surface)', marginLeft: i ? -9 : 0 }}>{m.initial}</span>
            ))}
          </div>
        } />
        <Row icon={IconUsers} label="Medlemmer & roller" sub="Inviter familie til delt lager" onClick={() => openSheet({ type: 'household' })} last />
      </Section>

      <Section title="Varsler">
        <Row icon={IconBell} label="Push-varsler" sub="Få beskjed før varer utløper" tint="var(--soon-tint)" ic="var(--soon)" right={<Toggle on={pushEnabled} onClick={() => setPush(!pushEnabled)} />} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '13px 4px', opacity: pushEnabled ? 1 : 0.4, pointerEvents: pushEnabled ? 'auto' : 'none' }}>
          <span style={{ width: 38, height: 38, borderRadius: 11, background: 'var(--soon-tint)', color: 'var(--soon)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><IconClock size={20} /></span>
          <div style={{ flex: 1 }}>
            <p style={{ margin: 0, fontSize: 14.5, fontWeight: 700 }}>Varsle på forhånd</p>
            <p style={{ margin: '1px 0 0', fontSize: 12.5, color: 'var(--ink-3)' }}>{notifyDaysAhead} dager før utløp</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Press onClick={() => setNotifyDays(notifyDaysAhead - 1)} style={{ width: 32, height: 32, borderRadius: 9, background: 'var(--surface-2)', border: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink-2)' }}><IconMinus size={17} /></Press>
            <span className="tnum" style={{ fontSize: 16, fontWeight: 800, minWidth: 16, textAlign: 'center' }}>{notifyDaysAhead}</span>
            <Press onClick={() => setNotifyDays(notifyDaysAhead + 1)} style={{ width: 32, height: 32, borderRadius: 9, background: 'var(--surface-2)', border: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink-2)' }}><IconPlus size={17} /></Press>
          </div>
        </div>
      </Section>

      <Section title="Innstillinger">
        <Row icon={IconMoon} label="Mørk modus" tint="var(--surface-2)" ic="var(--ink-2)" right={<Toggle on={darkMode} onClick={() => setDark(!darkMode)} />} />
        <Row icon={IconGlobe} label="Språk" sub="Norsk (bokmål)" tint="var(--surface-2)" ic="var(--ink-2)" right={<span />} />
        <Row icon={IconLocFridge} label="Plasseringer" sub="Kjøleskap, Fryser, Spiskammer" tint="var(--surface-2)" ic="var(--ink-2)" last right={<span />} />
      </Section>

      <Section title="Om">
        <Row icon={IconSpark} label="Se introduksjon" sub="Gjennomgå oppsettet på nytt" onClick={() => openSheet({ type: 'onboarding' })} />
        <Row icon={IconLeaf} label="friskr" sub="Versjon 1.0 · Norge" right={<span className="tnum" style={{ fontSize: 12, color: 'var(--ink-3)' }}>1.0.0</span>} last />
      </Section>

      <Press onClick={signOut} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9, width: '100%', padding: '14px', marginBottom: 8, borderRadius: 'var(--r-sm)', background: 'var(--expired-tint)', color: 'var(--expired)', fontSize: 14.5, fontWeight: 700 }}>
        <IconLogout size={19} /> Logg ut
      </Press>
    </div>
  );
}
