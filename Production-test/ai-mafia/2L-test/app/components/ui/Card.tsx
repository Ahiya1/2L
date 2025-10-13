/**
 * Card Component
 *
 * Reusable card container with consistent styling
 */

import { ReactNode, HTMLAttributes } from 'react';

export interface CardProps extends Omit<HTMLAttributes<HTMLDivElement>, 'className'> {
  children: ReactNode;
  className?: string;
}

export function Card({ children, className = '', ...rest }: CardProps) {
  return (
    <div
      className={`bg-white border border-gray-300 rounded-lg p-4 shadow-sm ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}
