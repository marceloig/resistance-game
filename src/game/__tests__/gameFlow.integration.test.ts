import { describe, it, expect } from "vitest";
import type {
    AvalonGameEvent,
    AvalonGameState,
    AvalonPlayer,
    MissionOutcome,
    TeamVoteChoice,
} from "../../types/avalon";
import {
    applyEventToLocalState,
    INITIAL_LOCAL_STATE,
    type AvalonLocalState,
} from "../../hooks/useAvalonGame";
import {
    getVisiblePlayers,
    getTeamSize,
    resolveMission,
} from "../avalonEngine";

// --- Helpers ---

const PLAYER_NAMES = ["Alice", "Bob", "Carol", "Dave", "Eve"];

/** Cria jogadores com papéis fixos para testes determinísticos. */
function fixedPlayers(): AvalonPlayer[] {
    return [
        { name: "Alice", role: "merlin", loyalty: "good" },
        { name: "Bob", role: "percival", loyalty: "good" },
        { name: "Carol", role: "loyal_servant", loyalty: "good" },
        { name: "Dave", role: "assassin", loyalty: "evil" },
        { name: "Eve", role: "morgana", loyalty: "evil" },
    ];
}

/** Cria um AvalonGameState com papéis fixos e líder no índice 0. */
function fixedGameState(overrides?: Partial<AvalonGameState>): AvalonGameState {
    return {
        phase: "role_reveal",
        players: fixedPlayers(),
        leaderIndex: 0,
        currentMission: 0,
        rejectedProposals: 0,
        proposedTeam: [],
        teamVotes: {},
        missionVotes: {},
        missionResults: ["pending", "pending", "pending", "pending", "pending"],
        missionHistory: [],
        assassinTarget: null,
        winner: null,
        ...overrides,
    };
}

/**
 * Aplica uma sequência de eventos ao estado local de um jogador.
 * Simula o que acontece no cliente quando eventos chegam pelo canal.
 */
function applyEvents(
    events: AvalonGameEvent[],
    myName: string,
    initial: AvalonLocalState = INITIAL_LOCAL_STATE,
): AvalonLocalState {
    return events.reduce(
        (state, event) => applyEventToLocalState(state, event, myName),
        initial,
    );
}

/** Cria o evento game_started com papéis removidos (como o host envia). */
function gameStartedEvent(gs: AvalonGameState): AvalonGameEvent {
    return {
        type: "game_started",
        state: {
            ...gs,
            players: gs.players.map((p) => ({ name: p.name })),
        },
    };
}

/** Cria eventos de role_assigned para todos os jogadores. */
function roleAssignedEvents(gs: AvalonGameState): AvalonGameEvent[] {
    return gs.players.map((player) => ({
        type: "role_assigned" as const,
        playerName: player.name,
        role: player.role!,
        loyalty: player.loyalty!,
        visiblePlayers: getVisiblePlayers(player.name, gs.players),
    }));
}

/**
 * Simula uma proposta de equipe aprovada por maioria.
 * Retorna os eventos: team_proposed + team_vote_cast (todos) + team_vote_result.
 */
function approvedTeamEvents(
    leader: string,
    team: string[],
    allPlayers: string[],
    missionIndex: number,
    leaderAfter: string,
): AvalonGameEvent[] {
    const votes: Record<string, TeamVoteChoice> = {};
    allPlayers.forEach((name, i) => {
        votes[name] = i < 3 ? "approve" : "reject";
    });

    return [
        { type: "team_proposed", leader, team, missionIndex },
        ...allPlayers.map((name) => ({
            type: "team_vote_cast" as const,
            playerName: name,
            vote: votes[name],
        })),
        {
            type: "team_vote_result" as const,
            votes,
            approved: true,
            rejectedCount: 0,
            newLeader: leaderAfter,
            newMission: missionIndex,
        },
    ];
}

/**
 * Simula votos de missão e o resultado.
 * Retorna os eventos: mission_vote_cast (cada membro) + mission_result.
 */
