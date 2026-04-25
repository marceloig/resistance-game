import { useState } from "react";
import Container from "@cloudscape-design/components/container";
import Header from "@cloudscape-design/components/header";
import SpaceBetween from "@cloudscape-design/components/space-between";
import Button from "@cloudscape-design/components/button";
import Box from "@cloudscape-design/components/box";
import RadioGroup from "@cloudscape-design/components/radio-group";

interface AssassinPhaseProps {
    players: string[];
    isAssassin: boolean;
    myLoyalty: "good" | "evil" | null;
    onChooseTarget: (target: string) => void;
}

/**
 * Fase do assassino: os Lacaios de Mordred tentam identificar Merlin.
 * Apenas o jogador com o papel de Assassino pode escolher o alvo.
 *
 * Uso:
 * ```tsx
 * <AssassinPhase players={[...]} isAssassin={true} myLoyalty="evil" onChooseTarget={choose} />
 * ```
 */
export function AssassinPhase({ players, isAssassin, myLoyalty, onChooseTarget }: AssassinPhaseProps) {
    const [target, setTarget] = useState<string | null>(null);

    // Filtra apenas jogadores do bem como alvos possíveis
    // (o assassino não sabe quem é quem, mas sabe quem é do mal)
    const possibleTargets = players;

    return (
        <Container header={<Header variant="h2">Fase do Assassino</Header>}>
            <SpaceBetween size="m">
                <Box variant="p">
                    Os Servos de Arthur completaram 3 missões com sucesso!
                    Mas os Lacaios de Mordred têm uma última chance...
                </Box>

                <Box variant="p" fontWeight="bold">
                    O Assassino deve tentar identificar Merlin.
                    Se acertar, o Mal vence!
                </Box>

                {isAssassin && (
                    <SpaceBetween size="m">
                        <Box variant="p">Você é o Assassino. Escolha quem você acredita ser Merlin:</Box>
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
                        Aguardando a decisão do Assassino... Torça para que Merlin não seja descoberto!
                    </Box>
                )}
            </SpaceBetween>
        </Container>
    );
}
