#!/usr/bin/env npx tsx
/**
 * Fetch NHL headshot URLs and add to roster JSON.
 * Uses api-web.nhle.com/v1/player/{nhlId}/landing or roster API for NHL players.
 *
 * Usage: npx tsx scripts/fetch-headshots.ts [competition-id]
 *        (e.g. four-nations-2025, olympics-2026)
 */

import * as fs from 'fs';
import * as path from 'path';

const DATA_DIR = path.join(process.cwd(), 'public', 'data');
const COMPETITIONS_DIR = path.join(DATA_DIR, 'competitions');
const SEASON = '20252026';

/** NHL club name -> team abbreviation for roster API */
const NHL_CLUB_TO_ABBREV: Record<string, string> = {
  'Edmonton Oilers': 'EDM',
  'Florida Panthers': 'FLA',
  'San Jose Sharks': 'SJS',
  'Pittsburgh Penguins': 'PIT',
  'Tampa Bay Lightning': 'TBL',
  'Vegas Golden Knights': 'VGK',
  'Montreal Canadiens': 'MTL',
  'New York Islanders': 'NYI',
  'Carolina Hurricanes': 'CAR',
  'Washington Capitals': 'WSH',
  'Dallas Stars': 'DAL',
  'Colorado Avalanche': 'COL',
  'Boston Bruins': 'BOS',
  'Philadelphia Flyers': 'PHI',
  'Winnipeg Jets': 'WPG',
  'St. Louis Blues': 'STL',
  'Los Angeles Kings': 'LAK',
  'Vancouver Canucks': 'VAN',
  'Minnesota Wild': 'MIN',
  'New Jersey Devils': 'NJD',
  'New York Rangers': 'NYR',
  'Toronto Maple Leafs': 'TOR',
  'Detroit Red Wings': 'DET',
  'Ottawa Senators': 'OTT',
  'Buffalo Sabres': 'BUF',
  'Chicago Blackhawks': 'CHI',
  'Nashville Predators': 'NSH',
  'Calgary Flames': 'CGY',
  'Columbus Blue Jackets': 'CBJ',
  'Anaheim Ducks': 'ANA',
  'Utah Hockey Club': 'UTA',
  'Utah Mammoth': 'UTA',
  'Seattle Kraken': 'SEA',
};

/** Resolve playerId to NHL numeric ID. Handles Olympics slug format (e.g. nathan-mackinnon -> mackinnon). */
function resolveNhlId(playerId: string): number | undefined {
  const direct = NHL_IDS[playerId];
  if (direct) return direct;
  // Olympics uses slug IDs like "nathan-mackinnon"; try last segment as short ID
  const lastPart = playerId.split('-').pop();
  return lastPart ? NHL_IDS[lastPart] : undefined;
}

/** playerId -> NHL player ID (fallback when roster lookup fails) */
const NHL_IDS: Record<string, number> = {
  mcdavid: 8478402,
  mackinnon: 8477492,
  crosby: 8471675,
  point: 8477346,
  marner: 8478483,
  marchand: 8475791,
  stone: 8478408,
  reinhart: 8477933,
  'sam-reinhart': 8477933,
  hagel: 8479425,
  bennett: 8477935,
  'sam-bennett': 8477935,
  'leon-draisaitl': 8477934,
  cirelli: 8477962,
  jarvis: 8482093,
  konecny: 8477941,
  makar: 8480069,
  toews: 8478038,
  'devon-toews': 8478038,
  morrissey: 8477494,
  theodore: 8477447,
  'shea-theodore': 8477447,
  doughty: 8475218,
  parayko: 8476894,
  'colton-parayko': 8476894,
  binnington: 8476414,
  hill: 8478474,
  montembeault: 8477970,
  matthews: 8479318,
  eichel: 8478403,
  'tkachuk-matthew': 8479324,
  'tkachuk-brady': 8480069,
  'hughes-jack': 8481559,
  'jack-hughes': 8481559,
  connor: 8476456,
  trocheck: 8476381,
  miller: 8476454,
  guentzel: 8477407,
  kreider: 8475184,
  larkin: 8477946,
  nelson: 8475754,
  'brock-nelson': 8475754,
  boldy: 8481557,
  'matt-boldy': 8481557,
  'hughes-quinn': 8480800, // Quinn Hughes VAN
  fox: 8479323,
  mcavoy: 8477404,
  werenski: 8478458,
  hanifin: 8477496,
  slavin: 8478048,
  faber: 8482122,
  'brock-faber': 8482122,
  hellebuyck: 8476412,
  oettinger: 8479979,
  'jake-oettinger': 8479979,
  'jake-sanderson': 8482105,
  sanderson: 8482105,
  swayman: 8480280,
  pettersson: 8479343,
  'elias-pettersson': 8479343,
  nylander: 8479319,
  zibanejad: 8476459,
  bratt: 8478444,
  lindholm: 8476458,
  'elias-lindholm': 8476458,
  'hampus-lindholm': 8476854,
  'karlsson-w': 8476891,
  kempe: 8477950,
  'eriksson-ek': 8478493,
  'joel-eriksson-ek': 8478493,
  'nikolaj-ehlers': 8477940,
  ehlers: 8477940,
  carlsson: 8482699,
  arvidsson: 8475802,
  raymond: 8482078,
  nyqvist: 8475714,
  hedman: 8475169,
  'karlsson-e': 8474564,
  forsling: 8477454,
  dahlin: 8479337,
  ekholm: 8475253,
  brodin: 8476945,
  andersson: 8477491,
  markstrom: 8474590,
  ullmark: 8475215,
  gustavsson: 8477979,
  barkov: 8477493,
  rantanen: 8478420,
  aho: 8478427,
  hintz: 8478449,
  lehkonen: 8477476,
  'artturi-lehkonen': 8477476,
  teravainen: 8477960,
  granlund: 8475798,
  'mikael-granlund': 8475798,
  haula: 8475287,
  'erik-haula': 8475287,
  armia: 8477932,
  lundell: 8482113,
  'anton-lundell': 8482113,
  luostarinen: 8478452,
  heiskanen: 8480036,
  lindell: 8476902,
  'esa-lindell': 8476902,
  'juraj-slafkovsky': 8483515,
  'filip-forsberg': 8476887,
  forsberg: 8476887,
  valimaki: 8479365,
  maatta: 8476874,
  mikkola: 8478859,
  'niko-mikkola': 8478859,
  'filip-hronek': 8479402,
  hronek: 8479402,
  hakanpaa: 8476410,
  ristolainen: 8477490,
  saros: 8477971,
  luukkonen: 8480004,
  korpisalo: 8476914,
};

