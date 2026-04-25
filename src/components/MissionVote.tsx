import Container from "@cloudscape-design/components/container";
import Header from "@cloudscape-design/components/header";
import SpaceBetween from "@cloudscape-design/components/space-between";
import Box from "@cloudscape-design/components/box";
import Badge from "@cloudscape-design/components/badge";
import type { MissionVoteChoice, Loyalty } from "../types/avalon";

interface MissionVoteProps {
    proposedTeam: string[];
    currentMission: number;
    isOnTeam: boolean;
    myLoyalty: Loyalty | null;
    hasVoted: boolean;
    voteCount: number;
    teamSize: number;
    onVote: (choice: MissionVoteChoice) => void;
}

/**
 * Interface de votação da missão para membros da equipe.
 * Jogadores do bem só podem votar Sucesso. Jogadores do mal podem escolher.
 *
 * Uso:
 * ```tsx
 * <MissionVote proposedTeam={["Alice", "Bob"]} isOnTeam={true} myLoyalty="evil" ... />
 * ```
 */
export function MissionVote({
    proposedTeam,
    currentMission,
    isOnTeam,
    myLoyalty,
    hasVoted,
    voteCount,
    teamSize,
    onVote,
}: MissionVoteProps) {
    // Servos de Arthur são obrigados a votar Sucesso
    const canFail = myLoyalty === "evil";

    return (
        <Container
            header={
                <Header variant="h2">
                    Missão {currentMission + 1} — Execução
                </Header>
            }
        >
            <SpaceBetween size="m">
                <Box variant="p">Equipe em missão:</Box>
                <SpaceBetween size="xs" direction="horizontal">
                    {proposedTeam.map((name) => (
                        <Badge key={name} color="blue">{name}</Badge>
                    ))}
                </SpaceBetween>

                {isOnTeam && !hasVoted && (
                    <SpaceBetween size="s">
                        <Box variant="p" fontWeight="bold">
                            Você faz parte da equipe. Escolha seu voto secreto:
                        </Box>
                        <SpaceBetween size="s" direction="horizontal">
                            <button
                                type="button"
                                onClick={() => onVote("success")}
                                style={{
                                    backgroundColor: "#00802f",
                                    color: "#ffffff",
                                    border: "none",
                                    borderRadius: "20px",
                                    padding: "8px 20px",
                                    fontSize: "14px",
                                    fontWeight: "bold",
                                    cursor: "pointer",
                                }}
                            >
                                ✓ Sucesso
                            </button>
                            {canFail && (
                                <button
                                    type="button"
                                    onClick={() => onVote("fail")}
                                    style={{
                                        backgroundColor: "#db0000",
                                        color: "#ffffff",
                                        border: "none",
                                        borderRadius: "20px",
                                        padding: "8px 20px",
                                        fontSize: "14px",
                                        fontWeight: "bold",
                                        cursor: "pointer",
                                    }}
                                >
                                    ✗ Falha
                                </button>
                            )}
                        </SpaceBetween>
                        {!canFail && (
                            <Box variant="p" color="text-body-secondary" fontSize="body-s">
                                Como Operativo da Resistência, você deve votar Sucesso.
                            </Box>
                        )}
                    </SpaceBetween>
                )}

                {isOnTeam && hasVoted && (
                    <Box variant="p" color="text-body-secondary">
                        Voto registrado. Aguardando outros membros... ({voteCount}/{teamSize})
                    </Box>
                )}

                {!isOnTeam && (
                    <Box variant="p" color="text-body-secondary">
                        Você não faz parte desta equipe. Aguardando resultado... ({voteCount}/{teamSize})
                    </Box>
                )}
            </SpaceBetween>
        </Container>
    );
}
