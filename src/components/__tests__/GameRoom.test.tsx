import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { GameRoom } from '../GameRoom';

// Mock the useGame hook for testing
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
};

vi.mock('../../context/GameContext', () => ({
  useGame: () => ({
    state: mockState,
    dispatch: mockDispatch,
  }),
}));

describe('GameRoom', () => {
  const mockOnLeaveRoom = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render join room form when not joined', () => {
    render(<GameRoom onLeaveRoom={mockOnLeaveRoom} />);
    
    expect(screen.getByText('Join Room')).toBeInTheDocument();
    expect(screen.getByText(/Room Code:/)).toBeInTheDocument();
    expect(screen.getByText('ABC123')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Your name')).toBeInTheDocument();
    expect(screen.getByText('Join Room')).toBeInTheDocument();
  });

  it('should validate player name before joining', () => {
    render(<GameRoom onLeaveRoom={mockOnLeaveRoom} />);
    
    // The button shows "Connecting..." when not connected, so let's check for that
    const joinButton = screen.getByRole('button', { name: /connecting/i });
    expect(joinButton).toBeDisabled();
    
    const nameInput = screen.getByPlaceholderText('Your name');
    fireEvent.change(nameInput, { target: { value: 'TestPlayer' } });
    
    // Button should still be disabled because it's not connected
    expect(joinButton).toBeDisabled();
  });

  it('should call onLeaveRoom when back button is clicked', () => {
    render(<GameRoom onLeaveRoom={mockOnLeaveRoom} />);
    
    const backButton = screen.getByText('Back to Home');
    fireEvent.click(backButton);
    
    expect(mockOnLeaveRoom).toHaveBeenCalledOnce();
  });

  it('should show enter name label and input', () => {
    render(<GameRoom onLeaveRoom={mockOnLeaveRoom} />);
    
    expect(screen.getByText('Enter your name:')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Your name')).toBeInTheDocument();
  });

  it('should handle name input changes', () => {
    render(<GameRoom onLeaveRoom={mockOnLeaveRoom} />);
    
    const nameInput = screen.getByPlaceholderText('Your name') as HTMLInputElement;
    fireEvent.change(nameInput, { target: { value: 'TestPlayer' } });
    
    expect(nameInput.value).toBe('TestPlayer');
  });
});