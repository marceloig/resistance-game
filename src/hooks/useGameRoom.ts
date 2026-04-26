import { useState, useCallback, useEffect, useRef } from "react";
import { useEventsConnection, type EventPayload } from "./useEventsConnection";
import { useAvalonGame } from "./useAvalonGame";
import { beaconPublish } from "./useBeaconPublish";
import type { AvalonGameEvent, AvalonGameState } from "../types/avalon";
import { getVisiblePlayers } from "../game/avalonEngine";

export type RoomPhase = "lobby" | "connected";

/** Tipos de eventos do sistema de sala. */
export type RoomEventType = "player_joined" | "player_left" | "room_locked" | "player_reconnected" | "room_state" | "room_closed";

/** Evento de sistema publicado no canal (join/leave/reconnect). */
export interface RoomSystemEvent {
    type: RoomEventType;
    playerName: string;
    roomCode: string;
    timestamp: string;
    /** Presente em player_reconnected — indica se o jogador é o host da sala. */
    isHost?: boolean;
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

/** Verifica se um payload recebido é um evento de sistema. */
export function isSystemEvent(payload: unknown): payload is { event: RoomSystemEvent } {
    if (typeof payload !== "object" || payload === null) return false;
    const outer = payload as Record<string, unknown>;
    if (typeof outer.event !== "object" || outer.event === null) return false;
    const evt = outer.event as Record<string, unknown>;
    return evt.type === "player_joined" || evt.type === "player_left"
        || evt.type === "room_locked" || evt.type === "player_reconnected"
        || evt.type === "room_state" || evt.type === "room_closed";
}

/**
 * Extrai o gameState persistido de um evento player_reconnected (se presente).
 * Retornado pelo backend quando o host reconecta.
 */
export function extractReconnectGameState(event: { event: RoomSystemEvent }): unknown | null {
    const raw = event.event as unknown as Record<string, unknown>;
    return raw.gameState ?? null;
}

/** Verifica se um payload recebido é um evento de jogo Avalon. */
export function isGameEvent(payload: unknown): payload is { event: { gameEvent: AvalonGameEvent } } {
    if (typeof payload !== "object" || payload === null) return false;
    const outer = payload as Record<string, unknown>;
    if (typeof outer.event !== "object" || outer.event === null) return false;
    const evt = outer.event as Record<string, unknown>;
    return "gameEvent" in evt;
}

/** Converte um evento de sistema em uma entrada estruturada para o log de auditoria. */
export function toAuditEntry(evt: RoomSystemEvent): AuditLogEntry {
    const actionMap: Record<string, string> = {
        player_joined: "entrou na",
        player_left: "saiu da",
        player_reconnected: "reconectou na",
    };
    const action = actionMap[evt.type] ?? evt.type;
    return {
        segments: [
            "Player ", { bold: evt.playerName }, ` ${action} sala `, { bold: evt.roomCode },
        ],
        timestamp: evt.timestamp,
    };
}

/** Cria o payload de um evento de sistema. */
export function buildSystemPayload(type: RoomEventType, playerName: string, roomCode: string): RoomSystemEvent {
    return { type, playerName, roomCode, timestamp: new Date().toISOString() };
}

/** Converte um evento de jogo em entradas de auditoria (se aplicável). */
export function buildGameAuditEntries(gameEvt: AvalonGameEvent, roomCode: string): AuditLogEntry[] {
    const now = new Date().toISOString();

    switch (gameEvt.type) {
        case "role_assigned":
            return [{
                segments: ["Player ", { bold: gameEvt.playerName }, " recebeu seu papel na sala ", { bold: roomCode }],
                timestamp: now,
            }];

        case "role_revealed":
            return [{
                segments: ["Player ", { bold: gameEvt.playerName }, " viu seu papel"],
                timestamp: now,
            }];

        case "team_proposed":
            return [
                {
                    segments: [{ bold: gameEvt.leader }, " é o líder da Missão ", { bold: String(gameEvt.missionIndex + 1) }],
                    timestamp: now,
                },
                {
                    segments: [{ bold: gameEvt.leader }, " escolheu a equipe: ", { bold: gameEvt.team.join(", ") }],
                    timestamp: now,
                },
            ];

        case "mission_result": {
            const { outcome } = gameEvt;
            const resultLabel = outcome.result === "success" ? "✓ Sucesso" : "✗ Falha";
            return [{
                segments: [
                    "Missão ", { bold: String(outcome.missionIndex + 1) },
                    ": ", { bold: resultLabel },
                    ` (${outcome.successCount} sucesso, ${outcome.failCount} falha)`,
                ],
                timestamp: now,
            }];
        }

        default:
            return [];
    }
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

    // Nome do host da sala (persistido para exibição correta do label)
    const [hostName, setHostName] = useState<string | null>(null);

    // Indica se a sala está bloqueada (jogo em andamento)
    const [roomLocked, setRoomLocked] = useState(false);

    // Indica se a sala foi fechada pelo host
    const [roomClosed, setRoomClosed] = useState(false);

    // Garante que o player_joined é publicado apenas uma vez por sessão de sala
    const hasPublishedJoinRef = useRef(false);

    // Refs para acesso em callbacks de cleanup (beforeunload)
    const roomRef = useRef(room);
    roomRef.current = room;
    const channelNameRef = useRef(channelName);
    channelNameRef.current = channelName;

    const handleEvent = useCallback((event: unknown) => {
        if (isSystemEvent(event)) {
            handleSystemEvent(event.event, event);
        }

        if (isGameEvent(event)) {
            handleGameEvent(event.event.gameEvent);
        }
    }, []);

    /** Processa eventos de sistema. */
    function handleSystemEvent(sysEvt: RoomSystemEvent, rawEvent: unknown): void {
        if (sysEvt.type === "room_locked") {
            handleRoomLocked(sysEvt);
            return;
        }

        if (sysEvt.type === "room_closed") {
            handleRoomClosed();
            return;
        }

        if (sysEvt.type === "player_reconnected") {
            handlePlayerReconnected(sysEvt, rawEvent);
            return;
        }

        // room_state: host broadcast da lista de jogadores — sincroniza todos os clientes
        if (sysEvt.type === "room_state") {
            handleRoomState(rawEvent);
            return;
        }

        setAuditLog((prev) => [...prev, toAuditEntry(sysEvt)]);
        handlePlayerPresenceChange(sysEvt);
    }

    /** Bloqueia o jogador atual se a sala já tem jogo ativo. */
    function handleRoomLocked(sysEvt: RoomSystemEvent): void {
        const currentName = roomRef.current.playerName;
        if (currentName && sysEvt.playerName === currentName) {
            setRoomLocked(true);
        }
    }

    /** Host saiu — sala fechada. Non-host players são desconectados. */
    function handleRoomClosed(): void {
        if (roomRef.current.isHost) return;
        setRoomClosed(true);
    }

    /** Trata reconexão: restaura estado do jogador a partir do DynamoDB. */
    function handlePlayerReconnected(sysEvt: RoomSystemEvent, rawEvent: unknown): void {
        setAuditLog((prev) => [...prev, toAuditEntry(sysEvt)]);
        addPlayerToConnected(sysEvt.playerName);

        const currentName = roomRef.current.playerName;
        const isSelf = currentName !== null && sysEvt.playerName === currentName;

        if (isSelf) {
            restorePlayerFromBackend(sysEvt, rawEvent);
        }

        if (!isSelf && roomRef.current.isHost) {
            avalonSyncRef.current?.(sysEvt.playerName);
        }
    }

    /** Restaura o estado do jogador reconectado a partir do gameState persistido no DynamoDB. */
    function restorePlayerFromBackend(sysEvt: RoomSystemEvent, rawEvent: unknown): void {
        if (sysEvt.isHost) {
            setRoom((prev) => ({ ...prev, isHost: true }));
        }

        const persistedState = extractReconnectGameState(rawEvent as { event: RoomSystemEvent });
        if (!persistedState) return;

        const gameState = persistedState as AvalonGameState;

        if (sysEvt.isHost) {
            avalonRestoreRef.current?.(gameState);
            return;
        }

        const playerName = sysEvt.playerName;
        const player = gameState.players.find((p) => p.name === playerName);
        if (!player?.role || !player.loyalty) return;

        const visible = getVisiblePlayers(playerName, gameState.players);
        const strippedState: AvalonGameState = {
            ...gameState,
            players: gameState.players.map((p) => ({ name: p.name })),
        };

        avalonHandleRef.current?.({
            type: "state_sync",
            targetPlayer: playerName,
            state: strippedState,
            role: player.role,
            loyalty: player.loyalty,
            visiblePlayers: visible,
        });
    }

    /** Atualiza a lista de jogadores conectados com base em join/leave. */
    function handlePlayerPresenceChange(sysEvt: RoomSystemEvent): void {
        if (sysEvt.type === "player_joined") {
            addPlayerToConnected(sysEvt.playerName);
        } else if (sysEvt.type === "player_left") {
            setConnectedPlayers((prev) => prev.filter((n) => n !== sysEvt.playerName));
        }
    }

    /**
     * Sincroniza a lista de jogadores a partir do evento room_state do host.
     * Apenas non-host clientes processam — o host já tem a lista autoritativa.
     */
    function handleRoomState(rawEvent: unknown): void {
        if (roomRef.current.isHost) return;

        const raw = (rawEvent as { event: Record<string, unknown> }).event;
        const players = raw?.players;
        const host = raw?.hostName;

        if (Array.isArray(players)) {
            const names = players.filter((n): n is string => typeof n === "string");
            setConnectedPlayers(names);
        }

        if (typeof host === "string" && host.length > 0) {
            setHostName(host);
        }
    }

    /** Adiciona um jogador à lista de conectados (idempotente). */
    function addPlayerToConnected(playerName: string): void {
        setConnectedPlayers((prev) =>
            prev.includes(playerName) ? prev : [...prev, playerName],
        );
    }

    /** Processa eventos de jogo: gera entradas de auditoria e delega ao Avalon. */
    function handleGameEvent(gameEvt: AvalonGameEvent): void {
        const roomCode = roomRef.current.roomCode ?? "";
        const entries = buildGameAuditEntries(gameEvt, roomCode);
        if (entries.length > 0) {
            setAuditLog((prev) => [...prev, ...entries]);
        }
        avalonHandleRef.current?.(gameEvt);
    }

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

    // Ref para a função de sync do Avalon (host envia estado para jogador reconectado)
    const avalonSyncRef = useRef(avalon.sendStateSync);
    avalonSyncRef.current = avalon.sendStateSync;

    // Ref para restaurar o estado autoritativo do host após reconexão
    const avalonRestoreRef = useRef(avalon.restoreHostState);
    avalonRestoreRef.current = avalon.restoreHostState;

    /** Reseta o estado da sala para preparar uma nova conexão. */
    function resetRoomState(): void {
        hasPublishedJoinRef.current = false;
        setRoomLocked(false);
        setRoomClosed(false);
        setAuditLog([]);
        setConnectedPlayers([]);
        setHostName(null);
    }

    /** Cria uma nova sala com código aleatório e conecta ao canal. */
    const createRoom = useCallback((playerName: string) => {
        const code = generateRoomCode();
        resetRoomState();
        setHostName(playerName);
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
        resetRoomState();
        setChannelName(buildChannelName(normalized));
        setRoom({ roomCode: normalized, playerName, phase: "connected", isHost: false });
    }, []);

    /** Publica player_left, desconecta do canal e volta ao lobby. */
    const leaveRoom = useCallback(async () => {
        await publishPlayerLeft();
        connectionRef.current.disconnect();
        avalon.resetGame();
        resetRoomState();
        setChannelName(undefined);
        setRoom({ roomCode: null, playerName: null, phase: "lobby", isHost: false });
    }, [avalon]);

    /** Publica player_left no canal (best-effort). */
    async function publishPlayerLeft(): Promise<void> {
        const { playerName, roomCode } = roomRef.current;
        const channel = channelNameRef.current;
        if (!playerName || !roomCode || !channel) return;

        const payload = buildSystemPayload("player_left", playerName, roomCode);
        try {
            await connectionRef.current.publish(channel, payload as unknown as EventPayload);
        } catch {
            // Best-effort — o jogador está saindo de qualquer forma
        }
    }

    /**
     * Host publica room_state com a lista completa de jogadores.
     * Chamado após o state update do React ser aplicado (via useEffect).
     */
    function broadcastRoomState(): void {
        const channel = channelNameRef.current;
        if (!channel || !roomRef.current.isHost) return;

        const payload = {
            type: "room_state" as RoomEventType,
            playerName: roomRef.current.playerName ?? "",
            roomCode: roomRef.current.roomCode ?? "",
            timestamp: new Date().toISOString(),
            players: connectedPlayers,
            hostName: roomRef.current.playerName,
        };
        connectionRef.current.publish(channel, payload as unknown as EventPayload).catch(() => {});
    }

    // Publica player_joined exatamente uma vez quando a conexão fica "connected".
    // Inclui isHost para que o backend saiba quem é o host ao persistir a sala.
    useEffect(() => {
        if (connection.status !== "connected") return;
        if (hasPublishedJoinRef.current) return;
        if (!room.playerName || !room.roomCode || !channelName) return;

        hasPublishedJoinRef.current = true;
        const payload = {
            ...buildSystemPayload("player_joined", room.playerName, room.roomCode),
            isHost: room.isHost,
        };
        connection.publish(channelName, payload as unknown as EventPayload).catch(() => {});
    }, [connection.status, room.playerName, room.roomCode, channelName, connection, room.isHost]);

    // Ref para rastrear a última lista broadcast, evitando loops
    const lastBroadcastRef = useRef<string>("");

    // Host broadcast room_state sempre que a lista de jogadores muda (na fase de espera)
    useEffect(() => {
        if (!room.isHost) return;
        if (connectedPlayers.length === 0) return;

        // Evita broadcast se a lista não mudou de conteúdo
        const key = connectedPlayers.join(",");
        if (key === lastBroadcastRef.current) return;
        lastBroadcastRef.current = key;

        broadcastRoomState();
    }, [connectedPlayers, room.isHost]);

    /**
     * Publica player_left de forma confiável ao fechar/recarregar o navegador.
     *
     * Usa fetch com keepalive (via beaconPublish) em vez de events.post() porque
     * requisições async normais são canceladas pelo browser durante beforeunload.
     *
     * NÃO usa visibilitychange — esse evento dispara ao trocar de aba, o que
     * causaria saídas falsas. beforeunload é suficiente para desktop; em mobile
     * (onde beforeunload pode não disparar), o mecanismo de reconexão existente
     * já trata o cenário de desconexão.
     *
     * Quando o host sai, o backend transforma player_left em room_closed,
     * forçando todos os jogadores a saírem da sala.
     */
    useEffect(() => {
        function handleBeforeUnload(): void {
            const { playerName, roomCode } = roomRef.current;
            const channel = channelNameRef.current;
            if (!playerName || !roomCode || !channel) return;

            const payload = buildSystemPayload("player_left", playerName, roomCode);
            beaconPublish(channel, payload as unknown as EventPayload);
        }

        window.addEventListener("beforeunload", handleBeforeUnload);
        return () => window.removeEventListener("beforeunload", handleBeforeUnload);
    }, []);

    return {
        room,
        roomLocked,
        roomClosed,
        hostName,
        auditLog,
        connectedPlayers,
        createRoom,
        joinRoom,
        leaveRoom,
        connection,
        avalon,
    };
}
