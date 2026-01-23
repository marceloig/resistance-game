import { useState } from 'react';
import { useGame } from '../context/GameContext';
import { calculateMissionResult, createGameEvent, createLogEntry, checkGameEnd, getNextLeader } from '../utils/gameLogic';
import { canPlayerChooseFail } from '../utils/gameLogic';

interface MissionExecutionProps {
  currentPlayerId: string;
  isConnected: boolean;
  publishEvent?: (event: any) => Promise<void>;
  onError?: (error: string) => void;
}

export function MissionExecution({ 
  currentPlayerId, 
  isConnected, 
  publishEvent, 
  onError 
}: MissionExecutionProps) {
  const { state, dispatch } = useGame();
  const [missionChoices, setMissionChoices] = useState<Record<string, boolean>>({});
  const [hasChosen, setHasChosen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [missionResult, setMissionResult] = useState<{
    success: boolean;
    successChoices: number;
    failChoices: number;
  } | null>(null);

  // Get current player and check if they are on the mission team
  const currentPlayer = state.players.find(p => p.id === currentPlayerId);
  const isOnMissionTeam = state.selectedTeam.includes(currentPlayerId);
  const missionTeamPlayers = state.players.filter(p => state.selectedTeam.includes(p.id));
  
  // Check if current player can choose fail (Requirements 8.2, 8.3)
  const canChooseFail = currentPlayer ? canPlayerChooseFail(currentPlayer) : false;

  // Handle mission choice
  const handleMissionChoice = async (choice: boolean) => {
    if (hasChosen || !isConnected || !publishEvent || isSubmitting || !isOnMissionTeam) return;
    
    setIsSubmitting(true);
    
    try {
      // Update local choice state
      const newChoices = { ...missionChoices, [currentPlayerId]: choice };
      setMissionChoices(newChoices);
      setHasChosen(true);
      
      // Publish mission choice event
      const event = createGameEvent(
        'mission-choice-made',
        state.roomCode,
        currentPlayerId,
        { choice }
      );
      
      await publishEvent(event);
      
      // Check if all mission participants have chosen
      if (Object.keys(newChoices).length === state.selectedTeam.length) {
        await handleMissionComplete(newChoices);
      }
      
    } catch (error) {
      console.error('Failed to make mission choice:', error);
      onError?.('Failed to make mission choice. Please try again.');
      setHasChosen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle mission completion
  const handleMissionComplete = async (finalChoices: Record<string, boolean>) => {
    if (!publishEvent) return;
    
    // Calculate mission result (Requirements 8.5, 8.6)
    const result = calculateMissionResult(finalChoices);
    setMissionResult(result);
    setShowResults(true);
    
    try {
      // Update scores
      const newResistanceScore = result.success ? state.resistanceScore + 1 : state.resistanceScore;
      const newSpyScore = result.success ? state.spyScore : state.spyScore + 1;
      
      dispatch({ 
        type: 'UPDATE_SCORES', 
        payload: { 
          resistanceScore: newResistanceScore, 
          spyScore: newSpyScore 
        } 
      });
      
      // Create mission result for history
      const missionResultData = {
        missionNumber: state.currentMission,
        requiredPlayers: state.selectedTeam.length,
        selectedPlayers: state.selectedTeam,
        votes: state.currentVotes, // Previous voting results
        missionChoices: finalChoices,
        outcome: result.success ? 'success' as const : 'failure' as const,
        resistancePoints: newResistanceScore,
        spyPoints: newSpyScore,
      };
      
      dispatch({ type: 'ADD_MISSION_RESULT', payload: missionResultData });
      
      // Create log entry for mission completion (Requirements 10.1, 10.3)
      const teamMemberNames = state.selectedTeam
        .map(id => state.players.find(p => p.id === id)?.name)
        .filter(Boolean);
      
      const logEntry = createLogEntry(
        'mission-complete',
        `Mission ${state.currentMission} ${result.success ? 'succeeded' : 'failed'} (${result.successChoices} Success, ${result.failChoices} Fail)`,
        {
          missionNumber: state.currentMission,
          success: result.success,
          participants: teamMemberNames,
          successChoices: result.successChoices,
          failChoices: result.failChoices,
          newScores: { resistance: newResistanceScore, spy: newSpyScore }
        }
      );
      
      dispatch({ type: 'ADD_LOG_ENTRY', payload: logEntry });
      
      // Publish mission completed event
      const event = createGameEvent(
        'mission-completed',
        state.roomCode,
        currentPlayerId,
        {
          choices: finalChoices,
          result,
          missionNumber: state.currentMission,
          newScores: { resistance: newResistanceScore, spy: newSpyScore }
        }
      );
      
      await publishEvent(event);
      
      // Check for game end (Requirements 11.1, 11.2, 9.4)
      const gameEndCheck = checkGameEnd(newResistanceScore, newSpyScore, state.currentMission);
      
      // Handle result after a short delay to show results
      setTimeout(async () => {
        if (gameEndCheck.gameEnded) {
          // Game ends
          dispatch({ type: 'SET_PHASE', payload: 'game-end' });
          
          // Log game end
          const gameEndLogEntry = createLogEntry(
            'game-end',
            `Game ended! ${gameEndCheck.winner === 'resistance' ? 'Resistance' : 'Spies'} win!`,
            { 
              winner: gameEndCheck.winner,
              finalScores: { resistance: newResistanceScore, spy: newSpyScore }
            }
          );
          
          dispatch({ type: 'ADD_LOG_ENTRY', payload: gameEndLogEntry });
          
          // Publish game end event
          const gameEndEvent = createGameEvent(
            'game-ended',
            state.roomCode,
            currentPlayerId,
            { 
              winner: gameEndCheck.winner,
              finalScores: { resistance: newResistanceScore, spy: newSpyScore }
            }
          );
          
          await publishEvent(gameEndEvent);
        } else {
          // Continue to next mission - rotate leadership (Requirements 9.1)
          const nextLeader = getNextLeader(state.players, state.currentLeader);
          
          dispatch({ type: 'SET_LEADER', payload: nextLeader });
          dispatch({ type: 'SET_SELECTED_TEAM', payload: [] });
          dispatch({ type: 'CLEAR_VOTES' });
          dispatch({ type: 'SET_PHASE', payload: 'team-building' });
          
          // Log leadership change
          const leadershipLogEntry = createLogEntry(
            'leadership-change',
            `Leadership passed to ${state.players.find(p => p.id === nextLeader)?.name}`,
            { newLeader: nextLeader, reason: 'mission-complete' }
          );
          
          dispatch({ type: 'ADD_LOG_ENTRY', payload: leadershipLogEntry });
          
          // Publish leadership change event
          const leadershipEvent = createGameEvent(
            'leadership-changed',
            state.roomCode,
            currentPlayerId,
            { newLeader: nextLeader, reason: 'mission-complete' }
          );
          
          await publishEvent(leadershipEvent);
        }
      }, 4000); // 4 second delay to show results
      
    } catch (error) {
      console.error('Failed to complete mission:', error);
      onError?.('Failed to complete mission. Please try again.');
    }
  };

  // Only show this component during mission phase
  if (state.phase !== 'mission') {
    return null;
  }

  // Get team member names for display
  const teamMemberNames = state.selectedTeam
    .map(playerId => state.players.find(p => p.id === playerId)?.name)
    .filter(Boolean);

  return (
    <div style={{ 
      backgroundColor: '#f8f9fa', 
      padding: '20px', 
      borderRadius: '8px',
      border: '2px solid #dee2e6',
      marginTop: '20px'
    }}>
      <h3 style={{ margin: '0 0 15px 0', color: '#495057' }}>
        Mission {state.currentMission} - Execution
      </h3>
      
      {/* Mission Team Display */}
      <div style={{ 
        backgroundColor: '#e3f2fd', 
        padding: '15px', 
        borderRadius: '6px',
        marginBottom: '20px'
      }}>
        <h4 style={{ margin: '0 0 10px 0', fontSize: '16px', color: '#1976d2' }}>
          Mission Team:
        </h4>
        <div style={{ fontSize: '14px', fontWeight: 'bold' }}>
          {teamMemberNames.join(', ')}
        </div>
        <div style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
          {state.selectedTeam.length} player{state.selectedTeam.length !== 1 ? 's' : ''} on this mission
        </div>
      </div>

      {/* Mission Results Display */}
      {showResults && missionResult ? (
        <div style={{ 
          backgroundColor: missionResult.success ? '#e8f5e8' : '#ffebee', 
          padding: '15px', 
          borderRadius: '6px',
          marginBottom: '15px',
          border: `2px solid ${missionResult.success ? '#4caf50' : '#f44336'}`
        }}>
          <h4 style={{ 
            margin: '0 0 10px 0', 
            fontSize: '18px', 
            color: missionResult.success ? '#2e7d32' : '#c62828'
          }}>
            {missionResult.success ? '✅ Mission Succeeded!' : '❌ Mission Failed'}
          </h4>
          <div style={{ fontSize: '14px', marginBottom: '8px' }}>
            <strong>Success Choices:</strong> {missionResult.successChoices} | 
            <strong> Fail Choices:</strong> {missionResult.failChoices}
          </div>
          <div style={{ fontSize: '14px', marginBottom: '8px' }}>
            <strong>Current Scores:</strong> Resistance {state.resistanceScore} - {state.spyScore} Spies
          </div>
          <div style={{ fontSize: '12px', color: '#666', fontStyle: 'italic' }}>
            {checkGameEnd(state.resistanceScore, state.spyScore, state.currentMission).gameEnded 
              ? 'Game ending...'
              : 'Proceeding to next mission...'
            }
          </div>
        </div>
      ) : (
        <>
          {/* Mission Instructions */}
          {isOnMissionTeam ? (
            <div style={{ 
              backgroundColor: '#fff3e0', 
              padding: '12px', 
              borderRadius: '4px',
              marginBottom: '20px',
              fontSize: '14px'
            }}>
              <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>
                🎯 You are on this mission! Choose your action:
              </div>
              <div style={{ marginBottom: '5px' }}>
                • <strong>Success:</strong> Help the mission succeed
              </div>
              <div style={{ marginBottom: '5px' }}>
                • <strong>Fail:</strong> Sabotage the mission {!canChooseFail && '(Not available to Resistance)'}
              </div>
              <div style={{ 
                color: canChooseFail ? '#f44336' : '#2196f3', 
                fontWeight: 'bold', 
                marginTop: '8px',
                fontSize: '13px'
              }}>
                {canChooseFail 
                  ? '🕵️ As a Spy, you can choose either Success or Fail'
                  : '🛡️ As Resistance, you can only choose Success'
                }
              </div>
            </div>
          ) : (
            <div style={{ 
              backgroundColor: '#e9ecef', 
              padding: '12px', 
              borderRadius: '4px',
              marginBottom: '20px',
              fontSize: '14px',
              textAlign: 'center'
            }}>
              <div style={{ fontWeight: 'bold', color: '#6c757d' }}>
                👀 You are not on this mission
              </div>
              <div style={{ fontSize: '12px', color: '#6c757d', marginTop: '5px' }}>
                Waiting for mission team to make their choices...
              </div>
            </div>
          )}

          {/* Mission Choice Buttons - Only for team members */}
          {isOnMissionTeam && (
            <div style={{ marginBottom: '20px' }}>
              <h4 style={{ margin: '0 0 15px 0', fontSize: '16px' }}>Make Your Choice:</h4>
              
              {hasChosen ? (
                <div style={{ 
                  padding: '15px', 
                  backgroundColor: '#e8f5e8', 
                  borderRadius: '6px',
                  border: '2px solid #4caf50',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#2e7d32' }}>
                    ✅ Choice Made: {missionChoices[currentPlayerId] ? 'SUCCESS' : 'FAIL'}
                  </div>
                  <div style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
                    Waiting for other team members to choose...
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
                  <button
                    onClick={() => handleMissionChoice(true)}
                    disabled={!isConnected || isSubmitting}
                    style={{
                      padding: '15px 30px',
                      backgroundColor: isConnected && !isSubmitting ? '#4caf50' : '#ccc',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: isConnected && !isSubmitting ? 'pointer' : 'not-allowed',
                      fontSize: '18px',
                      fontWeight: 'bold',
                      minWidth: '140px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
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
                        Choosing...
                      </>
                    ) : (
                      <>
                        ✅ SUCCESS
                      </>
                    )}
                  </button>
                  
                  <button
                    onClick={() => handleMissionChoice(false)}
                    disabled={!isConnected || isSubmitting || !canChooseFail}
                    style={{
                      padding: '15px 30px',
                      backgroundColor: isConnected && !isSubmitting && canChooseFail ? '#f44336' : '#ccc',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: isConnected && !isSubmitting && canChooseFail ? 'pointer' : 'not-allowed',
                      fontSize: '18px',
                      fontWeight: 'bold',
                      minWidth: '140px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      opacity: canChooseFail ? 1 : 0.5
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
                        Choosing...
                      </>
                    ) : (
                      <>
                        ❌ FAIL
                      </>
                    )}
                  </button>
                </div>
              )}
              
              {/* Role-based button availability explanation */}
              {!canChooseFail && (
                <div style={{ 
                  fontSize: '12px', 
                  color: '#666', 
                  textAlign: 'center',
                  marginTop: '10px',
                  fontStyle: 'italic'
                }}>
                  Resistance members can only choose Success
                </div>
              )}
            </div>
          )}

          {/* Mission Progress */}
          <div style={{ 
            backgroundColor: '#e9ecef', 
            padding: '10px', 
            borderRadius: '4px',
            fontSize: '14px'
          }}>
            <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>
              Mission Progress: {Object.keys(missionChoices).length} / {state.selectedTeam.length}
            </div>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              {missionTeamPlayers.map(player => {
                const hasPlayerChosen = missionChoices.hasOwnProperty(player.id);
                const isCurrentPlayerInList = player.id === currentPlayerId;
                
                return (
                  <div
                    key={player.id}
                    style={{
                      padding: '4px 8px',
                      borderRadius: '12px',
                      backgroundColor: hasPlayerChosen ? '#4caf50' : '#dee2e6',
                      color: hasPlayerChosen ? 'white' : '#495057',
                      fontSize: '12px',
                      fontWeight: isCurrentPlayerInList ? 'bold' : 'normal'
                    }}
                  >
                    {player.name} {isCurrentPlayerInList && '(You)'} {hasPlayerChosen ? '✓' : '⏳'}
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* Connection Status Warning */}
      {!isConnected && (
        <div style={{ 
          marginTop: '15px',
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