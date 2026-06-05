// friskr-ui.jsx — shared primitives & chrome
const { useState, useEffect, useRef, useCallback } = React;
const D = window.FriskrData;

// ── category tile (colored rounded square with line icon) ──────────
function CatTile({ cat, size = 44, r }) {
  const meta = D.CATEGORIES[cat] || D.CATEGORIES.annet;
  const IconCmp = Icon[meta.icon];
  const radius = r != null ? r : Math.round(size * 0.32);
  return (
    <div style={{
      width: size, height: size, borderRadius: radius, flexShrink: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: `hsl(${meta.hue} 46% 50% / 0.13)`,
      color: `hsl(${meta.hue} 55% 38%)`,
    }}>
      <IconCmp s={Math.round(size * 0.5)} />
    </div>
  );
}

// ── urgency pill ───────────────────────────────────────────────────
function StatusPill({ off, dense }) {
  const st = D.statusOf(off);
  const m = D.STATUS_META[st];
  return (
    <span className="tnum" style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: dense ? '3px 8px' : '4px 10px', borderRadius: 999,
      background: m.tint, color: m.varc,
      fontSize: dense ? 11.5 : 12.5, fontWeight: 600, whiteSpace: 'nowrap',
    }}>
      <span style={{ width: 6, height: 6, borderRadius: 999, background: m.varc }} />
      {D.relLabel(off)}
    </span>
  );
}

// ── freshness ring (donut of fresh / soon / expired) ───────────────
function FreshnessRing({ fresh, soon, expired, size = 132, stroke = 13 }) {
  const total = Math.max(fresh + soon + expired, 1);
  const R = (size - stroke) / 2;
  const C = 2 * Math.PI * R;
  const segs = [
    { v: expired, c: 'var(--expired)' },
    { v: soon, c: 'var(--soon)' },
    { v: fresh, c: 'var(--primary)' },
  ].filter((s) => s.v > 0);
  let acc = 0;
  const gap = segs.length > 1 ? 0.012 * C : 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size / 2} cy={size / 2} r={R} fill="none" stroke="var(--line)" strokeWidth={stroke} opacity="0.5" />
      {segs.map((s, i) => {
        const frac = s.v / total;
        const len = Math.max(frac * C - gap, 0);
        const dash = `${len} ${C - len}`;
        const off = -acc * C;
        acc += frac;
        return (
          <circle key={i} cx={size / 2} cy={size / 2} r={R} fill="none"
            stroke={s.c} strokeWidth={stroke} strokeLinecap="round"
            strokeDasharray={dash} strokeDashoffset={off} />
        );
      })}
    </svg>
  );
}

