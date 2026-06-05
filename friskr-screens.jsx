// friskr-screens.jsx — Home, Pantry (Lager), Products
const D2 = window.FriskrData;
const U = window.UI;

// ════════════════════════════════════════════════════════════════
// HOME / DASHBOARD
// ════════════════════════════════════════════════════════════════
function HomeScreen({ ctx }) {
  const { items, counts, onNav, openAdd, openList, toast, saved = 14, savedKr = 0 } = ctx;
  const soonItems = items.filter((i) => i.off >= 0 && i.off <= 3).sort((a, b) => a.off - b.off).slice(0, 4);
  const hour = 14;
  const greet = hour < 10 ? 'God morgen' : hour < 18 ? 'God ettermiddag' : 'God kveld';
  const attention = counts.expired + counts.soon;

  return (
    <div style={{ padding: '6px 16px 20px' }}>
      {/* header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '6px 2px 18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ display: 'flex', color: 'var(--primary)' }}><Icon.logo s={26} /></span>
          <span style={{ fontSize: 21, fontWeight: 800, letterSpacing: -0.4 }}>friskr</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <U.Press onClick={() => onNav('settings')} style={{ position: 'relative', width: 40, height: 40, borderRadius: 999, background: 'var(--surface)', border: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink-2)' }}>
            <Icon.bell s={20} />
            <span style={{ position: 'absolute', top: 8, right: 9, width: 8, height: 8, borderRadius: 999, background: 'var(--expired)', border: '2px solid var(--surface)' }} />
          </U.Press>
          <div style={{ width: 40, height: 40, borderRadius: 999, background: 'hsl(145 45% 42%)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 16 }}>M</div>
        </div>
      </div>

      <p style={{ margin: '0 2px 2px', color: 'var(--ink-3)', fontSize: 14, fontWeight: 600 }}>{greet}, Mari</p>
      <h1 style={{ margin: '0 2px 18px', fontSize: 27, fontWeight: 800, letterSpacing: -0.6, lineHeight: 1.12 }}>
        {attention > 0 ? <>Du har <span style={{ color: 'var(--primary)' }}>{attention} varer</span> å holde øye med</> : 'Alt er ferskt og under kontroll'}
      </h1>

      {/* freshness hero */}
      <U.Card pad={18} style={{ marginBottom: 14, borderRadius: 'var(--r-lg)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <U.FreshnessRing fresh={counts.fresh} soon={counts.soon} expired={counts.expired} size={128} stroke={13} />
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
              <U.Press key={r.k} onClick={() => openList(r.k)} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ width: 10, height: 10, borderRadius: 999, background: r.c, flexShrink: 0 }} />
                <span className="tnum" style={{ fontSize: 17, fontWeight: 800, minWidth: 24 }}>{r.n}</span>
                <span style={{ fontSize: 13.5, color: 'var(--ink-2)', fontWeight: 600 }}>{r.l}</span>
              </U.Press>
            ))}
          </div>
        </div>
      </U.Card>

      {/* insight — waste saved */}
      <U.Card pad={16} style={{ marginBottom: 14, background: 'linear-gradient(135deg, var(--primary-tint), var(--surface) 75%)', border: '1px solid color-mix(in srgb, var(--primary) 22%, var(--line))' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 46, height: 46, borderRadius: 16, background: 'var(--primary)', color: 'var(--on-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Icon.leaf s={24} />
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ margin: 0, fontSize: 14.5, fontWeight: 700, lineHeight: 1.3 }}>
              Du reddet <span className="tnum" style={{ color: 'var(--on-primary-tint)' }}>{saved} varer</span> fra søpla i mai
            </p>
            <p style={{ margin: '2px 0 0', fontSize: 12.5, color: 'var(--ink-2)' }}>{savedKr > 0 ? <>≈ <span className="tnum">{Math.round(savedKr)}</span> kr spart · 31 % mindre matsvinn</> : 'Legg til priser når du fyller på, så ser du hvor mye du sparer'}</p>
          </div>
          <span style={{ color: 'var(--primary)', display: 'flex' }}><Icon.trend s={22} /></span>
        </div>
      </U.Card>

      {/* quick actions */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 22 }}>
        {[
          { i: Icon.scan, l: 'Skann', a: () => onNav('scan') },
          { i: Icon.plus, l: 'Legg til', a: () => openAdd() },
          { i: Icon.cart, l: 'Handleliste', a: () => toast('Handleliste kommer snart', 'cart') },
        ].map((q, idx) => (
          <U.Press key={idx} onClick={q.a} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '15px 6px', background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--r-sm)', boxShadow: 'var(--shadow-sm)' }}>
            <span style={{ width: 38, height: 38, borderRadius: 12, background: 'var(--primary-tint)', color: 'var(--on-primary-tint)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><q.i s={20} /></span>
            <span style={{ fontSize: 12.5, fontWeight: 700 }}>{q.l}</span>
          </U.Press>
        ))}
      </div>

      {/* expiring soon list */}
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', margin: '0 2px 12px' }}>
        <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, letterSpacing: -0.3 }}>Bruk meg først</h2>
        <U.Press onClick={() => openList('soon')} style={{ fontSize: 13, fontWeight: 700, color: 'var(--primary)' }}>Se alle</U.Press>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {soonItems.length === 0 && (
          <U.Card pad={20} style={{ textAlign: 'center', color: 'var(--ink-3)', fontSize: 13.5 }}>Ingenting haster akkurat nå 🌿</U.Card>
        )}
        {soonItems.map((it) => (
          <U.Card key={it.id} pad={12} onClick={() => openAdd(it.product)}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
              <U.CatTile cat={it.product.cat} size={46} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: 15, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{it.product.name}</p>
                <p style={{ margin: '2px 0 0', fontSize: 12.5, color: 'var(--ink-3)' }}>{D2.LOCATIONS[it.loc].label} · {it.qty} stk</p>
              </div>
              <U.StatusPill off={it.off} />
            </div>
          </U.Card>
        ))}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// PANTRY / LAGER  (with swipe-to-consume)
