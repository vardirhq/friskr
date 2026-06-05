import type { CSSProperties, ReactNode } from 'react';

interface PressProps {
  children: ReactNode;
  onClick?: (e: React.MouseEvent) => void;
  style?: CSSProperties;
  className?: string;
  stop?: boolean;
  disabled?: boolean;
}

export function Press({ children, onClick, style, className, stop, disabled }: PressProps) {
  return (
    <button
      className={className}
      disabled={disabled}
      onClick={(e) => { if (stop) e.stopPropagation(); onClick?.(e); }}
      style={{
        border: 'none', background: 'none', padding: 0, margin: 0,
        cursor: disabled ? 'default' : 'pointer',
        fontFamily: 'var(--font)', textAlign: 'left', color: 'inherit',
        transition: 'transform .12s ease', ...style,
      }}
      onPointerDown={(e) => { if (!disabled) e.currentTarget.style.transform = 'scale(0.97)'; }}
      onPointerUp={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
      onPointerLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
    >
      {children}
    </button>
  );
}
