// friskr-data.jsx — sample data + helpers (Norwegian-first)

// "Today" anchor for the prototype so urgency is deterministic.
const TODAY = new Date(2026, 5, 2); // 2. juni 2026

const CATEGORIES = {
  meieri:   { label: 'Meieri',        icon: 'catDairy',   hue: 198 },
  kjott:    { label: 'Kjøtt',         icon: 'catMeat',    hue: 8 },
  fisk:     { label: 'Fisk',          icon: 'catFish',    hue: 210 },
  frukt:    { label: 'Frukt & grønt', icon: 'catProduce', hue: 128 },
  brod:     { label: 'Brød & korn',   icon: 'catBread',   hue: 36 },
  palegg:   { label: 'Pålegg',        icon: 'catSpread',  hue: 22 },
  ferdig:   { label: 'Ferdigmat',     icon: 'catReady',   hue: 280 },
  drikke:   { label: 'Drikke',        icon: 'catDrink',   hue: 250 },
  snacks:   { label: 'Snacks',        icon: 'catSnack',   hue: 48 },
  annet:    { label: 'Annet',         icon: 'catOther',   hue: 160 },
};

const LOCATIONS = {
  kjoleskap: { label: 'Kjøleskap', icon: 'locFridge',  hue: 198 },
  fryser:    { label: 'Fryser',    icon: 'locFreezer', hue: 210 },
  spiskammer:{ label: 'Spiskammer',icon: 'locPantry',  hue: 32 },
};

// catalogue products (default shelf life days)
const PRODUCTS = [
  { id: 'p1',  name: 'Tine Helmelk 1L',        brand: 'Tine',       cat: 'meieri', shelf: 9 },
  { id: 'p2',  name: 'Norvegia skivet',        brand: 'Tine',       cat: 'meieri', shelf: 28 },
  { id: 'p3',  name: 'Kyllingfilet 600g',      brand: 'Prior',      cat: 'kjott',  shelf: 6 },
  { id: 'p4',  name: 'Laksefilet',             brand: 'Salma',      cat: 'fisk',   shelf: 4 },
  { id: 'p5',  name: 'Egg 12-pk',              brand: 'Prior',      cat: 'meieri', shelf: 21 },
  { id: 'p6',  name: 'Bananer',                brand: '',           cat: 'frukt',  shelf: 6 },
  { id: 'p7',  name: 'Grovbrød',               brand: 'Bakehuset',  cat: 'brod',   shelf: 5 },
  { id: 'p8',  name: 'Leverpostei',            brand: 'Stabburet',  cat: 'palegg', shelf: 14 },
  { id: 'p9',  name: 'Pizza Grandiosa',        brand: 'Stabburet',  cat: 'ferdig', shelf: 240 },
  { id: 'p10', name: 'Solo 1,5L',              brand: 'Solo',       cat: 'drikke', shelf: 120 },
  { id: 'p11', name: 'Yoghurt naturell',       brand: 'Tine',       cat: 'meieri', shelf: 16 },
  { id: 'p12', name: 'Kjøttdeig 400g',         brand: 'Gilde',      cat: 'kjott',  shelf: 5 },
  { id: 'p13', name: 'Gulrøtter 1kg',          brand: '',           cat: 'frukt',  shelf: 18 },
  { id: 'p14', name: 'Bremykt',                brand: 'TINE',       cat: 'meieri', shelf: 40 },
  { id: 'p15', name: 'Jarlsberg',              brand: 'Tine',       cat: 'meieri', shelf: 30 },
  { id: 'p16', name: 'Knekkebrød',             brand: 'Wasa',       cat: 'brod',   shelf: 120 },
];

const productById = Object.fromEntries(PRODUCTS.map((p) => [p.id, p]));

