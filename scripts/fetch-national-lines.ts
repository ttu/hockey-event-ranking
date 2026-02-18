#!/usr/bin/env npx tsx
/**
 * Fetch national team line combinations from Daily Faceoff.
 * Source: https://www.dailyfaceoff.com/teams/team-{slug}/line-combinations
 *
 * Usage: npx tsx scripts/fetch-national-lines.ts [--competition=<id>]
 *
 * Writes scripts/data/{competitionId}/national-lines.json: { teamId: { playerName: nationalLine } }
 * Then run: npx tsx scripts/update-data.ts --fill-national
 *
 * Default: --competition=olympics-2026
 */

import * as fs from 'fs';
import * as path from 'path';

const DATA_DIR = path.join(process.cwd(), 'scripts', 'data');

function getCompetitionId(): string {
  const arg = process.argv.find((a) => a.startsWith('--competition='));
  return arg ? (arg.split('=')[1] ?? 'olympics-2026') : 'olympics-2026';
}

function getOutputPath(competitionId: string): string {
  return path.join(DATA_DIR, competitionId, 'national-lines.json');
}

type NationalPosition = 'L1' | 'L2' | 'L3' | 'L4' | 'D1' | 'D2' | 'G1' | 'G2';

/** teamId -> Daily Faceoff URL slug (from their team selector) */
const TEAM_TO_DFO_SLUG: Record<string, string> = {
  CAN: 'team-canada',
  USA: 'team-united-states',
  SWE: 'team-sweden',
  FIN: 'team-finland',
  CZE: 'team-czechia',
  SUI: 'team-switzerland',
  GER: 'team-germany',
  SVK: 'team-slovakia',
  LAT: 'team-latvia',
  DEN: 'team-denmark',
  FRA: 'team-france',
  ITA: 'team-italy',
};

interface DfoPlayer {
  name: string;
  positionIdentifier?: string;
  groupIdentifier?: string;
}

function groupToNationalPosition(
  group: string | undefined,
  goalieIndex: { current: number },
): NationalPosition | null {
  if (
    !group ||
    group === 'ir' ||
    group.startsWith('pp') ||
    group.startsWith('pk')
  )
    return null;
  switch (group) {
    case 'f1':
      return 'L1';
    case 'f2':
      return 'L2';
    case 'f3':
      return 'L3';
    case 'f4':
      return 'L4';
    case 'd1':
    case 'd2':
      return 'D1';
    case 'd3':
    case 'd4':
      return 'D2';
    case 'g': {
      const idx = goalieIndex.current++;
      return idx === 0 ? 'G1' : 'G2';
    }
    default:
      return null;
  }
}

async function fetchNationalLines(
  teamId: string,
): Promise<Record<string, NationalPosition>> {
  const slug = TEAM_TO_DFO_SLUG[teamId];
  if (!slug) return {};

  const url = `https://www.dailyfaceoff.com/teams/${slug}/line-combinations`;
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; hockey-event-ranking/1.0)',
    },
  });
  if (!res.ok) {
    console.warn(`  ${teamId}: HTTP ${res.status}`);
    return {};
  }

  const html = await res.text();
  const m = html.match(
    /<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/,
  );
  if (!m) {
    console.warn(`  ${teamId}: no __NEXT_DATA__ found`);
    return {};
  }

  const data = JSON.parse(m[1]);
  const players: DfoPlayer[] =
    data?.props?.pageProps?.combinations?.players ?? [];
  const result: Record<string, NationalPosition> = {};
  const goalieIndex = { current: 0 };

  for (const p of players) {
    const pos = groupToNationalPosition(p.groupIdentifier, goalieIndex);
    if (pos) result[p.name] = pos;
  }
  return result;
}

async function main(): Promise<void> {
  const competitionId = getCompetitionId();
  const outputPath = getOutputPath(competitionId);
  const teamIds = Object.keys(TEAM_TO_DFO_SLUG);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  const output: Record<string, Record<string, NationalPosition>> = {};

  console.log(`Event: ${competitionId}\n`);

  for (const teamId of teamIds) {
    process.stdout.write(`Fetching ${teamId}... `);
    try {
      const lines = await fetchNationalLines(teamId);
      output[teamId] = lines;
      console.log(`${Object.keys(lines).length} players`);
    } catch (e) {
      console.log(`error: ${(e as Error).message}`);
      output[teamId] = {};
    }
    await new Promise((r) => setTimeout(r, 500));
  }

  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
  console.log(`\nWrote ${outputPath}`);
  console.log('Run: npx tsx scripts/update-data.ts --fill-national');
}

main().catch(console.error);
