#!/usr/bin/env npx tsx
/**
 * Update roster data for hockey team comparison.
 *
 * Data layout: data/competitions/{id}.json (summary + team metrics) + data/competitions/{id}/{teamId}.json
 *
 * Usage:
 *   npx tsx scripts/update-data.ts                    # Validate all rosters
 *   npx tsx scripts/update-data.ts --write-sample      # Write sample olympics-2026
 *   npx tsx scripts/update-data.ts --fill-national     # Add nationalLine to all players (uses Daily Faceoff if scripts/data/{id}/national-lines.json exists)
 *   npx tsx scripts/update-data.ts --fill-summary       # Compute and add team metrics to competition summary
 *
 * Scope to a single competition (avoid touching historical data):
 *   npx tsx scripts/update-data.ts --fill-summary --competition world-championship-2026
 */

import * as fs from 'fs';
import * as path from 'path';
import { getTeamMetrics } from '../src/lib/teamMetrics';
import type { TeamRoster } from '../src/types';

const DATA_DIR = path.join(process.cwd(), 'public', 'data');
const COMPETITIONS_DIR = path.join(DATA_DIR, 'competitions');
const SCRIPTS_DATA_DIR = path.join(process.cwd(), 'scripts', 'data');

interface Player {
  playerId: string;
  playerName: string;
  position: string;
  [k: string]: unknown;
}

type NationalPosition = 'L1' | 'L2' | 'L3' | 'L4' | 'D1' | 'D2' | 'G1' | 'G2';

/** Infer national team position from roster order; outputs L1–L4, D1–D2, G1–G2 */
function inferNationalPosition(
  players: Player[],
  index: number,
): NationalPosition {
  const forwards = players.filter(
    (p) => p.position !== 'D' && p.position !== 'G',
  );
  const defensemen = players.filter((p) => p.position === 'D');
  const goalies = players.filter((p) => p.position === 'G');
  const p = players[index];
  if (!p) return 'L1';
  if (p.position === 'G') {
    const gIdx = goalies.findIndex((g) => g.playerId === p.playerId);
    return gIdx === 0 ? 'G1' : 'G2';
  }
  if (p.position === 'D') {
    const dIdx = defensemen.findIndex((d) => d.playerId === p.playerId);
    return dIdx < 4 ? 'D1' : 'D2';
  }
  const fIdx = forwards.findIndex((f) => f.playerId === p.playerId);
  if (fIdx < 3) return 'L1';
  if (fIdx < 6) return 'L2';
  if (fIdx < 9) return 'L3';
  return 'L4';
}

/** Load Daily Faceoff national lines for a competition if present. */
function loadNationalLines(
  compId: string,
): Record<string, Record<string, NationalPosition>> | null {
  const p = path.join(SCRIPTS_DATA_DIR, compId, 'national-lines.json');
  if (!fs.existsSync(p)) return null;
  try {
    return JSON.parse(fs.readFileSync(p, 'utf-8'));
  } catch {
    return null;
  }
}

const SAMPLE_SUMMARY = {
  competitionId: 'olympics-2026',
  competitionName: 'Winter Olympics 2026',
  year: 2026,
  teams: [
    { teamId: 'CAN', totalSalary: 25400000, totalScore: 200, playerCount: 2 },
    { teamId: 'USA', totalSalary: 11640000, totalScore: 100, playerCount: 1 },
  ],
};

