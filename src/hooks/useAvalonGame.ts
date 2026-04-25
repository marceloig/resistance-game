import { useState, useCallback, useRef } from "react";
import type {
    AvalonGameState,
    AvalonGameEvent,
    GamePhase,
    TeamVoteChoice,
    MissionVoteChoice,
    Loyalty,
    VisiblePlayerInfo,
    AvalonRole,
} from "../types/avalon";
import {
    createInitialGameState,
    getVisiblePlayers,
    getTeamSize,
    resolveTeamVote,
    resolveMission,
    nextLeader,
    shouldStartAssassinPhase,
    hasEvilWonByMissions,
    determineWinner,
    isForcedProposal,
} from "../game/avalonEngine";
import type { EventPayload } from "./useEventsConnection";

/** Estado local do jogador no Avalon. */
export interface AvalonLocalState {
    phase: GamePhase;
    players: string[];
    myRole: AvalonRole | null;
    myLoyalty: Loyalty | null;
    visiblePlayers: VisiblePlayerInfo[];
    leaderName: string | null;
    currentMission: number;
    rejectedProposals: number;
    proposedTeam: string[];
    teamVoteResult: { votes: Record<string, TeamVoteChoice>; approved: boolean } | null;
    missionResults: AvalonGameState["missionResults"];
    missionHistory: AvalonGameState["missionHistory"];
    hasVoted: boolean;
    isLeader: boolean;
    isOnTeam: boolean;
    lastMissionFailCount: number | null;
    assassinTarget: string | null;
    isAssassin: boolean;
    winner: Loyalty | null;
    winReason: string | null;
    requiredTeamSize: number;
    voteCount: number;
}

const INITIAL_LOCAL_STATE: AvalonLocalState = {
    phase: "waiting",
    players: [],
    myRole: null,
    myLoyalty: null,
    visiblePlayers: [],
    leaderName: null,
    currentMission: 0,
    rejectedProposals: 0,
    proposedTeam: [],
    teamVoteResult: null,
    missionResults: ["pending", "pending", "pending", "pending", "pending"],
    missionHistory: [],
    hasVoted: false,
    isLeader: false,
    isOnTeam: false,
    lastMissionFailCount: null,
    assassinTarget: null,
    isAssassin: false,
    winner: null,
    winReason: null,
    requiredTeamSize: 2,
    voteCount: 0,
};

/**
 * Hook que gerencia o estado do jogo Avalon para um jogador.
 *
 * Arquitetura: qualquer jogador pode publicar ações (propor equipe, votar, etc.)
 * diretamente no canal. O host mantém o estado autoritativo e publica os
 * resultados (resolução de votos, resultado de missão, etc.).
 *
 * Uso:
 * ```ts
 * const avalon = useAvalonGame(myName, isHost, publish, channelName);
 * ```
 */
