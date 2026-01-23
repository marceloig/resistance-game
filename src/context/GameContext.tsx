import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { GameState, GameEvent, Player, LogEntry, GamePhase, MissionResult } from '../types/game';

// Initial game state
const initialGameState: GameState = {
  roomCode: '',
  phase: 'lobby',
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

// Action types for the reducer
export type GameAction = 
  | { type: 'SET_ROOM_CODE'; payload: string }
  | { type: 'SET_PHASE'; payload: GamePhase }
  | { type: 'ADD_PLAYER'; payload: Player }
  | { type: 'REMOVE_PLAYER'; payload: string }
  | { type: 'UPDATE_PLAYER'; payload: { playerId: string; updates: Partial<Player> } }
  | { type: 'SET_PLAYERS'; payload: Player[] }
  | { type: 'SET_LEADER'; payload: string }
  | { type: 'SET_SELECTED_TEAM'; payload: string[] }
  | { type: 'SET_VOTING_IN_PROGRESS'; payload: boolean }
  | { type: 'SET_MISSION_IN_PROGRESS'; payload: boolean }
  | { type: 'ADD_MISSION_RESULT'; payload: MissionResult }
  | { type: 'UPDATE_SCORES'; payload: { resistanceScore: number; spyScore: number } }
  | { type: 'ADD_LOG_ENTRY'; payload: LogEntry }
  | { type: 'RESET_GAME' }
  | { type: 'HANDLE_EVENT'; payload: GameEvent };

// Game reducer function
function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'SET_ROOM_CODE':
      return { ...state, roomCode: action.payload };
    
    case 'SET_PHASE':
      return { ...state, phase: action.payload };
    
    case 'ADD_PLAYER':
      return {
        ...state,
        players: [...state.players, action.payload],
      };
    
    case 'REMOVE_PLAYER':
      return {
        ...state,
        players: state.players.filter(p => p.id !== action.payload),
      };
    
    case 'UPDATE_PLAYER':
      return {
        ...state,
        players: state.players.map(p => 
          p.id === action.payload.playerId 
            ? { ...p, ...action.payload.updates }
            : p
        ),
      };
    
    case 'SET_PLAYERS':
      return { ...state, players: action.payload };
    
    case 'SET_LEADER':
      return {
        ...state,
        currentLeader: action.payload,
        players: state.players.map(p => ({
          ...p,
          isLeader: p.id === action.payload,
        })),
      };
    
    case 'SET_SELECTED_TEAM':
      return { ...state, selectedTeam: action.payload };
    
    case 'SET_VOTING_IN_PROGRESS':
      return { ...state, votingInProgress: action.payload };
    
    case 'SET_MISSION_IN_PROGRESS':
      return { ...state, missionInProgress: action.payload };
    
    case 'ADD_MISSION_RESULT':
      return {
        ...state,
        missionHistory: [...state.missionHistory, action.payload],
        currentMission: state.currentMission + 1,
      };
    
    case 'UPDATE_SCORES':
      return {
        ...state,
        resistanceScore: action.payload.resistanceScore,
        spyScore: action.payload.spyScore,
      };
    
    case 'ADD_LOG_ENTRY':
      return {
        ...state,
        gameLog: [...state.gameLog, action.payload],
      };
    
    case 'RESET_GAME':
      return {
        ...initialGameState,
        roomCode: state.roomCode, // Keep the room code
        players: state.players.map(p => ({ // Keep players but reset their state
          ...p,
          role: 'resistance', // Will be reassigned
          isReady: false,
          isLeader: false,
        })),
      };
    
    case 'HANDLE_EVENT':
      // Handle incoming game events and update state accordingly
      return handleGameEvent(state, action.payload);
    
    default:
      return state;
  }
}

// Handle incoming game events
function handleGameEvent(state: GameState, event: GameEvent): GameState {
  switch (event.type) {
    case 'player-joined':
      // Add new player if not already present
      if (!state.players.find(p => p.id === event.data.playerId)) {
        const newPlayer: Player = {
          id: event.data.playerId,
          name: event.data.playerName,
          role: 'resistance',
          isReady: false,
          isConnected: true,
          isLeader: false,
        };
        return {
          ...state,
          players: [...state.players, newPlayer],
        };
      }
      return state;
    
    case 'player-left':
      return {
        ...state,
        players: state.players.filter(p => p.id !== event.data.playerId),
      };
    
    case 'player-ready':
      return {
        ...state,
        players: state.players.map(p => 
          p.id === event.data.playerId 
            ? { ...p, isReady: event.data.isReady }
            : p
        ),
      };
    
    case 'roles-assigned':
      return {
        ...state,
        phase: 'team-building',
        players: state.players.map(p => ({
          ...p,
          role: event.data.roles[p.id] || 'resistance',
        })),
        currentLeader: event.data.firstLeader,
      };
    
    case 'leadership-changed':
      return {
        ...state,
        currentLeader: event.data.newLeader,
        players: state.players.map(p => ({
          ...p,
          isLeader: p.id === event.data.newLeader,
        })),
      };
    
    default:
      return state;
  }
}

// Context type
interface GameContextType {
  state: GameState;
  dispatch: React.Dispatch<GameAction>;
}

// Create context
const GameContext = createContext<GameContextType | undefined>(undefined);

// Provider component
interface GameProviderProps {
  children: ReactNode;
}

export function GameProvider({ children }: GameProviderProps) {
  const [state, dispatch] = useReducer(gameReducer, initialGameState);

  return (
    <GameContext.Provider value={{ state, dispatch }}>
      {children}
    </GameContext.Provider>
  );
}

// Custom hook to use game context
export function useGame() {
  const context = useContext(GameContext);
  if (context === undefined) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
}