import { api, setTokens, clearTokens } from './api';

export async function signInWithEmail(email: string): Promise<void> {
  await api.post('/auth/otp/request', { email });
}

export async function verifyOtp(email: string, token: string): Promise<void> {
  const data = await api.post<{ jwt: string; refreshToken: string }>(
    '/auth/otp/verify',
    { email, code: token }
  );
  setTokens(data.jwt, data.refreshToken);
}

export async function signOut(): Promise<void> {
  const refreshToken = localStorage.getItem('friskr_refresh');
  await api.post('/auth/signout', { refreshToken }).catch(() => {});
  clearTokens();
}

export function onAuthChange(cb: (signedIn: boolean) => void): () => void {
  const check = () => cb(!!localStorage.getItem('friskr_jwt'));
  check();
  window.addEventListener('storage', check);
  return () => window.removeEventListener('storage', check);
}

export async function currentUser(): Promise<{ id: string } | null> {
  const jwt = localStorage.getItem('friskr_jwt');
  if (!jwt) return null;
  try {
    const payload = JSON.parse(atob(jwt.split('.')[1]));
    return { id: payload.sub };
  } catch {
    return null;
  }
}
