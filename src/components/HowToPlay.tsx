import Modal from "@cloudscape-design/components/modal";
import Box from "@cloudscape-design/components/box";
import SpaceBetween from "@cloudscape-design/components/space-between";
import Table from "@cloudscape-design/components/table";
import ExpandableSection from "@cloudscape-design/components/expandable-section";
import Header from "@cloudscape-design/components/header";

/** Tamanhos de equipe por missão e número de jogadores. */
const TEAM_SIZE_ROWS = [
    { players: "5", m1: "2", m2: "3", m3: "2", m4: "3", m5: "3" },
    { players: "6", m1: "2", m2: "3", m3: "4", m4: "3", m5: "4" },
    { players: "7", m1: "2", m2: "3", m3: "3", m4: "4*", m5: "4" },
    { players: "8", m1: "3", m2: "4", m3: "4", m4: "5*", m5: "5" },
    { players: "9", m1: "3", m2: "4", m3: "4", m4: "5*", m5: "5" },
    { players: "10", m1: "3", m2: "4", m3: "4", m4: "5*", m5: "5" },
];

/** Distribuição de Resistência/Espiões por número de jogadores. */
const DISTRIBUTION_ROWS = [
    { players: "5", resistance: "3", spies: "2" },
    { players: "6", resistance: "4", spies: "2" },
    { players: "7", resistance: "4", spies: "3" },
    { players: "8", resistance: "5", spies: "3" },
    { players: "9", resistance: "6", spies: "3" },
    { players: "10", resistance: "6", spies: "4" },
];

interface HowToPlayModalProps {
    visible: boolean;
    onDismiss: () => void;
}

/**
 * Modal com as regras do The Resistance em pt-BR.
 *
 * Uso: <HowToPlayModal visible={true} onDismiss={() => {}} />
 */
export function HowToPlayModal({ visible, onDismiss }: HowToPlayModalProps) {
    return (
        <Modal
            visible={visible}
            onDismiss={onDismiss}
            size="large"
            header="Como Jogar — The Resistance"
            closeAriaLabel="Fechar"
        >
            <SpaceBetween size="l">
                <ObjectiveSection />
                <GameplayFlowSection />
                <TeamSizeSection />
                <DistributionSection />
                <RolesSection />
                <TipsSection />
            </SpaceBetween>
        </Modal>
    );
}

function ObjectiveSection() {
    return (
        <ExpandableSection defaultExpanded headerText="Objetivo">
            <SpaceBetween size="s">
                <Box>
                    The Resistance é um jogo de dedução social com papéis ocultos.
                    Os jogadores são divididos em dois times:
                </Box>
                <Box>
                    <strong>Resistência (bem):</strong> Deve completar com sucesso 3 das 5 missões.
                </Box>
                <Box>
                    <strong>Espiões (mal):</strong> Devem sabotar 3 missões infiltrando equipes e votando falha.
                </Box>
                <Box>
                    Se a Resistência vencer 3 missões e os papéis Comandante + Assassino estiverem
                    habilitados, os Espiões têm uma última chance: o Assassino pode tentar identificar
                    o Comandante. Se acertar, os Espiões vencem. Sem esses papéis, 3 missões
                    bem-sucedidas é vitória direta da Resistência.
                </Box>
            </SpaceBetween>
        </ExpandableSection>
    );
}

function GameplayFlowSection() {
    return (
        <ExpandableSection defaultExpanded headerText="Fluxo do Jogo">
            <SpaceBetween size="s">
                <Box>
                    <strong>1. Proposta de Equipe:</strong> O Líder da Missão propõe uma equipe.
                    O tamanho depende do número da missão e da quantidade de jogadores.
                </Box>
                <Box>
                    <strong>2. Votação da Equipe:</strong> Todos votam aprovar ou rejeitar.
                    Maioria simples aprova. Se rejeitada, a liderança passa ao próximo jogador.
                    Após 4 rejeições consecutivas, a 5ª proposta é aceita automaticamente.
                </Box>
                <Box>
                    <strong>3. Fase da Missão:</strong> Os membros da equipe aprovada votam
                    secretamente Sucesso ou Falha. Todos os votos devem ser Sucesso para a missão
                    passar. Um ou mais votos de Falha causam o fracasso da missão (algumas missões
                    exigem 2 votos de Falha — veja a tabela). Membros da Resistência devem sempre
                    votar Sucesso. Espiões podem escolher.
                </Box>
                <Box>
                    <strong>4. Progressão:</strong> Após o resultado, a liderança passa ao próximo
                    jogador e uma nova rodada começa.
                </Box>
                <Box>
                    <strong>5. Conclusão:</strong> O jogo termina quando um dos lados alcança 3
                    vitórias em missões. Se a Resistência vencer 3 e o Comandante + Assassino
                    estiverem habilitados, a fase do Assassino é ativada como última chance dos
                    Espiões.
                </Box>
            </SpaceBetween>
        </ExpandableSection>
    );
}

