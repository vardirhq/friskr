// friskr-auth.jsx — first-run onboarding, household management, sign-in gate
const D3 = window.FriskrData;
const U2 = window.UI;
const { useState: uS, useEffect: uE, useRef: uR } = React;

// shared row style for action sheets
const sheetRow = { display: 'flex', alignItems: 'center', gap: 12, padding: '14px 6px', width: '100%', borderRadius: 'var(--r-sm)', fontSize: 15, color: 'var(--ink)' };

// ════════════════════════════════════════════════════════════════
// ONBOARDING (overlay flow)
// ════════════════════════════════════════════════════════════════
function Onboarding({ onDone }) {
  const [step, setStep] = uS(0);
  const steps = [
    {
      art: 'hero',
      title: 'Aldri kast mat igjen',
      body: 'friskr holder styr på utløpsdatoer slik at familien bruker opp varene i tide.',
    },
    {
      art: 'scan',
      title: 'Skann og legg til på sekunder',
      body: 'Pek kameraet mot strekkoden — vi fyller inn produktet automatisk. Bare velg dato.',
    },
    {
      art: 'house',
      title: 'Ett delt lager for hele huset',
      body: 'Inviter familien. Alle ser hva som finnes hjemme og hva som må brukes først.',
    },
    {
      art: 'bell',
      title: 'Bli varslet i tide',
      body: 'Få en vennlig påminnelse noen dager før noe går ut på dato.',
    },
  ];
  const s = steps[step];
  const last = step === steps.length - 1;

  const Art = () => {
    if (s.art === 'hero') return (
      <div style={{ position: 'relative', width: 180, height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <U2.FreshnessRing fresh={12} soon={3} expired={1} size={180} stroke={16} />
        <span style={{ position: 'absolute', color: 'var(--primary)', display: 'flex' }}><Icon.leaf s={64} /></span>
      </div>
    );
    const map = { scan: Icon.scan, house: Icon.home, bell: Icon.bell };
    const I = map[s.art];
    return (
      <div style={{ width: 150, height: 150, borderRadius: 44, background: 'var(--primary-tint)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <I s={66} sw={1.5} />
      </div>
    );
  };

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 90, background: 'var(--paper)', display: 'flex', flexDirection: 'column' }}>
      <U2.StatusBar />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--primary)' }}>
          <Icon.logo s={22} /><span style={{ fontSize: 18, fontWeight: 800, color: 'var(--ink)' }}>friskr</span>
        </div>
        {!last && <U2.Press onClick={onDone} style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--ink-3)' }}>Hopp over</U2.Press>}
      </div>

      <div key={step} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 36px', textAlign: 'center', animation: 'friskr-rise .3s ease' }}>
        <div style={{ marginBottom: 40 }}><Art /></div>
        <h1 style={{ margin: '0 0 14px', fontSize: 27, fontWeight: 800, letterSpacing: -0.6, lineHeight: 1.15 }}>{s.title}</h1>
        <p style={{ margin: 0, fontSize: 15.5, color: 'var(--ink-2)', lineHeight: 1.5, maxWidth: 300 }}>{s.body}</p>
      </div>

      <div style={{ padding: '0 28px 30px' }}>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 7, marginBottom: 24 }}>
          {steps.map((_, i) => (
            <span key={i} style={{ height: 7, width: i === step ? 24 : 7, borderRadius: 999, background: i === step ? 'var(--primary)' : 'var(--line)', transition: 'all .25s' }} />
          ))}
        </div>
        <U2.Btn full onClick={() => (last ? onDone() : setStep(step + 1))} icon={last ? Icon.check : null}>
          {last ? 'Kom i gang' : 'Neste'}
        </U2.Btn>
      </div>
      <U2.GestureNav />
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// HOUSEHOLD  (members · invite via code / link / QR · join · sign-in)
// ════════════════════════════════════════════════════════════════
function FauxQR({ code, size = 132 }) {
  // deterministic dot pattern seeded from the code — purely decorative
  const n = 11, cell = size / n;
  let seed = 0; for (let i = 0; i < code.length; i++) seed = (seed * 31 + code.charCodeAt(i)) & 0xffff;
  const rnd = (i) => { const x = Math.sin(seed + i * 12.9898) * 43758.5453; return x - Math.floor(x); };
  const dots = [];
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
    const finder = (r < 3 && c < 3) || (r < 3 && c > n - 4) || (r > n - 4 && c < 3);
    if (finder) continue;
    if (rnd(r * n + c) > 0.52) dots.push(<rect key={r + '-' + c} x={c * cell} y={r * cell} width={cell} height={cell} rx={cell * 0.22} fill="var(--ink)" />);
  }
  const Finder = ({ x, y }) => (
    <g transform={`translate(${x},${y})`}>
      <rect width={cell * 3} height={cell * 3} rx={cell * 0.5} fill="var(--ink)" />
      <rect x={cell * 0.55} y={cell * 0.55} width={cell * 1.9} height={cell * 1.9} rx={cell * 0.35} fill="var(--surface)" />
      <rect x={cell * 1.05} y={cell * 1.05} width={cell * 0.9} height={cell * 0.9} rx={cell * 0.2} fill="var(--ink)" />
    </g>
  );
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: 'block' }}>
      {dots}
      <Finder x={0} y={0} /><Finder x={(n - 3) * cell} y={0} /><Finder x={0} y={(n - 3) * cell} />
    </svg>
  );
}