// ════════════════════════════════════════════════════════════════
// Two-direction swipe: drag RIGHT → "Brukt opp" (green/use), drag LEFT →
// "Kastet" (red/throw). A short swipe peeks the action open so you can tap to
// confirm; a long swipe past the arm-point commits straight away. Both routes
// fire an undo-able toast, so nothing is ever lost by accident.
function StockRow({ it, onConsume, onThrow, onOpen, dense }) {
  const [dx, setDx] = useState(0);
  const [open, setOpen] = useState(0);    // -1 throw peek · 0 closed · 1 use peek
  const [flying, setFlying] = useState(false);
  const startX = useRef(null);
  const moved = useRef(false);
  const width = useRef(320);
  const PEEK = 80;   // resting offset when held open
  const HOLD = 60;   // min drag to snap open
  const ARM = 150;   // drag past this commits immediately

  const onDown = (e) => {
    if (flying) return;
    startX.current = e.clientX;
    moved.current = false;
    width.current = e.currentTarget.offsetWidth || 320;
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };
  const onMove = (e) => {
    if (startX.current == null) return;
    const delta = e.clientX - startX.current;
    if (Math.abs(delta) > 4) moved.current = true;
    const cap = ARM + 70;
    setDx(Math.max(-cap, Math.min(cap, open * PEEK + delta)));
  };
  const commit = (dir) => {
    setFlying(true);
    setOpen(0);
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

  const useArm = dx >= ARM;
  const throwArm = -dx >= ARM;
  const transition = startX.current == null ? 'transform .28s cubic-bezier(.22,1,.36,1)' : 'none';

  return (
    <div style={{ position: 'relative', borderRadius: 'var(--r-sm)', overflow: 'hidden' }}>
      {/* USE — swipe right, green, revealed on the left */}
      <div style={{ position: 'absolute', inset: 0, background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'flex-start', paddingLeft: 22, opacity: dx > 2 ? 1 : 0, pointerEvents: dx > 2 ? 'auto' : 'none' }}>
        <U.Press onClick={() => commit(1)} style={{ display: 'flex', alignItems: 'center', gap: 9, color: 'var(--on-primary)', transform: `scale(${useArm ? 1.08 : 1})`, transition: 'transform .15s' }}>
          <Icon.check s={22} sw={2.4} />
          <span style={{ fontSize: 13, fontWeight: 800 }}>Brukt opp</span>
        </U.Press>
      </div>
      {/* THROW — swipe left, red, revealed on the right */}
      <div style={{ position: 'absolute', inset: 0, background: 'var(--expired)', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: 22, opacity: dx < -2 ? 1 : 0, pointerEvents: dx < -2 ? 'auto' : 'none' }}>
        <U.Press onClick={() => commit(-1)} style={{ display: 'flex', alignItems: 'center', gap: 9, color: '#fff', transform: `scale(${throwArm ? 1.08 : 1})`, transition: 'transform .15s' }}>
          <span style={{ fontSize: 13, fontWeight: 800 }}>Kastet</span>
          <Icon.trash s={21} sw={2.2} />
        </U.Press>
      </div>
      <div
        onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
        onClick={onRowClick}
        style={{
          position: 'relative', background: 'var(--surface)', border: '1px solid var(--line)',
          borderRadius: 'var(--r-sm)', padding: dense ? '10px 12px' : '12px 14px',
          transform: `translateX(${dx}px)`, transition,
          cursor: 'pointer', touchAction: 'pan-y', boxShadow: 'var(--shadow-sm)',
        }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
          <U.CatTile cat={it.product.cat} size={dense ? 42 : 48} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: 15, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{it.product.name}</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3 }}>
              <span style={{ fontSize: 12, color: 'var(--ink-3)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                {React.createElement(Icon[D2.LOCATIONS[it.loc].icon], { s: 13 })}{D2.LOCATIONS[it.loc].label}
              </span>
              <span style={{ width: 3, height: 3, borderRadius: 999, background: 'var(--ink-3)' }} />
              <span className="tnum" style={{ fontSize: 12, color: 'var(--ink-3)' }}>{it.qty} stk</span>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
            <U.StatusPill off={it.off} dense />
            <span className="tnum" style={{ fontSize: 11, color: 'var(--ink-3)' }}>{D2.fmtShort(D2.dateFromOffset(it.off))}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ icon: I, title, body }) {
  return (
    <div style={{ textAlign: 'center', padding: '46px 24px' }}>
      <div style={{ width: 72, height: 72, borderRadius: 24, background: 'var(--primary-tint)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
        <I s={34} />
      </div>
      <h3 style={{ margin: '0 0 6px', fontSize: 17, fontWeight: 800 }}>{title}</h3>
      <p style={{ margin: '0 auto', fontSize: 13.5, color: 'var(--ink-3)', maxWidth: 240, lineHeight: 1.5 }}>{body}</p>
    </div>
  );
}

function StockScreen({ ctx }) {
  const { items, counts, onConsume, onThrow, openAdd, tab, setTab, dense } = ctx;
  const tabs = [
    { key: 'soon', label: 'Snart', count: counts.soon, tint: 'var(--soon-tint)', color: 'var(--soon)' },
    { key: 'expired', label: 'Utløpt', count: counts.expired, tint: 'var(--expired-tint)', color: 'var(--expired)' },
    { key: 'all', label: 'Alle', count: counts.total },
    { key: 'loc', label: 'Plassering' },
  ];
  let list = [...items];
  if (tab === 'soon') list = list.filter((i) => i.off >= 0 && i.off <= 3);
  else if (tab === 'expired') list = list.filter((i) => i.off < 0);
  list.sort((a, b) => a.off - b.off);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '14px 16px 12px' }}>
        <h1 style={{ margin: '0 2px 14px', fontSize: 25, fontWeight: 800, letterSpacing: -0.5 }}>Lager</h1>
        <U.Segmented tabs={tabs} value={tab} onChange={setTab} />
      </div>
      <div className="noscroll" style={{ flex: 1, overflow: 'auto', padding: '2px 16px 24px' }}>
        {tab === 'loc' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {Object.keys(D2.LOCATIONS).map((lk) => {
              const li = items.filter((i) => i.loc === lk).sort((a, b) => a.off - b.off);
              if (!li.length) return null;
              const meta = D2.LOCATIONS[lk];
              return (
                <div key={lk}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '0 2px 10px' }}>
                    <span style={{ color: `hsl(${meta.hue} 50% 45%)`, display: 'flex' }}>{React.createElement(Icon[meta.icon], { s: 18 })}</span>
                    <h2 style={{ margin: 0, fontSize: 15.5, fontWeight: 800 }}>{meta.label}</h2>
                    <span className="tnum" style={{ fontSize: 12.5, color: 'var(--ink-3)', fontWeight: 600 }}>{li.length}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                    {li.map((it) => <StockRow key={it.id} it={it} onConsume={onConsume} onThrow={onThrow} onOpen={openAdd} dense={dense} />)}
                  </div>
                </div>
              );
            })}
          </div>
        ) : list.length === 0 ? (
          tab === 'expired'
            ? <EmptyState icon={Icon.checkCircle} title="Ingenting utløpt" body="Bra jobba! Du har ikke kastet noe denne uka." />
            : <EmptyState icon={Icon.leaf} title="Ingenting haster" body="Alle varene dine har god holdbarhet igjen." />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            {tab !== 'expired' ? (
              <p style={{ margin: '2px 2px 4px', fontSize: 12, color: 'var(--ink-3)', fontWeight: 600 }}>Sveip høyre for « brukt opp » · venstre for « kastet »</p>
            ) : (
              <p style={{ margin: '2px 2px 4px', fontSize: 12, color: 'var(--ink-3)', fontWeight: 600 }}>Sveip venstre for « kastet », eller høyre hvis du rakk å bruke den</p>
            )}
            {list.map((it) => <StockRow key={it.id} it={it} onConsume={onConsume} onThrow={onThrow} onOpen={openAdd} dense={dense} />)}
          </div>
        )}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// PRODUCTS / PRODUKTER