// ── segmented tabs ─────────────────────────────────────────────────
function Segmented({ tabs, value, onChange }) {
  return (
    <div style={{
      display: 'flex', gap: 4, padding: 4, borderRadius: 999,
      background: 'var(--surface-2)', border: '1px solid var(--line)',
    }}>
      {tabs.map((tb) => {
        const active = tb.key === value;
        return (
          <button key={tb.key} onClick={() => onChange(tb.key)} style={{
            flex: 1, border: 'none', cursor: 'pointer',
            padding: '8px 6px', borderRadius: 999,
            background: active ? 'var(--surface)' : 'transparent',
            color: active ? 'var(--ink)' : 'var(--ink-3)',
            fontFamily: 'var(--font)', fontSize: 13, fontWeight: active ? 700 : 600,
            boxShadow: active ? 'var(--shadow-sm)' : 'none',
            transition: 'all .18s ease', position: 'relative',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}>
            {tb.label}
            {tb.count != null && (
              <span className="tnum" style={{
                fontSize: 11, fontWeight: 700, minWidth: 18, padding: '0 5px', height: 18,
                borderRadius: 999, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                background: active ? (tb.tint || 'var(--primary-tint)') : 'var(--line)',
                color: active ? (tb.color || 'var(--primary)') : 'var(--ink-3)',
              }}>{tb.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ── pressable scale wrapper ────────────────────────────────────────
function Press({ children, onClick, style, className, stop }) {
  return (
    <button className={className} onClick={(e) => { if (stop) e.stopPropagation(); onClick && onClick(e); }}
      style={{
        border: 'none', background: 'none', padding: 0, margin: 0, cursor: 'pointer',
        fontFamily: 'var(--font)', textAlign: 'left', color: 'inherit',
        transition: 'transform .12s ease', ...style,
      }}
      onPointerDown={(e) => { e.currentTarget.style.transform = 'scale(0.97)'; }}
      onPointerUp={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
      onPointerLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}>
      {children}
    </button>
  );
}

// ── primary / ghost buttons ────────────────────────────────────────
function Btn({ children, onClick, variant = 'primary', full, icon: I, style }) {
  const base = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    border: 'none', cursor: 'pointer', fontFamily: 'var(--font)',
    fontWeight: 700, fontSize: 15, padding: '13px 20px', borderRadius: 999,
    width: full ? '100%' : 'auto', transition: 'all .15s ease', whiteSpace: 'nowrap',
  };
  const variants = {
    primary: { background: 'var(--primary)', color: 'var(--on-primary)', boxShadow: '0 8px 20px -8px color-mix(in srgb, var(--primary) 60%, transparent)' },
    ghost: { background: 'var(--surface-2)', color: 'var(--ink)', border: '1px solid var(--line)' },
    soft: { background: 'var(--primary-tint)', color: 'var(--on-primary-tint)' },
    danger: { background: 'var(--expired-tint)', color: 'var(--expired)' },
  };
  return (
    <Press onClick={onClick} style={{ ...base, ...variants[variant], ...style }}>
      {I && <I s={19} />}
      {children}
    </Press>
  );
}

// ── card ───────────────────────────────────────────────────────────
function Card({ children, style, pad = 16, onClick, className }) {
  const s = {
    background: 'var(--surface)', borderRadius: 'var(--r)',
    border: '1px solid var(--line)', boxShadow: 'var(--shadow-sm)',
    padding: pad, ...style,
  };
  if (onClick) return <Press className={className} onClick={onClick} style={{ ...s, display: 'block', width: '100%' }}>{children}</Press>;
  return <div className={className} style={s}>{children}</div>;
}

// ── device frame (theme-matched status bar + gesture nav) ──────────
function StatusBar() {
  const c = 'var(--statusbar-ink)';
  return (
    <div style={{
      height: 40, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 20px 0 22px', position: 'relative', flexShrink: 0, zIndex: 5,
    }}>
      <span className="tnum" style={{ fontSize: 14.5, fontWeight: 700, color: c, letterSpacing: 0.2 }}>9:41</span>
      <div style={{
        position: 'absolute', left: '50%', top: 9, transform: 'translateX(-50%)',
        width: 11, height: 11, borderRadius: 999, background: '#05080620',
        outline: '3px solid rgba(0,0,0,0.78)',
      }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: c }}>
        <Svg s={15}><path d="M2 13c2.5-2.8 5.8-4.5 10-4.5S19.5 10.2 22 13M5 16c1.7-1.8 4-2.8 7-2.8s5.3 1 7 2.8M8.5 19c1-1 2.2-1.5 3.5-1.5s2.5.5 3.5 1.5" /></Svg>
        <svg width="20" height="13" viewBox="0 0 26 13" style={{ display: 'block' }}>
          <rect x="0.5" y="0.5" width="22" height="12" rx="3.2" fill="none" stroke="currentColor" strokeWidth="1.3" opacity="0.5" />
          <rect x="2.2" y="2.2" width="16" height="8.6" rx="1.8" fill="currentColor" />
          <rect x="24" y="4" width="2" height="5" rx="1" fill="currentColor" opacity="0.6" />
        </svg>
      </div>
    </div>
  );
}

function Phone({ children, statusInk }) {
  return (
    <div style={{
      width: 412, height: 892, borderRadius: 46, position: 'relative',
      background: '#05060a', padding: 7,
      boxShadow: '0 0 0 2px #2a2c30, 0 50px 100px -30px rgba(0,0,0,.6), inset 0 0 3px rgba(255,255,255,.2)',
    }}>
      <div style={{
        width: '100%', height: '100%', borderRadius: 39, overflow: 'hidden',
        background: 'var(--paper)', display: 'flex', flexDirection: 'column', position: 'relative',
      }}>
        {children}
      </div>
    </div>
  );
}

function GestureNav({ light }) {
  return (
    <div style={{ height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <div style={{ width: 130, height: 5, borderRadius: 999, background: 'var(--ink)', opacity: 0.22 }} />
    </div>
  );
}

// ── bottom navigation ──────────────────────────────────────────────
const NAV = [
  { key: 'home', label: 'Hjem', icon: 'home' },
  { key: 'stock', label: 'Lager', icon: 'box' },
  { key: 'scan', label: 'Skann', icon: 'scan', center: true },
  { key: 'products', label: 'Produkter', icon: 'leaf' },
  { key: 'settings', label: 'Innstillinger', icon: 'sliders' },
];

function BottomNav({ active, onNav }) {
  return (
    <div style={{ position: 'relative', flexShrink: 0 }}>
      <div style={{
        display: 'flex', alignItems: 'flex-end', justifyContent: 'space-around',
        padding: '8px 12px 6px', background: 'var(--surface)',
        borderTop: '1px solid var(--line)',
      }}>
        {NAV.map((n) => {
          if (n.center) {
            const on = active === 'scan';
            return (
              <Press key={n.key} onClick={() => onNav('scan')} style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                marginTop: -30, flex: 1,
              }}>
                <div style={{
                  width: 60, height: 60, borderRadius: 22,
                  background: 'var(--primary)', color: 'var(--on-primary)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 12px 26px -8px color-mix(in srgb, var(--primary) 70%, transparent)',
                  border: '4px solid var(--surface)',
                }}>
                  <Icon.scan s={28} sw={2} />
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, color: on ? 'var(--primary)' : 'var(--ink-3)' }}>{n.label}</span>
              </Press>
            );
          }
          const on = active === n.key;
          const IconCmp = Icon[n.icon];
          return (
            <Press key={n.key} onClick={() => onNav(n.key)} style={{
              flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '4px 0',
            }}>
              <IconCmp s={23} sw={on ? 2 : 1.7} style={{ color: on ? 'var(--primary)' : 'var(--ink-3)' }} />
              <span style={{ fontSize: 11, fontWeight: on ? 700 : 600, color: on ? 'var(--primary)' : 'var(--ink-3)' }}>{n.label}</span>
            </Press>
          );
        })}
      </div>
    </div>
  );
}

// ── bottom sheet ───────────────────────────────────────────────────
function Sheet({ open, onClose, children, title, maxH = 760 }) {
  if (!open) return null;
  return (
    <div onClick={onClose} style={{
      position: 'absolute', inset: 0, zIndex: 40,
      background: 'rgba(8,14,10,0.42)', backdropFilter: 'blur(2px)',
      display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
      animation: 'friskr-fade .2s ease',
    }}>
      <div onClick={(e) => e.stopPropagation()} className="noscroll" style={{
        background: 'var(--surface)', borderTopLeftRadius: 30, borderTopRightRadius: 30,
        boxShadow: 'var(--shadow-lg)', maxHeight: maxH, overflow: 'auto',
        animation: 'friskr-sheet .32s cubic-bezier(.22,1,.36,1)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}>
        <div style={{ position: 'sticky', top: 0, background: 'var(--surface)', zIndex: 2, paddingTop: 10 }}>
          <div style={{ width: 42, height: 5, borderRadius: 999, background: 'var(--line)', margin: '0 auto' }} />
          {title && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px 12px' }}>
              <h3 style={{ margin: 0, fontSize: 19, fontWeight: 800, color: 'var(--ink)' }}>{title}</h3>
              <Press onClick={onClose} style={{ width: 34, height: 34, borderRadius: 999, background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink-2)' }}>
                <Icon.x s={18} />
              </Press>
            </div>
          )}
        </div>
        <div style={{ padding: '0 20px 24px' }}>{children}</div>
      </div>
    </div>
  );
}

// ── toast ──────────────────────────────────────────────────────────
function Toast({ toast }) {
  if (!toast) return null;
  return (
    <div style={{
      position: 'absolute', left: 16, right: 16, bottom: 96, zIndex: 60,
      display: 'flex', justifyContent: 'center', pointerEvents: 'none',
    }}>
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: 10,
        background: 'var(--ink)', color: 'var(--paper)',
        padding: '12px 18px', borderRadius: 999, boxShadow: 'var(--shadow-md)',
        fontSize: 14, fontWeight: 600, animation: 'friskr-rise .26s ease',
        pointerEvents: toast.action ? 'auto' : 'none',
      }}>
        {toast.icon === 'check' && <span style={{ color: 'var(--primary)', display: 'flex' }}><Icon.checkCircle s={19} /></span>}
        {toast.icon === 'trash' && <span style={{ color: 'var(--expired)', display: 'flex' }}><Icon.trash s={18} /></span>}
        {toast.icon === 'cart' && <span style={{ display: 'flex' }}><Icon.cart s={19} /></span>}
        {toast.msg}
        {toast.action && (
          <button onClick={toast.action.onAction} style={{ marginLeft: 4, padding: '2px 6px', background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 800, fontSize: 14, fontFamily: 'inherit', cursor: 'pointer' }}>{toast.action.label}</button>
        )}
      </div>
    </div>
  );
}

// ── confetti burst ─────────────────────────────────────────────────
function Confetti({ fire }) {
  if (!fire) return null;
  const colors = ['var(--primary)', 'var(--soon)', '#7bc98f', '#e8b04f', 'var(--on-primary-tint)'];
  const bits = Array.from({ length: 22 }, (_, i) => {
    const ang = (Math.PI * 2 * i) / 22 + Math.random();
    const dist = 70 + Math.random() * 90;
    return {
      cx: Math.cos(ang) * dist, cy: Math.sin(ang) * dist - 30,
      cr: (Math.random() * 720 - 360) + 'deg',
      c: colors[i % colors.length], d: Math.random() * 0.1,
      w: 6 + Math.random() * 5, h: 8 + Math.random() * 8,
    };
  });
  return (
    <div style={{ position: 'absolute', left: '50%', top: '42%', zIndex: 70, pointerEvents: 'none' }}>
      {bits.map((b, i) => (
        <span key={i} style={{
          position: 'absolute', width: b.w, height: b.h, background: b.c, borderRadius: 2,
          '--cx': b.cx + 'px', '--cy': b.cy + 'px', '--cr': b.cr,
          animation: `friskr-confetti .9s cubic-bezier(.2,.7,.3,1) ${b.d}s forwards`,
        }} />
      ))}
    </div>
  );
}

window.UI = {
  CatTile, StatusPill, FreshnessRing, Segmented, Press, Btn, Card,
  Phone, StatusBar, GestureNav, BottomNav, Sheet, Toast, Confetti, NAV,
};
