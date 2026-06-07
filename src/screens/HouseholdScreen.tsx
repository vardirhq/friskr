import { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { BarcodeScanner, BarcodeFormat } from '@capacitor-mlkit/barcode-scanning';
import { useHouseholdStore } from '../stores/household';
import { useUiStore } from '../stores/ui';
import { useAuthStore } from '../stores/auth';
import { Press } from '../components/Press';
import { Btn } from '../components/Btn';
import { Card } from '../components/Card';
import type { Member } from '../lib/friskr';
import {
  sendInvite as apiSendInvite,
  listInvites,
  withdrawInvite as apiWithdrawInvite,
  leaveHousehold,
  kickMember as apiKickMember,
  type Invite,
} from '../lib/friskr';
import { setTokens } from '../lib/api';
import {
  IconChevL, IconHome, IconCopy, IconCheck, IconLink,
  IconPhone, IconKey, IconUsers, IconArrowR, IconQr,
} from '../components/icons';

function MailIcon() {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <rect x={2} y={4} width={20} height={16} rx={2} />
      <path d="M2 7l10 7 10-7" />
    </svg>
  );
}

interface HouseholdScreenProps {
  onClose: () => void;
}

function RealQR({ code, size = 132 }: { code: string; size?: number }) {
  const [svgString, setSvgString] = useState<string>('');

  useEffect(() => {
    QRCode.toString(code, { type: 'svg', width: size, margin: 1, color: { dark: '#000000', light: '#ffffff' } })
      .then(setSvgString)
      .catch(() => {});
  }, [code, size]);

  return (
    <div style={{ width: size, height: size }}>
      {svgString ? (
        <div dangerouslySetInnerHTML={{ __html: svgString }} />
      ) : (
        <div style={{ width: size, height: size }} />
      )}
    </div>
  );
}

