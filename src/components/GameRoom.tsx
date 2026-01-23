import { useState, useEffect } from 'react';
import { useGame } from '../context/GameContext';
import { validateGameStart } from '../utils/gameValidation';
import { assignRoles, sortPlayersAlphabetically } from '../utils/gameLogic';
import { GameEvent } from '../types/game';
import { useEventManager } from './EventManager';
import { PlayerManager } from './PlayerManager';
import { GameBoard } from './GameBoard';
import { GameProgress } from './GameProgress';
import { MissionController } from './MissionController';
import { VotingController } from './VotingController';
import { MissionExecution } from './MissionExecution';

interface GameRoomProps {
  onLeaveRoom: () => void;
}

export function GameRoom({ onLeaveRoom }: GameRoomProps) {
  const { state, dispatch } = useGame();
  const [error, setError] = useState<string | null>(null);
  const [currentPlayerId, setCurrentPlayerId] = useState<string | null>(null);
  const [isRoomCreator, setIsRoomCreator] = useState(false);

  // Handle incoming game events
  const handleGameEvent = (event: GameEvent) => {
    console.log('GameRoom: Received event:', event.type, event);
    dispatch({ type: 'HANDLE_EVENT', payload: event });
    
    // Update current player ID when we join
    if (event.type === 'player-joined' && !currentPlayerId) {
      setCurrentPlayerId(event.data.playerId);
    }
  };

  // Set up event manager for real-time communication
  const { 
    isConnected, 
    error: connectionError, 
    publishEvent, 
    reconnectAttempts 
  } = useEventManager(
    state.roomCode, 
    currentPlayerId || '', 
    handleGameEvent
  );

  // Update error state when connection error occurs
  useEffect(() => {
    if (connectionError) {
      setError(connectionError);
    }
  }, [connectionError]);

  // Check if current player is the room creator (first player)
  useEffect(() => {
    if (state.players.length > 0 && currentPlayerId) {
      const sortedPlayers = sortPlayersAlphabetically(state.players);
      setIsRoomCreator(sortedPlayers[0].id === currentPlayerId);
    }
  }, [state.players, currentPlayerId]);

  const handleStartGame = async () => {
    setError(null);
    
    // Validate game can start
    const validation = validateGameStart(state.players);
    if (!validation.isValid) {
      setError(validation.error || 'Cannot start game');
      return;
    }

    // Assign roles to players
    const playersWithRoles = assignRoles(state.players);
    dispatch({ type: 'SET_PLAYERS', payload: playersWithRoles });

    // Set first leader (alphabetically first player)
    const sortedPlayers = sortPlayersAlphabetically(playersWithRoles);
    const firstLeader = sortedPlayers[0].id;
    dispatch({ type: 'SET_LEADER', payload: firstLeader });

    // Change phase to role assignment
    dispatch({ type: 'SET_PHASE', payload: 'role-assignment' });

    // Publish game started event with role assignments
    try {
      if (publishEvent) {
        const roleAssignments: Record<string, string> = {};
        playersWithRoles.forEach(player => {
          roleAssignments[player.id] = player.role;
        });

        await publishEvent({
          type: 'roles-assigned',
          data: {
            roles: roleAssignments,
            firstLeader
          }
        });
      }
    } catch (error) {
      console.error('Failed to publish roles-assigned event:', error);
      setError('Failed to start game');
    }
  };

  const readyPlayers = state.players.filter(p => p.isReady);
  const canStartGame = isRoomCreator && readyPlayers.length >= 5 && readyPlayers.length <= 10;
  const isPlayerJoined = state.players.some(p => p.id === currentPlayerId);

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2>Game Lobby</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Connection status indicator */}
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '5px',
            padding: '4px 8px',
            borderRadius: '4px',
            backgroundColor: isConnected ? '#e8f5e8' : '#ffebee',
            color: isConnected ? '#2e7d32' : '#c62828',
            fontSize: '12px'
          }}>
            <div style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: isConnected ? '#4caf50' : '#f44336'
            }} />
            {isConnected ? 'Connected' : reconnectAttempts > 0 ? `Reconnecting... (${reconnectAttempts})` : 'Disconnected'}
          </div>
          <button 
            onClick={onLeaveRoom}
            style={{ 
              padding: '8px 16px',
              backgroundColor: '#f44336',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Back to Home
          </button>
        </div>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <p><strong>Room Code:</strong> {state.roomCode}</p>
        <p><strong>Game Phase:</strong> {state.phase}</p>
      </div>

      {error && (
        <div style={{ 
          color: 'red', 
          backgroundColor: '#ffebee', 
          padding: '10px', 
          borderRadius: '4px',
          marginBottom: '15px'
        }}>
          {error}
        </div>
      )}

      {/* Player Management Component - Only show in lobby phase */}
      {state.phase === 'lobby' && (
        <PlayerManager 
          isConnected={isConnected}
          publishEvent={publishEvent}
          onError={setError}
        />
      )}

      {/* Game Progress - Show when game is in progress */}
      {state.phase !== 'lobby' && currentPlayerId && (
        <GameProgress currentPlayerId={currentPlayerId} />
      )}

      {/* Game Board - Show when game is in progress */}
      {state.phase !== 'lobby' && currentPlayerId && (
        <GameBoard currentPlayerId={currentPlayerId} />
      )}

      {/* Mission Controller - Show during team building phase */}
      {state.phase === 'team-building' && currentPlayerId && (
        <MissionController 
          currentPlayerId={currentPlayerId}
          isConnected={isConnected}
          publishEvent={publishEvent}
          onError={setError}
        />
      )}

      {/* Voting Controller - Show during voting phase */}
      {state.phase === 'voting' && currentPlayerId && (
        <VotingController 
          currentPlayerId={currentPlayerId}
          isConnected={isConnected}
          publishEvent={publishEvent}
          onError={setError}
        />
      )}

      {/* Mission Execution - Show during mission phase */}
      {state.phase === 'mission' && currentPlayerId && (
        <MissionExecution 
          currentPlayerId={currentPlayerId}
          isConnected={isConnected}
          publishEvent={publishEvent}
          onError={setError}
        />
      )}

      {/* Game Start Section - Only show if player is joined and is room creator and in lobby */}
      {isPlayerJoined && isRoomCreator && state.phase === 'lobby' && (
        <div style={{ marginTop: '20px' }}>
          <button 
            onClick={handleStartGame}
            disabled={!canStartGame}
            style={{ 
              width: '100%',
              padding: '12px',
              backgroundColor: canStartGame ? '#2196F3' : '#ccc',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: canStartGame ? 'pointer' : 'not-allowed',
              fontSize: '16px',
              fontWeight: 'bold'
            }}
          >
            {canStartGame ? 'Start Game' : `Need ${Math.max(0, 5 - readyPlayers.length)} more ready players`}
          </button>
        </div>
      )}

      {/* Game Rules */}
      <div style={{ 
        backgroundColor: '#e3f2fd', 
        padding: '15px', 
        borderRadius: '4px',
        fontSize: '14px',
        marginTop: '20px'
      }}>
        <h4 style={{ margin: '0 0 10px 0' }}>Game Rules:</h4>
        <ul style={{ margin: 0, paddingLeft: '20px' }}>
          <li>5-10 players required to start</li>
          <li>All players must be ready before starting</li>
          <li>Room creator can start the game</li>
          <li>Share the room code with friends to join</li>
        </ul>
      </div>
    </div>
  );
}