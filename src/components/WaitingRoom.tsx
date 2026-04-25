import Container from "@cloudscape-design/components/container";
import Header from "@cloudscape-design/components/header";
import SpaceBetween from "@cloudscape-design/components/space-between";
import Button from "@cloudscape-design/components/button";
import Box from "@cloudscape-design/components/box";
import Badge from "@cloudscape-design/components/badge";
import { MIN_PLAYERS, MAX_PLAYERS } from "../game/avalonConfig";

interface WaitingRoomProps {
    players: string[];
    isHost: boolean;
    onStartGame: () => void;
}

/**
 * Sala de espera antes do jogo começar.
 * Mostra a lista de jogadores conectados e permite ao host iniciar o jogo.
 *
 * Uso:
 * ```tsx
 * <WaitingRoom players={["Alice", "Bob"]} isHost={true} onStartGame={start} />
 * ```
 */
export function WaitingRoom({ players, isHost, onStartGame }: WaitingRoomProps) {
    const canStart = players.length >= MIN_PLAYERS && players.length <= MAX_PLAYERS;

    return (
        <Container
            header={
                <Header
                    variant="h2"
                    counter={`(${players.length}/${MAX_PLAYERS})`}
                >
                    Jogadores na Sala
                </Header>
            }
        >
            <SpaceBetween size="m">
                <SpaceBetween size="xs">
                    {players.map((name, idx) => (
                        <Box key={idx} variant="p">
                            <Badge color="blue">{idx + 1}</Badge>{" "}
                            {name}
                            {idx === 0 && (
                                <Box variant="span" color="text-body-secondary"> (host)</Box>
                            )}
                        </Box>
                    ))}
                </SpaceBetween>

                {!canStart && (
                    <Box variant="p" color="text-body-secondary">
                        Mínimo de {MIN_PLAYERS} jogadores para iniciar. Máximo: {MAX_PLAYERS}.
                    </Box>
                )}

                {isHost && (
                    <Button
                        variant="primary"
                        disabled={!canStart}
                        onClick={onStartGame}
                    >
                        Iniciar Jogo ({players.length} jogadores)
                    </Button>
                )}

                {!isHost && (
                    <Box variant="p" color="text-body-secondary">
                        Aguardando o host iniciar o jogo...
                    </Box>
                )}
            </SpaceBetween>
        </Container>
    );
}
