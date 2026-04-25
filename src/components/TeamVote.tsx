import Container from "@cloudscape-design/components/container";
import Header from "@cloudscape-design/components/header";
import SpaceBetween from "@cloudscape-design/components/space-between";
import Button from "@cloudscape-design/components/button";
import Box from "@cloudscape-design/components/box";
import Badge from "@cloudscape-design/components/badge";
import type { TeamVoteChoice } from "../types/avalon";

interface TeamVoteProps {
    proposedTeam: string[];
    leaderName: string;
    currentMission: number;
    hasVoted: boolean;
    voteCount: number;
    totalPlayers: number;
    /** Resultado da votação (null enquanto não resolvida). */
    result: { votes: Record<string, TeamVoteChoice>; approved: boolean } | null;
    onVote: (choice: TeamVoteChoice) => void;
}

/**
 * Interface de votação para aprovar ou rejeitar a equipe proposta.
 *
 * Uso:
 * ```tsx
 * <TeamVote proposedTeam={["Alice", "Bob"]} leaderName="Carol" ... />
 * ```
 */
export function TeamVote({
    proposedTeam,
    leaderName,
    currentMission,
    hasVoted,
    voteCount,
    totalPlayers,
    result,
    onVote,
}: TeamVoteProps) {
    return (
        <Container
            header={
                <Header variant="h2">
                    Missão {currentMission + 1} — Votação da Equipe
                </Header>
            }
        >
            <SpaceBetween size="m">
                <Box variant="p">
                    <Box variant="span" fontWeight="bold">{leaderName}</Box> propôs a equipe:
                </Box>

                <SpaceBetween size="xs" direction="horizontal">
                    {proposedTeam.map((name) => (
                        <Badge key={name} color="blue">{name}</Badge>
                    ))}
                </SpaceBetween>

                {!result && !hasVoted && (
                    <SpaceBetween size="s" direction="horizontal">
                        <Button variant="primary" onClick={() => onVote("approve")}>
                            ✓ Aprovar
                        </Button>
                        <Button variant="normal" onClick={() => onVote("reject")}>
                            ✗ Rejeitar
                        </Button>
                    </SpaceBetween>
                )}

                {!result && hasVoted && (
                    <Box variant="p" color="text-body-secondary">
                        Voto registrado. Aguardando outros jogadores... ({voteCount}/{totalPlayers})
                    </Box>
                )}

                {result && (
                    <SpaceBetween size="s">
                        <Box variant="p">
                            Resultado:{" "}
                            <Badge color={result.approved ? "green" : "red"}>
                                {result.approved ? "✓ Aprovada" : "✗ Rejeitada"}
                            </Badge>
                        </Box>
                        <SpaceBetween size="xs">
                            {Object.entries(result.votes).map(([name, vote]) => (
                                <Box key={name} variant="p">
                                    <Box variant="span" fontWeight="bold">{name}</Box>:{" "}
                                    {vote === "approve" ? "✓ Aprovou" : "✗ Rejeitou"}
                                </Box>
                            ))}
                        </SpaceBetween>
                    </SpaceBetween>
                )}
            </SpaceBetween>
        </Container>
    );
}
