// friskr-screens2.jsx — Scan, AddSheet, Settings, Onboarding
const D3 = window.FriskrData;
const U2 = window.UI;
const { useState: uS, useEffect: uE, useRef: uR } = React;

// ════════════════════════════════════════════════════════════════
// SCAN  (camera mock → detect → opens add sheet)
// ════════════════════════════════════════════════════════════════
// Scan flow: barcode → lookup (household list, then Open Food Facts) →
// product (or "ny vare") → scan expiry date (text recognition) → add.
function ScanScreen({ ctx }) {
  const { openAdd } = ctx;
  // phase: barcode | lookup | product | datescan | dateread
  const [phase, setPhase] = uS('barcode');
  const [flash, setFlash] = uS(false);
  const [product, setProduct] = uS(null);
  const [source, setSource] = uS(null);   // 'list' | 'off' | 'new'
  const [offDays, setOffDays] = uS(null);
  const timer = uR(null);

  const reset = () => { setProduct(null); setSource(null); setOffDays(null); setPhase('barcode'); };

  // auto-detect a barcode after a beat (the common, happy path)
  uE(() => {
    if (phase !== 'barcode') return;
    timer.current = setTimeout(() => detect(D3.PRODUCTS[0], 'off'), 2600);
    return () => clearTimeout(timer.current);
  }, [phase]);

  // barcode detected → brief lookup → resolve to a product (or "ny vare")
  const detect = (p, src) => {
    clearTimeout(timer.current);
    setPhase('lookup');
    setTimeout(() => { setProduct(p); setSource(src); setPhase('product'); }, 1150);
  };
  // shutter = simulate a code that ISN'T in any database → create-new branch
  const captureBarcode = () => detect({ id: 'new', name: 'Ukjent produkt', brand: '', cat: 'annet', shelf: 7 }, 'new');

  // text-recognition of the printed expiry date
  const captureDate = () => {
    setPhase('lookup-date');
    setTimeout(() => { setOffDays(16); setPhase('dateread'); }, 1150);
  };

  const SOURCE_META = {
    list: { label: 'Fra husholdningens liste', ic: Icon.home, c: 'var(--primary)' },
    off:  { label: 'Funnet i Open Food Facts', ic: Icon.globe, c: 'var(--primary)' },
    new:  { label: 'Ny vare — ikke i databasen', ic: Icon.plus, c: 'var(--soon)' },
  };
  const isDateStep = phase === 'datescan' || phase === 'lookup-date' || phase === 'dateread';
  const scanning = phase === 'barcode' || phase === 'datescan';
  const looking = phase === 'lookup' || phase === 'lookup-date';

  return (
    <div style={{ position: 'relative', height: '100%', background: '#0a0d0b', overflow: 'hidden' }}>
      {/* faux camera feed */}
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(120% 80% at 50% 30%, #2a3330 0%, #14191600 60%), linear-gradient(180deg, #1a201d, #0c0f0d)' }}>
        <div style={{ position: 'absolute', inset: 0, opacity: 0.5, background: 'repeating-linear-gradient(115deg, #ffffff08 0 26px, #ffffff02 26px 60px)' }} />
      </div>

      {/* top bar */}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px' }}>
        <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#fff' }}>{isDateStep ? 'Skann utløpsdato' : 'Skann strekkode'}</h2>
        <U2.Press onClick={() => setFlash((f) => !f)} style={{ width: 42, height: 42, borderRadius: 999, background: flash ? '#fff' : 'rgba(255,255,255,.14)', color: flash ? '#111' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {flash ? <Icon.flash s={20} /> : <Icon.flashOff s={20} />}
        </U2.Press>
      </div>

      {/* step chips */}
      <div style={{ position: 'relative', display: 'flex', gap: 7, justifyContent: 'center', marginTop: 2 }}>
        {[['1', 'Strekkode', !isDateStep], ['2', 'Dato', isDateStep]].map(([n, lbl, on]) => (
          <span key={n} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 11px 5px 6px', borderRadius: 999, background: on ? 'rgba(255,255,255,.16)' : 'rgba(255,255,255,.06)', color: on ? '#fff' : 'rgba(255,255,255,.5)' }}>
            <span style={{ width: 18, height: 18, borderRadius: 999, background: on ? 'var(--primary)' : 'rgba(255,255,255,.18)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800 }}>{n}</span>
            <span style={{ fontSize: 12, fontWeight: 700 }}>{lbl}</span>
          </span>
        ))}
      </div>

      {/* reticle (barcode = wide, date = wide & short) */}
      <div style={{ position: 'absolute', left: '50%', top: '38%', transform: 'translate(-50%,-50%)', width: 250, height: isDateStep ? 96 : 168, transition: 'height .3s' }}>
        {[['tl', { top: -2, left: -2 }, { borderTop: '3px solid #fff', borderLeft: '3px solid #fff', borderTopLeftRadius: 16 }],
          ['tr', { top: -2, right: -2 }, { borderTop: '3px solid #fff', borderRight: '3px solid #fff', borderTopRightRadius: 16 }],
          ['bl', { bottom: -2, left: -2 }, { borderBottom: '3px solid #fff', borderLeft: '3px solid #fff', borderBottomLeftRadius: 16 }],
          ['br', { bottom: -2, right: -2 }, { borderBottom: '3px solid #fff', borderRight: '3px solid #fff', borderBottomRightRadius: 16 }]
        ].map(([k, pos, b]) => <div key={k} style={{ position: 'absolute', width: 34, height: 34, ...pos, ...b }} />)}
        {scanning && (
          <div style={{ position: 'absolute', left: 10, right: 10, height: 2.5, borderRadius: 2, background: 'linear-gradient(90deg, transparent, var(--primary), transparent)', boxShadow: '0 0 14px var(--primary)', animation: 'friskr-scanline 2.4s ease-in-out infinite' }} />
        )}
        {/* hint glyph inside the date reticle */}
        {phase === 'datescan' && (
          <span className="tnum" style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,.32)', fontSize: 22, fontWeight: 700, letterSpacing: 1 }}>BEST FØR</span>
        )}
        {looking && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ width: 30, height: 30, border: '3px solid rgba(255,255,255,.25)', borderTopColor: '#fff', borderRadius: 999, animation: 'friskr-spin .8s linear infinite' }} />
          </div>
        )}
      </div>

      <p style={{ position: 'absolute', top: 'calc(38% + 92px)', left: 0, right: 0, textAlign: 'center', color: 'rgba(255,255,255,.78)', fontSize: 13.5, fontWeight: 600, padding: '0 30px' }}>
        {phase === 'barcode' && 'Rett kameraet mot strekkoden'}
        {phase === 'lookup' && 'Slår opp produktet…'}
        {phase === 'datescan' && 'Pek mot «best før»-datoen på pakken'}
        {phase === 'lookup-date' && 'Leser av datoen…'}
      </p>

      {/* barcode-step controls */}
      {phase === 'barcode' && (
        <div style={{ position: 'absolute', bottom: 30, left: 0, right: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18 }}>
          <U2.Press onClick={captureBarcode} style={{ width: 72, height: 72, borderRadius: 999, background: 'rgba(255,255,255,.16)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '3px solid rgba(255,255,255,.5)' }}>
            <span style={{ width: 56, height: 56, borderRadius: 999, background: '#fff' }} />
          </U2.Press>
          <U2.Press onClick={() => openAdd()} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '11px 18px', borderRadius: 999, background: 'rgba(255,255,255,.14)', color: '#fff', fontSize: 13.5, fontWeight: 700 }}>
            <Icon.pencil s={17} /> Legg til manuelt
          </U2.Press>
        </div>
      )}

      {/* date-step shutter */}
      {phase === 'datescan' && (
        <div style={{ position: 'absolute', bottom: 30, left: 0, right: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <U2.Press onClick={captureDate} style={{ width: 72, height: 72, borderRadius: 999, background: 'rgba(255,255,255,.16)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '3px solid rgba(255,255,255,.5)' }}>
            <span style={{ width: 56, height: 56, borderRadius: 999, background: '#fff' }} />
          </U2.Press>
          <U2.Press onClick={() => openAdd(product, {})} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '11px 18px', borderRadius: 999, background: 'rgba(255,255,255,.14)', color: '#fff', fontSize: 13.5, fontWeight: 700 }}>
            Hopp over — sett dato selv
          </U2.Press>
        </div>
      )}

      {/* product result card → leads into the date step */}
      {phase === 'product' && product && (() => {
        const sm = SOURCE_META[source];
        const isNew = source === 'new';
        return (
          <div style={{ position: 'absolute', left: 14, right: 14, bottom: 22, background: 'var(--surface)', borderRadius: 'var(--r)', padding: 16, boxShadow: 'var(--shadow-lg)', animation: 'friskr-rise .3s ease' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 11px', borderRadius: 999, background: sm.c === 'var(--soon)' ? 'var(--soon-tint)' : 'var(--primary-tint)', color: sm.c === 'var(--soon)' ? 'var(--soon)' : 'var(--on-primary-tint)', marginBottom: 12 }}>
              {React.createElement(sm.ic, { s: 15 })}
              <span style={{ fontSize: 12, fontWeight: 800 }}>{sm.label}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 13, marginBottom: 14 }}>
              <U2.CatTile cat={product.cat} size={52} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>{isNew ? 'Ukjent strekkode' : product.name}</p>
                <p style={{ margin: '2px 0 0', fontSize: 12.5, color: 'var(--ink-3)' }} className="tnum">{isNew ? 'EAN 7041234500000 · legg til navn' : `${product.brand || D3.CATEGORIES[product.cat].label} · EAN 700${product.id.replace('p','')}3920104`}</p>
              </div>
              {!isNew && <span style={{ color: 'var(--primary)', display: 'flex' }}><Icon.checkCircle s={26} /></span>}
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <U2.Btn variant="ghost" onClick={reset} style={{ flex: 1 }}>Skann på nytt</U2.Btn>
              {isNew ? (
                <U2.Btn onClick={() => openAdd()} icon={Icon.pencil} style={{ flex: 1.5 }}>Legg til manuelt</U2.Btn>
              ) : (
                <U2.Btn onClick={() => setPhase('datescan')} icon={Icon.cal} style={{ flex: 1.5 }}>Skann dato</U2.Btn>
              )}
            </div>
          </div>
        );
      })()}

      {/* date read → confirm and add */}
      {phase === 'dateread' && product && offDays != null && (
        <div style={{ position: 'absolute', left: 14, right: 14, bottom: 22, background: 'var(--surface)', borderRadius: 'var(--r)', padding: 16, boxShadow: 'var(--shadow-lg)', animation: 'friskr-rise .3s ease' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 13, marginBottom: 12 }}>
            <U2.CatTile cat={product.cat} size={46} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: 15.5, fontWeight: 800 }}>{product.name}</p>
              <p style={{ margin: '2px 0 0', fontSize: 12.5, color: 'var(--ink-3)' }}>{product.brand || D3.CATEGORIES[product.cat].label}</p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--surface-2)', border: '1px solid var(--line)', borderRadius: 'var(--r-sm)', padding: '12px 14px', marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ color: 'var(--primary)', display: 'flex' }}><Icon.cal s={19} /></span>
              <div>
                <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: 0.4 }}>Lest av · best før</p>
                <p className="tnum" style={{ margin: '1px 0 0', fontSize: 16, fontWeight: 800 }}>{D3.fmtNO(D3.dateFromOffset(offDays))}</p>
              </div>
            </div>
            <U2.StatusPill off={offDays} dense />
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <U2.Btn variant="ghost" onClick={() => setPhase('datescan')} style={{ flex: 1 }}>Skann på nytt</U2.Btn>
            <U2.Btn onClick={() => openAdd(product, { off: offDays })} icon={Icon.check} style={{ flex: 1.5 }}>Legg til</U2.Btn>
          </div>
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// ADD / EDIT SHEET
// ════════════════════════════════════════════════════════════════
function Stepper({ value, onChange, min = 1 }) {
  const btn = (I, fn, dis) => (
    <U2.Press onClick={fn} style={{ width: 40, height: 40, borderRadius: 12, background: dis ? 'var(--surface-2)' : 'var(--primary-tint)', color: dis ? 'var(--ink-3)' : 'var(--on-primary-tint)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--line)' }}><I s={20} sw={2.2} /></U2.Press>
  );
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
      {btn(Icon.minus, () => onChange(Math.max(min, value - 1)), value <= min)}
      <span className="tnum" style={{ fontSize: 22, fontWeight: 800, minWidth: 28, textAlign: 'center' }}>{value}</span>
      {btn(Icon.plus, () => onChange(value + 1))}
    </div>
  );
}

function AddSheet({ open, onClose, product, initOff, onSave }) {
  // `product` may be a catalog product OR an existing stock item (which nests
  // the product under .product). Normalize so editing a stock item works.
  const isItem = !!(product && product.product);
  const prod = isItem ? product.product : product;
  const editId = isItem ? product.id : null;

  const [qty, setQty] = uS(1);
  const [loc, setLoc] = uS('kjoleskap');
  const [days, setDays] = uS(7);
  const [note, setNote] = uS('');
  const [price, setPrice] = uS('');
  const [sel, setSel] = uS(null);

  uE(() => {
    if (open) {
      setQty(isItem ? product.qty : 1);
      setLoc(isItem ? product.loc : 'kjoleskap');
      setNote(isItem ? (product.note || '') : '');
      setPrice(isItem && product.price != null ? String(product.price) : '');
      setSel(prod || null);
      // priority: editing item's own date → scanned date → product shelf default
      setDays(isItem ? product.off : (initOff != null ? initOff : (prod ? prod.shelf : 7)));
    }
  }, [open, product, initOff]);

  const quick = [
    { l: 'I dag', d: 0 }, { l: '+3 d', d: 3 }, { l: '+1 uke', d: 7 },
    ...(sel ? [{ l: `Anbefalt (${sel.shelf}d)`, d: sel.shelf }] : [{ l: '+2 uker', d: 14 }]),
  ];
  const target = D3.dateFromOffset(days);

  return (
    <U2.Sheet open={open} onClose={onClose} title={editId ? 'Rediger vare' : (prod ? 'Legg til på lager' : 'Ny vare')}>
      {/* product picker / display */}
      {sel ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 13, padding: 12, background: 'var(--surface-2)', borderRadius: 'var(--r-sm)', marginBottom: 16, border: '1px solid var(--line)' }}>
          <U2.CatTile cat={sel.cat} size={46} />
          <div style={{ flex: 1 }}>
            <p style={{ margin: 0, fontSize: 15.5, fontWeight: 700 }}>{sel.name}</p>
            <p style={{ margin: '2px 0 0', fontSize: 12.5, color: 'var(--ink-3)' }}>{sel.brand || D3.CATEGORIES[sel.cat].label}</p>
          </div>
          <U2.Press onClick={() => setSel(null)} style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--primary)' }}>Endre</U2.Press>
        </div>
      ) : (
        <div style={{ marginBottom: 16 }}>
          <label style={fieldLabel}>Produkt</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--surface-2)', border: '1px solid var(--line)', borderRadius: 'var(--r-sm)', padding: '12px 14px', marginBottom: 10 }}>
            <Icon.search s={18} style={{ color: 'var(--ink-3)' }} />
            <input autoFocus placeholder="Søk eller skriv navn…" style={{ flex: 1, border: 'none', outline: 'none', background: 'none', fontFamily: 'var(--font)', fontSize: 14.5, color: 'var(--ink)' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7, maxHeight: 168, overflow: 'auto' }} className="noscroll">
            {D3.PRODUCTS.slice(0, 5).map((p) => (
              <U2.Press key={p.id} onClick={() => { setSel(p); setDays(p.shelf); }} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: 8, borderRadius: 12 }}>
                <U2.CatTile cat={p.cat} size={38} />
                <div style={{ flex: 1 }}>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>{p.name}</p>
                  <p style={{ margin: 0, fontSize: 12, color: 'var(--ink-3)' }}>{p.brand}</p>
                </div>
                <Icon.plus s={18} style={{ color: 'var(--primary)' }} />
              </U2.Press>
            ))}
          </div>
        </div>
      )}

      {sel && (
        <>
          {/* expiry date */}
          <label style={fieldLabel}>Utløpsdato</label>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--surface-2)', border: '1px solid var(--line)', borderRadius: 'var(--r-sm)', padding: '14px 16px', marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
              <Icon.cal s={20} style={{ color: 'var(--primary)' }} />
              <span className="tnum" style={{ fontSize: 16, fontWeight: 700 }}>{D3.fmtNO(target)}</span>
            </div>
            <U2.StatusPill off={days} dense />
          </div>
          <div className="noscroll" style={{ display: 'flex', gap: 8, overflowX: 'auto', marginBottom: 18 }}>
            {quick.map((qk) => {
              const on = days === qk.d;
              return (
                <U2.Press key={qk.l} onClick={() => setDays(qk.d)} style={{ flexShrink: 0, padding: '8px 14px', borderRadius: 999, fontSize: 13, fontWeight: 700, background: on ? 'var(--primary)' : 'var(--surface-2)', color: on ? 'var(--on-primary)' : 'var(--ink-2)', border: '1px solid ' + (on ? 'var(--primary)' : 'var(--line)'), whiteSpace: 'nowrap' }}>{qk.l}</U2.Press>
              );
            })}
          </div>

          {/* quantity + location */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
            <label style={{ ...fieldLabel, margin: 0 }}>Antall</label>
            <Stepper value={qty} onChange={setQty} />
          </div>

          <label style={fieldLabel}>Plassering</label>
          <div style={{ display: 'flex', gap: 9, marginBottom: 18 }}>
            {Object.keys(D3.LOCATIONS).map((lk) => {
              const on = loc === lk; const meta = D3.LOCATIONS[lk];
              return (
                <U2.Press key={lk} onClick={() => setLoc(lk)} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7, padding: '14px 4px', borderRadius: 'var(--r-sm)', background: on ? 'var(--primary-tint)' : 'var(--surface-2)', border: '1.5px solid ' + (on ? 'var(--primary)' : 'var(--line)'), color: on ? 'var(--on-primary-tint)' : 'var(--ink-2)' }}>
                  {React.createElement(Icon[meta.icon], { s: 22 })}
                  <span style={{ fontSize: 12, fontWeight: 700 }}>{meta.label}</span>
                </U2.Press>
              );
            })}
          </div>

          <label style={fieldLabel}>Notat (valgfritt)</label>
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="f.eks. åpnet, halv pakke…" style={{ width: '100%', boxSizing: 'border-box', border: '1px solid var(--line)', background: 'var(--surface-2)', borderRadius: 'var(--r-sm)', padding: '13px 16px', fontFamily: 'var(--font)', fontSize: 14.5, color: 'var(--ink)', outline: 'none', marginBottom: 18 }} />

          {/* optional price — powers the « spart » figure, never required */}
          <label style={fieldLabel}>Pris (valgfritt)</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--surface-2)', border: '1px solid var(--line)', borderRadius: 'var(--r-sm)', padding: '4px 16px 4px 14px', marginBottom: 8 }}>
            <Icon.tag s={18} style={{ color: 'var(--ink-3)' }} />
            <input value={price} onChange={(e) => setPrice(e.target.value.replace(/[^0-9.,]/g, ''))} inputMode="decimal" placeholder={`f.eks. ${(D3.CATEGORY_PRICE[sel.cat] || 30)}`} style={{ flex: 1, border: 'none', outline: 'none', background: 'none', fontFamily: 'var(--font)', fontSize: 14.5, color: 'var(--ink)' }} />
            <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--ink-3)' }}>kr</span>
          </div>
          <p style={{ margin: '0 2px 22px', fontSize: 12, color: 'var(--ink-3)', lineHeight: 1.4 }}>Legg til prisen for å se hvor mye du faktisk sparer når du bruker opp varen.</p>

          <U2.Btn full icon={Icon.check} onClick={() => onSave({ product: sel, qty, loc, off: days, note, price: price === '' ? null : Number(price.replace(',', '.')), editId })}>{editId ? 'Lagre endringer' : 'Lagre på lager'}</U2.Btn>
        </>
      )}
    </U2.Sheet>
  );
}
const fieldLabel = { display: 'block', fontSize: 12.5, fontWeight: 700, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: 0.4, margin: '0 0 9px' };

