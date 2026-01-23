import { useGame } from '../context/GameContext';
import { Player } from '../types/game';

interface GameBoardProps {
  currentPlayerId: string;
}

export function GameBoard({ currentPlayerId }: GameBoardProps) {
  const { state } = useGame();
  
  // Get current player to determine role visibility
  const currentPlayer = state.players.find(p => p.id === currentPlayerId);
  const isCurrentPlayerSpy = currentPlayer?.role === 'spy';
  
  // Calculate positions for oval layout
  const getPlayerPosition = (index: number, total: number) => {
    const angle = (index / total) * 2 * Math.PI - Math.PI / 2; // Start from top
    const radiusX = 200; // Horizontal radius
    const radiusY = 120; // Vertical radius
    const centerX = 250; // Center X of the oval
    const centerY = 150; // Center Y of the oval
    
    const x = centerX + radiusX * Math.cos(angle);
    const y = centerY + radiusY * Math.sin(angle);
    
    return { x, y };
  };

  // Determine if a player's role should be visible
  const shouldShowRole = (player: Player): boolean => {
    // Spies can see all roles (requirement 5.4)
    if (isCurrentPlayerSpy) {
      return true;
    }
    // Resistance members can only see their own role (requirement 5.5)
    return player.id === currentPlayerId;
  };

  // Get role color based on visibility rules
  const getRoleColor = (player: Player): string => {
    if (!shouldShowRole(player)) {
      return '#9e9e9e'; // Gray for unknown roles
    }
    
    // Blue for resistance (requirement 5.2), red for spies (requirement 5.3)
    return player.role === 'resistance' ? '#2196F3' : '#f44336';
  };

  // Get role text based on visibility rules
  const getRoleText = (player: Player): string => {
    if (!shouldShowRole(player)) {
      return '?';
    }
    return player.role === 'resistance' ? 'R' : 'S';
  };

  return (
    <div style={{ 
      position: 'relative', 
      width: '500px', 
      height: '300px', 
      margin: '20px auto',
      backgroundColor: '#f8f9fa',
      borderRadius: '12px',
      border: '2px solid #dee2e6'
    }}>
      {/* Game Board Title */}
      <div style={{
        position: 'absolute',
        top: '10px',
        left: '50%',
        transform: 'translateX(-50%)',
        fontSize: '18px',
        fontWeight: 'bold',
        color: '#495057'
      }}>
        Game Board
      </div>

      {/* Oval Table Background */}
      <div style={{
        position: 'absolute',
        left: '50px',
        top: '30px',
        width: '400px',
        height: '240px',
        border: '3px solid #6c757d',
        borderRadius: '50%',
        backgroundColor: '#ffffff'
      }} />

      {/* Players positioned around the oval */}
      {state.players.map((player, index) => {
        const position = getPlayerPosition(index, state.players.length);
        const isLeader = player.id === state.currentLeader;
        const roleColor = getRoleColor(player);
        const roleText = getRoleText(player);
        
        return (
          <div
            key={player.id}
            style={{
              position: 'absolute',
              left: `${position.x - 30}px`,
              top: `${position.y - 25}px`,
              width: '60px',
              height: '50px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#ffffff',
              border: `3px solid ${isLeader ? '#ff9800' : roleColor}`,
              borderRadius: '8px',
              boxShadow: isLeader ? '0 0 10px rgba(255, 152, 0, 0.5)' : '0 2px 4px rgba(0,0,0,0.1)',
              fontSize: '12px',
              fontWeight: 'bold',
              textAlign: 'center',
              cursor: 'default'
            }}
          >
            {/* Leader Crown Icon */}
            {isLeader && (
              <div style={{
                position: 'absolute',
                top: '-15px',
                fontSize: '16px',
                color: '#ff9800'
              }}>
                👑
              </div>
            )}
            
            {/* Player Name */}
            <div style={{
              fontSize: '10px',
              color: '#495057',
              marginBottom: '2px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              maxWidth: '50px'
            }}>
              {player.name}
            </div>
            
            {/* Role Indicator */}
            <div style={{
              width: '20px',
              height: '20px',
              borderRadius: '50%',
              backgroundColor: roleColor,
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '12px',
              fontWeight: 'bold'
            }}>
              {roleText}
            </div>
          </div>
        );
      })}

      {/* Game Phase Indicator */}
      <div style={{
        position: 'absolute',
        bottom: '10px',
        left: '50%',
        transform: 'translateX(-50%)',
        fontSize: '14px',
        fontWeight: 'bold',
        color: '#495057',
        backgroundColor: '#e9ecef',
        padding: '4px 12px',
        borderRadius: '12px'
      }}>
        Phase: {state.phase.replace('-', ' ').toUpperCase()}
      </div>

      {/* Mission Info */}
      {state.phase !== 'lobby' && state.phase !== 'role-assignment' && (
        <div style={{
          position: 'absolute',
          top: '10px',
          right: '10px',
          fontSize: '12px',
          color: '#495057',
          backgroundColor: '#e9ecef',
          padding: '6px 10px',
          borderRadius: '8px'
        }}>
          <div>Mission: {state.currentMission}</div>
          <div>R: {state.resistanceScore} | S: {state.spyScore}</div>
        </div>
      )}

      {/* Role Legend */}
      <div style={{
        position: 'absolute',
        bottom: '10px',
        right: '10px',
        fontSize: '10px',
        color: '#6c757d'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '2px' }}>
          <div style={{
            width: '12px',
            height: '12px',
            borderRadius: '50%',
            backgroundColor: '#2196F3',
            marginRight: '4px'
          }} />
          Resistance
        </div>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '2px' }}>
          <div style={{
            width: '12px',
            height: '12px',
            borderRadius: '50%',
            backgroundColor: '#f44336',
            marginRight: '4px'
          }} />
          Spy
        </div>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{
            width: '12px',
            height: '12px',
            borderRadius: '50%',
            backgroundColor: '#9e9e9e',
            marginRight: '4px'
          }} />
          Unknown
        </div>
      </div>
    </div>
  );
}