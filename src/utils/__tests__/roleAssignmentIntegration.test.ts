import { describe, it, expect } from 'vitest';
import { assignRoles } from '../gameLogic';
import { validateGameStart, validateRoleAssignment } from '../gameValidation';
import { Player, ROLE_DISTRIBUTION } from '../../types/game';

describe('Role Assignment Integration', () => {
  // Test role assignment for all valid player counts
  const playerCounts = [5, 6, 7, 8, 9, 10];

  playerCounts.forEach(count => {
    describe(`${count} players`, () => {
      let players: Player[];

      beforeEach(() => {
        players = Array.from({ length: count }, (_, i) => ({
          id: `player-${i + 1}`,
          name: `Player ${i + 1}`,
          role: 'resistance', // Will be overwritten by assignRoles
          isReady: true,
          isConnected: true,
          isLeader: false,
        }));
      });

      it('should validate game start conditions', () => {
        const validation = validateGameStart(players);
        expect(validation.isValid).toBe(true);
      });

      it('should assign correct role distribution', () => {
        const playersWithRoles = assignRoles(players);
        const expectedDistribution = ROLE_DISTRIBUTION[count];
        
        const resistanceCount = playersWithRoles.filter(p => p.role === 'resistance').length;
        const spyCount = playersWithRoles.filter(p => p.role === 'spy').length;
        
        expect(resistanceCount).toBe(expectedDistribution.resistance);
        expect(spyCount).toBe(expectedDistribution.spy);
      });

      it('should pass role assignment validation', () => {
        const playersWithRoles = assignRoles(players);
        const validation = validateRoleAssignment(playersWithRoles);
        expect(validation.isValid).toBe(true);
      });

      it('should maintain player identity after role assignment', () => {
        const playersWithRoles = assignRoles(players);
        
        // Check that all original players are still present
        expect(playersWithRoles).toHaveLength(count);
        
        // Check that player IDs and names are preserved
        players.forEach(originalPlayer => {
          const assignedPlayer = playersWithRoles.find(p => p.id === originalPlayer.id);
          expect(assignedPlayer).toBeDefined();
          expect(assignedPlayer!.name).toBe(originalPlayer.name);
          expect(assignedPlayer!.isReady).toBe(originalPlayer.isReady);
          expect(assignedPlayer!.isConnected).toBe(originalPlayer.isConnected);
        });
      });
    });
  });

  it('should produce different role assignments across multiple runs', () => {
    const players: Player[] = Array.from({ length: 5 }, (_, i) => ({
      id: `player-${i + 1}`,
      name: `Player ${i + 1}`,
      role: 'resistance',
      isReady: true,
      isConnected: true,
      isLeader: false,
    }));

    // Run role assignment multiple times
    const assignments: string[][] = [];
    for (let i = 0; i < 10; i++) {
      const playersWithRoles = assignRoles([...players]);
      const roleSequence = playersWithRoles.map(p => p.role);
      assignments.push(roleSequence);
    }

    // Check that we got at least some variation (not all assignments identical)
    const uniqueAssignments = new Set(assignments.map(a => a.join(',')));
    expect(uniqueAssignments.size).toBeGreaterThan(1);
  });

  it('should handle edge cases', () => {
    // Test with minimum players
    const minPlayers: Player[] = Array.from({ length: 5 }, (_, i) => ({
      id: `player-${i + 1}`,
      name: `Player ${i + 1}`,
      role: 'resistance',
      isReady: true,
      isConnected: true,
      isLeader: false,
    }));

    expect(() => assignRoles(minPlayers)).not.toThrow();
    
    // Test with maximum players
    const maxPlayers: Player[] = Array.from({ length: 10 }, (_, i) => ({
      id: `player-${i + 1}`,
      name: `Player ${i + 1}`,
      role: 'resistance',
      isReady: true,
      isConnected: true,
      isLeader: false,
    }));

    expect(() => assignRoles(maxPlayers)).not.toThrow();
  });

  it('should reject invalid player counts', () => {
    // Test with too few players
    const tooFewPlayers: Player[] = Array.from({ length: 4 }, (_, i) => ({
      id: `player-${i + 1}`,
      name: `Player ${i + 1}`,
      role: 'resistance',
      isReady: true,
      isConnected: true,
      isLeader: false,
    }));

    expect(() => assignRoles(tooFewPlayers)).toThrow('Invalid player count: 4');

    // Test with too many players
    const tooManyPlayers: Player[] = Array.from({ length: 11 }, (_, i) => ({
      id: `player-${i + 1}`,
      name: `Player ${i + 1}`,
      role: 'resistance',
      isReady: true,
      isConnected: true,
      isLeader: false,
    }));

    expect(() => assignRoles(tooManyPlayers)).toThrow('Invalid player count: 11');
  });
});