import Container from "@cloudscape-design/components/container";
import Header from "@cloudscape-design/components/header";
import SpaceBetween from "@cloudscape-design/components/space-between";
import Button from "@cloudscape-design/components/button";
import Box from "@cloudscape-design/components/box";
import Badge from "@cloudscape-design/components/badge";
import type { Loyalty } from "../types/avalon";

interface GameOverProps {
    winner: Loyalty;
    reason: string;
    isHost: boolean;
    onPlayAgain: () => void;
}

/**
 * Tela de fim de jogo mostrando o vencedor e o motivo.
 *
 * Uso:
 * ```tsx
 * <GameOver winner="good" reason="Três missões completadas!" isHost={true} onPlayAgain={reset} />
 * ```
 */
export function GameOver({ winner, reason, isHost, onPlayAgain }: GameOverProps) {
    const isGoodWin = winner === "good";

    return (
        <Container header={<Header variant="h2">Fim de Jogo</Header>}>
            <SpaceBetween size="l">
                <Box variant="p" fontSize="heading-xl" textAlign="center">
                    <Badge color={isGoodWin ? "blue" : "red"}>
                        {isGoodWin ? "🏰 Vitória dos Servos de Arthur!" : "🗡️ Vitória dos Lacaios de Mordred!"}
                    </Badge>
                </Box>

                <Box variant="p" textAlign="center" fontSize="heading-m">
                    {reason}
                </Box>

                {isHost && (
                    <Box textAlign="center">
                        <Button variant="primary" onClick={onPlayAgain}>
                            Jogar Novamente
                        </Button>
                    </Box>
                )}

                {!isHost && (
                    <Box variant="p" color="text-body-secondary" textAlign="center">
                        Aguardando o host iniciar uma nova partida...
                    </Box>
                )}
            </SpaceBetween>
        </Container>
    );
}
