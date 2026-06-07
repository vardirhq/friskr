import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SettingsStore {
  darkMode: boolean;
  pushEnabled: boolean;
  notifyDaysAhead: number;
  accent: string;
  density: 'compact' | 'regular' | 'comfy';
  language: string;
  debugMode: boolean;
  setDark(v: boolean): void;
  setPush(v: boolean): void;
  setNotifyDays(n: number): void;
  setAccent(v: string): void;
  setDensity(v: 'compact' | 'regular' | 'comfy'): void;
  setLanguage(v: string): void;
  setDebugMode(v: boolean): void;
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      darkMode: false,
      pushEnabled: false,
      notifyDaysAhead: 3,
      accent: '#15a05a',
      density: 'regular',
      language: 'nb',
      debugMode: false,
      setDark: (darkMode) => set({ darkMode }),
      setPush: (pushEnabled) => set({ pushEnabled }),
      setNotifyDays: (notifyDaysAhead) => set({ notifyDaysAhead: Math.max(0, Math.min(14, notifyDaysAhead)) }),
      setAccent: (accent) => set({ accent }),
      setDensity: (density) => set({ density }),
      setLanguage: (language) => set({ language }),
      setDebugMode: (debugMode) => set({ debugMode }),
    }),
    { name: 'friskr-settings' },
  ),
);
