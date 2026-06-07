import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { Product, StockItem } from '../lib/friskr';
import { listProducts } from '../lib/friskr';
import { useStockStore } from '../stores/stock';
import { useHouseholdStore } from '../stores/household';
import { useUiStore } from '../stores/ui';
import { Sheet } from '../components/Sheet';
import { ProductEditorSheet, type ProductDraft } from '../components/ProductEditorSheet';
import { ScanScreen } from './ScanScreen';
import { CatTile } from '../components/CatTile';
import { StatusPill } from '../components/StatusPill';
import { Press } from '../components/Press';
import { Btn } from '../components/Btn';
import { ICON_MAP } from '../components/icons';
import { IconSearch, IconX, IconCal, IconPlus, IconMinus, IconCheck, IconTag, IconLocFreezer, IconBellOff, IconClock } from '../components/icons';
import { daysUntil, parseDate, toISODate } from '../lib/dates';
import { CATEGORY_PRICE, freezerDaysFor, THAW_DAYS } from '../lib/reference';
import { useLocationStore } from '../stores/locations';

const FIELD_LABEL: React.CSSProperties = {
  display: 'block', fontSize: 12.5, fontWeight: 700, color: 'var(--ink-3)',
  textTransform: 'uppercase', letterSpacing: 0.4, margin: '0 0 9px',
};

function Stepper({ value, onChange, min = 1 }: { value: number; onChange: (n: number) => void; min?: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
      <Press onClick={() => onChange(Math.max(min, value - 1))} style={{ width: 40, height: 40, borderRadius: 12, background: value <= min ? 'var(--surface-2)' : 'var(--primary-tint)', color: value <= min ? 'var(--ink-3)' : 'var(--on-primary-tint)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--line)' }}>
        <IconMinus size={20} strokeWidth={2.2} />
      </Press>
      <span className="tnum" style={{ fontSize: 22, fontWeight: 800, minWidth: 28, textAlign: 'center' }}>{value}</span>
      <Press onClick={() => onChange(value + 1)} style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--primary-tint)', color: 'var(--on-primary-tint)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--line)' }}>
        <IconPlus size={20} strokeWidth={2.2} />
      </Press>
    </div>
  );
}

interface AddSheetProps {
  open: boolean;
  onClose: () => void;
  editItem?: StockItem | null;
  initialProduct?: Product;
  initialOffDays?: number;
  initialProductDraft?: ProductDraft;
}

