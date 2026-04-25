import Container from "@cloudscape-design/components/container";
import Header from "@cloudscape-design/components/header";
import SpaceBetween from "@cloudscape-design/components/space-between";
import Button from "@cloudscape-design/components/button";
import Box from "@cloudscape-design/components/box";
import Badge from "@cloudscape-design/components/badge";
import type { MissionOutcome } from "../types/avalon";

interface MissionResultProps {
    outcome: MissionOutcome;
    isHost: boolean;
    onContinue: () => void;
}

/**
 * Exibe o resultado de uma missão completada.
 * Mostra quantos votos de sucesso e falha houve (sem revelar quem votou o quê).
 *
 * Uso:
 * ```tsx
 * <MissionResult outcome={lastOutcome} isHost={true} onContinue={next} />
 * ```
 */
export function MissionResult({ outcome, isHost, onContinue }: MissionResultProps) {
    const succeeded = outcome.result === "success";

    return (
        <Container
            header={
                <Header variant="h2">
                    Resultado da Missão {outcome.missionIndex + 1}
                </Header>
            }
        >
            <SpaceBetween size="m">
                <Box variant="p" fontSize="heading-l" textAlign="center">
                    <Badge color={succeeded ? "green" : "red"}>
                        {succeeded ? "✓ Missão Bem-Sucedida!" : "✗ Missão Falhou!"}
                    </Badge>
                </Box>

                <SpaceBetween size="xs">
                    <Box variant="p">
                        Votos de Sucesso: <Box variant="span" fontWeight="bold">{outcome.successCount}</Box>
                    </Box>
                    <Box variant="p">
                        Votos de Falha: <Box variant="span" fontWeight="bold">{outcome.failCount}</Box>
                    </Box>
                </SpaceBetween>

                {isHost && (
                    <Button variant="primary" onClick={onContinue}>
                        Continuar
                    </Button>
                )}

                {!isHost && (
                    <Box variant="p" color="text-body-secondary">
                        Aguardando o host continuar...
                    </Box>
                )}
            </SpaceBetween>
        </Container>
    );
}
