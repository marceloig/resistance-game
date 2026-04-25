import Container from "@cloudscape-design/components/container";
import Header from "@cloudscape-design/components/header";
import SpaceBetween from "@cloudscape-design/components/space-between";
import Button from "@cloudscape-design/components/button";
import Box from "@cloudscape-design/components/box";
import Badge from "@cloudscape-design/components/badge";
import type { ConnectionStatus } from "../hooks/useEventsConnection";
import type { AuditLogEntry } from "../hooks/useGameRoom";
import { AuditLog } from "./AuditLog";

interface GameRoomProps {
    roomCode: string;
    playerName: string;
    connectionStatus: ConnectionStatus;
    auditLog: AuditLogEntry[];
    onLeave: () => void;
}

/**
 * Exibe a sala de jogo ativa com código, status da conexão e log de auditoria.
 *
 * Uso:
 * ```tsx
 * <GameRoom roomCode="A3K9Z" playerName="João" connectionStatus="connected" auditLog={[]} onLeave={leaveRoom} />
 * ```
 */
export function GameRoom({ roomCode, playerName, connectionStatus, auditLog, onLeave }: GameRoomProps) {
    return (
        <SpaceBetween size="l">
            <Container
                header={
                    <Header
                        variant="h2"
                        actions={
                            <Button onClick={onLeave} variant="link">
                                Sair da Sala
                            </Button>
                        }
                    >
                        Sala de Jogo
                    </Header>
                }
            >
                <SpaceBetween size="m">
                    <Box variant="p">
                        Jogador:{" "}
                        <Box variant="span" fontWeight="bold">
                            {playerName}
                        </Box>
                    </Box>
                    <Box variant="p">
                        Código da sala:{" "}
                        <Box variant="span" fontWeight="bold" fontSize="heading-xl">
                            {roomCode}
                        </Box>
                    </Box>
                    <Box variant="p">
                        Compartilhe este código com outros jogadores para que entrem na mesma sala.
                    </Box>
                    <Box variant="p">
                        Status: <Badge color={statusColor(connectionStatus)}>{connectionStatus}</Badge>
                    </Box>
                </SpaceBetween>
            </Container>

            <AuditLog entries={auditLog} />
        </SpaceBetween>
    );
}

/** Mapeia o status da conexão para a cor do Badge do Cloudscape. */
function statusColor(status: ConnectionStatus): "green" | "red" | "blue" | "grey" {
    switch (status) {
        case "connected":
            return "green";
        case "connecting":
            return "blue";
        case "error":
            return "red";
        default:
            return "grey";
    }
}
