import Container from "@cloudscape-design/components/container";
import Header from "@cloudscape-design/components/header";
import SpaceBetween from "@cloudscape-design/components/space-between";
import Box from "@cloudscape-design/components/box";
import type { AuditLogEntry } from "../hooks/useGameRoom";

interface AuditLogProps {
    entries: AuditLogEntry[];
}

/**
 * Exibe o log de auditoria da sala com entradas e saídas de jogadores.
 * Nome do jogador e código da sala são exibidos em negrito.
 *
 * Uso:
 * ```tsx
 * <AuditLog entries={auditLog} />
 * ```
 */
export function AuditLog({ entries }: AuditLogProps) {
    return (
        <Container header={<Header variant="h2">Log de Auditoria ({entries.length})</Header>}>
            {entries.length === 0 ? (
                <Box variant="p" color="text-body-secondary">
                    Nenhuma atividade registrada ainda.
                </Box>
            ) : (
                <SpaceBetween size="xs">
                    {entries.map((entry, idx) => (
                        <Box key={idx} variant="p">
                            <Box variant="span" color="text-body-secondary" fontSize="body-s">
                                {formatTime(entry.timestamp)}
                            </Box>
                            {" Player "}
                            <Box variant="span" fontWeight="bold">{entry.playerName}</Box>
                            {` ${entry.action} sala `}
                            <Box variant="span" fontWeight="bold">{entry.roomCode}</Box>
                        </Box>
                    ))}
                </SpaceBetween>
            )}
        </Container>
    );
}

/** Formata um ISO timestamp para hora local legível (HH:MM:SS). */
function formatTime(iso: string): string {
    try {
        return new Date(iso).toLocaleTimeString("pt-BR");
    } catch {
        return iso;
    }
}
