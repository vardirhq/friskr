import type { CSSProperties, ReactNode, ComponentType } from 'react';
import { Press } from './Press';

type Variant = 'primary' | 'ghost' | 'soft' | 'danger';

interface BtnProps {
  children: ReactNode;
  onClick?: () => void;
  variant?: Variant;
  full?: boolean;
  icon?: ComponentType<{ size?: number; strokeWidth?: number }>;
  style?: CSSProperties;
  disabled?: boolean;
  type?: 'button' | 'submit';
}

const VARIANTS: Record<Variant, CSSProperties> = {
  primary: { background: 'var(--primary)', color: 'var(--on-primary)', boxShadow: '0 8px 20px -8px color-mix(in srgb, var(--primary) 60%, transparent)' },
  ghost: { background: 'var(--surface-2)', color: 'var(--ink)', border: '1px solid var(--line)' },
  soft: { background: 'var(--primary-tint)', color: 'var(--on-primary-tint)' },
  danger: { background: 'var(--expired-tint)', color: 'var(--expired)' },
};

export function Btn({ children, onClick, variant = 'primary', full, icon: I, style, disabled }: BtnProps) {
  return (
    <Press
      onClick={onClick}
      disabled={disabled}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        fontWeight: 700, fontSize: 15, padding: '13px 20px', borderRadius: 999,
        width: full ? '100%' : 'auto', transition: 'all .15s ease', whiteSpace: 'nowrap',
        opacity: disabled ? 0.5 : 1,
        ...VARIANTS[variant], ...style,
      }}
    >
      {I && <I size={19} />}
      {children}
    </Press>
  );
}

