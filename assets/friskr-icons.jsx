// friskr-icons.jsx — stroke-based icon set (24px grid, currentColor)
// All icons share a 24x24 viewBox, 1.7 stroke, round caps/joins.

function Svg({ children, s = 22, fill = 'none', sw = 1.7, ...rest }) {
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill={fill}
      stroke={fill === 'none' ? 'currentColor' : 'none'}
      strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round"
      style={{ display: 'block', flexShrink: 0 }} {...rest}>
      {children}
    </svg>
  );
}

const Icon = {
  home: (p) => <Svg {...p}><path d="M3.5 11.5 12 4l8.5 7.5" /><path d="M5.5 10v9.5h13V10" /><path d="M9.5 19.5v-5h5v5" /></Svg>,
  box: (p) => <Svg {...p}><path d="M3.5 7.5 12 3l8.5 4.5v9L12 21l-8.5-4.5z" /><path d="M3.5 7.5 12 12l8.5-4.5" /><path d="M12 12v9" /></Svg>,
  scan: (p) => <Svg {...p}><path d="M4 8V6.5A2.5 2.5 0 0 1 6.5 4H8" /><path d="M16 4h1.5A2.5 2.5 0 0 1 20 6.5V8" /><path d="M20 16v1.5a2.5 2.5 0 0 1-2.5 2.5H16" /><path d="M8 20H6.5A2.5 2.5 0 0 1 4 17.5V16" /><path d="M7.5 12h9" /></Svg>,
  leaf: (p) => <Svg {...p}><path d="M5 19c0-7 4-12 14-13 0 0 1 11-7 13-3.5.9-7 0-7 0z" /><path d="M9 15c2-3 4.5-5 7.5-6" /></Svg>,
  sliders: (p) => <Svg {...p}><path d="M5 8h9" /><path d="M18 8h1" /><circle cx="16" cy="8" r="2" /><path d="M5 16h1" /><path d="M10 16h9" /><circle cx="8" cy="16" r="2" /></Svg>,
  bell: (p) => <Svg {...p}><path d="M6 9a6 6 0 0 1 12 0c0 5 1.5 6.5 1.5 6.5h-15S6 14 6 9Z" /><path d="M10 19a2 2 0 0 0 4 0" /></Svg>,
  cal: (p) => <Svg {...p}><rect x="4" y="5.5" width="16" height="15" rx="3" /><path d="M4 10h16" /><path d="M8 3.5v3M16 3.5v3" /></Svg>,
  plus: (p) => <Svg {...p}><path d="M12 5v14M5 12h14" /></Svg>,
  minus: (p) => <Svg {...p}><path d="M5 12h14" /></Svg>,
  search: (p) => <Svg {...p}><circle cx="11" cy="11" r="6.5" /><path d="m20 20-3.5-3.5" /></Svg>,
  chevR: (p) => <Svg {...p}><path d="m9 5 7 7-7 7" /></Svg>,
  chevL: (p) => <Svg {...p}><path d="m15 5-7 7 7 7" /></Svg>,
  chevD: (p) => <Svg {...p}><path d="m5 9 7 7 7-7" /></Svg>,
  check: (p) => <Svg {...p}><path d="m5 12.5 4.5 4.5L19 6.5" /></Svg>,
  checkCircle: (p) => <Svg {...p}><circle cx="12" cy="12" r="8.5" /><path d="m8.5 12 2.5 2.5 4.5-5" /></Svg>,
  x: (p) => <Svg {...p}><path d="M6 6l12 12M18 6 6 18" /></Svg>,
  trash: (p) => <Svg {...p}><path d="M5 7h14" /><path d="M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7" /><path d="M7 7l.8 11a2 2 0 0 0 2 1.9h4.4a2 2 0 0 0 2-1.9L17 7" /></Svg>,
  pencil: (p) => <Svg {...p}><path d="M14.5 5.5 18.5 9.5 8 20H4v-4z" /><path d="m13 7 4 4" /></Svg>,
  flash: (p) => <Svg {...p}><path d="M13 3 5 13h6l-1 8 8-10h-6z" /></Svg>,
  flashOff: (p) => <Svg {...p}><path d="M13 3 8 9.2M11 13H5l3-3.8M10 21l1-8" /><path d="M4 4l16 16" /></Svg>,
  image: (p) => <Svg {...p}><rect x="4" y="5" width="16" height="14" rx="3" /><circle cx="9" cy="10" r="1.6" /><path d="m5 17 4.5-4 3 2.5L16 11l3 4" /></Svg>,
  users: (p) => <Svg {...p}><circle cx="9" cy="8" r="3" /><path d="M3.5 19c.5-3 2.8-4.5 5.5-4.5S14 16 14.5 19" /><path d="M16 5.5a3 3 0 0 1 0 5.5" /><path d="M17 14.6c2 .6 3.3 2 3.5 4.4" /></Svg>,
  globe: (p) => <Svg {...p}><circle cx="12" cy="12" r="8.5" /><path d="M3.5 12h17" /><path d="M12 3.5c2.5 2.4 2.5 14.6 0 17M12 3.5c-2.5 2.4-2.5 14.6 0 17" /></Svg>,
  moon: (p) => <Svg {...p}><path d="M20 13.5A8 8 0 1 1 10.5 4 6.5 6.5 0 0 0 20 13.5Z" /></Svg>,
  cart: (p) => <Svg {...p}><path d="M3 4h2l2 11h10l2-7H6.5" /><circle cx="9" cy="19" r="1.4" /><circle cx="16" cy="19" r="1.4" /></Svg>,
  spark: (p) => <Svg {...p}><path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18" /></Svg>,
  trend: (p) => <Svg {...p}><path d="M4 16l4.5-5 3 3L20 6" /><path d="M15 6h5v5" /></Svg>,
  bolt: (p) => <Svg {...p}><path d="M13 3 5 13h6l-1 8 8-10h-6z" /></Svg>,
  filter: (p) => <Svg {...p}><path d="M4 6h16M7 12h10M10 18h4" /></Svg>,
  clock: (p) => <Svg {...p}><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></Svg>,
  arrowR: (p) => <Svg {...p}><path d="M4 12h15M13 6l6 6-6 6" /></Svg>,
  qr: (p) => <Svg {...p}><rect x="4" y="4" width="6" height="6" rx="1.2" /><rect x="14" y="4" width="6" height="6" rx="1.2" /><rect x="4" y="14" width="6" height="6" rx="1.2" /><path d="M14 14h2v2M20 14v6h-6M18 18h2" /></Svg>,
  dots: (p) => <Svg {...p}><circle cx="6" cy="12" r="1.3" /><circle cx="12" cy="12" r="1.3" /><circle cx="18" cy="12" r="1.3" /></Svg>,
  logo: (p) => <Svg {...p} fill="currentColor" sw={0}><path d="M6 21c-.5-7 3.2-12.5 12.5-13.5.6-.06 1 .5.8 1.05C16.8 15 12.4 18.2 7.6 18.2c1.1-3.2 3.3-5.6 6.4-7-3.5 1-6 3.4-7.4 7.2" /></Svg>,

  // category icons
  catDairy: (p) => <Svg {...p}><path d="M8 3h8l-1 3v2.5l1.5 2.5V20a1 1 0 0 1-1 1H8.5a1 1 0 0 1-1-1v-9l1.5-2.5V6z" /><path d="M9 12.5h6" /></Svg>,
  catMeat: (p) => <Svg {...p}><path d="M14 4c3.5 0 6 2.5 6 6 0 3-2 5-4.5 5.5l-5.5 4c-2 1.5-5-1.5-3.5-3.5l4-5.5C11 8 11 4 14 4Z" /><circle cx="15" cy="9" r="1.3" /></Svg>,
  catFish: (p) => <Svg {...p}><path d="M3 12c3-4 8-5 12-4 2 .5 4 2 6 4-2 2-4 3.5-6 4-4 1-9 0-12-4Z" /><path d="M15 8.5 18 6M15 15.5 18 18" /><circle cx="7.5" cy="11.5" r="0.8" fill="currentColor" stroke="none" /></Svg>,
  catProduce: (p) => <Svg {...p}><circle cx="11" cy="14" r="6" /><path d="M12 8c0-2 1-4 4-4-.2 2.2-1.3 3.6-3 4" /></Svg>,
  catBread: (p) => <Svg {...p}><path d="M5 10a4 4 0 0 1 4-4h6a4 4 0 0 1 0 8v4a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1z" /><path d="M9 10v8M13 10v8" /></Svg>,
  catSpread: (p) => <Svg {...p}><rect x="4" y="9" width="16" height="9" rx="2" /><path d="M4 12h16" /><path d="M8 9V7a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></Svg>,
  catReady: (p) => <Svg {...p}><circle cx="12" cy="12" r="8.5" /><circle cx="12" cy="12" r="3" /></Svg>,
  catDrink: (p) => <Svg {...p}><path d="M7 4h10l-1 15a2 2 0 0 1-2 1.8H10A2 2 0 0 1 8 19z" /><path d="M7.5 9h9" /></Svg>,
  catSnack: (p) => <Svg {...p}><path d="M5 8h14l-1.5 11.5a1 1 0 0 1-1 .9H7.5a1 1 0 0 1-1-.9z" /><path d="M5 8l2-3.5h10L19 8" /></Svg>,
  catOther: (p) => <Svg {...p}><rect x="4.5" y="4.5" width="15" height="15" rx="3.5" /><path d="M12 9v.01M12 12v3" /></Svg>,

  // location icons
  locFridge: (p) => <Svg {...p}><rect x="6" y="3" width="12" height="18" rx="2.5" /><path d="M6 10h12" /><path d="M9 6.5v1.5M9 13v2" /></Svg>,
  locFreezer: (p) => <Svg {...p}><path d="M12 3v18M5 7l14 10M19 7 5 17" /><path d="M12 6.5 9.5 8M12 6.5 14.5 8M12 17.5 9.5 16M12 17.5l2.5 1.5M6.5 10l.3 2.8M17.5 10l-.3 2.8" /></Svg>,
  locPantry: (p) => <Svg {...p}><rect x="4.5" y="4" width="15" height="16" rx="2" /><path d="M4.5 9.5h15M4.5 14.5h15" /><path d="M9 6.6v.6M9 12v.6M9 17v.6" /></Svg>,
  tag: (p) => <Svg {...p}><path d="M4 12.5V5.5A1.5 1.5 0 0 1 5.5 4h7l7.5 7.5a1.5 1.5 0 0 1 0 2.1l-5.4 5.4a1.5 1.5 0 0 1-2.1 0z" /><circle cx="8.5" cy="8.5" r="1.2" /></Svg>,
  copy: (p) => <Svg {...p}><rect x="8" y="8" width="12" height="12" rx="2.5" /><path d="M16 8V5.5A1.5 1.5 0 0 0 14.5 4h-9A1.5 1.5 0 0 0 4 5.5v9A1.5 1.5 0 0 0 5.5 16H8" /></Svg>,
  link: (p) => <Svg {...p}><path d="M10 14a3.5 3.5 0 0 0 5 0l3-3a3.5 3.5 0 0 0-5-5l-1.5 1.5" /><path d="M14 10a3.5 3.5 0 0 0-5 0l-3 3a3.5 3.5 0 0 0 5 5l1.5-1.5" /></Svg>,
  key: (p) => <Svg {...p}><circle cx="8" cy="8" r="4" /><path d="m11 11 7 7M16 16l2-2M14 18l2-2" /></Svg>,
  phone: (p) => <Svg {...p}><rect x="6.5" y="3" width="11" height="18" rx="2.5" /><path d="M10.5 18.5h3" /></Svg>,
  logout: (p) => <Svg {...p}><path d="M14 5.5h-7A1.5 1.5 0 0 0 5.5 7v10A1.5 1.5 0 0 0 7 18.5h7" /><path d="M14 12H20M17.5 9l2.5 3-2.5 3" /></Svg>,
  mail: (p) => <Svg {...p}><rect x="3.5" y="5.5" width="17" height="13" rx="2.5" /><path d="m4.5 7 7.5 6 7.5-6" /></Svg>,
  apple: (p) => <Svg {...p} fill="currentColor" sw={0}><path d="M16.5 12.6c0-1.9 1.5-2.8 1.6-2.9-.9-1.3-2.2-1.5-2.7-1.5-1.1-.1-2.2.7-2.8.7-.6 0-1.5-.6-2.4-.6-1.2 0-2.4.7-3 1.8-1.3 2.3-.3 5.6.9 7.5.6.9 1.3 1.9 2.3 1.8.9 0 1.3-.6 2.4-.6s1.4.6 2.4.6 1.6-.9 2.2-1.7c.5-.7.7-1.4.9-2.1-.1 0-1.7-.6-1.7-2.5Z" /><path d="M14.6 6.2c.5-.6.8-1.5.7-2.4-.7.05-1.6.5-2.1 1.1-.5.5-.9 1.4-.8 2.2.8.06 1.6-.4 2.2-1Z" /></Svg>,
  google: (p) => <Svg {...p} fill="none" sw={0}><path d="M21.4 12.2c0-.7-.06-1.3-.18-1.9H12v3.7h5.3c-.23 1.2-.9 2.3-1.95 3v2.4h3.1c1.8-1.7 2.85-4.1 2.85-7.2Z" fill="#4285F4"/><path d="M12 21.5c2.6 0 4.8-.86 6.4-2.3l-3.1-2.4c-.86.58-1.96.92-3.3.92-2.5 0-4.7-1.7-5.45-4H3.3v2.5C4.9 19.4 8.2 21.5 12 21.5Z" fill="#34A853"/><path d="M6.55 13.7c-.2-.58-.3-1.2-.3-1.85s.1-1.27.3-1.85V7.5H3.3C2.66 8.8 2.3 10.35 2.3 12s.36 3.2 1 4.5l3.25-2.8Z" fill="#FBBC05"/><path d="M12 6.4c1.4 0 2.67.48 3.66 1.43l2.74-2.74C16.8 3.5 14.6 2.5 12 2.5 8.2 2.5 4.9 4.6 3.3 7.5l3.25 2.5C7.3 7.6 9.5 6.4 12 6.4Z" fill="#EA4335"/></Svg>,
};

window.Icon = Icon;
window.Svg = Svg;
