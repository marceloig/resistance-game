import { useState, useEffect } from 'react';
import { testBackendConnectivity, generateRoomCode } from './test-backend';

function Home() {
  const [backendStatus, setBackendStatus] = useState<'testing' | 'connected' | 'failed'>('testing');
  const [roomCode, setRoomCode] = useState<string>('');

  useEffect(() => {
    // Generate room code on load
    setRoomCode(generateRoomCode());
    
    // Test backend connectivity
    testBackendConnectivity()
      .then((success) => {
        setBackendStatus(success ? 'connected' : 'failed');
      })
      .catch(() => {
        setBackendStatus('failed');
      });
  }, []);

  const handleNewGame = () => {
    const newRoomCode = generateRoomCode();
    setRoomCode(newRoomCode);
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
        <h3>Room Code: {roomCode}</h3>
      </div>

      <button onClick={handleNewGame}>New Game</button>
      <button style={{ marginLeft: '10px' }}>Join Game</button>
    </main>
  )
}

export default Home