// ════════════════════════════════════════════════════════════════
// SETTINGS
// ════════════════════════════════════════════════════════════════
function Row({ icon: I, label, sub, right, onClick, tint = 'var(--primary-tint)', ic = 'var(--on-primary-tint)', last }) {
  return (
    <U2.Press onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '13px 4px', width: '100%', borderBottom: last ? 'none' : '1px solid var(--line-2)' }}>
      <span style={{ width: 38, height: 38, borderRadius: 11, background: tint, color: ic, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><I s={20} /></span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: 14.5, fontWeight: 700 }}>{label}</p>
        {sub && <p style={{ margin: '1px 0 0', fontSize: 12.5, color: 'var(--ink-3)' }}>{sub}</p>}
      </div>
      {right || <Icon.chevR s={18} style={{ color: 'var(--ink-3)' }} />}
    </U2.Press>
  );
}
function Toggle({ on, onClick }) {
  return (
    <U2.Press onClick={onClick} style={{ width: 46, height: 28, borderRadius: 999, background: on ? 'var(--primary)' : 'var(--line)', position: 'relative', transition: 'background .2s', flexShrink: 0 }}>
      <span style={{ position: 'absolute', top: 3, left: on ? 21 : 3, width: 22, height: 22, borderRadius: 999, background: '#fff', transition: 'left .2s cubic-bezier(.3,1.4,.5,1)', boxShadow: '0 1px 3px rgba(0,0,0,.25)' }} />
    </U2.Press>
  );
}
function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 18 }}>
      {title && <p style={{ margin: '0 4px 8px', fontSize: 12, fontWeight: 800, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: 0.6 }}>{title}</p>}
      <U2.Card pad={4} style={{ padding: '4px 14px' }}>{children}</U2.Card>
    </div>
  );
}

