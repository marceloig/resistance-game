import type {
    AvalonGameState,
    AvalonPlayer,
    Loyalty,
    MissionOutcome,
    MissionVoteChoice,
    TeamVoteChoice,
    VisiblePlayerInfo,
} from "../types/avalon";
import {
    MISSION_TEAM_SIZES,
    TWO_FAIL_MISSIONS,
    MAX_REJECTED_PROPOSALS,
    MISSIONS_TO_WIN,
} from "./avalonConfig";
import { getRolesForPlayerCount } from "./avalonConfig";
import { ROLE_LOYALTY } from "../types/avalon";

/**
 * Cria o estado inicial do jogo com papéis atribuídos aleatoriamente.
 *
 * Uso:
 * ```ts
 * const state = createInitialGameState(["Alice", "Bob", "Carol", "Dave", "Eve"]);
 * ```
 */
export function createInitialGameState(playerNames: string[]): AvalonGameState {
    const roles = getRolesForPlayerCount(playerNames.length);
    const shuffledRoles = shuffleArray([...roles]);

    const players: AvalonPlayer[] = playerNames.map((name, i) => ({
        name,
        role: shuffledRoles[i],
        loyalty: ROLE_LOYALTY[shuffledRoles[i]],
    }));

    // Líder inicial aleatório
    const leaderIndex = Math.floor(Math.random() * players.length);

    return {
        phase: "role_reveal",
        players,
        leaderIndex,
        currentMission: 0,
        rejectedProposals: 0,
        proposedTeam: [],
        teamVotes: {},
        missionVotes: {},
        missionResults: ["pending", "pending", "pending", "pending", "pending"],
        missionHistory: [],
        assassinTarget: null,
        winner: null,
    };
}

/**
 * Retorna as informações visíveis para um jogador baseado no seu papel.
 *
 * - Merlin: vê todos os malvados (exceto Mordred, se existir)
 * - Percival: vê Merlin e Morgana, sem distinguir
 * - Malvados: veem os outros malvados
 * - Servos Leais: não veem nada
 */
export function getVisiblePlayers(
    observerName: string,
    players: AvalonPlayer[]
): VisiblePlayerInfo[] {
    const observer = players.find((p) => p.name === observerName);
    if (!observer?.role) return [];

    return players
        .filter((p) => p.name !== observerName)
        .map((p) => {
            const info: VisiblePlayerInfo = { name: p.name, appearsAs: "unknown" };

            switch (observer.role) {
                case "merlin":
                    // Merlin vê os malvados (exceto Mordred, que não está implementado)
                    if (p.loyalty === "evil") {
                        info.appearsAs = "evil";
                    }
                    break;

                case "percival":
                    // Percival vê Merlin e Morgana, sem saber quem é quem
                    if (p.role === "merlin" || p.role === "morgana") {
                        info.appearsAs = "merlin_or_morgana";
                    }
                    break;

                case "assassin":
                case "morgana":
                case "minion":
                    // Malvados veem os outros malvados
                    if (p.loyalty === "evil") {
                        info.appearsAs = "evil";
                    }
                    break;

                default:
                    // Servos Leais não veem nada especial
                    break;
            }

            return info;
        });
}

/** Retorna o tamanho da equipe para a missão atual. */
export function getTeamSize(playerCount: number, missionIndex: number): number {
    const sizes = MISSION_TEAM_SIZES[playerCount];
    if (!sizes) {
        throw new Error(`Número de jogadores inválido: ${playerCount}. Esperado: 5-10.`);
    }
    return sizes[missionIndex];
}

/** Verifica se a missão requer 2 falhas para falhar. */
export function requiresTwoFails(playerCount: number, missionIndex: number): boolean {
    return TWO_FAIL_MISSIONS[playerCount]?.includes(missionIndex) ?? false;
}

/** Resolve o resultado de uma votação de equipe. */
export function resolveTeamVote(
    votes: Record<string, TeamVoteChoice>,
    playerCount: number
): boolean {
    const approvals = Object.values(votes).filter((v) => v === "approve").length;
    // Maioria simples
    return approvals > playerCount / 2;
}

/** Resolve o resultado de uma missão baseado nos votos dos membros. */
export function resolveMission(
    votes: Record<string, MissionVoteChoice>,
    playerCount: number,
    missionIndex: number
): MissionOutcome {
    const failCount = Object.values(votes).filter((v) => v === "fail").length;
    const successCount = Object.values(votes).filter((v) => v === "success").length;
    const needsTwoFails = requiresTwoFails(playerCount, missionIndex);
    const failed = needsTwoFails ? failCount >= 2 : failCount >= 1;

    return {
        missionIndex,
        teamMembers: Object.keys(votes),
        successCount,
        failCount,
        result: failed ? "fail" : "success",
    };
}

/** Avança o líder para o próximo jogador. */
export function nextLeader(currentIndex: number, playerCount: number): number {
    return (currentIndex + 1) % playerCount;
}

/** Conta quantas missões foram completadas com sucesso. */
export function countSuccesses(results: AvalonGameState["missionResults"]): number {
    return results.filter((r) => r === "success").length;
}

/** Conta quantas missões falharam. */
export function countFailures(results: AvalonGameState["missionResults"]): number {
    return results.filter((r) => r === "fail").length;
}

/**
 * Verifica se o jogo deve ir para a fase do assassino.
 * Retorna true se o bem venceu 3 missões (assassino ainda pode reverter).
 */
export function shouldStartAssassinPhase(results: AvalonGameState["missionResults"]): boolean {
    return countSuccesses(results) >= MISSIONS_TO_WIN;
}

/** Verifica se o mal venceu por 3 missões falhadas. */
export function hasEvilWonByMissions(results: AvalonGameState["missionResults"]): boolean {
    return countFailures(results) >= MISSIONS_TO_WIN;
}

/**
 * Verifica se a 5ª proposta deve ser forçada (sem votação).
 * Após 4 rejeições consecutivas, a 5ª proposta é aceita automaticamente.
 */
export function isForcedProposal(rejectedCount: number): boolean {
    return rejectedCount >= MAX_REJECTED_PROPOSALS;
}

/** Encontra o jogador com o papel de Merlin. */
export function findMerlin(players: AvalonPlayer[]): AvalonPlayer | undefined {
    return players.find((p) => p.role === "merlin");
}

/** Verifica se o assassino acertou o Merlin. */
export function didAssassinFindMerlin(
    target: string,
    players: AvalonPlayer[]
): boolean {
    const merlin = findMerlin(players);
    return merlin?.name === target;
}

/** Determina o vencedor final do jogo. */
export function determineWinner(
    state: AvalonGameState
): { winner: Loyalty; reason: string } {
    if (hasEvilWonByMissions(state.missionResults)) {
        return { winner: "evil", reason: "Três missões falharam." };
    }

    if (state.assassinTarget) {
        if (didAssassinFindMerlin(state.assassinTarget, state.players)) {
            return { winner: "evil", reason: "O Assassino identificou Merlin corretamente!" };
        }
        return { winner: "good", reason: "O Assassino errou! Merlin sobreviveu." };
    }

    return { winner: "good", reason: "Três missões foram completadas com sucesso!" };
}

/** Embaralha um array usando Fisher-Yates. */
function shuffleArray<T>(arr: T[]): T[] {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}
