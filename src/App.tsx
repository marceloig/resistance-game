import AppLayout from "@cloudscape-design/components/app-layout";
import ContentLayout from "@cloudscape-design/components/content-layout";
import Header from "@cloudscape-design/components/header";
import TopNavigation from "@cloudscape-design/components/top-navigation";
import { useGameRoom } from "./hooks/useGameRoom";
import { GameLobby } from "./components/GameLobby";
import { GameRoom } from "./components/GameRoom";

export default function App() {
    const {
        room, auditLog, connectedPlayers,
        createRoom, joinRoom, leaveRoom,
        connection, avalon,
    } = useGameRoom();

    const statusLabel = room.phase === "connected"
        ? `${room.playerName} | Sala: ${room.roomCode} (${connection.status})`
        : "Desconectado";

    return (
        <>
            <div id="top-nav">
                <TopNavigation
                    identity={{
                        href: "/",
                        title: "Avalon — The Resistance",
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
                                Avalon — The Resistance
                            </Header>
                        }
                    >
                        {room.phase === "lobby" ? (
                            <GameLobby onCreateRoom={createRoom} onJoinRoom={joinRoom} />
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
