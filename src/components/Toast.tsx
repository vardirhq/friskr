import type { Toast as ToastType } from '../stores/ui';
import { Press } from './Press';
import { ICON_MAP } from './icons';

interface ToastProps {
  toast: ToastType;
  onDismiss: () => void;
}

export function Toast({ toast, onDismiss }: ToastProps) {
  const IconCmp = toast.icon ? ICON_MAP[toast.icon] : null;
  return (
    <div style={{
      position: 'fixed', bottom: 90, left: '50%', transform: 'translateX(-50%)',
      zIndex: 300, display: 'flex', alignItems: 'center', gap: 10,
      background: 'var(--ink)', color: 'var(--paper)',
      borderRadius: 999, padding: '11px 16px', boxShadow: 'var(--shadow-lg)',
      fontSize: 13.5, fontWeight: 600, whiteSpace: 'nowrap',
      animation: 'friskr-rise .25s ease',
      maxWidth: 'calc(100vw - 32px)',
    }}>
      {IconCmp && <span style={{ display: 'flex', opacity: 0.75 }}><IconCmp size={17} /></span>}
      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>{toast.message}</span>
      {toast.action && (
        <Press onClick={() => { toast.action!.onAction(); onDismiss(); }} style={{ color: 'var(--primary)', fontWeight: 800, fontSize: 13.5, marginLeft: 4 }}>
          {toast.action.label}
        </Press>
      )}
    </div>
  );
}