function TeamSizeSection() {
    return (
        <ExpandableSection headerText="Tamanho das Equipes por Missão">
            <SpaceBetween size="s">
                <Table
                    variant="embedded"
                    columnDefinitions={[
                        { id: "players", header: "Jogadores", cell: (r) => r.players },
                        { id: "m1", header: "Missão 1", cell: (r) => r.m1 },
                        { id: "m2", header: "Missão 2", cell: (r) => r.m2 },
                        { id: "m3", header: "Missão 3", cell: (r) => r.m3 },
                        { id: "m4", header: "Missão 4", cell: (r) => r.m4 },
                        { id: "m5", header: "Missão 5", cell: (r) => r.m5 },
                    ]}
                    items={TEAM_SIZE_ROWS}
                    header={<Header variant="h3">Tamanho das Equipes</Header>}
                />
                <Box color="text-body-secondary" fontSize="body-s">
                    * Missões marcadas com asterisco exigem <strong>2 votos de Falha</strong> para fracassar.
                </Box>
            </SpaceBetween>
        </ExpandableSection>
    );
}

function DistributionSection() {
    return (
        <ExpandableSection headerText="Distribuição Resistência / Espiões">
            <Table
                variant="embedded"
                columnDefinitions={[
                    { id: "players", header: "Jogadores", cell: (r) => r.players },
                    { id: "resistance", header: "Resistência", cell: (r) => r.resistance },
                    { id: "spies", header: "Espiões", cell: (r) => r.spies },
                ]}
                items={DISTRIBUTION_ROWS}
                header={<Header variant="h3">Distribuição de Times</Header>}
            />
        </ExpandableSection>
    );
}

function RolesSection() {
    return (
        <ExpandableSection headerText="Papéis">
            <SpaceBetween size="m">
                <Box variant="h4">Papéis Padrão (sempre ativos)</Box>
                <SpaceBetween size="xs">
                    <Box>
                        <strong>Operativo da Resistência</strong> (Resistência) — Sem informação especial.
                    </Box>
                    <Box>
                        <strong>Espião</strong> (Espiões) — Conhece os outros Espiões.
                    </Box>
                </SpaceBetween>

                <Box variant="h4">Papéis Opcionais (o anfitrião ativa antes de iniciar)</Box>
                <SpaceBetween size="xs">
                    <Box>
                        <strong>Comandante</strong> (Resistência) — Conhece todos os Espiões, mas
                        deve permanecer oculto para evitar ser assassinado.
                    </Box>
                    <Box>
                        <strong>Assassino</strong> (Espiões) — Após 3 vitórias da Resistência, pode
                        tentar identificar o Comandante para roubar a vitória.
                    </Box>
                    <Box>
                        <strong>Guarda-Costas</strong> (Resistência) — Vê o Comandante e o Falso
                        Comandante, mas não sabe qual é qual.
                    </Box>
                    <Box>
                        <strong>Falso Comandante</strong> (Espiões) — Aparece como Comandante para
                        o Guarda-Costas. Sempre habilitado/desabilitado junto com o Guarda-Costas.
                    </Box>
                </SpaceBetween>

                <Box color="text-body-secondary" fontSize="body-s">
                    <strong>Impacto na vitória:</strong> Se Comandante e Assassino estiverem
                    habilitados, a fase do Assassino é ativada após 3 vitórias da Resistência.
                    Caso contrário, a Resistência vence diretamente.
                </Box>
            </SpaceBetween>
        </ExpandableSection>
    );
}

function TipsSection() {
    return (
        <ExpandableSection headerText="Dicas para Novos Jogadores">
            <SpaceBetween size="s">
                <Box>
                    Comece apenas com os papéis padrão (Operativos e Espiões) para aprender a
                    mecânica básica.
                </Box>
                <Box>
                    Depois, adicione <strong>Comandante + Assassino</strong> para mais profundidade
                    estratégica.
                </Box>
                <Box>
                    Por último, inclua <strong>Guarda-Costas + Falso Comandante</strong> para a
                    experiência completa.
                </Box>
                <Box>
                    O tamanho ideal do grupo é de <strong>7 a 10 jogadores</strong>.
                </Box>
            </SpaceBetween>
        </ExpandableSection>
    );
}
