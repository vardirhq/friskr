const BASE = import.meta.env.VITE_API_BASE_URL ?? '';
import { api } from './api';

export function subscribeHousehold(_householdId: string, onChange: () => void): () => void {
  let cancelled = false;
  let es: EventSource | null = null;

  api.post<{ ticket: string }>('/api/realtime/ticket')
    .then(({ ticket }) => {
      if (cancelled) return;
      es = new EventSource(`${BASE}/api/realtime/household?ticket=${encodeURIComponent(ticket)}`);
      es.onmessage = () => onChange();
      es.onerror = () => {};
    })
    .catch(() => {});

  return () => {
    cancelled = true;
    es?.close();
  };
}
