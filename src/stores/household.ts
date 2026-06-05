import { create } from 'zustand';
import type { Household } from '../lib/friskr';
import { getHousehold, createHousehold, joinHousehold } from '../lib/friskr';

interface HouseholdStore {
  household: Household | null;
  loading: boolean;
  load(): Promise<void>;
  create(name: string, displayName?: string): Promise<void>;
  join(code: string, displayName?: string): Promise<void>;
  reload(): Promise<void>;
}

export const useHouseholdStore = create<HouseholdStore>((set) => ({
  household: null,
  loading: false,
  async load() {
    set({ loading: true });
    try {
      const h = await getHousehold();
      set({ household: h });
    } finally {
      set({ loading: false });
    }
  },
  async create(name, displayName) {
    await createHousehold(name, displayName);
    const h = await getHousehold();
    set({ household: h });
  },
  async join(code, displayName) {
    await joinHousehold(code, displayName);
    const h = await getHousehold();
    set({ household: h });
  },
  async reload() {
    const h = await getHousehold();
    set({ household: h });
  },
}));
