import { Amplify } from "aws-amplify";
import type { EventPayload } from "./useEventsConnection";

/**
 * Extrai o endpoint HTTP e a API key da configuração do Amplify.
 * Retorna null se o Amplify não estiver configurado com Events.
 */
function getEventsConfig(): { endpoint: string; apiKey: string } | null {
    try {
        const config = Amplify.getConfig();
        const eventsConfig = config?.API?.Events;
        if (!eventsConfig?.endpoint || !eventsConfig?.apiKey) return null;
        return { endpoint: eventsConfig.endpoint, apiKey: eventsConfig.apiKey };
    } catch {
        return null;
    }
}

/**
 * Publica um evento no AppSync Events via `navigator.sendBeacon`.
 *
 * Diferente de `events.post()`, o sendBeacon é projetado para enviar dados
 * de forma confiável durante `beforeunload` / `visibilitychange`, quando
 * o navegador está encerrando a página. Requisições fetch/XHR normais são
 * frequentemente canceladas pelo browser nesse momento.
 *
 * Referência: https://docs.aws.amazon.com/appsync/latest/eventapi/publish-http.html
 *
 * @param channel - Canal AppSync Events (ex: "default/game-A3K9Z")
 * @param data - Payload do evento a ser publicado
 * @returns true se o beacon foi enfileirado com sucesso, false caso contrário
 *
 * Uso:
 * ```ts
 * window.addEventListener("beforeunload", () => {
 *     beaconPublish("default/game-A3K9Z", { type: "player_left", ... });
 * });
 * ```
 */
export function beaconPublish(channel: string, data: EventPayload): boolean {
    const config = getEventsConfig();
    if (!config) return false;

    const body = JSON.stringify({
        channel,
        events: [JSON.stringify(data)],
    });

    // sendBeacon com Blob permite definir Content-Type (sendBeacon puro não aceita headers customizados).
    // Para API key auth, o AppSync Events HTTP endpoint também aceita o api key no body
    // quando não é possível enviar headers — mas a forma mais confiável é usar fetch com keepalive.
    // Usamos fetch + keepalive como fallback primário, com sendBeacon como último recurso.
    return publishWithKeepalive(config, channel, data) || sendBeaconFallback(config, body);
}

/**
 * Usa fetch com `keepalive: true` para publicar durante unload.
 * Permite enviar headers customizados (x-api-key), ao contrário de sendBeacon.
 * O flag keepalive garante que o browser complete a requisição mesmo após a página fechar.
 */
function publishWithKeepalive(
    config: { endpoint: string; apiKey: string },
    channel: string,
    data: EventPayload,
): boolean {
    try {
        const body = JSON.stringify({
            channel,
            events: [JSON.stringify(data)],
        });

        // fetch com keepalive: true — fire-and-forget, não aguardamos a Promise
        fetch(config.endpoint, {
            method: "POST",
            headers: {
                "content-type": "application/json",
                "x-api-key": config.apiKey,
            },
            body,
            keepalive: true,
        }).catch(() => {
            // Silencioso — best-effort durante unload
        });

        return true;
    } catch {
        return false;
    }
}

/**
 * Fallback com navigator.sendBeacon para browsers que não suportam fetch keepalive.
 * Limitação: sendBeacon não permite headers customizados, então a API key
 * não é enviada. Funciona apenas se o endpoint aceitar a requisição sem auth
 * ou se houver outro mecanismo de autenticação.
 */
function sendBeaconFallback(
    config: { endpoint: string },
    body: string,
): boolean {
    try {
        const blob = new Blob([body], { type: "application/json" });
        return navigator.sendBeacon(config.endpoint, blob);
    } catch {
        return false;
    }
}
