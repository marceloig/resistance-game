import { useState } from "react";
import Container from "@cloudscape-design/components/container";
import Header from "@cloudscape-design/components/header";
import SpaceBetween from "@cloudscape-design/components/space-between";
import Button from "@cloudscape-design/components/button";
import Box from "@cloudscape-design/components/box";
import Toggle from "@cloudscape-design/components/toggle";
import Alert from "@cloudscape-design/components/alert";

interface TeamProposalProps {
    players: string[];
    leaderName: string;
    isLeader: boolean;
    requiredTeamSize: number;
    currentMission: number;
    rejectedProposals: number;
    onPropose: (team: string[]) => void;
}

/**
 * Interface para o líder propor uma equipe para a missão.
 * Outros jogadores veem quem é o líder e aguardam a proposta.
 *
 * Uso:
 * ```tsx
 * <TeamProposal players={[...]} leaderName="Alice" isLeader={true} requiredTeamSize={3} ... />
 * ```
 */
export function TeamProposal({
    players,
    leaderName,
    isLeader,
    requiredTeamSize,
    currentMission,
    rejectedProposals,
    onPropose,
}: TeamProposalProps) {
    const [selected, setSelected] = useState<Set<string>>(new Set());

    function togglePlayer(name: string) {
        setSelected((prev) => {
            const next = new Set(prev);
            if (next.has(name)) {
                next.delete(name);
            } else if (next.size < requiredTeamSize) {
                next.add(name);
            }
            return next;
        });
    }

    function handlePropose() {
        if (selected.size !== requiredTeamSize) return;
        onPropose([...selected]);
    }

    return (
        <Container
            header={
                <Header variant="h2">
                    Missão {currentMission + 1} — Proposta de Equipe
                </Header>
            }
        >
            <SpaceBetween size="m">
                <Box variant="p">
                    Líder:{" "}
                    <Box variant="span" fontWeight="bold">{leaderName}</Box>
                </Box>

                <Box variant="p">
                    Selecione <Box variant="span" fontWeight="bold">{requiredTeamSize}</Box> jogadores
                    para a missão.
                </Box>

                {rejectedProposals > 0 && (
                    <Alert type="warning">
                        {rejectedProposals} proposta(s) rejeitada(s). Na 5ª rejeição a equipe é aceita automaticamente.
                    </Alert>
                )}

                {isLeader ? (
                    <SpaceBetween size="xs">
                        {players.map((name) => (
                            <Toggle
                                key={name}
                                checked={selected.has(name)}
                                onChange={() => togglePlayer(name)}
                            >
                                {name}
                            </Toggle>
                        ))}
                        <Button
                            variant="primary"
                            disabled={selected.size !== requiredTeamSize}
                            onClick={handlePropose}
                        >
                            Propor Equipe ({selected.size}/{requiredTeamSize})
                        </Button>
                    </SpaceBetween>
                ) : (
                    <Box variant="p" color="text-body-secondary">
                        Aguardando <Box variant="span" fontWeight="bold">{leaderName}</Box> propor a equipe...
                    </Box>
                )}
            </SpaceBetween>
        </Container>
    );
}
