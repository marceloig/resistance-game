import SpaceBetween from "@cloudscape-design/components/space-between";
import Box from "@cloudscape-design/components/box";
import Badge from "@cloudscape-design/components/badge";
import Container from "@cloudscape-design/components/container";
import Header from "@cloudscape-design/components/header";
import type { MissionResult } from "../types/avalon";

interface MissionTrackerProps {
    results: MissionResult[];
    currentMission: number;
}

/**
 * Exibe o progresso das 5 missões com indicadores visuais.
 *
 * Uso:
 * ```tsx
 * <MissionTracker results={missionResults} currentMission={2} />
 * ```
 */
export function MissionTracker({ results, currentMission }: MissionTrackerProps) {
    return (
        <Container header={<Header variant="h2">Missões</Header>}>
            <SpaceBetween size="m" direction="horizontal">
                {results.map((result, idx) => (
                    <Box key={idx} textAlign="center">
                        <Box variant="p" fontSize="body-s" color="text-body-secondary">
                            Missão {idx + 1}
                        </Box>
                        <Badge color={missionBadgeColor(result, idx === currentMission)}>
                            {missionLabel(result, idx === currentMission)}
                        </Badge>
                    </Box>
                ))}
            </SpaceBetween>
        </Container>
    );
}

function missionBadgeColor(result: MissionResult, isCurrent: boolean): "green" | "red" | "blue" | "grey" {
    if (result === "success") return "green";
    if (result === "fail") return "red";
    if (isCurrent) return "blue";
    return "grey";
}

function missionLabel(result: MissionResult, isCurrent: boolean): string {
    if (result === "success") return "✓ Sucesso";
    if (result === "fail") return "✗ Falha";
    if (isCurrent) return "● Atual";
    return "○ Pendente";
}
