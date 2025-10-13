/**
 * Card Component
 *
 * Reusable card container with consistent styling
 */

import { ReactNode } from 'react';

export interface CardProps {
  children: ReactNode;
  className?: string;
}

export function Card({ children, className = '' }: CardProps) {
  return (
    <div
      className={`bg-white border border-gray-300 rounded-lg p-4 shadow-sm ${className}`}
    >
      {children}
    </div>
  );
}
