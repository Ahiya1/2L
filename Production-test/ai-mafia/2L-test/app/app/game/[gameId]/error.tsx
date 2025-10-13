/**
 * Error Boundary for Live Game Page
 *
 * Catches and handles errors within the live game page
 * Provides user-friendly error message with retry option
 */

'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error details to console for debugging
    console.error('[LiveGamePage Error]', {
      message: error.message,
      stack: error.stack,
      digest: error.digest,
    });
  }, [error]);

  return (
    <div className="min-h-screen bg-gray-100 p-4 flex items-center justify-center">
      <div className="max-w-md bg-white rounded-lg shadow-lg p-6">
        {/* Error icon */}
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
            <svg
              className="w-10 h-10 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
        </div>

        {/* Error title */}
        <h2 className="text-2xl font-bold text-gray-800 text-center mb-2">
          Something went wrong
        </h2>

        {/* Error message */}
        <p className="text-gray-600 text-center mb-6">
          {error.message || 'An unexpected error occurred while loading the game.'}
        </p>

        {/* Error details (collapsible, for debugging) */}
        <details className="mb-6 text-sm">
          <summary className="cursor-pointer text-gray-500 hover:text-gray-700">
            Technical details
          </summary>
          <div className="mt-2 p-3 bg-gray-50 rounded border border-gray-200 overflow-auto">
            <pre className="text-xs text-gray-700 whitespace-pre-wrap break-words">
              {error.stack || error.message}
            </pre>
            {error.digest && (
              <div className="mt-2 text-xs text-gray-500">
                Error ID: {error.digest}
              </div>
            )}
          </div>
        </details>

        {/* Action buttons */}
        <div className="flex gap-3">
          <button
            onClick={reset}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Try Again
          </button>
          <button
            onClick={() => window.location.href = '/'}
            className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
          >
            Go Home
          </button>
        </div>

        {/* Help text */}
        <p className="mt-4 text-xs text-gray-500 text-center">
          If the problem persists, please refresh the page or check your network connection.
        </p>
      </div>
    </div>
  );
}
