import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { VotingController } from '../VotingController';
import { GameState } from '../../types/game';

// Mock the GameContext
const mockState: GameState = {
  roomCode: 'ABC123',
  phase: 'voting',
  players: [
    { id: '1', name: 'Player 1', role: 'resistance', isReady: true, isConnected: true, isLeader: true },
    { id: '2', name: 'Player 2', role: 'spy', isReady: true, isConnected: true, isLeader: false },
    { id: '3', name: 'Player 3', role: 'resistance', isReady: true, isConnected: true, isLeader: false },
  ],
  currentLeader: '1',
  currentMission: 1,
  missionHistory: [],
  resistanceScore: 0,
  spyScore: 0,
  gameLog: [],
  selectedTeam: ['1', '2'],
  votingInProgress: true,
  missionInProgress: false,
  currentVotes: {},
};

const mockDispatch = vi.fn();

vi.mock('../../context/GameContext', () => ({
  useGame: vi.fn(() => ({
    state: mockState,
    dispatch: mockDispatch,
  })),
}));

describe('VotingController', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should be importable without errors', () => {
    expect(VotingController).toBeDefined();
  });

  it('should render voting interface when phase is voting', () => {
    const mockPublishEvent = vi.fn().mockResolvedValue(undefined);
    
    render(
      <VotingController 
        currentPlayerId="1"
        isConnected={true}
        publishEvent={mockPublishEvent}
        onError={vi.fn()}
      />
    );

    expect(screen.getByText(/Mission 1 - Team Approval Vote/)).toBeInTheDocument();
    expect(screen.getByText(/Proposed Team:/)).toBeInTheDocument();
    expect(screen.getByText('Player 1, Player 2')).toBeInTheDocument();
  });

  it('should show voting buttons for non-leader players', () => {
    const mockPublishEvent = vi.fn().mockResolvedValue(undefined);
    
    render(
      <VotingController 
        currentPlayerId="2" // Non-leader player
        isConnected={true}
        publishEvent={mockPublishEvent}
        onError={vi.fn()}
      />
    );

    expect(screen.getByText('👍 YES')).toBeInTheDocument();
    expect(screen.getByText('👎 NO')).toBeInTheDocument();
  });

  it('should show leader auto-vote message', () => {
    const mockPublishEvent = vi.fn().mockResolvedValue(undefined);
    
    render(
      <VotingController 
        currentPlayerId="1" // Leader player
        isConnected={true}
        publishEvent={mockPublishEvent}
        onError={vi.fn()}
      />
    );

    expect(screen.getByText(/As mission leader, your vote is automatically "Yes"/)).toBeInTheDocument();
  });
});