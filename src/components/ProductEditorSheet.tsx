import { useEffect, useState } from 'react';
import type { CategoryId } from '../lib/database.types';
import {
  createProduct,
  updateProduct,
  type Product,
} from '../lib/friskr';
import { CATEGORIES } from '../lib/reference';
import { useHouseholdStore } from '../stores/household';
import { useUiStore } from '../stores/ui';
import { Btn } from './Btn';
import { CatTile } from './CatTile';
import { Press } from './Press';
import { Sheet } from './Sheet';
import { IconCheck } from './icons';

export type ProductDraft = Partial<Pick<Product, 'name' | 'brand' | 'cat' | 'shelf' | 'barcode'>>;

interface ProductEditorSheetProps {
  open: boolean;
  onClose(): void;
  product?: Product | null;
  draft?: ProductDraft;
  onSaved(product: Product): void;
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  border: '1px solid var(--line)',
  background: 'var(--surface-2)',
  borderRadius: 'var(--r-sm)',
  padding: '12px 14px',
  fontFamily: 'var(--font)',
  fontSize: 14.5,
  color: 'var(--ink)',
  outline: 'none',
};

export function ProductEditorSheet({ open, onClose, product, draft, onSaved }: ProductEditorSheetProps) {
  const { household } = useHouseholdStore();
  const { showToast } = useUiStore();
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [cat, setCat] = useState<CategoryId>('annet');
  const [shelf, setShelf] = useState('');
  const [barcode, setBarcode] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    const source = product ?? draft;
    setName(source?.name ?? '');
    setBrand(source?.brand ?? '');
    setCat(source?.cat ?? 'annet');
    setShelf(source?.shelf != null ? String(source.shelf) : '');
    setBarcode(source?.barcode ?? '');
  }, [open, product, draft]);

  const save = async () => {
    if (!household || !name.trim()) return;
    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        brand: brand.trim(),
        cat,
        shelf: shelf === '' ? null : Math.max(0, Number(shelf)),
        barcode: barcode.trim() || null,
      };
      const saved = product
        ? await updateProduct(product.id, payload)
        : await createProduct(household.id, payload);
      onSaved(saved);
      onClose();
    } catch {
      showToast('Kunne ikke lagre produktet', 'x');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onClose={onClose} title={product ? 'Rediger produkt' : 'Nytt produkt'} maxH={92}>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--ink-3)', marginBottom: 7 }}>NAVN</label>
      <input autoFocus value={name} onChange={(event) => setName(event.target.value)} placeholder="Produktnavn" style={{ ...inputStyle, marginBottom: 14 }} />

      <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--ink-3)', marginBottom: 7 }}>MERKE</label>
      <input value={brand} onChange={(event) => setBrand(event.target.value)} placeholder="Valgfritt" style={{ ...inputStyle, marginBottom: 14 }} />

      <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--ink-3)', marginBottom: 8 }}>KATEGORI</label>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8, marginBottom: 16 }}>
        {(Object.entries(CATEGORIES) as Array<[CategoryId, (typeof CATEGORIES)[CategoryId]]>).map(([key, meta]) => (
          <Press
            key={key}
            onClick={() => setCat(key)}
            aria-label={meta.label}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
              padding: '8px 2px', borderRadius: 12,
              border: `1.5px solid ${cat === key ? 'var(--primary)' : 'var(--line)'}`,
              background: cat === key ? 'var(--primary-tint)' : 'var(--surface-2)',
            }}
          >
            <CatTile cat={key} size={32} />
            <span style={{ maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: 9.5, fontWeight: 700, whiteSpace: 'nowrap' }}>{meta.label}</span>
          </Press>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.25fr', gap: 10, marginBottom: 20 }}>
        <div>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--ink-3)', marginBottom: 7 }}>HOLDBARHET</label>
          <input value={shelf} onChange={(event) => setShelf(event.target.value.replace(/\D/g, ''))} inputMode="numeric" placeholder="Dager" style={inputStyle} />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--ink-3)', marginBottom: 7 }}>STREKKODE</label>
          <input value={barcode} onChange={(event) => setBarcode(event.target.value.replace(/\D/g, ''))} inputMode="numeric" placeholder="Valgfritt" style={inputStyle} />
        </div>
      </div>

      <Btn full icon={IconCheck} onClick={save} disabled={saving || !name.trim()}>
        {saving ? 'Lagrer…' : 'Lagre produkt'}
      </Btn>
    </Sheet>
  );
}
