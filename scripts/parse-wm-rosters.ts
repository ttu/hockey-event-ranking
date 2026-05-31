#!/usr/bin/env tsx
/**
 * Parse Wikipedia raw wikitext for the 2026 IIHF World Championship rosters and:
 *   - Fill empty team rosters (ITA, SVK initially) with full player data.
 *   - Print a name-level diff for already-populated teams so we can review
 *     tournament call-ups / withdrawals without overwriting curated salary,
 *     headshotUrl, line, or nationalLine fields.
 *
 * Input wikitext source: /tmp/wc2026-rosters.wiki (fetch with
 *   curl -sL "https://en.wikipedia.org/w/index.php?title=2026_IIHF_World_Championship_rosters&action=raw"
 *
 * Usage:
 *   npx tsx scripts/parse-wm-rosters.ts                # diff all 16, write empty rosters
 *   npx tsx scripts/parse-wm-rosters.ts --write-team ITA SVK   # force-write specific teams
 */
import * as fs from 'fs';
import * as path from 'path';
import type { RosterPlayer, TeamRoster } from '../src/types';
import { getEstimatedSalary } from '../src/data/leagues';

const WIKI_PATH = '/tmp/wc2026-rosters.wiki';
const COMP_ID = 'world-championship-2026';
const COMP_DIR = path.join(
  process.cwd(),
  'public',
  'data',
  'competitions',
  COMP_ID,
);

// Wikipedia section name → IOC team code
const TEAM_CODE: Record<string, string> = {
  Austria: 'AUT',
  Canada: 'CAN',
  Czechia: 'CZE',
  Denmark: 'DEN',
  Finland: 'FIN',
  'Great Britain': 'GBR',
  Germany: 'GER',
  Hungary: 'HUN',
  Italy: 'ITA',
  Latvia: 'LAT',
  Norway: 'NOR',
  Slovakia: 'SVK',
  Slovenia: 'SVN',
  Sweden: 'SWE',
  Switzerland: 'SUI',
  'United States': 'USA',
};

// Flag (from {{flagicon|XXX}}) → raw leagueId hint. canonicalLeagueId in
// update-wc-salaries.ts will normalize NHL/AHL etc. from the club name.
const FLAG_TO_LEAGUE: Record<string, string> = {
  FIN: 'LIIGA',
  SWE: 'SHL',
  GER: 'DEL',
  SUI: 'SWISS_NL',
  CZE: 'EXTRALIGA',
  AUT: 'ICEHL',
  ITA: 'ICEHL', // Italian top clubs play in ICEHL
  SVK: 'OTHER', // Slovak Tipos Extraliga not modelled separately
  DEN: 'OTHER',
  NOR: 'OTHER',
  SVN: 'OTHER',
  HUN: 'OTHER',
  GBR: 'OTHER',
  RUS: 'KHL',
  BLR: 'KHL',
  KAZ: 'KHL',
  LAT: 'OTHER',
  FRA: 'OTHER',
  ROU: 'OTHER',
  POL: 'OTHER',
  CAN: 'NHL', // disambiguated by club name in canonicalLeagueId
  USA: 'NHL', // ditto (covers NHL/AHL/NCAA/ECHL — needs club-based override below)
  UK: 'OTHER', // Great Britain uses {{flagicon|UK}}
  ENG: 'OTHER',
  SCO: 'OTHER',
};

// Club-name patterns that override flag-based mapping
const CLUB_OVERRIDES: Array<{ test: RegExp; league: string }> = [
  {
    test: /\b(NCAA|Bulldogs|Eagles|Wildcats|University|Notre Dame|Boston College|Engineers|Falcons|Fighting Irish|Niagara|New Hampshire|Minnesota Duluth|Bentley|RPI)\b/i,
    league: 'OTHER',
  },
  {
    test: /\b(Admirals|Reign|Wolves|Marlies|Wild|IceHogs|Comets|Heat|Stars|Crunch|Penguins|Phantoms|Senators|Bears|Monsters|Americans|Griffins|Condors|Wolf Pack|Silver Knights|Rampage|Sea Dogs|Rocket|Wranglers|Roadrunners|Firebirds|Gulls|Devils)\s*$/i,
    league: 'AHL',
  },
  // AHL exact names (subset)
  {
    test: /^(Bakersfield Condors|Milwaukee Admirals|Rockford IceHogs|Grand Rapids Griffins|Toronto Marlies|Hartford Wolf Pack|Henderson Silver Knights|Laval Rocket|Iowa Wild|Ontario Reign|San Diego Gulls|Rochester Americans)$/,
    league: 'AHL',
  },
  {
    test: /^(Peterborough Petes|Saint John Sea Dogs|Sheffield Steel|Cranbrook Bucks|Norfolk Admirals)$/,
    league: 'OTHER',
  },
];

interface RawPlayer {
  jersey: number;
  pos: 'F' | 'D' | 'G';
  name: string;
  flag: string;
  club: string;
}