export function HouseholdScreen({ onClose }: HouseholdScreenProps) {
  const householdStore = useHouseholdStore();
  const { household } = householdStore;
  const { showToast } = useUiStore();
  const { user } = useAuthStore();
  const [mode, setMode] = useState<'manage' | 'join'>('manage');
  const [joinCode, setJoinCode] = useState('');
  const [joining, setJoining] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [copied, setCopied] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [pendingInvites, setPendingInvites] = useState<Invite[]>([]);

  const withdrawInvite = async (id: string) => {
    try {
      await apiWithdrawInvite(id);
      setPendingInvites(p => p.filter(i => i.id !== id));
    } catch {
      showToast('Kunne ikke trekke invitasjon', 'x');
    }
  };

  const sendInviteHandler = async () => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inviteEmail)) {
      showToast('Ugyldig e-postadresse', 'x');
      return;
    }
    try {
      const inv = await apiSendInvite(inviteEmail);
      setPendingInvites(p => [...p, inv]);
      showToast('Invitasjon sendt', 'check');
      setInviteEmail('');
    } catch (err: unknown) {
      const code = (err as { code?: string }).code;
      showToast(code === 'ALREADY_MEMBER' ? 'Allerede medlem' : 'Kunne ikke sende invitasjon', 'x');
    }
  };

  useEffect(() => {
    if (!household) return;
    listInvites().then(setPendingInvites).catch(() => {});
  }, [household?.id]);

  const scanQR = async () => {
    try {
      const { camera } = await BarcodeScanner.requestPermissions();
      if (camera !== 'granted' && camera !== 'limited') {
        showToast('Kameratilgang nektet', 'x');
        return;
      }
      setScanning(true);
      document.documentElement.classList.add('barcode-scanning');

      await BarcodeScanner.addListener('barcodesScanned', async ({ barcodes }) => {
        const val = barcodes[0]?.rawValue ?? '';
        if (val.length > 0) {
          await BarcodeScanner.stopScan();
          await BarcodeScanner.removeAllListeners();
          document.documentElement.classList.remove('barcode-scanning');
          setScanning(false);
          setJoinCode(val.toUpperCase());
        }
      });

      await BarcodeScanner.startScan({ formats: [BarcodeFormat.QrCode] });
    } catch {
      document.documentElement.classList.remove('barcode-scanning');
      setScanning(false);
      showToast('Kunne ikke åpne kamera', 'x');
    }
  };

  const copy = () => {
    try { navigator.clipboard?.writeText(household!.code); } catch (e) {}
    setCopied(true); setTimeout(() => setCopied(false), 1600);
    showToast('Kode kopiert', 'check');
  };
  const share = () => showToast('Delingslenke klar', 'link');

  const isOwner = household?.members.find(m => m.userId === user?.id)?.role === 'Eier';

  if (!household) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 150, background: 'var(--paper)', display: 'flex', flexDirection: 'column', animation: 'friskr-rise .25s ease' }}>
      {/* header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: 'calc(8px + env(safe-area-inset-top)) 12px 6px' }}>
        <Press onClick={mode === 'join' ? () => setMode('manage') : onClose} style={{ width: 40, height: 40, borderRadius: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink-2)' }}>
          <IconChevL size={24} />
        </Press>
        <h1 style={{ margin: 0, fontSize: 19, fontWeight: 800, letterSpacing: -0.4 }}>
          {mode === 'join' ? 'Bli med i husholdning' : 'Husholdning'}
        </h1>
      </div>

      <div className="noscroll" style={{ flex: 1, overflow: 'auto', padding: '6px 16px calc(28px + env(safe-area-inset-bottom))' }}>
        {mode === 'manage' ? (
          <>
            {/* household header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '4px 2px 18px' }}>
              <div style={{ width: 52, height: 52, borderRadius: 16, background: 'var(--primary-tint)', color: 'var(--on-primary-tint)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <IconHome size={26} />
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>{household.name}</p>
                <p style={{ margin: '2px 0 0', fontSize: 13, color: 'var(--ink-3)' }}>{household.members.length} medlemmer · delt lager</p>
              </div>
            </div>

            {/* invite card */}
            <Card pad={18} style={{ marginBottom: 16, textAlign: 'center' }}>
              <p style={{ margin: '0 0 4px', fontSize: 13.5, fontWeight: 800 }}>Inviter familien</p>
              <p style={{ margin: '0 0 16px', fontSize: 12.5, color: 'var(--ink-3)', lineHeight: 1.45 }}>Del koden eller QR-en. Den som scanner kobles til det samme delte lageret.</p>
              <div style={{ display: 'inline-flex', padding: 12, background: 'var(--surface-2)', border: '1px solid var(--line)', borderRadius: 'var(--r-sm)', marginBottom: 14 }}>
                <RealQR code={household.code} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, background: 'var(--surface-2)', border: '1px dashed var(--line)', borderRadius: 'var(--r-sm)', padding: '12px 14px', marginBottom: 12 }}>
                <div style={{ textAlign: 'left' }}>
                  <p style={{ margin: 0, fontSize: 10.5, fontWeight: 700, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: 0.6 }}>Invitasjonskode</p>
                  <p className="tnum" style={{ margin: '1px 0 0', fontSize: 19, fontWeight: 800, letterSpacing: 1.5 }}>{household.code}</p>
                </div>
                <Press onClick={copy} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 13px', borderRadius: 999, background: copied ? 'var(--primary)' : 'var(--primary-tint)', color: copied ? 'var(--on-primary)' : 'var(--on-primary-tint)', fontSize: 13, fontWeight: 800 }}>
                  {copied ? <IconCheck size={16} /> : <IconCopy size={16} />}
                  {copied ? 'Kopiert' : 'Kopier'}
                </Press>
              </div>
              <Btn full variant="ghost" icon={IconLink} onClick={share}>Del lenke</Btn>
            </Card>

            {/* members */}
            <p style={{ margin: '0 4px 8px', fontSize: 12, fontWeight: 800, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: 0.6 }}>Medlemmer</p>
            <Card pad={4} style={{ padding: '4px 14px', marginBottom: 16 }}>
              {household.members.map((m, i) => (
                <div key={m.userId} style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '12px 4px', borderBottom: i === household.members.length - 1 ? 'none' : '1px solid var(--line-2)' }}>
                  <span style={{ width: 40, height: 40, borderRadius: 999, background: `hsl(${m.hue} 45% 45%)`, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 16, flexShrink: 0 }}>{m.initial}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: 14.5, fontWeight: 700 }}>{m.name}</p>
                    <p style={{ margin: '1px 0 0', fontSize: 12, color: 'var(--ink-3)', display: 'flex', alignItems: 'center', gap: 5 }}>
                      <IconPhone size={13} />{(m as Member & { device?: string }).device ?? 'Ukjent enhet'}
                    </p>
                  </div>
                  <span style={{ fontSize: 11.5, fontWeight: 800, padding: '4px 10px', borderRadius: 999, background: m.role === 'Eier' ? 'var(--primary-tint)' : 'var(--surface-2)', color: m.role === 'Eier' ? 'var(--on-primary-tint)' : 'var(--ink-3)' }}>
                    {m.role}
                  </span>
                  {isOwner && m.role !== 'Eier' && (
                    <Press
                      onClick={async () => {
                        try {
                          await apiKickMember(m.userId);
                          await householdStore.reload();
                          showToast(`${m.name} fjernet`, 'check');
                        } catch {
                          showToast('Kunne ikke fjerne medlem', 'x');
                        }
                      }}
                      style={{ fontSize: 12, fontWeight: 700, padding: '5px 10px', borderRadius: 999, background: 'var(--surface-2)', border: '1px solid var(--line)', color: 'var(--ink-3)' }}
                    >
                      Fjern
                    </Press>
                  )}
                </div>
              ))}
            </Card>

            {pendingInvites.length > 0 && (
              <>
                <p style={{ margin: '0 4px 8px', fontSize: 12, fontWeight: 800, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: 0.6 }}>Ventende invitasjoner</p>
                <Card pad={4} style={{ padding: '4px 14px', marginBottom: 16 }}>
                  {pendingInvites.map((inv, i) => (
                    <div key={inv.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 4px', borderBottom: i === pendingInvites.length - 1 ? 'none' : '1px solid var(--line-2)', color: 'var(--ink-2)' }}>
                      <MailIcon />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{inv.email}</p>
                        <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--ink-3)' }}>sendt {inv.daysAgo} dager siden</p>
                      </div>
                      <Press onClick={() => withdrawInvite(inv.id)} style={{ fontSize: 12.5, fontWeight: 700, padding: '6px 12px', borderRadius: 999, background: 'var(--surface-2)', border: '1px solid var(--line)', color: 'var(--ink-2)' }}>Trekk</Press>
                    </div>
                  ))}
                </Card>
              </>
            )}

            <p style={{ margin: '0 4px 8px', fontSize: 12, fontWeight: 800, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: 0.6 }}>Inviter på e-post</p>
            <Card pad={14} style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type="email"
                  placeholder="navn@eksempel.no"
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                  style={{ flex: 1, fontSize: 14, fontFamily: 'var(--font)', border: '1.5px solid var(--line)', background: 'var(--surface-2)', borderRadius: 'var(--r-sm)', padding: '10px 12px', color: 'var(--ink)', outline: 'none', minWidth: 0 }}
                />
                <Press onClick={sendInviteHandler} style={{ fontSize: 13.5, fontWeight: 800, padding: '10px 16px', borderRadius: 'var(--r-sm)', background: 'var(--primary)', color: 'var(--on-primary)', flexShrink: 0 }}>Send</Press>
              </div>
            </Card>

            {/* "Ny telefon?" explainer */}
            <div style={{ display: 'flex', gap: 12, padding: 14, background: 'var(--surface-2)', borderRadius: 'var(--r-sm)', border: '1px solid var(--line)', marginBottom: 18 }}>
              <span style={{ color: 'var(--primary)', flexShrink: 0, marginTop: 1 }}><IconKey size={20} /></span>
              <div>
                <p style={{ margin: 0, fontSize: 13.5, fontWeight: 700 }}>Ny telefon?</p>
                <p style={{ margin: '3px 0 0', fontSize: 12.5, color: 'var(--ink-2)', lineHeight: 1.5 }}>Logg inn med samme konto, så er hele lageret der med en gang. Endringer synkroniseres mellom alle enheter når du er på nett.</p>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingBottom: 8 }}>
              <Press onClick={() => setMode('join')} style={{ display: 'block', width: '100%', textAlign: 'center', padding: '12px', fontSize: 13.5, fontWeight: 700, color: 'var(--primary)' }}>
                Bli med i en annen husholdning
              </Press>
              <Press
                onClick={async () => {
                  if (!window.confirm('Er du sikker på at du vil forlate husholdningen?')) return;
                  setLeaving(true);
                  try {
                    const { jwt } = await leaveHousehold();
                    const refresh = localStorage.getItem('friskr_refresh') ?? '';
                    setTokens(jwt, refresh);
                    await householdStore.reload();
                    onClose();
                  } catch {
                    showToast('Kunne ikke forlate husholdning', 'x');
                  } finally {
                    setLeaving(false);
                  }
                }}
                style={{ display: 'block', width: '100%', textAlign: 'center', padding: '12px', fontSize: 13.5, fontWeight: 700, color: 'var(--error, #e53e3e)', opacity: leaving ? 0.5 : 1 }}
              >
                {leaving ? 'Forlater…' : 'Forlat husholdning'}
              </Press>
            </div>
          </>
        ) : (
          /* JOIN flow */
          <div style={{ paddingTop: 8 }}>
            {scanning && (
              <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'transparent', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 'calc(40px + env(safe-area-inset-bottom))' }}>
                <Press
                  onClick={async () => {
                    await BarcodeScanner.stopScan();
                    await BarcodeScanner.removeAllListeners();
                    document.documentElement.classList.remove('barcode-scanning');
                    setScanning(false);
                  }}
                  style={{ padding: '14px 32px', borderRadius: 999, background: 'rgba(0,0,0,0.7)', color: '#fff', fontSize: 15, fontWeight: 700 }}
                >
                  Avbryt
                </Press>
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: 24 }}>
              <div style={{ width: 64, height: 64, borderRadius: 20, background: 'var(--primary-tint)', color: 'var(--on-primary-tint)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                <IconUsers size={30} />
              </div>
              <h2 style={{ margin: '0 0 8px', fontSize: 21, fontWeight: 800, letterSpacing: -0.4 }}>Skriv inn koden</h2>
              <p style={{ margin: 0, fontSize: 14, color: 'var(--ink-2)', lineHeight: 1.5, maxWidth: 280 }}>Be et medlem om invitasjonskoden, eller skann QR-koden deres.</p>
            </div>
            <input
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="FRISK-XXXX"
              autoFocus
              disabled={joining}
              className="tnum"
              style={{ width: '100%', boxSizing: 'border-box', textAlign: 'center', letterSpacing: 3, fontSize: 22, fontWeight: 800, border: '1.5px solid var(--line)', background: 'var(--surface-2)', borderRadius: 'var(--r-sm)', padding: '16px', fontFamily: 'var(--font)', color: 'var(--ink)', outline: 'none', marginBottom: 12, opacity: joining ? 0.5 : 1 }}
            />
            <Btn full icon={IconQr} variant="ghost" onClick={scanQR} disabled={joining}>Skann QR i stedet</Btn>
            <div style={{ height: 10 }} />
            <Btn full icon={IconArrowR} disabled={joining} onClick={async () => {
              const code = joinCode.trim();
              if (!code) return;
              setJoining(true);
              try {
                await householdStore.join(code);
                onClose();
              } catch (err: unknown) {
                const msg = (err as { message?: string }).message ?? 'Ukjent feil';
                showToast(msg.includes('NOT_FOUND') || msg.includes('Invalid') ? 'Ugyldig kode' : 'Noe gikk galt', 'x');
              } finally {
                setJoining(false);
              }
            }}>{joining ? 'Laster…' : 'Bli med'}</Btn>
          </div>
        )}
      </div>
    </div>
  );
}