export function useAvalonGame(
    myName: string,
    isHost: boolean,
    publish: (channel: string, data: EventPayload) => Promise<void>,
    channelName: string | undefined,
) {
    const [localState, setLocalState] = useState<AvalonLocalState>(INITIAL_LOCAL_STATE);

    // Estado autoritativo mantido apenas pelo host
    const gameStateRef = useRef<AvalonGameState | null>(null);

    const publishGameEvent = useCallback(
        async (event: AvalonGameEvent) => {
            if (!channelName) return;
            await publish(channelName, { gameEvent: event } as unknown as EventPayload);
        },
        [channelName, publish],
    );

    /** Host inicia o jogo com os jogadores atuais. */
    const startGame = useCallback(
        async (playerNames: string[]) => {
            if (!isHost) return;

            const state = createInitialGameState(playerNames);
            gameStateRef.current = state;

            await publishGameEvent({ type: "game_started", state: stripRoles(state) });

            for (const player of state.players) {
                const visible = getVisiblePlayers(player.name, state.players);
                await publishGameEvent({
                    type: "role_assigned",
                    playerName: player.name,
                    role: player.role!,
                    loyalty: player.loyalty!,
                    visiblePlayers: visible,
                });
            }
        },
        [isHost, publishGameEvent],
    );

    /** Host sinaliza que a revelação de papéis terminou. */
    const confirmRoleReveal = useCallback(async () => {
        if (!isHost || !gameStateRef.current) return;
        gameStateRef.current.phase = "team_proposal";
        await publishGameEvent({ type: "role_reveal_complete" });
    }, [isHost, publishGameEvent]);

    /**
     * Líder propõe uma equipe para a missão.
     * Qualquer jogador que seja o líder pode chamar — publica o evento no canal.
     */
    const proposeTeam = useCallback(
        async (team: string[]) => {
            await publishGameEvent({
                type: "team_proposed",
                leader: myName,
                team,
                missionIndex: localState.currentMission,
            });
        },
        [myName, localState.currentMission, publishGameEvent],
    );

    /**
     * Jogador vota na equipe proposta.
     * Qualquer jogador pode votar — o voto é publicado no canal.
     */
    const castTeamVote = useCallback(
        async (vote: TeamVoteChoice) => {
            await publishGameEvent({
                type: "team_vote_cast",
                playerName: myName,
                vote,
            });
        },
        [myName, publishGameEvent],
    );

    /**
     * Jogador da equipe vota na missão.
     * Qualquer membro da equipe pode votar.
     */
    const castMissionVote = useCallback(
        async (vote: MissionVoteChoice) => {
            await publishGameEvent({
                type: "mission_vote_cast",
                playerName: myName,
                vote,
            });
        },
        [myName, publishGameEvent],
    );

    /**
     * Host avança o jogo após exibir o resultado da missão.
     * Verifica se o jogo terminou (3 falhas ou 3 sucessos) antes de avançar.
     */
    const continueAfterMission = useCallback(async () => {
        if (!isHost || !gameStateRef.current) return;
        const gs = gameStateRef.current;

        // Mal venceu por 3 missões falhadas — encerra o jogo
        if (hasEvilWonByMissions(gs.missionResults)) {
            const result = determineWinner(gs);
            gs.phase = "game_over";
            gs.winner = result.winner;
            await publishGameEvent({ type: "game_over", winner: result.winner, reason: result.reason });
            return;
        }

        // Bem venceu 3 missões — fase do assassino
        if (shouldStartAssassinPhase(gs.missionResults)) {
            gs.phase = "assassin_phase";
            await publishGameEvent({ type: "assassin_phase_started" });
            return;
        }

        // Jogo continua — próxima proposta de equipe
        gs.phase = "team_proposal";
        await publishGameEvent({
            type: "continue_after_mission",
            newLeader: gs.players[gs.leaderIndex].name,
            newMission: gs.currentMission,
        });
    }, [isHost, publishGameEvent]);

    /** Assassino escolhe o alvo (tentativa de identificar Merlin). */
    const chooseAssassinTarget = useCallback(
        async (target: string) => {
            await publishGameEvent({ type: "assassin_choice", target });
        },
        [publishGameEvent],
    );

    /** Processa um evento de jogo recebido pelo canal. */
    const handleGameEvent = useCallback(
        (event: AvalonGameEvent) => {
            // Host processa eventos para manter estado autoritativo e publicar resultados
            if (isHost) {
                handleHostLogic(event);
            }

            // Todos os jogadores atualizam o estado local
            setLocalState((prev) => applyEventToLocalState(prev, event, myName));
        },
        [myName, isHost],
    );

    /**
     * Lógica do host: processa eventos dos jogadores e publica resultados.
     * Apenas o host executa esta função.
     */
    const handleHostLogic = useCallback(
        (event: AvalonGameEvent) => {
            const gs = gameStateRef.current;
            if (!gs) return;

            switch (event.type) {
                case "team_proposed":
                    gs.proposedTeam = event.team;
                    gs.teamVotes = {};

                    // Após 4 rejeições consecutivas, a 5ª proposta é aceita automaticamente
                    if (isForcedProposal(gs.rejectedProposals)) {
                        gs.phase = "mission_vote";
                        gs.missionVotes = {};
                        gs.rejectedProposals = 0;
                        publishGameEvent({
                            type: "team_vote_result",
                            votes: {},
                            approved: true,
                            rejectedCount: 0,
                            newLeader: gs.players[gs.leaderIndex].name,
                            newMission: gs.currentMission,
                        });
                    } else {
                        gs.phase = "team_vote";
                    }
                    break;

                case "team_vote_cast": {
                    gs.teamVotes[event.playerName] = event.vote;

                    // Resolve quando todos votaram
                    if (Object.keys(gs.teamVotes).length >= gs.players.length) {
                        resolveTeamVoteOnHost(gs);
                    }
                    break;
                }

                case "mission_vote_cast": {
                    gs.missionVotes[event.playerName] = event.vote;

                    // Resolve quando todos os membros da equipe votaram
                    if (Object.keys(gs.missionVotes).length >= gs.proposedTeam.length) {
                        resolveMissionOnHost(gs);
                    }
                    break;
                }

                case "assassin_choice": {
                    gs.assassinTarget = event.target;
                    const result = determineWinner(gs);
                    gs.phase = "game_over";
                    gs.winner = result.winner;
                    publishGameEvent({ type: "game_over", winner: result.winner, reason: result.reason });
                    break;
                }

                default:
                    break;
            }
        },
        [publishGameEvent],
    );

    /** Host resolve a votação de equipe e publica o resultado. */
    const resolveTeamVoteOnHost = useCallback(
        (gs: AvalonGameState) => {
            const approved = resolveTeamVote(gs.teamVotes, gs.players.length);

            if (approved) {
                gs.phase = "mission_vote";
                gs.missionVotes = {};
                gs.rejectedProposals = 0;
            } else {
                gs.rejectedProposals++;
                gs.leaderIndex = nextLeader(gs.leaderIndex, gs.players.length);
                gs.phase = "team_proposal";
                gs.proposedTeam = [];
            }

            publishGameEvent({
                type: "team_vote_result",
                votes: { ...gs.teamVotes },
                approved,
                rejectedCount: gs.rejectedProposals,
                newLeader: gs.players[gs.leaderIndex].name,
                newMission: gs.currentMission,
            });
        },
        [publishGameEvent],
    );

    /** Host resolve a missão e publica o resultado. */
    const resolveMissionOnHost = useCallback(
        (gs: AvalonGameState) => {
            const outcome = resolveMission(gs.missionVotes, gs.players.length, gs.currentMission);
            gs.missionResults[gs.currentMission] = outcome.result;
            gs.missionHistory.push(outcome);

            const nextMissionIdx = gs.currentMission + 1;
            const nextLeaderIdx = nextLeader(gs.leaderIndex, gs.players.length);
            const nextLeaderName = gs.players[nextLeaderIdx].name;

            // Avança o estado interno para a próxima missão (será usado por continueAfterMission)
            gs.currentMission = nextMissionIdx;
            gs.leaderIndex = nextLeaderIdx;
            gs.proposedTeam = [];
            gs.teamVotes = {};
            gs.missionVotes = {};
            // Fase permanece como mission_result até o host clicar "Continuar",
            // que decidirá se avança para team_proposal, assassin_phase ou game_over
            gs.phase = "mission_result";

            publishGameEvent({
                type: "mission_result",
                outcome,
                newLeader: nextLeaderName,
                newMission: nextMissionIdx,
            });
        },
        [publishGameEvent],
    );

    const resetGame = useCallback(() => {
        gameStateRef.current = null;
        setLocalState(INITIAL_LOCAL_STATE);
    }, []);

    return {
        localState,
        startGame,
        confirmRoleReveal,
        proposeTeam,
        castTeamVote,
        castMissionVote,
        chooseAssassinTarget,
        continueAfterMission,
        handleGameEvent,
        resetGame,
    };
}

