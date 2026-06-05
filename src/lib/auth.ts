import { supabase } from './supabase';

export async function signInWithEmail(email: string) {
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true },
  });
  if (error) throw error;
}

export async function verifyOtp(email: string, token: string) {
  const { error } = await supabase.auth.verifyOtp({ email, token, type: 'email' });
  if (error) throw error;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export function onAuthChange(cb: (signedIn: boolean) => void) {
  const { data } = supabase.auth.onAuthStateChange((_event, session) => cb(!!session));
  return () => data.subscription.unsubscribe();
}

export async function currentUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}
