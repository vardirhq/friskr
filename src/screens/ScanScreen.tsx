import { useState, useEffect, useRef } from 'react';
import { Capacitor, registerPlugin } from '@capacitor/core';
import { CameraPreview } from '@capacitor-community/camera-preview';
import { BarcodeScanner, BarcodeFormat } from '@capacitor-mlkit/barcode-scanning';
import type { Product } from '../lib/friskr';
import { scanLookup } from '../lib/friskr';
import { readDateFromText, readDateFromVideo } from '../lib/dateOcr';
import { useUiStore } from '../stores/ui';
import { useSettingsStore } from '../stores/settings';
import { CatTile } from '../components/CatTile';
import { StatusPill } from '../components/StatusPill';
import { Press } from '../components/Press';
import { Btn } from '../components/Btn';
import { IconPencil, IconCal, IconCheck, IconCheckCircle, IconGlobe, IconPlus } from '../components/icons';
import { fmtNO } from '../lib/dates';
import { CATEGORIES } from '../lib/reference';

type Phase = 'scanning' | 'lookup' | 'product' | 'datescan' | 'lookup-date' | 'dateread';
type ScanSource = 'catalogue' | 'openfoodfacts' | 'none' | 'new';

const FORMATS = [
  BarcodeFormat.Ean13, BarcodeFormat.Ean8,
  BarcodeFormat.UpcA, BarcodeFormat.UpcE,
  BarcodeFormat.Code128, BarcodeFormat.Code39,
];

const ExpiryTextRecognizer = registerPlugin<{
  recognize(options: { base64: string }): Promise<{ text: string }>;
}>('ExpiryTextRecognizer');

interface ScanScreenProps {
  dateOnlyProduct?: Product;
  onDateScanned?: (offDays: number) => void;
  onCancelDateScan?: () => void;
}

