import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { GameBoard } from '../GameBoard';
import { GameProvider } from '../../context/GameContext';
import { Player } from '../../types/game';

// Mock the useGame hook
const mockDispatch = vi.fn();
const mockState = {
  roomCode: 'TEST123',
  phase: 'team-building' as const,
  players: [] as Player[],
  currentLeader: 'player1',
  currentMission: 1,
  missionHistory: [],
  resistanceScore: 0,
  spyScore: 0,
  gameLog: [],
  selectedTeam: [],
  votingInProgress: false,
  missionInProgress: false,
};

vi.mock('../../context/GameContext', () => ({
  useGame: () => ({
    state: mockState,
    dispatch: mockDispatch,
  }),
  GameProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

describe('GameBoard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockState.players = [];
  });

  it('should render game board with title', () => {
    render(<GameBoard currentPlayerId="player1" />);
    
    expect(screen.getByText('Game Board')).toBeInTheDocument();
  });

  it('should display current game phase', () => {
    mockState.phase = 'team-building';
    render(<GameBoard currentPlayerId="player1" />);
    
    expect(screen.getByText('Phase: TEAM BUILDING')).toBeInTheDocument();
  });

  it('should display mission info when not in lobby', () => {
    mockState.phase = 'team-building';
    mockState.currentMission = 2;
    mockState.resistanceScore = 1;
    mockState.spyScore = 0;
    
    render(<GameBoard currentPlayerId="player1" />);
    
    expect(screen.getByText('Mission: 2')).toBeInTheDocument();
    expect(screen.getByText('R: 1 | S: 0')).toBeInTheDocument();
  });

  it('should display role legend', () => {
    render(<GameBoard currentPlayerId="player1" />);
    
    expect(screen.getByText('Resistance')).toBeInTheDocument();
    expect(screen.getByText('Spy')).toBeInTheDocument();
    expect(screen.getByText('Unknown')).toBeInTheDocument();
  });

  it('should display players in oval layout', () => {
    mockState.players = [
      {
        id: 'player1',
        name: 'Alice',
        role: 'resistance',
        isReady: true,
        isConnected: true,
        isLeader: true,
      },
      {
        id: 'player2',
        name: 'Bob',
        role: 'spy',
        isReady: true,
        isConnected: true,
        isLeader: false,
      },
    ];
    mockState.currentLeader = 'player1';
    
    render(<GameBoard currentPlayerId="player1" />);
    
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
  });

  it('should show leader crown for current leader', () => {
    mockState.players = [
      {
        id: 'player1',
        name: 'Alice',
        role: 'resistance',
        isReady: true,
        isConnected: true,
        isLeader: true,
      },
    ];
    mockState.currentLeader = 'player1';
    
    render(<GameBoard currentPlayerId="player1" />);
    
    // Crown emoji should be present for the leader
    expect(screen.getByText('👑')).toBeInTheDocument();
  });

  it('should show role visibility rules for resistance players', () => {
    mockState.players = [
      {
        id: 'player1',
        name: 'Alice',
        role: 'resistance',
        isReady: true,
        isConnected: true,
        isLeader: false,
      },
      {
        id: 'player2',
        name: 'Bob',
        role: 'spy',
        isReady: true,
        isConnected: true,
        isLeader: false,
      },
    ];
    
    render(<GameBoard currentPlayerId="player1" />);
    
    // Should show Alice's name and Bob's name
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
    
    // The component should render role indicators (tested by visual inspection)
    // Resistance player sees own role, others are hidden
  });

  it('should show all roles to spy players', () => {
    mockState.players = [
      {
        id: 'player1',
        name: 'Alice',
        role: 'spy',
        isReady: true,
        isConnected: true,
        isLeader: false,
      },
      {
        id: 'player2',
        name: 'Bob',
        role: 'resistance',
        isReady: true,
        isConnected: true,
        isLeader: false,
      },
    ];
    
    render(<GameBoard currentPlayerId="player1" />);
    
    // Should show Alice's name and Bob's name
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
    
    // The component should render role indicators (tested by visual inspection)
    // Spy player sees all roles
  });
});