function SettingsScreen({ ctx }) {
  const { dark, setDark, push, setPush, days, setDays, onShowOnboarding, onShowHousehold, onSignOut, toast } = ctx;
  return (
    <div className="noscroll" style={{ height: '100%', overflow: 'auto', padding: '14px 16px 24px' }}>
      <h1 style={{ margin: '0 2px 16px', fontSize: 25, fontWeight: 800, letterSpacing: -0.5 }}>Innstillinger</h1>

      {/* profile */}
      <U2.Card pad={16} style={{ marginBottom: 18, display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ width: 54, height: 54, borderRadius: 999, background: 'hsl(145 45% 42%)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 22 }}>M</div>
        <div style={{ flex: 1 }}>
          <p style={{ margin: 0, fontSize: 17, fontWeight: 800 }}>Mari Eikeland</p>
          <p style={{ margin: '2px 0 0', fontSize: 13, color: 'var(--ink-3)' }}>mari@eikeland.no</p>
        </div>
        <Icon.chevR s={20} style={{ color: 'var(--ink-3)' }} />
      </U2.Card>

      {/* household */}
      <Section title="Husholdning">
        <Row icon={Icon.home} label={D3.HOUSEHOLD.name} sub={`${D3.HOUSEHOLD.members.length} medlemmer`} tint="var(--primary-tint)" onClick={onShowHousehold} right={
          <div style={{ display: 'flex' }}>
            {D3.HOUSEHOLD.members.map((m, i) => (
              <span key={m.name} style={{ width: 28, height: 28, borderRadius: 999, background: `hsl(${m.hue} 45% 45%)`, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, border: '2px solid var(--surface)', marginLeft: i ? -9 : 0 }}>{m.initial}</span>
            ))}
          </div>
        } />
        <Row icon={Icon.users} label="Medlemmer & roller" sub="Inviter familie til delt lager" onClick={onShowHousehold} last />
      </Section>

      {/* notifications */}
      <Section title="Varsler">
        <Row icon={Icon.bell} label="Push-varsler" sub="Få beskjed før varer utløper" tint="var(--soon-tint)" ic="var(--soon)" right={<Toggle on={push} onClick={() => setPush(!push)} />} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '13px 4px', opacity: push ? 1 : 0.4, pointerEvents: push ? 'auto' : 'none' }}>
          <span style={{ width: 38, height: 38, borderRadius: 11, background: 'var(--soon-tint)', color: 'var(--soon)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Icon.clock s={20} /></span>
          <div style={{ flex: 1 }}>
            <p style={{ margin: 0, fontSize: 14.5, fontWeight: 700 }}>Varsle på forhånd</p>
            <p style={{ margin: '1px 0 0', fontSize: 12.5, color: 'var(--ink-3)' }}>{days} dager før utløp</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <U2.Press onClick={() => setDays(Math.max(1, days - 1))} style={{ width: 32, height: 32, borderRadius: 9, background: 'var(--surface-2)', border: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink-2)' }}><Icon.minus s={17} /></U2.Press>
            <span className="tnum" style={{ fontSize: 16, fontWeight: 800, minWidth: 16, textAlign: 'center' }}>{days}</span>
            <U2.Press onClick={() => setDays(Math.min(14, days + 1))} style={{ width: 32, height: 32, borderRadius: 9, background: 'var(--surface-2)', border: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink-2)' }}><Icon.plus s={17} /></U2.Press>
          </div>
        </div>
      </Section>

      {/* preferences */}
      <Section title="Innstillinger">
        <Row icon={Icon.moon} label="Mørk modus" tint="var(--surface-2)" ic="var(--ink-2)" right={<Toggle on={dark} onClick={() => setDark(!dark)} />} />
        <Row icon={Icon.globe} label="Språk" sub="Norsk (bokmål)" tint="var(--surface-2)" ic="var(--ink-2)" />
        <Row icon={Icon.locFridge} label="Plasseringer" sub="Kjøleskap, Fryser, Spiskammer" tint="var(--surface-2)" ic="var(--ink-2)" last />
      </Section>

      <Section title="Om">
        <Row icon={Icon.spark} label="Se introduksjon" sub="Gjennomgå oppsettet på nytt" tint="var(--primary-tint)" onClick={onShowOnboarding} />
        <Row icon={Icon.leaf} label="friskr" sub="Versjon 2.0 · Norge" tint="var(--primary-tint)" right={<span style={{ fontSize: 12, color: 'var(--ink-3)' }} className="tnum">2.0.0</span>} last />
      </Section>

      <U2.Press onClick={onSignOut} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9, width: '100%', padding: '14px', marginBottom: 8, borderRadius: 'var(--r-sm)', background: 'var(--expired-tint)', color: 'var(--expired)', fontSize: 14.5, fontWeight: 700 }}>
        <Icon.logout s={19} /> Logg ut
      </U2.Press>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// ONBOARDING (overlay flow)
// ════════════════════════════════════════════════════════════════
function Onboarding({ onDone }) {
  const [step, setStep] = uS(0);
  const steps = [
    {
      art: 'hero',
      title: 'Aldri kast mat igjen',
      body: 'friskr holder styr på utløpsdatoer slik at familien bruker opp varene i tide.',
    },
    {
      art: 'scan',
      title: 'Skann og legg til på sekunder',
      body: 'Pek kameraet mot strekkoden — vi fyller inn produktet automatisk. Bare velg dato.',
    },
    {
      art: 'house',
      title: 'Ett delt lager for hele huset',
      body: 'Inviter familien. Alle ser hva som finnes hjemme og hva som må brukes først.',
    },
    {
      art: 'bell',
      title: 'Bli varslet i tide',
      body: 'Få en vennlig påminnelse noen dager før noe går ut på dato.',
    },
  ];
  const s = steps[step];
  const last = step === steps.length - 1;

  const Art = () => {
    if (s.art === 'hero') return (
      <div style={{ position: 'relative', width: 180, height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <U2.FreshnessRing fresh={12} soon={3} expired={1} size={180} stroke={16} />
        <span style={{ position: 'absolute', color: 'var(--primary)', display: 'flex' }}><Icon.leaf s={64} /></span>
      </div>
    );
    const map = { scan: Icon.scan, house: Icon.home, bell: Icon.bell };
    const I = map[s.art];
    return (
      <div style={{ width: 150, height: 150, borderRadius: 44, background: 'var(--primary-tint)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <I s={66} sw={1.5} />
      </div>
    );
  };

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 90, background: 'var(--paper)', display: 'flex', flexDirection: 'column' }}>
      <U2.StatusBar />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--primary)' }}>
          <Icon.logo s={22} /><span style={{ fontSize: 18, fontWeight: 800, color: 'var(--ink)' }}>friskr</span>
        </div>
        {!last && <U2.Press onClick={onDone} style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--ink-3)' }}>Hopp over</U2.Press>}
      </div>

      <div key={step} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 36px', textAlign: 'center', animation: 'friskr-rise .3s ease' }}>
        <div style={{ marginBottom: 40 }}><Art /></div>
        <h1 style={{ margin: '0 0 14px', fontSize: 27, fontWeight: 800, letterSpacing: -0.6, lineHeight: 1.15 }}>{s.title}</h1>
        <p style={{ margin: 0, fontSize: 15.5, color: 'var(--ink-2)', lineHeight: 1.5, maxWidth: 300 }}>{s.body}</p>
      </div>

      <div style={{ padding: '0 28px 30px' }}>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 7, marginBottom: 24 }}>
          {steps.map((_, i) => (
            <span key={i} style={{ height: 7, width: i === step ? 24 : 7, borderRadius: 999, background: i === step ? 'var(--primary)' : 'var(--line)', transition: 'all .25s' }} />
          ))}
        </div>
        <U2.Btn full onClick={() => (last ? onDone() : setStep(step + 1))} icon={last ? Icon.check : null}>
          {last ? 'Kom i gang' : 'Neste'}
        </U2.Btn>
      </div>
      <U2.GestureNav />
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// HOUSEHOLD  (members · invite via code / link / QR · join · sign-in)
// ════════════════════════════════════════════════════════════════
function FauxQR({ code, size = 132 }) {
  // deterministic dot pattern seeded from the code — purely decorative
  const n = 11, cell = size / n;
  let seed = 0; for (let i = 0; i < code.length; i++) seed = (seed * 31 + code.charCodeAt(i)) & 0xffff;
  const rnd = (i) => { const x = Math.sin(seed + i * 12.9898) * 43758.5453; return x - Math.floor(x); };
  const dots = [];
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
    const finder = (r < 3 && c < 3) || (r < 3 && c > n - 4) || (r > n - 4 && c < 3);
    if (finder) continue;
    if (rnd(r * n + c) > 0.52) dots.push(<rect key={r + '-' + c} x={c * cell} y={r * cell} width={cell} height={cell} rx={cell * 0.22} fill="var(--ink)" />);
  }
  const Finder = ({ x, y }) => (
    <g transform={`translate(${x},${y})`}>
      <rect width={cell * 3} height={cell * 3} rx={cell * 0.5} fill="var(--ink)" />
      <rect x={cell * 0.55} y={cell * 0.55} width={cell * 1.9} height={cell * 1.9} rx={cell * 0.35} fill="var(--surface)" />
      <rect x={cell * 1.05} y={cell * 1.05} width={cell * 0.9} height={cell * 0.9} rx={cell * 0.2} fill="var(--ink)" />
    </g>
  );
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: 'block' }}>
      {dots}
      <Finder x={0} y={0} /><Finder x={(n - 3) * cell} y={0} /><Finder x={0} y={(n - 3) * cell} />
    </svg>
  );
}

