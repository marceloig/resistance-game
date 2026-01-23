import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Home from '../Home';

// Mock the useGame hook
const mockDispatch = vi.fn();
const mockState = {
  roomCode: 'ABC123',
  phase: 'lobby' as const,
  players: [],
  currentLeader: '',
  currentMission: 1,
  missionHistory: [],
  resistanceScore: 0,
  spyScore: 0,
  gameLog: [],
  selectedTeam: [],
  votingInProgress: false,
  missionInProgress: false,
  currentVotes: {},
};

vi.mock('../context/GameContext', () => ({
  useGame: () => ({
    state: mockState,
    dispatch: mockDispatch,
  }),
}));

// Mock the backend test
vi.mock('../test-backend', () => ({
  testBackendConnectivity: () => Promise.resolve(true),
}));

// Mock the GameRoom component
vi.mock('../components/GameRoom', () => ({
  GameRoom: ({ onLeaveRoom }: { onLeaveRoom: () => void }) => (
    <div>
      <h2>Mock Game Room</h2>
      <button onClick={onLeaveRoom}>Leave Room</button>
    </div>
  ),
}));

describe('Home', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render home page with room management options', () => {
    render(<Home />);
    
    expect(screen.getByText('Resistance Game')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Create New Game' })).toBeInTheDocument();
    expect(screen.getByText('Join Existing Game')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create New Game' })).toBeInTheDocument();
  });

  it('should show current room code', () => {
    render(<Home />);
    
    expect(screen.getByText('ABC123')).toBeInTheDocument();
    expect(screen.getByText(/Your room code:/)).toBeInTheDocument();
  });

  it('should handle new game creation', () => {
    render(<Home />);
    
    const newGameButton = screen.getByRole('button', { name: 'Create New Game' });
    fireEvent.click(newGameButton);
    
    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'SET_ROOM_CODE' })
    );
  });

  it('should validate room code input', () => {
    render(<Home />);
    
    const joinButton = screen.getByRole('button', { name: 'Join Game' });
    expect(joinButton).toBeDisabled();
    
    const roomCodeInput = screen.getByPlaceholderText('ABC123');
    fireEvent.change(roomCodeInput, { target: { value: 'XYZ789' } });
    
    expect(joinButton).not.toBeDisabled();
  });

  it('should show join game form', () => {
    render(<Home />);
    
    expect(screen.getByText('Enter room code:')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('ABC123')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Join Game' })).toBeInTheDocument();
  });

  it('should show how to play instructions', () => {
    render(<Home />);
    
    expect(screen.getByText('How to Play')).toBeInTheDocument();
    expect(screen.getByText(/Create a new game to get a room code/)).toBeInTheDocument();
    expect(screen.getByText(/Share the room code with 4-9 friends/)).toBeInTheDocument();
  });
});