/** Extract a player name from a cell that may be {{sortname|First|Last|...}} or [[Wikilink]] or plain. */
function extractName(cell: string): string | null {
  const sortMatch = cell.match(/\{\{[sS]ortname\|([^|}]+)\|([^|}]+)/);
  if (sortMatch) return `${sortMatch[1].trim()} ${sortMatch[2].trim()}`;
  const linkMatch = cell.match(/\[\[([^\]\n|]+)(?:\|([^\]\n]+))?\]\]/);
  if (linkMatch) return (linkMatch[2] ?? linkMatch[1]).trim();
  const plain = cell.replace(/['{}[\]]/g, '').trim();
  return plain || null;
}

function parseSection(wiki: string, teamName: string): RawPlayer[] {
  const startIdx = wiki.indexOf(`===${teamName}===`);
  if (startIdx === -1) return [];
  const nextSection = wiki.indexOf('\n===', startIdx + 5);
  const section = wiki.slice(
    startIdx,
    nextSection === -1 ? wiki.length : nextSection,
  );
  const players: RawPlayer[] = [];
  // Split section into table rows (separated by "\n|-"), drop header, then
  // for each row split cells on " || " (top-level pipe-pipe only — template
  // internals like {{sortname|A|B}} are safe because they don't contain "||").
  const rows = section.split(/\n\|-/);
  for (const row of rows) {
    // Drop header rows (cells start with "!")
    if (/^\s*!/m.test(row)) continue;
    const body = row.replace(/^\n/, '').trim();
    if (!body.startsWith('|')) continue;
    // Strip leading "| " on first cell so split is uniform.
    const cells = body
      .replace(/^\|\s*/, '')
      .split(/\s*\|\|\s*/)
      .map((c) => c.trim());
    if (cells.length < 7) continue;
    const [jerseyCell, posCell, nameCell, , , , teamCell] = cells;
    if (!/^\d+$/.test(jerseyCell)) continue;
    if (!/^[FDG]$/.test(posCell)) continue;
    const name = extractName(nameCell);
    if (!name) continue;
    const flagMatch = teamCell.match(/\{\{flagicon\|([A-Z]{2,3})\}\}/);
    const clubMatch = teamCell.match(/\[\[([^\]\n|]+)(?:\|([^\]\n]+))?\]\]/);
    if (!flagMatch || !clubMatch) continue;
    players.push({
      jersey: Number(jerseyCell),
      pos: posCell as 'F' | 'D' | 'G',
      name,
      flag: flagMatch[1],
      club: clubMatch[1].trim(),
    });
  }
  return players;
}

