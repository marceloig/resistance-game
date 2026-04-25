import { useEffect } from "react";
import AppLayout from "@cloudscape-design/components/app-layout";
import ContentLayout from "@cloudscape-design/components/content-layout";
import Header from "@cloudscape-design/components/header";
import TopNavigation from "@cloudscape-design/components/top-navigation";
import Alert from "@cloudscape-design/components/alert";
import SpaceBetween from "@cloudscape-design/components/space-between";
import { useGameRoom } from "./hooks/useGameRoom";
import { GameLobby } from "./components/GameLobby";
import { GameRoom } from "./components/GameRoom";

export default function App() {
    const {
        room, roomLocked, auditLog, connectedPlayers,
        createRoom, joinRoom, leaveRoom,
        connection, avalon,
    } = useGameRoom();

    // Redireciona ao lobby quando a sala está bloqueada (jogo em andamento)
    useEffect(() => {
        if (roomLocked && room.phase === "connected") {
            const timer = setTimeout(() => leaveRoom(), 2000);
            return () => clearTimeout(timer);
        }
    }, [roomLocked, room.phase, leaveRoom]);

    const statusLabel = room.phase === "connected"
        ? `${room.playerName} | Sala: ${room.roomCode} (${connection.status})`
        : "Desconectado";

    return (
        <>
            <div id="top-nav">
                <TopNavigation
                    identity={{
                        href: "/",
                        title: "The Resistance",
                    }}
                    utilities={[
                        {
                            type: "button",
                            text: statusLabel,
                            iconName: room.phase === "connected" ? "status-positive" : "status-stopped",
                        },
                    ]}
                />
            </div>

            <AppLayout
                navigationHide
                toolsHide
                content={
                    <ContentLayout
                        header={
                            <Header
                                variant="h1"
                                description="Jogo de dedução social em tempo real"
                            >
                                The Resistance
                            </Header>
                        }
                    >
                        {room.phase === "lobby" ? (
                            <SpaceBetween size="l">
                                {roomLocked && (
                                    <Alert type="error" header="Sala bloqueada">
                                        Esta sala já possui um jogo em andamento. Aguarde o término da partida ou entre em outra sala.
                                    </Alert>
                                )}
                                <GameLobby onCreateRoom={createRoom} onJoinRoom={joinRoom} />
                            </SpaceBetween>
                        ) : roomLocked ? (
                            <Alert type="warning" header="Jogo em andamento">
                                Um jogo já está em andamento nesta sala. Você será redirecionado ao lobby...
                            </Alert>
                        ) : (
                            <GameRoom
                                roomCode={room.roomCode!}
                                playerName={room.playerName!}
                                isHost={room.isHost}
                                connectionStatus={connection.status}
                                connectedPlayers={connectedPlayers}
                                auditLog={auditLog}
                                avalon={avalon}
                                onLeave={leaveRoom}
                            />
                        )}
                    </ContentLayout>
                }
            />
        </>
    );
}