// stock entries — offsetDays = days until expiry relative to TODAY (neg = expired)
let _sid = 0;
const sid = () => `s${++_sid}`;
const STOCK = [
  { id: sid(), pid: 'p4',  loc: 'kjoleskap',  qty: 1, off: -1, addedBy: 'Mari' },
  { id: sid(), pid: 'p1',  loc: 'kjoleskap',  qty: 2, off: 1,  addedBy: 'Jonas' },
  { id: sid(), pid: 'p3',  loc: 'kjoleskap',  qty: 1, off: 2,  addedBy: 'Mari' },
  { id: sid(), pid: 'p6',  loc: 'spiskammer', qty: 6, off: 2,  addedBy: 'Jonas' },
  { id: sid(), pid: 'p7',  loc: 'spiskammer', qty: 1, off: 3,  addedBy: 'Mari' },
  { id: sid(), pid: 'p11', loc: 'kjoleskap',  qty: 4, off: 5,  addedBy: 'Mari' },
  { id: sid(), pid: 'p12', loc: 'fryser',     qty: 2, off: 6,  addedBy: 'Jonas' },
  { id: sid(), pid: 'p5',  loc: 'kjoleskap',  qty: 1, off: 9,  addedBy: 'Mari' },
  { id: sid(), pid: 'p8',  loc: 'kjoleskap',  qty: 1, off: 11, addedBy: 'Jonas' },
  { id: sid(), pid: 'p15', loc: 'kjoleskap',  qty: 1, off: 14, addedBy: 'Mari' },
  { id: sid(), pid: 'p13', loc: 'kjoleskap',  qty: 1, off: 16, addedBy: 'Jonas' },
  { id: sid(), pid: 'p2',  loc: 'kjoleskap',  qty: 1, off: 24, addedBy: 'Mari' },
  { id: sid(), pid: 'p14', loc: 'kjoleskap',  qty: 1, off: 33, addedBy: 'Jonas' },
  { id: sid(), pid: 'p10', loc: 'spiskammer', qty: 3, off: 95, addedBy: 'Mari' },
  { id: sid(), pid: 'p9',  loc: 'fryser',     qty: 2, off: 180,addedBy: 'Jonas' },
  { id: sid(), pid: 'p16', loc: 'spiskammer', qty: 1, off: 110,addedBy: 'Mari' },
];

const HOUSEHOLD = {
  name: 'Familien Eikeland',
  code: 'FRISK-7K2P',
  members: [
    { name: 'Mari', role: 'Eier', initial: 'M', hue: 145, device: 'iPhone 15' },
    { name: 'Jonas', role: 'Medlem', initial: 'J', hue: 28, device: 'Pixel 8' },
    { name: 'Selma', role: 'Medlem', initial: 'S', hue: 265, device: 'iPad' },
  ],
};

// Coarse per-category price reference (NOK). Used ONLY to pre-fill the optional
// price field as a hint — never shown as a real savings figure on its own.
const CATEGORY_PRICE = {
  meieri: 25, kjott: 49, fisk: 65, frukt: 22, brod: 34,
  palegg: 32, ferdig: 45, drikke: 28, snacks: 30, annet: 30,
};

const USER = { name: 'Mari', initial: 'M' };

// ── date helpers ────────────────────────────────────────────
const MONTHS_NB = ['jan.', 'feb.', 'mars', 'apr.', 'mai', 'juni', 'juli', 'aug.', 'sep.', 'okt.', 'nov.', 'des.'];
const DAYS_NB = ['søndag', 'mandag', 'tirsdag', 'onsdag', 'torsdag', 'fredag', 'lørdag'];

function dateFromOffset(off) {
  const d = new Date(TODAY);
  d.setDate(d.getDate() + off);
  return d;
}
function fmtNO(d) {
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}.${mm}.${d.getFullYear()}`;
}
function fmtShort(d) {
  return `${d.getDate()}. ${MONTHS_NB[d.getMonth()]}`;
}

// urgency status from offset days
function statusOf(off) {
  if (off < 0) return 'expired';
  if (off <= 3) return 'soon';
  return 'fresh';
}
// human relative label, Norwegian
function relLabel(off) {
  if (off < -1) return `${Math.abs(off)} dager siden`;
  if (off === -1) return 'I går';
  if (off === 0) return 'I dag';
  if (off === 1) return 'I morgen';
  if (off <= 6) return `Om ${off} dager`;
  if (off <= 13) return `Om ${off} dager`;
  const weeks = Math.round(off / 7);
  if (off <= 60) return `Om ${weeks} uke${weeks > 1 ? 'r' : ''}`;
  const months = Math.round(off / 30);
  return `Om ${months} mnd`;
}

const STATUS_META = {
  expired: { label: 'Utløpt',         varc: 'var(--expired)', tint: 'var(--expired-tint)' },
  soon:    { label: 'Utløper snart',  varc: 'var(--soon)',    tint: 'var(--soon-tint)' },
  fresh:   { label: 'Fersk',          varc: 'var(--fresh)',   tint: 'var(--primary-tint)' },
};

window.FriskrData = {
  TODAY, CATEGORIES, LOCATIONS, PRODUCTS, productById, STOCK, HOUSEHOLD, USER, CATEGORY_PRICE,
  MONTHS_NB, DAYS_NB, dateFromOffset, fmtNO, fmtShort, statusOf, relLabel, STATUS_META,
};