export function AddSheet({ open, onClose, editItem, initialProduct, initialOffDays, initialProductDraft }: AddSheetProps) {
  const { household } = useHouseholdStore();
  const stockStore = useStockStore();
  const { showToast } = useUiStore();
  const { locations, load: loadLocations } = useLocationStore();

  const [products, setProducts] = useState<Product[]>([]);
  const [sel, setSel] = useState<Product | null>(null);
  const [q, setQ] = useState('');
  const [qty, setQty] = useState(1);
  const [loc, setLoc] = useState('kjoleskap');
  const [days, setDays] = useState(7);
  const [note, setNote] = useState('');
  const [price, setPrice] = useState('');
  const [loading, setLoading] = useState(false);
  const [remind, setRemind] = useState<number | null>(null);
  const [thawDays, setThawDays] = useState(THAW_DAYS);
  const [dateScannerOpen, setDateScannerOpen] = useState(false);
  const [productEditorOpen, setProductEditorOpen] = useState(false);
  const [productDraft, setProductDraft] = useState<ProductDraft | undefined>();

  useEffect(() => {
    if (!open || !household) return;
    listProducts(household.id).then(setProducts).catch(console.error);
    loadLocations(household.id).catch(console.error);
  }, [open, household]);

  useEffect(() => {
    if (!open) return;
    if (editItem) {
      setSel(editItem.product);
      setQty(editItem.qty);
      setLoc(editItem.loc);
      setDays(
        editItem.frozen && editItem.bestForOff != null
          ? editItem.bestForOff
          : (editItem.off ?? editItem.product.shelf ?? 7)
      );
      setNote(editItem.note ?? '');
      setPrice(editItem.price != null ? String(editItem.price) : '');
      setRemind(editItem.reminderDaysBefore);
      setThawDays(THAW_DAYS);
    } else if (initialProduct) {
      setSel(initialProduct);
      setDays(initialOffDays ?? initialProduct.shelf ?? 7);
      setQ(''); setQty(1); setLoc('kjoleskap');
      setNote(''); setPrice(''); setRemind(null); setThawDays(THAW_DAYS);
    } else {
      setSel(null); setQ(''); setQty(1); setLoc('kjoleskap');
      setDays(7); setNote(''); setPrice('');
      setRemind(null); setThawDays(THAW_DAYS);
    }
    if (initialProductDraft) {
      setProductDraft(initialProductDraft);
      setProductEditorOpen(true);
    } else {
      setProductDraft(undefined);
      setProductEditorOpen(false);
    }
  }, [open, editItem, initialProduct, initialOffDays, initialProductDraft]);

  useEffect(() => {
    if (!open || locations.length === 0) return;
    if (!locations.some((location) => location.id === loc)) setLoc(locations[0].id);
  }, [open, locations, loc]);

  const wasFrozen = editItem?.frozen ?? false;

  const filtered = products.filter((p) => q === '' || (p.name + ' ' + p.brand).toLowerCase().includes(q.toLowerCase()));

  const quick = [
    { l: 'I dag', d: 0 }, { l: '+3 d', d: 3 }, { l: '+1 uke', d: 7 },
    sel ? { l: `Anbefalt (${sel.shelf}d)`, d: sel.shelf ?? 7 } : { l: '+2 uker', d: 14 },
  ];

  const targetDate = new Date();
  targetDate.setDate(targetDate.getDate() + days);
  const thawDate = new Date();
  thawDate.setDate(thawDate.getDate() + thawDays);
  const locEntries = locations;

  const setDateFromInput = (value: string, setter: (value: number) => void) => {
    const date = parseDate(value);
    const offset = daysUntil(date);
    if (offset != null) setter(offset);
  };

  // Freezer / thaw logic
  const isFrozen = locations.find((location) => location.id === loc)?.freezer ?? false;
  const thawing = wasFrozen && !isFrozen;
  const cat = sel?.cat ?? 'annet';
  const horizonOff = isFrozen
    ? (wasFrozen && editItem ? (editItem.off ?? freezerDaysFor(cat)) : freezerDaysFor(cat))
    : null;

  const resolved = isFrozen
    ? { off: horizonOff ?? freezerDaysFor(cat), frozen: true, bestForOff: days, thawed: false }
    : thawing
      ? { off: thawDays, frozen: false, bestForOff: null, thawed: true }
      : { off: days, frozen: false, bestForOff: null, thawed: false };

  const dateLabel = isFrozen ? 'Best før (på pakken)' : thawing ? 'Tint — spis innen' : 'Utløpsdato';

  const handleSave = async () => {
    if (!sel || !household) return;
    setLoading(true);
    try {
      await stockStore.save(household.id, {
        product: sel, qty, loc, off: resolved.off,
        note: note || null,
        price: price === '' ? null : Number(price.replace(',', '.')),
        editId: editItem?.id ?? null,
        frozen: resolved.frozen,
        bestForOff: resolved.bestForOff,
        thawed: resolved.thawed,
        reminderDaysBefore: remind,
      });
      showToast(editItem ? 'Lagret' : `${sel.name} lagt til`, 'check');
      onClose();
    } catch {
      showToast('Noe gikk galt', 'x');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
    <Sheet open={open && !dateScannerOpen} onClose={onClose} title={editItem ? 'Rediger vare' : (sel ? 'Legg til på lager' : 'Ny vare')} maxH={92}>
      {sel ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 13, padding: 12, background: 'var(--surface-2)', borderRadius: 'var(--r-sm)', marginBottom: 16, border: '1px solid var(--line)' }}>
          <CatTile cat={sel.cat} size={46} />
          <div style={{ flex: 1 }}>
            <p style={{ margin: 0, fontSize: 15.5, fontWeight: 700 }}>{sel.name}</p>
            <p style={{ margin: '2px 0 0', fontSize: 12.5, color: 'var(--ink-3)' }}>{sel.brand}</p>
          </div>
          {!editItem && <Press onClick={() => setSel(null)} style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--primary)' }}>Endre</Press>}
        </div>
      ) : (
        <div style={{ marginBottom: 16 }}>
          <label style={FIELD_LABEL}>Produkt</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--surface-2)', border: '1px solid var(--line)', borderRadius: 'var(--r-sm)', padding: '12px 14px', marginBottom: 10 }}>
            <IconSearch size={18} style={{ color: 'var(--ink-3)' }} />
            <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Søk eller skriv navn…" style={{ flex: 1, border: 'none', outline: 'none', background: 'none', fontFamily: 'var(--font)', fontSize: 14.5, color: 'var(--ink)' }} />
            {q && <Press onClick={() => setQ('')} style={{ color: 'var(--ink-3)', display: 'flex' }}><IconX size={16} /></Press>}
          </div>
          <div className="noscroll" style={{ display: 'flex', flexDirection: 'column', gap: 7, maxHeight: 168, overflowY: 'auto' }}>
            {filtered.slice(0, 8).map((p) => (
              <Press key={p.id} onClick={() => { setSel(p); setDays(p.shelf ?? 7); setQ(''); }} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: 8, borderRadius: 12 }}>
                <CatTile cat={p.cat} size={38} />
                <div style={{ flex: 1 }}>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>{p.name}</p>
                  <p style={{ margin: 0, fontSize: 12, color: 'var(--ink-3)' }}>{p.brand}</p>
                </div>
                <IconPlus size={18} style={{ color: 'var(--primary)' }} />
              </Press>
            ))}
            {q.trim() && (
              <Press
                onClick={() => {
                  setProductDraft({ name: q.trim(), cat: 'annet', shelf: 7 });
                  setProductEditorOpen(true);
                }}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 11, borderRadius: 12, background: 'var(--primary-tint)', color: 'var(--on-primary-tint)', fontSize: 13.5, fontWeight: 700 }}
              >
                <IconPlus size={18} /> Opprett «{q.trim()}»
              </Press>
            )}
          </div>
        </div>
      )}

      {sel && (
        <>
          <label style={FIELD_LABEL}>{dateLabel}</label>

          {thawing ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--surface-2)', border: '1px solid var(--line)', borderRadius: 'var(--r-sm)', padding: '14px 16px', marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                  <IconCal size={20} style={{ color: 'var(--primary)' }} />
                  <input
                    type="date"
                    aria-label={dateLabel}
                    value={toISODate(thawDate)}
                    onChange={(e) => setDateFromInput(e.target.value, setThawDays)}
                    style={{ border: 0, padding: 0, background: 'transparent', color: 'var(--ink)', fontFamily: 'var(--font)', fontSize: 16, fontWeight: 700, outline: 'none' }}
                  />
                </div>
                <StatusPill off={thawDays} dense />
              </div>
              <div className="noscroll" style={{ display: 'flex', gap: 8, overflowX: 'auto', marginBottom: 14 }}>
                {[{ l: '2 dager', d: 2 }, { l: '3 dager', d: 3 }, { l: '5 dager', d: 5 }, { l: '1 uke', d: 7 }].map((qk) => {
                  const on = thawDays === qk.d;
                  return (
                    <Press key={qk.l} onClick={() => setThawDays(qk.d)} style={{ flexShrink: 0, padding: '8px 14px', borderRadius: 999, fontSize: 13, fontWeight: 700, background: on ? 'var(--primary)' : 'var(--surface-2)', color: on ? 'var(--on-primary)' : 'var(--ink-2)', border: '1px solid ' + (on ? 'var(--primary)' : 'var(--line)'), whiteSpace: 'nowrap' }}>{qk.l}</Press>
                  );
                })}
              </div>
              <div style={{ display: 'flex', gap: 11, alignItems: 'flex-start', background: 'var(--soon-tint)', border: '1px solid color-mix(in srgb, var(--soon) 30%, var(--line))', borderRadius: 'var(--r-sm)', padding: '12px 14px', marginBottom: 18 }}>
                <span style={{ color: 'var(--soon)', display: 'flex', flexShrink: 0, marginTop: 1 }}><IconClock size={18} /></span>
                <p style={{ margin: 0, fontSize: 12.5, color: 'var(--ink-2)', lineHeight: 1.45 }}>
                  Tatt ut av fryseren? Tint mat bør spises raskt — vi minner deg innen <strong>{thawDays} dager</strong> i stedet for den opprinnelige datoen.
                </p>
              </div>
            </>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--surface-2)', border: '1px solid var(--line)', borderRadius: 'var(--r-sm)', padding: '14px 16px', marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                  <IconCal size={20} style={{ color: 'var(--primary)' }} />
                  <input
                    type="date"
                    aria-label={dateLabel}
                    value={toISODate(targetDate)}
                    onChange={(e) => setDateFromInput(e.target.value, setDays)}
                    style={{ border: 0, padding: 0, background: 'transparent', color: 'var(--ink)', fontFamily: 'var(--font)', fontSize: 16, fontWeight: 700, outline: 'none' }}
                  />
                </div>
                {isFrozen
                  ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 999, background: 'var(--surface)', border: '1px solid var(--line)', color: 'var(--ink-3)', fontSize: 11.5, fontWeight: 700 }}>
                      <IconLocFreezer size={13} /> Fryst
                    </span>
                  : <StatusPill off={days} dense />}
              </div>
              <Btn
                full
                variant="soft"
                icon={IconCal}
                onClick={() => setDateScannerOpen(true)}
                style={{ marginBottom: 10 }}
              >
                Skann dato på pakken
              </Btn>
              {!isFrozen && (
                <div className="noscroll" style={{ display: 'flex', gap: 8, overflowX: 'auto', marginBottom: 18 }}>
                  {quick.map((qk) => {
                    const on = days === qk.d;
                    return (
                      <Press key={qk.l} onClick={() => setDays(qk.d)} style={{ flexShrink: 0, padding: '8px 14px', borderRadius: 999, fontSize: 13, fontWeight: 700, background: on ? 'var(--primary)' : 'var(--surface-2)', color: on ? 'var(--on-primary)' : 'var(--ink-2)', border: '1px solid ' + (on ? 'var(--primary)' : 'var(--line)'), whiteSpace: 'nowrap' }}>{qk.l}</Press>
                    );
                  })}
                </div>
              )}
              {isFrozen && (
                <div style={{ display: 'flex', gap: 12, alignItems: 'center', background: 'var(--primary-tint)', border: '1px solid color-mix(in srgb, var(--primary) 26%, var(--line))', borderRadius: 'var(--r-sm)', padding: '13px 14px', marginBottom: 18 }}>
                  <span style={{ width: 38, height: 38, borderRadius: 12, flexShrink: 0, background: 'var(--surface)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <IconLocFreezer size={20} />
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: 13.5, fontWeight: 700, color: 'var(--on-primary-tint)' }}>Fryseren forlenger holdbarheten</p>
                    <p style={{ margin: '2px 0 0', fontSize: 12.5, color: 'var(--ink-2)' }}>
                      Vi minner deg om {horizonOff != null ? `${horizonOff} dager` : 'kategorihorisonten'}
                    </p>
                  </div>
                </div>
              )}
            </>
          )}

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
            <label style={{ ...FIELD_LABEL, margin: 0 }}>Antall</label>
            <Stepper value={qty} onChange={setQty} />
          </div>

          <label style={FIELD_LABEL}>Plassering</label>
          <div className="noscroll" style={{ display: 'flex', gap: 9, marginBottom: 18, overflowX: 'auto' }}>
            {locEntries.map((meta) => {
              const on = loc === meta.id;
              const LocIcon = ICON_MAP[meta.icon];
              return (
                <Press key={meta.id} onClick={() => setLoc(meta.id)} style={{ minWidth: 92, flex: 1, position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7, padding: '14px 4px', borderRadius: 'var(--r-sm)', background: on ? 'var(--primary-tint)' : 'var(--surface-2)', border: '1.5px solid ' + (on ? 'var(--primary)' : 'var(--line)'), color: on ? 'var(--on-primary-tint)' : 'var(--ink-2)' }}>
                  {meta.freezer && (
                    <span style={{ position: 'absolute', top: 6, right: 6, color: 'hsl(205 60% 48%)', display: 'flex' }}>
                      <IconLocFreezer size={13} />
                    </span>
                  )}
                  {LocIcon && <LocIcon size={22} />}
                  <span style={{ fontSize: 12, fontWeight: 700 }}>{meta.label}</span>
                </Press>
              );
            })}
          </div>

          <label style={FIELD_LABEL}>Påminnelse</label>
          <div className="noscroll" style={{ display: 'flex', gap: 8, overflowX: 'auto', marginBottom: 6 }}>
            {[
              { l: 'Standard', d: null },
              { l: 'Av', d: -1 },
              { l: 'Samme dag', d: 0 },
              { l: '1 dag før', d: 1 },
              { l: '2 dager', d: 2 },
              { l: '3 dager', d: 3 },
              { l: '1 uke', d: 7 },
            ].map((rk) => {
              const on = remind === rk.d;
              return (
                <Press key={rk.l} onClick={() => setRemind(rk.d)} style={{ flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 5, padding: '8px 13px', borderRadius: 999, fontSize: 13, fontWeight: 700, background: on ? 'var(--primary)' : 'var(--surface-2)', color: on ? 'var(--on-primary)' : 'var(--ink-2)', border: '1px solid ' + (on ? 'var(--primary)' : 'var(--line)'), whiteSpace: 'nowrap' }}>
                  {rk.d === -1 && <IconBellOff size={14} />}{rk.l}
                </Press>
              );
            })}
          </div>
          <p style={{ margin: '0 2px 18px', fontSize: 12, color: 'var(--ink-3)', lineHeight: 1.4 }}>
            {remind == null ? 'Bruk standardvalget fra innstillinger.' : remind === -1 ? 'Ingen påminnelse for denne varen.' : remind === 0 ? 'Varsel på selve utløpsdagen.' : `Varsel ${remind} dag${remind > 1 ? 'er' : ''} før utløp.`}
          </p>

          <label style={FIELD_LABEL}>Notat (valgfritt)</label>
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="f.eks. åpnet, halv pakke…" style={{ width: '100%', boxSizing: 'border-box', border: '1px solid var(--line)', background: 'var(--surface-2)', borderRadius: 'var(--r-sm)', padding: '13px 16px', fontFamily: 'var(--font)', fontSize: 14.5, color: 'var(--ink)', outline: 'none', marginBottom: 18 }} />

          <label style={FIELD_LABEL}>Pris (valgfritt)</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--surface-2)', border: '1px solid var(--line)', borderRadius: 'var(--r-sm)', padding: '4px 16px 4px 14px', marginBottom: 8 }}>
            <IconTag size={18} style={{ color: 'var(--ink-3)' }} />
            <input value={price} onChange={(e) => setPrice(e.target.value.replace(/[^0-9.,]/g, ''))} inputMode="decimal" placeholder={`f.eks. ${CATEGORY_PRICE[sel.cat] ?? 30}`} style={{ flex: 1, border: 'none', outline: 'none', background: 'none', fontFamily: 'var(--font)', fontSize: 14.5, color: 'var(--ink)' }} />
            <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--ink-3)' }}>kr</span>
          </div>
          <p style={{ margin: '0 2px 22px', fontSize: 12, color: 'var(--ink-3)', lineHeight: 1.4 }}>Legg til prisen for å se hvor mye du faktisk sparer når du bruker opp varen.</p>

          <Btn full icon={IconCheck} onClick={handleSave} disabled={loading}>
            {loading ? 'Lagrer…' : isFrozen ? 'Legg i fryseren' : (editItem ? 'Lagre endringer' : 'Lagre på lager')}
          </Btn>
        </>
      )}
    </Sheet>
    {dateScannerOpen && sel && createPortal(
      <div style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'transparent' }}>
        <ScanScreen
          dateOnlyProduct={sel}
          onCancelDateScan={() => setDateScannerOpen(false)}
          onDateScanned={(offDays) => {
            setDays(offDays);
            setDateScannerOpen(false);
          }}
        />
      </div>,
      document.body,
    )}
    <ProductEditorSheet
      open={productEditorOpen}
      onClose={() => setProductEditorOpen(false)}
      draft={productDraft}
      onSaved={(product) => {
        setProducts((current) => [...current.filter((item) => item.id !== product.id), product]);
        setSel(product);
        setDays(product.shelf ?? 7);
        setQ('');
      }}
    />
    </>
  );
}
