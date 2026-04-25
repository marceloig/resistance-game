import AppLayout from "@cloudscape-design/components/app-layout";
import ContentLayout from "@cloudscape-design/components/content-layout";
import Header from "@cloudscape-design/components/header";
import TopNavigation from "@cloudscape-design/components/top-navigation";
import { useGameRoom } from "./hooks/useGameRoom";
import { GameLobby } from "./components/GameLobby";
import { GameRoom } from "./components/GameRoom";

export default function App() {
    const { room, auditLog, createRoom, joinRoom, leaveRoom, connection } = useGameRoom();

    const statusLabel = room.phase === "connected"
        ? `${room.playerName} | Sala: ${room.roomCode} (${connection.status})`
        : "Desconectado";

    return (
        <>
            <div id="top-nav">
                <TopNavigation
                    identity={{
                        href: "/",
                        title: "Amplify Game Base",
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
                                description="Crie ou entre em uma sala para jogar em tempo real"
                            >
                                Amplify Game Base
                            </Header>
                        }
                    >
                        {room.phase === "lobby" ? (
                            <GameLobby onCreateRoom={createRoom} onJoinRoom={joinRoom} />
                        ) : (
                            <GameRoom
                                roomCode={room.roomCode!}
                                playerName={room.playerName!}
                                connectionStatus={connection.status}
                                auditLog={auditLog}
                                onLeave={leaveRoom}
                            />
                        )}
                    </ContentLayout>
                }
            />
        </>
    );
}
