import { useState, useRef } from 'react';
import type { StockItem } from '../lib/friskr';
import { useStockStore } from '../stores/stock';
import { useHouseholdStore } from '../stores/household';
import { useUiStore } from '../stores/ui';
import { Segmented } from '../components/Segmented';
import { CatTile } from '../components/CatTile';
import { StatusPill } from '../components/StatusPill';
import { Press } from '../components/Press';
import { IconCheckCircle, IconLeaf, IconCheck, IconTrash, IconLocFreezer, ICON_MAP } from '../components/icons';
import { fmtShort } from '../lib/dates';
import { useLocationStore } from '../stores/locations';

function EmptyState({ icon: I, title, body }: { icon: React.ComponentType<{size?: number}>; title: string; body: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '46px 24px' }}>
      <div style={{ width: 72, height: 72, borderRadius: 24, background: 'var(--primary-tint)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
        <I size={34} />
      </div>
      <h3 style={{ margin: '0 0 6px', fontSize: 17, fontWeight: 800 }}>{title}</h3>
      <p style={{ margin: '0 auto', fontSize: 13.5, color: 'var(--ink-3)', maxWidth: 240, lineHeight: 1.5 }}>{body}</p>
    </div>
  );
}

interface StockRowProps {
  it: StockItem;
  onConsume: (it: StockItem) => void;
  onThrow: (it: StockItem) => void;
  onOpen: (it: StockItem) => void;
  dense?: boolean;
}

