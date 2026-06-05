import type { CSSProperties, ReactNode } from 'react';
import { Press } from './Press';

interface CardProps {
  children: ReactNode;
  style?: CSSProperties;
  pad?: number;
  onClick?: () => void;
  className?: string;
}

export function Card({ children, style, pad = 16, onClick, className }: CardProps) {
  const base: CSSProperties = {
    background: 'var(--surface)', borderRadius: 'var(--r)',
    border: '1px solid var(--line)', boxShadow: 'var(--shadow-sm)',
    padding: pad, ...style,
  };
  if (onClick) {
    return <Press onClick={onClick} className={className} style={{ display: 'block', width: '100%', textAlign: 'left', ...base }}>{children}</Press>;
  }
  return <div className={className} style={base}>{children}</div>;
}
