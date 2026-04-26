import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

/**
 * Testes para beaconPublish — publicação confiável de eventos durante page unload.
 *
 * Mocka Amplify.getConfig(), fetch() e navigator.sendBeacon() para validar
 * o comportamento em diferentes cenários de disponibilidade de API.
 */

// Mock do Amplify.getConfig() — precisa ser definido antes do import
vi.mock("aws-amplify", () => ({
    Amplify: {
        getConfig: vi.fn(),
    },
}));

import { Amplify } from "aws-amplify";
import { beaconPublish } from "../useBeaconPublish";

const FAKE_ENDPOINT = "https://example.appsync-api.us-east-1.amazonaws.com/event";
const FAKE_API_KEY = "da2-fake-api-key-123";
const FAKE_CHANNEL = "default/game-A3K9Z";
const FAKE_PAYLOAD = { type: "player_left", playerName: "igor", roomCode: "A3K9Z", timestamp: "2025-01-01T00:00:00.000Z" };

function mockAmplifyConfigured(): void {
    vi.mocked(Amplify.getConfig).mockReturnValue({
        API: {
            Events: {
                endpoint: FAKE_ENDPOINT,
                apiKey: FAKE_API_KEY,
                defaultAuthMode: "apiKey",
                region: "us-east-1",
            },
        },
    } as ReturnType<typeof Amplify.getConfig>);
}

function mockAmplifyNotConfigured(): void {
    vi.mocked(Amplify.getConfig).mockReturnValue({} as ReturnType<typeof Amplify.getConfig>);
}

describe("beaconPublish", () => {
    let fetchSpy: ReturnType<typeof vi.fn>;
    let sendBeaconSpy: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        fetchSpy = vi.fn().mockResolvedValue(new Response());
        vi.stubGlobal("fetch", fetchSpy);

        sendBeaconSpy = vi.fn().mockReturnValue(true);
        vi.stubGlobal("navigator", { ...navigator, sendBeacon: sendBeaconSpy });
    });

    afterEach(() => {
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
    });

    describe("quando Amplify está configurado", () => {
        beforeEach(() => {
            mockAmplifyConfigured();
        });

        it("retorna true e chama fetch com keepalive", () => {
            const result = beaconPublish(FAKE_CHANNEL, FAKE_PAYLOAD);

            expect(result).toBe(true);
            expect(fetchSpy).toHaveBeenCalledOnce();

            const [url, options] = fetchSpy.mock.calls[0];
            expect(url).toBe(FAKE_ENDPOINT);
            expect(options.method).toBe("POST");
            expect(options.keepalive).toBe(true);
            expect(options.headers["x-api-key"]).toBe(FAKE_API_KEY);
            expect(options.headers["content-type"]).toBe("application/json");
        });

        it("envia o payload no formato correto do AppSync Events HTTP API", () => {
            beaconPublish(FAKE_CHANNEL, FAKE_PAYLOAD);

            const body = JSON.parse(fetchSpy.mock.calls[0][1].body);
            expect(body.channel).toBe(FAKE_CHANNEL);
            expect(body.events).toHaveLength(1);

            const event = JSON.parse(body.events[0]);
            expect(event.type).toBe("player_left");
            expect(event.playerName).toBe("igor");
            expect(event.roomCode).toBe("A3K9Z");
        });

        it("não chama sendBeacon quando fetch com keepalive funciona", () => {
            beaconPublish(FAKE_CHANNEL, FAKE_PAYLOAD);

            expect(sendBeaconSpy).not.toHaveBeenCalled();
        });

        it("usa sendBeacon como fallback quando fetch lança exceção síncrona", () => {
            fetchSpy.mockImplementation(() => { throw new Error("fetch not available"); });

            const result = beaconPublish(FAKE_CHANNEL, FAKE_PAYLOAD);

            expect(result).toBe(true);
            expect(sendBeaconSpy).toHaveBeenCalledOnce();

            const [url, blob] = sendBeaconSpy.mock.calls[0];
            expect(url).toBe(FAKE_ENDPOINT);
            expect(blob).toBeInstanceOf(Blob);
            expect(blob.type).toBe("application/json");
        });

        it("retorna false quando fetch e sendBeacon falham", () => {
            fetchSpy.mockImplementation(() => { throw new Error("fetch not available"); });
            sendBeaconSpy.mockReturnValue(false);

            const result = beaconPublish(FAKE_CHANNEL, FAKE_PAYLOAD);

            expect(result).toBe(false);
        });
    });

    describe("quando Amplify NÃO está configurado", () => {
        beforeEach(() => {
            mockAmplifyNotConfigured();
        });

        it("retorna false sem chamar fetch ou sendBeacon", () => {
            const result = beaconPublish(FAKE_CHANNEL, FAKE_PAYLOAD);

            expect(result).toBe(false);
            expect(fetchSpy).not.toHaveBeenCalled();
            expect(sendBeaconSpy).not.toHaveBeenCalled();
        });
    });

    describe("quando Amplify.getConfig() lança exceção", () => {
        it("retorna false graciosamente", () => {
            vi.mocked(Amplify.getConfig).mockImplementation(() => {
                throw new Error("Amplify not initialized");
            });

            const result = beaconPublish(FAKE_CHANNEL, FAKE_PAYLOAD);

            expect(result).toBe(false);
            expect(fetchSpy).not.toHaveBeenCalled();
        });
    });

    describe("payloads variados", () => {
        beforeEach(() => {
            mockAmplifyConfigured();
        });

        it("serializa payload null corretamente", () => {
            beaconPublish(FAKE_CHANNEL, null);

            const body = JSON.parse(fetchSpy.mock.calls[0][1].body);
            expect(body.events[0]).toBe("null");
        });

        it("serializa payload string corretamente", () => {
            beaconPublish(FAKE_CHANNEL, "simple-string");

            const body = JSON.parse(fetchSpy.mock.calls[0][1].body);
            expect(body.events[0]).toBe('"simple-string"');
        });

        it("serializa payload com objetos aninhados", () => {
            const nested = { type: "player_left", data: { nested: true, count: 42 } };
            beaconPublish(FAKE_CHANNEL, nested);

            const body = JSON.parse(fetchSpy.mock.calls[0][1].body);
            const event = JSON.parse(body.events[0]);
            expect(event.data.nested).toBe(true);
            expect(event.data.count).toBe(42);
        });
    });
});
