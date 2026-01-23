import { useState, useEffect } from 'react';
import { useGame } from '../context/GameContext';
import { validatePlayerName } from '../utils/gameValidation';
import { generateId, sortPlayersAlphabetically } from '../utils/gameLogic';
import { Player, GameEvent } from '../types/game';

interface PlayerManagerProps {
  isConnected: boolean;
  publishEvent?: (event: Omit<GameEvent, 'roomCode' | 'playerId' | 'timestamp'>) => Promise<void>;
  onError: (error: string) => void;
}

export function PlayerManager({ isConnected, publishEvent, onError }: PlayerManagerProps) {
  const { state, dispatch } = useGame();
  const [playerName, setPlayerName] = useState('');
  const [isJoined, setIsJoined] = useState(false);
  const [currentPlayerId, setCurrentPlayerId] = useState<string | null>(null);
  const [isRoomCreator, setIsRoomCreator] = useState(false);

  // Check if current player is the room creator (first player alphabetically)
  useEffect(() => {
    if (state.players.length > 0 && currentPlayerId) {
      const sortedPlayers = sortPlayersAlphabetically(state.players);
      setIsRoomCreator(sortedPlayers[0].id === currentPlayerId);
    }
  }, [state.players, currentPlayerId]);

  const handleJoinRoom = async () => {
    // Validate player name
    const nameValidation = validatePlayerName(playerName, state.players);
    if (!nameValidation.isValid) {
      onError(nameValidation.error || 'Invalid player name');
      return;
    }

    // Check room capacity (5-10 players as per requirements)
    if (state.players.length >= 10) {
      onError('Room is full (maximum 10 players)');
      return;
    }

    // Create new player
    const playerId = generateId();
    const newPlayer: Player = {
      id: playerId,
      name: playerName.trim(),
      role: 'resistance', // Will be assigned later during game start
      isReady: false,
      isConnected: true,
      isLeader: false,
    };

    // Add player to local game state
    dispatch({ type: 'ADD_PLAYER', payload: newPlayer });
    setCurrentPlayerId(playerId);
    setIsJoined(true);

    // Publish player joined event to other players
    try {
      if (publishEvent) {
        await publishEvent({
          type: 'player-joined',
          data: {
            playerId,
            playerName: playerName.trim()
          }
        });
      }
    } catch (error) {
      console.error('Failed to publish player-joined event:', error);
      onError('Failed to join room');
    }
  };

  const handleToggleReady = async () => {
    if (!currentPlayerId) return;

    const currentPlayer = state.players.find(p => p.id === currentPlayerId);
    if (!currentPlayer) return;

    const newReadyState = !currentPlayer.isReady;

    // Update local state
    dispatch({
      type: 'UPDATE_PLAYER',
      payload: {
        playerId: currentPlayerId,
        updates: { isReady: newReadyState }
      }
    });

    // Publish ready state change event
    try {
      if (publishEvent) {
        await publishEvent({
          type: 'player-ready',
          data: {
            playerId: currentPlayerId,
            isReady: newReadyState
          }
        });
      }
    } catch (error) {
      console.error('Failed to publish player-ready event:', error);
      onError('Failed to update ready status');
    }
  };

  const handleLeaveRoom = async () => {
    if (currentPlayerId) {
      // Publish player left event
      try {
        if (publishEvent) {
          await publishEvent({
            type: 'player-left',
            data: {
              playerId: currentPlayerId
            }
          });
        }
      } catch (error) {
        console.error('Failed to publish player-left event:', error);
      }

      // Remove from local state
      dispatch({ type: 'REMOVE_PLAYER', payload: currentPlayerId });
    }
    
    setIsJoined(false);
    setCurrentPlayerId(null);
    setPlayerName('');
  };

  const currentPlayer = state.players.find(p => p.id === currentPlayerId);
  const readyPlayers = state.players.filter(p => p.isReady);

  if (!isJoined) {
    return (
      <div style={{ marginBottom: '20px' }}>
        <h3>Join Room</h3>
        <div style={{ marginBottom: '15px' }}>
          <label htmlFor="playerName" style={{ display: 'block', marginBottom: '5px' }}>
            Enter your name:
          </label>
          <input
            id="playerName"
            type="text"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            placeholder="Your name"
            maxLength={20}
            style={{ 
              width: '100%', 
              padding: '8px', 
              borderRadius: '4px', 
              border: '1px solid #ccc' 
            }}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleJoinRoom();
              }
            }}
          />
        </div>

        <button 
          onClick={handleJoinRoom}
          disabled={!playerName.trim() || !isConnected}
          style={{ 
            width: '100%',
            padding: '10px',
            backgroundColor: (playerName.trim() && isConnected) ? '#4CAF50' : '#ccc',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: (playerName.trim() && isConnected) ? 'pointer' : 'not-allowed'
          }}
        >
          {!isConnected ? 'Connecting...' : 'Join Room'}
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Player Status Section */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <h3>Your Status</h3>
          <button 
            onClick={handleLeaveRoom}
            style={{ 
              padding: '6px 12px',
              backgroundColor: '#f44336',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px'
            }}
          >
            Leave Room
          </button>
        </div>
        
        <div style={{ 
          padding: '10px', 
          backgroundColor: '#f5f5f5', 
          borderRadius: '4px',
          marginBottom: '10px'
        }}>
          <p style={{ margin: '0 0 5px 0' }}>
            <strong>Name:</strong> {currentPlayer?.name}
            {isRoomCreator && ' (Room Creator)'}
          </p>
          <p style={{ margin: 0 }}>
            <strong>Status:</strong> 
            <span style={{ 
              marginLeft: '5px',
              color: currentPlayer?.isReady ? 'green' : 'orange',
              fontWeight: 'bold'
            }}>
              {currentPlayer?.isReady ? '✓ Ready' : '⏳ Not Ready'}
            </span>
          </p>
        </div>

        <button 
          onClick={handleToggleReady}
          disabled={!isConnected}
          style={{ 
            width: '100%',
            padding: '10px',
            backgroundColor: !isConnected ? '#ccc' : (currentPlayer?.isReady ? '#ff9800' : '#4CAF50'),
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: isConnected ? 'pointer' : 'not-allowed'
          }}
        >
          {!isConnected ? 'Disconnected' : (currentPlayer?.isReady ? 'Not Ready' : 'Ready')}
        </button>
      </div>

      {/* Players List Section */}
      <div style={{ marginBottom: '20px' }}>
        <h3>Players in Room ({state.players.length}/10)</h3>
        <div style={{ 
          border: '1px solid #ccc', 
          borderRadius: '4px', 
          padding: '10px',
          backgroundColor: '#f9f9f9',
          maxHeight: '200px',
          overflowY: 'auto'
        }}>
          {state.players.length === 0 ? (
            <p style={{ margin: 0, fontStyle: 'italic', textAlign: 'center' }}>
              No players in room
            </p>
          ) : (
            <ul style={{ margin: 0, paddingLeft: '20px' }}>
              {sortPlayersAlphabetically(state.players).map((player, index) => (
                <li key={player.id} style={{ marginBottom: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: player.id === currentPlayerId ? 'bold' : 'normal' }}>
                      {player.name}
                      {index === 0 && ' (Creator)'}
                      {player.id === currentPlayerId && ' (You)'}
                    </span>
                    <span style={{ 
                      color: player.isReady ? 'green' : 'orange',
                      fontWeight: 'bold',
                      fontSize: '12px'
                    }}>
                      {player.isReady ? '✓ Ready' : '⏳ Not Ready'}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
        
        <div style={{ 
          marginTop: '10px', 
          padding: '8px', 
          backgroundColor: '#e8f5e8', 
          borderRadius: '4px',
          fontSize: '14px'
        }}>
          <strong>Ready Players:</strong> {readyPlayers.length}/{state.players.length}
          {readyPlayers.length >= 5 && readyPlayers.length <= 10 && (
            <span style={{ color: 'green', marginLeft: '10px' }}>
              ✓ Enough players to start!
            </span>
          )}
          {readyPlayers.length < 5 && (
            <span style={{ color: 'orange', marginLeft: '10px' }}>
              Need {5 - readyPlayers.length} more ready players
            </span>
          )}
        </div>
      </div>
    </div>
  );
}