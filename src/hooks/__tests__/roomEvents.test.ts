import { describe, it, expect } from "vitest";
import {
    isSystemEvent,
    isGameEvent,
    toAuditEntry,
    buildSystemPayload,
    buildGameAuditEntries,
    extractReconnectGameState,
    type RoomSystemEvent,
} from "../useGameRoom";
import type { AvalonGameEvent, MissionOutcome } from "../../types/avalon";

// --- Helpers ---

/** Cria um evento de sistema com valores padrão. */
function sysEvent(overrides?: Partial<RoomSystemEvent>): RoomSystemEvent {
    return {
        type: "player_joined",
        playerName: "igor",
        roomCode: "A3K9Z",
        timestamp: "2025-01-01T12:00:00.000Z",
        ...overrides,
    };
}

/** Envelopa um evento de sistema no formato recebido pelo canal. */
function wrapSystem(evt: RoomSystemEvent): { event: RoomSystemEvent } {
    return { event: evt };
}

/** Envelopa um evento de jogo no formato recebido pelo canal. */
function wrapGame(gameEvt: AvalonGameEvent): { event: { gameEvent: AvalonGameEvent } } {
    return { event: { gameEvent: gameEvt } };
}

// --- Tests ---

describe("isSystemEvent", () => {
    it("reconhece player_joined", () => {
        expect(isSystemEvent(wrapSystem(sysEvent({ type: "player_joined" })))).toBe(true);
    });

    it("reconhece player_left", () => {
        expect(isSystemEvent(wrapSystem(sysEvent({ type: "player_left" })))).toBe(true);
    });

    it("reconhece room_locked", () => {
        expect(isSystemEvent(wrapSystem(sysEvent({ type: "room_locked" })))).toBe(true);
    });

    it("reconhece player_reconnected", () => {
        expect(isSystemEvent(wrapSystem(sysEvent({ type: "player_reconnected" })))).toBe(true);
    });

    it("reconhece room_state", () => {
        expect(isSystemEvent(wrapSystem(sysEvent({ type: "room_state" })))).toBe(true);
    });

    it("reconhece room_closed", () => {
        expect(isSystemEvent(wrapSystem(sysEvent({ type: "room_closed" })))).toBe(true);
    });

    it("rejeita null", () => {
        expect(isSystemEvent(null)).toBe(false);
    });

    it("rejeita undefined", () => {
        expect(isSystemEvent(undefined)).toBe(false);
    });

    it("rejeita string", () => {
        expect(isSystemEvent("not an event")).toBe(false);
    });

    it("rejeita objeto sem campo event", () => {
        expect(isSystemEvent({ data: "something" })).toBe(false);
    });

    it("rejeita evento com type desconhecido", () => {
        expect(isSystemEvent({ event: { type: "unknown_type", playerName: "x", roomCode: "y", timestamp: "z" } })).toBe(false);
    });

    it("rejeita evento de jogo (gameEvent)", () => {
        expect(isSystemEvent(wrapGame({ type: "game_over", winner: "good", reason: "test" }))).toBe(false);
    });
});

describe("isGameEvent", () => {
    it("reconhece evento de jogo com gameEvent", () => {
        expect(isGameEvent(wrapGame({ type: "game_over", winner: "good", reason: "test" }))).toBe(true);
    });

    it("rejeita evento de sistema", () => {
        expect(isGameEvent(wrapSystem(sysEvent()))).toBe(false);
    });

    it("rejeita null", () => {
        expect(isGameEvent(null)).toBe(false);
    });

    it("rejeita objeto sem campo event", () => {
        expect(isGameEvent({ data: "something" })).toBe(false);
    });

    it("rejeita objeto com event mas sem gameEvent", () => {
        expect(isGameEvent({ event: { type: "player_joined" } })).toBe(false);
    });
});

describe("buildSystemPayload", () => {
    it("cria payload de player_joined com campos corretos", () => {
        const payload = buildSystemPayload("player_joined", "igor", "A3K9Z");

        expect(payload.type).toBe("player_joined");
        expect(payload.playerName).toBe("igor");
        expect(payload.roomCode).toBe("A3K9Z");
        expect(payload.timestamp).toBeDefined();
    });

    it("cria payload de player_left", () => {
        const payload = buildSystemPayload("player_left", "marcelo", "B4X7Y");

        expect(payload.type).toBe("player_left");
        expect(payload.playerName).toBe("marcelo");
        expect(payload.roomCode).toBe("B4X7Y");
    });

    it("cria payload de room_closed", () => {
        const payload = buildSystemPayload("room_closed", "host", "C5Z8W");

        expect(payload.type).toBe("room_closed");
        expect(payload.playerName).toBe("host");
    });

    it("timestamp é uma string ISO válida", () => {
        const payload = buildSystemPayload("player_joined", "test", "XXXXX");
        const date = new Date(payload.timestamp);

        expect(date.toISOString()).toBe(payload.timestamp);
    });
});

