import { useState, useEffect } from 'react';
import { useUiStore } from '../stores/ui';
import { useAuthStore } from '../stores/auth';
import { useHouseholdStore } from '../stores/household';
import { getMe, updateMe, deleteMe } from '../lib/friskr';
import {
  IconChevL, IconCheck, IconUsers, IconMail,
  IconHome, IconTrash, IconChevR,
} from '../components/icons';
import { Card } from '../components/Card';
import { Btn } from '../components/Btn';
import { Press } from '../components/Press';
import type { ComponentType } from 'react';

type IconCmp = ComponentType<{ size?: number }>;

function Row({
  icon: I, label, sub, right, onClick,
  tint = 'var(--primary-tint)', ic = 'var(--on-primary-tint)', last,
}: {
  icon: IconCmp; label: string; sub?: string; right?: React.ReactNode;
  onClick?: () => void; tint?: string; ic?: string; last?: boolean;
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
  const { setTab, openSheet, showToast } = useUiStore();
  const { user, signOut } = useAuthStore();
  const { household, reload: reloadHousehold } = useHouseholdStore();

  const member = household?.members.find((m) => m.userId === user?.id) ?? household?.members[0];
  const [name, setName] = useState(member?.name ?? '');
  const [email, setEmail] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const dirty = name.trim() !== (member?.name ?? '').trim() && name.trim().length > 0;
  const initial = name?.[0]?.toUpperCase() ?? member?.initial ?? '?';
  const hue = member?.hue ?? 145;

  useEffect(() => {
    getMe().then((me) => setEmail(me.email)).catch(() => {});
  }, [user?.id]);

  const save = async () => {
    if (!dirty || saving) return;
    setSaving(true);
    try {
      await updateMe(name.trim());
      await reloadHousehold();
      showToast('Profil lagret', 'check');
    } catch {
      showToast('Kunne ikke lagre', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (deleting) return;
    setDeleting(true);
    try {
      await deleteMe();
      await signOut();
    } catch {
      showToast('Kunne ikke slette konto', 'error');
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: 'calc(8px + env(safe-area-inset-top)) 12px 6px' }}>
        <Press
          onClick={() => setTab('settings')}
          style={{ width: 40, height: 40, borderRadius: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink-2)', flexShrink: 0 }}
        >
          <IconChevL size={24} />
        </Press>
        <h1 style={{ margin: 0, flex: 1, fontSize: 22, fontWeight: 800, letterSpacing: -0.5 }}>Konto</h1>
      </div>

      <div className="noscroll" style={{ flex: 1, overflow: 'auto', padding: '4px 16px calc(24px + env(safe-area-inset-bottom))' }}>
        {/* avatar */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '8px 0 22px' }}>
          <div style={{ width: 92, height: 92, borderRadius: 999, background: `hsl(${hue} 45% 42%)`, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 38 }}>
            {initial}
          </div>
        </div>

        {/* name */}
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--ink-3)', margin: '0 0 7px 2px', textTransform: 'uppercase', letterSpacing: 0.4 }}>Navn</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 11, background: 'var(--surface)', border: '1.5px solid var(--line)', borderRadius: 'var(--r-sm)', padding: '0 14px', boxShadow: 'var(--shadow-sm)' }}>
            <IconUsers size={18} style={{ color: 'var(--ink-3)' } as React.CSSProperties} />
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Visningsnavn"
              style={{ flex: 1, border: 'none', outline: 'none', background: 'none', fontFamily: 'var(--font)', fontSize: 15, color: 'var(--ink)', padding: '13px 0' }}
            />
          </div>
        </div>

        {/* email (read-only) */}
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--ink-3)', margin: '0 0 7px 2px', textTransform: 'uppercase', letterSpacing: 0.4 }}>E-post</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 11, background: 'var(--surface-2)', border: '1.5px solid var(--line)', borderRadius: 'var(--r-sm)', padding: '0 14px' }}>
            <IconMail size={18} style={{ color: 'var(--ink-3)' } as React.CSSProperties} />
            <input
              value={email}
              readOnly
              style={{ flex: 1, border: 'none', outline: 'none', background: 'none', fontFamily: 'var(--font)', fontSize: 15, color: 'var(--ink-3)', padding: '13px 0', cursor: 'default' }}
            />
          </div>
        </div>

        <div style={{ height: 6 }} />
        <Btn
          full
          icon={saving ? undefined : IconCheck}
          onClick={save}
          style={{ opacity: dirty && !saving ? 1 : 0.5, pointerEvents: dirty && !saving ? 'auto' : 'none', marginBottom: 22 }}
        >
          {saving ? 'Lagrer…' : 'Lagre endringer'}
        </Btn>

        {/* Konto section */}
        <p style={{ margin: '0 4px 8px', fontSize: 12, fontWeight: 800, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: 0.6 }}>Konto</p>
        <Card pad={4} style={{ padding: '4px 14px', marginBottom: 18 }}>
          <Row
            icon={IconMail}
            label="Innlogget med e-post"
            sub={email || '…'}
            tint="var(--surface-2)"
            ic="var(--ink-2)"
          />
          <Row
            icon={IconHome}
            label={household?.name ?? 'Ingen husholdning'}
            sub={`${household?.members.length ?? 0} medlemmer`}
            onClick={() => openSheet({ type: 'household' })}
            last
          />
        </Card>

        {/* danger zone */}
        <p style={{ margin: '0 4px 8px', fontSize: 12, fontWeight: 800, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: 0.6 }}>Faresone</p>
        {confirmDelete ? (
          <Card pad={16} style={{ background: 'var(--expired-tint)', border: '1px solid color-mix(in srgb, var(--expired) 30%, transparent)' }}>
            <p style={{ margin: '0 0 4px', fontSize: 14.5, fontWeight: 800, color: 'var(--expired)' }}>Er du sikker?</p>
            <p style={{ margin: '0 0 14px', fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.5 }}>
              Dette sletter kontoen din permanent. All data du eier vil bli borte.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <Btn variant="ghost" onClick={() => setConfirmDelete(false)} style={{ flex: 1 }}>Avbryt</Btn>
              <Press
                onClick={handleDelete}
                style={{ flex: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '13px', borderRadius: 'var(--r-sm)', background: 'var(--expired)', color: '#fff', fontSize: 14, fontWeight: 700 }}
              >
                <IconTrash size={17} />{deleting ? 'Sletter…' : 'Slett konto'}
              </Press>
            </div>
          </Card>
        ) : (
          <Press
            onClick={() => setConfirmDelete(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 11, width: '100%', padding: '14px 16px', borderRadius: 'var(--r-sm)', background: 'var(--expired-tint)', color: 'var(--expired)', fontSize: 14, fontWeight: 700 }}
          >
            <IconTrash size={19} /> Slett konto
          </Press>
        )}
      </div>
    </div>
  );
}
