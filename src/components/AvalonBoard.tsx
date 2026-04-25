import SpaceBetween from "@cloudscape-design/components/space-between";
import type { AvalonLocalState } from "../hooks/useAvalonGame";
import type { TeamVoteChoice, MissionVoteChoice } from "../types/avalon";
import { MissionTracker } from "./MissionTracker";
import { RoleReveal } from "./RoleReveal";
import { TeamProposal } from "./TeamProposal";
import { TeamVote } from "./TeamVote";
import { MissionVote } from "./MissionVote";
import { MissionResult } from "./MissionResult";
import { AssassinPhase } from "./AssassinPhase";
import { GameOver } from "./GameOver";

interface AvalonBoardProps {
    state: AvalonLocalState;
    isHost: boolean;
    onConfirmRoles: () => void;
    onProposeTeam: (team: string[]) => void;
    onTeamVote: (choice: TeamVoteChoice) => void;
    onMissionVote: (choice: MissionVoteChoice) => void;
    onAssassinChoice: (target: string) => void;
    onContinueAfterMission: () => void;
    onPlayAgain: () => void;
}

/**
 * Componente principal do tabuleiro Avalon.
 * Renderiza a fase atual do jogo com o componente correspondente.
 *
 * Uso:
 * ```tsx
 * <AvalonBoard state={localState} isHost={true} ... />
 * ```
 */
export function AvalonBoard({
    state,
    isHost,
    onConfirmRoles,
    onProposeTeam,
    onTeamVote,
    onMissionVote,
    onAssassinChoice,
    onContinueAfterMission,
    onPlayAgain,
}: AvalonBoardProps) {
    return (
        <SpaceBetween size="l">
            {state.phase !== "waiting" && state.phase !== "game_over" && (
                <MissionTracker
                    results={state.missionResults}
                    currentMission={state.currentMission}
                />
            )}

            {renderPhase()}
        </SpaceBetween>
    );

    function renderPhase() {
        switch (state.phase) {
            case "role_reveal":
                if (!state.myRole || !state.myLoyalty) return null;
                return (
                    <RoleReveal
                        myRole={state.myRole}
                        myLoyalty={state.myLoyalty}
                        visiblePlayers={state.visiblePlayers}
                        isHost={isHost}
                        onConfirm={onConfirmRoles}
                    />
                );

            case "team_proposal":
                return (
                    <TeamProposal
                        players={state.players}
                        leaderName={state.leaderName ?? ""}
                        isLeader={state.isLeader}
                        requiredTeamSize={state.requiredTeamSize}
                        currentMission={state.currentMission}
                        rejectedProposals={state.rejectedProposals}
                        onPropose={onProposeTeam}
                    />
                );

            case "team_vote":
                return (
                    <TeamVote
                        proposedTeam={state.proposedTeam}
                        leaderName={state.leaderName ?? ""}
                        currentMission={state.currentMission}
                        hasVoted={state.hasVoted}
                        voteCount={state.voteCount}
                        totalPlayers={state.players.length}
                        result={state.teamVoteResult}
                        onVote={onTeamVote}
                    />
                );

            case "mission_vote":
                return (
                    <MissionVote
                        proposedTeam={state.proposedTeam}
                        currentMission={state.currentMission}
                        isOnTeam={state.isOnTeam}
                        myLoyalty={state.myLoyalty}
                        hasVoted={state.hasVoted}
                        voteCount={state.voteCount}
                        teamSize={state.proposedTeam.length}
                        onVote={onMissionVote}
                    />
                );

            case "mission_result": {
                const lastOutcome = state.missionHistory[state.missionHistory.length - 1];
                if (!lastOutcome) return null;
                return (
                    <MissionResult
                        outcome={lastOutcome}
                        isHost={isHost}
                        onContinue={onContinueAfterMission}
                    />
                );
            }

            case "assassin_phase":
                return (
                    <AssassinPhase
                        players={state.players}
                        isAssassin={state.isAssassin}
                        myLoyalty={state.myLoyalty}
                        onChooseTarget={onAssassinChoice}
                    />
                );

            case "game_over":
                if (!state.winner) return null;
                return (
                    <GameOver
                        winner={state.winner}
                        reason={state.winReason ?? ""}
                        isHost={isHost}
                        onPlayAgain={onPlayAgain}
                    />
                );

            default:
                return null;
        }
    }
}
