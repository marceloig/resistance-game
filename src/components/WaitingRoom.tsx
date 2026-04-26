import { useState } from "react";
import Container from "@cloudscape-design/components/container";
import Header from "@cloudscape-design/components/header";
import SpaceBetween from "@cloudscape-design/components/space-between";
import Button from "@cloudscape-design/components/button";
import Box from "@cloudscape-design/components/box";
import Badge from "@cloudscape-design/components/badge";
import Toggle from "@cloudscape-design/components/toggle";
import { MIN_PLAYERS, MAX_PLAYERS, OPTIONAL_ROLES, type OptionalRole } from "../game/avalonConfig";

interface WaitingRoomProps {
    players: string[];
    isHost: boolean;
    hostName: string | null;
    onStartGame: (enabledRoles: Set<OptionalRole>) => void;
}

/**
 * Sala de espera antes do jogo começar.
 * Mostra a lista de jogadores conectados, permite ao host selecionar papéis
 * opcionais e iniciar o jogo.
 *
 * Uso:
 * ```tsx
 * <WaitingRoom players={["Alice", "Bob"]} isHost={true} onStartGame={start} />
 * ```
 */
export function WaitingRoom({ players, isHost, hostName, onStartGame }: WaitingRoomProps) {
    const canStart = players.length >= MIN_PLAYERS && players.length <= MAX_PLAYERS;
    const [enabledRoles, setEnabledRoles] = useState<Set<OptionalRole>>(new Set());

    const commanderEnabled = enabledRoles.has("commander");

    function toggleRole(roleId: OptionalRole) {
        setEnabledRoles((prev) => {
            const next = new Set(prev);
            if (next.has(roleId)) {
                next.delete(roleId);
                // Desativar Comandante desativa os papéis que dependem dele
                if (roleId === "commander") {
                    next.delete("assassin");
                    next.delete("bodyguard_false_commander");
                }
            } else {
                next.add(roleId);
            }
            return next;
        });
    }

    /** Assassino e Guarda-Costas+Falso Comandante só podem ser ativados se Comandante estiver ativo. */
    function isRoleDisabled(roleId: OptionalRole): boolean {
        if (roleId === "assassin" || roleId === "bodyguard_false_commander") {
            return !commanderEnabled;
        }
        return false;
    }

    return (
        <SpaceBetween size="l">
            <Container
                header={
                    <Header
                        variant="h2"
                        counter={`(${players.length}/${MAX_PLAYERS})`}
                    >
                        Jogadores na Sala
                    </Header>
                }
            >
                <SpaceBetween size="m">
                    <SpaceBetween size="xs">
                        {players.map((name, idx) => (
                            <Box key={idx} variant="p">
                                <Badge color="blue">{idx + 1}</Badge>{" "}
                                {name}
                                {name === hostName && (
                                    <Box variant="span" color="text-body-secondary"> (host)</Box>
                                )}
                            </Box>
                        ))}
                    </SpaceBetween>

                    {!canStart && (
                        <Box variant="p" color="text-body-secondary">
                            Mínimo de {MIN_PLAYERS} jogadores para iniciar. Máximo: {MAX_PLAYERS}.
                        </Box>
                    )}
                </SpaceBetween>
            </Container>

            {isHost && (
                <Container
                    header={<Header variant="h2">Papéis Opcionais</Header>}
                >
                    <SpaceBetween size="m">
                        <Box variant="p" color="text-body-secondary">
                            Papéis padrão: Operativo da Resistência e Espião.
                            Ative papéis especiais para mais complexidade.
                        </Box>
                        <SpaceBetween size="xs">
                            {OPTIONAL_ROLES.map((role) => (
                                <Toggle
                                    key={role.id}
                                    checked={enabledRoles.has(role.id)}
                                    disabled={isRoleDisabled(role.id)}
                                    onChange={() => toggleRole(role.id)}
                                    description={role.description}
                                >
                                    {role.label}
                                </Toggle>
                            ))}
                        </SpaceBetween>
                    </SpaceBetween>
                </Container>
            )}

            {isHost && (
                <Button
                    variant="primary"
                    disabled={!canStart}
                    onClick={() => onStartGame(enabledRoles)}
                >
                    Iniciar Jogo ({players.length} jogadores)
                </Button>
            )}

            {!isHost && (
                <Box variant="p" color="text-body-secondary">
                    Aguardando o host iniciar o jogo...
                </Box>
            )}
        </SpaceBetween>
    );
}
