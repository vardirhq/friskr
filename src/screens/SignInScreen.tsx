import { useRef, useState, type KeyboardEvent } from 'react';
import { useAuthStore } from '../stores/auth';
import { useUiStore } from '../stores/ui';
import { IconLogo, IconMail, IconArrowR, IconApple, IconGoogle } from '../components/icons';
import { Btn } from '../components/Btn';
import { Press } from '../components/Press';

function ProviderBtn({ icon: I, iconColor, label, onClick, dark }: {
  icon: React.ComponentType<{ size?: number }>;
  iconColor?: string;
  label: string;
  onClick?: () => void;
  dark?: boolean;
}) {
  return (
    <Press onClick={onClick} style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 11, width: '100%',
      padding: '15px 18px', borderRadius: 'var(--r-sm)', fontSize: 15.5, fontWeight: 700,
      background: dark ? 'var(--ink)' : 'var(--surface)', color: dark ? 'var(--paper)' : 'var(--ink)',
      border: dark ? 'none' : '1.5px solid var(--line)', boxShadow: 'var(--shadow-sm)',
    }}>
      <span style={{ display: 'flex', color: iconColor || 'currentColor' }}><I size={21} /></span>
      {label}
    </Press>
  );
}

export function SignInScreen() {
  const { signInWithEmail, verifyOtp } = useAuthStore();
  const { showToast } = useUiStore();
  const [email, setEmail] = useState('');
  const [step, setStep] = useState<'providers' | 'code'>('providers');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const codeRef = useRef<HTMLInputElement>(null);

  const valid = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim());

  const handleEmail = async () => {
    if (!valid) return;
    setLoading(true); setError('');
    try {
      await signInWithEmail(email.trim());
      setStep('code');
      setTimeout(() => codeRef.current?.focus(), 100);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Noe gikk galt');
    } finally {
      setLoading(false);
    }
  };

  const handleCode = async () => {
    if (code.length < 6) return;
    setLoading(true); setError('');
    try {
      await verifyOtp(email.trim(), code.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Feil kode, prøv igjen');
      setCode('');
      codeRef.current?.focus();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: 'var(--paper)', paddingTop: 'env(safe-area-inset-top)' }}>
      {step === 'providers' ? (
        <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', padding: '0 30px' }}>
          {/* brand + value prop */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', minHeight: 280, paddingTop: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--primary)', marginBottom: 26 }}>
              <IconLogo size={34} /><span style={{ fontSize: 30, fontWeight: 800, color: 'var(--ink)', letterSpacing: -0.5 }}>friskr</span>
            </div>
            <h1 style={{ margin: '0 0 12px', fontSize: 25, fontWeight: 800, letterSpacing: -0.5, lineHeight: 1.2, maxWidth: 300 }}>Logg inn for å fortsette</h1>
            <p style={{ margin: 0, fontSize: 14.5, color: 'var(--ink-2)', lineHeight: 1.5, maxWidth: 290 }}>Lageret ditt synkroniseres trygt på tvers av enheter og deles med husholdningen din.</p>
          </div>

          {/* providers + email */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 11, paddingBottom: 6 }}>
            <ProviderBtn icon={IconApple} label="Fortsett med Apple" dark onClick={() => showToast('Apple-innlogging ikke tilgjengelig ennå')} />
            <ProviderBtn icon={IconGoogle} iconColor="initial" label="Fortsett med Google" onClick={() => showToast('Google-innlogging ikke tilgjengelig ennå')} />

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '10px 2px' }}>
              <span style={{ flex: 1, height: 1, background: 'var(--line)' }} />
              <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ink-3)' }}>eller med e-post</span>
              <span style={{ flex: 1, height: 1, background: 'var(--line)' }} />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--surface)', border: '1.5px solid var(--line)', borderRadius: 'var(--r-sm)', padding: '4px 16px', boxShadow: 'var(--shadow-sm)' }}>
              <IconMail size={19} style={{ color: 'var(--ink-3)' }} />
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                inputMode="email"
                placeholder="din@epost.no"
                onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => { if (e.key === 'Enter' && valid) handleEmail(); }}
                style={{ flex: 1, border: 'none', outline: 'none', background: 'none', fontFamily: 'var(--font)', fontSize: 15, color: 'var(--ink)', padding: '13px 0' }}
              />
            </div>

            {error && <p style={{ margin: 0, fontSize: 13, color: 'var(--expired)', fontWeight: 600 }}>{error}</p>}

            <Btn full icon={IconArrowR} onClick={() => valid && handleEmail()}
              style={{ opacity: valid ? 1 : 0.45, pointerEvents: valid ? 'auto' : 'none' }}>
              {loading ? 'Sender…' : 'Send innloggingslenke'}
            </Btn>
          </div>

          {/* terms footer */}
          <p style={{ margin: '20px 0 26px', fontSize: 11.5, color: 'var(--ink-3)', textAlign: 'center', lineHeight: 1.5 }}>
            Ved å fortsette godtar du <span style={{ color: 'var(--ink-2)', fontWeight: 600 }}>vilkårene</span> og <span style={{ color: 'var(--ink-2)', fontWeight: 600 }}>personvernerklæringen</span>.
          </p>
        </div>
      ) : (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 30px', animation: 'friskr-rise .3s ease' }}>
          <div style={{ width: '100%', maxWidth: 380 }}>
            <div style={{ width: 80, height: 80, borderRadius: 999, background: 'var(--primary-tint)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
              <IconMail size={36} />
            </div>
            <h2 style={{ margin: '0 0 8px', fontSize: 24, fontWeight: 800, letterSpacing: -0.5, textAlign: 'center' }}>Sjekk e-posten</h2>
            <p style={{ margin: '0 0 32px', fontSize: 15, color: 'var(--ink-2)', lineHeight: 1.5, textAlign: 'center' }}>
              Vi har sendt en 6-sifret kode til <strong>{email}</strong>.
            </p>
            <input
              ref={codeRef}
              type="text" inputMode="numeric" pattern="[0-9]*"
              value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => { if (e.key === 'Enter' && code.length >= 6) handleCode(); }}
              placeholder="123456" autoComplete="one-time-code" maxLength={6}
              style={{ width: '100%', boxSizing: 'border-box', textAlign: 'center', fontSize: 32, fontWeight: 800, letterSpacing: 8, border: '1.5px solid var(--line)', borderRadius: 16, padding: '16px 18px', marginBottom: 16, background: 'var(--surface)', color: 'var(--ink)', fontFamily: 'var(--font)', outline: 'none', boxShadow: 'var(--shadow-sm)' }}
            />
            {error && <p style={{ margin: '0 0 12px', fontSize: 13, color: 'var(--expired)', fontWeight: 600, textAlign: 'center' }}>{error}</p>}
            <Btn full icon={IconArrowR} onClick={() => code.length >= 6 && handleCode()}
              style={{ opacity: code.length >= 6 ? 1 : 0.45, pointerEvents: code.length >= 6 ? 'auto' : 'none' }}>
              {loading ? 'Bekrefter…' : 'Bekreft kode'}
            </Btn>
            <button
              onClick={() => { setStep('providers'); setCode(''); setError(''); }}
              style={{ marginTop: 16, width: '100%', background: 'none', border: 'none', color: 'var(--ink-2)', fontSize: 14, cursor: 'pointer', fontFamily: 'var(--font)' }}
            >
              Bruk en annen e-postadresse
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