async function fetchHeadshot(nhlId: number): Promise<string | null> {
  try {
    const res = await fetch(
      `https://api-web.nhle.com/v1/player/${nhlId}/landing`,
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { headshot?: string };
    return data.headshot ?? null;
  } catch {
    return null;
  }
}

interface RosterPlayer {
  id: number;
  firstName: { default: string };
  lastName: { default: string };
  headshot?: string;
}

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/\s+/g, ' ')
    .replace(/\./g, '')
    .trim();
}

function namesMatch(
  rosterFirst: string,
  rosterLast: string,
  searchName: string,
): boolean {
  const rosterFull = normalizeName(`${rosterFirst} ${rosterLast}`);
  const search = normalizeName(searchName);
  if (rosterFull === search) return true;
  const searchParts = search.split(/\s+/);
  const rosterParts = normalizeName(`${rosterFirst} ${rosterLast}`).split(
    /\s+/,
  );
  if (searchParts.length >= 2 && rosterParts.length >= 2) {
    const lastMatch =
      rosterParts[rosterParts.length - 1] ===
      searchParts[searchParts.length - 1];
    const firstMatch =
      rosterParts[0] === searchParts[0] ||
      (rosterParts[0].startsWith(searchParts[0]) && searchParts[0].length >= 2);
    if (lastMatch && firstMatch) return true;
  }
  return rosterFull.includes(search) || search.includes(rosterFull);
}

const rosterCache = new Map<string, RosterPlayer[]>();

async function getCachedRoster(abbrev: string): Promise<RosterPlayer[]> {
  const cached = rosterCache.get(abbrev);
  if (cached) return cached;
  try {
    const res = await fetch(
      `https://api-web.nhle.com/v1/roster/${abbrev}/${SEASON}`,
    );
    if (!res.ok) return [];
    const data = (await res.json()) as {
      forwards?: RosterPlayer[];
      defensemen?: RosterPlayer[];
      goalies?: RosterPlayer[];
    };
    const all = [
      ...(data.forwards ?? []),
      ...(data.defensemen ?? []),
      ...(data.goalies ?? []),
    ];
    rosterCache.set(abbrev, all);
    await new Promise((r) => setTimeout(r, 150));
    return all;
  } catch {
    return [];
  }
}

async function main(): Promise<void> {
  const competitionId = process.argv[2] ?? 'four-nations-2025';
  const compDir = path.join(COMPETITIONS_DIR, competitionId);

  if (!fs.existsSync(compDir)) {
    console.error(`Competition not found: ${compDir}`);
    process.exit(1);
  }

  const summaryPath = path.join(COMPETITIONS_DIR, `${competitionId}.json`);
  const summary = JSON.parse(fs.readFileSync(summaryPath, 'utf-8')) as {
    teams?: Array<{ teamId: string }>;
  };
  const teamIds = Array.isArray(summary.teams)
    ? summary.teams.map((t) => t.teamId)
    : fs
        .readdirSync(compDir)
        .filter((f) => f.endsWith('.json'))
        .map((f) => path.basename(f, '.json'));
  let updated = 0;

  for (const teamId of teamIds) {
    const teamPath = path.join(compDir, `${teamId}.json`);
    const data = JSON.parse(fs.readFileSync(teamPath, 'utf-8')) as {
      teamId: string;
      players: Array<{
        playerId: string;
        playerName: string;
        [k: string]: unknown;
      }>;
    };

    for (const player of data.players) {
      if (player.headshotUrl) continue;
      // Skip players that would get wrong headshot from roster name match or missing NHL_IDS
      if (player.playerId === 'thomas-larkin') continue;
      if (player.playerId === 'sanheim') continue; // Travis Sanheim: not on current PHI roster, avoid wrong match

      let url: string | null = null;

      const nhlId = resolveNhlId(player.playerId as string);
      if (nhlId) {
        url = await fetchHeadshot(nhlId);
        await new Promise((r) => setTimeout(r, 100));
      }

      if (!url && player.leagueId === 'NHL' && player.club) {
        const abbrev = NHL_CLUB_TO_ABBREV[player.club as string];
        if (abbrev) {
          const roster = await getCachedRoster(abbrev);
          const match = roster.find((p) =>
            namesMatch(
              p.firstName.default,
              p.lastName.default,
              player.playerName as string,
            ),
          );
          url = match?.headshot ?? null;
        }
      }

      if (url) {
        player.headshotUrl = url;
        updated++;
        console.log(`  ${player.playerName}: ${url}`);
      } else if (player.leagueId === 'NHL') {
        console.warn(
          `  Skip (no headshot): ${player.playerName} (${player.playerId})`,
        );
      }
    }

    fs.writeFileSync(teamPath, JSON.stringify(data, null, 2));
  }

  console.log(`\nUpdated ${updated} headshots in ${competitionId}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
