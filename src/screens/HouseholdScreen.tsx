import { useState } from 'react';
import { useHouseholdStore } from '../stores/household';
import { Press } from '../components/Press';
import { Btn } from '../components/Btn';
import { IconX, IconQr, IconCopy, IconUsers } from '../components/icons';

interface HouseholdScreenProps {
  onClose: () => void;
}

export function HouseholdScreen({ onClose }: HouseholdScreenProps) {
  const { household } = useHouseholdStore();
  const [copied, setCopied] = useState(false);

  const copyCode = () => {
    if (!household) return;
    navigator.clipboard.writeText(household.code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  if (!household) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 150, background: 'var(--paper)', display: 'flex', flexDirection: 'column', animation: 'friskr-rise .25s ease' }}>
      {/* header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 16px 8px' }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, letterSpacing: -0.4 }}>Husholdning</h1>
        <Press onClick={onClose} style={{ width: 36, height: 36, borderRadius: 999, background: 'var(--surface-2)', border: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink-2)' }}>
          <IconX size={18} />
        </Press>
      </div>

      <div className="noscroll" style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 40px' }}>
        {/* household name */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--r)', padding: 20, marginBottom: 20, boxShadow: 'var(--shadow-sm)' }}>
          <h2 style={{ margin: '0 0 4px', fontSize: 20, fontWeight: 800 }}>{household.name}</h2>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--ink-3)' }}>{household.members.length} {household.members.length === 1 ? 'medlem' : 'medlemmer'}</p>
        </div>

        {/* invite code */}
        <p style={{ margin: '0 2px 10px', fontSize: 12, fontWeight: 800, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: 0.6 }}>Invitasjonskode</p>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--r-sm)', padding: '16px 18px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 14, boxShadow: 'var(--shadow-sm)' }}>
          <span style={{ color: 'var(--primary)', display: 'flex' }}><IconQr size={28} /></span>
          <div style={{ flex: 1 }}>
            <p style={{ margin: 0, fontSize: 12, color: 'var(--ink-3)', fontWeight: 600 }}>Del denne koden for å invitere</p>
            <p className="tnum" style={{ margin: '2px 0 0', fontSize: 20, fontWeight: 800, letterSpacing: 1.5, color: 'var(--primary)' }}>{household.code}</p>
          </div>
          <Press onClick={copyCode} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 999, background: copied ? 'var(--primary-tint)' : 'var(--surface-2)', color: copied ? 'var(--on-primary-tint)' : 'var(--ink-2)', border: '1px solid var(--line)', fontSize: 13, fontWeight: 700 }}>
            <IconCopy size={15} />
            {copied ? 'Kopiert!' : 'Kopier'}
          </Press>
        </div>

        {/* members */}
        <p style={{ margin: '0 2px 10px', fontSize: 12, fontWeight: 800, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: 0.6 }}>Medlemmer</p>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--r-sm)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
          {household.members.map((m, i) => (
            <div key={m.userId} style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '14px 16px', borderBottom: i < household.members.length - 1 ? '1px solid var(--line-2)' : 'none' }}>
              <span style={{ width: 40, height: 40, borderRadius: 999, background: `hsl(${m.hue} 45% 42%)`, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 16, flexShrink: 0 }}>{m.initial}</span>
              <div style={{ flex: 1 }}>
                <p style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>{m.name}</p>
                <p style={{ margin: '1px 0 0', fontSize: 12.5, color: 'var(--ink-3)' }}>{m.role}</p>
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 24 }}>
          <Btn variant="ghost" full icon={IconUsers} onClick={() => {}}>
            Inviter nytt medlem
          </Btn>
        </div>
      </div>
    </div>
  );
}