function HouseholdScreen({ onClose, toast }) {
  const H = D3.HOUSEHOLD;
  const [mode, setMode] = uS('manage'); // manage | join
  const [joinCode, setJoinCode] = uS('');
  const [copied, setCopied] = uS(false);

  const copy = () => {
    try { navigator.clipboard?.writeText(H.code); } catch (e) {}
    setCopied(true); setTimeout(() => setCopied(false), 1600);
    toast('Kode kopiert', 'check');
  };
  const share = () => toast('Delingslenke klar', 'link');

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 90, background: 'var(--paper)', display: 'flex', flexDirection: 'column' }}>
      <U2.StatusBar />
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px' }}>
        <U2.Press onClick={mode === 'join' ? () => setMode('manage') : onClose} style={{ width: 40, height: 40, borderRadius: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink-2)' }}><Icon.chevL s={24} /></U2.Press>
        <h1 style={{ margin: 0, fontSize: 19, fontWeight: 800, letterSpacing: -0.4 }}>{mode === 'join' ? 'Bli med i husholdning' : 'Husholdning'}</h1>
      </div>

      <div className="noscroll" style={{ flex: 1, overflow: 'auto', padding: '6px 16px 28px' }}>
        {mode === 'manage' ? (
          <>
            {/* household header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '4px 2px 18px' }}>
              <div style={{ width: 52, height: 52, borderRadius: 16, background: 'var(--primary-tint)', color: 'var(--on-primary-tint)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon.home s={26} /></div>
              <div style={{ flex: 1 }}>
                <p style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>{H.name}</p>
                <p style={{ margin: '2px 0 0', fontSize: 13, color: 'var(--ink-3)' }}>{H.members.length} medlemmer · delt lager</p>
              </div>
            </div>

            {/* invite card */}
            <U2.Card pad={18} style={{ marginBottom: 16, textAlign: 'center' }}>
              <p style={{ margin: '0 0 4px', fontSize: 13.5, fontWeight: 800 }}>Inviter familien</p>
              <p style={{ margin: '0 0 16px', fontSize: 12.5, color: 'var(--ink-3)', lineHeight: 1.45 }}>Del koden eller QR-en. Den som scanner kobles til det samme delte lageret.</p>
              <div style={{ display: 'inline-flex', padding: 12, background: 'var(--surface-2)', border: '1px solid var(--line)', borderRadius: 'var(--r-sm)', marginBottom: 14 }}>
                <FauxQR code={H.code} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, background: 'var(--surface-2)', border: '1px dashed var(--line)', borderRadius: 'var(--r-sm)', padding: '12px 14px', marginBottom: 12 }}>
                <div style={{ textAlign: 'left' }}>
                  <p style={{ margin: 0, fontSize: 10.5, fontWeight: 700, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: 0.6 }}>Invitasjonskode</p>
                  <p className="tnum" style={{ margin: '1px 0 0', fontSize: 19, fontWeight: 800, letterSpacing: 1.5 }}>{H.code}</p>
                </div>
                <U2.Press onClick={copy} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 13px', borderRadius: 999, background: copied ? 'var(--primary)' : 'var(--primary-tint)', color: copied ? 'var(--on-primary)' : 'var(--on-primary-tint)', fontSize: 13, fontWeight: 800 }}>
                  {copied ? <Icon.check s={16} /> : <Icon.copy s={16} />}{copied ? 'Kopiert' : 'Kopier'}
                </U2.Press>
              </div>
              <U2.Btn full variant="ghost" icon={Icon.link} onClick={share}>Del lenke</U2.Btn>
            </U2.Card>

            {/* members */}
            <p style={{ margin: '0 4px 8px', fontSize: 12, fontWeight: 800, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: 0.6 }}>Medlemmer</p>
            <U2.Card pad={4} style={{ padding: '4px 14px', marginBottom: 16 }}>
              {H.members.map((m, i) => (
                <div key={m.name} style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '12px 4px', borderBottom: i === H.members.length - 1 ? 'none' : '1px solid var(--line-2)' }}>
                  <span style={{ width: 40, height: 40, borderRadius: 999, background: `hsl(${m.hue} 45% 45%)`, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 16, flexShrink: 0 }}>{m.initial}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: 14.5, fontWeight: 700 }}>{m.name}</p>
                    <p style={{ margin: '1px 0 0', fontSize: 12, color: 'var(--ink-3)', display: 'flex', alignItems: 'center', gap: 5 }}><Icon.phone s={13} />{m.device}</p>
                  </div>
                  <span style={{ fontSize: 11.5, fontWeight: 800, padding: '4px 10px', borderRadius: 999, background: m.role === 'Eier' ? 'var(--primary-tint)' : 'var(--surface-2)', color: m.role === 'Eier' ? 'var(--on-primary-tint)' : 'var(--ink-3)' }}>{m.role}</span>
                </div>
              ))}
            </U2.Card>

            {/* sign-in explainer — sets the right expectation re: accounts */}
            <div style={{ display: 'flex', gap: 12, padding: 14, background: 'var(--surface-2)', borderRadius: 'var(--r-sm)', border: '1px solid var(--line)', marginBottom: 18 }}>
              <span style={{ color: 'var(--primary)', flexShrink: 0, marginTop: 1 }}><Icon.key s={20} /></span>
              <div>
                <p style={{ margin: 0, fontSize: 13.5, fontWeight: 700 }}>Ny telefon?</p>
                <p style={{ margin: '3px 0 0', fontSize: 12.5, color: 'var(--ink-2)', lineHeight: 1.5 }}>Logg inn med samme konto, så er hele lageret der med en gang. Endringer synkroniseres mellom alle enheter når du er på nett.</p>
              </div>
            </div>

            <U2.Press onClick={() => setMode('join')} style={{ display: 'block', width: '100%', textAlign: 'center', padding: '12px', fontSize: 13.5, fontWeight: 700, color: 'var(--primary)' }}>Bli med i en annen husholdning</U2.Press>
          </>
        ) : (
          /* JOIN flow */
          <div style={{ paddingTop: 8 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: 24 }}>
              <div style={{ width: 64, height: 64, borderRadius: 20, background: 'var(--primary-tint)', color: 'var(--on-primary-tint)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}><Icon.users s={30} /></div>
              <h2 style={{ margin: '0 0 8px', fontSize: 21, fontWeight: 800, letterSpacing: -0.4 }}>Skriv inn koden</h2>
              <p style={{ margin: 0, fontSize: 14, color: 'var(--ink-2)', lineHeight: 1.5, maxWidth: 280 }}>Be et medlem om invitasjonskoden, eller skann QR-koden deres.</p>
            </div>
            <input value={joinCode} onChange={(e) => setJoinCode(e.target.value.toUpperCase())} placeholder="FRISK-XXXX" autoFocus className="tnum"
              style={{ width: '100%', boxSizing: 'border-box', textAlign: 'center', letterSpacing: 3, fontSize: 22, fontWeight: 800, border: '1.5px solid var(--line)', background: 'var(--surface-2)', borderRadius: 'var(--r-sm)', padding: '16px', fontFamily: 'var(--font)', color: 'var(--ink)', outline: 'none', marginBottom: 12 }} />
            <U2.Btn full icon={Icon.qr} variant="ghost" onClick={() => toast('Åpner kamera…', 'check')}>Skann QR i stedet</U2.Btn>
            <div style={{ height: 10 }} />
            <U2.Btn full icon={Icon.arrowR} onClick={() => { if (joinCode.trim()) { toast('Sender forespørsel…', 'check'); setMode('manage'); } }}>Bli med</U2.Btn>
          </div>
        )}
      </div>
      <U2.GestureNav />
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// SIGN IN  (app gate — Apple / Google SSO + e-post magic link)
// ════════════════════════════════════════════════════════════════
function ProviderBtn({ icon: I, iconColor, label, onClick, dark }) {
  return (
    <U2.Press onClick={onClick} style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 11, width: '100%',
      padding: '15px 18px', borderRadius: 'var(--r-sm)', fontSize: 15.5, fontWeight: 700,
      background: dark ? 'var(--ink)' : 'var(--surface)', color: dark ? 'var(--paper)' : 'var(--ink)',
      border: dark ? 'none' : '1.5px solid var(--line)', boxShadow: 'var(--shadow-sm)',
    }}>
      <span style={{ display: 'flex', color: iconColor || 'currentColor' }}><I s={21} /></span>
      {label}
    </U2.Press>
  );
}

