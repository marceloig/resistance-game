import { useState } from "react";
import Container from "@cloudscape-design/components/container";
import Header from "@cloudscape-design/components/header";
import SpaceBetween from "@cloudscape-design/components/space-between";
import Button from "@cloudscape-design/components/button";
import Box from "@cloudscape-design/components/box";
import Badge from "@cloudscape-design/components/badge";
import type { AvalonRole, Loyalty, VisiblePlayerInfo } from "../types/avalon";
import { ROLE_LABELS } from "../types/avalon";

interface RoleRevealProps {
    myRole: AvalonRole;
    myLoyalty: Loyalty;
    visiblePlayers: VisiblePlayerInfo[];
    isHost: boolean;
    onConfirm: () => void;
}

/**
 * Tela de revelação de papel para o jogador.
 * Mostra o papel secreto e as informações visíveis sobre outros jogadores.
 *
 * Uso:
 * ```tsx
 * <RoleReveal myRole="merlin" myLoyalty="good" visiblePlayers={[...]} isHost={true} onConfirm={confirm} />
 * ```
 */
export function RoleReveal({ myRole, myLoyalty, visiblePlayers, isHost, onConfirm }: RoleRevealProps) {
    const [revealed, setRevealed] = useState(false);

    const loyaltyColor = myLoyalty === "good" ? "blue" : "red";
    const loyaltyLabel = myLoyalty === "good" ? "Servo de Arthur" : "Lacaio de Mordred";
    const knownPlayers = visiblePlayers.filter((p) => p.appearsAs !== "unknown");

    return (
        <Container header={<Header variant="h2">Seu Papel Secreto</Header>}>
            <SpaceBetween size="m">
                {!revealed ? (
                    <SpaceBetween size="m">
                        <Box variant="p">
                            Clique no botão abaixo para revelar seu papel.
                            Certifique-se de que ninguém está olhando sua tela.
                        </Box>
                        <Button variant="primary" onClick={() => setRevealed(true)}>
                            Revelar Papel
                        </Button>
                    </SpaceBetween>
                ) : (
                    <SpaceBetween size="m">
                        <Box variant="p">
                            Você é:{" "}
                            <Box variant="span" fontWeight="bold" fontSize="heading-l">
                                {ROLE_LABELS[myRole]}
                            </Box>
                        </Box>
                        <Box variant="p">
                            Lealdade: <Badge color={loyaltyColor}>{loyaltyLabel}</Badge>
                        </Box>

                        {knownPlayers.length > 0 && (
                            <SpaceBetween size="xs">
                                <Box variant="p" fontWeight="bold">
                                    Informações visíveis:
                                </Box>
                                {knownPlayers.map((p) => (
                                    <Box key={p.name} variant="p">
                                        <Box variant="span" fontWeight="bold">{p.name}</Box>
                                        {" — "}
                                        {visibilityLabel(p.appearsAs)}
                                    </Box>
                                ))}
                            </SpaceBetween>
                        )}

                        {knownPlayers.length === 0 && (
                            <Box variant="p" color="text-body-secondary">
                                Você não tem informações especiais sobre outros jogadores.
                            </Box>
                        )}

                        {isHost && (
                            <Button variant="primary" onClick={onConfirm}>
                                Todos Viram? Iniciar Jogo
                            </Button>
                        )}

                        {!isHost && (
                            <Box variant="p" color="text-body-secondary">
                                Aguardando o host confirmar que todos viram seus papéis...
                            </Box>
                        )}
                    </SpaceBetween>
                )}
            </SpaceBetween>
        </Container>
    );
}

function visibilityLabel(appearsAs: VisiblePlayerInfo["appearsAs"]): string {
    switch (appearsAs) {
        case "evil":
            return "🔴 Malvado";
        case "merlin_or_morgana":
            return "🔮 Merlin ou Morgana (você não sabe qual)";
        default:
            return "Desconhecido";
    }
}
