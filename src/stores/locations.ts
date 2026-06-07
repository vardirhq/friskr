import { create } from 'zustand';
import {
  createLocation as apiCreateLocation,
  deleteLocation as apiDeleteLocation,
  listLocations,
  updateLocation as apiUpdateLocation,
  type StorageLocation,
} from '../lib/friskr';

interface LocationStore {
  locations: StorageLocation[];
  loading: boolean;
  householdId: string | null;
  load(householdId: string, force?: boolean): Promise<void>;
  create(householdId: string, data: { label: string; icon: string; freezer: boolean }): Promise<void>;
  update(id: string, patch: Partial<Pick<StorageLocation, 'label' | 'icon' | 'freezer' | 'hue'>>): Promise<void>;
  remove(id: string): Promise<void>;
  clear(): void;
}

export const useLocationStore = create<LocationStore>((set, get) => ({
  locations: [],
  loading: false,
  householdId: null,
  load: async (householdId, force = false) => {
    if (!force && get().householdId === householdId && get().locations.length > 0) return;
    set({ loading: true });
    try {
      const locations = await listLocations(householdId);
      set({ locations, householdId });
    } finally {
      set({ loading: false });
    }
  },
  create: async (householdId, data) => {
    await apiCreateLocation(householdId, { id: '', ...data });
    await get().load(householdId, true);
  },
  update: async (id, patch) => {
    await apiUpdateLocation(id, patch);
    const householdId = get().householdId;
    if (householdId) await get().load(householdId, true);
  },
  remove: async (id) => {
    await apiDeleteLocation(id);
    const householdId = get().householdId;
    if (householdId) await get().load(householdId, true);
  },
  clear: () => set({ locations: [], householdId: null, loading: false }),
}));
