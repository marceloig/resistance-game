import { describe, it, expect } from 'vitest';
import { 
  assignRoles, 
  getNextLeader, 
  calculateVotingResult, 
  calculateMissionResult,
  checkGameEnd,
  generateRoomCode,
  canPlayerChooseFail
} from '../gameLogic';
import { Player } from '../../types/game';

describe('gameLogic', () => {
  const mockPlayers: Player[] = [
    { id: '1', name: 'Alice', role: 'resistance', isReady: true, isConnected: true, isLeader: false },
    { id: '2', name: 'Bob', role: 'resistance', isReady: true, isConnected: true, isLeader: false },
    { id: '3', name: 'Charlie', role: 'resistance', isReady: true, isConnected: true, isLeader: false },
    { id: '4', name: 'David', role: 'spy', isReady: true, isConnected: true, isLeader: false },
    { id: '5', name: 'Eve', role: 'spy', isReady: true, isConnected: true, isLeader: false },
  ];

  describe('assignRoles', () => {
    it('should assign correct number of roles for 5 players', () => {
      const players = mockPlayers.slice(0, 5);
      const assigned = assignRoles(players);
      
      const resistanceCount = assigned.filter(p => p.role === 'resistance').length;
      const spyCount = assigned.filter(p => p.role === 'spy').length;
      
      expect(resistanceCount).toBe(3);
      expect(spyCount).toBe(2);
    });
  });

  describe('getNextLeader', () => {
    it('should return next leader in alphabetical order', () => {
      const nextLeader = getNextLeader(mockPlayers, '1'); // Alice is current
      expect(nextLeader).toBe('2'); // Bob should be next
    });

    it('should wrap around to first player', () => {
      const nextLeader = getNextLeader(mockPlayers, '5'); // Eve is current
      expect(nextLeader).toBe('1'); // Alice should be next (wrap around)
    });
  });

  describe('calculateVotingResult', () => {
    it('should approve when majority votes yes', () => {
      const votes = { '1': true, '2': true, '3': false };
      const result = calculateVotingResult(votes);
      
      expect(result.approved).toBe(true);
      expect(result.yesVotes).toBe(2);
      expect(result.noVotes).toBe(1);
    });

    it('should reject when majority votes no', () => {
      const votes = { '1': false, '2': false, '3': true };
      const result = calculateVotingResult(votes);
      
      expect(result.approved).toBe(false);
      expect(result.yesVotes).toBe(1);
      expect(result.noVotes).toBe(2);
    });
  });

  describe('calculateMissionResult', () => {
    it('should succeed when all choose success', () => {
      const choices = { '1': true, '2': true, '3': true };
      const result = calculateMissionResult(choices);
      
      expect(result.success).toBe(true);
      expect(result.successChoices).toBe(3);
      expect(result.failChoices).toBe(0);
    });

    it('should fail when any choose fail', () => {
      const choices = { '1': true, '2': false, '3': true };
      const result = calculateMissionResult(choices);
      
      expect(result.success).toBe(false);
      expect(result.successChoices).toBe(2);
      expect(result.failChoices).toBe(1);
    });
  });

  describe('checkGameEnd', () => {
    it('should end game when resistance reaches 3 points', () => {
      const result = checkGameEnd(3, 1);
      expect(result.gameEnded).toBe(true);
      expect(result.winner).toBe('resistance');
    });

    it('should end game when spies reach 3 points', () => {
      const result = checkGameEnd(1, 3);
      expect(result.gameEnded).toBe(true);
      expect(result.winner).toBe('spy');
    });

    it('should not end game when neither team reaches 3 points', () => {
      const result = checkGameEnd(2, 2);
      expect(result.gameEnded).toBe(false);
      expect(result.winner).toBeUndefined();
    });
  });

  describe('generateRoomCode', () => {
    it('should generate 6-character alphanumeric code', () => {
      const code = generateRoomCode();
      expect(code).toHaveLength(6);
      expect(code).toMatch(/^[A-Z0-9]+$/);
    });
  });

  describe('canPlayerChooseFail', () => {
    it('should allow spies to choose fail', () => {
      const spy = mockPlayers.find(p => p.role === 'spy')!;
      expect(canPlayerChooseFail(spy)).toBe(true);
    });

    it('should not allow resistance to choose fail', () => {
      const resistance = mockPlayers.find(p => p.role === 'resistance')!;
      expect(canPlayerChooseFail(resistance)).toBe(false);
    });
  });
});