function missionVoteEvents(
    team: string[],
    failVoters: string[],
    missionIndex: number,
    playerCount: number,
    nextLeaderName: string,
): AvalonGameEvent[] {
    const outcome = resolveMission(
        Object.fromEntries(
            team.map((name) => [name, failVoters.includes(name) ? "fail" : "success"]),
        ),
        playerCount,
        missionIndex,
    );

    return [
        ...team.map((name) => ({
            type: "mission_vote_cast" as const,
            playerName: name,
            vote: (failVoters.includes(name) ? "fail" : "success") as "success" | "fail",
        })),
        {
            type: "mission_result" as const,
            outcome,
            newLeader: nextLeaderName,
            newMission: missionIndex + 1,
        },
    ];
}

// --- Integration Tests ---

describe("Fluxo completo do jogo — integração", () => {
    describe("Início do jogo e revelação de papéis", () => {
        it("game_started transiciona de waiting para role_reveal", () => {
            const gs = fixedGameState();
            const state = applyEvents([gameStartedEvent(gs)], "Alice");

            expect(state.phase).toBe("role_reveal");
            expect(state.players).toEqual(PLAYER_NAMES);
            expect(state.leaderName).toBe("Alice");
            expect(state.isLeader).toBe(true);
        });

        it("role_assigned atribui papel apenas ao jogador correto", () => {
            const gs = fixedGameState();
            const events = [gameStartedEvent(gs), ...roleAssignedEvents(gs)];

            const aliceState = applyEvents(events, "Alice");
            expect(aliceState.myRole).toBe("merlin");
            expect(aliceState.myLoyalty).toBe("good");
            expect(aliceState.isAssassin).toBe(false);

            const daveState = applyEvents(events, "Dave");
            expect(daveState.myRole).toBe("assassin");
            expect(daveState.myLoyalty).toBe("evil");
            expect(daveState.isAssassin).toBe(true);
        });

        it("Merlin vê jogadores malvados, Servo Leal não vê nada", () => {
            const gs = fixedGameState();
            const events = [gameStartedEvent(gs), ...roleAssignedEvents(gs)];

            const aliceState = applyEvents(events, "Alice");
            const evilVisible = aliceState.visiblePlayers.filter((p) => p.appearsAs === "evil");
            expect(evilVisible).toHaveLength(2);

            const carolState = applyEvents(events, "Carol");
            const carolVisible = carolState.visiblePlayers.filter((p) => p.appearsAs !== "unknown");
            expect(carolVisible).toHaveLength(0);
        });

        it("role_reveal_complete transiciona para team_proposal", () => {
            const gs = fixedGameState();
            const events: AvalonGameEvent[] = [
                gameStartedEvent(gs),
                ...roleAssignedEvents(gs),
                { type: "role_reveal_complete" },
            ];

            const state = applyEvents(events, "Alice");
            expect(state.phase).toBe("team_proposal");
            expect(state.isLeader).toBe(true);
        });
    });

    describe("Proposta e votação de equipe", () => {
        it("team_proposed mostra equipe e transiciona para team_vote", () => {
            const gs = fixedGameState();
            const events: AvalonGameEvent[] = [
                gameStartedEvent(gs),
                { type: "role_reveal_complete" },
                { type: "team_proposed", leader: "Alice", team: ["Alice", "Bob"], missionIndex: 0 },
            ];

            const bobState = applyEvents(events, "Bob");
            expect(bobState.phase).toBe("team_vote");
            expect(bobState.proposedTeam).toEqual(["Alice", "Bob"]);
            expect(bobState.isOnTeam).toBe(true);
            expect(bobState.hasVoted).toBe(false);

            const carolState = applyEvents(events, "Carol");
            expect(carolState.isOnTeam).toBe(false);
        });

        it("team_vote_cast incrementa voteCount e marca hasVoted", () => {
            const gs = fixedGameState();
            const events: AvalonGameEvent[] = [
                gameStartedEvent(gs),
                { type: "role_reveal_complete" },
                { type: "team_proposed", leader: "Alice", team: ["Alice", "Bob"], missionIndex: 0 },
                { type: "team_vote_cast", playerName: "Alice", vote: "approve" },
                { type: "team_vote_cast", playerName: "Bob", vote: "approve" },
            ];

            const aliceState = applyEvents(events, "Alice");
            expect(aliceState.hasVoted).toBe(true);
            expect(aliceState.voteCount).toBe(2);

            const carolState = applyEvents(events, "Carol");
            expect(carolState.hasVoted).toBe(false);
            expect(carolState.voteCount).toBe(2);
        });

        it("equipe aprovada transiciona para mission_vote", () => {
            const gs = fixedGameState();
            const events: AvalonGameEvent[] = [
                gameStartedEvent(gs),
                { type: "role_reveal_complete" },
                ...approvedTeamEvents("Alice", ["Alice", "Bob"], PLAYER_NAMES, 0, "Alice"),
            ];

            const state = applyEvents(events, "Alice");
            expect(state.phase).toBe("mission_vote");
            expect(state.proposedTeam).toEqual(["Alice", "Bob"]);
        });

        it("equipe rejeitada volta para team_proposal com novo líder", () => {
            const gs = fixedGameState();
            const votes: Record<string, TeamVoteChoice> = {
                Alice: "approve", Bob: "reject", Carol: "reject", Dave: "reject", Eve: "reject",
            };
            const events: AvalonGameEvent[] = [
                gameStartedEvent(gs),
                { type: "role_reveal_complete" },
                { type: "team_proposed", leader: "Alice", team: ["Alice", "Bob"], missionIndex: 0 },
                ...PLAYER_NAMES.map((name) => ({
                    type: "team_vote_cast" as const,
                    playerName: name,
                    vote: votes[name],
                })),
                {
                    type: "team_vote_result",
                    votes,
                    approved: false,
                    rejectedCount: 1,
                    newLeader: "Bob",
                    newMission: 0,
                },
            ];

            const state = applyEvents(events, "Bob");
            expect(state.phase).toBe("team_proposal");
            expect(state.leaderName).toBe("Bob");
            expect(state.isLeader).toBe(true);
            expect(state.rejectedProposals).toBe(1);
            expect(state.proposedTeam).toEqual([]);
        });
    });

    describe("Execução de missão", () => {
        it("missão bem-sucedida mostra resultado correto", () => {
            const gs = fixedGameState();
            const team = ["Alice", "Bob"];
            const events: AvalonGameEvent[] = [
                gameStartedEvent(gs),
                { type: "role_reveal_complete" },
                ...approvedTeamEvents("Alice", team, PLAYER_NAMES, 0, "Alice"),
                ...missionVoteEvents(team, [], 0, 5, "Bob"),
            ];

            const state = applyEvents(events, "Alice");
            expect(state.phase).toBe("mission_result");
            expect(state.missionResults[0]).toBe("success");
            expect(state.missionHistory).toHaveLength(1);
            expect(state.missionHistory[0].result).toBe("success");
            expect(state.currentMission).toBe(1);
        });

        it("missão falha com 1 voto de falha", () => {
            const gs = fixedGameState();
            const team = ["Alice", "Dave"];
            const events: AvalonGameEvent[] = [
                gameStartedEvent(gs),
                { type: "role_reveal_complete" },
                ...approvedTeamEvents("Alice", team, PLAYER_NAMES, 0, "Alice"),
                ...missionVoteEvents(team, ["Dave"], 0, 5, "Bob"),
            ];

            const state = applyEvents(events, "Alice");
            expect(state.missionResults[0]).toBe("fail");
            expect(state.missionHistory[0].failCount).toBe(1);
        });

        it("continue_after_mission avança para team_proposal", () => {
            const gs = fixedGameState();
            const team = ["Alice", "Bob"];
            const events: AvalonGameEvent[] = [
                gameStartedEvent(gs),
                { type: "role_reveal_complete" },
                ...approvedTeamEvents("Alice", team, PLAYER_NAMES, 0, "Alice"),
                ...missionVoteEvents(team, [], 0, 5, "Bob"),
                { type: "continue_after_mission", newLeader: "Bob", newMission: 1 },
            ];

            const state = applyEvents(events, "Bob");
            expect(state.phase).toBe("team_proposal");
            expect(state.leaderName).toBe("Bob");
            expect(state.isLeader).toBe(true);
            expect(state.currentMission).toBe(1);
            expect(state.proposedTeam).toEqual([]);
            expect(state.hasVoted).toBe(false);
        });
    });

    describe("Missão com 2 falhas necessárias (7+ jogadores)", () => {
        const sevenPlayers = ["A", "B", "C", "D", "E", "F", "G"];

        it("1 falha não é suficiente na missão 4 com 7 jogadores", () => {
            const team = ["A", "B", "C", "D"];
            const outcome: MissionOutcome = {
                missionIndex: 3,
                teamMembers: team,
                successCount: 3,
                failCount: 1,
                result: "success", // 1 falha não basta
            };

            const initial: AvalonLocalState = {
                ...INITIAL_LOCAL_STATE,
                phase: "mission_vote",
                players: sevenPlayers,
                currentMission: 3,
            };

            const state = applyEventToLocalState(initial, {
                type: "mission_result",
                outcome,
                newLeader: "B",
                newMission: 4,
            }, "A");

            expect(state.missionResults[3]).toBe("success");
        });

        it("2 falhas causam falha na missão 4 com 7 jogadores", () => {
            const team = ["A", "B", "C", "D"];
            const outcome: MissionOutcome = {
                missionIndex: 3,
                teamMembers: team,
                successCount: 2,
                failCount: 2,
                result: "fail",
            };

            const initial: AvalonLocalState = {
                ...INITIAL_LOCAL_STATE,
                phase: "mission_vote",
                players: sevenPlayers,
                currentMission: 3,
            };

            const state = applyEventToLocalState(initial, {
                type: "mission_result",
                outcome,
                newLeader: "B",
                newMission: 4,
            }, "A");

            expect(state.missionResults[3]).toBe("fail");
        });
    });

    describe("Vitória do mal por 3 missões falhadas", () => {
        it("game_over com evil após 3 falhas", () => {
            const gs = fixedGameState();
            const team = ["Alice", "Dave"];

            // Simula 3 missões falhadas + continue + game_over
            const events: AvalonGameEvent[] = [
                gameStartedEvent(gs),
                { type: "role_reveal_complete" },
            ];

            // Missão 1 — falha
            events.push(...approvedTeamEvents("Alice", team, PLAYER_NAMES, 0, "Alice"));
            events.push(...missionVoteEvents(team, ["Dave"], 0, 5, "Bob"));
            events.push({ type: "continue_after_mission", newLeader: "Bob", newMission: 1 });

            // Missão 2 — falha
            events.push(...approvedTeamEvents("Bob", team, PLAYER_NAMES, 1, "Bob"));
            events.push(...missionVoteEvents(team, ["Dave"], 1, 5, "Carol"));
            events.push({ type: "continue_after_mission", newLeader: "Carol", newMission: 2 });

            // Missão 3 — falha
            events.push(...approvedTeamEvents("Carol", team, PLAYER_NAMES, 2, "Carol"));
            events.push(...missionVoteEvents(team, ["Dave"], 2, 5, "Dave"));

            // Após 3 falhas, continueAfterMission publica game_over
            events.push({ type: "game_over", winner: "evil", reason: "Três missões falharam. Os Espiões vencem!" });

            const state = applyEvents(events, "Alice");
            expect(state.phase).toBe("game_over");
            expect(state.winner).toBe("evil");
            expect(state.winReason).toContain("falharam");
        });
    });

    describe("Vitória do bem e fase do assassino", () => {
        it("3 sucessos ativam a fase do assassino", () => {
            const gs = fixedGameState();
            const team = ["Alice", "Bob"];
            const events: AvalonGameEvent[] = [
                gameStartedEvent(gs),
                { type: "role_reveal_complete" },
            ];

            // 3 missões bem-sucedidas
            events.push(...approvedTeamEvents("Alice", team, PLAYER_NAMES, 0, "Alice"));
            events.push(...missionVoteEvents(team, [], 0, 5, "Bob"));
            events.push({ type: "continue_after_mission", newLeader: "Bob", newMission: 1 });

            events.push(...approvedTeamEvents("Bob", team, PLAYER_NAMES, 1, "Bob"));
            events.push(...missionVoteEvents(team, [], 1, 5, "Carol"));
            events.push({ type: "continue_after_mission", newLeader: "Carol", newMission: 2 });

            events.push(...approvedTeamEvents("Carol", team, PLAYER_NAMES, 2, "Carol"));
            events.push(...missionVoteEvents(team, [], 2, 5, "Dave"));

            // continueAfterMission detecta 3 sucessos → assassin_phase
            events.push({ type: "assassin_phase_started" });

            const state = applyEvents(events, "Dave");
            expect(state.phase).toBe("assassin_phase");
            expect(state.missionResults.filter((r) => r === "success")).toHaveLength(3);
        });

        it("assassino acerta Merlin — mal vence", () => {
            const events: AvalonGameEvent[] = [
                { type: "assassin_phase_started" },
                { type: "assassin_choice", target: "Alice" },
                { type: "game_over", winner: "evil", reason: "O Assassino identificou o Comandante corretamente!" },
            ];

            const initial: AvalonLocalState = {
                ...INITIAL_LOCAL_STATE,
                phase: "mission_result",
                players: PLAYER_NAMES,
                missionResults: ["success", "success", "success", "pending", "pending"],
            };

            const state = applyEvents(events, "Alice", initial);
            expect(state.phase).toBe("game_over");
            expect(state.winner).toBe("evil");
            expect(state.assassinTarget).toBe("Alice");
        });

        it("assassino erra — bem vence", () => {
            const events: AvalonGameEvent[] = [
                { type: "assassin_phase_started" },
                { type: "assassin_choice", target: "Carol" },
                { type: "game_over", winner: "good", reason: "O Assassino errou! O Comandante sobreviveu." },
            ];

            const initial: AvalonLocalState = {
                ...INITIAL_LOCAL_STATE,
                phase: "mission_result",
                players: PLAYER_NAMES,
                missionResults: ["success", "success", "success", "pending", "pending"],
            };

            const state = applyEvents(events, "Alice", initial);
            expect(state.phase).toBe("game_over");
            expect(state.winner).toBe("good");
        });
    });

    describe("Proposta forçada (5ª proposta após 4 rejeições)", () => {
        it("team_vote_result com approved=true após 4 rejeições vai direto para mission_vote", () => {
            const gs = fixedGameState();
            const events: AvalonGameEvent[] = [
                gameStartedEvent(gs),
                { type: "role_reveal_complete" },
            ];

            // 4 rejeições consecutivas
            const leaders = ["Alice", "Bob", "Carol", "Dave"];
            for (let i = 0; i < 4; i++) {
                const rejectVotes: Record<string, TeamVoteChoice> = {};
                PLAYER_NAMES.forEach((name) => { rejectVotes[name] = "reject"; });

                events.push({
                    type: "team_proposed",
                    leader: leaders[i],
                    team: [leaders[i], "Eve"],
                    missionIndex: 0,
                });
                events.push(...PLAYER_NAMES.map((name) => ({
                    type: "team_vote_cast" as const,
                    playerName: name,
                    vote: "reject" as const,
                })));
                events.push({
                    type: "team_vote_result",
                    votes: rejectVotes,
                    approved: false,
                    rejectedCount: i + 1,
                    newLeader: leaders[i + 1] ?? "Eve",
                    newMission: 0,
                });
            }

            const stateAfter4 = applyEvents(events, "Eve");
            expect(stateAfter4.rejectedProposals).toBe(4);

            // 5ª proposta — auto-aprovada pelo host (team_vote_result com approved=true)
            events.push({
                type: "team_proposed",
                leader: "Eve",
                team: ["Eve", "Alice"],
                missionIndex: 0,
            });
            events.push({
                type: "team_vote_result",
                votes: {},
                approved: true,
                rejectedCount: 0,
                newLeader: "Eve",
                newMission: 0,
            });

            const state = applyEvents(events, "Eve");
            expect(state.phase).toBe("mission_vote");
            expect(state.rejectedProposals).toBe(0);
        });
    });

    describe("Múltiplas missões — fluxo completo misto", () => {
        it("2 sucessos + 2 falhas + 1 sucesso → assassin_phase", () => {
            const gs = fixedGameState();
            const goodTeam = ["Alice", "Bob"];
            const evilTeam = ["Alice", "Dave"];
            const events: AvalonGameEvent[] = [
                gameStartedEvent(gs),
                { type: "role_reveal_complete" },
            ];

            // Missão 1 — sucesso
            events.push(...approvedTeamEvents("Alice", goodTeam, PLAYER_NAMES, 0, "Alice"));
            events.push(...missionVoteEvents(goodTeam, [], 0, 5, "Bob"));
            events.push({ type: "continue_after_mission", newLeader: "Bob", newMission: 1 });

            // Missão 2 — falha
            events.push(...approvedTeamEvents("Bob", evilTeam, PLAYER_NAMES, 1, "Bob"));
            events.push(...missionVoteEvents(evilTeam, ["Dave"], 1, 5, "Carol"));
            events.push({ type: "continue_after_mission", newLeader: "Carol", newMission: 2 });

            // Missão 3 — sucesso
            events.push(...approvedTeamEvents("Carol", goodTeam, PLAYER_NAMES, 2, "Carol"));
            events.push(...missionVoteEvents(goodTeam, [], 2, 5, "Dave"));
            events.push({ type: "continue_after_mission", newLeader: "Dave", newMission: 3 });

            // Missão 4 — falha
            events.push(...approvedTeamEvents("Dave", evilTeam, PLAYER_NAMES, 3, "Dave"));
            events.push(...missionVoteEvents(evilTeam, ["Dave"], 3, 5, "Eve"));
            events.push({ type: "continue_after_mission", newLeader: "Eve", newMission: 4 });

            // Missão 5 — sucesso (3º sucesso → assassin_phase)
            events.push(...approvedTeamEvents("Eve", goodTeam, PLAYER_NAMES, 4, "Eve"));
            events.push(...missionVoteEvents(goodTeam, [], 4, 5, "Alice"));
            events.push({ type: "assassin_phase_started" });

            const state = applyEvents(events, "Alice");
            expect(state.phase).toBe("assassin_phase");
            expect(state.missionResults).toEqual(["success", "fail", "success", "fail", "success"]);
            expect(state.missionHistory).toHaveLength(5);
        });
    });

    describe("Estado local por perspectiva do jogador", () => {
        it("isOnTeam é true apenas para membros da equipe proposta", () => {
            const gs = fixedGameState();
            const events: AvalonGameEvent[] = [
                gameStartedEvent(gs),
                { type: "role_reveal_complete" },
                { type: "team_proposed", leader: "Alice", team: ["Alice", "Carol"], missionIndex: 0 },
            ];

            expect(applyEvents(events, "Alice").isOnTeam).toBe(true);
            expect(applyEvents(events, "Carol").isOnTeam).toBe(true);
            expect(applyEvents(events, "Bob").isOnTeam).toBe(false);
            expect(applyEvents(events, "Dave").isOnTeam).toBe(false);
        });

        it("requiredTeamSize atualiza conforme a missão avança", () => {
            const gs = fixedGameState();
            const events: AvalonGameEvent[] = [gameStartedEvent(gs)];

            const state0 = applyEvents(events, "Alice");
            expect(state0.requiredTeamSize).toBe(getTeamSize(5, 0)); // 2

            const state1 = applyEventToLocalState(state0, {
                type: "continue_after_mission",
                newLeader: "Bob",
                newMission: 1,
            }, "Alice");
            expect(state1.requiredTeamSize).toBe(getTeamSize(5, 1)); // 3
        });

        it("hasVoted reseta entre fases", () => {
            const gs = fixedGameState();
            const team = ["Alice", "Bob"];
            const events: AvalonGameEvent[] = [
                gameStartedEvent(gs),
                { type: "role_reveal_complete" },
                ...approvedTeamEvents("Alice", team, PLAYER_NAMES, 0, "Alice"),
            ];

            const state = applyEvents(events, "Alice");
            // Após team_vote_result, hasVoted é resetado para a fase de missão
            expect(state.hasVoted).toBe(false);
            expect(state.voteCount).toBe(0);
        });
    });

    describe("Reset do jogo", () => {
        it("game_started reseta todo o estado local", () => {
            const gs = fixedGameState();
            const dirtyState: AvalonLocalState = {
                ...INITIAL_LOCAL_STATE,
                phase: "game_over",
                winner: "evil",
                winReason: "test",
                currentMission: 4,
                missionResults: ["fail", "fail", "fail", "success", "success"],
            };

            const state = applyEventToLocalState(dirtyState, gameStartedEvent(gs), "Alice");
            expect(state.phase).toBe("role_reveal");
            expect(state.winner).toBeNull();
            expect(state.currentMission).toBe(0);
            expect(state.missionResults).toEqual(["pending", "pending", "pending", "pending", "pending"]);
        });
    });
});
