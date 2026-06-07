const BASE = import.meta.env.VITE_API_BASE_URL ?? '';

function getJwt(): string | null { return localStorage.getItem('friskr_jwt'); }
function getRefresh(): string | null { return localStorage.getItem('friskr_refresh'); }
function setTokens(jwt: string, refreshToken: string) {
  localStorage.setItem('friskr_jwt', jwt);
  localStorage.setItem('friskr_refresh', refreshToken);
}
let refreshPromise: Promise<boolean> | null = null;
export function clearTokens() {
  localStorage.removeItem('friskr_jwt');
  localStorage.removeItem('friskr_refresh');
}

async function performRefresh(): Promise<boolean> {
  const refreshToken = getRefresh();
  if (!refreshToken) return false;
  const res = await fetch(`${BASE}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });
  if (!res.ok) { clearTokens(); return false; }
  const data = await res.json();
  setTokens(data.jwt, data.refreshToken);
  return true;
}

async function tryRefresh(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = performRefresh().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

async function request(method: string, path: string, body?: unknown, retry = true): Promise<Response> {
  const headers: Record<string, string> = {};
  const jwt = getJwt();
  if (jwt) headers['Authorization'] = `Bearer ${jwt}`;
  if (body != null) headers['Content-Type'] = 'application/json';

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body != null ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401 && retry) {
    const refreshed = await tryRefresh();
    if (refreshed) return request(method, path, body, false);
  }
  return res;
}

async function throwIfError(res: Response) {
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText, code: 'INTERNAL' }));
    throw Object.assign(new Error(body.error ?? res.statusText), { code: body.code });
  }
  return res;
}

export const api = {
  get: async <T>(path: string): Promise<T> =>
    throwIfError(await request('GET', path)).then((r) => r.json()),

  post: async <T>(path: string, body?: unknown): Promise<T> =>
    throwIfError(await request('POST', path, body)).then((r) => r.json()),

  put: async <T>(path: string, body?: unknown): Promise<T> =>
    throwIfError(await request('PUT', path, body)).then((r) => r.json()),

  patch: async <T>(path: string, body?: unknown): Promise<T> =>
    throwIfError(await request('PATCH', path, body)).then((r) => r.json()),

  delete: async <T>(path: string): Promise<T> =>
    throwIfError(await request('DELETE', path)).then((r) => r.json()),
};

export { setTokens };
