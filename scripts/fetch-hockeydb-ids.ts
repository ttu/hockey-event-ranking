#!/usr/bin/env npx tsx
/**
 * Fetch HockeyDB player IDs and add to overrides.json.
 * Uses scripts/data/hockey-db-ids.json map (same pattern as headshots NHL_IDS).
 * Optional: scrapes find_player.php when not in map (may get 403 from HockeyDB).
 *
 * Usage: npx tsx scripts/fetch-hockeydb-ids.ts [competition-id]
 *        (e.g. four-nations-2025, olympics-2026)
 */

import * as fs from 'fs';
import * as path from 'path';

const DATA_DIR = path.join(process.cwd(), 'public', 'data');
const COMPETITIONS_DIR = path.join(DATA_DIR, 'competitions');
const HOCKEY_DB_IDS_PATH = path.join(
  process.cwd(),
  'scripts',
  'data',
  'hockey-db-ids.json',
);
const FIND_PLAYER_URL = 'https://www.hockeydb.com/ihdb/stats/find_player.php';

function loadHockeyDbIds(): Record<string, string> {
  try {
    const data = fs.readFileSync(HOCKEY_DB_IDS_PATH, 'utf-8');
    return JSON.parse(data) as Record<string, string>;
  } catch {
    return {};
  }
}

/** Resolve playerId to HockeyDB pid. Handles slug format (e.g. nathan-mackinnon -> mackinnon). */
function resolveHockeyDbId(
  playerId: string,
  ids: Record<string, string>,
): string | undefined {
  const direct = ids[playerId];
  if (direct) return direct;
  const lastPart = playerId.split('-').pop();
  return lastPart ? ids[lastPart] : undefined;
}

interface SearchResult {
  pid: string;
  position: string;
  teams: string;
  birthplace: string;
}

/** Score match: higher = better. Uses club and position. */
function scoreMatch(
  result: SearchResult,
  rosterClub: string,
  rosterPosition: string,
): number {
  let score = 0;
  const clubLower = rosterClub.toLowerCase();
  const teamsLower = result.teams.toLowerCase();
  // Club match: "Carolina Hurricanes" -> teams may contain "Carolina/NHL"
  const clubWords = clubLower.split(/\s+/).filter((w) => w.length > 2);
  for (const w of clubWords) {
    if (teamsLower.includes(w)) score += 10;
  }
  // Position match: C, LW, RW, D, G
  const posMap: Record<string, string> = {
    C: 'C',
    LW: 'LW',
    RW: 'RW',
    D: 'D',
    G: 'G',
  };
  const rosterPos = posMap[rosterPosition] ?? rosterPosition;
  if (result.position === rosterPos || teamsLower.includes('nhl')) score += 5;
  return score;
}

/** Parse find_player.php HTML for pid, position, teams per row */
function parseSearchResults(html: string): SearchResult[] {
  const results: SearchResult[] = [];
  // Split by table row: <tr data-status='active'><td><input ... value='164509' /></td>...
  const rowParts = html.split(/<tr\s+data-status='active'>/i);
  for (const part of rowParts.slice(1)) {
    const pidMatch = part.match(/name='pid\[\]'\s+value='(\d+)'/);
    if (!pidMatch) continue;
    const pid = pidMatch[1];
    const posMatch = part.match(/<\/td><td>([CDGLRW]+)<\/td><td/);
    const teamsMatch = part.match(/class='col-teams'[^>]*>([\s\S]*?)<\/td>/);
    const birthMatch = part.match(/class='col-birthplace'[^>]*>([^<]*)<\/td>/);
    results.push({
      pid,
      position: posMatch?.[1]?.trim() ?? '',
      birthplace: birthMatch?.[1]?.trim() ?? '',
      teams: (teamsMatch?.[1] ?? '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim(),
    });
  }
  if (results.length === 0) {
    const pidRegex = /pdisplay\.php\?pid=(\d+)/g;
    let m: RegExpExecArray | null;
    while ((m = pidRegex.exec(html)) !== null) {
      results.push({ pid: m[1], position: '', birthplace: '', teams: '' });
    }
  }
  return results;
}

async function fetchHockeyDbId(
  playerName: string,
  club: string,
  position: string,
): Promise<string | null> {
  try {
    const url = `${FIND_PLAYER_URL}?full_name=${encodeURIComponent(playerName)}`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; hockey-event-ranking/1.0)',
      },
    });
    if (!res.ok) return null;
    const html = await res.text();
    const results = parseSearchResults(html);
    if (results.length === 0) return null;
    if (results.length === 1) return results[0].pid;
    // Multiple: pick best match by club/position
    const scored = results.map((r) => ({
      ...r,
      score: scoreMatch(r, club, position),
    }));
    scored.sort((a, b) => b.score - a.score);
    return scored[0].score > 0 ? scored[0].pid : scored[0].pid;
  } catch {
    return null;
  }
}

