/** Forward/defense/goaltender positions */
export type Position = 'C' | 'LW' | 'RW' | 'D' | 'G';

/** Line assignment for forwards, defense pairs, or goalie role */
export type Line =
  | '1L'
  | '2L'
  | '3L'
  | '4L'
  | 'top4D'
  | 'bottomD'
  | 'starterG'
  | 'backupG';

/** National team position (L1–L4, D1–D2, G1–G2) - stored in JSON */
export type NationalPosition =
  | 'L1'
  | 'L2'
  | 'L3'
  | 'L4'
  | 'D1'
  | 'D2'
  | 'G1'
  | 'G2';

/** Roster role (top-6 forward, top-4 D, etc.) */
export type Role =
  | 'top6'
  | 'bottom6'
  | 'top4'
  | 'bottom2'
  | 'starter'
  | 'backup';

export interface RosterPlayer {
  playerId: string;
  playerName: string;
  position: Position;
  leagueId: string;
  club: string;
  /** Yearly salary in USD */
  salaryUsd: number;
  /** True when salary is estimated from league average (not actual) */
  salaryEstimated: boolean;
  line: Line;
  role: Role;
  /** NHL headshot URL from assets.nhle.com (optional) */
  headshotUrl?: string;
  /** Position on national team (L1–L4, D1–D2, G1–G2); inferred from roster order if absent */
  nationalLine?: NationalPosition;
}

export interface TeamRoster {
  teamId: string;
  players: RosterPlayer[];
}

export interface NationalTeam {
  id: string;
  name: string;
  abbreviation: string;
}

/** Precomputed team metrics for rankings (in competition summary) */
export interface TeamSummary {
  teamId: string;
  totalSalary: number;
  totalScore: number;
  averageScore: number;
  playerCount: number;
}

/** Competition summary (stored in competitions/{id}.json) - metadata + team metrics */
export interface CompetitionSummary {
  competitionId: string;
  competitionName: string;
  year: number;
  teamIds: string[];
  /** Precomputed metrics per team for rankings (total value, score, player count) */
  teams: TeamSummary[];
}

/** Fully loaded competition with team rosters */
export interface Competition {
  competitionId: string;
  competitionName: string;
  year: number;
  teams: TeamRoster[];
}
