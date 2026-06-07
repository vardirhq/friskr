import { create } from 'zustand';
import type { StockItem, SavePayload } from '../lib/friskr';
import {
  listStock, countsOf,
  saveStock, consumeStock, discardStock, restoreStock,
} from '../lib/friskr';
import { subscribeHousehold } from '../lib/realtime';

export interface Counts { fresh: number; soon: number; expired: number; total: number }
interface StockStore {
  items: StockItem[];
  counts: Counts;
  loading: boolean;
  load(householdId: string): Promise<void>;
  save(householdId: string, payload: SavePayload): Promise<void>;
  consume(householdId: string, item: StockItem): Promise<void>;
  discard(householdId: string, item: StockItem): Promise<void>;
  restore(householdId: string, id: string): Promise<void>;
  subscribeRealtime(householdId: string): void;
  unsubscribeRealtime(): void;
}

let unsubFn: (() => void) | null = null;

export const useStockStore = create<StockStore>((set, get) => ({
  items: [],
  counts: { fresh: 0, soon: 0, expired: 0, total: 0 },
  loading: false,

  async load(householdId) {
    set({ loading: true });
    try {
      const items = await listStock(householdId);
      const counts = countsOf(items);
      set({ items, counts });
    } finally {
      set({ loading: false });
    }
  },

  async save(householdId, payload) {
    await saveStock(householdId, payload);
    await get().load(householdId);
  },

  async consume(_householdId, item) {
    // optimistic
    set((s) => {
      const items = s.items.filter((i) => i.id !== item.id);
      return { items, counts: countsOf(items) };
    });
    await consumeStock(item.id);
  },

  async discard(_householdId, item) {
    set((s) => {
      const items = s.items.filter((i) => i.id !== item.id);
      return { items, counts: countsOf(items) };
    });
    await discardStock(item.id);
  },

  async restore(householdId, id) {
    await restoreStock(id);
    await get().load(householdId);
  },

  subscribeRealtime(householdId) {
    if (unsubFn) unsubFn();
    unsubFn = subscribeHousehold(householdId, () => get().load(householdId));
  },

  unsubscribeRealtime() {
    if (unsubFn) { unsubFn(); unsubFn = null; }
  },
}));