function SignInScreen({ onAuthed }) {
  const [step, setStep] = uS('providers'); // providers | sent
  const [email, setEmail] = uS('');
  const valid = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim());

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 95, background: 'var(--paper)', display: 'flex', flexDirection: 'column' }}>
      <U2.StatusBar />

      {step === 'providers' ? (
        <div className="noscroll" style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', padding: '0 30px' }}>
          {/* brand + value prop */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', minHeight: 280, paddingTop: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--primary)', marginBottom: 26 }}>
              <Icon.logo s={34} /><span style={{ fontSize: 30, fontWeight: 800, color: 'var(--ink)', letterSpacing: -0.5 }}>friskr</span>
            </div>
            <h1 style={{ margin: '0 0 12px', fontSize: 25, fontWeight: 800, letterSpacing: -0.5, lineHeight: 1.2, maxWidth: 300 }}>Logg inn for å fortsette</h1>
            <p style={{ margin: 0, fontSize: 14.5, color: 'var(--ink-2)', lineHeight: 1.5, maxWidth: 290 }}>Lageret ditt synkroniseres trygt på tvers av enheter og deles med husholdningen din.</p>
          </div>

          {/* providers */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 11, paddingBottom: 6 }}>
            <ProviderBtn icon={Icon.apple} label="Fortsett med Apple" dark onClick={() => onAuthed('Apple')} />
            <ProviderBtn icon={Icon.google} iconColor="initial" label="Fortsett med Google" onClick={() => onAuthed('Google')} />

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '10px 2px' }}>
              <span style={{ flex: 1, height: 1, background: 'var(--line)' }} />
              <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ink-3)' }}>eller med e-post</span>
              <span style={{ flex: 1, height: 1, background: 'var(--line)' }} />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--surface)', border: '1.5px solid var(--line)', borderRadius: 'var(--r-sm)', padding: '4px 16px', boxShadow: 'var(--shadow-sm)' }}>
              <Icon.mail s={19} style={{ color: 'var(--ink-3)' }} />
              <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" inputMode="email" placeholder="din@epost.no"
                onKeyDown={(e) => { if (e.key === 'Enter' && valid) setStep('sent'); }}
                style={{ flex: 1, border: 'none', outline: 'none', background: 'none', fontFamily: 'var(--font)', fontSize: 15, color: 'var(--ink)', padding: '13px 0' }} />
            </div>
            <U2.Btn full icon={Icon.arrowR} onClick={() => valid && setStep('sent')}
              style={{ opacity: valid ? 1 : 0.45, pointerEvents: valid ? 'auto' : 'none' }}>Send innloggingslenke</U2.Btn>
          </div>

          <p style={{ margin: '20px 0 26px', fontSize: 11.5, color: 'var(--ink-3)', textAlign: 'center', lineHeight: 1.5 }}>
            Ved å fortsette godtar du <span style={{ color: 'var(--ink-2)', fontWeight: 600 }}>vilkårene</span> og <span style={{ color: 'var(--ink-2)', fontWeight: 600 }}>personvernerklæringen</span>.
          </p>
        </div>
      ) : (
        /* magic-link sent */
        <div className="noscroll" style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', padding: '0 30px' }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
            <div style={{ width: 78, height: 78, borderRadius: 26, background: 'var(--primary-tint)', color: 'var(--on-primary-tint)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}><Icon.mail s={38} /></div>
            <h1 style={{ margin: '0 0 12px', fontSize: 24, fontWeight: 800, letterSpacing: -0.4 }}>Sjekk e-posten din</h1>
            <p style={{ margin: 0, fontSize: 14.5, color: 'var(--ink-2)', lineHeight: 1.55, maxWidth: 300 }}>
              Vi sendte en innloggingslenke til <span style={{ color: 'var(--ink)', fontWeight: 700 }}>{email.trim()}</span>. Åpne den på denne enheten for å logge inn.
            </p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 11, paddingBottom: 26 }}>
            <U2.Btn full icon={Icon.mail} onClick={() => onAuthed('E-post')}>Åpne e-postappen</U2.Btn>
            <U2.Btn full variant="ghost" onClick={() => setStep('providers')}>Bruk en annen e-post</U2.Btn>
          </div>
        </div>
      )}
      <U2.GestureNav />
    </div>
  );
}

Object.assign(window, { ScanScreen, AddSheet, SettingsScreen, Onboarding, HouseholdScreen, SignInScreen });
