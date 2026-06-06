import { useMemo } from 'react';
import { useUiStore } from '../stores/ui';
import { useStockStore } from '../stores/stock';
import { IconChevL, IconLeaf, IconTrend } from '../components/icons';
import { Card } from '../components/Card';
import { FreshnessRing } from '../components/FreshnessRing';
import { CatTile } from '../components/CatTile';
import { CATEGORIES } from '../lib/reference';
import type { CategoryId } from '../lib/database.types';
import { Press } from '../components/Press';

const HISTORY = [
  { m: 'jan', saved: 12, wasted: 3, kr: 280 },
  { m: 'feb', saved: 15, wasted: 2, kr: 340 },
  { m: 'mar', saved: 11, wasted: 5, kr: 230 },
  { m: 'apr', saved: 18, wasted: 2, kr: 410 },
  { m: 'mai', saved: 14, wasted: 4, kr: 300 },
  { m: 'jun', saved: 16, wasted: 1, kr: 380 },
];

export function StatsScreen() {
  const { setTab } = useUiStore();
  const { items } = useStockStore();

  const totalSaved = HISTORY.reduce((a, b) => a + b.saved, 0);
  const totalWasted = HISTORY.reduce((a, b) => a + b.wasted, 0);
  const totalKr = HISTORY.reduce((a, b) => a + b.kr, 0);
  const rate = Math.round((totalSaved / (totalSaved + totalWasted)) * 100);
  const best = HISTORY.reduce((a, b) => (b.saved - b.wasted > a.saved - a.wasted ? b : a));
  const maxBar = Math.max(...HISTORY.map((m) => Math.max(m.saved, m.wasted)));

  const wasteByCat = useMemo(() => {
    const m: Record<string, number> = {};
    items.filter((i) => i.off != null && i.off < 0).forEach((i) => {
      const cat = i.product.cat as string;
      m[cat] = (m[cat] || 0) + 1;
    });
    // blend with history so list is never empty
    (['meieri', 'frukt', 'brod'] as const).forEach((c, idx) => {
      m[c] = (m[c] || 0) + (3 - idx);
    });
    return Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 4) as [CategoryId, number][];
  }, [items]);

  const wasteMax = Math.max(...wasteByCat.map(([, n]) => n), 1);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh' }}>
      {/* SubHeader */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px 6px' }}>
        <Press
          onClick={() => setTab('home')}
          style={{ width: 40, height: 40, borderRadius: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink-2)', flexShrink: 0 }}
        >
          <IconChevL size={24} />
        </Press>
        <h1 style={{ margin: 0, flex: 1, fontSize: 22, fontWeight: 800, letterSpacing: -0.5 }}>Matsvinn</h1>
      </div>

      <div className="noscroll" style={{ flex: 1, overflow: 'auto', padding: '4px 16px 24px' }}>
        {/* hero */}
        <Card pad={20} style={{ marginBottom: 14, background: 'linear-gradient(140deg, var(--primary-tint), var(--surface) 80%)', border: '1px solid color-mix(in srgb, var(--primary) 22%, var(--line))' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <span style={{ width: 40, height: 40, borderRadius: 13, background: 'var(--primary)', color: 'var(--on-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <IconLeaf size={22} />
            </span>
            <div>
              <p style={{ margin: 0, fontSize: 12.5, fontWeight: 700, color: 'var(--ink-3)' }}>Siste 6 måneder</p>
              <p style={{ margin: 0, fontSize: 15, fontWeight: 800 }}>Du redder mer enn du kaster</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            {[
              { n: totalSaved, l: 'reddet', c: 'var(--primary)' },
              { n: totalWasted, l: 'kastet', c: 'var(--expired)' },
              { n: `≈${totalKr}`, l: 'kr spart', c: 'var(--ink)' },
            ].map((s) => (
              <div key={s.l} style={{ flex: 1, background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--r-sm)', padding: '12px 10px', textAlign: 'center' }}>
                <p className="tnum" style={{ margin: 0, fontSize: 22, fontWeight: 800, color: s.c, letterSpacing: -0.5 }}>{s.n}</p>
                <p style={{ margin: '2px 0 0', fontSize: 11.5, color: 'var(--ink-3)', fontWeight: 600 }}>{s.l}</p>
              </div>
            ))}
          </div>
        </Card>

        {/* save-rate ring + best month */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
          <Card pad={16} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <div style={{ position: 'relative', width: 84, height: 84 }}>
              <FreshnessRing fresh={totalSaved} soon={0} expired={totalWasted} size={84} stroke={10} />
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <span className="tnum" style={{ fontSize: 21, fontWeight: 800, letterSpacing: -0.5 }}>{rate}%</span>
              </div>
            </div>
            <p style={{ margin: 0, fontSize: 12.5, color: 'var(--ink-2)', fontWeight: 600, textAlign: 'center' }}>brukt opp i tide</p>
          </Card>

          <Card pad={16} style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 4 }}>
            <span style={{ color: 'var(--soon)', display: 'flex' }}><IconTrend size={22} /></span>
            <p style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--ink-3)', fontWeight: 600 }}>Beste måned</p>
            <p style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>{best.m}</p>
            <p className="tnum" style={{ margin: 0, fontSize: 12.5, color: 'var(--primary)', fontWeight: 700 }}>{best.saved} reddet · {best.wasted} kastet</p>
          </Card>
        </div>

        {/* monthly bars */}
        <Card pad={18} style={{ marginBottom: 14 }}>
          <p style={{ margin: '0 0 16px', fontSize: 14.5, fontWeight: 800 }}>Reddet vs. kastet</p>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 8, height: 130 }}>
            {HISTORY.map((m) => (
              <div key={m.m} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 104 }}>
                  <div style={{ width: 9, height: `${(m.saved / maxBar) * 100}%`, borderRadius: 4, background: 'var(--primary)' }} />
                  <div style={{ width: 9, height: `${(m.wasted / maxBar) * 100}%`, borderRadius: 4, background: 'var(--expired)', opacity: 0.85 }} />
                </div>
                <span style={{ fontSize: 11, color: 'var(--ink-3)', fontWeight: 600 }}>{m.m}</span>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 14 }}>
            {[['var(--primary)', 'Reddet'], ['var(--expired)', 'Kastet']].map(([c, l]) => (
              <span key={l} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--ink-2)', fontWeight: 600 }}>
                <span style={{ width: 10, height: 10, borderRadius: 3, background: c }} />{l}
              </span>
            ))}
          </div>
        </Card>

        {/* waste by category */}
        <Card pad={18}>
          <p style={{ margin: '0 0 4px', fontSize: 14.5, fontWeight: 800 }}>Hvor svinnet skjer</p>
          <p style={{ margin: '0 0 16px', fontSize: 12.5, color: 'var(--ink-3)' }}>Kategoriene du oftest må kaste fra.</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
            {wasteByCat.map(([c, n]) => {
              const meta = CATEGORIES[c];
              return (
                <div key={c} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <CatTile cat={c} size={34} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                      <span style={{ fontSize: 13, fontWeight: 700 }}>{meta.label}</span>
                      <span className="tnum" style={{ fontSize: 12.5, color: 'var(--ink-3)', fontWeight: 700 }}>{n}</span>
                    </div>
                    <div style={{ height: 7, borderRadius: 999, background: 'var(--surface-2)', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${(n / wasteMax) * 100}%`, borderRadius: 999, background: `hsl(${meta.hue} 55% 52%)` }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}
