import { useState, useCallback, useEffect, useRef } from "react";
import { useEventsConnection, type EventPayload } from "./useEventsConnection";
import { useAvalonGame } from "./useAvalonGame";
import type { AvalonGameEvent } from "../types/avalon";

export type RoomPhase = "lobby" | "connected";

/** Tipos de eventos do sistema de sala. */
export type RoomEventType = "player_joined" | "player_left" | "room_locked";

/** Evento de sistema publicado no canal (join/leave). */
export interface RoomSystemEvent {
    type: RoomEventType;
    playerName: string;
    roomCode: string;
    timestamp: string;
}

/** Entrada no log de auditoria exibido na UI. */
export interface AuditLogEntry {
    /** Segmentos da mensagem: texto normal ou { bold: "texto" } para negrito. */
    segments: AuditLogSegment[];
    timestamp: string;
}

export type AuditLogSegment = string | { bold: string };

interface RoomState {
    /** Código de 5 caracteres que identifica a sala */
    roomCode: string | null;
    /** Nome do jogador na sala */
    playerName: string | null;
    /** Fase atual: lobby (aguardando) ou connected (na sala) */
    phase: RoomPhase;
    /** Indica se este jogador é o host (criador da sala). */
    isHost: boolean;
}

/**
 * Gera um código alfanumérico aleatório de 5 caracteres (maiúsculas + dígitos).
 *
 * Exemplo: "A3K9Z"
 */
