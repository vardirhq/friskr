import { create } from 'zustand';
import { signInWithEmail as _signIn, verifyOtp as _verifyOtp, signOut as _signOut, onAuthChange, currentUser } from '../lib/auth';

interface AuthUser {
  id: string;
}

interface AuthStore {
  user: AuthUser | null;
  loading: boolean;
  init(): void;
  signInWithEmail(email: string): Promise<void>;
  verifyOtp(email: string, token: string): Promise<void>;
  signOut(): Promise<void>;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  loading: true,
  init() {
    currentUser().then((user) => set({ user, loading: false }));
    onAuthChange((signedIn) => {
      if (!signedIn) {
        set({ user: null });
      } else {
        currentUser().then((user) => set({ user }));
      }
    });
  },
  async signInWithEmail(email) {
    await _signIn(email);
  },
  async verifyOtp(email, token) {
    await _verifyOtp(email, token);
    const user = await currentUser();
    set({ user });
  },
  async signOut() {
    await _signOut();
    set({ user: null });
  },
}));