/** Aplica um evento ao estado local do jogador. Função pura. */
function applyEventToLocalState(
    prev: AvalonLocalState,
    event: AvalonGameEvent,
    myName: string,
): AvalonLocalState {
    switch (event.type) {
        case "game_started": {
            const leaderName = event.state.players[event.state.leaderIndex].name;
            return {
                ...INITIAL_LOCAL_STATE,
                phase: "role_reveal",
                players: event.state.players.map((p) => p.name),
                leaderName,
                isLeader: leaderName === myName,
                requiredTeamSize: getTeamSize(event.state.players.length, 0),
            };
        }

        case "role_assigned":
            if (event.playerName !== myName) return prev;
            return {
                ...prev,
                myRole: event.role,
                myLoyalty: event.loyalty,
                visiblePlayers: event.visiblePlayers,
                isAssassin: event.role === "assassin",
            };

        case "role_reveal_complete":
            return {
                ...prev,
                phase: "team_proposal",
                isLeader: prev.leaderName === myName,
            };

        case "team_proposed":
            return {
                ...prev,
                phase: "team_vote",
                proposedTeam: event.team,
                leaderName: event.leader,
                hasVoted: false,
                teamVoteResult: null,
                isOnTeam: event.team.includes(myName),
                isLeader: event.leader === myName,
                voteCount: 0,
            };

        case "team_vote_cast":
            return {
                ...prev,
                voteCount: prev.voteCount + 1,
                hasVoted: event.playerName === myName ? true : prev.hasVoted,
            };

        case "team_vote_result":
            return {
                ...prev,
                teamVoteResult: { votes: event.votes, approved: event.approved },
                rejectedProposals: event.rejectedCount,
                phase: event.approved ? "mission_vote" : "team_proposal",
                proposedTeam: event.approved ? prev.proposedTeam : [],
                leaderName: event.newLeader,
                isLeader: event.newLeader === myName,
                requiredTeamSize: getTeamSize(prev.players.length, event.newMission),
                currentMission: event.newMission,
                hasVoted: false,
                voteCount: 0,
            };

        case "mission_vote_cast":
            return {
                ...prev,
                voteCount: prev.voteCount + 1,
                hasVoted: event.playerName === myName ? true : prev.hasVoted,
            };

        case "mission_result": {
            const newResults = [...prev.missionResults];
            newResults[event.outcome.missionIndex] = event.outcome.result;
            return {
                ...prev,
                phase: "mission_result",
                missionResults: newResults,
                missionHistory: [...prev.missionHistory, event.outcome],
                lastMissionFailCount: event.outcome.failCount,
                leaderName: event.newLeader,
                isLeader: event.newLeader === myName,
                currentMission: event.newMission,
                requiredTeamSize: event.newMission < 5
                    ? getTeamSize(prev.players.length, event.newMission)
                    : prev.requiredTeamSize,
                hasVoted: false,
                voteCount: 0,
            };
        }

        case "continue_after_mission":
            return {
                ...prev,
                phase: "team_proposal",
                proposedTeam: [],
                teamVoteResult: null,
                leaderName: event.newLeader,
                isLeader: event.newLeader === myName,
                currentMission: event.newMission,
                requiredTeamSize: event.newMission < 5
                    ? getTeamSize(prev.players.length, event.newMission)
                    : prev.requiredTeamSize,
                hasVoted: false,
                voteCount: 0,
            };

        case "assassin_phase_started":
            return { ...prev, phase: "assassin_phase" };

        case "assassin_choice":
            return { ...prev, assassinTarget: event.target };

        case "game_over":
            return { ...prev, phase: "game_over", winner: event.winner, winReason: event.reason };

        default:
            return prev;
    }
}

/** Remove papéis do estado para transmissão pública. */
function stripRoles(state: AvalonGameState): AvalonGameState {
    return {
        ...state,
        players: state.players.map((p) => ({ name: p.name })),
    };
}