function StockRow({ it, onConsume, onThrow, onOpen, dense }: StockRowProps) {
  const { locations } = useLocationStore();
  const [dx, setDx] = useState(0);
  const [open, setOpen] = useState(0);
  const [flying, setFlying] = useState(false);
  const startX = useRef<number | null>(null);
  const moved = useRef(false);
  const width = useRef(320);
  const PEEK = 80, HOLD = 60, ARM = 150;

  const onDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (flying) return;
    startX.current = e.clientX;
    moved.current = false;
    width.current = (e.currentTarget as HTMLDivElement).offsetWidth || 320;
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onMove = (e: React.PointerEvent) => {
    if (startX.current == null) return;
    const delta = e.clientX - startX.current;
    if (Math.abs(delta) > 4) moved.current = true;
    const cap = ARM + 70;
    setDx(Math.max(-cap, Math.min(cap, open * PEEK + delta)));
  };
  const commit = (dir: 1 | -1) => {
    setFlying(true); setOpen(0);
    setDx(dir * (width.current + 48));
    setTimeout(() => (dir > 0 ? onConsume(it) : onThrow(it)), 200);
  };
  const onUp = () => {
    if (startX.current == null) return;
    startX.current = null;
    if (dx >= ARM) return commit(1);
    if (dx <= -ARM) return commit(-1);
    if (dx >= HOLD) { setOpen(1); setDx(PEEK); return; }
    if (dx <= -HOLD) { setOpen(-1); setDx(-PEEK); return; }
    setOpen(0); setDx(0);
  };
  const onRowClick = () => {
    if (moved.current) return;
    if (open !== 0) { setOpen(0); setDx(0); return; }
    onOpen(it);
  };

  const useArm = dx >= ARM, throwArm = -dx >= ARM;
  const transition = startX.current == null ? 'transform .28s cubic-bezier(.22,1,.36,1)' : 'none';
  const loc = locations.find((location) => location.id === it.loc);
  const LocIcon = loc ? ICON_MAP[loc.icon] : null;

  return (
    <div style={{ position: 'relative', borderRadius: 'var(--r-sm)', overflow: 'hidden' }}>
      {/* use bg */}
      <div style={{ position: 'absolute', inset: 0, background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'flex-start', paddingLeft: 22, opacity: dx > 2 ? 1 : 0, pointerEvents: dx > 2 ? 'auto' : 'none' }}>
        <Press onClick={() => commit(1)} style={{ display: 'flex', alignItems: 'center', gap: 9, color: 'var(--on-primary)', transform: `scale(${useArm ? 1.08 : 1})`, transition: 'transform .15s' }}>
          <IconCheck size={22} strokeWidth={2.4} />
          <span style={{ fontSize: 13, fontWeight: 800 }}>Brukt opp</span>
        </Press>
      </div>
      {/* throw bg */}
      <div style={{ position: 'absolute', inset: 0, background: 'var(--expired)', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: 22, opacity: dx < -2 ? 1 : 0, pointerEvents: dx < -2 ? 'auto' : 'none' }}>
        <Press onClick={() => commit(-1)} style={{ display: 'flex', alignItems: 'center', gap: 9, color: '#fff', transform: `scale(${throwArm ? 1.08 : 1})`, transition: 'transform .15s' }}>
          <span style={{ fontSize: 13, fontWeight: 800 }}>Kastet</span>
          <IconTrash size={21} strokeWidth={2.2} />
        </Press>
      </div>
      <div
        onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
        onClick={onRowClick}
        style={{
          position: 'relative', background: 'var(--surface)', border: '1px solid var(--line)',
          borderRadius: 'var(--r-sm)', padding: dense ? '10px 12px' : '12px 14px',
          transform: `translateX(${dx}px)`, transition,
          cursor: 'pointer', touchAction: 'pan-y', boxShadow: 'var(--shadow-sm)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
          <CatTile cat={it.product.cat} size={dense ? 42 : 48} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: 15, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{it.product.name}</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3 }}>
              <span style={{ fontSize: 12, color: 'var(--ink-3)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                {LocIcon && <LocIcon size={13} />}{loc?.label ?? it.loc}
              </span>
              <span style={{ width: 3, height: 3, borderRadius: 999, background: 'var(--ink-3)' }} />
              <span className="tnum" style={{ fontSize: 12, color: 'var(--ink-3)' }}>{it.qty} stk</span>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              {it.frozen && (
                <span style={{ flexShrink:0, display:'inline-flex', alignItems:'center', gap:3, padding:'2px 7px 2px 5px', borderRadius:999, background:'color-mix(in srgb, hsl(205 70% 50%) 14%, var(--surface))', color:'hsl(205 70% 42%)', fontSize:10.5, fontWeight:800 }}>
                  <IconLocFreezer size={11} />Fryst
                </span>
              )}
              <StatusPill off={it.off} dense />
            </div>
            {it.expiryDate && (
              <span className="tnum" style={{ fontSize: 11, color: 'var(--ink-3)' }}>{fmtShort(it.expiryDate)}</span>
            )}
            {it.frozen && it.bestForOff != null && it.bestForDate && (
              <span className="tnum" style={{ fontSize: 10, color: 'var(--ink-3)', opacity: 0.85 }}>
                Best før {fmtShort(it.bestForDate)}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function StockScreen() {
  const { items, counts } = useStockStore();
  const { household } = useHouseholdStore();
  const { openSheet, showToast } = useUiStore();
  const [tab, setTab] = useState('soon');
  const stockStore = useStockStore();
  const { locations } = useLocationStore();

  const tabs = [
    { key: 'soon', label: 'Snart', count: counts.soon, tint: 'var(--soon-tint)', color: 'var(--soon)' },
    { key: 'expired', label: 'Utløpt', count: counts.expired, tint: 'var(--expired-tint)', color: 'var(--expired)' },
    { key: 'all', label: 'Alle', count: counts.total },
    { key: 'loc', label: 'Plassering' },
  ];

  let list = [...items];
  if (tab === 'soon') list = list.filter((i) => i.off != null && i.off >= 0 && i.off <= 3);
  else if (tab === 'expired') list = list.filter((i) => i.off != null && i.off < 0);
  list.sort((a, b) => (a.off ?? 999) - (b.off ?? 999));

  const handleConsume = async (it: StockItem) => {
    if (!household) return;
    await stockStore.consume(household.id, it);
    showToast(`${it.product.name} brukt opp`, 'check', {
      label: 'Angre',
      onAction: () => stockStore.restore(household.id, it.id),
    });
  };
  const handleThrow = async (it: StockItem) => {
    if (!household) return;
    await stockStore.discard(household.id, it);
    showToast(`${it.product.name} kastet`, 'trash', {
      label: 'Angre',
      onAction: () => stockStore.restore(household.id, it.id),
    });
  };

  const locationGroups = locations.map((meta) => ({
    key: meta.id, meta, items: items.filter((i) => i.loc === meta.id).sort((a, b) => (a.off ?? 999) - (b.off ?? 999)),
  })).filter((g) => g.items.length > 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '14px 16px 12px' }}>
        <h1 style={{ margin: '0 2px 14px', fontSize: 25, fontWeight: 800, letterSpacing: -0.5 }}>Lager</h1>
        <Segmented tabs={tabs} value={tab} onChange={setTab} />
      </div>
      <div className="noscroll" style={{ flex: 1, overflow: 'auto', padding: '2px 16px 36px' }}>
        {tab === 'loc' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {locationGroups.map(({ key, meta, items: li }) => {
              const LocIcon = ICON_MAP[meta.icon];
              return (
                <div key={key}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '0 2px 10px' }}>
                    <span style={{ color: `hsl(${meta.hue} 50% 45%)`, display: 'flex' }}>{LocIcon && <LocIcon size={18} />}</span>
                    <h2 style={{ margin: 0, fontSize: 15.5, fontWeight: 800 }}>{meta.label}</h2>
                    <span className="tnum" style={{ fontSize: 12.5, color: 'var(--ink-3)', fontWeight: 600 }}>{li.length}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                    {li.map((it) => <StockRow key={it.id} it={it} onConsume={handleConsume} onThrow={handleThrow} onOpen={(i) => openSheet({ type: 'edit', itemId: i.id })} dense />)}
                  </div>
                </div>
              );
            })}
            {locationGroups.length === 0 && <EmptyState icon={IconLeaf} title="Lager er tomt" body="Legg til varer for å komme i gang." />}
          </div>
        ) : list.length === 0 ? (
          tab === 'expired'
            ? <EmptyState icon={IconCheckCircle} title="Ingenting utløpt" body="Bra jobba! Du har ikke kastet noe denne uka." />
            : <EmptyState icon={IconLeaf} title="Ingenting haster" body="Alle varene dine har god holdbarhet igjen." />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            <p style={{ margin: '2px 2px 4px', fontSize: 12, color: 'var(--ink-3)', fontWeight: 600 }}>
              Sveip høyre for «brukt opp» · venstre for «kastet»
            </p>
            {list.map((it) => (
              <StockRow key={it.id} it={it} onConsume={handleConsume} onThrow={handleThrow} onOpen={(i) => openSheet({ type: 'edit', itemId: i.id })} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
