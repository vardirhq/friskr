import { create } from 'zustand';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { signInWithEmail as _signIn, verifyOtp as _verifyOtp, signOut as _signOut, onAuthChange } from '../lib/auth';

interface AuthStore {
  session: Session | null;
  loading: boolean;
  init(): void;
  signInWithEmail(email: string): Promise<void>;
  verifyOtp(email: string, token: string): Promise<void>;
  signOut(): Promise<void>;
}

export const useAuthStore = create<AuthStore>((set) => ({
  session: null,
  loading: true,
  init() {
    supabase.auth.getSession().then(({ data }) => {
      set({ session: data.session, loading: false });
    });
    onAuthChange((signedIn) => {
      if (!signedIn) {
        set({ session: null });
      } else {
        supabase.auth.getSession().then(({ data }) => set({ session: data.session }));
      }
    });
  },
  async signInWithEmail(email) {
    await _signIn(email);
  },
  async verifyOtp(email, token) {
    await _verifyOtp(email, token);
  },
  async signOut() {
    await _signOut();
    set({ session: null });
  },
}));
