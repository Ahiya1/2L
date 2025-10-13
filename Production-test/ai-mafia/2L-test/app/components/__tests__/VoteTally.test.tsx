/**
 * Tests for VoteTally component
 *
 * Testing:
 * - Vote aggregation logic
 * - Majority threshold highlighting
 * - Vote justification display (expand/collapse)
 * - Real-time updates
 * - Visual indicators (leader, majority)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import VoteTally from '../VoteTally';
import * as GameEventsContext from '@/contexts/GameEventsContext';

// Mock useGameEvents hook
const mockUseGameEvents = vi.fn();
vi.spyOn(GameEventsContext, 'useGameEvents').mockImplementation(mockUseGameEvents);

describe('VoteTally', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders empty state when no votes', () => {
    mockUseGameEvents.mockReturnValue({
      events: [],
      isConnected: true,
      error: null,
      reconnectAttempts: 0,
    });

    render(<VoteTally gameId="test-game" playerCount={10} />);

    expect(screen.getByText(/no votes cast yet/i)).toBeDefined();
    expect(screen.getByText(/0\/10 votes/i)).toBeDefined();
  });

  it('displays majority threshold correctly', () => {
    mockUseGameEvents.mockReturnValue({
      events: [],
      isConnected: true,
      error: null,
      reconnectAttempts: 0,
    });

    render(<VoteTally gameId="test-game" playerCount={10} />);

    // Majority for 10 players = ceil(10/2) = 5
    expect(screen.getByText(/5 votes needed/i)).toBeDefined();
  });

  it('aggregates votes correctly', () => {
    mockUseGameEvents.mockReturnValue({
      events: [
        {
          type: 'vote_cast',
          gameId: 'test-game',
          payload: {
            voterId: 'p1',
            voterName: 'Agent-A',
            targetId: 't1',
            targetName: 'Agent-X',
            justification: 'Suspicious behavior',
            voteOrder: 1,
          },
        },
        {
          type: 'vote_cast',
          gameId: 'test-game',
          payload: {
            voterId: 'p2',
            voterName: 'Agent-B',
            targetId: 't1',
            targetName: 'Agent-X',
            justification: 'I agree',
            voteOrder: 2,
          },
        },
        {
          type: 'vote_cast',
          gameId: 'test-game',
          payload: {
            voterId: 'p3',
            voterName: 'Agent-C',
            targetId: 't2',
            targetName: 'Agent-Y',
            justification: 'Different suspicion',
            voteOrder: 3,
          },
        },
      ],
      isConnected: true,
      error: null,
      reconnectAttempts: 0,
    });

    render(<VoteTally gameId="test-game" playerCount={10} />);

    // Agent-X should have 2 votes
    expect(screen.getByText('Agent-X')).toBeDefined();
    expect(screen.getByText(/2 votes/i)).toBeDefined();

    // Agent-Y should have 1 vote
    expect(screen.getByText('Agent-Y')).toBeDefined();
    expect(screen.getByText(/1 vote$/i)).toBeDefined();
  });

  it('highlights player with most votes as leader', () => {
    mockUseGameEvents.mockReturnValue({
      events: [
        {
          type: 'vote_cast',
          gameId: 'test-game',
          payload: {
            voterId: 'p1',
            voterName: 'Agent-A',
            targetId: 't1',
            targetName: 'Agent-X',
            justification: 'Test',
            voteOrder: 1,
          },
        },
        {
          type: 'vote_cast',
          gameId: 'test-game',
          payload: {
            voterId: 'p2',
            voterName: 'Agent-B',
            targetId: 't1',
            targetName: 'Agent-X',
            justification: 'Test',
            voteOrder: 2,
          },
        },
        {
          type: 'vote_cast',
          gameId: 'test-game',
          payload: {
            voterId: 'p3',
            voterName: 'Agent-C',
            targetId: 't2',
            targetName: 'Agent-Y',
            justification: 'Test',
            voteOrder: 3,
          },
        },
      ],
      isConnected: true,
      error: null,
      reconnectAttempts: 0,
    });

    render(<VoteTally gameId="test-game" playerCount={10} />);

    // Agent-X should be marked as leading
    expect(screen.getByText(/👑 LEADING/i)).toBeDefined();
  });

  it('highlights player when majority threshold reached', () => {
    mockUseGameEvents.mockReturnValue({
      events: [
        {
          type: 'vote_cast',
          gameId: 'test-game',
          payload: {
            voterId: 'p1',
            voterName: 'Agent-A',
            targetId: 't1',
            targetName: 'Agent-X',
            justification: 'Test',
            voteOrder: 1,
          },
        },
        {
          type: 'vote_cast',
          gameId: 'test-game',
          payload: {
            voterId: 'p2',
            voterName: 'Agent-B',
            targetId: 't1',
            targetName: 'Agent-X',
            justification: 'Test',
            voteOrder: 2,
          },
        },
        {
          type: 'vote_cast',
          gameId: 'test-game',
          payload: {
            voterId: 'p3',
            voterName: 'Agent-C',
            targetId: 't1',
            targetName: 'Agent-X',
            justification: 'Test',
            voteOrder: 3,
          },
        },
      ],
      isConnected: true,
      error: null,
      reconnectAttempts: 0,
    });

    // Player count = 5, majority = 3
    render(<VoteTally gameId="test-game" playerCount={5} />);

    // Should show majority reached warning
    expect(screen.getByText(/⚠ MAJORITY REACHED/i)).toBeDefined();
  });

  it('displays voter names', () => {
    mockUseGameEvents.mockReturnValue({
      events: [
        {
          type: 'vote_cast',
          gameId: 'test-game',
          payload: {
            voterId: 'p1',
            voterName: 'Agent-A',
            targetId: 't1',
            targetName: 'Agent-X',
            justification: 'Suspicious',
            voteOrder: 1,
          },
        },
        {
          type: 'vote_cast',
          gameId: 'test-game',
          payload: {
            voterId: 'p2',
            voterName: 'Agent-B',
            targetId: 't1',
            targetName: 'Agent-X',
            justification: 'I agree',
            voteOrder: 2,
          },
        },
      ],
      isConnected: true,
      error: null,
      reconnectAttempts: 0,
    });

    render(<VoteTally gameId="test-game" playerCount={10} />);

    expect(screen.getByText(/Agent-A, Agent-B/i)).toBeDefined();
  });

  it('expands and collapses vote justifications on click', () => {
    mockUseGameEvents.mockReturnValue({
      events: [
        {
          type: 'vote_cast',
          gameId: 'test-game',
          payload: {
            voterId: 'p1',
            voterName: 'Agent-A',
            targetId: 't1',
            targetName: 'Agent-X',
            justification: 'Very suspicious behavior in discussion',
            voteOrder: 1,
          },
        },
      ],
      isConnected: true,
      error: null,
      reconnectAttempts: 0,
    });

    render(<VoteTally gameId="test-game" playerCount={10} />);

    // Initially collapsed - justification not visible
    expect(screen.queryByText(/Very suspicious behavior/i)).toBeNull();

    // Click to expand
    const expandButton = screen.getByRole('button', { name: /Voted by: Agent-A/i });
    fireEvent.click(expandButton);

    // Justification should now be visible
    expect(screen.getByText(/Very suspicious behavior/i)).toBeDefined();

    // Click again to collapse
    fireEvent.click(expandButton);

    // Justification should be hidden again
    expect(screen.queryByText(/Very suspicious behavior/i)).toBeNull();
  });

  it('shows all votes cast message when complete', () => {
    mockUseGameEvents.mockReturnValue({
      events: [
        {
          type: 'vote_cast',
          gameId: 'test-game',
          payload: {
            voterId: 'p1',
            voterName: 'Agent-A',
            targetId: 't1',
            targetName: 'Agent-X',
            justification: 'Test',
            voteOrder: 1,
          },
        },
        {
          type: 'vote_cast',
          gameId: 'test-game',
          payload: {
            voterId: 'p2',
            voterName: 'Agent-B',
            targetId: 't2',
            targetName: 'Agent-Y',
            justification: 'Test',
            voteOrder: 2,
          },
        },
        {
          type: 'vote_cast',
          gameId: 'test-game',
          payload: {
            voterId: 'p3',
            voterName: 'Agent-C',
            targetId: 't1',
            targetName: 'Agent-X',
            justification: 'Test',
            voteOrder: 3,
          },
        },
      ],
      isConnected: true,
      error: null,
      reconnectAttempts: 0,
    });

    render(<VoteTally gameId="test-game" playerCount={3} />);

    expect(screen.getByText(/✓ All votes cast/i)).toBeDefined();
  });

  it('shows waiting message when votes incomplete', () => {
    mockUseGameEvents.mockReturnValue({
      events: [
        {
          type: 'vote_cast',
          gameId: 'test-game',
          payload: {
            voterId: 'p1',
            voterName: 'Agent-A',
            targetId: 't1',
            targetName: 'Agent-X',
            justification: 'Test',
            voteOrder: 1,
          },
        },
      ],
      isConnected: true,
      error: null,
      reconnectAttempts: 0,
    });

    render(<VoteTally gameId="test-game" playerCount={5} />);

    expect(screen.getByText(/Waiting for 4 more votes/i)).toBeDefined();
  });

  it('sorts players by vote count descending', () => {
    mockUseGameEvents.mockReturnValue({
      events: [
        {
          type: 'vote_cast',
          gameId: 'test-game',
          payload: {
            voterId: 'p1',
            voterName: 'Agent-A',
            targetId: 't1',
            targetName: 'Agent-X',
            justification: 'Test',
            voteOrder: 1,
          },
        },
        {
          type: 'vote_cast',
          gameId: 'test-game',
          payload: {
            voterId: 'p2',
            voterName: 'Agent-B',
            targetId: 't2',
            targetName: 'Agent-Y',
            justification: 'Test',
            voteOrder: 2,
          },
        },
        {
          type: 'vote_cast',
          gameId: 'test-game',
          payload: {
            voterId: 'p3',
            voterName: 'Agent-C',
            targetId: 't2',
            targetName: 'Agent-Y',
            justification: 'Test',
            voteOrder: 3,
          },
        },
        {
          type: 'vote_cast',
          gameId: 'test-game',
          payload: {
            voterId: 'p4',
            voterName: 'Agent-D',
            targetId: 't2',
            targetName: 'Agent-Y',
            justification: 'Test',
            voteOrder: 4,
          },
        },
      ],
      isConnected: true,
      error: null,
      reconnectAttempts: 0,
    });

    const { container } = render(<VoteTally gameId="test-game" playerCount={10} />);

    // Agent-Y (3 votes) should appear before Agent-X (1 vote)
    const playerNames = Array.from(container.querySelectorAll('.font-bold.text-gray-800'))
      .map((el) => el.textContent?.trim())
      .filter((text) => text && text.startsWith('Agent-'));

    expect(playerNames[0]).toContain('Agent-Y');
    expect(playerNames[1]).toContain('Agent-X');
  });

  it('updates vote count badge correctly', () => {
    mockUseGameEvents.mockReturnValue({
      events: [
        {
          type: 'vote_cast',
          gameId: 'test-game',
          payload: {
            voterId: 'p1',
            voterName: 'Agent-A',
            targetId: 't1',
            targetName: 'Agent-X',
            justification: 'Test',
            voteOrder: 1,
          },
        },
        {
          type: 'vote_cast',
          gameId: 'test-game',
          payload: {
            voterId: 'p2',
            voterName: 'Agent-B',
            targetId: 't1',
            targetName: 'Agent-X',
            justification: 'Test',
            voteOrder: 2,
          },
        },
      ],
      isConnected: true,
      error: null,
      reconnectAttempts: 0,
    });

    render(<VoteTally gameId="test-game" playerCount={10} />);

    expect(screen.getByText(/2\/10 votes/i)).toBeDefined();
  });
});