const SAMPLE_TEAMS: Record<string, { teamId: string; players: Player[] }> = {
  CAN: {
    teamId: 'CAN',
    players: [
      {
        playerId: 'mcdavid',
        playerName: 'Connor McDavid',
        position: 'C',
        leagueId: 'NHL',
        club: 'Edmonton Oilers',
        salaryUsd: 12_500_000,
        salaryEstimated: false,
        line: '1L',
        role: 'top6',
      },
      {
        playerId: 'mackinnon',
        playerName: 'Nathan MacKinnon',
        position: 'C',
        leagueId: 'NHL',
        club: 'Colorado Avalanche',
        salaryUsd: 12_750_000,
        salaryEstimated: false,
        line: '1L',
        role: 'top6',
      },
    ],
  },
  USA: {
    teamId: 'USA',
    players: [
      {
        playerId: 'matthews',
        playerName: 'Auston Matthews',
        position: 'C',
        leagueId: 'NHL',
        club: 'Toronto Maple Leafs',
        salaryUsd: 11_640_000,
        salaryEstimated: false,
        line: '1L',
        role: 'top6',
      },
    ],
  },
};

function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(COMPETITIONS_DIR)) {
    fs.mkdirSync(COMPETITIONS_DIR, { recursive: true });
  }
}

function getTeamIdsFromRosterDir(compId: string): string[] {
  const compDir = path.join(COMPETITIONS_DIR, compId);
  if (!fs.existsSync(compDir) || !fs.statSync(compDir).isDirectory()) return [];
  return fs
    .readdirSync(compDir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => path.basename(f, '.json'));
}

function validateCompetition(compId: string): boolean {
  const summaryPath = path.join(COMPETITIONS_DIR, `${compId}.json`);
  if (!fs.existsSync(summaryPath)) {
    console.error(`Missing: ${summaryPath}`);
    return false;
  }
  const raw = fs.readFileSync(summaryPath, 'utf-8');
  const summary = JSON.parse(raw) as { teams?: Array<{ teamId: string }> };
  const teamIds = Array.isArray(summary.teams)
    ? summary.teams.map((t) => t.teamId)
    : getTeamIdsFromRosterDir(compId);
  if (teamIds.length === 0) {
    console.error(`Invalid summary ${compId}: no teams (run --fill-summary)`);
    return false;
  }
  let ok = true;
  const compDir = path.join(COMPETITIONS_DIR, compId);
  for (const teamId of teamIds) {
    const teamPath = path.join(compDir, `${teamId}.json`);
    if (!fs.existsSync(teamPath)) {
      console.error(`Missing: ${teamPath}`);
      ok = false;
      continue;
    }
    const teamRaw = fs.readFileSync(teamPath, 'utf-8');
    const team = JSON.parse(teamRaw) as { players?: unknown[] };
    if (!Array.isArray(team.players)) {
      console.error(`Invalid team ${compId}/${teamId}: missing players`);
      ok = false;
    }
  }
  return ok;
}

function fillNationalLineTeam(
  filePath: string,
  players: Player[],
  teamId: string,
  dfoLines: Record<string, NationalPosition> | null,
): number {
  let updated = 0;
  for (let i = 0; i < players.length; i++) {
    const p = players[i];
    const name = p.playerName as string;
    const fromDfo = dfoLines?.[name];
    // When using DFO data, roster-only players (e.g. injured) get end-of-group so they don't overwrite real lines
    const nationalPos: NationalPosition =
      fromDfo ??
      (dfoLines
        ? p.position === 'G'
          ? 'G2'
          : p.position === 'D'
            ? 'D2'
            : 'L4'
        : inferNationalPosition(players, i));
    if (p.nationalLine !== nationalPos) {
      p.nationalLine = nationalPos;
      updated++;
    }
  }
  // Always order by playerId so roster JSON diffs show real changes (see AGENTS.md)
  players.sort((a, b) => String(a.playerId).localeCompare(String(b.playerId)));
  const shouldWrite = updated > 0 || dfoLines !== null;
  if (shouldWrite) {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as Record<
      string,
      unknown
    >;
    data.players = players;
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  }
  return updated;
}