describe("toAuditEntry", () => {
    it("gera entrada para player_joined", () => {
        const entry = toAuditEntry(sysEvent({ type: "player_joined", playerName: "igor" }));

        expect(entry.segments).toContainEqual({ bold: "igor" });
        const text = entry.segments.filter((s) => typeof s === "string").join("");
        expect(text).toContain("entrou na");
    });

    it("gera entrada para player_left", () => {
        const entry = toAuditEntry(sysEvent({ type: "player_left", playerName: "marcelo" }));

        expect(entry.segments).toContainEqual({ bold: "marcelo" });
        const text = entry.segments.filter((s) => typeof s === "string").join("");
        expect(text).toContain("saiu da");
    });

    it("gera entrada para player_reconnected", () => {
        const entry = toAuditEntry(sysEvent({ type: "player_reconnected", playerName: "silva" }));

        expect(entry.segments).toContainEqual({ bold: "silva" });
        const text = entry.segments.filter((s) => typeof s === "string").join("");
        expect(text).toContain("reconectou na");
    });

    it("inclui o código da sala em negrito", () => {
        const entry = toAuditEntry(sysEvent({ roomCode: "X9Y8Z" }));

        expect(entry.segments).toContainEqual({ bold: "X9Y8Z" });
    });

    it("preserva o timestamp do evento original", () => {
        const ts = "2025-06-15T10:30:00.000Z";
        const entry = toAuditEntry(sysEvent({ timestamp: ts }));

        expect(entry.timestamp).toBe(ts);
    });

    it("usa o type como fallback para tipos sem mapeamento", () => {
        const entry = toAuditEntry(sysEvent({ type: "room_closed" }));

        // room_closed não está no actionMap, então usa o type diretamente
        const text = entry.segments.filter((s) => typeof s === "string").join("");
        expect(text).toContain("room_closed");
    });
});

describe("buildGameAuditEntries", () => {
    it("gera entrada para role_assigned", () => {
        const evt: AvalonGameEvent = {
            type: "role_assigned",
            playerName: "Alice",
            role: "merlin",
            loyalty: "good",
            visiblePlayers: [],
        };
        const entries = buildGameAuditEntries(evt, "A3K9Z");

        expect(entries).toHaveLength(1);
        expect(entries[0].segments).toContainEqual({ bold: "Alice" });
    });

    it("gera entrada para role_revealed", () => {
        const evt: AvalonGameEvent = { type: "role_revealed", playerName: "Bob" };
        const entries = buildGameAuditEntries(evt, "A3K9Z");

        expect(entries).toHaveLength(1);
        expect(entries[0].segments).toContainEqual({ bold: "Bob" });
    });

    it("gera duas entradas para team_proposed (líder + equipe)", () => {
        const evt: AvalonGameEvent = {
            type: "team_proposed",
            leader: "Alice",
            team: ["Alice", "Bob"],
            missionIndex: 0,
        };
        const entries = buildGameAuditEntries(evt, "A3K9Z");

        expect(entries).toHaveLength(2);
        // Primeira entrada: líder da missão
        expect(entries[0].segments).toContainEqual({ bold: "Alice" });
        expect(entries[0].segments).toContainEqual({ bold: "1" });
        // Segunda entrada: equipe escolhida
        expect(entries[1].segments).toContainEqual({ bold: "Alice, Bob" });
    });

    it("gera entrada para mission_result com sucesso", () => {
        const outcome: MissionOutcome = {
            missionIndex: 1,
            teamMembers: ["Alice", "Bob", "Carol"],
            successCount: 3,
            failCount: 0,
            result: "success",
        };
        const evt: AvalonGameEvent = {
            type: "mission_result",
            outcome,
            newLeader: "Dave",
            newMission: 2,
        };
        const entries = buildGameAuditEntries(evt, "A3K9Z");

        expect(entries).toHaveLength(1);
        expect(entries[0].segments).toContainEqual({ bold: "2" }); // Missão 2 (índice 1 + 1)
        expect(entries[0].segments).toContainEqual({ bold: "✓ Sucesso" });
    });

    it("gera entrada para mission_result com falha", () => {
        const outcome: MissionOutcome = {
            missionIndex: 0,
            teamMembers: ["Alice", "Dave"],
            successCount: 1,
            failCount: 1,
            result: "fail",
        };
        const evt: AvalonGameEvent = {
            type: "mission_result",
            outcome,
            newLeader: "Bob",
            newMission: 1,
        };
        const entries = buildGameAuditEntries(evt, "A3K9Z");

        expect(entries).toHaveLength(1);
        expect(entries[0].segments).toContainEqual({ bold: "✗ Falha" });
    });

    it("retorna array vazio para eventos sem auditoria", () => {
        const noAuditEvents: AvalonGameEvent[] = [
            { type: "role_reveal_complete" },
            { type: "team_vote_cast", playerName: "Alice", vote: "approve" },
            { type: "mission_vote_cast", playerName: "Alice", vote: "success" },
            { type: "assassin_phase_started" },
            { type: "assassin_choice", target: "Alice" },
            { type: "game_over", winner: "good", reason: "test" },
            { type: "continue_after_mission", newLeader: "Bob", newMission: 1 },
        ];

        for (const evt of noAuditEvents) {
            expect(buildGameAuditEntries(evt, "A3K9Z")).toEqual([]);
        }
    });
});

