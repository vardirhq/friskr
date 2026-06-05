import { useState, useEffect, useRef } from 'react';
import type { Product } from '../lib/friskr';
import { scanLookup } from '../lib/friskr';
import { useUiStore } from '../stores/ui';
import { CatTile } from '../components/CatTile';
import { StatusPill } from '../components/StatusPill';
import { Press } from '../components/Press';
import { Btn } from '../components/Btn';
import { IconFlash, IconFlashOff, IconPencil, IconCal, IconCheck, IconCheckCircle, IconGlobe, IconPlus } from '../components/icons';
import { fmtNO } from '../lib/dates';
import { CATEGORIES } from '../lib/reference';

type Phase = 'barcode' | 'lookup' | 'product' | 'datescan' | 'lookup-date' | 'dateread';
type ScanSource = 'catalogue' | 'openfoodfacts' | 'none' | 'new';

export function ScanScreen() {
  const { openSheet } = useUiStore();
  const [phase, setPhase] = useState<Phase>('barcode');
  const [flash, setFlash] = useState(false);
  const [product, setProduct] = useState<Product | null>(null);
  const [source, setSource] = useState<ScanSource>('catalogue');
  const [offDays, setOffDays] = useState<number | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const reset = () => { setProduct(null); setSource('catalogue'); setOffDays(null); setPhase('barcode'); };

  // simulate barcode detection after a delay (prototype behaviour)
  useEffect(() => {
    if (phase !== 'barcode') return;
    const t = setTimeout(() => {
      doLookup('7038010009457');
    }, 2600);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const doLookup = async (barcode: string) => {
    clearTimeout(timer.current);
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
        setProduct({ id: 'new', name: 'Ukjent produkt', brand: '', cat: 'annet', shelf: 7 });
        setSource('new');
      }
    } catch {
      setProduct({ id: 'new', name: 'Ukjent produkt', brand: '', cat: 'annet', shelf: 7 });
      setSource('new');
    }
    setPhase('product');
  };

  const captureBarcode = () => doLookup('unknown-barcode');

  const captureDate = () => {
    setPhase('lookup-date');
    setTimeout(() => { setOffDays(16); setPhase('dateread'); }, 1150);
  };

  const isDateStep = phase === 'datescan' || phase === 'lookup-date' || phase === 'dateread';
  const scanning = phase === 'barcode' || phase === 'datescan';
  const looking = phase === 'lookup' || phase === 'lookup-date';

  const expiryDate = offDays != null ? new Date(Date.now() + offDays * 86_400_000) : null;

  const SOURCE_META: Record<ScanSource, { label: string; icon: React.ComponentType<{size?: number}>; color: string }> = {
    catalogue: { label: 'Fra husholdningens liste', icon: IconCheckCircle, color: 'var(--primary)' },
    openfoodfacts: { label: 'Funnet i Open Food Facts', icon: IconGlobe, color: 'var(--primary)' },
    none: { label: 'Ikke i databasen', icon: IconPlus, color: 'var(--soon)' },
    new: { label: 'Ny vare — ikke i databasen', icon: IconPlus, color: 'var(--soon)' },
  };

  return (
    <div style={{ position: 'relative', height: '100%', background: '#0a0d0b', overflow: 'hidden' }}>
      {/* faux camera */}
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(120% 80% at 50% 30%, #2a3330 0%, #14191600 60%), linear-gradient(180deg, #1a201d, #0c0f0d)' }}>
        <div style={{ position: 'absolute', inset: 0, opacity: 0.5, background: 'repeating-linear-gradient(115deg, #ffffff08 0 26px, #ffffff02 26px 60px)' }} />
      </div>

      {/* top bar */}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px' }}>
        <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#fff' }}>{isDateStep ? 'Skann utløpsdato' : 'Skann strekkode'}</h2>
        <Press onClick={() => setFlash((f) => !f)} style={{ width: 42, height: 42, borderRadius: 999, background: flash ? '#fff' : 'rgba(255,255,255,.14)', color: flash ? '#111' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {flash ? <IconFlash size={20} /> : <IconFlashOff size={20} />}
        </Press>
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
          ['tl', { top: -2, left: -2 }, { borderTop: '3px solid #fff', borderLeft: '3px solid #fff', borderTopLeftRadius: 16 }],
          ['tr', { top: -2, right: -2 }, { borderTop: '3px solid #fff', borderRight: '3px solid #fff', borderTopRightRadius: 16 }],
          ['bl', { bottom: -2, left: -2 }, { borderBottom: '3px solid #fff', borderLeft: '3px solid #fff', borderBottomLeftRadius: 16 }],
          ['br', { bottom: -2, right: -2 }, { borderBottom: '3px solid #fff', borderRight: '3px solid #fff', borderBottomRightRadius: 16 }],
        ].map(([k, pos, b]) => <div key={String(k)} style={{ position: 'absolute', width: 34, height: 34, ...(pos as object), ...(b as object) }} />)}
        {scanning && (
          <div style={{ position: 'absolute', left: 10, right: 10, height: 2.5, borderRadius: 2, background: 'linear-gradient(90deg, transparent, var(--primary), transparent)', boxShadow: '0 0 14px var(--primary)', animation: 'friskr-scanline 2.4s ease-in-out infinite' }} />
        )}
        {looking && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ width: 30, height: 30, border: '3px solid rgba(255,255,255,.25)', borderTopColor: '#fff', borderRadius: 999, animation: 'friskr-spin .8s linear infinite' }} />
          </div>
        )}
      </div>

      <p style={{ position: 'absolute', top: 'calc(38% + 92px)', left: 0, right: 0, textAlign: 'center', color: 'rgba(255,255,255,.78)', fontSize: 13.5, fontWeight: 600, padding: '0 30px' }}>
        {phase === 'barcode' && 'Rett kameraet mot strekkoden'}
        {phase === 'lookup' && 'Slår opp produktet…'}
        {phase === 'datescan' && 'Pek mot «best før»-datoen på pakken'}
        {phase === 'lookup-date' && 'Leser av datoen…'}
      </p>

      {phase === 'barcode' && (
        <div style={{ position: 'absolute', bottom: 30, left: 0, right: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18 }}>
          <Press onClick={captureBarcode} style={{ width: 72, height: 72, borderRadius: 999, background: 'rgba(255,255,255,.16)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '3px solid rgba(255,255,255,.5)' }}>
            <span style={{ width: 56, height: 56, borderRadius: 999, background: '#fff' }} />
          </Press>
          <Press onClick={() => openSheet({ type: 'add' })} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '11px 18px', borderRadius: 999, background: 'rgba(255,255,255,.14)', color: '#fff', fontSize: 13.5, fontWeight: 700 }}>
            <IconPencil size={17} /> Legg til manuelt
          </Press>
        </div>
      )}

      {phase === 'datescan' && (
        <div style={{ position: 'absolute', bottom: 30, left: 0, right: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <Press onClick={captureDate} style={{ width: 72, height: 72, borderRadius: 999, background: 'rgba(255,255,255,.16)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '3px solid rgba(255,255,255,.5)' }}>
            <span style={{ width: 56, height: 56, borderRadius: 999, background: '#fff' }} />
          </Press>
          <Press onClick={() => openSheet({ type: 'add' })} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '11px 18px', borderRadius: 999, background: 'rgba(255,255,255,.14)', color: '#fff', fontSize: 13.5, fontWeight: 700 }}>
            Hopp over — sett dato selv
          </Press>
        </div>
      )}

      {phase === 'product' && product && (() => {
        const sm = SOURCE_META[source];
        const isNew = source === 'new' || source === 'none';
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
                <p style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>{isNew ? 'Ukjent strekkode' : product.name}</p>
                <p style={{ margin: '2px 0 0', fontSize: 12.5, color: 'var(--ink-3)' }}>{product.brand || CATEGORIES[product.cat]?.label}</p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <Btn variant="ghost" onClick={reset} style={{ flex: 1 }}>Skann på nytt</Btn>
              {isNew ? (
                <Btn onClick={() => openSheet({ type: 'add' })} icon={IconPencil} style={{ flex: 1.5 }}>Legg til manuelt</Btn>
              ) : (
                <Btn onClick={() => setPhase('datescan')} icon={IconCal} style={{ flex: 1.5 }}>Skann dato</Btn>
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
            <Btn variant="ghost" onClick={() => setPhase('datescan')} style={{ flex: 1 }}>Skann på nytt</Btn>
            <Btn onClick={() => openSheet({ type: 'add' })} icon={IconCheck} style={{ flex: 1.5 }}>Legg til</Btn>
          </div>
        </div>
      )}
    </div>
  );
}
