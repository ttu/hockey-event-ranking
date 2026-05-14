import type { Competition, CompetitionSummary, TeamRoster } from '../types';

/** Available competition IDs (files: data/competitions/{id}.json) */
export const COMPETITION_IDS = [
  'four-nations-2025',
  'olympics-2026',
  'world-championship-2026',
] as const;
export type CompetitionId = (typeof COMPETITION_IDS)[number];

/** Build absolute URL for data files (works in dev and with base path) */
function dataUrl(path: string): string {
  const base = (import.meta.env.BASE_URL || '/').replace(/\/+$/, '') + '/';
  return new URL(`${base}data/${path}`, window.location.origin).href;
}

async function fetchJson<T>(url: string, description: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`${description}: ${res.status}`);
  }
  const contentType = res.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) {
    throw new Error(`${description} returned non-JSON`);
  }
  return res.json() as Promise<T>;
}

/** Fetch JSON; returns null on 404 (used for optional overrides). */
async function fetchJsonOptional<T>(url: string): Promise<T | null> {
  const res = await fetch(url);
  if (res.status === 404) return null;
  if (!res.ok) return null;
  const contentType = res.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) return null;
  return res.json() as Promise<T>;
}

/** Per-team, per-player overrides. Merged at load time; never overwritten by data scripts. */
type OverridesMap = Record<string, Record<string, Record<string, unknown>>>;

const overridesCache = new Map<string, OverridesMap | null>();

async function loadOverrides(
  competitionId: string,
): Promise<OverridesMap | null> {
  const cached = overridesCache.get(competitionId);
  if (cached !== undefined) return cached;
  const data = await fetchJsonOptional<OverridesMap>(
    dataUrl(`competitions/${competitionId}/overrides.json`),
  );
  overridesCache.set(competitionId, data);
  return data;
}

/** Team metrics as stored in JSON (averageScore computed from totalScore/playerCount) */
interface StoredTeamSummary {
  teamId: string;
  totalSalary: number;
  totalScore: number;
  playerCount: number;
}

/**
 * Load competition summary (metadata + precomputed team metrics for rankings).
 * Does not load team rosters. averageScore is computed from totalScore/playerCount.
 */
export async function loadCompetitionSummary(
  competitionId: string,
): Promise<CompetitionSummary> {
  const data = await fetchJson<
    Omit<CompetitionSummary, 'teams' | 'teamIds'> & {
      teams: StoredTeamSummary[];
    }
  >(
    dataUrl(`competitions/${competitionId}.json`),
    `Competition ${competitionId}`,
  );

  const teams = data.teams.map((t) => ({
    teamId: t.teamId,
    totalSalary: t.totalSalary,
    totalScore: t.totalScore,
    playerCount: t.playerCount,
    averageScore: t.playerCount > 0 ? t.totalScore / t.playerCount : 0,
  }));

  return { ...data, teams, teamIds: teams.map((t) => t.teamId) };
}

/**
 * Load a single team's roster (used when user selects a team for details).
 * Merges overrides from competitions/{id}/overrides.json (teamId -> playerId -> props).
 */
export async function loadTeamRoster(
  competitionId: string,
  teamId: string,
): Promise<TeamRoster> {
  const [data, overrides] = await Promise.all([
    fetchJson<TeamRoster & { competitionId?: string }>(
      dataUrl(`competitions/${competitionId}/${teamId}.json`),
      `Roster ${competitionId}/${teamId}`,
    ),
    loadOverrides(competitionId),
  ]);

  const teamOverrides = overrides?.[teamId];
  const players = teamOverrides
    ? data.players.map((p) => {
        const o = teamOverrides[p.playerId];
        return o ? { ...p, ...o } : p;
      })
    : data.players;

  return { teamId: data.teamId, players };
}

/**
 * Load full competition (summary + all team rosters). Use when you need everything.
 */
export async function loadCompetition(
  competitionId: string,
): Promise<Competition> {
  const summary = await loadCompetitionSummary(competitionId);
  const teams = await Promise.all(
    summary.teamIds.map((teamId) => loadTeamRoster(competitionId, teamId)),
  );
  return {
    competitionId: summary.competitionId,
    competitionName: summary.competitionName,
    year: summary.year,
    teams,
  };
}
