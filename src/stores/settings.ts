import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SettingsStore {
  darkMode: boolean;
  pushEnabled: boolean;
  notifyDaysAhead: number;
  setDark(v: boolean): void;
  setPush(v: boolean): void;
  setNotifyDays(n: number): void;
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      darkMode: false,
      pushEnabled: true,
      notifyDaysAhead: 3,
      setDark: (darkMode) => set({ darkMode }),
      setPush: (pushEnabled) => set({ pushEnabled }),
      setNotifyDays: (notifyDaysAhead) => set({ notifyDaysAhead: Math.max(1, Math.min(14, notifyDaysAhead)) }),
    }),
    { name: 'friskr-settings' },
  ),
);
