/**
 * League metadata for tier weights and salary estimates.
 * Tier weight 0–1 used in player score (NHL=1.0).
 * Estimated salary range (USD) used when salaryEstimated and no override.
 */

export interface League {
  id: string;
  name: string;
  /** 0–1; NHL=1.0, KHL≈0.7, European top leagues 0.4–0.6 */
  tierWeight: number;
  /** Estimated yearly salary range in USD when no actual data */
  estimatedSalaryMin: number;
  estimatedSalaryMax: number;
}

export const LEAGUES: League[] = [
  {
    id: 'NHL',
    name: 'NHL',
    tierWeight: 1.0,
    estimatedSalaryMin: 750_000,
    estimatedSalaryMax: 12_500_000,
  },
  {
    id: 'KHL',
    name: 'KHL',
    tierWeight: 0.7,
    estimatedSalaryMin: 100_000,
    estimatedSalaryMax: 2_500_000,
  },
  {
    id: 'SHL',
    name: 'SHL',
    tierWeight: 0.55,
    estimatedSalaryMin: 80_000,
    estimatedSalaryMax: 350_000,
  },
  {
    id: 'LIIGA',
    name: 'Liiga',
    tierWeight: 0.52,
    estimatedSalaryMin: 75_000,
    estimatedSalaryMax: 350_000,
  },
  {
    id: 'DEL',
    name: 'DEL',
    tierWeight: 0.5,
    estimatedSalaryMin: 90_000,
    estimatedSalaryMax: 400_000,
  },
  {
    id: 'SWISS_NL',
    name: 'Swiss NL',
    tierWeight: 0.58,
    estimatedSalaryMin: 200_000,
    estimatedSalaryMax: 400_000,
  },
  {
    id: 'EXTRALIGA',
    name: 'Czech Extraliga',
    tierWeight: 0.48,
    estimatedSalaryMin: 50_000,
    estimatedSalaryMax: 300_000,
  },
  {
    id: 'ICEHL',
    name: 'ICEHL',
    tierWeight: 0.4,
    estimatedSalaryMin: 40_000,
    estimatedSalaryMax: 180_000,
  },
  {
    id: 'AHL',
    name: 'AHL',
    tierWeight: 0.45,
    estimatedSalaryMin: 50_000,
    estimatedSalaryMax: 500_000,
  },
  {
    id: 'OTHER',
    name: 'Other',
    tierWeight: 0.3,
    estimatedSalaryMin: 20_000,
    estimatedSalaryMax: 150_000,
  },
];

const leaguesById = new Map(LEAGUES.map((l) => [l.id, l]));

export function getLeague(leagueId: string): League | undefined {
  return leaguesById.get(leagueId);
}

export function getLeagueTierWeight(leagueId: string): number {
  return getLeague(leagueId)?.tierWeight ?? 0.3;
}

/**
 * Midpoint of estimated salary range (used when salaryEstimated and no salaryUsd).
 */
export function getEstimatedSalary(leagueId: string): number {
  const league = getLeague(leagueId);
  if (!league) return 100_000;
  return (league.estimatedSalaryMin + league.estimatedSalaryMax) / 2;
}

/** ISO 3166-1 alpha-2 country codes for leagues (primary country where league is based) */
const LEAGUE_TO_COUNTRY: Record<string, string> = {
  KHL: 'ru',
  SHL: 'se',
  LIIGA: 'fi',
  DEL: 'de',
  SWISS_NL: 'ch',
  EXTRALIGA: 'cz',
  ICEHL: 'at',
  AHL: 'us',
};

/**
 * Returns the flag CDN URL for the league's country, or null if unknown/multi-country.
 * Used to show where the club team is based.
 */
export function getLeagueCountryFlagUrl(
  leagueId: string,
  size: 40 | 80 = 40,
): string | null {
  const alpha2 = LEAGUE_TO_COUNTRY[leagueId];
  if (!alpha2) return null;
  return `https://flagcdn.com/w${size}/${alpha2}.png`;
}