async function main(): Promise<void> {
  const competitionId = process.argv[2] ?? 'olympics-2026';
  const compDir = path.join(COMPETITIONS_DIR, competitionId);

  if (!fs.existsSync(compDir)) {
    console.error(`Competition not found: ${compDir}`);
    process.exit(1);
  }

  const hockeyDbIds = loadHockeyDbIds();
  if (Object.keys(hockeyDbIds).length === 0) {
    console.warn(
      `No entries in ${HOCKEY_DB_IDS_PATH}. Add playerId -> pid to enable lookups.`,
    );
  }

  const summaryPath = path.join(COMPETITIONS_DIR, `${competitionId}.json`);
  const summary = JSON.parse(fs.readFileSync(summaryPath, 'utf-8')) as {
    teams?: Array<{ teamId: string }>;
  };
  const teamIds = Array.isArray(summary.teams)
    ? summary.teams.map((t: { teamId: string }) => t.teamId)
    : fs
        .readdirSync(compDir)
        .filter((f) => f.endsWith('.json') && f !== 'overrides.json')
        .map((f) => path.basename(f, '.json'));

  const overridesPath = path.join(compDir, 'overrides.json');
  const existingOverrides = fs.existsSync(overridesPath)
    ? (JSON.parse(fs.readFileSync(overridesPath, 'utf-8')) as Record<
        string,
        Record<string, Record<string, unknown>>
      >)
    : {};

  let updated = 0;

  for (const teamId of teamIds) {
    const teamPath = path.join(compDir, `${teamId}.json`);
    const data = JSON.parse(fs.readFileSync(teamPath, 'utf-8')) as {
      teamId: string;
      players: Array<{
        playerId: string;
        playerName: string;
        club?: string;
        position?: string;
        hockeyDbId?: string;
        [k: string]: unknown;
      }>;
    };

    if (!existingOverrides[teamId]) existingOverrides[teamId] = {};

    for (const player of data.players) {
      const existing =
        (existingOverrides[teamId][player.playerId]?.hockeyDbId as string) ??
        player.hockeyDbId;
      if (existing) continue;

      let pid: string | null = null;

      const mapPid = resolveHockeyDbId(player.playerId as string, hockeyDbIds);
      if (mapPid) {
        pid = mapPid;
      } else {
        pid = await fetchHockeyDbId(
          player.playerName as string,
          (player.club as string) ?? '',
          (player.position as string) ?? '',
        );
        await new Promise((r) => setTimeout(r, 500));
      }

      if (pid) {
        existingOverrides[teamId][player.playerId] = {
          ...existingOverrides[teamId][player.playerId],
          hockeyDbId: pid,
        };
        updated++;
        console.log(`  ${player.playerName}: pid=${pid}`);
      } else {
        console.warn(
          `  Skip (no match): ${player.playerName} (${player.playerId})`,
        );
      }
    }
  }

  const trimmed: Record<string, Record<string, Record<string, unknown>>> = {};
  for (const [tid, players] of Object.entries(existingOverrides)) {
    if (Object.keys(players).length > 0) trimmed[tid] = players;
  }
  fs.writeFileSync(overridesPath, JSON.stringify(trimmed, null, 2));
  console.log(`\nUpdated ${updated} HockeyDB IDs in ${competitionId}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
