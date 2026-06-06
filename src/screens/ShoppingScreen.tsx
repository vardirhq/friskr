import { useState } from 'react';
import { useUiStore } from '../stores/ui';
import {
  IconChevL, IconPlus, IconMinus, IconX, IconCheck, IconSpark, IconCart,
} from '../components/icons';
import { Card } from '../components/Card';
import { Press } from '../components/Press';
import { CatTile } from '../components/CatTile';
import type { CategoryId } from '../lib/database.types';
import { CATEGORIES } from '../lib/friskr';

interface ShoppingItem {
  id: string;
  name: string;
  cat: CategoryId;
  qty: number;
  done: boolean;
  auto: boolean;
}

let _nextId = 1;
function mkId() { return String(_nextId++); }

const INITIAL_ITEMS: ShoppingItem[] = [
  { id: mkId(), name: 'Melk', cat: 'meieri', qty: 1, done: false, auto: true },
  { id: mkId(), name: 'Yoghurt', cat: 'meieri', qty: 2, done: false, auto: true },
];

function ShopRow({
  it,
  onToggle,
  onRemove,
  onQty,
}: {
  it: ShoppingItem;
  onToggle: () => void;
  onRemove: () => void;
  onQty: (n: number) => void;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 4px', borderBottom: '1px solid var(--line-2)' }}>
      <Press
        onClick={onToggle}
        style={{
          width: 26, height: 26, borderRadius: 999, flexShrink: 0,
          border: '2px solid ' + (it.done ? 'var(--primary)' : 'var(--line)'),
          background: it.done ? 'var(--primary)' : 'transparent',
          color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        {it.done && <IconCheck size={15} strokeWidth={3} />}
      </Press>
      <CatTile cat={it.cat} size={38} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          margin: 0, fontSize: 14.5, fontWeight: 700,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          textDecoration: it.done ? 'line-through' : 'none',
          color: it.done ? 'var(--ink-3)' : 'var(--ink)',
        }}>{it.name}</p>
        <p style={{ margin: '1px 0 0', fontSize: 11.5, color: 'var(--ink-3)' }}>{CATEGORIES[it.cat]?.label}</p>
      </div>
      {!it.done ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Press
            onClick={() => onQty(Math.max(1, it.qty - 1))}
            style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--surface-2)', border: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink-2)' }}
          >
            <IconMinus size={15} />
          </Press>
          <span className="tnum" style={{ fontSize: 14, fontWeight: 800, minWidth: 14, textAlign: 'center' }}>{it.qty}</span>
          <Press
            onClick={() => onQty(it.qty + 1)}
            style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--surface-2)', border: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink-2)' }}
          >
            <IconPlus size={15} />
          </Press>
        </div>
      ) : (
        <Press
          onClick={onRemove}
          style={{ width: 30, height: 30, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink-3)' }}
        >
          <IconX size={17} />
        </Press>
      )}
    </div>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '48px 30px' }}>
      <span style={{ display: 'inline-flex', width: 64, height: 64, borderRadius: 20, background: 'var(--surface-2)', color: 'var(--ink-3)', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
        <IconCart size={30} />
      </span>
      <p style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>{title}</p>
      <p style={{ margin: '5px 0 0', fontSize: 13.5, color: 'var(--ink-3)', lineHeight: 1.5 }}>{body}</p>
    </div>
  );
}