function generateRoomCode(): string {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "";
    for (let i = 0; i < 5; i++) {
        code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
}

/**
 * Converte um código de sala no nome do canal AppSync Events.
 *
 * O canal segue o padrão "default/game-<CÓDIGO>", permitindo que cada sala
 * tenha seu próprio namespace de pub/sub.
 */
function buildChannelName(code: string): string {
    return `default/game-${code}`;
}

/** Verifica se um payload recebido é um evento de sistema (join/leave/lock). */
function isSystemEvent(payload: unknown): payload is { event: RoomSystemEvent } {
    if (typeof payload !== "object" || payload === null) return false;
    const outer = payload as Record<string, unknown>;
    if (typeof outer.event !== "object" || outer.event === null) return false;
    const evt = outer.event as Record<string, unknown>;
    return evt.type === "player_joined" || evt.type === "player_left" || evt.type === "room_locked";
}

/** Verifica se um payload recebido é um evento de jogo Avalon. */
function isGameEvent(payload: unknown): payload is { event: { gameEvent: AvalonGameEvent } } {
    if (typeof payload !== "object" || payload === null) return false;
    const outer = payload as Record<string, unknown>;
    if (typeof outer.event !== "object" || outer.event === null) return false;
    const evt = outer.event as Record<string, unknown>;
    return "gameEvent" in evt;
}

/** Converte um evento de sistema em uma entrada estruturada para o log de auditoria. */
function toAuditEntry(evt: RoomSystemEvent): AuditLogEntry {
    const action = evt.type === "player_joined" ? "entrou na" : "saiu da";
    return {
        segments: [
            "Player ", { bold: evt.playerName }, ` ${action} sala `, { bold: evt.roomCode },
        ],
        timestamp: evt.timestamp,
    };
}

/** Cria o payload de um evento de sistema. */
function buildSystemPayload(type: RoomEventType, playerName: string, roomCode: string): RoomSystemEvent {
    return { type, playerName, roomCode, timestamp: new Date().toISOString() };
}

/**
 * Hook para gerenciar a criação e entrada em salas de jogo.
 *
 * Publica eventos de join/leave no canal, mantém um log de auditoria,
 * e integra o jogo Avalon via useAvalonGame.
 *
 * Uso:
 * ```ts
 * const { room, auditLog, avalon, ... } = useGameRoom();
 * ```
 */
export function useGameRoom() {
    const [room, setRoom] = useState<RoomState>({
        roomCode: null, playerName: null, phase: "lobby", isHost: false,
    });
    const [channelName, setChannelName] = useState<string | undefined>();
    const [auditLog, setAuditLog] = useState<AuditLogEntry[]>([]);
    const [connectedPlayers, setConnectedPlayers] = useState<string[]>([]);

    // Indica se a sala está bloqueada (jogo em andamento)
    const [roomLocked, setRoomLocked] = useState(false);

    // Garante que o player_joined é publicado apenas uma vez por sessão de sala
    const hasPublishedJoinRef = useRef(false);

    // Refs para acesso em callbacks de cleanup (beforeunload)
    const roomRef = useRef(room);
    roomRef.current = room;
    const channelNameRef = useRef(channelName);
    channelNameRef.current = channelName;

    const handleEvent = useCallback((event: unknown) => {
        if (isSystemEvent(event)) {
            const sysEvt = event.event;

            // Jogador recebeu room_locked — sala em jogo, deve sair
            if (sysEvt.type === "room_locked") {
                // Apenas afeta jogadores que não fazem parte do jogo ativo
                const currentName = roomRef.current.playerName;
                if (currentName && sysEvt.playerName === currentName) {
                    setRoomLocked(true);
                }
                return;
            }

            setAuditLog((prev) => [...prev, toAuditEntry(sysEvt)]);

            // Atualiza lista de jogadores conectados
            if (sysEvt.type === "player_joined") {
                setConnectedPlayers((prev) =>
                    prev.includes(sysEvt.playerName) ? prev : [...prev, sysEvt.playerName],
                );
            } else if (sysEvt.type === "player_left") {
                setConnectedPlayers((prev) => prev.filter((n) => n !== sysEvt.playerName));
            }
        }

        if (isGameEvent(event)) {
            const gameEvt = event.event.gameEvent;
            const now = new Date().toISOString();
            const roomCode = roomRef.current.roomCode ?? "";

            // Loga quando um jogador recebe seu papel (sem revelar qual papel)
            if (gameEvt.type === "role_assigned") {
                setAuditLog((prev) => [...prev, {
                    segments: [
                        "Player ", { bold: gameEvt.playerName }, " recebeu seu papel na sala ", { bold: roomCode },
                    ],
                    timestamp: now,
                }]);
            }

            // Loga quando um jogador vê seu papel
            if (gameEvt.type === "role_revealed") {
                setAuditLog((prev) => [...prev, {
                    segments: [
                        "Player ", { bold: gameEvt.playerName }, " viu seu papel",
                    ],
                    timestamp: now,
                }]);
            }

            // Loga quem é o líder da missão
            if (gameEvt.type === "role_reveal_complete" || gameEvt.type === "team_vote_result") {
                // O líder será logado quando a proposta de equipe for feita
            }

            // Loga a proposta de equipe: quem é o líder e quem foi escolhido
            if (gameEvt.type === "team_proposed") {
                setAuditLog((prev) => [
                    ...prev,
                    {
                        segments: [
                            { bold: gameEvt.leader }, " é o líder da Missão ", { bold: String(gameEvt.missionIndex + 1) },
                        ],
                        timestamp: now,
                    },
                    {
                        segments: [
                            { bold: gameEvt.leader }, " escolheu a equipe: ", { bold: gameEvt.team.join(", ") },
                        ],
                        timestamp: now,
                    },
                ]);
            }

            // Loga o resultado da missão
            if (gameEvt.type === "mission_result") {
                const { outcome } = gameEvt;
                const resultLabel = outcome.result === "success" ? "✓ Sucesso" : "✗ Falha";
                setAuditLog((prev) => [...prev, {
                    segments: [
                        "Missão ", { bold: String(outcome.missionIndex + 1) },
                        ": ", { bold: resultLabel },
                        ` (${outcome.successCount} sucesso, ${outcome.failCount} falha)`,
                    ],
                    timestamp: now,
                }]);
            }

            avalonHandleRef.current?.(gameEvt);
        }
    }, []);

    const connection = useEventsConnection(channelName, handleEvent);
    const connectionRef = useRef(connection);
    connectionRef.current = connection;

    // Avalon game hook
    const avalon = useAvalonGame(
        room.playerName ?? "",
        room.isHost,
        connection.publish,
        channelName,
    );

    // Ref para o handler de eventos do Avalon (evita dependência circular)
    const avalonHandleRef = useRef(avalon.handleGameEvent);
    avalonHandleRef.current = avalon.handleGameEvent;

    /** Cria uma nova sala com código aleatório e conecta ao canal. */
    const createRoom = useCallback((playerName: string) => {
        const code = generateRoomCode();
        hasPublishedJoinRef.current = false;
        setRoomLocked(false);
        setAuditLog([]);
        setConnectedPlayers([]);
        setChannelName(buildChannelName(code));
        setRoom({ roomCode: code, playerName, phase: "connected", isHost: true });
    }, []);

    /**
     * Entra em uma sala existente pelo código informado.
     * Normaliza o código para maiúsculas antes de conectar.
     */
    const joinRoom = useCallback((code: string, playerName: string) => {
        const normalized = code.trim().toUpperCase();
        if (normalized.length !== 5) {
            throw new Error(`Código inválido: "${code}". Esperado: 5 caracteres.`);
        }
        hasPublishedJoinRef.current = false;
        setRoomLocked(false);
        setAuditLog([]);
        setConnectedPlayers([]);
        setChannelName(buildChannelName(normalized));
        setRoom({ roomCode: normalized, playerName, phase: "connected", isHost: false });
    }, []);

    /** Publica player_left, desconecta do canal e volta ao lobby. */
    const leaveRoom = useCallback(async () => {
        const { playerName, roomCode } = roomRef.current;
        const channel = channelNameRef.current;

        if (playerName && roomCode && channel) {
            const payload = buildSystemPayload("player_left", playerName, roomCode);
            try {
                await connectionRef.current.publish(channel, payload as unknown as EventPayload);
            } catch {
                // Best-effort — o jogador está saindo de qualquer forma
            }
        }

        connectionRef.current.disconnect();
        avalon.resetGame();
        hasPublishedJoinRef.current = false;
        setRoomLocked(false);
        setChannelName(undefined);
        setAuditLog([]);
        setConnectedPlayers([]);
        setRoom({ roomCode: null, playerName: null, phase: "lobby", isHost: false });
    }, [avalon]);

    // Publica player_joined exatamente uma vez quando a conexão fica "connected"
    useEffect(() => {
        if (connection.status !== "connected") return;
        if (hasPublishedJoinRef.current) return;
        if (!room.playerName || !room.roomCode || !channelName) return;

        hasPublishedJoinRef.current = true;
        const payload = buildSystemPayload("player_joined", room.playerName, room.roomCode);
        connection.publish(channelName, payload as unknown as EventPayload).catch(() => {});
    }, [connection.status, room.playerName, room.roomCode, channelName, connection]);

    // Publica player_left ao fechar o navegador ou recarregar a página
    useEffect(() => {
        function handleBeforeUnload() {
            const { playerName, roomCode } = roomRef.current;
            const channel = channelNameRef.current;
            if (!playerName || !roomCode || !channel) return;

            const payload = buildSystemPayload("player_left", playerName, roomCode);
            connectionRef.current.publish(channel, payload as unknown as EventPayload).catch(() => {});
        }

        window.addEventListener("beforeunload", handleBeforeUnload);
        return () => window.removeEventListener("beforeunload", handleBeforeUnload);
    }, []);

    return {
        room,
        roomLocked,
        auditLog,
        connectedPlayers,
        createRoom,
        joinRoom,
        leaveRoom,
        connection,
        avalon,
    };
}
