import { useState } from "react";
import Container from "@cloudscape-design/components/container";
import Header from "@cloudscape-design/components/header";
import SpaceBetween from "@cloudscape-design/components/space-between";
import Button from "@cloudscape-design/components/button";
import Input from "@cloudscape-design/components/input";
import FormField from "@cloudscape-design/components/form-field";
import Box from "@cloudscape-design/components/box";
import ColumnLayout from "@cloudscape-design/components/column-layout";

interface GameLobbyProps {
    onCreateRoom: (playerName: string) => void;
    onJoinRoom: (code: string, playerName: string) => void;
}

/**
 * Tela de lobby para criar ou entrar em uma sala de jogo.
 *
 * O jogador deve informar seu nome antes de criar ou entrar em uma sala.
 * Exibe dois painéis lado a lado:
 * - "Novo Jogo": gera uma sala com código aleatório
 * - "Entrar no Jogo": permite digitar o código de uma sala existente
 */
export function GameLobby({ onCreateRoom, onJoinRoom }: GameLobbyProps) {
    const [playerName, setPlayerName] = useState("");
    const [nameError, setNameError] = useState("");
    const [joinCode, setJoinCode] = useState("");
    const [joinError, setJoinError] = useState("");

    /** Remove caracteres não permitidos (aceita apenas letras, números e espaço). */
    function sanitizePlayerName(raw: string): string {
        return raw.replace(/[^a-zA-Z0-9À-ÿ\s]/g, "").slice(0, 50);
    }

    /** Valida que o nome foi preenchido e contém apenas caracteres permitidos. */
    function validateName(): string | null {
        const trimmed = playerName.trim();
        if (trimmed.length === 0) {
            setNameError("Informe seu nome para continuar.");
            return null;
        }
        setNameError("");
        return trimmed;
    }

    function handleCreate() {
        const name = validateName();
        if (!name) return;
        onCreateRoom(name);
    }

    function handleJoin() {
        const name = validateName();
        if (!name) return;

        const trimmedCode = joinCode.trim().toUpperCase();
        if (trimmedCode.length !== 5) {
            setJoinError("O código deve ter exatamente 5 caracteres.");
            return;
        }
        setJoinError("");
        onJoinRoom(trimmedCode, name);
    }

    return (
        <SpaceBetween size="l">
            <Container header={<Header variant="h2">Identificação</Header>}>
                <FormField
                    label="Seu nome"
                    errorText={nameError}
                    description="Informe como deseja ser identificado na sala"
                >
                    <Input
                        value={playerName}
                        onChange={({ detail }) => {
                            setPlayerName(sanitizePlayerName(detail.value));
                            setNameError("");
                        }}
                        placeholder="Ex: João"
                        ariaLabel="Nome do jogador"
                    />
                </FormField>
            </Container>

            <ColumnLayout columns={2}>
                <Container header={<Header variant="h2">Novo Jogo</Header>}>
                    <SpaceBetween size="m">
                        <Box variant="p">
                            Crie uma nova sala e compartilhe o código com outros jogadores.
                        </Box>
                        <Button variant="primary" onClick={handleCreate}>
                            New Game
                        </Button>
                    </SpaceBetween>
                </Container>

                <Container header={<Header variant="h2">Entrar no Jogo</Header>}>
                    <SpaceBetween size="m">
                        <FormField
                            label="Código da sala"
                            errorText={joinError}
                            description="Informe o código de 5 caracteres da sala"
                        >
                            <Input
                                value={joinCode}
                                onChange={({ detail }) => {
                                    setJoinCode(detail.value.toUpperCase().slice(0, 5));
                                    setJoinError("");
                                }}
                                placeholder="Ex: A3K9Z"
                                ariaLabel="Código da sala"
                            />
                        </FormField>
                        <Button variant="primary" onClick={handleJoin}>
                            Enter Game
                        </Button>
                    </SpaceBetween>
                </Container>
            </ColumnLayout>
        </SpaceBetween>
    );
}
