#!/usr/bin/env tsx
/**
 * Update salaries (and normalize leagueIds) for a World Championship competition.
 *
 * Annual workflow:
 *  - WC happens every year. Each year is its own competition (world-championship-YYYY).
 *  - NHL players' salaries are sourced from olympics-2026 / four-nations-2025 rosters
 *    (and any other reference competitions passed via REFERENCE_COMPETITIONS), keyed
 *    by playerName.
 *  - Non-NHL players get estimated salaries (midpoint of league range, salaryEstimated=true).
 *  - leagueId is normalized to canonical IDs (NHL, AHL, SHL, LIIGA, DEL, SWISS_NL,
 *    EXTRALIGA, ICEHL, KHL, OTHER) using NHL club lookup + flag/league mapping.
 *
 * Important: NEVER touches data for competitions other than the target. Historical
 * competitions are frozen (see AGENTS.md "Historical data is frozen").
 *
 * Usage:
 *   npx tsx scripts/update-wc-salaries.ts                       # defaults to world-championship-2026
 *   npx tsx scripts/update-wc-salaries.ts world-championship-2027
 */

import * as fs from 'fs';
import * as path from 'path';
import { getEstimatedSalary } from '../src/data/leagues';
import type { RosterPlayer, TeamRoster } from '../src/types';

const COMPETITIONS_DIR = path.join(
  process.cwd(),
  'public',
  'data',
  'competitions',
);

const REFERENCE_COMPETITIONS = ['olympics-2026', 'four-nations-2025'];

const NHL_CLUBS = new Set([
  'Anaheim Ducks',
  'Boston Bruins',
  'Buffalo Sabres',
  'Calgary Flames',
  'Carolina Hurricanes',
  'Chicago Blackhawks',
  'Colorado Avalanche',
  'Columbus Blue Jackets',
  'Dallas Stars',
  'Detroit Red Wings',
  'Edmonton Oilers',
  'Florida Panthers',
  'Los Angeles Kings',
  'Minnesota Wild',
  'Montreal Canadiens',
  'Nashville Predators',
  'New Jersey Devils',
  'New York Islanders',
  'New York Rangers',
  'Ottawa Senators',
  'Philadelphia Flyers',
  'Pittsburgh Penguins',
  'San Jose Sharks',
  'Seattle Kraken',
  'St. Louis Blues',
  'Tampa Bay Lightning',
  'Toronto Maple Leafs',
  'Utah Mammoth',
  'Utah Hockey Club',
  'Vancouver Canucks',
  'Vegas Golden Knights',
  'Washington Capitals',
  'Winnipeg Jets',
]);

/** Map raw (parser-output) leagueId or flag-derived hint to canonical league IDs. */
function canonicalLeagueId(club: string, rawLeagueId: string): string {
  if (NHL_CLUBS.has(club)) return 'NHL';
  const map: Record<string, string> = {
    NHL: 'NHL',
    AHL: 'AHL',
    SHL: 'SHL',
    Liiga: 'LIIGA',
    LIIGA: 'LIIGA',
    DEL: 'DEL',
    NL: 'SWISS_NL',
    SWISS_NL: 'SWISS_NL',
    Czech: 'EXTRALIGA',
    EXTRALIGA: 'EXTRALIGA',
    ICEHL: 'ICEHL',
    KHL: 'KHL',
    Slovak: 'OTHER',
    Metal: 'OTHER',
    Norway: 'OTHER',
    AlpsHL: 'OTHER',
    Erste: 'OTHER',
    EIHL: 'OTHER',
    Latvia: 'OTHER',
    Romania: 'OTHER',
    Belarus: 'OTHER',
    Other: 'OTHER',
    OTHER: 'OTHER',
  };
  return map[rawLeagueId] ?? 'OTHER';
}

/** Normalize names for cross-competition lookup (accent-folded, lowercase). */
function normalizeName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();
}

