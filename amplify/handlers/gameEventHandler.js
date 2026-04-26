/**
 * AppSync Events handler para o namespace do jogo.
 *
 * onPublish: intercepta eventos publicados no canal para:
 * - Criar/atualizar o estado da sala no DynamoDB
 * - Bloquear novos jogadores quando o jogo está ativo
 * - Registrar jogadores na sala
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

        // Extrai o código da sala do caminho do canal (default/game-XXXXX)
        const channelPath = ctx.info.channel.path
        const segments = channelPath.split('/')
        const channelName = segments[segments.length - 1] || ''
        const roomCode = channelName.startsWith('game-')
            ? channelName.substring(5)
            : channelName

        // Evento de sistema: player_joined — verifica se a sala está bloqueada
        if (payload.type === 'player_joined') {
            return ddb.get({ key: { roomCode } })
        }

        // Evento de jogo: game_started — marca a sala como ativa
        if (payload.gameEvent && payload.gameEvent.type === 'game_started') {
            const players = payload.gameEvent.state
                ? payload.gameEvent.state.players.map((p) => p.name)
                : []
            return ddb.put({
                key: { roomCode },
                item: {
                    roomCode,
                    status: 'active',
                    players,
                    updatedAt: util.time.nowISO8601(),
                },
            })
        }

        // Evento de jogo: game_over — marca a sala como finalizada
        if (payload.gameEvent && payload.gameEvent.type === 'game_over') {
            return ddb.update({
                key: { roomCode },
                update: {
                    status: { value: 'finished' },
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

        // Resposta para player_joined: verifica o status da sala
        if (payload && payload.type === 'player_joined') {
            const room = ctx.result
            // Se a sala existe e está ativa, bloqueia o jogador
            if (room && room.status === 'active') {
                // Substitui o evento por um room_locked direcionado ao jogador
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
        }

        // Para todos os outros casos, retransmite os eventos normalmente
        return ctx.events
    },
}
