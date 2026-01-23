import { GameState, GamePhase, Player, MISSION_REQUIREMENTS, ROLE_DISTRIBUTION } from '../types/game';

// Validation result type
export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

// Validate if game can start (Requirements 3.1)
export function validateGameStart(players: Player[]): ValidationResult {
  const readyPlayers = players.filter(p => p.isReady && p.isConnected);
  
  if (readyPlayers.length < 5) {
    return {
      isValid: false,
      error: 'At least 5 players must be ready to start the game',
    };
  }
  
  if (readyPlayers.length > 10) {
    return {
      isValid: false,
      error: 'Maximum 10 players allowed in a game',
    };
  }
  
  return { isValid: true };
}

// Validate phase transition
export function validatePhaseTransition(
  currentPhase: GamePhase, 
  nextPhase: GamePhase, 
  gameState: GameState
): ValidationResult {
  const validTransitions: Record<GamePhase, GamePhase[]> = {
    'lobby': ['role-assignment'],
    'role-assignment': ['team-building'],
    'team-building': ['voting'],
    'voting': ['team-building', 'mission'], // Can go back to team-building if vote fails
    'mission': ['mission-result'],
    'mission-result': ['team-building', 'game-end'], // Next mission or game end
    'game-end': ['lobby'], // Can restart
  };

  if (!validTransitions[currentPhase].includes(nextPhase)) {
    return {
      isValid: false,
      error: `Invalid phase transition from ${currentPhase} to ${nextPhase}`,
    };
  }

  // Additional validation based on specific transitions
  switch (nextPhase) {
    case 'role-assignment':
      return validateGameStart(gameState.players);
    
    case 'voting':
      return validateTeamSelection(gameState);
    
    case 'mission':
      return validateVotingComplete(gameState);
    
    case 'game-end':
      return validateGameEnd(gameState);
    
    default:
      return { isValid: true };
  }
}

// Validate team selection for mission (Requirements 6.4, 6.5)
export function validateTeamSelection(gameState: GameState): ValidationResult {
  const { players, selectedTeam, currentMission } = gameState;
  const playerCount = players.length;
  
  if (!MISSION_REQUIREMENTS[playerCount]) {
    return {
      isValid: false,
      error: `Invalid player count: ${playerCount}`,
    };
  }
  
  const requiredPlayers = MISSION_REQUIREMENTS[playerCount][currentMission - 1];
  
  if (selectedTeam.length !== requiredPlayers) {
    return {
      isValid: false,
      error: `Mission ${currentMission} requires exactly ${requiredPlayers} players, but ${selectedTeam.length} selected`,
    };
  }
  
  // Validate all selected players exist and are connected
  for (const playerId of selectedTeam) {
    const player = players.find(p => p.id === playerId);
    if (!player) {
      return {
        isValid: false,
        error: `Selected player ${playerId} not found`,
      };
    }
    if (!player.isConnected) {
      return {
        isValid: false,
        error: `Selected player ${player.name} is not connected`,
      };
    }
  }
  
  return { isValid: true };
}

// Validate voting is complete
export function validateVotingComplete(gameState: GameState): ValidationResult {
  const { players } = gameState;
  const connectedPlayers = players.filter(p => p.isConnected);
  
  // In a real implementation, we would check if all players have voted
  // For now, we'll assume voting is complete if we're transitioning to mission phase
  if (connectedPlayers.length === 0) {
    return {
      isValid: false,
      error: 'No connected players to validate voting',
    };
  }
  
  return { isValid: true };
}

// Validate game end conditions (Requirements 11.1, 11.2)
export function validateGameEnd(gameState: GameState): ValidationResult {
  const { resistanceScore, spyScore } = gameState;
  
  if (resistanceScore >= 3 || spyScore >= 3) {
    return { isValid: true };
  }
  
  return {
    isValid: false,
    error: 'Game cannot end until one team reaches 3 points',
  };
}

// Validate role assignment (Requirements 4.1-4.6)
export function validateRoleAssignment(players: Player[]): ValidationResult {
  const playerCount = players.length;
  
  if (!ROLE_DISTRIBUTION[playerCount]) {
    return {
      isValid: false,
      error: `Invalid player count for role assignment: ${playerCount}`,
    };
  }
  
  const expectedDistribution = ROLE_DISTRIBUTION[playerCount];
  const actualResistance = players.filter(p => p.role === 'resistance').length;
  const actualSpies = players.filter(p => p.role === 'spy').length;
  
  if (actualResistance !== expectedDistribution.resistance) {
    return {
      isValid: false,
      error: `Expected ${expectedDistribution.resistance} resistance members, got ${actualResistance}`,
    };
  }
  
  if (actualSpies !== expectedDistribution.spy) {
    return {
      isValid: false,
      error: `Expected ${expectedDistribution.spy} spies, got ${actualSpies}`,
    };
  }
  
  return { isValid: true };
}

// Validate player name
export function validatePlayerName(name: string, existingPlayers: Player[]): ValidationResult {
  if (!name || name.trim().length === 0) {
    return {
      isValid: false,
      error: 'Player name cannot be empty',
    };
  }
  
  if (name.trim().length > 20) {
    return {
      isValid: false,
      error: 'Player name cannot exceed 20 characters',
    };
  }
  
  if (existingPlayers.some(p => p.name.toLowerCase() === name.trim().toLowerCase())) {
    return {
      isValid: false,
      error: 'Player name already taken',
    };
  }
  
  return { isValid: true };
}

// Validate room code format (Requirements 1.1)
export function validateRoomCode(roomCode: string): ValidationResult {
  if (!roomCode) {
    return {
      isValid: false,
      error: 'Room code cannot be empty',
    };
  }
  
  if (roomCode.length !== 6) {
    return {
      isValid: false,
      error: 'Room code must be exactly 6 characters',
    };
  }
  
  if (!/^[A-Z0-9]+$/.test(roomCode)) {
    return {
      isValid: false,
      error: 'Room code must contain only uppercase letters and numbers',
    };
  }
  
  return { isValid: true };
}

// Validate mission voting (Requirements 7.4, 7.5)
export function validateMissionVoting(
  votes: Record<string, boolean>, 
  players: Player[]
): ValidationResult {
  const connectedPlayers = players.filter(p => p.isConnected);
  const voteCount = Object.keys(votes).length;
  
  if (voteCount !== connectedPlayers.length) {
    return {
      isValid: false,
      error: `Expected ${connectedPlayers.length} votes, got ${voteCount}`,
    };
  }
  
  // Validate all voters are connected players
  for (const playerId of Object.keys(votes)) {
    if (!connectedPlayers.find(p => p.id === playerId)) {
      return {
        isValid: false,
        error: `Vote from unknown or disconnected player: ${playerId}`,
      };
    }
  }
  
  return { isValid: true };
}