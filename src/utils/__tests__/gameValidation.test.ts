import { describe, it, expect } from 'vitest';
import {
  validateGameStart,
  validateTeamSelection,
  validateRoleAssignment,
  validatePlayerName,
  validateRoomCode,
  validateMissionVoting
} from '../gameValidation';
import { Player, GameState } from '../../types/game';

describe('gameValidation', () => {
  const mockPlayers: Player[] = [
    { id: '1', name: 'Alice', role: 'resistance', isReady: true, isConnected: true, isLeader: false },
    { id: '2', name: 'Bob', role: 'resistance', isReady: true, isConnected: true, isLeader: false },
    { id: '3', name: 'Charlie', role: 'resistance', isReady: true, isConnected: true, isLeader: false },
    { id: '4', name: 'David', role: 'spy', isReady: true, isConnected: true, isLeader: false },
    { id: '5', name: 'Eve', role: 'spy', isReady: true, isConnected: true, isLeader: false },
  ];

  const mockGameState: GameState = {
    roomCode: 'ABC123',
    phase: 'team-building',
    players: mockPlayers,
    currentLeader: '1',
    currentMission: 1,
    missionHistory: [],
    resistanceScore: 0,
    spyScore: 0,
    gameLog: [],
    selectedTeam: ['1', '2'],
    votingInProgress: false,
    missionInProgress: false,
  };

  describe('validateGameStart', () => {
    it('should allow game start with 5 ready players', () => {
      const result = validateGameStart(mockPlayers);
      expect(result.isValid).toBe(true);
    });

    it('should reject game start with less than 5 ready players', () => {
      const players = mockPlayers.slice(0, 4);
      const result = validateGameStart(players);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('At least 5 players must be ready');
    });

    it('should reject game start with more than 10 players', () => {
      const players = Array.from({ length: 11 }, (_, i) => ({
        id: `${i + 1}`,
        name: `Player${i + 1}`,
        role: 'resistance' as const,
        isReady: true,
        isConnected: true,
        isLeader: false,
      }));
      const result = validateGameStart(players);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Maximum 10 players allowed');
    });
  });

  describe('validateTeamSelection', () => {
    it('should validate correct team size for mission 1 with 5 players', () => {
      const result = validateTeamSelection(mockGameState);
      expect(result.isValid).toBe(true);
    });

    it('should reject incorrect team size', () => {
      const gameState = { ...mockGameState, selectedTeam: ['1'] }; // Only 1 player, need 2
      const result = validateTeamSelection(gameState);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('requires exactly 2 players');
    });
  });

  describe('validateRoleAssignment', () => {
    it('should validate correct role distribution for 5 players', () => {
      const result = validateRoleAssignment(mockPlayers);
      expect(result.isValid).toBe(true);
    });

    it('should reject incorrect role distribution', () => {
      const players = mockPlayers.map(p => ({ ...p, role: 'resistance' as const }));
      const result = validateRoleAssignment(players);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Expected 3 resistance members, got 5');
    });
  });

  describe('validatePlayerName', () => {
    it('should accept valid unique name', () => {
      const result = validatePlayerName('Frank', mockPlayers);
      expect(result.isValid).toBe(true);
    });

    it('should reject empty name', () => {
      const result = validatePlayerName('', mockPlayers);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('cannot be empty');
    });

    it('should reject duplicate name', () => {
      const result = validatePlayerName('Alice', mockPlayers);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('already taken');
    });

    it('should reject name too long', () => {
      const longName = 'a'.repeat(21);
      const result = validatePlayerName(longName, mockPlayers);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('cannot exceed 20 characters');
    });
  });

  describe('validateRoomCode', () => {
    it('should accept valid 6-character alphanumeric code', () => {
      const result = validateRoomCode('ABC123');
      expect(result.isValid).toBe(true);
    });

    it('should reject empty code', () => {
      const result = validateRoomCode('');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('cannot be empty');
    });

    it('should reject wrong length', () => {
      const result = validateRoomCode('ABC12');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('must be exactly 6 characters');
    });

    it('should reject invalid characters', () => {
      const result = validateRoomCode('abc123');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('uppercase letters and numbers');
    });
  });

  describe('validateMissionVoting', () => {
    it('should validate complete voting', () => {
      const votes = {
        '1': true,
        '2': false,
        '3': true,
        '4': false,
        '5': true,
      };
      const result = validateMissionVoting(votes, mockPlayers);
      expect(result.isValid).toBe(true);
    });

    it('should reject incomplete voting', () => {
      const votes = { '1': true, '2': false }; // Missing votes
      const result = validateMissionVoting(votes, mockPlayers);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Expected 5 votes, got 2');
    });
  });
});