function toPlayerId(name: string): string {
  return name
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function inferLeague(flag: string, club: string): string {
  for (const o of CLUB_OVERRIDES) {
    if (o.test.test(club)) return o.league;
  }
  return FLAG_TO_LEAGUE[flag] ?? 'OTHER';
}

function buildPlayer(rp: RawPlayer): RosterPlayer {
  const leagueId = inferLeague(rp.flag, rp.club);
  const position: 'C' | 'D' | 'G' = rp.pos === 'F' ? 'C' : rp.pos;
  // Defaults; update-wc-salaries.ts will overwrite salary, --fill-national will set nationalLine.
  const line = rp.pos === 'G' ? 'starterG' : rp.pos === 'D' ? 'top4D' : '2L';
  const role = rp.pos === 'G' ? 'starter' : rp.pos === 'D' ? 'top4' : 'top6';
  return {
    playerId: toPlayerId(rp.name),
    playerName: rp.name,
    position,
    leagueId,
    club: rp.club,
    salaryUsd: getEstimatedSalary(leagueId),
    salaryEstimated: true,
    line,
    role,
  } as RosterPlayer;
}

function loadExistingRoster(teamCode: string): TeamRoster | null {
  const p = path.join(COMP_DIR, `${teamCode}.json`);
  if (!fs.existsSync(p)) return null;
  return JSON.parse(fs.readFileSync(p, 'utf-8')) as TeamRoster;
}

// Common short-name aliases used in NHL/club listings vs Wikipedia article titles.
const NAME_ALIASES: Record<string, string> = {
  josh: 'joshua',
  joey: 'joseph',
  alex: 'alexander',
  ryan: 'ryan',
};

function nameKey(name: string): string {
  const stripped = name
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[‘’ʼ`'']/g, "'") // all apostrophe variants → '
    .replace(/\s*\([^)]*\)\s*/g, ' ') // drop "(ice hockey)" anywhere
    .replace(/[^a-z0-9 '-]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  // Expand first-name aliases ("josh hagens" → "joshua hagens") for tighter match.
  const parts = stripped.split(' ');
  if (parts.length > 1 && NAME_ALIASES[parts[0]]) {
    parts[0] = NAME_ALIASES[parts[0]];
  }
  return parts.join(' ');
}

/** Strip Wikipedia article-disambiguation suffixes for club-change comparison. */
function clubBase(club: string): string {
  return club
    .replace(/\s*\([^)]*\)\s*/g, ' ') // drop parenthetical anywhere
    .replace(/\s+men's ice hockey\s*$/i, '') // " men's ice hockey"
    .replace(/\s+/g, ' ')
    .trim();
}

/** True if wiki "club change" is just article-disambiguation, not a real move. */
function isClubDisambigNoise(oldClub: string, newClub: string): boolean {
  return clubBase(oldClub).toLowerCase() === clubBase(newClub).toLowerCase();
}

function writeRoster(teamCode: string, rawPlayers: RawPlayer[]): void {
  const players = rawPlayers
    .map(buildPlayer)
    .sort((a, b) => String(a.playerId).localeCompare(String(b.playerId)));
  const roster: TeamRoster = {
    teamId: teamCode,
    competitionId: COMP_ID,
    players,
  };
  fs.writeFileSync(
    path.join(COMP_DIR, `${teamCode}.json`),
    JSON.stringify(roster, null, 2),
  );
  console.log(`Wrote ${teamCode}.json (${players.length} players)`);
}

function diffRoster(
  teamCode: string,
  wikiPlayers: RawPlayer[],
  existing: TeamRoster,
  apply: boolean,
): void {
  const wikiByKey = new Map(wikiPlayers.map((p) => [nameKey(p.name), p]));
  const existingByKey = new Map(
    existing.players.map((p) => [nameKey(p.playerName), p]),
  );

  const removed = existing.players.filter(
    (p) => !wikiByKey.has(nameKey(p.playerName)),
  );
  const added = wikiPlayers.filter((p) => !existingByKey.has(nameKey(p.name)));
  const clubChanges: Array<{ existing: RosterPlayer; wiki: RawPlayer }> = [];
  for (const w of wikiPlayers) {
    const cur = existingByKey.get(nameKey(w.name));
    if (cur && cur.club !== w.club && !isClubDisambigNoise(cur.club, w.club)) {
      clubChanges.push({ existing: cur, wiki: w });
    }
  }

  if (removed.length === 0 && added.length === 0 && clubChanges.length === 0) {
    console.log(`${teamCode}: ✓ in sync (${wikiPlayers.length} players)`);
    return;
  }
  console.log(
    `${teamCode}: ${existing.players.length} → ${wikiPlayers.length} | -${removed.length} +${added.length} ~${clubChanges.length}`,
  );
  for (const p of removed) console.log(`    - ${p.playerName} (${p.club})`);
  for (const p of added) console.log(`    + ${p.name} (${p.club})`);
  for (const c of clubChanges)
    console.log(
      `    club: ${c.existing.playerName}: "${c.existing.club}" → "${c.wiki.club}"`,
    );

  if (!apply) return;

  // Apply: drop removed, add new, update real club changes.
  const removedKeys = new Set(removed.map((p) => nameKey(p.playerName)));
  const kept = existing.players.filter(
    (p) => !removedKeys.has(nameKey(p.playerName)),
  );
  // Update clubs (real changes only) and recompute leagueId from wiki flag.
  for (const k of kept) {
    const w = wikiByKey.get(nameKey(k.playerName));
    if (!w) continue;
    if (k.club !== w.club && !isClubDisambigNoise(k.club, w.club)) {
      k.club = w.club;
      k.leagueId = inferLeague(w.flag, w.club);
      // Force re-estimation; update-wc-salaries.ts will refine NHL lookups.
      k.salaryUsd = getEstimatedSalary(k.leagueId);
      k.salaryEstimated = true;
      // Drop possibly-stale headshot when player moved clubs.
      if (k.leagueId !== 'NHL') delete (k as Partial<RosterPlayer>).headshotUrl;
    }
  }
  const newPlayers = added.map(buildPlayer);
  const merged = [...kept, ...newPlayers].sort((a, b) =>
    String(a.playerId).localeCompare(String(b.playerId)),
  );
  const roster: TeamRoster = { ...existing, players: merged };
  fs.writeFileSync(
    path.join(COMP_DIR, `${teamCode}.json`),
    JSON.stringify(roster, null, 2),
  );
  console.log(`    → wrote ${teamCode}.json (${merged.length} players)`);
}

function main(): void {
  const wiki = fs.readFileSync(WIKI_PATH, 'utf-8');
  const apply = process.argv.includes('--apply');
  const writeIdx = process.argv.indexOf('--write-team');
  const forceWrite =
    writeIdx >= 0 ? new Set(process.argv.slice(writeIdx + 1)) : new Set();

  for (const [teamName, code] of Object.entries(TEAM_CODE)) {
    const wikiPlayers = parseSection(wiki, teamName);
    if (wikiPlayers.length === 0) {
      console.log(`${code}: ⚠️  no players parsed from wikitext`);
      continue;
    }
    const existing = loadExistingRoster(code);
    const isEmpty = !existing || existing.players.length === 0;
    if (isEmpty || forceWrite.has(code)) {
      writeRoster(code, wikiPlayers);
    } else {
      diffRoster(code, wikiPlayers, existing, apply);
    }
  }
}

main();
