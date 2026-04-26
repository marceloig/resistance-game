/**
 * AppSync Events handler para o namespace do jogo.
 *
 * onPublish: intercepta eventos publicados no canal para:
 * - Criar/atualizar o estado da sala no DynamoDB
 * - Bloquear novos jogadores quando o jogo está ativo
 * - Permitir reconexão de jogadores conhecidos (incluindo host)
 * - Persistir estado autoritativo do jogo para recuperação do host
 * - Rastrear jogadores conectados na sala de espera
 *
 * Usa o runtime APPSYNC_JS do AppSync (@aws-appsync/utils).
 *
 * Logging: usa console.log/console.error (suportados pelo APPSYNC_JS runtime).
 * Logs aparecem no CloudWatch quando logging está habilitado na Event API.
 *
 * Limitações do APPSYNC_JS runtime:
 * - Sem try/catch/throw/while/continue
 * - Sem util.log (usar console.log/console.error)
 * - Sem promises/async
 */
import * as ddb from '@aws-appsync/utils/dynamodb'
import { util, runtime } from '@aws-appsync/utils'

export const onPublish = {
    request(ctx) {
        const event = ctx.events[0]
        if (!event) return runtime.earlyReturn(ctx.events)

        const payload = event.payload
        if (!payload) return runtime.earlyReturn(ctx.events)

        const roomCode = extractRoomCode(ctx.info.channel.path)
        const eventType = resolveEventType(payload)

        console.log(JSON.stringify({ action: 'request_start', roomCode, eventType }))

        // Evento de sistema: player_joined
        if (payload.type === 'player_joined') {
            if (payload.isHost) {
                console.log(JSON.stringify({
                    action: 'host_creating_room',
                    roomCode,
                    hostName: payload.playerName,
                }))
                return ddb.put({
                    key: { roomCode },
                    item: {
                        roomCode,
                        status: 'waiting',
                        hostName: payload.playerName,
                        players: [],
                        updatedAt: util.time.nowISO8601(),
                    },
                })
            }
            console.log(JSON.stringify({
                action: 'player_joining',
                roomCode,
                playerName: payload.playerName,
            }))
            return ddb.get({ key: { roomCode } })
        }

        // Evento de sistema: player_left — verifica se é o host saindo
        if (payload.type === 'player_left') {
            console.log(JSON.stringify({
                action: 'player_leaving',
                roomCode,
                playerName: payload.playerName,
            }))
            return ddb.get({ key: { roomCode } })
        }

        // Evento de jogo: game_started — marca sala como ativa
        if (payload.gameEvent && payload.gameEvent.type === 'game_started') {
            const gameState = payload.gameEvent.state || null
            const players = gameState
                ? gameState.players.map((p) => p.name)
                : []
            console.log(JSON.stringify({
                action: 'game_started',
                roomCode,
                playerCount: players.length,
                players,
            }))
            return {
                operation: 'UpdateItem',
                key: util.dynamodb.toMapValues({ roomCode }),
                update: {
                    expression: 'SET #st = :st, #pl = :pl, #ua = :ua',
                    expressionNames: { '#st': 'status', '#pl': 'players', '#ua': 'updatedAt' },
                    expressionValues: util.dynamodb.toMapValues({
                        ':st': 'active',
                        ':pl': players,
                        ':ua': util.time.nowISO8601(),
                    }),
                },
            }
        }

        // Evento de jogo: state_persist — host persiste estado autoritativo completo
        // Serializa como JSON string para evitar problemas de marshalling do DynamoDB.
        // Usa UpdateItem raw com expressionNames para evitar conflitos com palavras
        // reservadas e problemas do helper ddb.update() com certos valores.
        if (payload.gameEvent && payload.gameEvent.type === 'state_persist') {
            const gameState = payload.gameEvent.state || null
            const serialized = gameState ? JSON.stringify(gameState) : null
            const stateSize = serialized ? serialized.length : 0
            console.log(JSON.stringify({
                action: 'state_persist',
                roomCode,
                phase: gameState ? gameState.phase : null,
                currentMission: gameState ? gameState.currentMission : null,
                stateSizeBytes: stateSize,
            }))
            return {
                operation: 'UpdateItem',
                key: util.dynamodb.toMapValues({ roomCode }),
                update: {
                    expression: 'SET #ss = :ss, #ua = :ua',
                    expressionNames: { '#ss': 'savedState', '#ua': 'updatedAt' },
                    expressionValues: util.dynamodb.toMapValues({
                        ':ss': serialized,
                        ':ua': util.time.nowISO8601(),
                    }),
                },
            }
        }

        // Evento de jogo: game_over — marca a sala como finalizada
        if (payload.gameEvent && payload.gameEvent.type === 'game_over') {
            console.log(JSON.stringify({
                action: 'game_over',
                roomCode,
                winner: payload.gameEvent.winner,
                reason: payload.gameEvent.reason,
            }))
            return {
                operation: 'UpdateItem',
                key: util.dynamodb.toMapValues({ roomCode }),
                update: {
                    expression: 'SET #st = :st, #ua = :ua REMOVE #ss',
                    expressionNames: { '#st': 'status', '#ss': 'savedState', '#ua': 'updatedAt' },
                    expressionValues: util.dynamodb.toMapValues({
                        ':st': 'finished',
                        ':ua': util.time.nowISO8601(),
                    }),
                },
            }
        }

        // Outros eventos: passa direto sem acessar o DynamoDB
        console.log(JSON.stringify({ action: 'passthrough', roomCode, eventType }))
        return runtime.earlyReturn(ctx.events)
    },

    response(ctx) {
        const event = ctx.events[0]
        if (!event) return ctx.events

        const payload = event.payload
        const roomCode = extractRoomCode(ctx.info.channel.path)
        const eventType = resolveEventType(payload)

        // Verifica se houve erro na operação DynamoDB (request phase)
        if (ctx.error) {
            console.error(JSON.stringify({
                action: 'dynamodb_error',
                roomCode,
                eventType,
                errorMessage: ctx.error.message,
                errorType: ctx.error.type,
            }))
            // Retransmite o evento original para não bloquear o fluxo
            return ctx.events
        }

        console.log(JSON.stringify({
            action: 'response_ok',
            roomCode,
            eventType,
            hasResult: ctx.result !== null && ctx.result !== undefined,
        }))

        // state_persist é interno — não retransmite para os clientes
        if (payload && payload.gameEvent && payload.gameEvent.type === 'state_persist') {
            return ctx.events.map((e) => ({
                ...e,
                payload: { gameEvent: { type: 'state_persisted' } },
            }))
        }

        // Resposta para player_left: se o host saiu, transforma em room_closed
        if (payload && payload.type === 'player_left') {
            const room = ctx.result
            if (room && room.hostName === payload.playerName) {
                console.log(JSON.stringify({
                    action: 'host_left_room_closed',
                    roomCode,
                    hostName: payload.playerName,
                }))
                return ctx.events.map((e) => ({
                    ...e,
                    payload: {
                        type: 'room_closed',
                        playerName: e.payload.playerName,
                        roomCode: e.payload.roomCode,
                        timestamp: e.payload.timestamp,
                    },
                }))
            }
            return ctx.events
        }

        // Resposta para player_joined
        if (payload && payload.type === 'player_joined') {
            if (payload.isHost) {
                return ctx.events
            }

            const room = ctx.result

            if (room && room.status === 'active') {
                return handleActiveRoomJoin(ctx, room, roomCode)
            }
        }

        return ctx.events
    },
}

