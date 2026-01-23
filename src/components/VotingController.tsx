import { useState, useEffect } from 'react';
import { useGame } from '../context/GameContext';
import { calculateVotingResult, getNextLeader, createGameEvent, createLogEntry } from '../utils/gameLogic';
import { validateMissionVoting } from '../utils/gameValidation';

interface VotingControllerProps {
  currentPlayerId: string;
  isConnected: boolean;
  publishEvent?: (event: any) => Promise<void>;
  onError?: (error: string) => void;
}

export function VotingController({ 
  currentPlayerId, 
  isConnected, 
  publishEvent, 
  onError 
}: VotingControllerProps) {
  const { state, dispatch } = useGame();
  const [votes, setVotes] = useState<Record<string, boolean>>({});
  const [hasVoted, setHasVoted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [votingResult, setVotingResult] = useState<{
    approved: boolean;
    yesVotes: number;
    noVotes: number;
  } | null>(null);

  // Get current player and check if they are the leader
  const currentPlayer = state.players.find(p => p.id === currentPlayerId);
  const isLeader = currentPlayer?.id === state.currentLeader;
  const connectedPlayers = state.players.filter(p => p.isConnected);

  // Auto-assign leader vote as "Yes" (Requirement 7.2)
  useEffect(() => {
    if (isLeader && !votes[currentPlayerId] && publishEvent) {
      const leaderVote = { [currentPlayerId]: true };
      setVotes(leaderVote);
      setHasVoted(true);
      
      // Publish leader's automatic vote
      const event = createGameEvent(
        'vote-cast',
        state.roomCode,
        currentPlayerId,
        { vote: true, isAutomatic: true }
      );
      publishEvent(event).catch(error => {
        console.error('Failed to publish leader vote:', error);
      });
    }
  }, [isLeader, currentPlayerId, votes, publishEvent, state.roomCode]);

  // Handle player vote
  const handleVote = async (vote: boolean) => {
    if (hasVoted || !isConnected || !publishEvent || isSubmitting) return;
    
    setIsSubmitting(true);
    
    try {
      // Update local vote state
      const newVotes = { ...votes, [currentPlayerId]: vote };
      setVotes(newVotes);
      setHasVoted(true);
      
      // Publish vote event
      const event = createGameEvent(
        'vote-cast',
        state.roomCode,
        currentPlayerId,
        { vote }
      );
      
      await publishEvent(event);
      
      // Check if all players have voted
      if (Object.keys(newVotes).length === connectedPlayers.length) {
        await handleVotingComplete(newVotes);
      }
      
    } catch (error) {
      console.error('Failed to cast vote:', error);
      onError?.('Failed to cast vote. Please try again.');
      setHasVoted(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle voting completion
  const handleVotingComplete = async (finalVotes: Record<string, boolean>) => {
    if (!publishEvent) return;
    
    // Validate voting
    const validation = validateMissionVoting(finalVotes, connectedPlayers);
    if (!validation.isValid) {
      onError?.(validation.error || 'Invalid voting result');
      return;
    }
    
    // Calculate result
    const result = calculateVotingResult(finalVotes);
    setVotingResult(result);
    setShowResults(true);
    
    try {
      // Create log entry for voting
      const yesVoters = Object.entries(finalVotes)
        .filter(([_, vote]) => vote === true)
        .map(([playerId, _]) => state.players.find(p => p.id === playerId)?.name)
        .filter(Boolean);
      
      const noVoters = Object.entries(finalVotes)
        .filter(([_, vote]) => vote === false)
        .map(([playerId, _]) => state.players.find(p => p.id === playerId)?.name)
        .filter(Boolean);
      
      const logEntry = createLogEntry(
        'team-vote',
        `Mission ${state.currentMission} team ${result.approved ? 'approved' : 'rejected'} (${result.yesVotes} Yes, ${result.noVotes} No)`,
        {
          missionNumber: state.currentMission,
          approved: result.approved,
          yesVoters,
          noVoters,
          selectedTeam: state.selectedTeam.map(id => state.players.find(p => p.id === id)?.name).filter(Boolean)
        }
      );
      
      dispatch({ type: 'ADD_LOG_ENTRY', payload: logEntry });
      
      // Publish voting completed event
      const event = createGameEvent(
        'voting-completed',
        state.roomCode,
        currentPlayerId,
        {
          votes: finalVotes,
          result,
          missionNumber: state.currentMission
        }
      );
      
      await publishEvent(event);
      
      // Handle result after a short delay to show results
      setTimeout(async () => {
        if (result.approved) {
          // Proceed to mission execution
          dispatch({ type: 'SET_PHASE', payload: 'mission' });
        } else {
          // Change leadership and return to team building (Requirements 7.5, 7.6)
          const nextLeader = getNextLeader(state.players, state.currentLeader);
          
          dispatch({ type: 'SET_LEADER', payload: nextLeader });
          dispatch({ type: 'SET_SELECTED_TEAM', payload: [] });
          dispatch({ type: 'SET_PHASE', payload: 'team-building' });
          
          // Log leadership change
          const leadershipLogEntry = createLogEntry(
            'leadership-change',
            `Leadership passed to ${state.players.find(p => p.id === nextLeader)?.name}`,
            { newLeader: nextLeader, reason: 'vote-failed' }
          );
          
          dispatch({ type: 'ADD_LOG_ENTRY', payload: leadershipLogEntry });
          
          // Publish leadership change event
          const leadershipEvent = createGameEvent(
            'leadership-changed',
            state.roomCode,
            currentPlayerId,
            { newLeader: nextLeader, reason: 'vote-failed' }
          );
          
          await publishEvent(leadershipEvent);
        }
      }, 3000); // 3 second delay to show results
      
    } catch (error) {
      console.error('Failed to complete voting:', error);
      onError?.('Failed to complete voting. Please try again.');
    }
  };

  // Handle incoming vote events
  useEffect(() => {
    // This would be called by the EventManager when vote events are received
    // For now, we'll handle it through the game context
  }, []);

  // Only show this component during voting phase
  if (state.phase !== 'voting') {
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
        Mission {state.currentMission} - Team Approval Vote
      </h3>
      
      {/* Proposed Team Display */}
      <div style={{ 
        backgroundColor: '#e3f2fd', 
        padding: '15px', 
        borderRadius: '6px',
        marginBottom: '20px'
      }}>
        <h4 style={{ margin: '0 0 10px 0', fontSize: '16px', color: '#1976d2' }}>
          Proposed Team:
        </h4>
        <div style={{ fontSize: '14px', fontWeight: 'bold' }}>
          {teamMemberNames.join(', ')}
        </div>
        <div style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
          Leader: {state.players.find(p => p.id === state.currentLeader)?.name}
        </div>
      </div>

      {/* Voting Results Display */}
      {showResults && votingResult ? (
        <div style={{ 
          backgroundColor: votingResult.approved ? '#e8f5e8' : '#ffebee', 
          padding: '15px', 
          borderRadius: '6px',
          marginBottom: '15px',
          border: `2px solid ${votingResult.approved ? '#4caf50' : '#f44336'}`
        }}>
          <h4 style={{ 
            margin: '0 0 10px 0', 
            fontSize: '18px', 
            color: votingResult.approved ? '#2e7d32' : '#c62828'
          }}>
            {votingResult.approved ? '✅ Team Approved!' : '❌ Team Rejected'}
          </h4>
          <div style={{ fontSize: '14px', marginBottom: '8px' }}>
            <strong>Yes Votes:</strong> {votingResult.yesVotes} | <strong>No Votes:</strong> {votingResult.noVotes}
          </div>
          <div style={{ fontSize: '12px', color: '#666', fontStyle: 'italic' }}>
            {votingResult.approved 
              ? 'Proceeding to mission execution...'
              : 'Leadership will pass to the next player...'
            }
          </div>
        </div>
      ) : (
        <>
          {/* Voting Instructions */}
          <div style={{ 
            backgroundColor: '#fff3e0', 
            padding: '12px', 
            borderRadius: '4px',
            marginBottom: '20px',
            fontSize: '14px'
          }}>
            <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>
              Vote on the proposed team:
            </div>
            <div>
              • <strong>Yes:</strong> Approve this team for the mission
            </div>
            <div>
              • <strong>No:</strong> Reject this team (leadership will rotate)
            </div>
            {isLeader && (
              <div style={{ color: '#ff9800', fontWeight: 'bold', marginTop: '8px' }}>
                👑 As mission leader, your vote is automatically "Yes"
              </div>
            )}
          </div>

          {/* Voting Buttons */}
          <div style={{ marginBottom: '20px' }}>
            <h4 style={{ margin: '0 0 15px 0', fontSize: '16px' }}>Cast Your Vote:</h4>
            
            {hasVoted ? (
              <div style={{ 
                padding: '15px', 
                backgroundColor: '#e8f5e8', 
                borderRadius: '6px',
                border: '2px solid #4caf50',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#2e7d32' }}>
                  ✅ Vote Cast: {votes[currentPlayerId] ? 'YES' : 'NO'}
                </div>
                <div style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
                  Waiting for other players to vote...
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
                <button
                  onClick={() => handleVote(true)}
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
                    minWidth: '120px',
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
                      Voting...
                    </>
                  ) : (
                    <>
                      👍 YES
                    </>
                  )}
                </button>
                
                <button
                  onClick={() => handleVote(false)}
                  disabled={!isConnected || isSubmitting}
                  style={{
                    padding: '15px 30px',
                    backgroundColor: isConnected && !isSubmitting ? '#f44336' : '#ccc',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: isConnected && !isSubmitting ? 'pointer' : 'not-allowed',
                    fontSize: '18px',
                    fontWeight: 'bold',
                    minWidth: '120px',
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
                      Voting...
                    </>
                  ) : (
                    <>
                      👎 NO
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Vote Progress */}
          <div style={{ 
            backgroundColor: '#e9ecef', 
            padding: '10px', 
            borderRadius: '4px',
            fontSize: '14px'
          }}>
            <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>
              Voting Progress: {Object.keys(votes).length} / {connectedPlayers.length}
            </div>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              {connectedPlayers.map(player => {
                const hasPlayerVoted = votes.hasOwnProperty(player.id);
                const isCurrentPlayerInList = player.id === currentPlayerId;
                
                return (
                  <div
                    key={player.id}
                    style={{
                      padding: '4px 8px',
                      borderRadius: '12px',
                      backgroundColor: hasPlayerVoted ? '#4caf50' : '#dee2e6',
                      color: hasPlayerVoted ? 'white' : '#495057',
                      fontSize: '12px',
                      fontWeight: isCurrentPlayerInList ? 'bold' : 'normal'
                    }}
                  >
                    {player.name} {isCurrentPlayerInList && '(You)'} {hasPlayerVoted ? '✓' : '⏳'}
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