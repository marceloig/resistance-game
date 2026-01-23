// Core game types and interfaces for the Resistance Web Game

export type GamePhase = 
  | 'lobby'           // Players joining and getting ready
  | 'role-assignment' // Assigning roles to players
  | 'team-building'   // Mission leader selecting team
  | 'voting'          // Players voting on proposed team
  | 'mission'         // Selected players executing mission
  | 'mission-result'  // Showing mission outcome
  | 'game-end';       // Game completed, showing results

export type PlayerRole = 'resistance' | 'spy';

export type MissionOutcome = 'success' | 'failure' | 'pending';

export interface Player {
  id: string;
  name: string;
  role: PlayerRole;
  isReady: boolean;
  isConnected: boolean;
  isLeader: boolean;
}

export interface MissionResult {
  missionNumber: number;
  requiredPlayers: number;
  selectedPlayers: string[];
  votes: Record<string, boolean>; // playerId -> yes/no vote
  missionChoices: Record<string, boolean>; // playerId -> success/fail choice
  outcome: MissionOutcome;
  resistancePoints: number;
  spyPoints: number;
}

export interface Mission {
  number: number;
  requiredPlayers: number;
  selectedPlayers: string[];
  votes: Record<string, boolean>;
  results: Record<string, boolean>;
  outcome: MissionOutcome;
}

export interface LogEntry {
  id: string;
  timestamp: number;
  type: 'mission-start' | 'team-vote' | 'mission-complete' | 'leadership-change' | 'game-end';
  message: string;
  data?: Record<string, any>;
}

export interface GameState {
  roomCode: string;
  phase: GamePhase;
  players: Player[];
  currentLeader: string;
  currentMission: number;
  missionHistory: MissionResult[];
  resistanceScore: number;
  spyScore: number;
  gameLog: LogEntry[];
  // Additional state for current mission
  selectedTeam: string[];
  votingInProgress: boolean;
  missionInProgress: boolean;
}

// Event types for real-time communication
export type GameEventType = 
  | 'player-joined'
  | 'player-left'
  | 'player-ready'
  | 'game-started'
  | 'roles-assigned'
  | 'team-selected'
  | 'voting-started'
  | 'vote-cast'
  | 'voting-completed'
  | 'mission-started'
  | 'mission-choice-made'
  | 'mission-completed'
  | 'leadership-changed'
  | 'game-ended'
  | 'error-occurred';

export interface GameEvent {
  type: GameEventType;
  roomCode: string;
  playerId: string;
  timestamp: number;
  data: Record<string, any>;
}

// Mission requirements based on player count (from requirements)
export const MISSION_REQUIREMENTS: Record<number, number[]> = {
  5: [2, 3, 2, 3, 3],   // 5 players: missions require 2,3,2,3,3 players
  6: [2, 3, 4, 3, 4],   // 6 players: missions require 2,3,4,3,4 players
  7: [2, 3, 3, 4, 4],   // 7 players: missions require 2,3,3,4,4 players
  8: [3, 4, 4, 5, 5],   // 8 players: missions require 3,4,4,5,5 players
  9: [3, 4, 4, 5, 5],   // 9 players: missions require 3,4,4,5,5 players
  10: [3, 4, 4, 5, 5],  // 10 players: missions require 3,4,4,5,5 players
};

// Role distribution based on player count (from requirements 4.1-4.6)
export const ROLE_DISTRIBUTION: Record<number, { resistance: number; spy: number }> = {
  5: { resistance: 3, spy: 2 },
  6: { resistance: 4, spy: 2 },
  7: { resistance: 4, spy: 3 },
  8: { resistance: 5, spy: 3 },
  9: { resistance: 6, spy: 3 },
  10: { resistance: 6, spy: 4 },
};