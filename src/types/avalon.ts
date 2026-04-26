/** Lealdade de um jogador: Resistência (bem) ou Espiões (mal). */
export type Loyalty = "good" | "evil";

/** Papéis disponíveis no The Resistance. */
export type AvalonRole =
    | "loyal_servant"   // Operativo da Resistência (genérico, bom)
    | "merlin"          // Comandante — conhece os espiões, mas deve se esconder
    | "percival"        // Guarda-Costas — vê Comandante e Falso Comandante
    | "minion"          // Espião (genérico, mal)
    | "morgana"         // Falso Comandante — aparece como Comandante para o Guarda-Costas
    | "assassin";       // Assassino — pode assassinar o Comandante no final

/** Mapeia cada papel à sua lealdade. */
export const ROLE_LOYALTY: Record<AvalonRole, Loyalty> = {
    loyal_servant: "good",
    merlin: "good",
    percival: "good",
    minion: "evil",
    morgana: "evil",
    assassin: "evil",
};

/** Nomes legíveis dos papéis em pt-BR. */
export const ROLE_LABELS: Record<AvalonRole, string> = {
    loyal_servant: "Operativo da Resistência",
    merlin: "Comandante",
    percival: "Guarda-Costas",
    minion: "Espião",
    morgana: "Falso Comandante",
    assassin: "Assassino",
};

/** Fases do jogo The Resistance. */
export type GamePhase =
    | "waiting"          // Aguardando jogadores na sala
    | "role_reveal"      // Revelação de papéis
    | "team_proposal"    // Líder propõe equipe para a missão
    | "team_vote"        // Todos votam na equipe proposta
    | "mission_vote"     // Membros da equipe votam sucesso/falha
    | "mission_result"   // Resultado da missão revelado
    | "assassin_phase"   // Espiões tentam identificar o Comandante
    | "game_over";       // Fim do jogo

/** Resultado de uma missão. */
export type MissionResult = "success" | "fail" | "pending";

/** Voto de aprovação de equipe. */
export type TeamVoteChoice = "approve" | "reject";

/** Voto de missão (apenas membros da equipe). */
export type MissionVoteChoice = "success" | "fail";

/** Informações de um jogador no jogo. */
export interface AvalonPlayer {
    name: string;
    role?: AvalonRole;
    loyalty?: Loyalty;
}

/** Resultado de uma votação de equipe. */
export interface TeamVoteResult {
    votes: Record<string, TeamVoteChoice>;
    approved: boolean;
}

/** Resultado de uma missão. */
export interface MissionOutcome {
    missionIndex: number;
    teamMembers: string[];
    successCount: number;
    failCount: number;
    result: MissionResult;
}

/** Estado completo do jogo The Resistance. */
export interface AvalonGameState {
    phase: GamePhase;
    players: AvalonPlayer[];
    /** Índice do líder atual na lista de jogadores. */
    leaderIndex: number;
    /** Índice da missão atual (0-4). */
    currentMission: number;
    /** Quantas propostas foram rejeitadas consecutivamente (max 4 antes de forçar). */
    rejectedProposals: number;
    /** Jogadores propostos para a equipe atual. */
    proposedTeam: string[];
    /** Votos da equipe atual. */
    teamVotes: Record<string, TeamVoteChoice>;
    /** Votos da missão atual. */
    missionVotes: Record<string, MissionVoteChoice>;
    /** Resultados das 5 missões. */
    missionResults: MissionResult[];
    /** Histórico detalhado de cada missão completada. */
    missionHistory: MissionOutcome[];
    /** Jogador escolhido pelo assassino como Comandante. */
    assassinTarget: string | null;
    /** Vencedor final do jogo. */
    winner: Loyalty | null;
}

/**
 * Eventos do jogo transmitidos pelo canal AppSync Events.
 * Cada tipo de evento carrega os dados necessários para a transição de estado.
 */
export type AvalonGameEvent =
    | { type: "game_started"; state: AvalonGameState }
    | { type: "role_assigned"; playerName: string; role: AvalonRole; loyalty: Loyalty; visiblePlayers: VisiblePlayerInfo[] }
    | { type: "role_reveal_complete" }
    | { type: "role_revealed"; playerName: string }
    | { type: "team_proposed"; leader: string; team: string[]; missionIndex: number }
    | { type: "team_vote_cast"; playerName: string; vote: TeamVoteChoice }
    | { type: "team_vote_result"; votes: Record<string, TeamVoteChoice>; approved: boolean; rejectedCount: number; newLeader: string; newMission: number }
    | { type: "mission_vote_cast"; playerName: string; vote: MissionVoteChoice }
    | { type: "mission_result"; outcome: MissionOutcome; newLeader: string; newMission: number }
    | { type: "continue_after_mission"; newLeader: string; newMission: number }
    | { type: "assassin_phase_started" }
    | { type: "assassin_choice"; target: string }
    | { type: "game_over"; winner: Loyalty; reason: string }
    | { type: "state_sync"; targetPlayer: string; state: AvalonGameState; role: AvalonRole; loyalty: Loyalty; visiblePlayers: VisiblePlayerInfo[] }
    | { type: "state_persist"; state: AvalonGameState };

/** Informação visível sobre outro jogador (baseada no papel do observador). */
export interface VisiblePlayerInfo {
    name: string;
    /** O que este jogador aparenta ser para o observador. */
    appearsAs: "evil" | "merlin_or_morgana" | "unknown";
}
