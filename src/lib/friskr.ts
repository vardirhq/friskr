import { api } from './api';
import { CATEGORIES, freezerDaysFor, THAW_DAYS } from './reference';
import { parseDate, daysUntil, isoDateInDays } from './dates';
import type { CategoryId, LocationId } from './database.types';

export interface Product {
  id: string; name: string; brand: string; cat: CategoryId;
  shelf: number | null; barcode?: string | null; householdId?: string | null;
}

export interface StockItem {
  id: string; pid: string; loc: LocationId; qty: number;
  off: number | null; expiryDate: Date | null;
  frozen: boolean; bestForOff: number | null; bestForDate: Date | null;
  note: string | null; price: number | null; addedBy: string | null;
  status: 'in_stock' | 'used_up' | 'discarded'; product: Product;
}

export interface Member {
  name: string; role: string; initial: string; hue: number; userId: string;
}
export interface Household { id: string; name: string; code: string; members: Member[] }

function mapStockRow(r: Record<string, unknown>): StockItem {
  const expiryDate = parseDate(r.expiryDate as string | null);
  const bestForDate = parseDate(r.bestForDate as string | null);
  return {
    id: r.id as string, pid: r.pid as string, loc: r.loc as LocationId,
    qty: Number(r.qty), off: r.off as number | null, expiryDate,
    frozen: !!r.frozen,
    bestForOff: daysUntil(bestForDate),
    bestForDate,
    note: (r.note as string) ?? null, price: r.price as number | null,
    addedBy: (r.addedBy as string) ?? null, status: r.status as StockItem['status'],
    product: r.product as Product,
  };
}

export async function listStock(_householdId: string): Promise<StockItem[]> {
  const rows = await api.get<Record<string, unknown>[]>('/api/stock');
  return rows.map(mapStockRow);
}

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

export interface SavePayload {
  product: Product; qty: number; loc: LocationId; off: number;
  note?: string | null; price?: number | null; editId?: string | null;
  frozen?: boolean; bestForOff?: number | null; thawed?: boolean;
}

export async function saveStock(_householdId: string, p: SavePayload): Promise<void> {
  const cat = p.product.cat;
  let expiryDate: string;
  let bestForDate: string | null;
  let frozen: boolean;

  if (p.frozen) {
    frozen = true;
    expiryDate = isoDateInDays(p.off != null && p.editId ? p.off : freezerDaysFor(cat));
    bestForDate = isoDateInDays(p.bestForOff ?? p.off);
  } else if (p.thawed) {
    frozen = false;
    expiryDate = isoDateInDays(THAW_DAYS);
    bestForDate = null;
  } else {
    frozen = false;
    expiryDate = isoDateInDays(p.off);
    bestForDate = null;
  }

  const body = {
    productId: p.product.id, locationId: p.loc, quantity: p.qty,
    expiryDate, frozen, bestForDate,
    note: p.note ?? null, priceNok: p.price ?? null,
  };

  if (p.editId) {
    await api.put(`/api/stock/${p.editId}`, body);
  } else {
    await api.post('/api/stock', body);
  }
}

export async function consumeStock(id: string): Promise<void> {
  await api.patch(`/api/stock/${id}/consume`);
}
export async function discardStock(id: string): Promise<void> {
  await api.patch(`/api/stock/${id}/discard`);
}
export async function restoreStock(id: string): Promise<void> {
  await api.patch(`/api/stock/${id}/restore`);
}

export async function householdStats(_householdId: string, since: Date) {
  return api.get<{ saved: number; savedKr: number; wasted: number }>(
    `/api/stock/stats?since=${since.toISOString()}`
  );
}

export async function listProducts(_householdId: string): Promise<Product[]> {
  return api.get<Product[]>('/api/products');
}

export async function createProduct(
  _householdId: string,
  p: { name: string; brand?: string; cat: CategoryId; shelf?: number | null; barcode?: string | null },
): Promise<Product> {
  return api.post<Product>('/api/products', p);
}

export async function getHousehold(): Promise<Household | null> {
  try {
    return await api.get<Household>('/api/household');
  } catch (err: unknown) {
    if ((err as { code?: string }).code === 'NOT_FOUND') return null;
    throw err;
  }
}

export async function listMembers(_householdId: string): Promise<Member[]> {
  return api.get<Member[]>('/api/household/members');
}

export async function createHousehold(name: string, displayName?: string) {
  const { setTokens } = await import('./api');
  const data = await api.post<{ jwt: string; household: Household }>(
    '/api/household', { name, displayName }
  );
  const refresh = localStorage.getItem('friskr_refresh') ?? '';
  setTokens(data.jwt, refresh);
  return data.household;
}

export async function joinHousehold(code: string, displayName?: string) {
  const { setTokens } = await import('./api');
  const data = await api.post<{ jwt: string; household: Household }>(
    '/api/household/join', { code, displayName }
  );
  const refresh = localStorage.getItem('friskr_refresh') ?? '';
  setTokens(data.jwt, refresh);
  return data.household;
}

export interface StorageLocation {
  id: string; label: string; icon: string; hue: number; freezer: boolean; householdId: string | null;
}

export async function listLocations(_householdId: string): Promise<StorageLocation[]> {
  return api.get<StorageLocation[]>('/api/locations');
}

export async function createLocation(
  _householdId: string,
  p: { id: string; label: string; icon: string; freezer: boolean; hue?: number },
): Promise<StorageLocation> {
  return api.post<StorageLocation>('/api/locations', p);
}

export async function updateLocation(
  id: string, patch: Partial<Pick<StorageLocation, 'label' | 'icon' | 'freezer' | 'hue'>>
): Promise<void> {
  await api.patch(`/api/locations/${id}`, patch);
}

export async function deleteLocation(id: string): Promise<void> {
  await api.delete(`/api/locations/${id}`);
}

export async function getMe(): Promise<{ id: string; email: string }> {
  return api.get('/api/me');
}

export async function updateMe(displayName: string): Promise<void> {
  await api.patch('/api/me', { displayName });
}

export async function deleteMe(): Promise<void> {
  await api.delete('/api/me');
}

export async function scanLookup(barcode: string) {
  return api.get<
    | { source: 'catalogue'; product: Product }
    | { source: 'openfoodfacts'; draft: { name: string; brand: string; cat: CategoryId; shelf: number | null; barcode: string } }
    | { source: 'none'; barcode: string }
  >(`/api/scan?barcode=${encodeURIComponent(barcode)}`);
}

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

export { CATEGORIES };
