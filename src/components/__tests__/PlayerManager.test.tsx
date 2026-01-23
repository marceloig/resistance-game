import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PlayerManager } from '../PlayerManager';

// Mock the useGame hook for testing
const mockDispatch = vi.fn();
let mockState = {
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

const mockPublishEvent = vi.fn();
const mockOnError = vi.fn();

const defaultProps = {
  roomCode: 'ABC123',
  isConnected: true,
  publishEvent: mockPublishEvent,
  onError: mockOnError,
};

describe('PlayerManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockState.players = [];
  });

  describe('Player Registration', () => {
    it('should display name input when player has not joined', () => {
      render(<PlayerManager {...defaultProps} />);
      
      expect(screen.getByLabelText(/enter your name/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /join room/i })).toBeInTheDocument();
    });

    it('should validate player name before joining', () => {
      render(<PlayerManager {...defaultProps} />);
      
      const joinButton = screen.getByRole('button', { name: /join room/i });
      
      // Should be disabled when name is empty
      expect(joinButton).toBeDisabled();
      
      // Enter a name
      const nameInput = screen.getByLabelText(/enter your name/i);
      fireEvent.change(nameInput, { target: { value: 'TestPlayer' } });
      
      expect(joinButton).toBeEnabled();
    });

    it('should enforce player count limits', () => {
      // Mock 10 players already in room
      mockState.players = Array.from({ length: 10 }, (_, i) => ({
        id: `player-${i}`,
        name: `Player ${i}`,
        role: 'resistance' as const,
        isReady: false,
        isConnected: true,
        isLeader: false,
      }));

      render(<PlayerManager {...defaultProps} />);
      
      const nameInput = screen.getByLabelText(/enter your name/i);
      fireEvent.change(nameInput, { target: { value: 'TestPlayer' } });
      
      const joinButton = screen.getByRole('button', { name: /join room/i });
      fireEvent.click(joinButton);
      
      expect(mockOnError).toHaveBeenCalledWith('Room is full (maximum 10 players)');
    });
  });

  describe('Connection Status', () => {
    it('should disable actions when disconnected', () => {
      render(<PlayerManager {...{ ...defaultProps, isConnected: false }} />);
      
      const joinButton = screen.getByRole('button', { name: /connecting.../i });
      expect(joinButton).toBeDisabled();
    });
  });

  describe('Core Functionality', () => {
    it('should call dispatch when joining room', () => {
      render(<PlayerManager {...defaultProps} />);
      
      const nameInput = screen.getByLabelText(/enter your name/i);
      fireEvent.change(nameInput, { target: { value: 'TestPlayer' } });
      
      const joinButton = screen.getByRole('button', { name: /join room/i });
      fireEvent.click(joinButton);
      
      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'ADD_PLAYER',
        payload: expect.objectContaining({
          name: 'TestPlayer',
          role: 'resistance',
          isReady: false,
          isConnected: true,
          isLeader: false,
        })
      });
    });

    it('should validate duplicate player names', () => {
      mockState.players = [{
        id: 'existing-player',
        name: 'TestPlayer',
        role: 'resistance' as const,
        isReady: false,
        isConnected: true,
        isLeader: false,
      }];

      render(<PlayerManager {...defaultProps} />);
      
      const nameInput = screen.getByLabelText(/enter your name/i);
      fireEvent.change(nameInput, { target: { value: 'TestPlayer' } });
      
      const joinButton = screen.getByRole('button', { name: /join room/i });
      fireEvent.click(joinButton);
      
      expect(mockOnError).toHaveBeenCalledWith('Player name already taken');
    });
  });
});