// friskr-screens3.jsx — Handleliste, Statistikk, Konto, Plasseringer
const D5 = window.FriskrData;
const U5 = window.UI;
const { useState: s3US, useMemo: s3UM } = React;

// shared sub-screen header with a back chevron
function SubHeader({ title, onBack, right }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px 6px' }}>
      <U5.Press onClick={onBack} style={{ width: 40, height: 40, borderRadius: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink-2)', flexShrink: 0 }}><Icon.chevL s={24} /></U5.Press>
      <h1 style={{ margin: 0, flex: 1, fontSize: 22, fontWeight: 800, letterSpacing: -0.5 }}>{title}</h1>
      {right}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// HANDLELISTE  (shopping list)
// ════════════════════════════════════════════════════════════════
function ShoppingScreen({ ctx }) {
  const { shopping, onNav, addShopping, toggleShopping, removeShopping, setShoppingQty, clearDoneShopping, toast } = ctx;
  const [draft, setDraft] = s3US('');

  const toBuy = shopping.filter((i) => !i.done);
  const done = shopping.filter((i) => i.done);
  const suggested = toBuy.filter((i) => i.auto);
  const manual = toBuy.filter((i) => !i.auto);

  const submit = () => {
    const name = draft.trim();
    if (!name) return;
    addShopping(name);
    setDraft('');
  };

  const ShopRow = ({ it }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 4px', borderBottom: '1px solid var(--line-2)' }}>
      <U5.Press onClick={() => toggleShopping(it.id)} style={{ width: 26, height: 26, borderRadius: 999, flexShrink: 0, border: '2px solid ' + (it.done ? 'var(--primary)' : 'var(--line)'), background: it.done ? 'var(--primary)' : 'transparent', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {it.done && <Icon.check s={15} sw={3} />}
      </U5.Press>
      <U5.CatTile cat={it.cat} size={38} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: 14.5, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textDecoration: it.done ? 'line-through' : 'none', color: it.done ? 'var(--ink-3)' : 'var(--ink)' }}>{it.name}</p>
        <p style={{ margin: '1px 0 0', fontSize: 11.5, color: 'var(--ink-3)' }}>{D5.CATEGORIES[it.cat].label}</p>
      </div>
      {!it.done ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <U5.Press onClick={() => setShoppingQty(it.id, Math.max(1, it.qty - 1))} style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--surface-2)', border: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink-2)' }}><Icon.minus s={15} /></U5.Press>
          <span className="tnum" style={{ fontSize: 14, fontWeight: 800, minWidth: 14, textAlign: 'center' }}>{it.qty}</span>
          <U5.Press onClick={() => setShoppingQty(it.id, it.qty + 1)} style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--surface-2)', border: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink-2)' }}><Icon.plus s={15} /></U5.Press>
        </div>
      ) : (
        <U5.Press onClick={() => removeShopping(it.id)} style={{ width: 30, height: 30, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink-3)' }}><Icon.x s={17} /></U5.Press>
      )}
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <SubHeader title="Handleliste" onBack={() => onNav('home')} right={
        toBuy.length > 0 ? <span className="tnum" style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink-3)', paddingRight: 8 }}>{toBuy.length} igjen</span> : null
      } />

      <div className="noscroll" style={{ flex: 1, overflow: 'auto', padding: '4px 16px 24px' }}>
        {/* add field */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--surface)', border: '1.5px solid var(--line)', borderRadius: 'var(--r-sm)', padding: '4px 6px 4px 16px', boxShadow: 'var(--shadow-sm)', marginBottom: 18 }}>
          <Icon.plus s={19} style={{ color: 'var(--ink-3)' }} />
          <input value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') submit(); }} placeholder="Legg til vare…" style={{ flex: 1, border: 'none', outline: 'none', background: 'none', fontFamily: 'var(--font)', fontSize: 14.5, color: 'var(--ink)', padding: '11px 0' }} />
          {draft.trim() && <U5.Press onClick={submit} style={{ padding: '9px 15px', borderRadius: 999, background: 'var(--primary)', color: 'var(--on-primary)', fontSize: 13, fontWeight: 800 }}>Legg til</U5.Press>}
        </div>

        {shopping.length === 0 && (
          <EmptyState3 icon={Icon.cart} title="Tom handleliste" body="Legg til varer, eller la friskr foreslå basert på det du bruker opp." />
        )}

        {/* friskr suggestions */}
        {suggested.length > 0 && (
          <div style={{ marginBottom: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, margin: '0 4px 8px' }}>
              <span style={{ color: 'var(--primary)', display: 'flex' }}><Icon.spark s={15} /></span>
              <p style={{ margin: 0, fontSize: 12, fontWeight: 800, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Foreslått av friskr</p>
            </div>
            <U5.Card pad={4} style={{ padding: '2px 14px' }}>
              {suggested.map((it) => <ShopRow key={it.id} it={it} />)}
            </U5.Card>
            <p style={{ margin: '8px 4px 0', fontSize: 12, color: 'var(--ink-3)', lineHeight: 1.4 }}>Basert på varer du nylig brukte opp eller gikk tom for.</p>
          </div>
        )}

        {/* manual to-buy */}
        {manual.length > 0 && (
          <div style={{ marginBottom: 18 }}>
            <p style={{ margin: '0 4px 8px', fontSize: 12, fontWeight: 800, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Å kjøpe</p>
            <U5.Card pad={4} style={{ padding: '2px 14px' }}>
              {manual.map((it) => <ShopRow key={it.id} it={it} />)}
            </U5.Card>
          </div>
        )}

        {/* in cart / done */}
        {done.length > 0 && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '0 4px 8px' }}>
              <p style={{ margin: 0, fontSize: 12, fontWeight: 800, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: 0.5 }}>I kurven · {done.length}</p>
              <U5.Press onClick={clearDoneShopping} style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--primary)' }}>Tøm</U5.Press>
            </div>
            <U5.Card pad={4} style={{ padding: '2px 14px', opacity: 0.85 }}>
              {done.map((it) => <ShopRow key={it.id} it={it} />)}
            </U5.Card>
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyState3({ icon: I, title, body }) {
  return (
    <div style={{ textAlign: 'center', padding: '48px 30px' }}>
      <span style={{ display: 'inline-flex', width: 64, height: 64, borderRadius: 20, background: 'var(--surface-2)', color: 'var(--ink-3)', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}><I s={30} /></span>
      <p style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>{title}</p>
      <p style={{ margin: '5px 0 0', fontSize: 13.5, color: 'var(--ink-3)', lineHeight: 1.5 }}>{body}</p>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// STATISTIKK  (waste insights)
// ════════════════════════════════════════════════════════════════
function StatsScreen({ ctx }) {
  const { onNav, items } = ctx;
  const H = D5.HISTORY;
  const totalSaved = H.reduce((a, b) => a + b.saved, 0);
  const totalWasted = H.reduce((a, b) => a + b.wasted, 0);
  const totalKr = H.reduce((a, b) => a + b.kr, 0);
  const rate = Math.round((totalSaved / (totalSaved + totalWasted)) * 100);
  const best = H.reduce((a, b) => (b.saved - b.wasted > a.saved - a.wasted ? b : a));
  const maxBar = Math.max(...H.map((m) => Math.max(m.saved, m.wasted)));

  // where waste happens — derived mock from current expired items by category
  const wasteByCat = s3UM(() => {
    const m = {};
    items.filter((i) => i.off < 0).forEach((i) => { m[i.product.cat] = (m[i.product.cat] || 0) + 1; });
    // blend with a little history so the bar list is never empty
    ['meieri', 'frukt', 'brod'].forEach((c, idx) => { m[c] = (m[c] || 0) + (3 - idx); });
    return Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 4);
  }, [items]);
  const wasteMax = Math.max(...wasteByCat.map(([, n]) => n), 1);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <SubHeader title="Matsvinn" onBack={() => onNav('home')} />
      <div className="noscroll" style={{ flex: 1, overflow: 'auto', padding: '4px 16px 24px' }}>
        {/* hero */}
        <U5.Card pad={20} style={{ marginBottom: 14, background: 'linear-gradient(140deg, var(--primary-tint), var(--surface) 80%)', border: '1px solid color-mix(in srgb, var(--primary) 22%, var(--line))' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <span style={{ width: 40, height: 40, borderRadius: 13, background: 'var(--primary)', color: 'var(--on-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon.leaf s={22} /></span>
            <div>
              <p style={{ margin: 0, fontSize: 12.5, fontWeight: 700, color: 'var(--ink-3)' }}>Siste 6 måneder</p>
              <p style={{ margin: 0, fontSize: 15, fontWeight: 800 }}>Du redder mer enn du kaster</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            {[
              { n: totalSaved, l: 'reddet', c: 'var(--primary)' },
              { n: totalWasted, l: 'kastet', c: 'var(--expired)' },
              { n: '≈' + totalKr, l: 'kr spart', c: 'var(--ink)' },
            ].map((s) => (
              <div key={s.l} style={{ flex: 1, background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--r-sm)', padding: '12px 10px', textAlign: 'center' }}>
                <p className="tnum" style={{ margin: 0, fontSize: 22, fontWeight: 800, color: s.c, letterSpacing: -0.5 }}>{s.n}</p>
                <p style={{ margin: '2px 0 0', fontSize: 11.5, color: 'var(--ink-3)', fontWeight: 600 }}>{s.l}</p>
              </div>
            ))}
          </div>
        </U5.Card>

        {/* save-rate ring + best month */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
          <U5.Card pad={16} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <div style={{ position: 'relative', width: 84, height: 84 }}>
              <U5.FreshnessRing fresh={totalSaved} soon={0} expired={totalWasted} size={84} stroke={10} />
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <span className="tnum" style={{ fontSize: 21, fontWeight: 800, letterSpacing: -0.5 }}>{rate}%</span>
              </div>
            </div>
            <p style={{ margin: 0, fontSize: 12.5, color: 'var(--ink-2)', fontWeight: 600, textAlign: 'center' }}>brukt opp i tide</p>
          </U5.Card>
          <U5.Card pad={16} style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 4 }}>
            <span style={{ color: 'var(--soon)', display: 'flex' }}><Icon.trend s={22} /></span>
            <p style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--ink-3)', fontWeight: 600 }}>Beste måned</p>
            <p style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>{best.m}</p>
            <p className="tnum" style={{ margin: 0, fontSize: 12.5, color: 'var(--primary)', fontWeight: 700 }}>{best.saved} reddet · {best.wasted} kastet</p>
          </U5.Card>
        </div>

        {/* monthly bars */}
        <U5.Card pad={18} style={{ marginBottom: 14 }}>
          <p style={{ margin: '0 0 16px', fontSize: 14.5, fontWeight: 800 }}>Reddet vs. kastet</p>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 8, height: 130 }}>
            {H.map((m) => (
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
        </U5.Card>

        {/* where waste happens */}
        <U5.Card pad={18}>
          <p style={{ margin: '0 0 4px', fontSize: 14.5, fontWeight: 800 }}>Hvor svinnet skjer</p>
          <p style={{ margin: '0 0 16px', fontSize: 12.5, color: 'var(--ink-3)' }}>Kategoriene du oftest må kaste fra.</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
            {wasteByCat.map(([c, n]) => (
              <div key={c} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <U5.CatTile cat={c} size={34} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                    <span style={{ fontSize: 13, fontWeight: 700 }}>{D5.CATEGORIES[c].label}</span>
                    <span className="tnum" style={{ fontSize: 12.5, color: 'var(--ink-3)', fontWeight: 700 }}>{n}</span>
                  </div>
                  <div style={{ height: 7, borderRadius: 999, background: 'var(--surface-2)', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${(n / wasteMax) * 100}%`, borderRadius: 999, background: `hsl(${D5.CATEGORIES[c].hue} 55% 52%)` }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </U5.Card>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// KONTO  (account / profile)
// ════════════════════════════════════════════════════════════════
function AccountScreen({ ctx }) {
  const { onNav, toast, onShowHousehold } = ctx;
  const [name, setName] = s3US('Mari Eikeland');
  const [email, setEmail] = s3US(D5.USER.email || 'mari@eikeland.no');
  const [dirty, setDirty] = s3US(false);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <SubHeader title="Konto" onBack={() => onNav('settings')} />
      <div className="noscroll" style={{ flex: 1, overflow: 'auto', padding: '4px 16px 24px' }}>
        {/* avatar */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '8px 0 22px' }}>
          <div style={{ position: 'relative' }}>
            <div style={{ width: 92, height: 92, borderRadius: 999, background: 'hsl(145 45% 42%)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 38 }}>M</div>
            <U5.Press onClick={() => toast('Velg nytt bilde', 'image')} style={{ position: 'absolute', bottom: -2, right: -2, width: 32, height: 32, borderRadius: 999, background: 'var(--surface)', border: '1px solid var(--line)', boxShadow: 'var(--shadow-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink-2)' }}><Icon.image s={16} /></U5.Press>
          </div>
        </div>

        {/* editable fields */}
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--ink-3)', margin: '0 0 7px 2px', textTransform: 'uppercase', letterSpacing: 0.4 }}>Navn</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 11, background: 'var(--surface)', border: '1.5px solid var(--line)', borderRadius: 'var(--r-sm)', padding: '0 14px', boxShadow: 'var(--shadow-sm)' }}>
            <Icon.users s={18} style={{ color: 'var(--ink-3)' }} />
            <input value={name} onChange={(e) => { setName(e.target.value); setDirty(true); }} style={{ flex: 1, border: 'none', outline: 'none', background: 'none', fontFamily: 'var(--font)', fontSize: 15, color: 'var(--ink)', padding: '13px 0' }} />
          </div>
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--ink-3)', margin: '0 0 7px 2px', textTransform: 'uppercase', letterSpacing: 0.4 }}>E-post</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 11, background: 'var(--surface)', border: '1.5px solid var(--line)', borderRadius: 'var(--r-sm)', padding: '0 14px', boxShadow: 'var(--shadow-sm)' }}>
            <Icon.mail s={18} style={{ color: 'var(--ink-3)' }} />
            <input value={email} onChange={(e) => { setEmail(e.target.value); setDirty(true); }} type="email" style={{ flex: 1, border: 'none', outline: 'none', background: 'none', fontFamily: 'var(--font)', fontSize: 15, color: 'var(--ink)', padding: '13px 0' }} />
          </div>
        </div>

        <div style={{ height: 6 }} />
        <U5.Btn full icon={Icon.check} onClick={() => { setDirty(false); toast('Profil lagret', 'check'); }} style={{ opacity: dirty ? 1 : 0.5, pointerEvents: dirty ? 'auto' : 'none', marginBottom: 22 }}>Lagre endringer</U5.Btn>

        {/* connected / household */}
        <p style={{ margin: '0 4px 8px', fontSize: 12, fontWeight: 800, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: 0.6 }}>Konto</p>
        <U5.Card pad={4} style={{ padding: '4px 14px', marginBottom: 18 }}>
          <Row3 icon={Icon.apple} label="Tilkoblet med Apple" sub="mari@eikeland.no" tint="var(--surface-2)" ic="var(--ink)" />
          <Row3 icon={Icon.home} label={D5.HOUSEHOLD.name} sub={`${D5.HOUSEHOLD.members.length} medlemmer`} onClick={onShowHousehold} />
          <Row3 icon={Icon.key} label="Endre passord" sub="Send tilbakestillingslenke" onClick={() => toast('Lenke sendt på e-post', 'mail')} last />
        </U5.Card>

        {/* danger */}
        <p style={{ margin: '0 4px 8px', fontSize: 12, fontWeight: 800, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: 0.6 }}>Faresone</p>
        <U5.Press onClick={() => toast('Kontaktet support', 'check')} style={{ display: 'flex', alignItems: 'center', gap: 11, width: '100%', padding: '14px 16px', borderRadius: 'var(--r-sm)', background: 'var(--expired-tint)', color: 'var(--expired)', fontSize: 14, fontWeight: 700 }}>
          <Icon.trash s={19} /> Slett konto
        </U5.Press>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// PLASSERINGER  (manage storage locations)
// ════════════════════════════════════════════════════════════════
const LOC_ICONS = [
  ['locFridge', 'Kjøleskap'],
  ['locFreezer', 'Fryser'],
  ['locPantry', 'Spiskammer'],
  ['box', 'Skap'],
  ['home', 'Annet'],
];

function LocationSheet({ open, onClose, editId, initial, onSave, onDelete, canDelete }) {
  const [label, setLabel] = s3US('');
  const [icon, setIcon] = s3US('box');
  const [freezer, setFreezer] = s3US(false);
  const [touchedIcon, setTouchedIcon] = s3US(false);

  React.useEffect(() => {
    if (open) {
      setLabel(initial ? initial.label : '');
      setIcon(initial ? initial.icon : 'box');
      setFreezer(initial ? !!initial.freezer : false);
      setTouchedIcon(false);
    }
  }, [open, editId]);

  // enabling freezer auto-suggests the snowflake icon (until the user picks one)
  const toggleFreezer = (v) => { setFreezer(v); if (v && !touchedIcon) setIcon('locFreezer'); };
  const valid = label.trim().length > 0;

  return (
    <U5.Sheet open={open} onClose={onClose} title={editId ? 'Rediger plassering' : 'Ny plassering'}>
      <div style={{ paddingBottom: 6 }}>
        <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--ink-3)', margin: '4px 2px 7px', textTransform: 'uppercase', letterSpacing: 0.4 }}>Navn</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 11, background: 'var(--surface)', border: '1.5px solid var(--line)', borderRadius: 'var(--r-sm)', padding: '0 14px', boxShadow: 'var(--shadow-sm)', marginBottom: 16 }}>
          <input value={label} autoFocus onChange={(e) => setLabel(e.target.value)} placeholder="F.eks. Fryser i garasjen" style={{ flex: 1, border: 'none', outline: 'none', background: 'none', fontFamily: 'var(--font)', fontSize: 15, color: 'var(--ink)', padding: '13px 0' }} />
        </div>

        <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--ink-3)', margin: '0 2px 9px', textTransform: 'uppercase', letterSpacing: 0.4 }}>Ikon</label>
        <div style={{ display: 'flex', gap: 9, marginBottom: 18, flexWrap: 'wrap' }}>
          {LOC_ICONS.map(([key, name]) => {
            const on = icon === key;
            const hue = freezer ? 205 : 150;
            return (
              <U5.Press key={key} onClick={() => { setIcon(key); setTouchedIcon(true); }} aria-label={name} style={{ width: 52, height: 52, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', background: on ? `hsl(${hue} 60% 95%)` : 'var(--surface-2)', color: on ? `hsl(${hue} 55% 42%)` : 'var(--ink-3)', border: '1.5px solid ' + (on ? `hsl(${hue} 55% 60%)` : 'var(--line)') }}>
                {React.createElement(Icon[key], { s: 24 })}
              </U5.Press>
            );
          })}
        </div>

        {/* freezer toggle */}
        <U5.Press onClick={() => toggleFreezer(!freezer)} style={{ display: 'flex', alignItems: 'center', gap: 13, width: '100%', textAlign: 'left', background: freezer ? 'color-mix(in srgb, hsl(205 70% 50%) 12%, var(--surface))' : 'var(--surface-2)', border: '1.5px solid ' + (freezer ? 'hsl(205 60% 65%)' : 'var(--line)'), borderRadius: 'var(--r-sm)', padding: '13px 14px', marginBottom: 8 }}>
          <span style={{ width: 40, height: 40, borderRadius: 12, flexShrink: 0, background: freezer ? 'hsl(205 65% 92%)' : 'var(--surface)', color: freezer ? 'hsl(205 60% 42%)' : 'var(--ink-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--line)' }}><Icon.locFreezer s={22} /></span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: 14.5, fontWeight: 700 }}>Dette er en fryser</p>
            <p style={{ margin: '2px 0 0', fontSize: 12.5, color: 'var(--ink-3)', lineHeight: 1.4 }}>Varer her får forlenget holdbarhet, og «Best før» beholdes som notat.</p>
          </div>
          <SwitchMini on={freezer} />
        </U5.Press>

        <div style={{ height: 12 }} />
        <U5.Btn full icon={Icon.check} onClick={() => onSave({ label: label.trim(), icon, freezer })} style={{ opacity: valid ? 1 : 0.5, pointerEvents: valid ? 'auto' : 'none', marginBottom: editId ? 10 : 0 }}>{editId ? 'Lagre' : 'Legg til plassering'}</U5.Btn>

        {editId && (
          <U5.Press onClick={onDelete} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', padding: '13px', borderRadius: 'var(--r-sm)', background: canDelete ? 'var(--expired-tint)' : 'var(--surface-2)', color: canDelete ? 'var(--expired)' : 'var(--ink-3)', fontSize: 14, fontWeight: 700 }}>
            <Icon.trash s={18} /> {canDelete ? 'Slett plassering' : 'Tøm plasseringen for å slette'}
          </U5.Press>
        )}
      </div>
    </U5.Sheet>
  );
}

function SwitchMini({ on }) {
  return (
    <span style={{ width: 44, height: 26, borderRadius: 999, background: on ? 'hsl(205 65% 48%)' : 'var(--line)', position: 'relative', flexShrink: 0, transition: 'background .18s' }}>
      <span style={{ position: 'absolute', top: 3, left: on ? 21 : 3, width: 20, height: 20, borderRadius: 999, background: '#fff', boxShadow: 'var(--shadow-sm)', transition: 'left .18s' }} />
    </span>
  );
}

function LocationsScreen({ ctx }) {
  const { onNav, items, locations, addLocation, updateLocation, removeLocation } = ctx;
  const counts = {};
  items.forEach((i) => { counts[i.loc] = (counts[i.loc] || 0) + 1; });
  const [sheet, setSheet] = s3US(null); // { id|null }

  const editing = sheet && sheet.id ? locations[sheet.id] : null;
  const openAdd = () => setSheet({ id: null });
  const openEdit = (id) => setSheet({ id });
  const close = () => setSheet(null);

  const save = (data) => {
    if (sheet.id) updateLocation(sheet.id, data);
    else addLocation(data);
    close();
  };
  const del = () => {
    if (!sheet.id) return;
    if ((counts[sheet.id] || 0) > 0) return; // guard handled by handler too
    removeLocation(sheet.id);
    close();
  };

  const entries = Object.entries(locations);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <SubHeader title="Plasseringer" onBack={() => onNav('settings')} />
      <div className="noscroll" style={{ flex: 1, overflow: 'auto', padding: '4px 16px 24px' }}>
        <p style={{ margin: '0 4px 16px', fontSize: 13.5, color: 'var(--ink-2)', lineHeight: 1.5 }}>Steder du lagrer mat. Hver vare hører til én plassering — frysere forlenger holdbarheten automatisk.</p>

        <U5.Card pad={4} style={{ padding: '2px 14px', marginBottom: 16 }}>
          {entries.map(([k, meta], i) => (
            <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '14px 4px', borderBottom: i === entries.length - 1 ? 'none' : '1px solid var(--line-2)' }}>
              <span style={{ width: 42, height: 42, borderRadius: 12, background: `hsl(${meta.hue} 60% 95%)`, color: `hsl(${meta.hue} 55% 42%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{React.createElement(Icon[meta.icon] || Icon.box, { s: 22 })}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <p style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>{meta.label}</p>
                  {meta.freezer && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 10.5, fontWeight: 800, padding: '2px 7px', borderRadius: 999, background: 'hsl(205 65% 93%)', color: 'hsl(205 60% 40%)' }}><Icon.locFreezer s={11} />FRYSER</span>}
                </div>
                <p className="tnum" style={{ margin: '2px 0 0', fontSize: 12.5, color: 'var(--ink-3)' }}>{counts[k] || 0} varer</p>
              </div>
              <U5.Press onClick={() => openEdit(k)} style={{ width: 34, height: 34, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink-3)' }}><Icon.pencil s={17} /></U5.Press>
            </div>
          ))}
        </U5.Card>

        <U5.Press onClick={openAdd} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', padding: '14px', borderRadius: 'var(--r-sm)', background: 'var(--surface)', border: '1.5px dashed var(--line)', color: 'var(--primary)', fontSize: 14, fontWeight: 700 }}>
          <Icon.plus s={18} sw={2.2} /> Legg til plassering
        </U5.Press>
      </div>

      <LocationSheet
        open={!!sheet}
        onClose={close}
        editId={sheet && sheet.id}
        initial={editing}
        onSave={save}
        onDelete={del}
        canDelete={!!(sheet && sheet.id) && (counts[sheet.id] || 0) === 0 && entries.length > 1}
      />
    </div>
  );
}

// settings-style row used in Account
function Row3({ icon: I, label, sub, right, onClick, tint = 'var(--primary-tint)', ic = 'var(--on-primary-tint)', last }) {
  return (
    <U5.Press onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '13px 4px', width: '100%', borderBottom: last ? 'none' : '1px solid var(--line-2)' }}>
      <span style={{ width: 38, height: 38, borderRadius: 11, background: tint, color: ic, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><I s={20} /></span>
      <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
        <p style={{ margin: 0, fontSize: 14.5, fontWeight: 700 }}>{label}</p>
        {sub && <p style={{ margin: '1px 0 0', fontSize: 12.5, color: 'var(--ink-3)' }}>{sub}</p>}
      </div>
      {right || (onClick && <Icon.chevR s={18} style={{ color: 'var(--ink-3)' }} />)}
    </U5.Press>
  );
}

Object.assign(window, { ShoppingScreen, StatsScreen, AccountScreen, LocationsScreen });
