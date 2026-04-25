import { describe, it, expect } from "vitest";
import {
    MISSION_TEAM_SIZES,
    TWO_FAIL_MISSIONS,
    MAX_REJECTED_PROPOSALS,
    TOTAL_MISSIONS,
    MISSIONS_TO_WIN,
    MIN_PLAYERS,
    MAX_PLAYERS,
    getRolesForPlayerCount,
    type OptionalRole,
} from "../avalonConfig";
import { ROLE_LOYALTY } from "../../types/avalon";

describe("avalonConfig", () => {
    describe("MISSION_TEAM_SIZES", () => {
        it("define tamanhos para 5 a 10 jogadores", () => {
            for (let n = MIN_PLAYERS; n <= MAX_PLAYERS; n++) {
                expect(MISSION_TEAM_SIZES[n]).toBeDefined();
                expect(MISSION_TEAM_SIZES[n]).toHaveLength(TOTAL_MISSIONS);
            }
        });

        it("corresponde à tabela oficial para 5 jogadores", () => {
            expect(MISSION_TEAM_SIZES[5]).toEqual([2, 3, 2, 3, 3]);
        });

        it("corresponde à tabela oficial para 7 jogadores", () => {
            expect(MISSION_TEAM_SIZES[7]).toEqual([2, 3, 3, 4, 4]);
        });

        it("corresponde à tabela oficial para 10 jogadores", () => {
            expect(MISSION_TEAM_SIZES[10]).toEqual([3, 4, 4, 5, 5]);
        });
    });

    describe("TWO_FAIL_MISSIONS", () => {
        it("5 e 6 jogadores não têm missões com 2 falhas", () => {
            expect(TWO_FAIL_MISSIONS[5]).toEqual([]);
            expect(TWO_FAIL_MISSIONS[6]).toEqual([]);
        });

        it("7-10 jogadores requerem 2 falhas na missão 4 (índice 3)", () => {
            for (let n = 7; n <= 10; n++) {
                expect(TWO_FAIL_MISSIONS[n]).toEqual([3]);
            }
        });
    });

    describe("constantes do jogo", () => {
        it("MAX_REJECTED_PROPOSALS é 4", () => {
            expect(MAX_REJECTED_PROPOSALS).toBe(4);
        });

        it("MISSIONS_TO_WIN é 3", () => {
            expect(MISSIONS_TO_WIN).toBe(3);
        });

        it("TOTAL_MISSIONS é 5", () => {
            expect(TOTAL_MISSIONS).toBe(5);
        });
    });

    describe("getRolesForPlayerCount", () => {
        it("lança erro para contagem inválida de jogadores", () => {
            expect(() => getRolesForPlayerCount(4)).toThrow("Número de jogadores inválido: 4");
            expect(() => getRolesForPlayerCount(11)).toThrow("Número de jogadores inválido: 11");
        });

        it("sempre inclui exatamente 1 merlin e 1 assassin quando ativados", () => {
            const enabled = new Set<OptionalRole>(["commander", "assassin"]);
            for (let n = MIN_PLAYERS; n <= MAX_PLAYERS; n++) {
                const roles = getRolesForPlayerCount(n, enabled);
                expect(roles.filter((r) => r === "merlin")).toHaveLength(1);
                expect(roles.filter((r) => r === "assassin")).toHaveLength(1);
            }
        });

        it("não inclui merlin nem assassin quando desativados", () => {
            for (let n = MIN_PLAYERS; n <= MAX_PLAYERS; n++) {
                const roles = getRolesForPlayerCount(n);
                expect(roles.filter((r) => r === "merlin")).toHaveLength(0);
                expect(roles.filter((r) => r === "assassin")).toHaveLength(0);
            }
        });

        it("sempre inclui exatamente 1 percival e 1 morgana quando ativados", () => {
            const enabled = new Set<OptionalRole>(["bodyguard_false_commander"]);
            for (let n = MIN_PLAYERS; n <= MAX_PLAYERS; n++) {
                const roles = getRolesForPlayerCount(n, enabled);
                expect(roles.filter((r) => r === "percival")).toHaveLength(1);
                expect(roles.filter((r) => r === "morgana")).toHaveLength(1);
            }
        });

        it("não inclui percival nem morgana quando desativados", () => {
            for (let n = MIN_PLAYERS; n <= MAX_PLAYERS; n++) {
                const roles = getRolesForPlayerCount(n);
                expect(roles.filter((r) => r === "percival")).toHaveLength(0);
                expect(roles.filter((r) => r === "morgana")).toHaveLength(0);
            }
        });

        it("sem papéis opcionais, usa apenas loyal_servant e minion", () => {
            const roles = getRolesForPlayerCount(5);
            expect(roles.filter((r) => r === "loyal_servant")).toHaveLength(3);
            expect(roles.filter((r) => r === "minion")).toHaveLength(2);
        });

        it("retorna o número correto de papéis para cada contagem", () => {
            for (let n = MIN_PLAYERS; n <= MAX_PLAYERS; n++) {
                expect(getRolesForPlayerCount(n)).toHaveLength(n);
            }
        });

        it("mantém a proporção correta de bons e maus", () => {
            // Proporções oficiais: 5→3:2, 6→4:2, 7→4:3, 8→5:3, 9→6:3, 10→6:4
            const expectedGood: Record<number, number> = {
                5: 3, 6: 4, 7: 4, 8: 5, 9: 6, 10: 6,
            };
            const expectedEvil: Record<number, number> = {
                5: 2, 6: 2, 7: 3, 8: 3, 9: 3, 10: 4,
            };

            for (let n = MIN_PLAYERS; n <= MAX_PLAYERS; n++) {
                const roles = getRolesForPlayerCount(n);
                const good = roles.filter((r) => ROLE_LOYALTY[r] === "good").length;
                const evil = roles.filter((r) => ROLE_LOYALTY[r] === "evil").length;
                expect(good).toBe(expectedGood[n]);
                expect(evil).toBe(expectedEvil[n]);
            }
        });
    });
});