export function ScanScreen({ dateOnlyProduct, onDateScanned, onCancelDateScan }: ScanScreenProps = {}) {
  const { openSheet } = useUiStore();
  const { debugMode } = useSettingsStore();
  const dateOnly = !!dateOnlyProduct;
  const [phase, setPhase] = useState<Phase>(dateOnly ? 'datescan' : 'scanning');
  const [product, setProduct] = useState<Product | null>(dateOnlyProduct ?? null);
  const [source, setSource] = useState<ScanSource>('catalogue');
  const [offDays, setOffDays] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dateError, setDateError] = useState<string | null>(null);
  const [transparent, setTransparent] = useState(false);
  const [datePreview, setDatePreview] = useState(false);
  const [flash, setFlash] = useState(false);
  const [ocrText, setOcrText] = useState('');
  const [ocrParsedDate, setOcrParsedDate] = useState<Date | null>(null);
  const [ocrAttempted, setOcrAttempted] = useState(false);
  const activeRef = useRef(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const productDraft = product && source !== 'catalogue'
    ? {
        name: product.name === 'Ukjent produkt' ? '' : product.name,
        brand: product.brand,
        cat: product.cat,
        shelf: product.shelf,
        barcode: product.barcode,
      }
    : undefined;

  const stopScan = async () => {
    if (!Capacitor.isNativePlatform()) return;
    activeRef.current = false;
    try { await BarcodeScanner.stopScan(); } catch { /* ignore */ }
    document.documentElement.style.removeProperty('--scan-bg');
    document.querySelector('body')?.classList.remove('scan-transparent');
    setTransparent(false);
  };

  const stopDateStream = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    if (Capacitor.isNativePlatform()) {
      CameraPreview.stop().catch(() => undefined);
      document.documentElement.classList.remove('camera-preview-active');
      document.body.classList.remove('camera-preview-active');
      document.body.classList.remove('camera-preview-modal-active');
      setDatePreview(false);
    }
  };

  const doLookup = async (barcode: string) => {
    await stopScan();
    setPhase('lookup');
    try {
      const result = await scanLookup(barcode);
      if (result.source === 'catalogue') {
        setProduct(result.product); setSource('catalogue');
      } else if (result.source === 'openfoodfacts') {
        const d = result.draft;
        setProduct({ id: 'draft', name: d.name, brand: d.brand, cat: d.cat, shelf: d.shelf, barcode: d.barcode });
        setSource('openfoodfacts');
      } else {
        setProduct({ id: 'new', name: 'Ukjent produkt', brand: '', cat: 'annet', shelf: 7, barcode });
        setSource('new');
      }
    } catch {
      setProduct({ id: 'new', name: 'Ukjent produkt', brand: '', cat: 'annet', shelf: 7 });
      setSource('new');
    }
    setPhase('product');
  };

  const startScan = async () => {
    if (!Capacitor.isNativePlatform() || activeRef.current) return;
    setError(null);
    try {
      const { camera } = await BarcodeScanner.requestPermissions();
      if (camera === 'denied') {
        setError('Kameratilgang er blokkert. Åpne innstillinger og gi tilgang.');
        return;
      }
      activeRef.current = true;
      document.querySelector('body')?.classList.add('scan-transparent');
      setTransparent(true);
      await BarcodeScanner.startScan({ formats: FORMATS });
    } catch {
      setError('Skanning feilet. Prøv igjen.');
      await stopScan();
    }
  };

  // listen for scanned barcodes
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    let cleanup: (() => void) | undefined;
    BarcodeScanner.addListener('barcodesScanned', (event) => {
      if (activeRef.current && event.barcodes?.[0]?.rawValue) {
        doLookup(event.barcodes[0].rawValue ?? '');
      }
    }).then((handle) => { cleanup = () => handle.remove(); });
    return () => { cleanup?.(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // start scanning on mount, clean up on unmount
  useEffect(() => {
    if (dateOnly) enterDateScan();
    else startScan();
    return () => { stopScan(); stopDateStream(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const reset = async () => {
    stopDateStream();
    setProduct(dateOnlyProduct ?? null); setSource('catalogue'); setOffDays(null); setError(null); setDateError(null);
    setOcrText('');
    setOcrParsedDate(null);
    setOcrAttempted(false);
    if (dateOnly) {
      setPhase('datescan');
      enterDateScan();
      return;
    }
    setPhase('scanning');
    activeRef.current = false;
    startScan();
  };

  // Called directly from the "Skann dato" button — must be in user-gesture context
  // so getUserMedia autoplay is permitted by the browser/WebView.
  const enterDateScan = async () => {
    setDateError(null);
    setPhase('datescan');
    if (Capacitor.isNativePlatform()) {
      try {
        document.documentElement.classList.add('camera-preview-active');
        document.body.classList.add('camera-preview-active');
        if (dateOnly) document.body.classList.add('camera-preview-modal-active');
        setDatePreview(true);
        await CameraPreview.start({
          position: 'rear',
          x: 0,
          y: 0,
          width: window.screen.width,
          height: window.screen.height,
          toBack: true,
          storeToFile: false,
          enableZoom: true,
          lockAndroidOrientation: true,
        });
      } catch {
        document.documentElement.classList.remove('camera-preview-active');
        document.body.classList.remove('camera-preview-active');
        document.body.classList.remove('camera-preview-modal-active');
        setDatePreview(false);
        setDateError('Kameratilgang ikke tilgjengelig — sett dato manuelt');
      }
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch {
      setDateError('Kameratilgang ikke tilgjengelig — sett dato manuelt');
    }
  };

  const captureDate = async () => {
    setDateError(null);
    setOcrText('');
    setOcrParsedDate(null);
    setOcrAttempted(true);
    setPhase('lookup-date');
    try {
      let result;
      if (Capacitor.isNativePlatform()) {
        const frame = await CameraPreview.capture({ quality: 95 });
        const recognized = await ExpiryTextRecognizer.recognize({ base64: frame.value });
        result = readDateFromText(recognized.text);
        if (!result.date) {
          await new Promise((resolve) => setTimeout(resolve, 180));
          const retryFrame = await CameraPreview.capture({ quality: 95 });
          const retry = await ExpiryTextRecognizer.recognize({ base64: retryFrame.value });
          result = readDateFromText(`${recognized.text}\n${retry.text}`);
        }
      } else {
        if (!videoRef.current || !streamRef.current) throw new Error('Camera stream is not ready');
        result = await readDateFromVideo(videoRef.current);
      }
      setOcrText(result.rawText);
      setOcrParsedDate(result.date);
      if (result.date && result.offDays != null) {
        stopDateStream();
        setOffDays(result.offDays);
        setPhase('dateread');
      } else {
        setDateError('Fant ingen dato — prøv igjen eller sett dato manuelt');
        setPhase('datescan');
      }
    } catch (error) {
      if (debugMode) {
        setOcrText(`[OCR-feil] ${error instanceof Error ? error.message : String(error)}`);
      }
      setDateError('Kunne ikke lese datoen — hold datoen nærmere og prøv igjen');
      setPhase('datescan');
    }
  };

  const isDateStep = phase === 'datescan' || phase === 'lookup-date' || phase === 'dateread';
  const looking = phase === 'lookup' || phase === 'lookup-date';
  const expiryDate = offDays != null ? new Date(Date.now() + offDays * 86_400_000) : null;

  const SOURCE_META: Record<ScanSource, { label: string; icon: React.ComponentType<{size?: number}> }> = {
    catalogue:     { label: 'Fra husholdningens liste',   icon: IconCheckCircle },
    openfoodfacts: { label: 'Funnet i Open Food Facts',   icon: IconGlobe },
    none:          { label: 'Ikke i databasen',           icon: IconPlus },
    new:           { label: 'Ny vare — ikke i databasen', icon: IconPlus },
  };

  return (
    <>
      {(transparent || datePreview) && (
        <style>{`
          .scan-transparent, .scan-transparent ion-app { background: transparent !important; }
          .scan-transparent #root > div { background: transparent !important; }
          html.camera-preview-active,
          body.camera-preview-active,
          body.camera-preview-active #root,
          body.camera-preview-active #root > div,
          body.camera-preview-active #root > div > div:first-child {
            background: transparent !important;
            background-image: none !important;
          }
          body.camera-preview-modal-active #root {
            visibility: hidden !important;
          }
        `}</style>
      )}

      <div style={{ position: 'relative', height: '100%', overflow: 'hidden', background: (transparent || datePreview) ? 'transparent' : '#0a0d0b', paddingTop: 'env(safe-area-inset-top)' }}>

        {/* Browser fallback only. Native uses CameraPreview behind the WebView. */}
        {!Capacitor.isNativePlatform() && (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            disablePictureInPicture
            controls={false}
            style={{
              position: 'absolute', inset: 0, width: '100%', height: '100%',
              objectFit: 'cover',
              opacity: (phase === 'datescan' || phase === 'lookup-date') ? 1 : 0,
              pointerEvents: 'none',
            }}
          />
        )}

        {/* dark gradient background — shown when not in transparent barcode scan mode */}
        {!transparent && !datePreview && (
          <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(120% 80% at 50% 30%, #2a3330 0%, #14191600 60%), linear-gradient(180deg, #1a201d, #0c0f0d)', opacity: (phase === 'datescan' || phase === 'lookup-date') ? 0 : 1, transition: 'opacity .3s' }}>
            <div style={{ position: 'absolute', inset: 0, opacity: 0.5, background: 'repeating-linear-gradient(115deg, #ffffff08 0 26px, #ffffff02 26px 60px)' }} />
          </div>
        )}

        {/* top bar */}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px' }}>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#fff' }}>{isDateStep ? 'Skann utløpsdato' : 'Skann strekkode'}</h2>
          <button onClick={async () => {
            const next = !flash;
            setFlash(next);
            if (Capacitor.isNativePlatform() && datePreview) {
              await CameraPreview.setFlashMode({ flashMode: next ? 'torch' : 'off' }).catch(() => setFlash(false));
            }
          }} style={{ background: flash ? 'rgba(255,220,50,.18)' : 'rgba(255,255,255,.12)', border: 'none', borderRadius: 999, width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0 }}>
            {flash ? (
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M11 2L4 11h6l-1 7 7-9h-6l1-7z" fill="#FFD932" />
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M11 2L4 11h6l-1 7 7-9h-6l1-7z" fill="none" stroke="rgba(255,255,255,.7)" strokeWidth="1.6" strokeLinejoin="round" />
              </svg>
            )}
          </button>
        </div>

        {/* step chips */}
        <div style={{ position: 'relative', display: 'flex', gap: 7, justifyContent: 'center', marginTop: 2 }}>
          {[['1', 'Strekkode', !isDateStep], ['2', 'Dato', isDateStep]].map(([n, lbl, on]) => (
            <span key={String(n)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 11px 5px 6px', borderRadius: 999, background: on ? 'rgba(255,255,255,.16)' : 'rgba(255,255,255,.06)', color: on ? '#fff' : 'rgba(255,255,255,.5)' }}>
              <span style={{ width: 18, height: 18, borderRadius: 999, background: on ? 'var(--primary)' : 'rgba(255,255,255,.18)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800 }}>{n}</span>
              <span style={{ fontSize: 12, fontWeight: 700 }}>{String(lbl)}</span>
            </span>
          ))}
        </div>

        {/* reticle */}
        <div style={{ position: 'absolute', left: '50%', top: '38%', transform: 'translate(-50%,-50%)', width: 250, height: isDateStep ? 96 : 168, transition: 'height .3s' }}>
          {[
            ['tl', { top: -2, left: -2 },     { borderTop: '3px solid #fff', borderLeft: '3px solid #fff', borderTopLeftRadius: 16 }],
            ['tr', { top: -2, right: -2 },    { borderTop: '3px solid #fff', borderRight: '3px solid #fff', borderTopRightRadius: 16 }],
            ['bl', { bottom: -2, left: -2 },  { borderBottom: '3px solid #fff', borderLeft: '3px solid #fff', borderBottomLeftRadius: 16 }],
            ['br', { bottom: -2, right: -2 }, { borderBottom: '3px solid #fff', borderRight: '3px solid #fff', borderBottomRightRadius: 16 }],
          ].map(([k, pos, b]) => <div key={String(k)} style={{ position: 'absolute', width: 34, height: 34, ...(pos as object), ...(b as object) }} />)}
          {phase === 'scanning' && (
            <div style={{ position: 'absolute', left: 10, right: 10, height: 2.5, borderRadius: 2, background: 'linear-gradient(90deg, transparent, var(--primary), transparent)', boxShadow: '0 0 14px var(--primary)', animation: 'friskr-scanline 2.4s ease-in-out infinite' }} />
          )}
          {looking && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ width: 30, height: 30, border: '3px solid rgba(255,255,255,.25)', borderTopColor: '#fff', borderRadius: 999, animation: 'friskr-spin .8s linear infinite' }} />
            </div>
          )}
        </div>

        <p style={{ position: 'relative', marginTop: 'calc(38% - 76px + 96px)', textAlign: 'center', color: 'rgba(255,255,255,.78)', fontSize: 13.5, fontWeight: 600, padding: '0 30px' }}>
          {phase === 'scanning' && (error ?? (Capacitor.isNativePlatform() ? 'Rett kameraet mot strekkoden' : 'Kun tilgjengelig i appen'))}
          {phase === 'lookup' && 'Slår opp produktet…'}
          {phase === 'datescan' && (dateError ?? 'Pek mot «best før»-datoen på pakken')}
          {phase === 'lookup-date' && 'Leser av datoen…'}
        </p>

        {debugMode && isDateStep && (
          <div style={{
            position: 'absolute', left: 12, right: 12,
            bottom: phase === 'dateread' ? 232 : 142, zIndex: 20,
            maxHeight: 150, overflow: 'auto', padding: '10px 12px',
            borderRadius: 12, border: '1px solid rgba(111,255,176,.45)',
            background: 'rgba(4,12,8,.88)', color: '#d8ffe7',
            boxShadow: '0 8px 30px rgba(0,0,0,.35)',
            backdropFilter: 'blur(8px)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 6 }}>
              <span style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: 0.7, color: '#70e69c' }}>
                OCR DEBUG · {Capacitor.isNativePlatform() ? 'NATIVE ML KIT' : 'WEB TESSERACT'}
              </span>
              <span style={{ fontSize: 10.5, fontWeight: 700, color: ocrParsedDate ? '#70e69c' : '#ffd166' }}>
                {phase === 'lookup-date'
                  ? 'LESER…'
                  : ocrParsedDate
                    ? `PARSET ${fmtNO(ocrParsedDate)}`
                    : 'IKKE PARSET'}
              </span>
            </div>
            <pre style={{
              margin: 0, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere',
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
              fontSize: 12, lineHeight: 1.4, color: '#fff',
            }}>
              {ocrAttempted
                ? (ocrText || '(OCR returnerte tom tekst)')
                : 'Ingen OCR-tekst fanget ennå. Ta et bilde for å se råresultatet.'}
            </pre>
          </div>
        )}

        {phase === 'scanning' && (
          <div style={{ position: 'absolute', bottom: 30, left: 0, right: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
            {error && (
              <Press onClick={startScan} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '13px 24px', borderRadius: 999, background: 'var(--primary)', color: '#fff', fontSize: 14, fontWeight: 700 }}>
                Prøv igjen
              </Press>
            )}
            <Press onClick={() => { stopScan(); openSheet({ type: 'add' }); }} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '11px 18px', borderRadius: 999, background: 'rgba(255,255,255,.14)', color: '#fff', fontSize: 13.5, fontWeight: 700 }}>
              <IconPencil size={17} /> Legg til manuelt
            </Press>
          </div>
        )}

        {phase === 'datescan' && (
          <div style={{ position: 'absolute', bottom: 30, left: 0, right: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
            <Press onClick={captureDate} style={{ width: 72, height: 72, borderRadius: 999, background: 'rgba(255,255,255,.16)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '3px solid rgba(255,255,255,.5)' }}>
              <span style={{ width: 56, height: 56, borderRadius: 999, background: '#fff' }} />
            </Press>
            <Press onClick={() => {
              stopDateStream();
              if (dateOnly) onCancelDateScan?.();
              else if (source === 'catalogue') openSheet({ type: 'add', product: product ?? undefined });
              else openSheet({ type: 'add', productDraft });
            }} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '11px 18px', borderRadius: 999, background: 'rgba(255,255,255,.14)', color: '#fff', fontSize: 13.5, fontWeight: 700 }}>
              {dateOnly ? 'Tilbake til varen' : 'Hopp over — sett dato selv'}
            </Press>
          </div>
        )}

        {phase === 'product' && product && (() => {
          const sm = SOURCE_META[source];
          const isNew = source !== 'catalogue';
          const SmIcon = sm.icon;
          return (
            <div style={{ position: 'absolute', left: 14, right: 14, bottom: 22, background: 'var(--surface)', borderRadius: 'var(--r)', padding: 16, boxShadow: 'var(--shadow-lg)', animation: 'friskr-rise .3s ease' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 11px', borderRadius: 999, background: isNew ? 'var(--soon-tint)' : 'var(--primary-tint)', color: isNew ? 'var(--soon)' : 'var(--on-primary-tint)', marginBottom: 12 }}>
                <SmIcon size={15} />
                <span style={{ fontSize: 12, fontWeight: 800 }}>{sm.label}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 13, marginBottom: 14 }}>
                <CatTile cat={product.cat} size={52} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>{source === 'new' || source === 'none' ? 'Ukjent strekkode' : product.name}</p>
                  <p style={{ margin: '2px 0 0', fontSize: 12.5, color: 'var(--ink-3)' }}>{product.brand || CATEGORIES[product.cat]?.label}</p>
                </div>
                {!isNew && <span style={{ color: 'var(--primary)', display: 'flex' }}><IconCheckCircle size={26} /></span>}
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <Btn variant="ghost" onClick={reset} style={{ flex: 1 }}>Skann på nytt</Btn>
                {isNew ? (
                  <Btn onClick={() => openSheet({ type: 'add', productDraft })} icon={IconPencil} style={{ flex: 1.5 }}>Opprett produkt</Btn>
                ) : (
                  <Btn onClick={enterDateScan} icon={IconCal} style={{ flex: 1.5 }}>Skann dato</Btn>
                )}
              </div>
            </div>
          );
        })()}

        {phase === 'dateread' && product && offDays != null && expiryDate && (
          <div style={{ position: 'absolute', left: 14, right: 14, bottom: 22, background: 'var(--surface)', borderRadius: 'var(--r)', padding: 16, boxShadow: 'var(--shadow-lg)', animation: 'friskr-rise .3s ease' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 13, marginBottom: 12 }}>
              <CatTile cat={product.cat} size={46} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: 15.5, fontWeight: 800 }}>{product.name}</p>
                <p style={{ margin: '2px 0 0', fontSize: 12.5, color: 'var(--ink-3)' }}>{product.brand || CATEGORIES[product.cat]?.label}</p>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--surface-2)', border: '1px solid var(--line)', borderRadius: 'var(--r-sm)', padding: '12px 14px', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ color: 'var(--primary)', display: 'flex' }}><IconCal size={19} /></span>
                <div>
                  <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: 0.4 }}>Lest av · best før</p>
                  <p className="tnum" style={{ margin: '1px 0 0', fontSize: 16, fontWeight: 800 }}>{fmtNO(expiryDate)}</p>
                </div>
              </div>
              <StatusPill off={offDays} dense />
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <Btn variant="ghost" onClick={reset} style={{ flex: 1 }}>Skann på nytt</Btn>
              <Btn onClick={() => {
                stopDateStream();
                if (dateOnly) onDateScanned?.(offDays);
                else if (source === 'catalogue') openSheet({ type: 'add', product, offDays });
                else openSheet({ type: 'add', productDraft, offDays });
              }} icon={IconCheck} style={{ flex: 1.5 }}>{dateOnly ? 'Bruk dato' : 'Legg til'}</Btn>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