function HouseholdScreen({ onClose, toast, members, pending, setMemberRole, removeMember, invitePending, cancelPending }) {
  const H = D3.HOUSEHOLD;
  const mem = members || H.members;
  const pend = pending || [];
  const [mode, setMode] = uS('manage'); // manage | join
  const [joinCode, setJoinCode] = uS('');
  const [copied, setCopied] = uS(false);
  const [sel, setSel] = uS(null);          // member selected for the action sheet
  const [inviteEmail, setInviteEmail] = uS('');
  const emailValid = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(inviteEmail.trim());

  const copy = () => {
    try { navigator.clipboard?.writeText(H.code); } catch (e) {}
    setCopied(true); setTimeout(() => setCopied(false), 1600);
    toast('Kode kopiert', 'check');
  };
  const share = () => toast('Delingslenke klar', 'link');

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 90, background: 'var(--paper)', display: 'flex', flexDirection: 'column' }}>
      <U2.StatusBar />
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px' }}>
        <U2.Press onClick={mode === 'join' ? () => setMode('manage') : onClose} style={{ width: 40, height: 40, borderRadius: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink-2)' }}><Icon.chevL s={24} /></U2.Press>
        <h1 style={{ margin: 0, fontSize: 19, fontWeight: 800, letterSpacing: -0.4 }}>{mode === 'join' ? 'Bli med i husholdning' : 'Husholdning'}</h1>
      </div>

      <div className="noscroll" style={{ flex: 1, overflow: 'auto', padding: '6px 16px 28px' }}>
        {mode === 'manage' ? (
          <>
            {/* household header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '4px 2px 18px' }}>
              <div style={{ width: 52, height: 52, borderRadius: 16, background: 'var(--primary-tint)', color: 'var(--on-primary-tint)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon.home s={26} /></div>
              <div style={{ flex: 1 }}>
                <p style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>{H.name}</p>
                <p style={{ margin: '2px 0 0', fontSize: 13, color: 'var(--ink-3)' }}>{H.members.length} medlemmer · delt lager</p>
              </div>
            </div>

            {/* invite card */}
            <U2.Card pad={18} style={{ marginBottom: 16, textAlign: 'center' }}>
              <p style={{ margin: '0 0 4px', fontSize: 13.5, fontWeight: 800 }}>Inviter familien</p>
              <p style={{ margin: '0 0 16px', fontSize: 12.5, color: 'var(--ink-3)', lineHeight: 1.45 }}>Del koden eller QR-en. Den som scanner kobles til det samme delte lageret.</p>
              <div style={{ display: 'inline-flex', padding: 12, background: 'var(--surface-2)', border: '1px solid var(--line)', borderRadius: 'var(--r-sm)', marginBottom: 14 }}>
                <FauxQR code={H.code} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, background: 'var(--surface-2)', border: '1px dashed var(--line)', borderRadius: 'var(--r-sm)', padding: '12px 14px', marginBottom: 12 }}>
                <div style={{ textAlign: 'left' }}>
                  <p style={{ margin: 0, fontSize: 10.5, fontWeight: 700, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: 0.6 }}>Invitasjonskode</p>
                  <p className="tnum" style={{ margin: '1px 0 0', fontSize: 19, fontWeight: 800, letterSpacing: 1.5 }}>{H.code}</p>
                </div>
                <U2.Press onClick={copy} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 13px', borderRadius: 999, background: copied ? 'var(--primary)' : 'var(--primary-tint)', color: copied ? 'var(--on-primary)' : 'var(--on-primary-tint)', fontSize: 13, fontWeight: 800 }}>
                  {copied ? <Icon.check s={16} /> : <Icon.copy s={16} />}{copied ? 'Kopiert' : 'Kopier'}
                </U2.Press>
              </div>
              <U2.Btn full variant="ghost" icon={Icon.link} onClick={share}>Del lenke</U2.Btn>
            </U2.Card>

            {/* members */}
            <p style={{ margin: '0 4px 8px', fontSize: 12, fontWeight: 800, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: 0.6 }}>Medlemmer · {mem.length}</p>
            <U2.Card pad={4} style={{ padding: '4px 14px', marginBottom: 16 }}>
              {mem.map((m, i) => (
                <U2.Press key={m.id || m.name} onClick={() => (m.you ? toast('Dette er deg', 'check') : setSel(m))} style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '12px 4px', width: '100%', textAlign: 'left', borderBottom: i === mem.length - 1 ? 'none' : '1px solid var(--line-2)' }}>
                  <span style={{ width: 40, height: 40, borderRadius: 999, background: `hsl(${m.hue} 45% 45%)`, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 16, flexShrink: 0 }}>{m.initial}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: 14.5, fontWeight: 700 }}>{m.name}{m.you ? ' (deg)' : ''}</p>
                    <p style={{ margin: '1px 0 0', fontSize: 12, color: 'var(--ink-3)', display: 'flex', alignItems: 'center', gap: 5 }}><Icon.phone s={13} />{m.device}</p>
                  </div>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11.5, fontWeight: 800, padding: '4px 10px', borderRadius: 999, background: m.role === 'Eier' ? 'var(--primary-tint)' : 'var(--surface-2)', color: m.role === 'Eier' ? 'var(--on-primary-tint)' : 'var(--ink-3)' }}>{m.role === 'Eier' && <Icon.crown s={12} />}{m.role}</span>
                  {!m.you && <Icon.dots s={18} style={{ color: 'var(--ink-3)' }} />}
                </U2.Press>
              ))}
            </U2.Card>

            {/* pending invites */}
            {pend.length > 0 && (
              <>
                <p style={{ margin: '0 4px 8px', fontSize: 12, fontWeight: 800, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: 0.6 }}>Ventende invitasjoner</p>
                <U2.Card pad={4} style={{ padding: '4px 14px', marginBottom: 16 }}>
                  {pend.map((p, i) => (
                    <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '12px 4px', borderBottom: i === pend.length - 1 ? 'none' : '1px solid var(--line-2)' }}>
                      <span style={{ width: 40, height: 40, borderRadius: 999, background: 'var(--surface-2)', border: '1px dashed var(--line)', color: 'var(--ink-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Icon.mail s={18} /></span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: 0, fontSize: 13.5, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.email}</p>
                        <p style={{ margin: '1px 0 0', fontSize: 12, color: 'var(--ink-3)' }}>Sendt {p.sentDays === 0 ? 'i dag' : p.sentDays + ' dager siden'} · venter</p>
                      </div>
                      <U2.Press onClick={() => cancelPending && cancelPending(p.id)} style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--ink-3)', padding: '6px 10px' }}>Trekk</U2.Press>
                    </div>
                  ))}
                </U2.Card>
              </>
            )}

            {/* invite by email */}
            <p style={{ margin: '0 4px 8px', fontSize: 12, fontWeight: 800, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: 0.6 }}>Inviter på e-post</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--surface)', border: '1.5px solid var(--line)', borderRadius: 'var(--r-sm)', padding: '4px 6px 4px 14px', boxShadow: 'var(--shadow-sm)', marginBottom: 18 }}>
              <Icon.mail s={18} style={{ color: 'var(--ink-3)' }} />
              <input value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} type="email" inputMode="email" placeholder="navn@epost.no" onKeyDown={(e) => { if (e.key === 'Enter' && emailValid) { invitePending(inviteEmail.trim()); setInviteEmail(''); } }} style={{ flex: 1, border: 'none', outline: 'none', background: 'none', fontFamily: 'var(--font)', fontSize: 14.5, color: 'var(--ink)', padding: '11px 0' }} />
              <U2.Press onClick={() => { if (emailValid) { invitePending(inviteEmail.trim()); setInviteEmail(''); } }} style={{ padding: '9px 14px', borderRadius: 999, background: emailValid ? 'var(--primary)' : 'var(--surface-2)', color: emailValid ? 'var(--on-primary)' : 'var(--ink-3)', fontSize: 13, fontWeight: 800, pointerEvents: emailValid ? 'auto' : 'none' }}>Send</U2.Press>
            </div>

            {/* sign-in explainer — sets the right expectation re: accounts */}
            <div style={{ display: 'flex', gap: 12, padding: 14, background: 'var(--surface-2)', borderRadius: 'var(--r-sm)', border: '1px solid var(--line)', marginBottom: 18 }}>
              <span style={{ color: 'var(--primary)', flexShrink: 0, marginTop: 1 }}><Icon.key s={20} /></span>
              <div>
                <p style={{ margin: 0, fontSize: 13.5, fontWeight: 700 }}>Ny telefon?</p>
                <p style={{ margin: '3px 0 0', fontSize: 12.5, color: 'var(--ink-2)', lineHeight: 1.5 }}>Logg inn med samme konto, så er hele lageret der med en gang. Endringer synkroniseres mellom alle enheter når du er på nett.</p>
              </div>
            </div>

            <U2.Press onClick={() => setMode('join')} style={{ display: 'block', width: '100%', textAlign: 'center', padding: '12px', fontSize: 13.5, fontWeight: 700, color: 'var(--primary)' }}>Bli med i en annen husholdning</U2.Press>
          </>
        ) : (
          /* JOIN flow */
          <div style={{ paddingTop: 8 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: 24 }}>
              <div style={{ width: 64, height: 64, borderRadius: 20, background: 'var(--primary-tint)', color: 'var(--on-primary-tint)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}><Icon.users s={30} /></div>
              <h2 style={{ margin: '0 0 8px', fontSize: 21, fontWeight: 800, letterSpacing: -0.4 }}>Skriv inn koden</h2>
              <p style={{ margin: 0, fontSize: 14, color: 'var(--ink-2)', lineHeight: 1.5, maxWidth: 280 }}>Be et medlem om invitasjonskoden, eller skann QR-koden deres.</p>
            </div>
            <input value={joinCode} onChange={(e) => setJoinCode(e.target.value.toUpperCase())} placeholder="FRISK-XXXX" autoFocus className="tnum"
              style={{ width: '100%', boxSizing: 'border-box', textAlign: 'center', letterSpacing: 3, fontSize: 22, fontWeight: 800, border: '1.5px solid var(--line)', background: 'var(--surface-2)', borderRadius: 'var(--r-sm)', padding: '16px', fontFamily: 'var(--font)', color: 'var(--ink)', outline: 'none', marginBottom: 12 }} />
            <U2.Btn full icon={Icon.qr} variant="ghost" onClick={() => toast('Åpner kamera…', 'check')}>Skann QR i stedet</U2.Btn>
            <div style={{ height: 10 }} />
            <U2.Btn full icon={Icon.arrowR} onClick={() => { if (joinCode.trim()) { toast('Sender forespørsel…', 'check'); setMode('manage'); } }}>Bli med</U2.Btn>
          </div>
        )}
      </div>

      {/* member action sheet */}
      <U2.Sheet open={!!sel} onClose={() => setSel(null)} title={sel ? sel.name : ''}>
        {sel && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, paddingBottom: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '4px 2px 16px' }}>
              <span style={{ width: 46, height: 46, borderRadius: 999, background: `hsl(${sel.hue} 45% 45%)`, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 18 }}>{sel.initial}</span>
              <div>
                <p style={{ margin: 0, fontSize: 15.5, fontWeight: 800 }}>{sel.name}</p>
                <p style={{ margin: '1px 0 0', fontSize: 12.5, color: 'var(--ink-3)' }}>{sel.role} · {sel.device}</p>
              </div>
            </div>
            {sel.role === 'Eier' ? (
              <U2.Press onClick={() => { setMemberRole(sel.id, 'Medlem'); setSel(null); }} style={sheetRow}>
                <Icon.user s={20} style={{ color: 'var(--ink-2)' }} /><span style={{ flex: 1, textAlign: 'left', fontWeight: 700 }}>Gjør til medlem</span>
              </U2.Press>
            ) : (
              <U2.Press onClick={() => { setMemberRole(sel.id, 'Eier'); setSel(null); }} style={sheetRow}>
                <Icon.crown s={20} style={{ color: 'var(--primary)' }} /><span style={{ flex: 1, textAlign: 'left', fontWeight: 700 }}>Gjør til eier</span>
              </U2.Press>
            )}
            <U2.Press onClick={() => { removeMember(sel.id); setSel(null); }} style={{ ...sheetRow, color: 'var(--expired)' }}>
              <Icon.trash s={20} /><span style={{ flex: 1, textAlign: 'left', fontWeight: 700 }}>Fjern fra husstand</span>
            </U2.Press>
          </div>
        )}
      </U2.Sheet>

      <U2.GestureNav />
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// SIGN IN  (app gate — Apple / Google SSO + e-post magic link)
// ════════════════════════════════════════════════════════════════
function ProviderBtn({ icon: I, iconColor, label, onClick, dark }) {
  return (
    <U2.Press onClick={onClick} style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 11, width: '100%',
      padding: '15px 18px', borderRadius: 'var(--r-sm)', fontSize: 15.5, fontWeight: 700,
      background: dark ? 'var(--ink)' : 'var(--surface)', color: dark ? 'var(--paper)' : 'var(--ink)',
      border: dark ? 'none' : '1.5px solid var(--line)', boxShadow: 'var(--shadow-sm)',
    }}>
      <span style={{ display: 'flex', color: iconColor || 'currentColor' }}><I s={21} /></span>
      {label}
    </U2.Press>
  );
}

