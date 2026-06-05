const BASE = import.meta.env.VITE_API_BASE_URL ?? '';

export function subscribeHousehold(_householdId: string, onChange: () => void): () => void {
  const token = localStorage.getItem('friskr_jwt');
  if (!token) return () => {};

  const es = new EventSource(`${BASE}/api/realtime/household?token=${encodeURIComponent(token)}`);
  es.onmessage = () => onChange();
  es.onerror = () => {};
  return () => es.close();
}
