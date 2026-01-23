import { Player, PlayerRole, ROLE_DISTRIBUTION, LogEntry, GameEvent } from '../types/game';

// Generate unique ID for players and log entries
export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Assign roles randomly to players (Requirements 4.1-4.7)
export function assignRoles(players: Player[]): Player[] {
  const playerCount = players.length;
  const distribution = ROLE_DISTRIBUTION[playerCount];
  
  if (!distribution) {
    throw new Error(`Invalid player count: ${playerCount}`);
  }
  
  // Create array of roles
  const roles: PlayerRole[] = [
    ...Array(distribution.resistance).fill('resistance'),
    ...Array(distribution.spy).fill('spy'),
  ];
  
  // Shuffle roles randomly (Fisher-Yates shuffle)
  for (let i = roles.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [roles[i], roles[j]] = [roles[j], roles[i]];
  }
  
  // Assign shuffled roles to players
  return players.map((player, index) => ({
    ...player,
    role: roles[index],
  }));
}

// Get next leader in alphabetical order (Requirements 9.1)
export function getNextLeader(players: Player[], currentLeader: string): string {
  const connectedPlayers = players
    .filter(p => p.isConnected)
    .sort((a, b) => a.name.localeCompare(b.name));
  
  if (connectedPlayers.length === 0) {
    throw new Error('No connected players available for leadership');
  }
  
  const currentIndex = connectedPlayers.findIndex(p => p.id === currentLeader);
  
  if (currentIndex === -1) {
    // Current leader not found, return first player alphabetically
    return connectedPlayers[0].id;
  }
  
  // Return next player in alphabetical order, wrapping around if necessary
  const nextIndex = (currentIndex + 1) % connectedPlayers.length;
  return connectedPlayers[nextIndex].id;
}

// Calculate voting result (Requirements 7.4, 7.5)
export function calculateVotingResult(votes: Record<string, boolean>): {
  approved: boolean;
  yesVotes: number;
  noVotes: number;
} {
  const voteValues = Object.values(votes);
  const yesVotes = voteValues.filter(vote => vote === true).length;
  const noVotes = voteValues.filter(vote => vote === false).length;
  
  return {
    approved: yesVotes > noVotes, // Majority required
    yesVotes,
    noVotes,
  };
}

// Calculate mission result (Requirements 8.5, 8.6)
export function calculateMissionResult(choices: Record<string, boolean>): {
  success: boolean;
  successChoices: number;
  failChoices: number;
} {
  const choiceValues = Object.values(choices);
  const successChoices = choiceValues.filter(choice => choice === true).length;
  const failChoices = choiceValues.filter(choice => choice === false).length;
  
  return {
    success: failChoices === 0, // All must choose success for mission to succeed
    successChoices,
    failChoices,
  };
}

// Check if game should end (Requirements 11.1, 11.2)
export function checkGameEnd(resistanceScore: number, spyScore: number): {
  gameEnded: boolean;
  winner?: 'resistance' | 'spy';
} {
  if (resistanceScore >= 3) {
    return { gameEnded: true, winner: 'resistance' };
  }
  
  if (spyScore >= 3) {
    return { gameEnded: true, winner: 'spy' };
  }
  
  return { gameEnded: false };
}

// Create log entry
export function createLogEntry(
  type: LogEntry['type'],
  message: string,
  data?: Record<string, any>
): LogEntry {
  return {
    id: generateId(),
    timestamp: Date.now(),
    type,
    message,
    data,
  };
}

// Filter visible roles for player (Requirements 5.4, 5.5)
export function getVisibleRoles(
  currentPlayer: Player,
  allPlayers: Player[]
): Record<string, PlayerRole | null> {
  const visibleRoles: Record<string, PlayerRole | null> = {};
  
  for (const player of allPlayers) {
    if (currentPlayer.role === 'spy') {
      // Spies can see all roles
      visibleRoles[player.id] = player.role;
    } else {
      // Resistance members can only see their own role
      visibleRoles[player.id] = player.id === currentPlayer.id ? player.role : null;
    }
  }
  
  return visibleRoles;
}

// Check if player can make mission choice (Requirements 8.2, 8.3)
export function canPlayerChooseFail(player: Player): boolean {
  return player.role === 'spy';
}

// Generate room code (Requirements 1.1)
export function generateRoomCode(): string {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

// Create game event
export function createGameEvent(
  type: GameEvent['type'],
  roomCode: string,
  playerId: string,
  data: Record<string, any> = {}
): GameEvent {
  return {
    type,
    roomCode,
    playerId,
    timestamp: Date.now(),
    data,
  };
}

// Sort players alphabetically for consistent ordering
export function sortPlayersAlphabetically(players: Player[]): Player[] {
  return [...players].sort((a, b) => a.name.localeCompare(b.name));
}