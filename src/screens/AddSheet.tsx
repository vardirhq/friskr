import { useState, useEffect } from 'react';
import type { Product, StockItem } from '../lib/friskr';
import { listProducts } from '../lib/friskr';
import { useStockStore } from '../stores/stock';
import { useHouseholdStore } from '../stores/household';
import { useUiStore } from '../stores/ui';
import { Sheet } from '../components/Sheet';
import { CatTile } from '../components/CatTile';
import { StatusPill } from '../components/StatusPill';
import { Press } from '../components/Press';
import { Btn } from '../components/Btn';
import { ICON_MAP } from '../components/icons';
import { IconSearch, IconX, IconCal, IconPlus, IconMinus, IconCheck, IconTag } from '../components/icons';
import { fmtNO } from '../lib/dates';
import { LOCATIONS, CATEGORY_PRICE } from '../lib/reference';

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
}

export function AddSheet({ open, onClose, editItem }: AddSheetProps) {
  const { household } = useHouseholdStore();
  const stockStore = useStockStore();
  const { showToast } = useUiStore();

  const [products, setProducts] = useState<Product[]>([]);
  const [sel, setSel] = useState<Product | null>(null);
  const [q, setQ] = useState('');
  const [qty, setQty] = useState(1);
  const [loc, setLoc] = useState('kjoleskap');
  const [days, setDays] = useState(7);
  const [note, setNote] = useState('');
  const [price, setPrice] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !household) return;
    listProducts(household.id).then(setProducts).catch(console.error);
  }, [open, household]);

  useEffect(() => {
    if (!open) return;
    if (editItem) {
      setSel(editItem.product);
      setQty(editItem.qty);
      setLoc(editItem.loc);
      setDays(editItem.off ?? editItem.product.shelf ?? 7);
      setNote(editItem.note ?? '');
      setPrice(editItem.price != null ? String(editItem.price) : '');
    } else {
      setSel(null); setQ(''); setQty(1); setLoc('kjoleskap');
      setDays(7); setNote(''); setPrice('');
    }
  }, [open, editItem]);

  const filtered = products.filter((p) => q === '' || (p.name + ' ' + p.brand).toLowerCase().includes(q.toLowerCase()));

  const quick = [
    { l: 'I dag', d: 0 }, { l: '+3 d', d: 3 }, { l: '+1 uke', d: 7 },
    sel ? { l: `Anbefalt (${sel.shelf}d)`, d: sel.shelf ?? 7 } : { l: '+2 uker', d: 14 },
  ];

  const targetDate = new Date();
  targetDate.setDate(targetDate.getDate() + days);
  const locEntries = Object.entries(LOCATIONS);

  const handleSave = async () => {
    if (!sel || !household) return;
    setLoading(true);
    try {
      await stockStore.save(household.id, {
        product: sel, qty, loc, off: days,
        note: note || null,
        price: price === '' ? null : Number(price.replace(',', '.')),
        editId: editItem?.id ?? null,
      });
      showToast(editItem ? 'Lagret' : `${sel.name} lagt til`, 'check');
      onClose();
    } catch (err) {
      showToast('Noe gikk galt', 'x');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Sheet open={open} onClose={onClose} title={editItem ? 'Rediger vare' : (sel ? 'Legg til på lager' : 'Ny vare')} maxH={92}>
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
          </div>
        </div>
      )}

      {sel && (
        <>
          <label style={FIELD_LABEL}>Utløpsdato</label>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--surface-2)', border: '1px solid var(--line)', borderRadius: 'var(--r-sm)', padding: '14px 16px', marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
              <IconCal size={20} style={{ color: 'var(--primary)' }} />
              <span className="tnum" style={{ fontSize: 16, fontWeight: 700 }}>{fmtNO(targetDate)}</span>
            </div>
            <StatusPill off={days} dense />
          </div>
          <div className="noscroll" style={{ display: 'flex', gap: 8, overflowX: 'auto', marginBottom: 18 }}>
            {quick.map((qk) => {
              const on = days === qk.d;
              return (
                <Press key={qk.l} onClick={() => setDays(qk.d)} style={{ flexShrink: 0, padding: '8px 14px', borderRadius: 999, fontSize: 13, fontWeight: 700, background: on ? 'var(--primary)' : 'var(--surface-2)', color: on ? 'var(--on-primary)' : 'var(--ink-2)', border: '1px solid ' + (on ? 'var(--primary)' : 'var(--line)'), whiteSpace: 'nowrap' }}>{qk.l}</Press>
              );
            })}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
            <label style={{ ...FIELD_LABEL, margin: 0 }}>Antall</label>
            <Stepper value={qty} onChange={setQty} />
          </div>

          <label style={FIELD_LABEL}>Plassering</label>
          <div style={{ display: 'flex', gap: 9, marginBottom: 18 }}>
            {locEntries.map(([lk, meta]) => {
              const on = loc === lk;
              const LocIcon = ICON_MAP[meta.icon];
              return (
                <Press key={lk} onClick={() => setLoc(lk)} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7, padding: '14px 4px', borderRadius: 'var(--r-sm)', background: on ? 'var(--primary-tint)' : 'var(--surface-2)', border: '1.5px solid ' + (on ? 'var(--primary)' : 'var(--line)'), color: on ? 'var(--on-primary-tint)' : 'var(--ink-2)' }}>
                  {LocIcon && <LocIcon size={22} />}
                  <span style={{ fontSize: 12, fontWeight: 700 }}>{meta.label}</span>
                </Press>
              );
            })}
          </div>

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
            {loading ? 'Lagrer…' : (editItem ? 'Lagre endringer' : 'Lagre på lager')}
          </Btn>
        </>
      )}
    </Sheet>
  );
}
