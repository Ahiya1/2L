/**
 * Game Over Banner Component
 *
 * Displays winner announcement with appropriate styling
 */

import { ReactNode } from 'react';

export interface GameOverBannerProps {
  winner: 'MAFIA' | 'VILLAGERS';
  roundNumber?: number;
  className?: string;
}

export function GameOverBanner({ winner, roundNumber, className = '' }: GameOverBannerProps) {
  const isMafiaWin = winner === 'MAFIA';

  return (
    <div
      className={`text-center py-8 px-4 rounded-lg ${
        isMafiaWin ? 'bg-purple-100 border-2 border-purple-300' : 'bg-blue-100 border-2 border-blue-300'
      } ${className}`}
    >
      <h1 className="text-4xl font-bold mb-2">
        {isMafiaWin ? (
          <span className="text-purple-600">Mafia Wins!</span>
        ) : (
          <span className="text-blue-600">Villagers Win!</span>
        )}
      </h1>
      {roundNumber && (
        <p className="text-gray-600">
          Game completed after {roundNumber} {roundNumber === 1 ? 'round' : 'rounds'}
        </p>
      )}
    </div>
  );
}
