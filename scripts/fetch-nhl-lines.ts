#!/usr/bin/env npx tsx
/**
 * Fetch NHL club line combinations from DailyFaceoff. Output is event-specific.
 * Source: https://www.dailyfaceoff.com/teams/{slug}/line-combinations
 *
 * Usage: npx tsx scripts/fetch-nhl-lines.ts [--competition=<id>]
 *
 * Writes to scripts/data/{competitionId}/nhl-club-lines.json. Each event (Olympics,
 * World Championship, etc.) uses its own snapshot—lineups change by season/date.
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
  return path.join(DATA_DIR, competitionId, 'nhl-club-lines.json');
}

type Line =
  | '1L'
  | '2L'
  | '3L'
  | '4L'
  | 'top4D'
  | 'bottomD'
  | 'starterG'
  | 'backupG';
type Role = 'top6' | 'bottom6' | 'top4' | 'bottom2' | 'starter' | 'backup';

/** NHL club display name -> DailyFaceoff URL slug */
const CLUB_TO_SLUG: Record<string, string> = {
  'Anaheim Ducks': 'anaheim-ducks',
  'Boston Bruins': 'boston-bruins',
  'Buffalo Sabres': 'buffalo-sabres',
  'Calgary Flames': 'calgary-flames',
  'Carolina Hurricanes': 'carolina-hurricanes',
  'Chicago Blackhawks': 'chicago-blackhawks',
  'Colorado Avalanche': 'colorado-avalanche',
  'Columbus Blue Jackets': 'columbus-blue-jackets',
  'Dallas Stars': 'dallas-stars',
  'Detroit Red Wings': 'detroit-red-wings',
  'Edmonton Oilers': 'edmonton-oilers',
  'Florida Panthers': 'florida-panthers',
  'Los Angeles Kings': 'los-angeles-kings',
  'Minnesota Wild': 'minnesota-wild',
  'Montreal Canadiens': 'montreal-canadiens',
  'Nashville Predators': 'nashville-predators',
  'New Jersey Devils': 'new-jersey-devils',
  'New York Islanders': 'new-york-islanders',
  'New York Rangers': 'new-york-rangers',
  'Ottawa Senators': 'ottawa-senators',
  'Philadelphia Flyers': 'philadelphia-flyers',
  'Pittsburgh Penguins': 'pittsburgh-penguins',
  'San Jose Sharks': 'san-jose-sharks',
  'Seattle Kraken': 'seattle-kraken',
  'St. Louis Blues': 'st-louis-blues',
  'Tampa Bay Lightning': 'tampa-bay-lightning',
  'Toronto Maple Leafs': 'toronto-maple-leafs',
  'Utah Hockey Club': 'utah-mammoth',
  'Utah Mammoth': 'utah-mammoth',
  'Vancouver Canucks': 'vancouver-canucks',
  'Vegas Golden Knights': 'vegas-golden-knights',
  'Washington Capitals': 'washington-capitals',
  'Winnipeg Jets': 'winnipeg-jets',
};

interface DfoPlayer {
  name: string;
  positionIdentifier?: string;
  groupIdentifier?: string;
}

function groupToLineRole(
  group: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- kept for API consistency with caller
  position: string,
): { line: Line; role: Role } | null {
  switch (group) {
    case 'f1':
      return { line: '1L', role: 'top6' };
    case 'f2':
      return { line: '2L', role: 'top6' };
    case 'f3':
      return { line: '3L', role: 'bottom6' };
    case 'f4':
      return { line: '4L', role: 'bottom6' };
    case 'd1':
    case 'd2':
      return { line: 'top4D', role: 'top4' };
    case 'd3':
      return { line: 'bottomD', role: 'bottom2' };
    case 'g': {
      return { line: 'starterG', role: 'starter' };
    }
    default:
      return null;
  }
}

async function fetchTeamLines(
  club: string,
): Promise<Record<string, { line: Line; role: Role }>> {
  const slug = CLUB_TO_SLUG[club];
  if (!slug) return {};

  const url = `https://www.dailyfaceoff.com/teams/${slug}/line-combinations`;
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; hockey-event-ranking/1.0)',
    },
  });
  if (!res.ok) {
    console.warn(`  ${club}: HTTP ${res.status}`);
    return {};
  }

  const html = await res.text();
  const m = html.match(
    /<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/,
  );
  if (!m) {
    console.warn(`  ${club}: no __NEXT_DATA__ found`);
    return {};
  }

  const data = JSON.parse(m[1]);
  const players: DfoPlayer[] =
    data?.props?.pageProps?.combinations?.players ?? [];
  const result: Record<string, { line: Line; role: Role }> = {};

  let gIndex = 0;
  for (const p of players) {
    const group = p.groupIdentifier;
    if (
      !group ||
      group === 'ir' ||
      group.startsWith('pp') ||
      group.startsWith('pk')
    )
      continue;

    const lr = groupToLineRole(group, p.positionIdentifier ?? '');
    if (!lr) continue;

    if (group === 'g') {
      const line: Line = gIndex === 0 ? 'starterG' : 'backupG';
      const role: Role = gIndex === 0 ? 'starter' : 'backup';
      result[p.name] = { line, role };
      gIndex++;
    } else {
      result[p.name] = lr;
    }
  }
  return result;
}

/** Unique NHL clubs from Olympics rosters */
const OLYMPICS_NHL_CLUBS = [
  'Florida Panthers',
  'San Jose Sharks',
  'Pittsburgh Penguins',
  'Tampa Bay Lightning',
  'Vegas Golden Knights',
  'Montreal Canadiens',
  'New York Islanders',
  'Carolina Hurricanes',
  'Washington Capitals',
  'Dallas Stars',
  'Colorado Avalanche',
  'Boston Bruins',
  'Philadelphia Flyers',
  'Winnipeg Jets',
  'St. Louis Blues',
  'Los Angeles Kings',
  'Vancouver Canucks',
  'Minnesota Wild',
  'New Jersey Devils',
  'New York Rangers',
  'Toronto Maple Leafs',
  'Detroit Red Wings',
  'Ottawa Senators',
  'Buffalo Sabres',
  'Chicago Blackhawks',
  'Nashville Predators',
  'Calgary Flames',
  'Columbus Blue Jackets',
  'Anaheim Ducks',
  'Utah Hockey Club',
  'Utah Mammoth',
  'Seattle Kraken',
  'Edmonton Oilers',
] as const;

async function main(): Promise<void> {
  const competitionId = getCompetitionId();
  const outputPath = getOutputPath(competitionId);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  const seen = new Set<string>();
  const output: Record<string, Record<string, { line: Line; role: Role }>> = {};

  console.log(`Event: ${competitionId}\n`);

  for (const club of OLYMPICS_NHL_CLUBS) {
    const norm = club === 'Utah Mammoth' ? 'Utah Hockey Club' : club;
    if (seen.has(norm)) continue;
    seen.add(norm);
    process.stdout.write(`Fetching ${norm}... `);
    try {
      const lines = await fetchTeamLines(norm);
      output[norm] = lines;
      console.log(`${Object.keys(lines).length} players`);
    } catch (e) {
      console.log(`error: ${(e as Error).message}`);
      output[norm] = {};
    }
    await new Promise((r) => setTimeout(r, 500));
  }

  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
  console.log(`\nWrote ${outputPath}`);
}

main().catch(console.error);
