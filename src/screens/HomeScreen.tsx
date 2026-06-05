import { useStockStore } from '../stores/stock';
import { useHouseholdStore } from '../stores/household';
import { useUiStore } from '../stores/ui';
import { FreshnessRing } from '../components/FreshnessRing';
import { CatTile } from '../components/CatTile';
import { StatusPill } from '../components/StatusPill';
import { Card } from '../components/Card';
import { Press } from '../components/Press';
import { IconLogo, IconBell, IconLeaf, IconTrend, IconScan, IconPlus, IconCart } from '../components/icons';
import { LOCATIONS } from '../lib/reference';

export function HomeScreen() {
  const { items, counts, stats } = useStockStore();
  const { household } = useHouseholdStore();
  const { setTab, openSheet, showToast } = useUiStore();

  const soonItems = items.filter((i) => i.off != null && i.off >= 0 && i.off <= 3)
    .sort((a, b) => (a.off ?? 0) - (b.off ?? 0)).slice(0, 4);

  const hour = new Date().getHours();
  const greet = hour < 10 ? 'God morgen' : hour < 18 ? 'God ettermiddag' : 'God kveld';
  const attention = counts.expired + counts.soon;
  const month = ['jan','feb','mars','apr','mai','juni','juli','aug','sep','okt','nov','des'][new Date().getMonth()];

  return (
    <div style={{ padding: '6px 16px 20px' }}>
      {/* header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '6px 2px 18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ display: 'flex', color: 'var(--primary)' }}><IconLogo size={26} /></span>
          <span style={{ fontSize: 21, fontWeight: 800, letterSpacing: -0.4 }}>friskr</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Press style={{ position: 'relative', width: 40, height: 40, borderRadius: 999, background: 'var(--surface)', border: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink-2)' }}>
            <IconBell size={20} />
            {attention > 0 && <span style={{ position: 'absolute', top: 8, right: 9, width: 8, height: 8, borderRadius: 999, background: 'var(--expired)', border: '2px solid var(--surface)' }} />}
          </Press>
          <div style={{ width: 40, height: 40, borderRadius: 999, background: 'hsl(145 45% 42%)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 16 }}>
            {household?.members[0]?.initial ?? '?'}
          </div>
        </div>
      </div>

      <p style={{ margin: '0 2px 2px', color: 'var(--ink-3)', fontSize: 14, fontWeight: 600 }}>
        {greet}, {household?.members[0]?.name ?? 'deg'}
      </p>
      <h1 style={{ margin: '0 2px 18px', fontSize: 27, fontWeight: 800, letterSpacing: -0.6, lineHeight: 1.12 }}>
        {attention > 0
          ? <>Du har <span style={{ color: 'var(--primary)' }}>{attention} varer</span> å holde øye med</>
          : 'Alt er ferskt og under kontroll'}
      </h1>

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
      <Card pad={16} style={{ marginBottom: 14, background: 'linear-gradient(135deg, var(--primary-tint), var(--surface) 75%)', border: '1px solid color-mix(in srgb, var(--primary) 22%, var(--line))' }}>
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
    </div>
  );
}
