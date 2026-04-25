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
 * Papéis opcionais que o host pode ativar antes de iniciar o jogo.
 * Quando desativados, são substituídos por Operativo da Resistência ou Espião.
 *
 * "bodyguard_false_commander" ativa ambos juntos — Guarda-Costas só faz sentido
 * com Falso Comandante (sua habilidade é distinguir entre os dois).
 */
export type OptionalRole = "commander" | "bodyguard_false_commander" | "assassin";

/** Todos os papéis opcionais disponíveis com seus rótulos em pt-BR. */
export const OPTIONAL_ROLES: { id: OptionalRole; label: string; description: string }[] = [
    { id: "commander", label: "Comandante", description: "Conhece todos os espiões. Alvo do Assassino." },
    { id: "assassin", label: "Assassino", description: "Pode eliminar o Comandante após 3 missões bem-sucedidas." },
    { id: "bodyguard_false_commander", label: "Guarda-Costas + Falso Comandante", description: "Guarda-Costas vê Comandante e Falso Comandante sem distinguir. Falso Comandante se passa por Comandante." },
];

/**
 * Proporção de jogadores bons e maus por número total de jogadores.
 * Fonte: regras oficiais do The Resistance.
 */
const GOOD_EVIL_SPLIT: Record<number, { good: number; evil: number }> = {
    5:  { good: 3, evil: 2 },
    6:  { good: 4, evil: 2 },
    7:  { good: 4, evil: 3 },
    8:  { good: 5, evil: 3 },
    9:  { good: 6, evil: 3 },
    10: { good: 6, evil: 4 },
};

/**
 * Gera a lista de papéis baseada no número de jogadores e papéis opcionais ativados.
 *
 * Papéis padrão: Operativo da Resistência (bom) e Espião (mal).
 * Papéis opcionais substituem um Operativo ou Espião conforme a lealdade.
 *
 * Uso:
 * ```ts
 * getRolesForPlayerCount(5, new Set(["commander", "assassin"]));
 * ```
 */
export function getRolesForPlayerCount(
    count: number,
    enabledOptionalRoles: Set<OptionalRole> = new Set(),
): AvalonRole[] {
    const split = GOOD_EVIL_SPLIT[count];
    if (!split) {
        throw new Error(`Número de jogadores inválido: ${count}. Esperado: 5-10.`);
    }

    const goodRoles: AvalonRole[] = [];
    const evilRoles: AvalonRole[] = [];

    // Adiciona papéis opcionais bons
    if (enabledOptionalRoles.has("commander")) goodRoles.push("merlin");
    if (enabledOptionalRoles.has("bodyguard_false_commander")) goodRoles.push("percival");

    // Adiciona papéis opcionais maus
    if (enabledOptionalRoles.has("assassin")) evilRoles.push("assassin");
    if (enabledOptionalRoles.has("bodyguard_false_commander")) evilRoles.push("morgana");

    // Preenche o restante com papéis genéricos
    while (goodRoles.length < split.good) goodRoles.push("loyal_servant");
    while (evilRoles.length < split.evil) evilRoles.push("minion");

    return [...goodRoles, ...evilRoles];
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
