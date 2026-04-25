import Container from "@cloudscape-design/components/container";
import Header from "@cloudscape-design/components/header";
import SpaceBetween from "@cloudscape-design/components/space-between";
import Box from "@cloudscape-design/components/box";
import type { AuditLogEntry, AuditLogSegment } from "../hooks/useGameRoom";

interface AuditLogProps {
    entries: AuditLogEntry[];
}

/**
 * Exibe o log de auditoria da sala.
 * Segmentos marcados como bold são renderizados em negrito.
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
                            {" "}
                            {entry.segments.map((seg, segIdx) => (
                                <RenderSegment key={segIdx} segment={seg} />
                            ))}
                        </Box>
                    ))}
                </SpaceBetween>
            )}
        </Container>
    );
}

/** Renderiza um segmento de texto: normal ou negrito. */
function RenderSegment({ segment }: { segment: AuditLogSegment }) {
    if (typeof segment === "string") {
        return <>{segment}</>;
    }
    return <Box variant="span" fontWeight="bold">{segment.bold}</Box>;
}

/** Formata um ISO timestamp para hora local legível (HH:MM:SS). */
function formatTime(iso: string): string {
    try {
        return new Date(iso).toLocaleTimeString("pt-BR");
    } catch {
        return iso;
    }
}