describe("extractReconnectGameState", () => {
    it("extrai gameState quando presente no evento", () => {
        const gameState = { phase: "team_proposal", players: [] };
        const event = {
            event: {
                ...sysEvent({ type: "player_reconnected" }),
                gameState,
            },
        };

        const result = extractReconnectGameState(event as { event: RoomSystemEvent });
        expect(result).toEqual(gameState);
    });

    it("retorna null quando gameState não está presente", () => {
        const event = wrapSystem(sysEvent({ type: "player_reconnected" }));

        const result = extractReconnectGameState(event);
        expect(result).toBeNull();
    });

    it("retorna null quando gameState é explicitamente null", () => {
        const event = {
            event: {
                ...sysEvent({ type: "player_reconnected" }),
                gameState: null,
            },
        };

        const result = extractReconnectGameState(event as { event: RoomSystemEvent });
        expect(result).toBeNull();
    });
});

describe("Fluxo room_closed — host sai e jogadores são notificados", () => {
    /**
     * Simula o fluxo completo:
     * 1. Host publica player_left (via beaconPublish no beforeunload)
     * 2. Backend transforma player_left do host em room_closed
     * 3. Clientes recebem room_closed como evento de sistema
     *
     * Estes testes validam que os eventos são corretamente identificados
     * e processados em cada etapa do pipeline.
     */

    it("player_left do host é reconhecido como evento de sistema", () => {
        const payload = buildSystemPayload("player_left", "hostPlayer", "A3K9Z");
        const wrapped = wrapSystem(payload);

        expect(isSystemEvent(wrapped)).toBe(true);
        expect(wrapped.event.type).toBe("player_left");
    });

    it("room_closed (transformado pelo backend) é reconhecido como evento de sistema", () => {
        // Simula o que o backend retorna quando o host sai
        const roomClosedEvent: RoomSystemEvent = {
            type: "room_closed",
            playerName: "hostPlayer",
            roomCode: "A3K9Z",
            timestamp: "2025-01-01T12:00:00.000Z",
        };
        const wrapped = wrapSystem(roomClosedEvent);

        expect(isSystemEvent(wrapped)).toBe(true);
        expect(wrapped.event.type).toBe("room_closed");
    });

    it("room_closed NÃO é reconhecido como evento de jogo", () => {
        const roomClosedEvent: RoomSystemEvent = {
            type: "room_closed",
            playerName: "hostPlayer",
            roomCode: "A3K9Z",
            timestamp: "2025-01-01T12:00:00.000Z",
        };

        expect(isGameEvent(wrapSystem(roomClosedEvent))).toBe(false);
    });

    it("payload de player_left contém dados necessários para o backend identificar o host", () => {
        const payload = buildSystemPayload("player_left", "igor", "N3DC9");

        expect(payload.type).toBe("player_left");
        expect(payload.playerName).toBe("igor");
        expect(payload.roomCode).toBe("N3DC9");
        // O backend compara payload.playerName com room.hostName no DynamoDB
    });

    it("room_closed não gera entrada de auditoria padrão (tipo sem mapeamento)", () => {
        const evt = sysEvent({ type: "room_closed" });
        const entry = toAuditEntry(evt);

        // room_closed usa o type como fallback — não tem mapeamento amigável
        // Isso é intencional: o App.tsx mostra um Alert dedicado em vez de log
        const text = entry.segments.filter((s) => typeof s === "string").join("");
        expect(text).not.toContain("entrou na");
        expect(text).not.toContain("saiu da");
    });
});
