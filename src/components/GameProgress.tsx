import { useGame } from '../context/GameContext';
import { checkGameEnd, validateMissionProgression } from '../utils/gameLogic';

interface GameProgressProps {
  currentPlayerId: string;
}

export function GameProgress({ }: GameProgressProps) {
  const { state } = useGame();

  // Check game end conditions
  const gameEndCheck = checkGameEnd(state.resistanceScore, state.spyScore, state.currentMission);
  
  // Validate mission progression
  const progressionValidation = validateMissionProgression(
    state.currentMission,
    state.resistanceScore,
    state.spyScore
  );

  // Don't show during lobby or role assignment
  if (state.phase === 'lobby' || state.phase === 'role-assignment') {
    return null;
  }

  return (
    <div style={{ 
      backgroundColor: '#ffffff', 
      padding: '15px', 
      borderRadius: '8px',
      border: '2px solid #dee2e6',
      marginBottom: '20px'
    }}>
      {/* Game Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '15px'
      }}>
        <h2 style={{ margin: 0, color: '#495057', fontSize: '20px' }}>
          The Resistance - Mission {state.currentMission}
        </h2>
        <div style={{ fontSize: '14px', color: '#6c757d' }}>
          Room: <strong>{state.roomCode}</strong>
        </div>
      </div>

      {/* Score Display */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        gap: '30px',
        marginBottom: '15px'
      }}>
        <div style={{ 
          textAlign: 'center',
          padding: '10px 20px',
          backgroundColor: '#e3f2fd',
          borderRadius: '6px',
          border: '2px solid #2196f3'
        }}>
          <div style={{ fontSize: '12px', color: '#1976d2', fontWeight: 'bold' }}>
            RESISTANCE
          </div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1976d2' }}>
            {state.resistanceScore}
          </div>
        </div>
        
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          fontSize: '18px', 
          fontWeight: 'bold',
          color: '#495057'
        }}>
          VS
        </div>
        
        <div style={{ 
          textAlign: 'center',
          padding: '10px 20px',
          backgroundColor: '#ffebee',
          borderRadius: '6px',
          border: '2px solid #f44336'
        }}>
          <div style={{ fontSize: '12px', color: '#c62828', fontWeight: 'bold' }}>
            SPIES
          </div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#c62828' }}>
            {state.spyScore}
          </div>
        </div>
      </div>

      {/* Mission Progress Bar */}
      <div style={{ marginBottom: '15px' }}>
        <div style={{ 
          fontSize: '14px', 
          fontWeight: 'bold', 
          marginBottom: '8px',
          textAlign: 'center'
        }}>
          Mission Progress (First to 3 wins)
        </div>
        <div style={{ 
          display: 'flex', 
          gap: '5px', 
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          {[1, 2, 3, 4, 5].map(missionNum => {
            const missionResult = state.missionHistory.find(m => m.missionNumber === missionNum);
            const isCurrent = missionNum === state.currentMission;
            const isCompleted = missionResult !== undefined;
            
            let backgroundColor = '#e9ecef';
            let borderColor = '#dee2e6';
            let textColor = '#6c757d';
            let icon = missionNum.toString();
            
            if (isCompleted && missionResult) {
              backgroundColor = missionResult.outcome === 'success' ? '#e8f5e8' : '#ffebee';
              borderColor = missionResult.outcome === 'success' ? '#4caf50' : '#f44336';
              textColor = missionResult.outcome === 'success' ? '#2e7d32' : '#c62828';
              icon = missionResult.outcome === 'success' ? '✓' : '✗';
            } else if (isCurrent) {
              backgroundColor = '#fff3e0';
              borderColor = '#ff9800';
              textColor = '#f57c00';
              icon = '●';
            }
            
            return (
              <div
                key={missionNum}
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  backgroundColor,
                  border: `2px solid ${borderColor}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  color: textColor
                }}
                title={
                  isCompleted 
                    ? `Mission ${missionNum}: ${missionResult?.outcome}`
                    : isCurrent 
                      ? `Current Mission: ${missionNum}`
                      : `Upcoming Mission: ${missionNum}`
                }
              >
                {icon}
              </div>
            );
          })}
        </div>
        <div style={{ 
          fontSize: '12px', 
          color: '#6c757d', 
          textAlign: 'center',
          marginTop: '5px'
        }}>
          {state.currentMission <= 5 
            ? `Mission ${state.currentMission} of 5 maximum`
            : 'All missions completed'
          }
        </div>
      </div>

      {/* Current Phase Status */}
      <div style={{ 
        backgroundColor: '#f8f9fa', 
        padding: '10px', 
        borderRadius: '4px',
        textAlign: 'center'
      }}>
        <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '5px' }}>
          Current Phase: {getPhaseDisplayName(state.phase)}
        </div>
        
        {state.currentLeader && (
          <div style={{ fontSize: '12px', color: '#6c757d' }}>
            Mission Leader: <strong>{state.players.find(p => p.id === state.currentLeader)?.name}</strong>
          </div>
        )}
        
        {/* Game End Warning */}
        {gameEndCheck.gameEnded && (
          <div style={{ 
            marginTop: '8px',
            padding: '8px',
            backgroundColor: gameEndCheck.winner === 'resistance' ? '#e8f5e8' : '#ffebee',
            color: gameEndCheck.winner === 'resistance' ? '#2e7d32' : '#c62828',
            borderRadius: '4px',
            fontSize: '14px',
            fontWeight: 'bold'
          }}>
            🎉 {gameEndCheck.winner === 'resistance' ? 'Resistance' : 'Spies'} Win! 
            {gameEndCheck.reason === 'mission-limit' && ' (5 missions completed)'}
          </div>
        )}
        
        {/* Mission Limit Warning */}
        {state.currentMission === 5 && !gameEndCheck.gameEnded && (
          <div style={{ 
            marginTop: '8px',
            padding: '8px',
            backgroundColor: '#fff3e0',
            color: '#f57c00',
            borderRadius: '4px',
            fontSize: '12px',
            fontWeight: 'bold'
          }}>
            ⚠️ Final Mission - Game ends after this mission!
          </div>
        )}
        
        {/* Validation Warnings */}
        {!progressionValidation.isValid && (
          <div style={{ 
            marginTop: '8px',
            padding: '8px',
            backgroundColor: '#ffebee',
            color: '#c62828',
            borderRadius: '4px',
            fontSize: '12px'
          }}>
            ⚠️ {progressionValidation.error}
          </div>
        )}
      </div>
    </div>
  );
}

// Helper function to get display name for game phase
function getPhaseDisplayName(phase: string): string {
  switch (phase) {
    case 'lobby': return 'Waiting for Players';
    case 'role-assignment': return 'Assigning Roles';
    case 'team-building': return 'Building Mission Team';
    case 'voting': return 'Voting on Team';
    case 'mission': return 'Executing Mission';
    case 'mission-result': return 'Mission Results';
    case 'game-end': return 'Game Complete';
    default: return phase;
  }
}