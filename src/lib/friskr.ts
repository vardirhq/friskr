// app/lib/friskr.ts
// ----------------------------------------------------------------------------
// THE DATA LAYER. Every mock value and action from friskr-data.jsx /
// friskr-app.jsx has a real implementation here. Functions return objects in
// the SAME SHAPE the screens already consume, so you replace mock with these
// calls and leave the JSX/RN components essentially untouched.
//
// Mock shape (prototype `items`):
//   { id, pid, loc, qty, off, addedBy, frozen, bestForOff, note, price, product }
// We reproduce it from the `stock_status` view, computing `off` live so
// statusOf()/relLabel() keep working. We ALSO expose real Dates (expiryDate,
// bestForDate) — swap `dateFromOffset(it.off)` for `it.expiryDate` in the UI.
// ----------------------------------------------------------------------------
import { supabase } from './supabase';
import { CATEGORIES, freezerDaysFor, THAW_DAYS } from './reference';
import { parseDate, daysUntil, isoDateInDays } from './dates';
import type { CategoryId, LocationId } from './database.types';

// ── shapes the UI consumes ──────────────────────────────────────────────────
export interface Product {
  id: string;
  name: string;
  brand: string;
  cat: CategoryId;
  shelf: number | null;       // default_shelf_days
  barcode?: string | null;
  householdId?: string | null;
}

export interface StockItem {
  id: string;
  pid: string;                // product_id (prototype `pid`)
  loc: LocationId;            // location_id (prototype `loc`)
  qty: number;
  off: number | null;        // days until expiry, LIVE (prototype `off`)
  expiryDate: Date | null;   // real date — use instead of dateFromOffset(off)
  frozen: boolean;
  bestForOff: number | null; // days until printed best-før (when frozen)
  bestForDate: Date | null;
  note: string | null;
  price: number | null;
  addedBy: string | null;    // member display_name
  status: 'in_stock' | 'used_up' | 'discarded';
  product: Product;          // nested, like the prototype
}

export interface Member {
  name: string; role: string; initial: string; hue: number; userId: string;
}
export interface Household { id: string; name: string; code: string; members: Member[] }

// ── mappers ─────────────────────────────────────────────────────────────────
function mapProductRow(r: any): Product {
  return {
    id: r.id, name: r.name, brand: r.brand ?? '',
    cat: r.category_id, shelf: r.default_shelf_days ?? null,
    barcode: r.barcode ?? null, householdId: r.household_id ?? null,
  };
}

function mapStockRow(r: any): StockItem {
  const expiryDate = parseDate(r.expiry_date);
  const bestForDate = parseDate(r.best_for_date);
  return {
    id: r.id,
    pid: r.product_id,
    loc: r.location_id,
    qty: Number(r.quantity),
    off: daysUntil(expiryDate),
    expiryDate,
    frozen: !!r.frozen,
    bestForOff: daysUntil(bestForDate),
    bestForDate,
    note: r.note ?? null,
    price: r.price_nok != null ? Number(r.price_nok) : null,
    addedBy: r.added_by_name ?? null,   // see listStock select alias below
    status: r.status,
    product: {
      id: r.product_id, name: r.product_name, brand: r.product_brand ?? '',
      cat: r.category_id, shelf: null,
    },
  };
}

// ── STOCK: read ─────────────────────────────────────────────────────────────
// Replaces `DD.STOCK` → `items`. Returns in-stock items for the household,
// already enriched (product, category) and sorted by urgency.
export async function listStock(householdId: string): Promise<StockItem[]> {
  const { data, error } = await supabase
    .from('stock_status')
    .select('*')
    .eq('household_id', householdId)
    .eq('status', 'in_stock')
    .order('days_left', { ascending: true, nullsFirst: false });
  if (error) throw error;

  // `stock_status` doesn't carry the member's display name; resolve added_by.
  const items = (data ?? []).map(mapStockRow);
  await attachAddedByNames(items, householdId);
  return items;
}

