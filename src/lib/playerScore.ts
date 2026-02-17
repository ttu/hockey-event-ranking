import { getLeague, getLeagueTierWeight } from '../data/leagues';
import type { Line, Role, RosterPlayer } from '../types';

/** Line weight 0–1: 1L=1.0, 2L=0.85, 3L=0.65, 4L=0.4; top4D=0.9, bottomD=0.5; starterG=1.0, backupG=0.5 */
const LINE_WEIGHTS: Record<Line, number> = {
  '1L': 1.0,
  '2L': 0.85,
  '3L': 0.65,
  '4L': 0.4,
  top4D: 0.9,
  bottomD: 0.5,
  starterG: 1.0,
  backupG: 0.5,
};

/** Role weight 0–1: top6=1.0, bottom6=0.6; top4=1.0, bottom2=0.5; starter=1.0, backup=0.5 */
const ROLE_WEIGHTS: Record<Role, number> = {
  top6: 1.0,
  bottom6: 0.6,
  top4: 1.0,
  bottom2: 0.5,
  starter: 1.0,
  backup: 0.5,
};

const LEAGUE_WEIGHT = 0.32;
const LINE_WEIGHT = 0.28;
const ROLE_WEIGHT = 0.2;
const SALARY_WEIGHT = 0.2;

/** NHL salary range for weight: extend max to capture elite contracts (e.g. Matthews ~$13.3M) */
const NHL_SALARY_MIN = 750_000;
const NHL_SALARY_MAX = 14_000_000;

/** NHL minimum raw (4L bottom6, league-min salary) */
const NHL_MIN_RAW =
  1 * LEAGUE_WEIGHT + 0.4 * LINE_WEIGHT + 0.6 * ROLE_WEIGHT + 0 * SALARY_WEIGHT;
/** NHL max raw = 1.0. Scale [NHL_MIN_RAW, 1] → [69, 100] so worst NHL ≥ 69 */
const NHL_MIN_SCORE = 69;
const NHL_SCORE_SPAN = 100 - NHL_MIN_SCORE;
/** Max possible raw for non-NHL (KHL 1L top6, max salary in league) */
const NON_NHL_MAX_RAW =
  0.7 * LEAGUE_WEIGHT + 1 * LINE_WEIGHT + 1 * ROLE_WEIGHT + 1 * SALARY_WEIGHT;

/**
 * Map player salary to 0–1 within their league's range.
 * NHL uses fixed range ($750K–$14M) to handle elite contracts.
 */
function getSalaryWeight(player: RosterPlayer): number {
  if (player.leagueId === 'NHL') {
    const t =
      (player.salaryUsd - NHL_SALARY_MIN) / (NHL_SALARY_MAX - NHL_SALARY_MIN);
    return Math.max(0, Math.min(1, t));
  }
  const league = getLeague(player.leagueId);
  if (!league) return 0.5;
  const { estimatedSalaryMin, estimatedSalaryMax } = league;
  const span = estimatedSalaryMax - estimatedSalaryMin;
  if (span <= 0) return 0.5;
  const t = (player.salaryUsd - estimatedSalaryMin) / span;
  return Math.max(0, Math.min(1, t));
}

/**
 * Compute per-player score (0–100) from league tier, line, role, and salary.
 * NHL players: 69–100. Non-NHL players: 0–68 (always lower than any NHL player).
 * Formula: league×0.32 + line×0.28 + role×0.20 + salary×0.20, scaled to 0–100.
 */
export function getPlayerScore(player: RosterPlayer): number {
  const leagueTier = getLeagueTierWeight(player.leagueId);
  const lineW = LINE_WEIGHTS[player.line] ?? 0.5;
  const roleW = ROLE_WEIGHTS[player.role] ?? 0.5;
  const salaryW = getSalaryWeight(player);
  const raw =
    leagueTier * LEAGUE_WEIGHT +
    lineW * LINE_WEIGHT +
    roleW * ROLE_WEIGHT +
    salaryW * SALARY_WEIGHT;

  if (player.leagueId === 'NHL') {
    const scaled =
      NHL_MIN_SCORE +
      ((raw - NHL_MIN_RAW) / (1 - NHL_MIN_RAW)) * NHL_SCORE_SPAN;
    return Math.round(Math.max(NHL_MIN_SCORE, Math.min(100, scaled)));
  }
  return Math.round((raw / NON_NHL_MAX_RAW) * (NHL_MIN_SCORE - 1));
}
