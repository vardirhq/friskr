import { useState } from 'react';
import { useHouseholdStore } from '../stores/household';
import { IconLogo, IconHome, IconUsers, IconArrowR } from '../components/icons';
import { Btn } from '../components/Btn';

export function CreateOrJoinScreen() {
  const { create, join } = useHouseholdStore();
  const [mode, setMode] = useState<'pick' | 'create' | 'join'>('pick');
  const [name, setName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true); setError('');
    try {
      await create(name.trim(), displayName.trim() || undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Noe gikk galt');
      setLoading(false);
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    setLoading(true); setError('');
    try {
      await join(code.trim().toUpperCase(), displayName.trim() || undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ugyldig invitasjonskode');
      setLoading(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', border: '1.5px solid var(--line)', background: 'var(--surface)',
    borderRadius: 14, padding: '14px 18px', fontFamily: 'var(--font)',
    fontSize: 16, color: 'var(--ink)', outline: 'none', boxSizing: 'border-box',
    marginBottom: 12,
  };

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 24px', background: 'var(--paper)' }}>
      <div style={{ width: '100%', maxWidth: 380 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 40, justifyContent: 'center' }}>
          <span style={{ color: 'var(--primary)' }}><IconLogo size={28} /></span>
          <span style={{ fontSize: 24, fontWeight: 800, letterSpacing: -0.5 }}>friskr</span>
        </div>

        {mode === 'pick' && (
          <div style={{ animation: 'friskr-rise .3s ease' }}>
            <h1 style={{ margin: '0 0 8px', fontSize: 26, fontWeight: 800, letterSpacing: -0.5, textAlign: 'center' }}>Kom i gang</h1>
            <p style={{ margin: '0 0 32px', fontSize: 15, color: 'var(--ink-2)', textAlign: 'center', lineHeight: 1.5 }}>Opprett en husholdning eller bli med i en eksisterende.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <button onClick={() => setMode('create')} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '20px 20px', background: 'var(--surface)', border: '1.5px solid var(--line)', borderRadius: 20, cursor: 'pointer', fontFamily: 'var(--font)', textAlign: 'left', boxShadow: 'var(--shadow-sm)' }}>
                <span style={{ width: 48, height: 48, borderRadius: 14, background: 'var(--primary-tint)', color: 'var(--on-primary-tint)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><IconHome size={24} /></span>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>Opprett husholdning</p>
                  <p style={{ margin: '2px 0 0', fontSize: 13, color: 'var(--ink-3)' }}>Start et nytt delt lager</p>
                </div>
                <IconArrowR size={20} style={{ color: 'var(--ink-3)' }} />
              </button>
              <button onClick={() => setMode('join')} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '20px 20px', background: 'var(--surface)', border: '1.5px solid var(--line)', borderRadius: 20, cursor: 'pointer', fontFamily: 'var(--font)', textAlign: 'left', boxShadow: 'var(--shadow-sm)' }}>
                <span style={{ width: 48, height: 48, borderRadius: 14, background: 'var(--primary-tint)', color: 'var(--on-primary-tint)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><IconUsers size={24} /></span>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>Bli med</p>
                  <p style={{ margin: '2px 0 0', fontSize: 13, color: 'var(--ink-3)' }}>Skriv inn invitasjonskoden</p>
                </div>
                <IconArrowR size={20} style={{ color: 'var(--ink-3)' }} />
              </button>
            </div>
          </div>
        )}

        {mode === 'create' && (
          <form onSubmit={handleCreate} style={{ animation: 'friskr-rise .3s ease' }}>
            <h1 style={{ margin: '0 0 24px', fontSize: 24, fontWeight: 800, letterSpacing: -0.4 }}>Ny husholdning</h1>
            <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: 'var(--ink-3)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.4 }}>Navn på husholdning</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="f.eks. Familien Eikeland" style={inputStyle} required />
            <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: 'var(--ink-3)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.4 }}>Ditt navn (valgfritt)</label>
            <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="f.eks. Mari" style={{ ...inputStyle, marginBottom: 20 }} />
            {error && <p style={{ margin: '0 0 12px', fontSize: 13, color: 'var(--expired)', fontWeight: 600 }}>{error}</p>}
            <div style={{ display: 'flex', gap: 10 }}>
              <button type="button" onClick={() => setMode('pick')} style={{ flex: 1, padding: '13px', borderRadius: 999, border: '1px solid var(--line)', background: 'var(--surface-2)', fontFamily: 'var(--font)', fontSize: 15, fontWeight: 700, cursor: 'pointer', color: 'var(--ink)' }}>Tilbake</button>
              <Btn style={{ flex: 2 }} disabled={loading || !name.trim()}>{loading ? 'Oppretter…' : 'Opprett'}</Btn>
            </div>
          </form>
        )}

        {mode === 'join' && (
          <form onSubmit={handleJoin} style={{ animation: 'friskr-rise .3s ease' }}>
            <h1 style={{ margin: '0 0 24px', fontSize: 24, fontWeight: 800, letterSpacing: -0.4 }}>Bli med</h1>
            <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: 'var(--ink-3)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.4 }}>Invitasjonskode</label>
            <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="FRISK-XXXX" style={{ ...inputStyle, textTransform: 'uppercase', fontWeight: 700, letterSpacing: 1 }} required />
            <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: 'var(--ink-3)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.4 }}>Ditt navn (valgfritt)</label>
            <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="f.eks. Jonas" style={{ ...inputStyle, marginBottom: 20 }} />
            {error && <p style={{ margin: '0 0 12px', fontSize: 13, color: 'var(--expired)', fontWeight: 600 }}>{error}</p>}
            <div style={{ display: 'flex', gap: 10 }}>
              <button type="button" onClick={() => setMode('pick')} style={{ flex: 1, padding: '13px', borderRadius: 999, border: '1px solid var(--line)', background: 'var(--surface-2)', fontFamily: 'var(--font)', fontSize: 15, fontWeight: 700, cursor: 'pointer', color: 'var(--ink)' }}>Tilbake</button>
              <Btn style={{ flex: 2 }} disabled={loading || !code.trim()}>{loading ? 'Kobler til…' : 'Bli med'}</Btn>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