function SignInScreen({ onAuthed }) {
  const [step, setStep] = uS('providers'); // providers | sent
  const [email, setEmail] = uS('');
  const valid = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim());

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 95, background: 'var(--paper)', display: 'flex', flexDirection: 'column' }}>
      <U2.StatusBar />

      {step === 'providers' ? (
        <div className="noscroll" style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', padding: '0 30px' }}>
          {/* brand + value prop */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', minHeight: 280, paddingTop: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--primary)', marginBottom: 26 }}>
              <Icon.logo s={34} /><span style={{ fontSize: 30, fontWeight: 800, color: 'var(--ink)', letterSpacing: -0.5 }}>friskr</span>
            </div>
            <h1 style={{ margin: '0 0 12px', fontSize: 25, fontWeight: 800, letterSpacing: -0.5, lineHeight: 1.2, maxWidth: 300 }}>Logg inn for å fortsette</h1>
            <p style={{ margin: 0, fontSize: 14.5, color: 'var(--ink-2)', lineHeight: 1.5, maxWidth: 290 }}>Lageret ditt synkroniseres trygt på tvers av enheter og deles med husholdningen din.</p>
          </div>

          {/* providers */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 11, paddingBottom: 6 }}>
            <ProviderBtn icon={Icon.apple} label="Fortsett med Apple" dark onClick={() => onAuthed('Apple')} />
            <ProviderBtn icon={Icon.google} iconColor="initial" label="Fortsett med Google" onClick={() => onAuthed('Google')} />

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '10px 2px' }}>
              <span style={{ flex: 1, height: 1, background: 'var(--line)' }} />
              <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ink-3)' }}>eller med e-post</span>
              <span style={{ flex: 1, height: 1, background: 'var(--line)' }} />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--surface)', border: '1.5px solid var(--line)', borderRadius: 'var(--r-sm)', padding: '4px 16px', boxShadow: 'var(--shadow-sm)' }}>
              <Icon.mail s={19} style={{ color: 'var(--ink-3)' }} />
              <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" inputMode="email" placeholder="din@epost.no"
                onKeyDown={(e) => { if (e.key === 'Enter' && valid) setStep('sent'); }}
                style={{ flex: 1, border: 'none', outline: 'none', background: 'none', fontFamily: 'var(--font)', fontSize: 15, color: 'var(--ink)', padding: '13px 0' }} />
            </div>
            <U2.Btn full icon={Icon.arrowR} onClick={() => valid && setStep('sent')}
              style={{ opacity: valid ? 1 : 0.45, pointerEvents: valid ? 'auto' : 'none' }}>Send innloggingslenke</U2.Btn>
          </div>

          <p style={{ margin: '20px 0 26px', fontSize: 11.5, color: 'var(--ink-3)', textAlign: 'center', lineHeight: 1.5 }}>
            Ved å fortsette godtar du <span style={{ color: 'var(--ink-2)', fontWeight: 600 }}>vilkårene</span> og <span style={{ color: 'var(--ink-2)', fontWeight: 600 }}>personvernerklæringen</span>.
          </p>
        </div>
      ) : (
        /* magic-link sent */
        <div className="noscroll" style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', padding: '0 30px' }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
            <div style={{ width: 78, height: 78, borderRadius: 26, background: 'var(--primary-tint)', color: 'var(--on-primary-tint)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}><Icon.mail s={38} /></div>
            <h1 style={{ margin: '0 0 12px', fontSize: 24, fontWeight: 800, letterSpacing: -0.4 }}>Sjekk e-posten din</h1>
            <p style={{ margin: 0, fontSize: 14.5, color: 'var(--ink-2)', lineHeight: 1.55, maxWidth: 300 }}>
              Vi sendte en innloggingslenke til <span style={{ color: 'var(--ink)', fontWeight: 700 }}>{email.trim()}</span>. Åpne den på denne enheten for å logge inn.
            </p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 11, paddingBottom: 26 }}>
            <U2.Btn full icon={Icon.mail} onClick={() => onAuthed('E-post')}>Åpne e-postappen</U2.Btn>
            <U2.Btn full variant="ghost" onClick={() => setStep('providers')}>Bruk en annen e-post</U2.Btn>
          </div>
        </div>
      )}
      <U2.GestureNav />
    </div>
  );
}

Object.assign(window, { Onboarding, HouseholdScreen, SignInScreen });
