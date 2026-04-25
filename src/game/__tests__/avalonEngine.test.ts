import { describe, it, expect } from "vitest";
import type { AvalonGameState, AvalonPlayer, MissionVoteChoice } from "../../types/avalon";
import {
    createInitialGameState,
    getVisiblePlayers,
    getTeamSize,
    requiresTwoFails,
    resolveTeamVote,
    resolveMission,
    nextLeader,
    countSuccesses,
    countFailures,
    shouldStartAssassinPhase,
    hasEvilWonByMissions,
    isForcedProposal,
    findMerlin,
    didAssassinFindMerlin,
    determineWinner,
} from "../avalonEngine";

// --- Helpers ---

/** Cria uma lista de jogadores com papéis fixos para testes determinísticos. */
function buildPlayers(): AvalonPlayer[] {
    return [
        { name: "Alice", role: "merlin", loyalty: "good" },
        { name: "Bob", role: "percival", loyalty: "good" },
        { name: "Carol", role: "loyal_servant", loyalty: "good" },
        { name: "Dave", role: "assassin", loyalty: "evil" },
        { name: "Eve", role: "morgana", loyalty: "evil" },
    ];
}

/** Cria um estado de jogo base para testes. */
function buildGameState(overrides?: Partial<AvalonGameState>): AvalonGameState {
    return {
        phase: "team_proposal",
        players: buildPlayers(),
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

// --- Tests ---

describe("createInitialGameState", () => {
    it("cria estado com 5 jogadores e fase role_reveal", () => {
        const names = ["A", "B", "C", "D", "E"];
        const state = createInitialGameState(names);

        expect(state.phase).toBe("role_reveal");
        expect(state.players).toHaveLength(5);
        expect(state.currentMission).toBe(0);
        expect(state.rejectedProposals).toBe(0);
        expect(state.missionResults).toEqual(["pending", "pending", "pending", "pending", "pending"]);
    });

    it("atribui papéis a todos os jogadores", () => {
        const state = createInitialGameState(["A", "B", "C", "D", "E"]);

        for (const player of state.players) {
            expect(player.role).toBeDefined();
            expect(player.loyalty).toBeDefined();
        }
    });

    it("leaderIndex está dentro do intervalo válido", () => {
        const state = createInitialGameState(["A", "B", "C", "D", "E"]);
        expect(state.leaderIndex).toBeGreaterThanOrEqual(0);
        expect(state.leaderIndex).toBeLessThan(5);
    });

    it("contém exatamente 1 merlin e 1 assassin para 5 jogadores", () => {
        const state = createInitialGameState(["A", "B", "C", "D", "E"]);
        const roles = state.players.map((p) => p.role);
        expect(roles.filter((r) => r === "merlin")).toHaveLength(1);
        expect(roles.filter((r) => r === "assassin")).toHaveLength(1);
    });
});

describe("getVisiblePlayers", () => {
    const players = buildPlayers();

    it("Merlin vê todos os jogadores malvados como 'evil'", () => {
        const visible = getVisiblePlayers("Alice", players);

        const dave = visible.find((p) => p.name === "Dave")!;
        const eve = visible.find((p) => p.name === "Eve")!;
        expect(dave.appearsAs).toBe("evil");
        expect(eve.appearsAs).toBe("evil");
    });

    it("Merlin vê jogadores bons como 'unknown'", () => {
        const visible = getVisiblePlayers("Alice", players);

        const bob = visible.find((p) => p.name === "Bob")!;
        const carol = visible.find((p) => p.name === "Carol")!;
        expect(bob.appearsAs).toBe("unknown");
        expect(carol.appearsAs).toBe("unknown");
    });

    it("Merlin não vê a si mesmo na lista", () => {
        const visible = getVisiblePlayers("Alice", players);
        expect(visible.find((p) => p.name === "Alice")).toBeUndefined();
    });

    it("Percival vê Merlin e Morgana como 'merlin_or_morgana'", () => {
        const visible = getVisiblePlayers("Bob", players);

        const alice = visible.find((p) => p.name === "Alice")!;
        const eve = visible.find((p) => p.name === "Eve")!;
        expect(alice.appearsAs).toBe("merlin_or_morgana");
        expect(eve.appearsAs).toBe("merlin_or_morgana");
    });

    it("Percival não distingue Merlin de Morgana", () => {
        const visible = getVisiblePlayers("Bob", players);
        const alice = visible.find((p) => p.name === "Alice")!;
        const eve = visible.find((p) => p.name === "Eve")!;
        // Ambos aparecem com o mesmo rótulo
        expect(alice.appearsAs).toBe(eve.appearsAs);
    });

    it("Assassin vê outros malvados como 'evil'", () => {
        const visible = getVisiblePlayers("Dave", players);
        const eve = visible.find((p) => p.name === "Eve")!;
        expect(eve.appearsAs).toBe("evil");
    });

    it("Assassin vê jogadores bons como 'unknown'", () => {
        const visible = getVisiblePlayers("Dave", players);
        const alice = visible.find((p) => p.name === "Alice")!;
        expect(alice.appearsAs).toBe("unknown");
    });

    it("Morgana vê outros malvados como 'evil'", () => {
        const visible = getVisiblePlayers("Eve", players);
        const dave = visible.find((p) => p.name === "Dave")!;
        expect(dave.appearsAs).toBe("evil");
    });

    it("Servo Leal não vê nada especial", () => {
        const visible = getVisiblePlayers("Carol", players);
        for (const p of visible) {
            expect(p.appearsAs).toBe("unknown");
        }
    });

    it("retorna lista vazia para jogador sem papel", () => {
        const noRolePlayers: AvalonPlayer[] = [
            { name: "X" },
            { name: "Y", role: "merlin", loyalty: "good" },
        ];
        expect(getVisiblePlayers("X", noRolePlayers)).toEqual([]);
    });
});

describe("getTeamSize", () => {
    it("retorna tamanhos corretos para 5 jogadores", () => {
        expect(getTeamSize(5, 0)).toBe(2);
        expect(getTeamSize(5, 1)).toBe(3);
        expect(getTeamSize(5, 2)).toBe(2);
        expect(getTeamSize(5, 3)).toBe(3);
        expect(getTeamSize(5, 4)).toBe(3);
    });

    it("retorna tamanhos corretos para 8 jogadores", () => {
        expect(getTeamSize(8, 0)).toBe(3);
        expect(getTeamSize(8, 1)).toBe(4);
        expect(getTeamSize(8, 2)).toBe(4);
        expect(getTeamSize(8, 3)).toBe(5);
        expect(getTeamSize(8, 4)).toBe(5);
    });

    it("lança erro para número de jogadores inválido", () => {
        expect(() => getTeamSize(4, 0)).toThrow("Número de jogadores inválido: 4");
        expect(() => getTeamSize(11, 0)).toThrow("Número de jogadores inválido: 11");
    });
});

describe("requiresTwoFails", () => {
    it("retorna false para 5 jogadores em qualquer missão", () => {
        for (let m = 0; m < 5; m++) {
            expect(requiresTwoFails(5, m)).toBe(false);
        }
    });

    it("retorna true para missão 4 (índice 3) com 7+ jogadores", () => {
        for (let n = 7; n <= 10; n++) {
            expect(requiresTwoFails(n, 3)).toBe(true);
        }
    });

    it("retorna false para missões não marcadas com 7+ jogadores", () => {
        expect(requiresTwoFails(7, 0)).toBe(false);
        expect(requiresTwoFails(7, 1)).toBe(false);
        expect(requiresTwoFails(7, 2)).toBe(false);
        expect(requiresTwoFails(7, 4)).toBe(false);
    });

    it("retorna false para contagem de jogadores desconhecida", () => {
        expect(requiresTwoFails(3, 0)).toBe(false);
    });
});

describe("resolveTeamVote", () => {
    it("aprova com maioria simples (3 de 5)", () => {
        const votes = { A: "approve" as const, B: "approve" as const, C: "approve" as const, D: "reject" as const, E: "reject" as const };
        expect(resolveTeamVote(votes, 5)).toBe(true);
    });

    it("rejeita com empate (2 de 4 não é maioria)", () => {
        const votes = { A: "approve" as const, B: "approve" as const, C: "reject" as const, D: "reject" as const };
        expect(resolveTeamVote(votes, 4)).toBe(false);
    });

    it("rejeita quando minoria aprova", () => {
        const votes = { A: "approve" as const, B: "reject" as const, C: "reject" as const, D: "reject" as const, E: "reject" as const };
        expect(resolveTeamVote(votes, 5)).toBe(false);
    });

    it("aprova com unanimidade", () => {
        const votes = { A: "approve" as const, B: "approve" as const, C: "approve" as const };
        expect(resolveTeamVote(votes, 3)).toBe(true);
    });
});

describe("resolveMission", () => {
    it("missão bem-sucedida quando todos votam sucesso", () => {
        const votes: Record<string, MissionVoteChoice> = { A: "success", B: "success" };
        const outcome = resolveMission(votes, 5, 0);

        expect(outcome.result).toBe("success");
        expect(outcome.successCount).toBe(2);
        expect(outcome.failCount).toBe(0);
        expect(outcome.missionIndex).toBe(0);
    });

    it("missão falha com 1 voto de falha (missão normal)", () => {
        const votes: Record<string, MissionVoteChoice> = { A: "success", B: "fail" };
        const outcome = resolveMission(votes, 5, 0);

        expect(outcome.result).toBe("fail");
        expect(outcome.failCount).toBe(1);
    });

    it("missão com 2-fail: 1 falha não é suficiente para falhar", () => {
        // Missão 4 (índice 3) com 7 jogadores requer 2 falhas
        const votes: Record<string, MissionVoteChoice> = {
            A: "success", B: "success", C: "success", D: "fail",
        };
        const outcome = resolveMission(votes, 7, 3);

        expect(outcome.result).toBe("success");
        expect(outcome.failCount).toBe(1);
    });

    it("missão com 2-fail: 2 falhas causam falha", () => {
        const votes: Record<string, MissionVoteChoice> = {
            A: "success", B: "success", C: "fail", D: "fail",
        };
        const outcome = resolveMission(votes, 7, 3);

        expect(outcome.result).toBe("fail");
        expect(outcome.failCount).toBe(2);
    });

    it("inclui membros da equipe no resultado", () => {
        const votes: Record<string, MissionVoteChoice> = { Alice: "success", Bob: "success" };
        const outcome = resolveMission(votes, 5, 0);

        expect(outcome.teamMembers).toContain("Alice");
        expect(outcome.teamMembers).toContain("Bob");
    });
});

describe("nextLeader", () => {
    it("avança para o próximo índice", () => {
        expect(nextLeader(0, 5)).toBe(1);
        expect(nextLeader(2, 5)).toBe(3);
    });

    it("volta ao início quando atinge o final", () => {
        expect(nextLeader(4, 5)).toBe(0);
    });

    it("funciona com 2 jogadores", () => {
        expect(nextLeader(0, 2)).toBe(1);
        expect(nextLeader(1, 2)).toBe(0);
    });
});

describe("countSuccesses / countFailures", () => {
    it("conta sucessos corretamente", () => {
        expect(countSuccesses(["success", "fail", "success", "pending", "pending"])).toBe(2);
    });

    it("conta falhas corretamente", () => {
        expect(countFailures(["fail", "fail", "success", "pending", "pending"])).toBe(2);
    });

    it("retorna 0 quando tudo está pendente", () => {
        expect(countSuccesses(["pending", "pending", "pending", "pending", "pending"])).toBe(0);
        expect(countFailures(["pending", "pending", "pending", "pending", "pending"])).toBe(0);
    });
});

describe("shouldStartAssassinPhase", () => {
    it("retorna true com 3 sucessos", () => {
        expect(shouldStartAssassinPhase(["success", "success", "success", "pending", "pending"])).toBe(true);
    });

    it("retorna false com 2 sucessos", () => {
        expect(shouldStartAssassinPhase(["success", "success", "fail", "pending", "pending"])).toBe(false);
    });

    it("retorna true com 4 sucessos", () => {
        expect(shouldStartAssassinPhase(["success", "success", "success", "success", "pending"])).toBe(true);
    });
});

describe("hasEvilWonByMissions", () => {
    it("retorna true com 3 falhas", () => {
        expect(hasEvilWonByMissions(["fail", "fail", "fail", "pending", "pending"])).toBe(true);
    });

    it("retorna false com 2 falhas", () => {
        expect(hasEvilWonByMissions(["fail", "fail", "success", "pending", "pending"])).toBe(false);
    });
});

describe("isForcedProposal", () => {
    it("retorna false para 0-3 rejeições", () => {
        expect(isForcedProposal(0)).toBe(false);
        expect(isForcedProposal(1)).toBe(false);
        expect(isForcedProposal(2)).toBe(false);
        expect(isForcedProposal(3)).toBe(false);
    });

    it("retorna true para 4 rejeições (5ª proposta forçada)", () => {
        expect(isForcedProposal(4)).toBe(true);
    });

    it("retorna true para mais de 4 rejeições", () => {
        expect(isForcedProposal(5)).toBe(true);
    });
});

describe("findMerlin", () => {
    it("encontra Merlin na lista de jogadores", () => {
        const players = buildPlayers();
        const merlin = findMerlin(players);
        expect(merlin?.name).toBe("Alice");
        expect(merlin?.role).toBe("merlin");
    });

    it("retorna undefined se não há Merlin", () => {
        const players: AvalonPlayer[] = [
            { name: "A", role: "loyal_servant", loyalty: "good" },
        ];
        expect(findMerlin(players)).toBeUndefined();
    });
});

describe("didAssassinFindMerlin", () => {
    const players = buildPlayers();

    it("retorna true quando o alvo é Merlin", () => {
        expect(didAssassinFindMerlin("Alice", players)).toBe(true);
    });

    it("retorna false quando o alvo não é Merlin", () => {
        expect(didAssassinFindMerlin("Bob", players)).toBe(false);
        expect(didAssassinFindMerlin("Carol", players)).toBe(false);
    });
});

describe("determineWinner", () => {
    it("mal vence quando 3 missões falharam", () => {
        const state = buildGameState({
            missionResults: ["fail", "fail", "fail", "pending", "pending"],
        });
        const result = determineWinner(state);
        expect(result.winner).toBe("evil");
        expect(result.reason).toContain("falharam");
    });

    it("mal vence quando assassino acerta Merlin", () => {
        const state = buildGameState({
            missionResults: ["success", "success", "success", "pending", "pending"],
            assassinTarget: "Alice", // Alice é Merlin
        });
        const result = determineWinner(state);
        expect(result.winner).toBe("evil");
        expect(result.reason).toContain("Assassino identificou Merlin");
    });

    it("bem vence quando assassino erra", () => {
        const state = buildGameState({
            missionResults: ["success", "success", "success", "pending", "pending"],
            assassinTarget: "Bob", // Bob é Percival, não Merlin
        });
        const result = determineWinner(state);
        expect(result.winner).toBe("good");
        expect(result.reason).toContain("errou");
    });

    it("bem vence por 3 missões sem assassinato", () => {
        const state = buildGameState({
            missionResults: ["success", "success", "success", "pending", "pending"],
            assassinTarget: null,
        });
        const result = determineWinner(state);
        expect(result.winner).toBe("good");
    });

    it("3 falhas tem prioridade sobre assassinato", () => {
        const state = buildGameState({
            missionResults: ["fail", "fail", "fail", "pending", "pending"],
            assassinTarget: "Carol", // Mesmo com alvo errado, mal vence por missões
        });
        const result = determineWinner(state);
        expect(result.winner).toBe("evil");
        expect(result.reason).toContain("falharam");
    });
});
