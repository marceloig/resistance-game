import type { AvalonRole } from "../types/avalon";

/**
 * Tamanho da equipe por missão e número de jogadores.
 * Índice 0 = missão 1, índice 4 = missão 5.
 *
 * Fonte: https://avalon-game.com/wiki/rules/
 */
export const MISSION_TEAM_SIZES: Record<number, number[]> = {
    5:  [2, 3, 2, 3, 3],
    6:  [2, 3, 4, 3, 4],
    7:  [2, 3, 3, 4, 4],
    8:  [3, 4, 4, 5, 5],
    9:  [3, 4, 4, 5, 5],
    10: [3, 4, 4, 5, 5],
};

/**
 * Missões que requerem 2 cartas de falha para falhar (marcadas com * nas regras).
 * Chave = número de jogadores, valor = índices das missões (0-based).
 */
export const TWO_FAIL_MISSIONS: Record<number, number[]> = {
    5:  [],
    6:  [],
    7:  [3],       // Missão 4
    8:  [3],       // Missão 4
    9:  [3],       // Missão 4
    10: [3],       // Missão 4
};

/**
 * Distribuição de papéis por número de jogadores.
 * Usa papéis especiais: Comandante, Assassino, Guarda-Costas, Falso Comandante.
 */
export function getRolesForPlayerCount(count: number): AvalonRole[] {
    switch (count) {
        case 5:
            // 3 resistência (Comandante, Guarda-Costas, Operativo), 2 espiões (Assassino, Falso Comandante)
            return ["merlin", "percival", "loyal_servant", "assassin", "morgana"];
        case 6:
            // 4 resistência, 2 espiões
            return ["merlin", "percival", "loyal_servant", "loyal_servant", "assassin", "morgana"];
        case 7:
            // 4 resistência, 3 espiões
            return ["merlin", "percival", "loyal_servant", "loyal_servant", "assassin", "morgana", "minion"];
        case 8:
            // 5 resistência, 3 espiões
            return ["merlin", "percival", "loyal_servant", "loyal_servant", "loyal_servant", "assassin", "morgana", "minion"];
        case 9:
            // 6 resistência, 3 espiões
            return ["merlin", "percival", "loyal_servant", "loyal_servant", "loyal_servant", "loyal_servant", "assassin", "morgana", "minion"];
        case 10:
            // 6 resistência, 4 espiões
            return ["merlin", "percival", "loyal_servant", "loyal_servant", "loyal_servant", "loyal_servant", "assassin", "morgana", "minion", "minion"];
        default:
            throw new Error(`Número de jogadores inválido: ${count}. Esperado: 5-10.`);
    }
}

/** Número máximo de propostas rejeitadas antes de forçar a equipe. */
export const MAX_REJECTED_PROPOSALS = 4;

/** Total de missões no jogo. */
export const TOTAL_MISSIONS = 5;

/** Missões necessárias para vencer. */
export const MISSIONS_TO_WIN = 3;

/** Número de jogadores suportado. */
export const MIN_PLAYERS = 5;
export const MAX_PLAYERS = 10;
