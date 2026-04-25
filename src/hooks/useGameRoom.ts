import { useState, useCallback, useEffect, useRef } from "react";
import { useEventsConnection, type EventPayload } from "./useEventsConnection";

export type RoomPhase = "lobby" | "connected";

/** Tipos de eventos do sistema de sala. */
export type RoomEventType = "player_joined" | "player_left";

/** Evento de sistema publicado no canal (join/leave). */
export interface RoomSystemEvent {
    type: RoomEventType;
    playerName: string;
    roomCode: string;
    timestamp: string;
}

/** Entrada no log de auditoria exibido na UI. */
export interface AuditLogEntry {
    playerName: string;
    roomCode: string;
    action: "entrou na" | "saiu da";
    timestamp: string;
}

interface RoomState {
    /** Código de 5 caracteres que identifica a sala */
    roomCode: string | null;
    /** Nome do jogador na sala */
    playerName: string | null;
    /** Fase atual: lobby (aguardando) ou connected (na sala) */
    phase: RoomPhase;
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

/** Verifica se um payload recebido é um evento de sistema (join/leave). */
function isSystemEvent(payload: unknown): payload is { event: RoomSystemEvent } {
    if (typeof payload !== "object" || payload === null) return false;
    const outer = payload as Record<string, unknown>;
    if (typeof outer.event !== "object" || outer.event === null) return false;
    const evt = outer.event as Record<string, unknown>;
    return evt.type === "player_joined" || evt.type === "player_left";
}

/** Converte um evento de sistema em uma entrada estruturada para o log de auditoria. */
function toAuditEntry(evt: RoomSystemEvent): AuditLogEntry {
    return {
        playerName: evt.playerName,
        roomCode: evt.roomCode,
        action: evt.type === "player_joined" ? "entrou na" : "saiu da",
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
 * Publica eventos de join/leave no canal e mantém um log de auditoria
 * com as entradas e saídas de jogadores.
 *
 * Uso:
 * ```ts
 * const { room, auditLog, createRoom, joinRoom, leaveRoom } = useGameRoom();
 * ```
 */
export function useGameRoom() {
    const [room, setRoom] = useState<RoomState>({ roomCode: null, playerName: null, phase: "lobby" });
    const [channelName, setChannelName] = useState<string | undefined>();
    const [auditLog, setAuditLog] = useState<AuditLogEntry[]>([]);

    // Garante que o player_joined é publicado apenas uma vez por sessão de sala
    const hasPublishedJoinRef = useRef(false);

    // Refs para acesso em callbacks de cleanup (beforeunload)
    const roomRef = useRef(room);
    roomRef.current = room;
    const channelNameRef = useRef(channelName);
    channelNameRef.current = channelName;

    const handleEvent = useCallback((event: unknown) => {
        if (isSystemEvent(event)) {
            setAuditLog((prev) => [...prev, toAuditEntry(event.event)]);
        }
    }, []);

    const connection = useEventsConnection(channelName, handleEvent);
    const connectionRef = useRef(connection);
    connectionRef.current = connection;

    /** Cria uma nova sala com código aleatório e conecta ao canal. */
    const createRoom = useCallback((playerName: string) => {
        const code = generateRoomCode();
        hasPublishedJoinRef.current = false;
        setAuditLog([]);
        setChannelName(buildChannelName(code));
        setRoom({ roomCode: code, playerName, phase: "connected" });
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
        setAuditLog([]);
        setChannelName(buildChannelName(normalized));
        setRoom({ roomCode: normalized, playerName, phase: "connected" });
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
        hasPublishedJoinRef.current = false;
        setChannelName(undefined);
        setAuditLog([]);
        setRoom({ roomCode: null, playerName: null, phase: "lobby" });
    }, []);

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

            // Fallback: tenta publicar via HTTP (best-effort, pode não completar)
            connectionRef.current.publish(channel, payload as unknown as EventPayload).catch(() => {});
        }

        window.addEventListener("beforeunload", handleBeforeUnload);
        return () => window.removeEventListener("beforeunload", handleBeforeUnload);
    }, []);

    return {
        room,
        auditLog,
        createRoom,
        joinRoom,
        leaveRoom,
        connection,
    };
}
