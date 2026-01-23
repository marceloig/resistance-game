import { useState, useEffect } from 'react';
import { testBackendConnectivity } from './test-backend';
import { useGame } from './context/GameContext';
import { generateRoomCode } from './utils/gameLogic';
import { validateRoomCode } from './utils/gameValidation';
import { GameRoom } from './components/GameRoom';

function Home() {
  const [backendStatus, setBackendStatus] = useState<'testing' | 'connected' | 'failed'>('testing');
  const [currentView, setCurrentView] = useState<'home' | 'room'>('home');
  const [joinRoomCode, setJoinRoomCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const { state, dispatch } = useGame();

  useEffect(() => {
    // Generate room code on load
    const roomCode = generateRoomCode();
    dispatch({ type: 'SET_ROOM_CODE', payload: roomCode });
    
    // Test backend connectivity
    testBackendConnectivity()
      .then((success) => {
        setBackendStatus(success ? 'connected' : 'failed');
      })
      .catch(() => {
        setBackendStatus('failed');
      });
  }, [dispatch]);

  const handleNewGame = () => {
    setError(null);
    const newRoomCode = generateRoomCode();
    dispatch({ type: 'SET_ROOM_CODE', payload: newRoomCode });
    dispatch({ type: 'SET_PHASE', payload: 'lobby' });
    dispatch({ type: 'SET_PLAYERS', payload: [] }); // Clear any existing players
    setCurrentView('room');
    console.log('New game created with room code:', newRoomCode);
  };

  const handleJoinGame = () => {
    setError(null);
    
    // Validate room code format
    const validation = validateRoomCode(joinRoomCode.toUpperCase());
    if (!validation.isValid) {
      setError(validation.error || 'Invalid room code');
      return;
    }

    // In a real implementation, we would check if the room exists on the server
    // For now, we'll simulate room existence validation
    const normalizedCode = joinRoomCode.toUpperCase();
    
    // Simple validation: room code should be different from current generated code
    // In real implementation, this would be a server call
    if (normalizedCode === state.roomCode) {
      // Allow joining own room for testing
      dispatch({ type: 'SET_ROOM_CODE', payload: normalizedCode });
      dispatch({ type: 'SET_PHASE', payload: 'lobby' });
      setCurrentView('room');
      setJoinRoomCode('');
      return;
    }

    // For demo purposes, accept any valid format room code
    // In production, this would validate against server
    dispatch({ type: 'SET_ROOM_CODE', payload: normalizedCode });
    dispatch({ type: 'SET_PHASE', payload: 'lobby' });
    dispatch({ type: 'SET_PLAYERS', payload: [] }); // Start with empty player list
    setCurrentView('room');
    setJoinRoomCode('');
  };

  const handleLeaveRoom = () => {
    setCurrentView('home');
    setError(null);
    // Reset game state but keep the original room code
    dispatch({ type: 'SET_PHASE', payload: 'lobby' });
    dispatch({ type: 'SET_PLAYERS', payload: [] });
  };

  if (currentView === 'room') {
    return <GameRoom onLeaveRoom={handleLeaveRoom} />;
  }

  return (
    <main style={{ padding: '20px', maxWidth: '500px', margin: '0 auto' }}>
      <h1 style={{ textAlign: 'center', marginBottom: '30px' }}>Resistance Game</h1>
      
      <div style={{ marginBottom: '30px', textAlign: 'center' }}>
        <h3>Backend Status: 
          <span style={{ 
            color: backendStatus === 'connected' ? 'green' : 
                   backendStatus === 'failed' ? 'red' : 'orange' 
          }}>
            {backendStatus === 'testing' ? 'Testing...' : 
             backendStatus === 'connected' ? 'Connected' : 'Failed'}
          </span>
        </h3>
      </div>

      {error && (
        <div style={{ 
          color: 'red', 
          backgroundColor: '#ffebee', 
          padding: '15px', 
          borderRadius: '4px',
          marginBottom: '20px',
          textAlign: 'center'
        }}>
          {error}
        </div>
      )}

      <div style={{ marginBottom: '30px' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '15px' }}>Create New Game</h2>
        <div style={{ 
          backgroundColor: '#f5f5f5', 
          padding: '20px', 
          borderRadius: '8px',
          textAlign: 'center',
          marginBottom: '15px'
        }}>
          <p style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#666' }}>
            Your room code:
          </p>
          <p style={{ 
            margin: '0 0 15px 0', 
            fontSize: '24px', 
            fontWeight: 'bold',
            fontFamily: 'monospace',
            letterSpacing: '2px'
          }}>
            {state.roomCode}
          </p>
          <button 
            onClick={handleNewGame}
            style={{ 
              width: '100%',
              padding: '12px',
              backgroundColor: '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              fontSize: '16px',
              cursor: 'pointer'
            }}
          >
            Create New Game
          </button>
        </div>
      </div>

      <div style={{ marginBottom: '30px' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '15px' }}>Join Existing Game</h2>
        <div style={{ 
          backgroundColor: '#f5f5f5', 
          padding: '20px', 
          borderRadius: '8px'
        }}>
          <div style={{ marginBottom: '15px' }}>
            <label htmlFor="joinCode" style={{ display: 'block', marginBottom: '5px' }}>
              Enter room code:
            </label>
            <input
              id="joinCode"
              type="text"
              value={joinRoomCode}
              onChange={(e) => setJoinRoomCode(e.target.value.toUpperCase())}
              placeholder="ABC123"
              maxLength={6}
              style={{ 
                width: '100%', 
                padding: '12px', 
                borderRadius: '4px', 
                border: '1px solid #ccc',
                fontSize: '16px',
                fontFamily: 'monospace',
                letterSpacing: '2px',
                textAlign: 'center'
              }}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleJoinGame();
                }
              }}
            />
          </div>
          <button 
            onClick={handleJoinGame}
            disabled={joinRoomCode.length !== 6}
            style={{ 
              width: '100%',
              padding: '12px',
              backgroundColor: joinRoomCode.length === 6 ? '#2196F3' : '#ccc',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              fontSize: '16px',
              cursor: joinRoomCode.length === 6 ? 'pointer' : 'not-allowed'
            }}
          >
            Join Game
          </button>
        </div>
      </div>

      <div style={{ 
        backgroundColor: '#e3f2fd', 
        padding: '20px', 
        borderRadius: '8px',
        fontSize: '14px'
      }}>
        <h3 style={{ margin: '0 0 15px 0', textAlign: 'center' }}>How to Play</h3>
        <ul style={{ margin: 0, paddingLeft: '20px' }}>
          <li style={{ marginBottom: '8px' }}>Create a new game to get a room code</li>
          <li style={{ marginBottom: '8px' }}>Share the room code with 4-9 friends</li>
          <li style={{ marginBottom: '8px' }}>Everyone joins using the same room code</li>
          <li style={{ marginBottom: '8px' }}>When ready, the room creator starts the game</li>
          <li>Work together as Resistance or secretly sabotage as Spies!</li>
        </ul>
      </div>
    </main>
  )
}

export default Home