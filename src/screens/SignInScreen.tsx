import { useRef, useState, type FormEvent } from 'react';
import { useAuthStore } from '../stores/auth';
import { IconLogo, IconMail, IconArrowR } from '../components/icons';
import { Btn } from '../components/Btn';

export function SignInScreen() {
  const { signInWithEmail, verifyOtp } = useAuthStore();
  const [email, setEmail] = useState('');
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const codeRef = useRef<HTMLInputElement>(null);

  const handleEmail = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
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

  const handleCode = async (e: FormEvent) => {
    e.preventDefault();
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
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 24px', background: 'var(--paper)' }}>
      <div style={{ width: '100%', maxWidth: 380 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 48, justifyContent: 'center' }}>
          <span style={{ color: 'var(--primary)', display: 'flex' }}><IconLogo size={32} /></span>
          <span style={{ fontSize: 28, fontWeight: 800, letterSpacing: -0.6 }}>friskr</span>
        </div>

        {step === 'email' ? (
          <>
            <h1 style={{ margin: '0 0 8px', fontSize: 28, fontWeight: 800, letterSpacing: -0.6, textAlign: 'center' }}>Logg inn</h1>
            <p style={{ margin: '0 0 32px', fontSize: 15, color: 'var(--ink-2)', textAlign: 'center', lineHeight: 1.5 }}>Vi sender deg en engangskode på e-post — ingen passord nødvendig.</p>
            <form onSubmit={handleEmail}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--surface)', border: '1.5px solid var(--line)', borderRadius: 16, padding: '14px 18px', marginBottom: 16, boxShadow: 'var(--shadow-sm)' }}>
                <IconMail size={20} style={{ color: 'var(--ink-3)', flexShrink: 0 }} />
                <input
                  type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="din@epost.no" autoComplete="email" required
                  style={{ flex: 1, border: 'none', outline: 'none', background: 'none', fontFamily: 'var(--font)', fontSize: 16, color: 'var(--ink)' }}
                />
              </div>
              {error && <p style={{ margin: '0 0 12px', fontSize: 13, color: 'var(--expired)', fontWeight: 600 }}>{error}</p>}
              <Btn full icon={IconArrowR} disabled={loading || !email.trim()}>
                {loading ? 'Sender…' : 'Send kode'}
              </Btn>
            </form>
          </>
        ) : (
          <div style={{ animation: 'friskr-rise .3s ease' }}>
            <div style={{ width: 80, height: 80, borderRadius: 999, background: 'var(--primary-tint)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
              <IconMail size={36} />
            </div>
            <h2 style={{ margin: '0 0 8px', fontSize: 24, fontWeight: 800, letterSpacing: -0.5, textAlign: 'center' }}>Sjekk e-posten</h2>
            <p style={{ margin: '0 0 32px', fontSize: 15, color: 'var(--ink-2)', lineHeight: 1.5, textAlign: 'center' }}>
              Vi har sendt en 6-sifret kode til <strong>{email}</strong>.
            </p>
            <form onSubmit={handleCode}>
              <input
                ref={codeRef}
                type="text" inputMode="numeric" pattern="[0-9]*"
                value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="123456" autoComplete="one-time-code" maxLength={6}
                style={{ width: '100%', boxSizing: 'border-box', textAlign: 'center', fontSize: 32, fontWeight: 800, letterSpacing: 8, border: '1.5px solid var(--line)', borderRadius: 16, padding: '16px 18px', marginBottom: 16, background: 'var(--surface)', color: 'var(--ink)', fontFamily: 'var(--font)', outline: 'none', boxShadow: 'var(--shadow-sm)' }}
              />
              {error && <p style={{ margin: '0 0 12px', fontSize: 13, color: 'var(--expired)', fontWeight: 600, textAlign: 'center' }}>{error}</p>}
              <Btn full icon={IconArrowR} disabled={loading || code.length < 6}>
                {loading ? 'Bekrefter…' : 'Bekreft kode'}
              </Btn>
            </form>
            <button
              onClick={() => { setStep('email'); setCode(''); setError(''); }}
              style={{ marginTop: 16, width: '100%', background: 'none', border: 'none', color: 'var(--ink-2)', fontSize: 14, cursor: 'pointer', fontFamily: 'var(--font)' }}
            >
              Bruk en annen e-postadresse
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