export function ShoppingScreen() {
  const { setTab } = useUiStore();
  const [items, setItems] = useState<ShoppingItem[]>(INITIAL_ITEMS);
  const [draft, setDraft] = useState('');

  const toBuy = items.filter((i) => !i.done);
  const done = items.filter((i) => i.done);
  const suggested = toBuy.filter((i) => i.auto);
  const manual = toBuy.filter((i) => !i.auto);

  const submit = () => {
    const name = draft.trim();
    if (!name) return;
    setItems((prev) => [...prev, { id: mkId(), name, cat: 'annet', qty: 1, done: false, auto: false }]);
    setDraft('');
  };

  const toggle = (id: string) =>
    setItems((prev) => prev.map((i) => i.id === id ? { ...i, done: !i.done } : i));

  const remove = (id: string) =>
    setItems((prev) => prev.filter((i) => i.id !== id));

  const setQty = (id: string, qty: number) =>
    setItems((prev) => prev.map((i) => i.id === id ? { ...i, qty } : i));

  const clearDone = () =>
    setItems((prev) => prev.filter((i) => !i.done));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* SubHeader */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: 'calc(8px + env(safe-area-inset-top)) 12px 6px' }}>
        <Press
          onClick={() => setTab('home')}
          style={{ width: 40, height: 40, borderRadius: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink-2)', flexShrink: 0 }}
        >
          <IconChevL size={24} />
        </Press>
        <h1 style={{ margin: 0, flex: 1, fontSize: 22, fontWeight: 800, letterSpacing: -0.5 }}>Handleliste</h1>
        {toBuy.length > 0 && (
          <span className="tnum" style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink-3)', paddingRight: 8 }}>{toBuy.length} igjen</span>
        )}
      </div>

      <div className="noscroll" style={{ flex: 1, overflow: 'auto', padding: '4px 16px calc(24px + env(safe-area-inset-bottom))' }}>
        {/* add field */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--surface)', border: '1.5px solid var(--line)', borderRadius: 'var(--r-sm)', padding: '4px 6px 4px 16px', boxShadow: 'var(--shadow-sm)', marginBottom: 18 }}>
          <IconPlus size={19} style={{ color: 'var(--ink-3)' } as React.CSSProperties} />
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
            placeholder="Legg til vare…"
            style={{ flex: 1, border: 'none', outline: 'none', background: 'none', fontFamily: 'var(--font)', fontSize: 14.5, color: 'var(--ink)', padding: '11px 0' }}
          />
          {draft.trim() && (
            <Press onClick={submit} style={{ padding: '9px 15px', borderRadius: 999, background: 'var(--primary)', color: 'var(--on-primary)', fontSize: 13, fontWeight: 800 }}>
              Legg til
            </Press>
          )}
        </div>

        {items.length === 0 && (
          <EmptyState title="Tom handleliste" body="Legg til varer, eller la friskr foreslå basert på det du bruker opp." />
        )}

        {/* friskr suggestions */}
        {suggested.length > 0 && (
          <div style={{ marginBottom: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, margin: '0 4px 8px' }}>
              <span style={{ color: 'var(--primary)', display: 'flex' }}><IconSpark size={15} /></span>
              <p style={{ margin: 0, fontSize: 12, fontWeight: 800, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Foreslått av friskr</p>
            </div>
            <Card pad={4} style={{ padding: '2px 14px' }}>
              {suggested.map((it) => (
                <ShopRow
                  key={it.id}
                  it={it}
                  onToggle={() => toggle(it.id)}
                  onRemove={() => remove(it.id)}
                  onQty={(n) => setQty(it.id, n)}
                />
              ))}
            </Card>
            <p style={{ margin: '8px 4px 0', fontSize: 12, color: 'var(--ink-3)', lineHeight: 1.4 }}>Basert på varer du nylig brukte opp eller gikk tom for.</p>
          </div>
        )}

        {/* manual to-buy */}
        {manual.length > 0 && (
          <div style={{ marginBottom: 18 }}>
            <p style={{ margin: '0 4px 8px', fontSize: 12, fontWeight: 800, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Å kjøpe</p>
            <Card pad={4} style={{ padding: '2px 14px' }}>
              {manual.map((it) => (
                <ShopRow
                  key={it.id}
                  it={it}
                  onToggle={() => toggle(it.id)}
                  onRemove={() => remove(it.id)}
                  onQty={(n) => setQty(it.id, n)}
                />
              ))}
            </Card>
          </div>
        )}

        {/* in cart / done */}
        {done.length > 0 && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '0 4px 8px' }}>
              <p style={{ margin: 0, fontSize: 12, fontWeight: 800, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: 0.5 }}>I kurven · {done.length}</p>
              <Press onClick={clearDone} style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--primary)' }}>Tøm</Press>
            </div>
            <Card pad={4} style={{ padding: '2px 14px', opacity: 0.85 }}>
              {done.map((it) => (
                <ShopRow
                  key={it.id}
                  it={it}
                  onToggle={() => toggle(it.id)}
                  onRemove={() => remove(it.id)}
                  onQty={(n) => setQty(it.id, n)}
                />
              ))}
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
