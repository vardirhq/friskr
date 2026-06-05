import type { ReactNode } from 'react';
import { IconX } from './icons';
import { Press } from './Press';

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  maxH?: number;
  children: ReactNode;
}

export function Sheet({ open, onClose, title, maxH = 90, children }: SheetProps) {
  if (!open) return null;
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
    }}>
      {/* backdrop */}
      <div
        onClick={onClose}
        style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(2px)', animation: 'friskr-fade .2s ease' }}
      />
      {/* sheet */}
      <div style={{
        position: 'relative', zIndex: 1,
        background: 'var(--surface)', borderRadius: '24px 24px 0 0',
        maxHeight: `${maxH}dvh`, overflowY: 'auto',
        animation: 'friskr-sheet .32s cubic-bezier(.22,1,.36,1)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}>
        <div style={{ padding: '16px 16px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {title && <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, letterSpacing: -0.3 }}>{title}</h2>}
          <Press onClick={onClose} style={{ marginLeft: 'auto', width: 36, height: 36, borderRadius: 999, background: 'var(--surface-2)', border: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink-2)' }}>
            <IconX size={18} />
          </Press>
        </div>
        <div style={{ padding: '0 16px 24px' }}>
          {children}
        </div>
      </div>
    </div>
  );
}
