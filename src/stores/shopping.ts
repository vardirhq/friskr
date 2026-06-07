import { create } from 'zustand';
import type { ShoppingItem, ShoppingSuggestion } from '../lib/friskr';
import {
  listShoppingItems, addShoppingItem, updateShoppingItem,
  deleteShoppingItem, clearDoneShoppingItems, listShoppingSuggestions,
} from '../lib/friskr';
import { subscribeHousehold } from '../lib/realtime';

interface ShoppingStore {
  items: ShoppingItem[];
  suggestions: ShoppingSuggestion[];
  loading: boolean;
  load(): Promise<void>;
  loadSuggestions(): Promise<void>;
  add(payload: { name: string; cat?: string; qty?: number; productId?: string; auto?: boolean }): Promise<ShoppingItem>;
  toggle(id: string, done: boolean): Promise<void>;
  setQty(id: string, qty: number): Promise<void>;
  remove(id: string): Promise<void>;
  clearDone(): Promise<void>;
  subscribeRealtime(householdId: string): void;
  unsubscribeRealtime(): void;
}

let unsubFn: (() => void) | null = null;

export const useShoppingStore = create<ShoppingStore>((set, get) => ({
  items: [],
  suggestions: [],
  loading: false,

  async load() {
    set({ loading: true });
    try {
      const items = await listShoppingItems();
      set({ items });
    } finally {
      set({ loading: false });
    }
  },

  async loadSuggestions() {
    const suggestions = await listShoppingSuggestions();
    set({ suggestions });
  },

  async add(payload) {
    const item = await addShoppingItem(payload);
    set((s) => ({ items: [...s.items, item] }));
    return item;
  },

  async toggle(id, done) {
    const previous = get().items;
    // optimistic
    set((s) => ({ items: s.items.map((i) => i.id === id ? { ...i, done } : i) }));
    try {
      await updateShoppingItem(id, { done });
    } catch (error) {
      set({ items: previous });
      throw error;
    }
  },

  async setQty(id, qty) {
    const previous = get().items;
    set((s) => ({ items: s.items.map((i) => i.id === id ? { ...i, qty } : i) }));
    try {
      await updateShoppingItem(id, { qty });
    } catch (error) {
      set({ items: previous });
      throw error;
    }
  },

  async remove(id) {
    const previous = get().items;
    set((s) => ({ items: s.items.filter((i) => i.id !== id) }));
    try {
      await deleteShoppingItem(id);
    } catch (error) {
      set({ items: previous });
      throw error;
    }
  },

  async clearDone() {
    const previous = get().items;
    set((s) => ({ items: s.items.filter((i) => !i.done) }));
    try {
      await clearDoneShoppingItems();
    } catch (error) {
      set({ items: previous });
      throw error;
    }
  },

  subscribeRealtime(householdId) {
    if (unsubFn) unsubFn();
    unsubFn = subscribeHousehold(householdId, () => { get().load(); get().loadSuggestions(); });
  },

  unsubscribeRealtime() {
    if (unsubFn) { unsubFn(); unsubFn = null; }
  },
}));
