/**
 * Badge Component
 *
 * Small label with color variants
 */

import { ReactNode } from 'react';

export interface BadgeProps {
  variant: 'alive' | 'dead' | 'mafia' | 'villager' | 'phase';
  children: ReactNode;
  className?: string;
}

export function Badge({ variant, children, className = '' }: BadgeProps) {
  const variants = {
    alive: 'bg-green-100 text-green-800',
    dead: 'bg-red-100 text-red-800',
    mafia: 'bg-purple-100 text-purple-800',
    villager: 'bg-blue-100 text-blue-800',
    phase: 'bg-yellow-100 text-yellow-800',
  };

  return (
    <span
      className={`px-2 py-1 rounded text-xs font-medium ${variants[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
