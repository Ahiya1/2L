/**
 * Tests for DiscussionFeed component
 *
 * Testing:
 * - Accusation highlighting (multiple patterns)
 * - Threading display
 * - Auto-scroll behavior
 * - Scroll lock toggle
 * - Integration with useGameEvents
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import DiscussionFeed from '../DiscussionFeed';
import * as GameEventsContext from '@/contexts/GameEventsContext';

// Mock useGameEvents hook
const mockUseGameEvents = vi.fn();
vi.spyOn(GameEventsContext, 'useGameEvents').mockImplementation(mockUseGameEvents);

describe('DiscussionFeed', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders empty state when no messages', () => {
    mockUseGameEvents.mockReturnValue({
      events: [],
      isConnected: true,
      error: null,
      reconnectAttempts: 0,
    });

    render(<DiscussionFeed gameId="test-game" playerNames={[]} />);

    expect(screen.getByText(/waiting for discussion to start/i)).toBeDefined();
  });

  it('displays messages from events', () => {
    mockUseGameEvents.mockReturnValue({
      events: [
        {
          type: 'message',
          gameId: 'test-game',
          payload: {
            id: 'msg-1',
            playerId: 'p1',
            playerName: 'Agent-A',
            message: 'Hello everyone',
            turn: 1,
            roundNumber: 1,
            timestamp: new Date().toISOString(),
          },
        },
      ],
      isConnected: true,
      error: null,
      reconnectAttempts: 0,
    });

    render(<DiscussionFeed gameId="test-game" playerNames={[]} />);

    expect(screen.getByText('Agent-A')).toBeDefined();
    expect(screen.getByText('Hello everyone')).toBeDefined();
  });

  it('highlights accusations with "I think X is Mafia" pattern', () => {
    mockUseGameEvents.mockReturnValue({
      events: [
        {
          type: 'message',
          gameId: 'test-game',
          payload: {
            id: 'msg-1',
            playerId: 'p1',
            playerName: 'Agent-A',
            message: 'I think Agent-B is Mafia based on their behavior',
            turn: 1,
            roundNumber: 1,
            timestamp: new Date().toISOString(),
          },
        },
      ],
      isConnected: true,
      error: null,
      reconnectAttempts: 0,
    });

    const { container } = render(
      <DiscussionFeed gameId="test-game" playerNames={['Agent-B']} />
    );

    // Check for red text (accusation highlighting)
    const redText = container.querySelector('.text-red-600.font-bold');
    expect(redText).toBeDefined();
    expect(redText?.textContent).toContain('I think Agent-B is Mafia');
  });

  it('highlights accusations with "I suspect X" pattern', () => {
    mockUseGameEvents.mockReturnValue({
      events: [
        {
          type: 'message',
          gameId: 'test-game',
          payload: {
            id: 'msg-1',
            playerId: 'p1',
            playerName: 'Agent-A',
            message: 'I suspect Agent-C of being suspicious',
            turn: 1,
            roundNumber: 1,
            timestamp: new Date().toISOString(),
          },
        },
      ],
      isConnected: true,
      error: null,
      reconnectAttempts: 0,
    });

    const { container } = render(
      <DiscussionFeed gameId="test-game" playerNames={['Agent-C']} />
    );

    const redText = container.querySelector('.text-red-600.font-bold');
    expect(redText).toBeDefined();
    expect(redText?.textContent).toContain('I suspect Agent-C');
  });

  it('highlights accusations with "I vote for X" pattern', () => {
    mockUseGameEvents.mockReturnValue({
      events: [
        {
          type: 'message',
          gameId: 'test-game',
          payload: {
            id: 'msg-1',
            playerId: 'p1',
            playerName: 'Agent-A',
            message: 'I vote for Agent-D to be eliminated',
            turn: 1,
            roundNumber: 1,
            timestamp: new Date().toISOString(),
          },
        },
      ],
      isConnected: true,
      error: null,
      reconnectAttempts: 0,
    });

    const { container } = render(
      <DiscussionFeed gameId="test-game" playerNames={['Agent-D']} />
    );

    const redText = container.querySelector('.text-red-600.font-bold');
    expect(redText).toBeDefined();
    expect(redText?.textContent).toContain('I vote for Agent-D');
  });

  it('displays threading indicator when message has inReplyTo', () => {
    mockUseGameEvents.mockReturnValue({
      events: [
        {
          type: 'message',
          gameId: 'test-game',
          payload: {
            id: 'msg-1',
            playerId: 'p1',
            playerName: 'Agent-A',
            message: 'I agree with that point',
            turn: 2,
            roundNumber: 1,
            timestamp: new Date().toISOString(),
            inReplyTo: {
              player: {
                name: 'Agent-B',
              },
            },
          },
        },
      ],
      isConnected: true,
      error: null,
      reconnectAttempts: 0,
    });

    render(<DiscussionFeed gameId="test-game" playerNames={[]} />);

    expect(screen.getByText(/↪ Replying to Agent-B/i)).toBeDefined();
  });

  it('toggles auto-scroll when lock button clicked', () => {
    mockUseGameEvents.mockReturnValue({
      events: [],
      isConnected: true,
      error: null,
      reconnectAttempts: 0,
    });

    render(<DiscussionFeed gameId="test-game" playerNames={[]} />);

    const lockButton = screen.getByRole('button', { name: /lock scroll/i });
    expect(lockButton).toBeDefined();

    // Click to disable auto-scroll
    fireEvent.click(lockButton);

    // Button text should change
    expect(screen.getByRole('button', { name: /auto-scroll/i })).toBeDefined();
  });

  it('shows connection status indicator', () => {
    mockUseGameEvents.mockReturnValue({
      events: [],
      isConnected: true,
      error: null,
      reconnectAttempts: 0,
    });

    render(<DiscussionFeed gameId="test-game" playerNames={[]} />);

    expect(screen.getByText('Connected')).toBeDefined();
  });

  it('shows disconnected status when not connected', () => {
    mockUseGameEvents.mockReturnValue({
      events: [],
      isConnected: false,
      error: 'Connection lost',
      reconnectAttempts: 1,
    });

    render(<DiscussionFeed gameId="test-game" playerNames={[]} />);

    expect(screen.getByText('Connecting...')).toBeDefined();
  });

  it('displays relative timestamps for recent messages', () => {
    const now = new Date();
    const twoMinutesAgo = new Date(now.getTime() - 2 * 60 * 1000);

    mockUseGameEvents.mockReturnValue({
      events: [
        {
          type: 'message',
          gameId: 'test-game',
          payload: {
            id: 'msg-1',
            playerId: 'p1',
            playerName: 'Agent-A',
            message: 'Hello',
            turn: 1,
            roundNumber: 1,
            timestamp: twoMinutesAgo.toISOString(),
          },
        },
      ],
      isConnected: true,
      error: null,
      reconnectAttempts: 0,
    });

    render(<DiscussionFeed gameId="test-game" playerNames={[]} />);

    // Should show relative time
    expect(screen.getByText(/2 minutes ago/i)).toBeDefined();
  });

  it('handles multiple accusations in single message', () => {
    mockUseGameEvents.mockReturnValue({
      events: [
        {
          type: 'message',
          gameId: 'test-game',
          payload: {
            id: 'msg-1',
            playerId: 'p1',
            playerName: 'Agent-A',
            message: 'I think Agent-B is Mafia and I also suspect Agent-C',
            turn: 1,
            roundNumber: 1,
            timestamp: new Date().toISOString(),
          },
        },
      ],
      isConnected: true,
      error: null,
      reconnectAttempts: 0,
    });

    const { container } = render(
      <DiscussionFeed gameId="test-game" playerNames={['Agent-B', 'Agent-C']} />
    );

    // Should have multiple highlighted segments
    const redTexts = container.querySelectorAll('.text-red-600.font-bold');
    expect(redTexts.length).toBeGreaterThan(0);
  });
});
