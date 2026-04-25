import { useState } from "react";
import Container from "@cloudscape-design/components/container";
import Header from "@cloudscape-design/components/header";
import SpaceBetween from "@cloudscape-design/components/space-between";
import Button from "@cloudscape-design/components/button";
import Box from "@cloudscape-design/components/box";
import RadioGroup from "@cloudscape-design/components/radio-group";

interface AssassinPhaseProps {
    players: string[];
    myName: string;
    isAssassin: boolean;
    myLoyalty: "good" | "evil" | null;
    visiblePlayers: { name: string; appearsAs: string }[];
    onChooseTarget: (target: string) => void;
}

/**
 * Fase do assassino: os Espiões tentam identificar o Comandante.
 * Apenas o jogador com o papel de Assassino pode escolher o alvo.
 *
 * Uso:
 * ```tsx
 * <AssassinPhase players={[...]} isAssassin={true} myLoyalty="evil" onChooseTarget={choose} />
 * ```
 */
export function AssassinPhase({ players, myName, isAssassin, myLoyalty, visiblePlayers, onChooseTarget }: AssassinPhaseProps) {
    const [target, setTarget] = useState<string | null>(null);

    // Exclui o próprio jogador e os espiões conhecidos da lista de alvos
    const knownEvilNames = new Set(
        visiblePlayers.filter((p) => p.appearsAs === "evil").map((p) => p.name),
    );
    const possibleTargets = players.filter((name) => name !== myName && !knownEvilNames.has(name));

    return (
        <Container header={<Header variant="h2">Fase do Assassino</Header>}>
            <SpaceBetween size="m">
                <Box variant="p">
                    A Resistência completou 3 missões com sucesso!
                    Mas os Espiões têm uma última chance...
                </Box>

                <Box variant="p" fontWeight="bold">
                    O Assassino deve tentar identificar o Comandante.
                    Se acertar, os Espiões vencem!
                </Box>

                {isAssassin && (
                    <SpaceBetween size="m">
                        <Box variant="p">Você é o Assassino. Escolha quem você acredita ser o Comandante:</Box>
                        <RadioGroup
                            value={target}
                            onChange={({ detail }) => setTarget(detail.value)}
                            items={possibleTargets.map((name) => ({
                                value: name,
                                label: name,
                            }))}
                        />
                        <Button
                            variant="primary"
                            disabled={!target}
                            onClick={() => target && onChooseTarget(target)}
                        >
                            Assassinar {target ?? "..."}
                        </Button>
                    </SpaceBetween>
                )}

                {!isAssassin && myLoyalty === "evil" && (
                    <Box variant="p" color="text-body-secondary">
                        Discuta com seus aliados. O Assassino está escolhendo o alvo...
                    </Box>
                )}

                {!isAssassin && myLoyalty === "good" && (
                    <Box variant="p" color="text-body-secondary">
                        Aguardando a decisão do Assassino... Torça para que o Comandante não seja descoberto!
                    </Box>
                )}
            </SpaceBetween>
        </Container>
    );
}
