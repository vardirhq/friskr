import { useState, useEffect } from 'react';
import type { Product } from '../lib/friskr';
import { deleteProduct, listProducts, restoreProduct } from '../lib/friskr';
import { useStockStore } from '../stores/stock';
import { useHouseholdStore } from '../stores/household';
import { useUiStore } from '../stores/ui';
import { CatTile } from '../components/CatTile';
import { Card } from '../components/Card';
import { Press } from '../components/Press';
import { CATEGORIES } from '../lib/reference';
import { IconSearch, IconX, IconPlus } from '../components/icons';
import { IconPencil, IconTrash } from '../components/icons';
import { ProductEditorSheet } from '../components/ProductEditorSheet';

export function ProductsScreen() {
  const { items } = useStockStore();
  const { household } = useHouseholdStore();
  const { openSheet, showToast } = useUiStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('all');
  const [showArchived, setShowArchived] = useState(false);
  const [editor, setEditor] = useState<Product | null | undefined>(undefined);

  const reload = async () => {
    if (!household) return;
    setProducts(await listProducts(household.id, true));
  };

  useEffect(() => {
    reload().catch(console.error);
  }, [household?.id]);

  const inStock: Record<string, number> = {};
  items.forEach((i) => { inStock[i.pid] = (inStock[i.pid] || 0) + i.qty; });

  const list = products.filter((p) =>
    (cat === 'all' || p.cat === cat) &&
    (!!p.archived === showArchived) &&
    (q === '' || (p.name + ' ' + p.brand).toLowerCase().includes(q.toLowerCase()))
  );

  const cats = ['all', ...Object.keys(CATEGORIES)];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '14px 16px 10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '0 2px 14px' }}>
          <h1 style={{ margin: 0, fontSize: 25, fontWeight: 800, letterSpacing: -0.5 }}>Produkter</h1>
          <Press onClick={() => setEditor(null)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 999, background: 'var(--primary)', color: 'var(--on-primary)', fontSize: 13, fontWeight: 700 }}>
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
        <Press onClick={() => setShowArchived(!showArchived)} style={{
          flexShrink: 0, padding: '8px 14px', borderRadius: 999, fontSize: 13, fontWeight: 700,
          background: showArchived ? 'var(--ink)' : 'var(--surface)', color: showArchived ? 'var(--paper)' : 'var(--ink-2)',
          border: `1px solid ${showArchived ? 'var(--ink)' : 'var(--line)'}`, whiteSpace: 'nowrap',
        }}>{showArchived ? 'Arkiverte' : 'Vis arkiverte'}</Press>
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
              {p.householdId && (
                <Press onClick={() => setEditor(p)} style={{ width: 36, height: 36, borderRadius: 11, color: 'var(--ink-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <IconPencil size={17} />
                </Press>
              )}
              {p.archived ? (
                <Press
                  onClick={async () => {
                    await restoreProduct(p.id);
                    await reload();
                    showToast('Produktet er gjenopprettet', 'check');
                  }}
                  style={{ padding: '9px 11px', borderRadius: 11, background: 'var(--primary-tint)', color: 'var(--on-primary-tint)', fontSize: 12, fontWeight: 700 }}
                >
                  Gjenopprett
                </Press>
              ) : (
                <>
                  {p.householdId && (
                    <Press
                      onClick={async () => {
                        if (!window.confirm(`Fjern ${p.name}?`)) return;
                        const result = await deleteProduct(p.id);
                        await reload();
                        showToast(result.disposition === 'archived' ? 'Produktet er arkivert' : 'Produktet er slettet', 'check');
                      }}
                      style={{ width: 36, height: 36, borderRadius: 11, color: 'var(--expired)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                    >
                      <IconTrash size={17} />
                    </Press>
                  )}
                  <Press onClick={() => openSheet({ type: 'add', product: p })} style={{ width: 38, height: 38, borderRadius: 12, background: 'var(--primary-tint)', color: 'var(--on-primary-tint)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <IconPlus size={20} strokeWidth={2.2} />
                  </Press>
                </>
              )}
            </div>
          </Card>
        ))}
      </div>
      <ProductEditorSheet
        open={editor !== undefined}
        onClose={() => setEditor(undefined)}
        product={editor ?? null}
        onSaved={async () => {
          await reload();
          showToast(editor ? 'Produktet er oppdatert' : 'Produktet er opprettet', 'check');
        }}
      />
    </div>
  );
}