// counts for the home dashboard — replaces the `counts` useMemo.
export function countsOf(items: StockItem[]) {
  let fresh = 0, soon = 0, expired = 0;
  for (const i of items) {
    const off = i.off;
    if (off != null && off < 0) expired++;
    else if (off != null && off <= 3) soon++;
    else fresh++;
  }
  return { fresh, soon, expired, total: items.length };
}

// ── STOCK: write (onSave / freeze / thaw) ───────────────────────────────────
export interface SavePayload {
  product: Product;
  qty: number;
  loc: LocationId;
  off: number;                 // chosen days-to-expiry (or best-før days if frozen)
  note?: string | null;
  price?: number | null;
  editId?: string | null;
  frozen?: boolean;
  bestForOff?: number | null;  // printed best-før days, preserved when frozen
  thawed?: boolean;
}

// Resolve the freezer/thaw rule, then insert or update. Mirrors onSave + the
// AddSheet's `resolved` object exactly. NOTE: `p.frozen` is decided by the UI
// from the CHOSEN LOCATION's `freezer` flag (location.freezer), not a hardcoded
// id — so a household's custom "Fryser i garasjen" freezes too. saveStock then:
//   frozen  → expiry_date = today + freezerDaysFor(cat); best_for_date = today+off
//   thawed  → expiry_date = today + THAW_DAYS; best_for_date = null
//   normal  → expiry_date = today + off
export async function saveStock(householdId: string, p: SavePayload): Promise<void> {
  const cat = p.product.cat;
  let expiryISO: string;
  let bestForISO: string | null;
  let frozen: boolean;

  if (p.frozen) {
    frozen = true;
    // preserve an already-frozen horizon on edit; else start a fresh one
    expiryISO = isoDateInDays(p.off != null && p.editId ? p.off : freezerDaysFor(cat));
    bestForISO = isoDateInDays(p.bestForOff ?? p.off);
  } else if (p.thawed) {
    frozen = false;
    expiryISO = isoDateInDays(THAW_DAYS);
    bestForISO = null;
  } else {
    frozen = false;
    expiryISO = isoDateInDays(p.off);
    bestForISO = null;
  }

  const row = {
    household_id: householdId,
    product_id: p.product.id,
    location_id: p.loc,
    quantity: p.qty,
    expiry_date: expiryISO,
    frozen,
    best_for_date: bestForISO,
    note: p.note ?? null,
    price_nok: p.price ?? null,
  };

  if (p.editId) {
    const { error } = await supabase.from('stock_items').update(row).eq('id', p.editId);
    if (error) throw error;
  } else {
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from('stock_items').insert({ ...row, added_by: user?.id });
    if (error) throw error;
  }
}

// onConsume — mark used up. Soft state change (keeps history for the "reddet X
// varer" metric and the digest). Returns the row so the UI can offer Angre.
export async function consumeStock(id: string): Promise<void> {
  const { error } = await supabase
    .from('stock_items')
    .update({ status: 'used_up' })   // resolved_at set by trigger
    .eq('id', id);
  if (error) throw error;
}

// onThrow — mark discarded.
export async function discardStock(id: string): Promise<void> {
  const { error } = await supabase
    .from('stock_items')
    .update({ status: 'discarded' })
    .eq('id', id);
  if (error) throw error;
}

// Angre (undo) — put an item back in stock.
export async function restoreStock(id: string): Promise<void> {
  const { error } = await supabase
    .from('stock_items')
    .update({ status: 'in_stock' })  // trigger clears resolved_at
    .eq('id', id);
  if (error) throw error;
}

// ── "reddet X varer" / wasted metrics — replaces the local saved/savedKr/wasted
// counters with real history (this month). ───────────────────────────────────
export async function householdStats(householdId: string, since: Date) {
  const { data, error } = await supabase
    .from('stock_items')
    .select('status, quantity, price_nok')
    .eq('household_id', householdId)
    .gte('resolved_at', since.toISOString());
  if (error) throw error;
  let saved = 0, savedKr = 0, wasted = 0;
  for (const r of data ?? []) {
    if (r.status === 'used_up') { saved++; if (r.price_nok) savedKr += Number(r.price_nok) * Number(r.quantity); }
    else if (r.status === 'discarded') wasted++;
  }
  return { saved, savedKr, wasted };
}

