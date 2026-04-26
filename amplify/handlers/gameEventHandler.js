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
 * Usa o runtime JavaScript do AppSync (@aws-appsync/utils).
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

        // Evento de sistema: player_joined
        if (payload.type === 'player_joined') {
            if (payload.isHost) {
                // Host criando a sala — salva registro inicial no DynamoDB
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
            // Jogador comum — busca a sala para verificar se está bloqueada
            return ddb.get({ key: { roomCode } })
        }

        // Evento de sistema: player_left — verifica se é o host saindo
        if (payload.type === 'player_left') {
            return ddb.get({ key: { roomCode } })
        }

        // Evento de jogo: game_started — marca sala como ativa
        if (payload.gameEvent && payload.gameEvent.type === 'game_started') {
            const gameState = payload.gameEvent.state || null
            const players = gameState
                ? gameState.players.map((p) => p.name)
                : []
            return ddb.update({
                key: { roomCode },
                update: {
                    status: { value: 'active' },
                    players: { value: players },
                    updatedAt: { value: util.time.nowISO8601() },
                },
            })
        }

        // Evento de jogo: state_persist — host persiste estado autoritativo completo
        if (payload.gameEvent && payload.gameEvent.type === 'state_persist') {
            const gameState = payload.gameEvent.state || null
            return ddb.update({
                key: { roomCode },
                update: {
                    gameState: { value: gameState },
                    updatedAt: { value: util.time.nowISO8601() },
                },
            })
        }

        // Evento de jogo: game_over — marca a sala como finalizada
        if (payload.gameEvent && payload.gameEvent.type === 'game_over') {
            return ddb.update({
                key: { roomCode },
                update: {
                    status: { value: 'finished' },
                    gameState: { value: null },
                    updatedAt: { value: util.time.nowISO8601() },
                },
            })
        }

        // Outros eventos: passa direto sem acessar o DynamoDB
        return runtime.earlyReturn(ctx.events)
    },

    response(ctx) {
        const event = ctx.events[0]
        if (!event) return ctx.events

        const payload = event.payload

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
            // Non-host saiu — passa o evento normalmente
            return ctx.events
        }

        // Resposta para player_joined
        if (payload && payload.type === 'player_joined') {
            // Host criando a sala — DynamoDB put já executou, passa o evento adiante
            if (payload.isHost) {
                return ctx.events
            }

            const room = ctx.result

            // Sala ativa — reconexão ou bloqueio
            if (room && room.status === 'active') {
                return handleActiveRoomJoin(ctx, room)
            }
        }

        // Para todos os outros casos, retransmite os eventos normalmente
        return ctx.events
    },
}

/**
 * Trata a tentativa de join em uma sala ativa.
 * Jogadores conhecidos reconectam (host recebe estado persistido).
 * Jogadores desconhecidos são bloqueados.
 */
function handleActiveRoomJoin(ctx, room) {
    const payload = ctx.events[0].payload
    const playerName = payload.playerName
    const isKnownPlayer = room.players && room.players.includes(playerName)

    if (!isKnownPlayer) {
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
    // NOTA: gameState inclui papéis de todos os jogadores. Embora seja broadcast no canal,
    // cada cliente extrai apenas o próprio papel. Em um jogo entre amigos, o risco de
    // inspeção via dev tools é aceitável (mesmo modelo de segurança do state_sync).
    const isHost = room.hostName === playerName
    return ctx.events.map((e) => ({
        ...e,
        payload: {
            type: 'player_reconnected',
            playerName: e.payload.playerName,
            roomCode: e.payload.roomCode,
            timestamp: e.payload.timestamp,
            isHost,
            gameState: room.gameState || null,
        },
    }))
}

/** Extrai o código da sala do caminho do canal (default/game-XXXXX). */
function extractRoomCode(channelPath) {
    const segments = channelPath.split('/')
    const channelName = segments[segments.length - 1] || ''
    return channelName.startsWith('game-')
        ? channelName.substring(5)
        : channelName
}
