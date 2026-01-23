import { useState, useEffect } from 'react';
import { testBackendConnectivity } from './test-backend';
import { useGame } from './context/GameContext';
import { generateRoomCode } from './utils/gameLogic';

function Home() {
  const [backendStatus, setBackendStatus] = useState<'testing' | 'connected' | 'failed'>('testing');
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
    const newRoomCode = generateRoomCode();
    dispatch({ type: 'SET_ROOM_CODE', payload: newRoomCode });
    console.log('New game created with room code:', newRoomCode);
  };

  return (
    <main>
      <h1>Resistance Game</h1>
      
      <div style={{ marginBottom: '20px' }}>
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

      <div style={{ marginBottom: '20px' }}>
        <h3>Room Code: {state.roomCode}</h3>
        <p>Game Phase: {state.phase}</p>
        <p>Players: {state.players.length}</p>
      </div>

      <button onClick={handleNewGame}>New Game</button>
      <button style={{ marginLeft: '10px' }}>Join Game</button>
    </main>
  )
}

export default Home