/** Build a name → {salaryUsd, salaryEstimated} lookup from reference competitions. */
interface SalaryHit {
  salaryUsd: number;
  salaryEstimated: boolean;
  headshotUrl?: string;
}

function buildSalaryLookup(): Map<string, SalaryHit> {
  const lookup = new Map<string, SalaryHit>();
  for (const compId of REFERENCE_COMPETITIONS) {
    const dir = path.join(COMPETITIONS_DIR, compId);
    if (!fs.existsSync(dir)) continue;
    for (const file of fs.readdirSync(dir)) {
      if (!file.endsWith('.json') || file === 'overrides.json') continue;
      const roster: TeamRoster = JSON.parse(
        fs.readFileSync(path.join(dir, file), 'utf-8'),
      );
      for (const p of roster.players) {
        if (p.leagueId !== 'NHL') continue;
        if (p.salaryUsd <= 0) continue;
        const key = normalizeName(p.playerName);
        const existing = lookup.get(key);
        // Prefer non-estimated, then highest salary
        if (
          !existing ||
          (existing.salaryEstimated && !p.salaryEstimated) ||
          (existing.salaryEstimated === p.salaryEstimated &&
            p.salaryUsd > existing.salaryUsd)
        ) {
          lookup.set(key, {
            salaryUsd: p.salaryUsd,
            salaryEstimated: p.salaryEstimated,
            headshotUrl: p.headshotUrl,
          });
        }
      }
    }
  }
  return lookup;
}

function updateRoster(
  roster: TeamRoster,
  lookup: Map<string, SalaryHit>,
): { roster: TeamRoster; stats: { matched: number; estimated: number } } {
  let matched = 0;
  let estimated = 0;
  const players: RosterPlayer[] = roster.players.map((p) => {
    const leagueId = canonicalLeagueId(p.club, p.leagueId);
    if (leagueId === 'NHL') {
      const hit = lookup.get(normalizeName(p.playerName));
      if (hit) {
        matched++;
        return {
          ...p,
          leagueId,
          salaryUsd: hit.salaryUsd,
          salaryEstimated: hit.salaryEstimated,
          ...(hit.headshotUrl ? { headshotUrl: hit.headshotUrl } : {}),
        };
      }
      // NHL player not in reference comps — use NHL midpoint estimate
      estimated++;
      return {
        ...p,
        leagueId,
        salaryUsd: getEstimatedSalary('NHL'),
        salaryEstimated: true,
      };
    }
    estimated++;
    return {
      ...p,
      leagueId,
      salaryUsd: getEstimatedSalary(leagueId),
      salaryEstimated: true,
    };
  });
  return { roster: { ...roster, players }, stats: { matched, estimated } };
}

function main() {
  const compId = process.argv[2] ?? 'world-championship-2026';
  const dir = path.join(COMPETITIONS_DIR, compId);
  if (!fs.existsSync(dir)) {
    console.error(`Competition directory not found: ${dir}`);
    process.exit(1);
  }
  const lookup = buildSalaryLookup();
  console.log(
    `Built salary lookup with ${lookup.size} NHL players from ${REFERENCE_COMPETITIONS.join(', ')}`,
  );

  let totalMatched = 0;
  let totalEstimated = 0;
  for (const file of fs.readdirSync(dir)) {
    if (!file.endsWith('.json') || file === 'overrides.json') continue;
    const filePath = path.join(dir, file);
    const roster: TeamRoster = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    if (roster.players.length === 0) {
      console.log(`  ${file}: empty roster, skipping`);
      continue;
    }
    const { roster: updated, stats } = updateRoster(roster, lookup);
    fs.writeFileSync(filePath, JSON.stringify(updated, null, 2) + '\n');
    totalMatched += stats.matched;
    totalEstimated += stats.estimated;
    console.log(
      `  ${file}: ${stats.matched} NHL matched, ${stats.estimated} estimated`,
    );
  }
  console.log(
    `\nDone: ${totalMatched} NHL salaries applied from reference data, ${totalEstimated} estimated.`,
  );
}

main();
