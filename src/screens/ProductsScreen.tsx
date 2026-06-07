import { useState, useEffect } from 'react';
import type { Product } from '../lib/friskr';
import { listProducts } from '../lib/friskr';
import { useStockStore } from '../stores/stock';
import { useHouseholdStore } from '../stores/household';
import { useUiStore } from '../stores/ui';
import { CatTile } from '../components/CatTile';
import { Card } from '../components/Card';
import { Press } from '../components/Press';
import { CATEGORIES } from '../lib/reference';
import { IconSearch, IconX, IconPlus } from '../components/icons';

export function ProductsScreen() {
  const { items } = useStockStore();
  const { household } = useHouseholdStore();
  const { openSheet, showToast } = useUiStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('all');

  useEffect(() => {
    if (!household) return;
    listProducts(household.id).then(setProducts).catch(console.error);
  }, [household]);

  const inStock: Record<string, number> = {};
  items.forEach((i) => { inStock[i.pid] = (inStock[i.pid] || 0) + i.qty; });

  const list = products.filter((p) =>
    (cat === 'all' || p.cat === cat) &&
    (q === '' || (p.name + ' ' + p.brand).toLowerCase().includes(q.toLowerCase()))
  );

  const cats = ['all', ...Object.keys(CATEGORIES)];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '14px 16px 10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '0 2px 14px' }}>
          <h1 style={{ margin: 0, fontSize: 25, fontWeight: 800, letterSpacing: -0.5 }}>Produkter</h1>
          <Press onClick={() => showToast('Kommer snart')} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 999, background: 'var(--primary)', color: 'var(--on-primary)', fontSize: 13, fontWeight: 700 }}>
            <IconPlus size={17} strokeWidth={2.2} /> Nytt
          </Press>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 999, padding: '11px 16px', boxShadow: 'var(--shadow-sm)' }}>
          <IconSearch size={19} style={{ color: 'var(--ink-3)' }} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Søk i katalogen…" style={{ flex: 1, border: 'none', outline: 'none', background: 'none', fontFamily: 'var(--font)', fontSize: 14.5, color: 'var(--ink)' }} />
          {q && <Press onClick={() => setQ('')} style={{ color: 'var(--ink-3)', display: 'flex' }}><IconX size={17} /></Press>}
        </div>
      </div>

      <div className="noscroll" style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: '4px 16px 12px' }}>
        {cats.map((c) => {
          const on = cat === c;
          const meta = c === 'all' ? { label: 'Alle' } : CATEGORIES[c as keyof typeof CATEGORIES];
          return (
            <Press key={c} onClick={() => setCat(c)} style={{
              flexShrink: 0, padding: '8px 14px', borderRadius: 999, fontSize: 13, fontWeight: 700,
              background: on ? 'var(--ink)' : 'var(--surface)', color: on ? 'var(--paper)' : 'var(--ink-2)',
              border: '1px solid ' + (on ? 'var(--ink)' : 'var(--line)'), whiteSpace: 'nowrap',
            }}>{meta?.label ?? c}</Press>
          );
        })}
      </div>

      <div className="noscroll" style={{ flex: 1, overflow: 'auto', padding: '2px 16px 36px', display: 'flex', flexDirection: 'column', gap: 9 }}>
        {list.length === 0 && (
          <div style={{ textAlign: 'center', padding: '46px 24px' }}>
            <div style={{ width: 72, height: 72, borderRadius: 24, background: 'var(--primary-tint)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <IconSearch size={34} />
            </div>
            <h3 style={{ margin: '0 0 6px', fontSize: 17, fontWeight: 800 }}>Ingen treff</h3>
            <p style={{ margin: '0 auto', fontSize: 13.5, color: 'var(--ink-3)', maxWidth: 240, lineHeight: 1.5 }}>Prøv et annet søk eller opprett et nytt produkt.</p>
          </div>
        )}
        {list.map((p) => (
          <Card key={p.id} pad={12}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
              <CatTile cat={p.cat} size={48} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: 15, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</p>
                <p style={{ margin: '2px 0 0', fontSize: 12.5, color: 'var(--ink-3)' }}>
                  {p.brand ? p.brand + ' · ' : ''}
                  {p.shelf ? `~${p.shelf} dager` : 'Ukjent holdbarhet'}
                  {inStock[p.id] ? <span style={{ color: 'var(--primary)', fontWeight: 700 }}> · {inStock[p.id]} på lager</span> : ''}
                </p>
              </div>
              <Press onClick={() => openSheet({ type: 'add' })} style={{ width: 38, height: 38, borderRadius: 12, background: 'var(--primary-tint)', color: 'var(--on-primary-tint)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <IconPlus size={20} strokeWidth={2.2} />
              </Press>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