/**
 * Trata a tentativa de join em uma sala ativa.
 * Jogadores conhecidos reconectam (host recebe estado persistido).
 * Jogadores desconhecidos são bloqueados.
 */
function handleActiveRoomJoin(ctx, room, roomCode) {
    const payload = ctx.events[0].payload
    const playerName = payload.playerName
    const isKnownPlayer = room.players && room.players.includes(playerName)

    if (!isKnownPlayer) {
        console.log(JSON.stringify({
            action: 'player_blocked_room_locked',
            roomCode,
            playerName,
        }))
        return ctx.events.map((e) => ({
            ...e,
            payload: {
                type: 'room_locked',
                playerName: e.payload.playerName,
                roomCode: e.payload.roomCode,
                timestamp: e.payload.timestamp,
            },
        }))
    }

    // Jogador reconhecido — permite reconexão, inclui flag de host e estado persistido
    const isHost = room.hostName === playerName
    const rawState = room.savedState || null
    // savedState é armazenado como JSON string no DynamoDB — deserializa se necessário
    const gameState = typeof rawState === 'string' ? JSON.parse(rawState) : rawState

    console.log(JSON.stringify({
        action: 'player_reconnected',
        roomCode,
        playerName,
        isHost,
        hasGameState: gameState !== null,
        rawStateType: typeof rawState,
    }))

    return ctx.events.map((e) => ({
        ...e,
        payload: {
            type: 'player_reconnected',
            playerName: e.payload.playerName,
            roomCode: e.payload.roomCode,
            timestamp: e.payload.timestamp,
            isHost,
            gameState,
        },
    }))
}

/** Extrai o código da sala do caminho do canal (default/game-XXXXX). */
function extractRoomCode(channelPath) {
    const segments = channelPath.split('/')
    const channelName = segments[segments.length - 1] || ''
    if (channelName.startsWith('game-')) {
        return channelName.substring(5)
    }
    return channelName
}

/**
 * Identifica o tipo do evento para logging.
 * Retorna uma string descritiva do tipo de evento recebido.
 */
function resolveEventType(payload) {
    if (!payload) return 'empty'
    if (payload.type) return payload.type
    if (payload.gameEvent) return 'game:' + payload.gameEvent.type
    return 'unknown'
}
