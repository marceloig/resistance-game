import { useState, useEffect, useCallback, useRef } from "react";
import { events, type EventsChannel } from "aws-amplify/data";

export type ConnectionStatus = "disconnected" | "connecting" | "connected" | "error";

/**
 * Tipo compatível com o DocumentType do Amplify.
 * Representa qualquer valor JSON-serializável aceito pelo AppSync Events.
 */
export type EventPayload =
  | null
  | boolean
  | number
  | string
  | EventPayload[]
  | { [key: string]: EventPayload };

/**
 * Hook para gerenciar a conexão com o AWS AppSync Events.
 *
 * Fornece funções para:
 * - Conectar-se a um canal e receber eventos em tempo real (subscribe)
 * - Publicar eventos em um canal via HTTP (events.post) ou WebSocket (channel.publish)
 *
 * @param channel - Nome do canal (ex: "default/game"). Se não informado, não conecta automaticamente.
 * @param onEvent - Callback chamado quando um evento é recebido no canal.
 */
export function useEventsConnection(
  channel?: string,
  onEvent?: (event: unknown) => void
) {
  const [status, setStatus] = useState<ConnectionStatus>("disconnected");
  const channelRef = useRef<EventsChannel | null>(null);

  // Conectar a um canal e escutar eventos
  const subscribe = useCallback(
    async (ch: string) => {
      try {
        setStatus("connecting");

        const eventsChannel = await events.connect(ch);

        eventsChannel.subscribe({
          next: (data) => {
            onEvent?.(data);
          },
          error: (err) => {
            console.error("Erro no canal de eventos:", err);
            setStatus("error");
          },
        });

        channelRef.current = eventsChannel;
        setStatus("connected");
      } catch (err) {
        console.error("Falha ao conectar ao canal de eventos:", err);
        setStatus("error");
      }
    },
    [onEvent]
  );

  // Publicar evento via HTTP (events.post)
  const publish = useCallback(
    async (ch: string, data: EventPayload | EventPayload[]) => {
      try {
        await events.post(ch, data);
      } catch (err) {
        console.error("Falha ao publicar evento:", err);
        throw err;
      }
    },
    []
  );

  // Publicar evento via WebSocket (channel.publish) — requer conexão ativa
  const publishViaChannel = useCallback(
    async (data: EventPayload) => {
      if (!channelRef.current) {
        throw new Error("Nenhum canal conectado. Chame subscribe() primeiro.");
      }
      try {
        await channelRef.current.publish(data);
      } catch (err) {
        console.error("Falha ao publicar evento via WebSocket:", err);
        throw err;
      }
    },
    []
  );

  // Desconectar
  const disconnect = useCallback(() => {
    if (channelRef.current) {
      channelRef.current.close();
      channelRef.current = null;
    }
    setStatus("disconnected");
  }, []);

  // Auto-connect se um canal for fornecido
  useEffect(() => {
    if (channel) {
      subscribe(channel);
    }
    return () => {
      disconnect();
    };
  }, [channel, subscribe, disconnect]);

  return { status, subscribe, publish, publishViaChannel, disconnect };
}
