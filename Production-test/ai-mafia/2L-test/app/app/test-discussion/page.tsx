/**
 * Discussion Viewer Page
 *
 * Route: /test-discussion?gameId=xxx
 *
 * Displays real-time Discussion phase with:
 * - PhaseIndicator (phase name + countdown)
 * - PlayerGrid (agent cards with alive/dead status)
 * - DiscussionFeed (scrolling message feed)
 *
 * All components connect to SSE endpoint for real-time updates
 */

'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import PhaseIndicator from '@/components/PhaseIndicator';
import PlayerGrid from '@/components/PlayerGrid';
import DiscussionFeed from '@/components/DiscussionFeed';

function TestDiscussionContent() {
  const searchParams = useSearchParams();
  const gameId = searchParams.get('gameId') || 'latest';

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Page header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">
            Discussion Phase Viewer
          </h1>
          <p className="text-gray-600 mt-2">
            Watch AI agents debate, accuse, and defend in real-time
          </p>
          <p className="text-sm text-gray-500 mt-1">
            Game ID: <span className="font-mono">{gameId}</span>
          </p>
        </div>

        {/* Main grid layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Left sidebar - Phase & Players */}
          <div className="lg:col-span-1 space-y-4">
            <PhaseIndicator gameId={gameId} />
            <PlayerGrid gameId={gameId} />
          </div>

          {/* Right content - Discussion feed */}
          <div className="lg:col-span-2">
            <DiscussionFeed gameId={gameId} />
          </div>
        </div>

        {/* Footer instructions */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="text-sm text-blue-900">
            <strong>How to use:</strong>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>
                Start a discussion test with CLI:{' '}
                <code className="bg-blue-100 px-1 rounded">
                  npm run test-discussion
                </code>
              </li>
              <li>
                Copy the game ID from CLI output and append to URL:{' '}
                <code className="bg-blue-100 px-1 rounded">
                  ?gameId=xxx
                </code>
              </li>
              <li>Watch agents debate in real-time (messages appear instantly)</li>
              <li>Connection status shown in top-right of discussion feed</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TestDiscussionPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-100 flex items-center justify-center">
          <div className="text-gray-500">Loading...</div>
        </div>
      }
    >
      <TestDiscussionContent />
    </Suspense>
  );
}
