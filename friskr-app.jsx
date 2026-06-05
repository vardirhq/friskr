// friskr-app.jsx — state, routing, tweaks, scaling, mount
const { useState: aS, useEffect: aE, useMemo: aM, useCallback: aC, useRef: aR } = React;
const DD = window.FriskrData;
const UU = window.UI;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "primary": "#15a05a",
  "dark": false,
  "density": "regular",
  "roundness": "soft"
}/*EDITMODE-END*/;

const ROUND_MAP = {
  sharp:  { r: '12px', rsm: '9px',  rlg: '16px' },
  soft:   { r: '22px', rsm: '14px', rlg: '30px' },
  pill:   { r: '28px', rsm: '18px', rlg: '36px' },
};
const DENSITY_MAP = {
  compact: { rowPad: '10px', gap: '10px' },
  regular: { rowPad: '14px', gap: '14px' },
  comfy:   { rowPad: '18px', gap: '18px' },
};

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [screen, setScreen] = aS('home');
  const [stockTab, setStockTab] = aS('soon');
  const [stock, setStock] = aS(DD.STOCK);
  const [add, setAdd] = aS({ open: false, product: null, initOff: null });
  const [toast, setToastState] = aS(null);
  const [confetti, setConfetti] = aS(false);
  const [onboard, setOnboard] = aS(false);
  const [household, setHousehold] = aS(false);
  const [authed, setAuthed] = aS(() => { try { return localStorage.getItem('friskr_authed') === '1'; } catch (e) { return false; } });
  const signIn = aC((provider) => { try { localStorage.setItem('friskr_authed', '1'); } catch (e) {} setAuthed(true); toastFn(`Logget inn med ${provider}`, 'check'); }, []);
  const signOut = aC(() => { try { localStorage.removeItem('friskr_authed'); } catch (e) {} setAuthed(false); setHousehold(false); setScreen('home'); }, []);
  const [push, setPush] = aS(true);
  const [days, setDays] = aS(3);
  const [saved, setSaved] = aS(14);
  const [savedKr, setSavedKr] = aS(0);
  const [wasted, setWasted] = aS(0);
  const toastTimer = aR(null);
  const confTimer = aR(null);

  const dark = !!t.dark;

  // apply theme + tokens
  aE(() => {
    const root = document.documentElement;
    root.classList.toggle('theme-dark', dark);
    document.body.classList.toggle('bg-dark', dark);
    root.style.setProperty('--primary', t.primary || '#15a05a');
    const rm = ROUND_MAP[t.roundness] || ROUND_MAP.soft;
    root.style.setProperty('--r', rm.r);
    root.style.setProperty('--r-sm', rm.rsm);
    root.style.setProperty('--r-lg', rm.rlg);
    const dm = DENSITY_MAP[t.density] || DENSITY_MAP.regular;
    root.style.setProperty('--row-pad', dm.rowPad);
    root.style.setProperty('--gap', dm.gap);
  }, [dark, t.primary, t.roundness, t.density]);

  const setDark = (v) => setTweak('dark', v);

  // toast helper — optional `action` shows a tappable button (e.g. Angre) and
  // keeps the toast up longer so it can be acted on.
  const toastFn = aC((msg, icon, action) => {
    clearTimeout(toastTimer.current);
    setToastState({ msg, icon, action });
    toastTimer.current = setTimeout(() => setToastState(null), action ? 4400 : 2200);
  }, []);

  // derived items
  const items = aM(() => stock.map((e) => ({ ...e, product: DD.productById[e.pid] })), [stock]);
  const counts = aM(() => {
    let fresh = 0, soon = 0, expired = 0, total = 0;
    items.forEach((i) => {
      total += 1;
      const st = DD.statusOf(i.off);
      if (st === 'expired') expired += 1; else if (st === 'soon') soon += 1; else fresh += 1;
    });
    return { fresh, soon, expired, total };
  }, [items]);

  const openAdd = aC((product = null, opts = {}) => setAdd({ open: true, product, initOff: opts.off ?? null }), []);
  const closeAdd = aC(() => setAdd({ open: false, product: null, initOff: null }), []);

  const onConsume = aC((it) => {
    let removed = null;
    setStock((s) => { removed = s.find((e) => e.id === it.id); return s.filter((e) => e.id !== it.id); });
    setSaved((n) => n + 1);
    if (it.price) setSavedKr((n) => n + Number(it.price) * (it.qty || 1));
    setConfetti(true);
    clearTimeout(confTimer.current);
    confTimer.current = setTimeout(() => setConfetti(false), 950);
    toastFn(`${it.product.name} brukt opp 🎉`, 'check', {
      label: 'Angre',
      onAction: () => {
        setSaved((n) => Math.max(0, n - 1));
        if (it.price) setSavedKr((n) => Math.max(0, n - Number(it.price) * (it.qty || 1)));
        if (removed) setStock((s) => [...s, removed]);
        clearTimeout(toastTimer.current);
        setToastState(null);
      },
    });
  }, [toastFn]);

  const onThrow = aC((it) => {
    let removed = null;
    setStock((s) => { removed = s.find((e) => e.id === it.id); return s.filter((e) => e.id !== it.id); });
    setWasted((n) => n + 1);
    toastFn(`${it.product.name} kastet`, 'trash', {
      label: 'Angre',
      onAction: () => {
        setWasted((n) => Math.max(0, n - 1));
        if (removed) setStock((s) => [...s, removed]);
        clearTimeout(toastTimer.current);
        setToastState(null);
      },
    });
  }, [toastFn]);

  const onSave = aC(({ product, qty, loc, off, note, price, editId }) => {
    if (editId) {
      setStock((s) => s.map((e) => (e.id === editId ? { ...e, pid: product.id, loc, qty, off, note, price } : e)));
      closeAdd();
      toastFn(`${product.name} oppdatert`, 'check');
      return;
    }
    const nid = 'n' + Date.now();
    setStock((s) => [...s, { id: nid, pid: product.id, loc, qty, off, note, price, addedBy: 'Mari' }]);
    closeAdd();
    toastFn(`${product.name} lagt til`, 'check');
  }, [closeAdd, toastFn]);

  const openList = aC((which) => {
    setStockTab(which === 'fresh' ? 'all' : which);
    setScreen('stock');
  }, []);

  const onNav = aC((k) => setScreen(k), []);

  const ctx = {
    items, counts, onNav, openAdd, openList, toast: toastFn,
    onConsume, onThrow, saved, savedKr, wasted, tab: stockTab, setTab: setStockTab, dense: t.density === 'compact',
    dark, setDark, push, setPush, days, setDays,
    onShowOnboarding: () => setOnboard(true),
    onShowHousehold: () => setHousehold(true),
    onSignOut: signOut,
  };

  const screens = {
    home: HomeScreen, stock: StockScreen, scan: ScanScreen,
    products: ProductsScreen, settings: SettingsScreen,
  };
  const ScreenCmp = screens[screen] || HomeScreen;
  const isScan = screen === 'scan';

  return (
    <>
      <UU.Phone>
        <div style={{ background: isScan ? '#0a0d0b' : 'var(--paper)', flexShrink: 0 }}>
          <UU.StatusBar />
        </div>
        <div className="noscroll" key={screen} style={{ flex: 1, overflow: 'auto', background: isScan ? '#0a0d0b' : 'var(--paper)', position: 'relative' }}>
          <ScreenCmp ctx={ctx} key={screen} />
        </div>
        <UU.BottomNav active={screen} onNav={onNav} />
        <div style={{ background: 'var(--surface)' }}><UU.GestureNav /></div>

        <UU.Toast toast={toast} />
        <UU.Confetti fire={confetti} />
        <AddSheet open={add.open} onClose={closeAdd} product={add.product} initOff={add.initOff} onSave={onSave} />
        {onboard && <Onboarding onDone={() => setOnboard(false)} />}
        {household && <HouseholdScreen onClose={() => setHousehold(false)} toast={toastFn} />}
        {!authed && <SignInScreen onAuthed={signIn} />}
      </UU.Phone>

      <TweaksPanel>
        <TweakSection label="Merkevare" />
        <TweakColor label="Aksentfarge" value={t.primary}
          options={['#15a05a', '#0e9488', '#3b82c4', '#c2410c', '#7c5cd6', '#d4842a']}
          onChange={(v) => setTweak('primary', v)} />
        <TweakToggle label="Mørk modus" value={!!t.dark} onChange={(v) => setTweak('dark', v)} />
        <TweakSection label="Form & tetthet" />
        <TweakRadio label="Hjørner" value={t.roundness}
          options={['sharp', 'soft', 'pill']}
          onChange={(v) => setTweak('roundness', v)} />
        <TweakRadio label="Tetthet" value={t.density}
          options={['compact', 'regular', 'comfy']}
          onChange={(v) => setTweak('density', v)} />
        <TweakSection label="Demo" />
        <TweakButton label="Vis onboarding" onClick={() => setOnboard(true)}>Start</TweakButton>
      </TweaksPanel>
    </>
  );
}

// ── responsive scaling of the phone to fit viewport ───────────────
function fitScale() {
  const scaler = document.getElementById('scaler');
  if (!scaler) return;
  const margin = 48;
  const w = 412, h = 892;
  const sx = (window.innerWidth - margin) / w;
  const sy = (window.innerHeight - margin) / h;
  const scale = Math.min(sx, sy, 1.18);
  scaler.style.transform = `scale(${scale})`;
}
window.addEventListener('resize', fitScale);

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
setTimeout(fitScale, 60);
