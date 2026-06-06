import { useState, useMemo } from 'react';
import { useStockStore } from '../stores/stock';
import { useHouseholdStore } from '../stores/household';
import { useUiStore } from '../stores/ui';
import { useAuthStore } from '../stores/auth';
import { FreshnessRing } from '../components/FreshnessRing';
import { CatTile } from '../components/CatTile';
import { StatusPill } from '../components/StatusPill';
import { Card } from '../components/Card';
import { Press } from '../components/Press';
import { Btn } from '../components/Btn';
import { IconLogo, IconBell, IconLeaf, IconTrend, IconScan, IconPlus, IconCart, IconBox } from '../components/icons';
import { LOCATIONS } from '../lib/reference';
import type { StockItem, Member } from '../lib/friskr';
import type { CategoryId } from '../lib/database.types';

// ── Notification types & builder ─────────────────────────────────────────────

interface Notif {
  id: string;
  kind: 'expired' | 'soon' | 'activity';
  cat?: CategoryId;
  title: string;
  body: string;
  unread: boolean;
  item?: StockItem;
}

function buildNotifs(items: StockItem[], _members: Member[]): Notif[] {
  const list: Notif[] = [];
  items
    .filter((i) => i.off != null && i.off < 0)
    .sort((a, b) => (a.off ?? 0) - (b.off ?? 0))
    .forEach((i) => {
      list.push({ id: 'exp-' + i.id, kind: 'expired', cat: i.product.cat, title: i.product.name, body: 'Gikk ut på dato', item: i, unread: true });
    });
  items
    .filter((i) => i.off != null && i.off >= 0 && i.off <= 3)
    .sort((a, b) => (a.off ?? 0) - (b.off ?? 0))
    .forEach((i) => {
      list.push({ id: 'soon-' + i.id, kind: 'soon', cat: i.product.cat, title: i.product.name, body: `Utløper om ${i.off === 0 ? 'i dag' : i.off + ' dager'}`, item: i, unread: true });
    });
  return list;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function EmptyPantry() {
  const { setTab, openSheet } = useUiStore();
  return (
    <div style={{ textAlign: 'center', padding: '30px 24px 20px' }}>
      <div style={{ position: 'relative', width: 150, height: 150, margin: '0 auto 26px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ position: 'absolute', inset: 0, borderRadius: 999, background: 'var(--primary-tint)' }} />
        <span style={{ position: 'relative', color: 'var(--primary)', display: 'flex' }}><IconBox size={64} strokeWidth={1.4} /></span>
      </div>
      <h1 style={{ margin: '0 0 10px', fontSize: 24, fontWeight: 800, letterSpacing: -0.5, lineHeight: 1.15 }}>Lageret er tomt</h1>
      <p style={{ margin: '0 auto 26px', fontSize: 14.5, color: 'var(--ink-2)', lineHeight: 1.5, maxWidth: 290 }}>Skann strekkoden på det du nettopp handlet, så holder friskr styr på datoene for deg.</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 11, maxWidth: 300, margin: '0 auto' }}>
        <Btn full icon={IconScan} onClick={() => setTab('scan')}>Skann din første vare</Btn>
        <Btn variant="ghost" full icon={IconPlus} onClick={() => openSheet({ type: 'add' })}>Legg til manuelt</Btn>
      </div>
    </div>
  );
}

function NotifRow({ n, onOpenItem }: { n: Notif; onOpenItem: (n: Notif) => void }) {
  return (
    <Press onClick={() => onOpenItem(n)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 16px', textAlign: 'left', width: '100%', background: n.unread ? 'var(--primary-tint)' : 'transparent' }}>
      <span style={{ position: 'relative', flexShrink: 0 }}>
        <CatTile cat={n.cat ?? 'annet'} size={40} />
        <span style={{ position: 'absolute', top: -2, right: -2, width: 13, height: 13, borderRadius: 999, background: n.kind === 'expired' ? 'var(--expired)' : 'var(--soon)', border: '2.5px solid var(--surface)' }} />
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: 14, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{n.title}</p>
        <p style={{ margin: '2px 0 0', fontSize: 12.5, color: n.kind === 'expired' ? 'var(--expired)' : 'var(--ink-3)', fontWeight: n.kind === 'expired' ? 700 : 500 }}>{n.body}</p>
      </div>
      {n.unread && <span style={{ width: 8, height: 8, borderRadius: 999, background: 'var(--primary)', flexShrink: 0 }} />}
    </Press>
  );
}

function NotifPanel({ notifs, unreadCount, onMarkAll, onClose, onOpenItem }: { notifs: Notif[]; unreadCount: number; onMarkAll: () => void; onClose: () => void; onOpenItem: (n: Notif) => void }) {
  const urgent = notifs.filter((n) => n.kind === 'expired' || n.kind === 'soon');
  const activity = notifs.filter((n) => n.kind === 'activity');
  return (
    <>
      {/* click-away backdrop */}
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 90 }} />
      {/* panel */}
      <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: 10, width: 332, maxWidth: 'calc(100vw - 28px)', zIndex: 100, background: 'var(--surface)', borderRadius: 'var(--r)', border: '1px solid var(--line)', boxShadow: 'var(--shadow-lg)', overflow: 'hidden' }}>
        {/* caret */}
        <span style={{ position: 'absolute', top: -6, right: 13, width: 12, height: 12, background: 'var(--surface)', borderTop: '1px solid var(--line)', borderLeft: '1px solid var(--line)', transform: 'rotate(45deg)' }} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px 12px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>Varsler</h3>
            {unreadCount > 0 && <span className="tnum" style={{ fontSize: 12, fontWeight: 700, color: 'var(--primary)' }}>{unreadCount} nye</span>}
          </div>
          {unreadCount > 0 && <Press onClick={onMarkAll} style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--ink-3)' }}>Merk alle lest</Press>}
        </div>
        <div className="noscroll" style={{ maxHeight: 376, overflowY: 'auto', borderTop: '1px solid var(--line-2)' }}>
          {notifs.length === 0 ? (
            <div style={{ padding: '34px 20px', textAlign: 'center' }}>
              <span style={{ display: 'inline-flex', color: 'var(--primary)', marginBottom: 8 }}><IconLeaf size={30} /></span>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>Ingen varsler</p>
              <p style={{ margin: '3px 0 0', fontSize: 12.5, color: 'var(--ink-3)' }}>Alt er ferskt og under kontroll.</p>
            </div>
          ) : (
            <>
              {urgent.length > 0 && (
                <>
                  <p style={{ margin: 0, padding: '11px 16px 5px', fontSize: 11, fontWeight: 800, letterSpacing: 0.5, textTransform: 'uppercase', color: 'var(--ink-3)' }}>Krever handling</p>
                  {urgent.map((n) => <NotifRow key={n.id} n={n} onOpenItem={onOpenItem} />)}
                </>
              )}
              {activity.length > 0 && (
                <>
                  <p style={{ margin: 0, padding: '12px 16px 5px', fontSize: 11, fontWeight: 800, letterSpacing: 0.5, textTransform: 'uppercase', color: 'var(--ink-3)', borderTop: urgent.length ? '1px solid var(--line-2)' : 'none' }}>Aktivitet</p>
                  {activity.map((n) => <NotifRow key={n.id} n={n} onOpenItem={onOpenItem} />)}
                </>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export function HomeScreen() {
  const { items, counts, stats } = useStockStore();
  const { household } = useHouseholdStore();
  const { setTab, openSheet, showToast } = useUiStore();
  const { user } = useAuthStore();

  const [notifOpen, setNotifOpen] = useState(false);
  const [readIds, setReadIds] = useState<Record<string, boolean>>({});

  const me = household?.members.find((m) => m.userId === user?.id) ?? household?.members[0];

  const soonItems = items.filter((i) => i.off != null && i.off >= 0 && i.off <= 3)
    .sort((a, b) => (a.off ?? 0) - (b.off ?? 0)).slice(0, 4);

  const hour = new Date().getHours();
  const greet = hour < 10 ? 'God morgen' : hour < 18 ? 'God ettermiddag' : 'God kveld';
  const attention = counts.expired + counts.soon;
  const month = ['jan','feb','mars','apr','mai','juni','juli','aug','sep','okt','nov','des'][new Date().getMonth()];

  const notifs = useMemo(() => buildNotifs(items, household?.members ?? []), [items, household?.members]);
  const notifsView = notifs.map((n) => ({ ...n, unread: n.unread && !readIds[n.id] }));
  const unreadCount = notifsView.filter((n) => n.unread).length;
  const markAll = () => setReadIds(Object.fromEntries(notifs.map((n) => [n.id, true])));

  return (
    <div style={{ padding: '6px 16px 20px' }}>
      {/* header */}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '6px 2px 18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ display: 'flex', color: 'var(--primary)' }}><IconLogo size={26} /></span>
          <span style={{ fontSize: 21, fontWeight: 800, letterSpacing: -0.4 }}>friskr</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Press
            onClick={() => setNotifOpen((v) => !v)}
            style={{
              position: 'relative', width: 40, height: 40, borderRadius: 999,
              background: notifOpen ? 'var(--primary-tint)' : 'var(--surface)',
              border: '1px solid ' + (notifOpen ? 'color-mix(in srgb, var(--primary) 30%, var(--line))' : 'var(--line)'),
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: notifOpen ? 'var(--on-primary-tint)' : 'var(--ink-2)',
            }}
          >
            <IconBell size={20} />
            {unreadCount > 0 && (
              <span className="tnum" style={{
                position: 'absolute', top: -3, right: -3, minWidth: 17, height: 17,
                padding: '0 4px', borderRadius: 999, background: 'var(--expired)', color: '#fff',
                fontSize: 10.5, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: '2px solid var(--paper)',
              }}>{unreadCount}</span>
            )}
          </Press>
          <div style={{ width: 40, height: 40, borderRadius: 999, background: me?.hue != null ? `hsl(${me.hue} 45% 42%)` : 'hsl(145 45% 42%)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 16 }}>
            {me?.initial ?? '?'}
          </div>
        </div>

        {notifOpen && (
          <NotifPanel
            notifs={notifsView}
            unreadCount={unreadCount}
            onMarkAll={() => { markAll(); }}
            onClose={() => setNotifOpen(false)}
            onOpenItem={(n) => {
              setNotifOpen(false);
              setReadIds((r) => ({ ...r, [n.id]: true }));
              if (n.item) openSheet({ type: 'edit', itemId: n.item.id });
            }}
          />
        )}
      </div>

      <p style={{ margin: '0 2px 2px', color: 'var(--ink-3)', fontSize: 14, fontWeight: 600 }}>
        {greet}, {me?.name ?? 'deg'}
      </p>
      <h1 style={{ margin: '0 2px 18px', fontSize: 27, fontWeight: 800, letterSpacing: -0.6, lineHeight: 1.12 }}>
        {attention > 0
          ? <>Du har <span style={{ color: 'var(--primary)' }}>{attention} varer</span> å holde øye med</>
          : 'Alt er ferskt og under kontroll'}
      </h1>

      {counts.total === 0 ? (
        <EmptyPantry />
      ) : (
        <>
          {/* freshness hero */}
          <Card pad={18} style={{ marginBottom: 14, borderRadius: 'var(--r-lg)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <FreshnessRing fresh={counts.fresh} soon={counts.soon} expired={counts.expired} size={128} stroke={13} />
                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <span className="tnum" style={{ fontSize: 34, fontWeight: 800, lineHeight: 1, letterSpacing: -1 }}>{counts.total}</span>
                  <span style={{ fontSize: 11.5, color: 'var(--ink-3)', fontWeight: 600, marginTop: 2 }}>varer</span>
                </div>
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 11 }}>
                {[
                  { c: 'var(--expired)', n: counts.expired, l: 'Utløpt', k: 'expired' },
                  { c: 'var(--soon)', n: counts.soon, l: 'Utløper snart', k: 'soon' },
                  { c: 'var(--primary)', n: counts.fresh, l: 'Ferske', k: 'fresh' },
                ].map((r) => (
                  <Press key={r.k} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ width: 10, height: 10, borderRadius: 999, background: r.c, flexShrink: 0 }} />
                    <span className="tnum" style={{ fontSize: 17, fontWeight: 800, minWidth: 24 }}>{r.n}</span>
                    <span style={{ fontSize: 13.5, color: 'var(--ink-2)', fontWeight: 600 }}>{r.l}</span>
                  </Press>
                ))}
              </div>
            </div>
          </Card>

          {/* savings card */}
          <Card pad={16} onClick={() => setTab('stats')} style={{ marginBottom: 14, background: 'linear-gradient(135deg, var(--primary-tint), var(--surface) 75%)', border: '1px solid color-mix(in srgb, var(--primary) 22%, var(--line))' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 46, height: 46, borderRadius: 16, background: 'var(--primary)', color: 'var(--on-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <IconLeaf size={24} />
              </div>
              <div style={{ flex: 1 }}>
                {stats.saved > 0 ? (
                  <>
                    <p style={{ margin: 0, fontSize: 14.5, fontWeight: 700, lineHeight: 1.3 }}>
                      Du reddet <span className="tnum" style={{ color: 'var(--on-primary-tint)' }}>{stats.saved} varer</span> fra søpla i {month}
                    </p>
                    <p style={{ margin: '2px 0 0', fontSize: 12.5, color: 'var(--ink-2)' }}>
                      {stats.savedKr > 0 ? <>≈ <span className="tnum">{Math.round(stats.savedKr)}</span> kr spart</> : 'Fortsett den gode jobben!'}
                    </p>
                  </>
                ) : (
                  <p style={{ margin: 0, fontSize: 14.5, fontWeight: 700, lineHeight: 1.3 }}>
                    Legg til priser når du fyller på, så ser du hvor mye du sparer
                  </p>
                )}
              </div>
              <span style={{ color: 'var(--primary)', display: 'flex' }}><IconTrend size={22} /></span>
            </div>
          </Card>

          {/* quick actions */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 22 }}>
            {[
              { i: IconScan, l: 'Skann', a: () => setTab('scan') },
              { i: IconPlus, l: 'Legg til', a: () => openSheet({ type: 'add' }) },
              { i: IconCart, l: 'Handleliste', a: () => showToast('Handleliste kommer snart', 'cart') },
            ].map((q, idx) => (
              <Press key={idx} onClick={q.a} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '15px 6px', background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--r-sm)', boxShadow: 'var(--shadow-sm)' }}>
                <span style={{ width: 38, height: 38, borderRadius: 12, background: 'var(--primary-tint)', color: 'var(--on-primary-tint)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><q.i size={20} /></span>
                <span style={{ fontSize: 12.5, fontWeight: 700 }}>{q.l}</span>
              </Press>
            ))}
          </div>

          {/* use-me-first list */}
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', margin: '0 2px 12px' }}>
            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, letterSpacing: -0.3 }}>Bruk meg først</h2>
            <Press onClick={() => setTab('stock')} style={{ fontSize: 13, fontWeight: 700, color: 'var(--primary)' }}>Se alle</Press>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {soonItems.length === 0 && (
              <Card pad={20} style={{ textAlign: 'center', color: 'var(--ink-3)', fontSize: 13.5 }}>Ingenting haster akkurat nå 🌿</Card>
            )}
            {soonItems.map((it) => {
              const loc = LOCATIONS[it.loc];
              return (
                <Card key={it.id} pad={12} onClick={() => openSheet({ type: 'edit', itemId: it.id })}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
                    <CatTile cat={it.product.cat} size={46} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: 15, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{it.product.name}</p>
                      <p style={{ margin: '2px 0 0', fontSize: 12.5, color: 'var(--ink-3)' }}>{loc?.label ?? it.loc} · {it.qty} stk</p>
                    </div>
                    <StatusPill off={it.off} />
                  </div>
                </Card>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
