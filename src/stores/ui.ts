import { create } from 'zustand';

export type TabKey = 'home' | 'stock' | 'scan' | 'products' | 'settings';

export interface ToastAction {
  label: string;
  onAction: () => void;
}

export interface Toast {
  message: string;
  icon?: string;
  action?: ToastAction;
}

export type SheetTarget =
  | { type: 'add' }
  | { type: 'edit'; itemId: string }
  | { type: 'household' }
  | { type: 'onboarding' };

interface UiStore {
  tab: TabKey;
  sheet: SheetTarget | null;
  toast: Toast | null;
  confetti: boolean;
  setTab(t: TabKey): void;
  openSheet(target: SheetTarget): void;
  closeSheet(): void;
  showToast(message: string, icon?: string, action?: ToastAction): void;
  dismissToast(): void;
  fireConfetti(): void;
}

export const useUiStore = create<UiStore>((set) => ({
  tab: 'home',
  sheet: null,
  toast: null,
  confetti: false,
  setTab: (tab) => set({ tab }),
  openSheet: (sheet) => set({ sheet }),
  closeSheet: () => set({ sheet: null }),
  showToast: (message, icon, action) => {
    set({ toast: { message, icon, action } });
    setTimeout(() => set({ toast: null }), 4400);
  },
  dismissToast: () => set({ toast: null }),
  fireConfetti: () => {
    set({ confetti: true });
    setTimeout(() => set({ confetti: false }), 2000);
  },
}));