// ════════════════════════════════════════════════════════════════
function ProductsScreen({ ctx }) {
  const { items, openAdd, toast } = ctx;
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('all');
  const inStock = {};
  items.forEach((i) => { inStock[i.pid] = (inStock[i.pid] || 0) + i.qty; });

  let list = D2.PRODUCTS.filter((p) =>
    (cat === 'all' || p.cat === cat) &&
    (q === '' || (p.name + ' ' + p.brand).toLowerCase().includes(q.toLowerCase())));

  const cats = ['all', ...Object.keys(D2.CATEGORIES)];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '14px 16px 10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '0 2px 14px' }}>
          <h1 style={{ margin: 0, fontSize: 25, fontWeight: 800, letterSpacing: -0.5 }}>Produkter</h1>
          <U.Press onClick={() => toast('Nytt produkt opprettet', 'check')} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 999, background: 'var(--primary)', color: 'var(--on-primary)', fontSize: 13, fontWeight: 700 }}>
            <Icon.plus s={17} sw={2.2} /> Nytt
          </U.Press>
        </div>
        {/* search */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 999, padding: '11px 16px', boxShadow: 'var(--shadow-sm)' }}>
          <Icon.search s={19} style={{ color: 'var(--ink-3)' }} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Søk i katalogen…" style={{ flex: 1, border: 'none', outline: 'none', background: 'none', fontFamily: 'var(--font)', fontSize: 14.5, color: 'var(--ink)' }} />
          {q && <U.Press onClick={() => setQ('')} style={{ color: 'var(--ink-3)', display: 'flex' }}><Icon.x s={17} /></U.Press>}
        </div>
      </div>
      {/* category chips */}
      <div className="noscroll" style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: '4px 16px 12px' }}>
        {cats.map((c) => {
          const on = cat === c;
          const meta = c === 'all' ? { label: 'Alle' } : D2.CATEGORIES[c];
          return (
            <U.Press key={c} onClick={() => setCat(c)} style={{
              flexShrink: 0, padding: '8px 14px', borderRadius: 999, fontSize: 13, fontWeight: 700,
              background: on ? 'var(--ink)' : 'var(--surface)', color: on ? 'var(--paper)' : 'var(--ink-2)',
              border: '1px solid ' + (on ? 'var(--ink)' : 'var(--line)'), whiteSpace: 'nowrap',
            }}>{meta.label}</U.Press>
          );
        })}
      </div>
      {/* product list */}
      <div className="noscroll" style={{ flex: 1, overflow: 'auto', padding: '2px 16px 24px', display: 'flex', flexDirection: 'column', gap: 9 }}>
        {list.length === 0 && <EmptyState icon={Icon.search} title="Ingen treff" body="Prøv et annet søk eller opprett et nytt produkt." />}
        {list.map((p) => (
          <U.Card key={p.id} pad={12}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
              <U.CatTile cat={p.cat} size={48} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: 15, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</p>
                <p style={{ margin: '2px 0 0', fontSize: 12.5, color: 'var(--ink-3)' }}>
                  {p.brand ? p.brand + ' · ' : ''}Holdbarhet ~{p.shelf} dager
                  {inStock[p.id] ? <span style={{ color: 'var(--primary)', fontWeight: 700 }}> · {inStock[p.id]} på lager</span> : ''}
                </p>
              </div>
              <U.Press onClick={() => openAdd(p)} style={{ width: 38, height: 38, borderRadius: 12, background: 'var(--primary-tint)', color: 'var(--on-primary-tint)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon.plus s={20} sw={2.2} />
              </U.Press>
            </div>
          </U.Card>
        ))}
      </div>
    </div>
  );
}

Object.assign(window, { HomeScreen, StockScreen, ProductsScreen, StockRow, EmptyState });