// ── PRODUCTS (catalogue + household custom) ─────────────────────────────────
// Replaces `DD.PRODUCTS`. Returns catalogue + this household's custom products.
export async function listProducts(householdId: string): Promise<Product[]> {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .or(`household_id.is.null,household_id.eq.${householdId}`)
    .order('name');
  if (error) throw error;
  return (data ?? []).map(mapProductRow);
}

// Create a household-custom product (e.g. after a Foto/scan draft, or "Nytt").
export async function createProduct(
  householdId: string,
  p: { name: string; brand?: string; cat: CategoryId; shelf?: number | null; barcode?: string | null },
): Promise<Product> {
  const { data, error } = await supabase
    .from('products')
    .insert({
      household_id: householdId, name: p.name, brand: p.brand ?? '',
      category_id: p.cat, default_shelf_days: p.shelf ?? null, barcode: p.barcode ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return mapProductRow(data);
}

// ── HOUSEHOLD ───────────────────────────────────────────────────────────────
// Replaces `DD.HOUSEHOLD`. Reads the user's first household + its members.
export async function getHousehold(): Promise<Household | null> {
  const { data: memberships, error: mErr } = await supabase
    .from('household_members')
    .select('household_id, households(name, invite_code)')
    .limit(1);
  if (mErr) throw mErr;
  const m = memberships?.[0] as any;
  if (!m) return null;

  const members = await listMembers(m.household_id);
  return { id: m.household_id, name: m.households.name, code: m.households.invite_code, members };
}

export async function listMembers(householdId: string): Promise<Member[]> {
  const { data, error } = await supabase
    .from('household_members')
    .select('user_id, role, display_name, color_hue')
    .eq('household_id', householdId)
    .order('joined_at');
  if (error) throw error;
  return (data ?? []).map((r: any) => ({
    userId: r.user_id,
    name: r.display_name ?? 'Medlem',
    role: r.role === 'owner' ? 'Eier' : 'Medlem',
    initial: (r.display_name ?? '?').charAt(0).toUpperCase(),
    hue: r.color_hue ?? 145,
  }));
}

// create_household / join_household RPCs (see 0003).
export async function createHousehold(name: string, displayName?: string) {
  const { data, error } = await supabase.rpc('create_household', { p_name: name, p_display_name: displayName });
  if (error) throw error;
  return data;
}
export async function joinHousehold(code: string, displayName?: string) {
  const { data, error } = await supabase.rpc('join_household', { p_code: code, p_display_name: displayName });
  if (error) throw error;
  return data;
}

// Resolve added_by user ids → member display names, in one query.
async function attachAddedByNames(items: StockItem[], householdId: string) {
  const members = await listMembers(householdId);
  const byId = new Map(members.map((m) => [m.userId, m.name]));
  for (const it of items) {
    if (it.addedBy && byId.has(it.addedBy)) it.addedBy = byId.get(it.addedBy)!;
  }
}

// ── NOTIFICATIONS (the bell pop-down) ───────────────────────────────────────
// Builds the same list the HomeScreen derives: expired + soon + recent activity.
export interface Notif {
  id: string; kind: 'expired' | 'soon' | 'activity';
  cat?: CategoryId; by?: string; title: string; body: string; item?: StockItem; unread: boolean;
}
export function buildNotifications(items: StockItem[], selfName = 'Mari'): Notif[] {
  const list: Notif[] = [];
  items.filter((i) => i.off != null && i.off < 0).sort((a, b) => (a.off! - b.off!)).forEach((i) => {
    list.push({ id: 'exp-' + i.id, kind: 'expired', cat: i.product.cat, title: i.product.name, body: 'Gikk ut på dato', item: i, unread: true });
  });
  items.filter((i) => i.off != null && i.off >= 0 && i.off <= 3).sort((a, b) => (a.off! - b.off!)).forEach((i) => {
    list.push({ id: 'soon-' + i.id, kind: 'soon', cat: i.product.cat, title: i.product.name, body: 'Utløper snart', item: i, unread: true });
  });
  items.filter((i) => i.addedBy && i.addedBy !== selfName).slice(0, 3).forEach((i) => {
    list.push({ id: 'act-' + i.id, kind: 'activity', by: i.addedBy!, title: `${i.addedBy} la til ${i.product.name}`, body: '', item: i, unread: false });
  });
  return list;
}

// ── SCAN (barcode + on-device Foto) ─────────────────────────────────────────
// Barcode → product via the scan-lookup edge function (catalogue, then OFF).
export async function scanLookup(barcode: string): Promise<
  | { source: 'catalogue'; product: Product }
  | { source: 'openfoodfacts'; draft: { name: string; brand: string; cat: CategoryId; shelf: number | null; barcode: string } }
  | { source: 'none'; barcode: string }
> {
  const { data, error } = await supabase.functions.invoke('scan-lookup', { body: { barcode } });
  if (error) throw error;
  if (data.source === 'catalogue') return { source: 'catalogue', product: mapProductRow(data.product) };
  if (data.source === 'openfoodfacts') {
    const d = data.draft;
    return { source: 'openfoodfacts', draft: { name: d.name, brand: d.brand, cat: d.category_id, shelf: d.default_shelf_days, barcode: d.barcode } };
  }
  return { source: 'none', barcode };
}
// NOTE: the Foto product-recognition guesses come from the ON-DEVICE model
// (see AI_ON_DEVICE.md). Match its output to catalogue rows via listProducts(),
// or createProduct() to add a confirmed draft. No server call for recognition.

// ── LOCATIONS (defaults + household custom) ─────────────────────────────────
// Replaces the lifted `locations` state. Returns shared defaults (household_id
// null) plus this household's custom locations, ordered. `freezer` drives the
// app's freeze/thaw logic — when a user toggles it, saveStock sees it via the
// chosen location and sets stock_items.frozen accordingly.
export interface StorageLocation {
  id: string; label: string; icon: string; hue: number; freezer: boolean; householdId: string | null;
}
function mapLocationRow(r: any): StorageLocation {
  return { id: r.id, label: r.label, icon: r.icon, hue: r.hue, freezer: !!r.freezer, householdId: r.household_id ?? null };
}
export async function listLocations(householdId: string): Promise<StorageLocation[]> {
  const { data, error } = await supabase
    .from('locations')
    .select('*')
    .or(`household_id.is.null,household_id.eq.${householdId}`)
    .order('sort');
  if (error) throw error;
  return (data ?? []).map(mapLocationRow);
}
// Custom locations only (defaults are seed-managed). `id` must be unique text —
// generate a slug and disambiguate (the prototype does label→slug + numeric suffix).
export async function createLocation(
  householdId: string,
  p: { id: string; label: string; icon: string; freezer: boolean; hue?: number },
): Promise<StorageLocation> {
  const { data, error } = await supabase
    .from('locations')
    .insert({ id: p.id, label: p.label, icon: p.icon, freezer: p.freezer, hue: p.hue ?? (p.freezer ? 205 : 150), household_id: householdId })
    .select().single();
  if (error) throw error;
  return mapLocationRow(data);
}
export async function updateLocation(id: string, patch: Partial<Pick<StorageLocation, 'label' | 'icon' | 'freezer' | 'hue'>>): Promise<void> {
  const { error } = await supabase.from('locations').update(patch).eq('id', id);
  if (error) throw error;
}
// Only deletable when empty — enforce client-side and/or with a FK guard.
export async function deleteLocation(id: string): Promise<void> {
  const { count } = await supabase.from('stock_items').select('id', { count: 'exact', head: true }).eq('location_id', id);
  if ((count ?? 0) > 0) throw new Error('Flytt varene først');
  const { error } = await supabase.from('locations').delete().eq('id', id);
  if (error) throw error;
}

export { CATEGORIES };
