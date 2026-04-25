import Container from "@cloudscape-design/components/container";
import Header from "@cloudscape-design/components/header";
import SpaceBetween from "@cloudscape-design/components/space-between";
import Button from "@cloudscape-design/components/button";
import Box from "@cloudscape-design/components/box";
import Badge from "@cloudscape-design/components/badge";
import type { ConnectionStatus } from "../hooks/useEventsConnection";
import type { AuditLogEntry } from "../hooks/useGameRoom";
import type { useAvalonGame } from "../hooks/useAvalonGame";
import { AuditLog } from "./AuditLog";
import { WaitingRoom } from "./WaitingRoom";
import { AvalonBoard } from "./AvalonBoard";

interface GameRoomProps {
    roomCode: string;
    playerName: string;
    isHost: boolean;
    connectionStatus: ConnectionStatus;
    connectedPlayers: string[];
    auditLog: AuditLogEntry[];
    avalon: ReturnType<typeof useAvalonGame>;
    onLeave: () => void;
}

/**
 * Exibe a sala de jogo com informações da sala, o tabuleiro Avalon e o log de auditoria.
 *
 * Uso:
 * ```tsx
 * <GameRoom roomCode="A3K9Z" playerName="João" isHost={true} ... />
 * ```
 */
export function GameRoom({
    roomCode,
    playerName,
    isHost,
    connectionStatus,
    connectedPlayers,
    auditLog,
    avalon,
    onLeave,
}: GameRoomProps) {
    const { localState } = avalon;
    const isGameActive = localState.phase !== "waiting";

    return (
        <SpaceBetween size="l">
            <RoomHeader
                roomCode={roomCode}
                playerName={playerName}
                connectionStatus={connectionStatus}
                onLeave={onLeave}
            />

            {!isGameActive && (
                <WaitingRoom
                    players={connectedPlayers}
                    isHost={isHost}
                    onStartGame={() => avalon.startGame(connectedPlayers)}
                />
            )}

            {isGameActive && (
                <AvalonBoard
                    state={localState}
                    isHost={isHost}
                    onConfirmRoles={avalon.confirmRoleReveal}
                    onProposeTeam={avalon.proposeTeam}
                    onTeamVote={avalon.castTeamVote}
                    onMissionVote={avalon.castMissionVote}
                    onAssassinChoice={avalon.chooseAssassinTarget}
                    onContinueAfterMission={() => {
                        // Host avança para a próxima fase após exibir resultado
                        // O estado já foi atualizado pelo evento mission_result
                    }}
                    onPlayAgain={avalon.resetGame}
                />
            )}

            <AuditLog entries={auditLog} />
        </SpaceBetween>
    );
}

/** Cabeçalho da sala com código, jogador e status. */
function RoomHeader({
    roomCode,
    playerName,
    connectionStatus,
    onLeave,
}: {
    roomCode: string;
    playerName: string;
    connectionStatus: ConnectionStatus;
    onLeave: () => void;
}) {
    return (
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
                    <Box variant="span" fontWeight="bold">{playerName}</Box>
                </Box>
                <Box variant="p">
                    Código da sala:{" "}
                    <Box variant="span" fontWeight="bold" fontSize="heading-xl">{roomCode}</Box>
                </Box>
                <Box variant="p">
                    Compartilhe este código com outros jogadores para que entrem na mesma sala.
                </Box>
                <Box variant="p">
                    Status: <Badge color={statusColor(connectionStatus)}>{connectionStatus}</Badge>
                </Box>
            </SpaceBetween>
        </Container>
    );
}

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
