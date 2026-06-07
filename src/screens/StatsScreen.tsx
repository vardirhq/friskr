import { useState, useEffect } from 'react';
import { useUiStore } from '../stores/ui';
import { fetchStats } from '../lib/friskr';
import type { StatsData } from '../lib/friskr';
import { IconChevL, IconLeaf, IconTrend } from '../components/icons';
import { Card } from '../components/Card';
import { FreshnessRing } from '../components/FreshnessRing';
import { CatTile } from '../components/CatTile';
import { CATEGORIES } from '../lib/reference';
import type { CategoryId } from '../lib/database.types';
import { Press } from '../components/Press';

const MONTH_NAMES = ['jan', 'feb', 'mar', 'apr', 'mai', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'des'];

function formatMonth(yyyyMM: string): string {
  const idx = parseInt(yyyyMM.slice(5, 7), 10) - 1;
  return MONTH_NAMES[idx] ?? yyyyMM;
}

export function StatsScreen() {
  const { setTab } = useUiStore();
  const [data, setData] = useState<StatsData | null>(null);

  useEffect(() => {
    fetchStats().then(setData).catch(console.error);
  }, []);

  if (data === null) {
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ width: 32, height: 32, border: '3px solid var(--line)', borderTopColor: 'var(--primary)', borderRadius: 999, animation: 'friskr-spin .8s linear infinite' }} />
      </div>
    );
  }

  const { months, byCategory, totals } = data;

  const rate = totals.saved + totals.wasted > 0
    ? Math.round((totals.saved / (totals.saved + totals.wasted)) * 100)
    : 0;

  const best = months.length > 0
    ? months.reduce((a, b) => (b.saved - b.wasted > a.saved - a.wasted ? b : a))
    : null;

  const maxBar = months.length > 0
    ? Math.max(...months.map((m) => Math.max(m.saved, m.wasted)), 1)
    : 1;

  const wasteMax = Math.max(...byCategory.map((c) => c.wasted), 1);

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
        <h1 style={{ margin: 0, flex: 1, fontSize: 22, fontWeight: 800, letterSpacing: -0.5 }}>Matsvinn</h1>
      </div>

      <div className="noscroll" style={{ flex: 1, overflow: 'auto', padding: '4px 16px calc(24px + env(safe-area-inset-bottom))' }}>
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
              { n: totals.saved, l: 'reddet', c: 'var(--primary)' },
              { n: totals.wasted, l: 'kastet', c: 'var(--expired)' },
              { n: `≈${Math.round(totals.kr)}`, l: 'kr spart', c: 'var(--ink)' },
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
              <FreshnessRing fresh={totals.saved} soon={0} expired={totals.wasted} size={84} stroke={10} />
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <span className="tnum" style={{ fontSize: 21, fontWeight: 800, letterSpacing: -0.5 }}>{rate}%</span>
              </div>
            </div>
            <p style={{ margin: 0, fontSize: 12.5, color: 'var(--ink-2)', fontWeight: 600, textAlign: 'center' }}>brukt opp i tide</p>
          </Card>

          <Card pad={16} style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 4 }}>
            <span style={{ color: 'var(--soon)', display: 'flex' }}><IconTrend size={22} /></span>
            <p style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--ink-3)', fontWeight: 600 }}>Beste måned</p>
            {best ? (
              <>
                <p style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>{formatMonth(best.month)}</p>
                <p className="tnum" style={{ margin: 0, fontSize: 12.5, color: 'var(--primary)', fontWeight: 700 }}>{best.saved} reddet · {best.wasted} kastet</p>
              </>
            ) : (
              <p style={{ margin: 0, fontSize: 13, color: 'var(--ink-3)' }}>Ingen data ennå.</p>
            )}
          </Card>
        </div>

        {/* monthly bars */}
        <Card pad={18} style={{ marginBottom: 14 }}>
          <p style={{ margin: '0 0 16px', fontSize: 14.5, fontWeight: 800 }}>Reddet vs. kastet</p>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 8, height: 130 }}>
            {months.map((m) => (
              <div key={m.month} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 104 }}>
                  <div style={{ width: 9, height: `${(m.saved / maxBar) * 100}%`, borderRadius: 4, background: 'var(--primary)' }} />
                  <div style={{ width: 9, height: `${(m.wasted / maxBar) * 100}%`, borderRadius: 4, background: 'var(--expired)', opacity: 0.85 }} />
                </div>
                <span style={{ fontSize: 11, color: 'var(--ink-3)', fontWeight: 600 }}>{formatMonth(m.month)}</span>
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
          {byCategory.length === 0 ? (
            <p style={{ margin: 0, fontSize: 13, color: 'var(--ink-3)' }}>Ingen matsvinn registrert ennå.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
              {byCategory.map(({ cat, wasted }) => {
                const c = cat as CategoryId;
                const meta = CATEGORIES[c];
                return (
                  <div key={c} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <CatTile cat={c} size={34} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                        <span style={{ fontSize: 13, fontWeight: 700 }}>{meta?.label ?? c}</span>
                        <span className="tnum" style={{ fontSize: 12.5, color: 'var(--ink-3)', fontWeight: 700 }}>{wasted}</span>
                      </div>
                      <div style={{ height: 7, borderRadius: 999, background: 'var(--surface-2)', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${(wasted / wasteMax) * 100}%`, borderRadius: 999, background: meta ? `hsl(${meta.hue} 55% 52%)` : 'var(--primary)' }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