function fillSummary(compId: string): void {
  const summaryPath = path.join(COMPETITIONS_DIR, `${compId}.json`);
  const summary = JSON.parse(fs.readFileSync(summaryPath, 'utf-8')) as {
    competitionId: string;
    competitionName: string;
    year: number;
    teams?: Array<{ teamId: string }>;
  };
  const compDir = path.join(COMPETITIONS_DIR, compId);
  const teamIds = Array.isArray(summary.teams)
    ? summary.teams.map((t) => t.teamId)
    : getTeamIdsFromRosterDir(compId);
  summary.teams = teamIds.map((teamId) => {
    const teamPath = path.join(compDir, `${teamId}.json`);
    const data = JSON.parse(fs.readFileSync(teamPath, 'utf-8')) as TeamRoster;
    const m = getTeamMetrics(data);
    return {
      teamId: m.teamId,
      totalSalary: m.totalSalary,
      totalScore: m.totalScore,
      playerCount: m.playerCount,
    };
  });
  fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
  console.log(`Updated ${compId} summary: ${summary.teams.length} teams`);
}

function fillNationalLine(compId: string): number {
  const summaryPath = path.join(COMPETITIONS_DIR, `${compId}.json`);
  const summary = JSON.parse(fs.readFileSync(summaryPath, 'utf-8')) as {
    teams?: Array<{ teamId: string }>;
  };
  const compDir = path.join(COMPETITIONS_DIR, compId);
  const teamIds = Array.isArray(summary.teams)
    ? summary.teams.map((t) => t.teamId)
    : getTeamIdsFromRosterDir(compId);
  const dfoByTeam = loadNationalLines(compId);
  let total = 0;
  for (const teamId of teamIds) {
    const teamPath = path.join(compDir, `${teamId}.json`);
    const data = JSON.parse(fs.readFileSync(teamPath, 'utf-8')) as {
      players: Player[];
    };
    const dfoLines = dfoByTeam?.[teamId] ?? null;
    total += fillNationalLineTeam(teamPath, data.players, teamId, dfoLines);
  }
  return total;
}

function main(): void {
  const writeSample = process.argv.includes('--write-sample');
  const fillNational = process.argv.includes('--fill-national');
  const fillSummaryFlag = process.argv.includes('--fill-summary');
  const compIdx = process.argv.indexOf('--competition');
  const onlyCompetition: string | null =
    compIdx >= 0 && process.argv[compIdx + 1]
      ? process.argv[compIdx + 1]
      : null;
  ensureDataDir();

  if (writeSample) {
    const compId = 'olympics-2026';
    const compDir = path.join(COMPETITIONS_DIR, compId);
    fs.mkdirSync(compDir, { recursive: true });
    fs.writeFileSync(
      path.join(COMPETITIONS_DIR, `${compId}.json`),
      JSON.stringify(SAMPLE_SUMMARY, null, 2),
    );
    for (const [teamId, team] of Object.entries(SAMPLE_TEAMS)) {
      fs.writeFileSync(
        path.join(compDir, `${teamId}.json`),
        JSON.stringify({ ...team, competitionId: compId }, null, 2),
      );
    }
    console.log(
      `Wrote competitions/${compId}.json + ${Object.keys(SAMPLE_TEAMS).length} team files`,
    );
  }

  if (!fs.existsSync(COMPETITIONS_DIR)) {
    console.error('No competitions directory. Run with --write-sample first.');
    process.exitCode = 1;
    return;
  }

  const summaries = fs
    .readdirSync(COMPETITIONS_DIR)
    .filter((f) => f.endsWith('.json') && !f.startsWith('.'));
  for (const f of summaries) {
    const compId = f.replace(/\.json$/, '');
    if (onlyCompetition && compId !== onlyCompetition) continue;
    if (fillSummaryFlag) {
      fillSummary(compId);
    } else if (fillNational) {
      const n = fillNationalLine(compId);
      if (n > 0) console.log(`Updated ${compId}: ${n} players`);
    } else if (!validateCompetition(compId)) {
      process.exitCode = 1;
    } else {
      console.log(`Valid: ${compId}`);
    }
  }
}

main();
