import { useState } from 'react';
import { useGame } from '../context/GameContext';
import { validateTeamSelection } from '../utils/gameValidation';
import { createGameEvent, getMissionRequirements } from '../utils/gameLogic';

interface MissionControllerProps {
  currentPlayerId: string;
  isConnected: boolean;
  publishEvent?: (event: any) => Promise<void>;
  onError?: (error: string) => void;
}

export function MissionController({ 
  currentPlayerId, 
  isConnected, 
  publishEvent, 
  onError 
}: MissionControllerProps) {
  const { state, dispatch } = useGame();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Get current player and check if they are the leader
  const currentPlayer = state.players.find(p => p.id === currentPlayerId);
  const isLeader = currentPlayer?.id === state.currentLeader;
  
  // Get required team size for current mission
  const playerCount = state.players.length;
  const requiredPlayers = getMissionRequirements(playerCount, state.currentMission);
  
  // Handle player selection/deselection
  const handlePlayerToggle = (playerId: string) => {
    if (!isLeader || !isConnected) return;
    
    const currentTeam = [...state.selectedTeam];
    const playerIndex = currentTeam.indexOf(playerId);
    
    if (playerIndex >= 0) {
      // Remove player from team (deselection)
      currentTeam.splice(playerIndex, 1);
    } else {
      // Add player to team (selection) - only if under limit
      if (currentTeam.length < requiredPlayers) {
        currentTeam.push(playerId);
      }
    }
    
    // Update local state
    dispatch({ type: 'SET_SELECTED_TEAM', payload: currentTeam });
  };

  // Handle prepare mission button click
  const handlePrepareMission = async () => {
    if (!isLeader || !publishEvent || isSubmitting) return;
    
    // Validate team selection
    const validation = validateTeamSelection(state);
    if (!validation.isValid) {
      onError?.(validation.error || 'Invalid team selection');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Publish team selection event
      const event = createGameEvent(
        'team-selected',
        state.roomCode,
        currentPlayerId,
        {
          selectedTeam: state.selectedTeam,
          missionNumber: state.currentMission,
          requiredPlayers
        }
      );
      
      await publishEvent(event);
      
      // Transition to voting phase
      dispatch({ type: 'SET_PHASE', payload: 'voting' });
      
    } catch (error) {
      console.error('Failed to prepare mission:', error);
      onError?.('Failed to prepare mission. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Check if prepare mission button should be enabled
  const canPrepareMission = isLeader && 
                           isConnected && 
                           state.selectedTeam.length === requiredPlayers &&
                           !isSubmitting;

  // Only show this component during team-building phase
  if (state.phase !== 'team-building') {
    return null;
  }

  return (
    <div style={{ 
      backgroundColor: '#f8f9fa', 
      padding: '20px', 
      borderRadius: '8px',
      border: '2px solid #dee2e6',
      marginTop: '20px'
    }}>
      <h3 style={{ margin: '0 0 15px 0', color: '#495057' }}>
        Mission {state.currentMission} - Team Building
      </h3>
      
      {/* Mission Info */}
      <div style={{ 
        backgroundColor: '#e3f2fd', 
        padding: '10px', 
        borderRadius: '4px',
        marginBottom: '15px',
        fontSize: '14px'
      }}>
        <div><strong>Required Team Size:</strong> {requiredPlayers} players</div>
        <div><strong>Current Selection:</strong> {state.selectedTeam.length} / {requiredPlayers}</div>
        {isLeader && (
          <div style={{ color: '#1976d2', fontWeight: 'bold', marginTop: '5px' }}>
            👑 You are the Mission Leader - Select your team!
          </div>
        )}
      </div>

      {/* Player Selection Grid */}
      <div style={{ marginBottom: '20px' }}>
        <h4 style={{ margin: '0 0 10px 0', fontSize: '16px' }}>Select Team Members:</h4>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
          gap: '10px'
        }}>
          {state.players
            .filter(p => p.isConnected)
            .map(player => {
              const isSelected = state.selectedTeam.includes(player.id);
              const isCurrentPlayer = player.id === currentPlayerId;
              const canSelect = isLeader && 
                              (isSelected || state.selectedTeam.length < requiredPlayers);
              
              return (
                <div
                  key={player.id}
                  onClick={() => canSelect ? handlePlayerToggle(player.id) : undefined}
                  style={{
                    padding: '12px',
                    borderRadius: '6px',
                    border: `2px solid ${isSelected ? '#4caf50' : '#dee2e6'}`,
                    backgroundColor: isSelected ? '#e8f5e8' : '#ffffff',
                    cursor: canSelect ? 'pointer' : 'default',
                    opacity: canSelect ? 1 : 0.7,
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}
                >
                  <div>
                    <div style={{ 
                      fontWeight: 'bold',
                      color: isCurrentPlayer ? '#1976d2' : '#495057'
                    }}>
                      {player.name} {isCurrentPlayer && '(You)'}
                    </div>
                    {player.id === state.currentLeader && (
                      <div style={{ fontSize: '12px', color: '#ff9800' }}>
                        👑 Leader
                      </div>
                    )}
                  </div>
                  
                  {/* Selection indicator */}
                  <div style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    backgroundColor: isSelected ? '#4caf50' : '#e0e0e0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: '14px',
                    fontWeight: 'bold'
                  }}>
                    {isSelected ? '✓' : ''}
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      {/* Selected Team Summary */}
      {state.selectedTeam.length > 0 && (
        <div style={{ 
          backgroundColor: '#fff3e0', 
          padding: '10px', 
          borderRadius: '4px',
          marginBottom: '15px'
        }}>
          <h4 style={{ margin: '0 0 8px 0', fontSize: '14px' }}>Selected Team:</h4>
          <div style={{ fontSize: '14px' }}>
            {state.selectedTeam.map(playerId => {
              const player = state.players.find(p => p.id === playerId);
              return player?.name;
            }).join(', ')}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
        {isLeader ? (
          <>
            <button
              onClick={handlePrepareMission}
              disabled={!canPrepareMission}
              style={{
                padding: '12px 24px',
                backgroundColor: canPrepareMission ? '#4caf50' : '#ccc',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: canPrepareMission ? 'pointer' : 'not-allowed',
                fontSize: '16px',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              {isSubmitting ? (
                <>
                  <div style={{
                    width: '16px',
                    height: '16px',
                    border: '2px solid #ffffff',
                    borderTop: '2px solid transparent',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                  }} />
                  Preparing...
                </>
              ) : (
                <>
                  🚀 Prepare Mission
                </>
              )}
            </button>
            
            {state.selectedTeam.length !== requiredPlayers && (
              <div style={{ 
                fontSize: '14px', 
                color: '#f44336',
                fontStyle: 'italic'
              }}>
                {state.selectedTeam.length < requiredPlayers 
                  ? `Select ${requiredPlayers - state.selectedTeam.length} more player${requiredPlayers - state.selectedTeam.length !== 1 ? 's' : ''}`
                  : `Remove ${state.selectedTeam.length - requiredPlayers} player${state.selectedTeam.length - requiredPlayers !== 1 ? 's' : ''}`
                }
              </div>
            )}
          </>
        ) : (
          <div style={{ 
            fontSize: '14px', 
            color: '#6c757d',
            fontStyle: 'italic'
          }}>
            Waiting for {state.players.find(p => p.id === state.currentLeader)?.name || 'leader'} to select the team...
          </div>
        )}
      </div>

      {/* Connection Status Warning */}
      {!isConnected && (
        <div style={{ 
          marginTop: '10px',
          padding: '8px 12px',
          backgroundColor: '#ffebee',
          color: '#c62828',
          borderRadius: '4px',
          fontSize: '14px'
        }}>
          ⚠️ Connection lost. Reconnecting...
        </div>
      )}
    </div>
  );
}

// Add CSS animation for loading spinner
const style = document.createElement('style');
style.textContent = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;
document.head.appendChild(style);