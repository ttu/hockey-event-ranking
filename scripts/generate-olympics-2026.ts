#!/usr/bin/env npx tsx
/**
 * Generate Olympics 2026 roster data from official NHL.com rosters.
 * Source: https://www.nhl.com/news/topic/olympics/complete-list-of-olympic-winter-games-milano-cortina-2026-mens-hockey-rosters
 *
 * Usage: npx tsx scripts/generate-olympics-2026.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { getEstimatedSalary, getLeagueTierWeight } from '../src/data/leagues';
import { getTeamMetrics } from '../src/lib/teamMetrics';

const DATA_DIR = path.join(process.cwd(), 'public', 'data');
const COMP_DIR = path.join(DATA_DIR, 'competitions');
const OLYMPICS_DIR = path.join(COMP_DIR, 'olympics-2026');
const NHL_LINES_PATH = path.join(
  process.cwd(),
  'scripts',
  'data',
  'olympics-2026',
  'nhl-club-lines.json',
);

/** NHL club -> player name -> { line, role } from DailyFaceoff. Event-specific; load if exists. */
function loadNhlClubLines(): Record<
  string,
  Record<string, { line: Line; role: Role }>
> {
  try {
    const data = fs.readFileSync(NHL_LINES_PATH, 'utf8');
    return JSON.parse(data) as Record<
      string,
      Record<string, { line: Line; role: Role }>
    >;
  } catch {
    return {};
  }
}

type Position = 'C' | 'LW' | 'RW' | 'D' | 'G';
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
type NationalPosition = 'L1' | 'L2' | 'L3' | 'L4' | 'D1' | 'D2' | 'G1' | 'G2';

interface RawPlayer {
  name: string;
  position: Position;
  club: string;
  salaryUsd?: number;
  salaryEstimated?: boolean;
}

/** Club name (partial match) -> { leagueId, clubDisplay } */
const CLUB_TO_LEAGUE: Record<string, { leagueId: string; club: string }> = {
  'Edmonton Oilers': { leagueId: 'NHL', club: 'Edmonton Oilers' },
  'Florida Panthers': { leagueId: 'NHL', club: 'Florida Panthers' },
  'San Jose Sharks': { leagueId: 'NHL', club: 'San Jose Sharks' },
  'Pittsburgh Penguins': { leagueId: 'NHL', club: 'Pittsburgh Penguins' },
  'Tampa Bay Lightning': { leagueId: 'NHL', club: 'Tampa Bay Lightning' },
  'Vegas Golden Knights': { leagueId: 'NHL', club: 'Vegas Golden Knights' },
  'Montreal Canadiens': { leagueId: 'NHL', club: 'Montreal Canadiens' },
  'New York Islanders': { leagueId: 'NHL', club: 'New York Islanders' },
  'Carolina Hurricanes': { leagueId: 'NHL', club: 'Carolina Hurricanes' },
  'Washington Capitals': { leagueId: 'NHL', club: 'Washington Capitals' },
  'Dallas Stars': { leagueId: 'NHL', club: 'Dallas Stars' },
  'Colorado Avalanche': { leagueId: 'NHL', club: 'Colorado Avalanche' },
  'Boston Bruins': { leagueId: 'NHL', club: 'Boston Bruins' },
  'Philadelphia Flyers': { leagueId: 'NHL', club: 'Philadelphia Flyers' },
  'Winnipeg Jets': { leagueId: 'NHL', club: 'Winnipeg Jets' },
  'St. Louis Blues': { leagueId: 'NHL', club: 'St. Louis Blues' },
  'Los Angeles Kings': { leagueId: 'NHL', club: 'Los Angeles Kings' },
  'Vancouver Canucks': { leagueId: 'NHL', club: 'Vancouver Canucks' },
  'Minnesota Wild': { leagueId: 'NHL', club: 'Minnesota Wild' },
  'New Jersey Devils': { leagueId: 'NHL', club: 'New Jersey Devils' },
  'New York Rangers': { leagueId: 'NHL', club: 'New York Rangers' },
  'Toronto Maple Leafs': { leagueId: 'NHL', club: 'Toronto Maple Leafs' },
  'Detroit Red Wings': { leagueId: 'NHL', club: 'Detroit Red Wings' },
  'Ottawa Senators': { leagueId: 'NHL', club: 'Ottawa Senators' },
  'Buffalo Sabres': { leagueId: 'NHL', club: 'Buffalo Sabres' },
  'Chicago Blackhawks': { leagueId: 'NHL', club: 'Chicago Blackhawks' },
  'Nashville Predators': { leagueId: 'NHL', club: 'Nashville Predators' },
  'Calgary Flames': { leagueId: 'NHL', club: 'Calgary Flames' },
  'Columbus Blue Jackets': { leagueId: 'NHL', club: 'Columbus Blue Jackets' },
  'Anaheim Ducks': { leagueId: 'NHL', club: 'Anaheim Ducks' },
  'Utah Mammoth': { leagueId: 'NHL', club: 'Utah Hockey Club' },
  'Utah Hockey Club': { leagueId: 'NHL', club: 'Utah Hockey Club' },
  'Seattle Kraken': { leagueId: 'NHL', club: 'Seattle Kraken' },
  // European / other
  'Dynamo Pardubice': { leagueId: 'EXTRALIGA', club: 'Dynamo Pardubice' },
  'Spartan Praha': { leagueId: 'EXTRALIGA', club: 'Spartan Praha' },
  'Kometa Brno': { leagueId: 'EXTRALIGA', club: 'Kometa Brno' },
  'HC Litvinov': { leagueId: 'EXTRALIGA', club: 'HC Litvinov' },
  'EV Zug': { leagueId: 'SWISS_NL', club: 'EV Zug' },
  'HC Davos': { leagueId: 'SWISS_NL', club: 'HC Davos' },
  Farjestad: { leagueId: 'SHL', club: 'Färjestad BK' },
  'Farjestad BK': { leagueId: 'SHL', club: 'Färjestad BK' },
  'Brynas IF': { leagueId: 'SHL', club: 'Brynäs IF' },
  'Ocelari Trinec': { leagueId: 'EXTRALIGA', club: 'Oceláři Třinec' },
  'Servette Geneve': { leagueId: 'SWISS_NL', club: 'Servette Geneve' },
  'Bili Tygri Liberec': { leagueId: 'EXTRALIGA', club: 'Bílí Tygři Liberec' },
  Iowa: { leagueId: 'AHL', club: 'Iowa Wild' },
  'Karpat Oulu': { leagueId: 'LIIGA', club: 'Kärpät Oulu' },
  Skelleftea: { leagueId: 'SHL', club: 'Skellefteå AIK' },
  'Skelleftea AIK': { leagueId: 'SHL', club: 'Skellefteå AIK' },
  Herning: { leagueId: 'OTHER', club: 'Herning Blue Fox' },
  Tappara: { leagueId: 'LIIGA', club: 'Tappara' },
  'Rapperswil-Jona': { leagueId: 'SWISS_NL', club: 'Rapperswil-Jona Lakers' },
  'Motor Ceske': { leagueId: 'EXTRALIGA', club: 'Motor České Budějovice' },
  'Kolner Haie': { leagueId: 'DEL', club: 'Kölner Haie' },
  'Kohlner Haie': { leagueId: 'DEL', club: 'Kölner Haie' },
  JYP: { leagueId: 'LIIGA', club: 'JYP Jyväskylä' },
  Fischtown: { leagueId: 'DEL', club: 'Fischtown Pinguins' },
  Klagenfurt: { leagueId: 'ICEHL', club: 'EC-KAC Klagenfurt' },
  'Graz 99': { leagueId: 'ICEHL', club: 'Graz99ers' },
  Iserlohn: { leagueId: 'DEL', club: 'Iserlohn Roosters' },
  Pustertal: { leagueId: 'ICEHL', club: 'HC Pustertal' },
  'TPS Turkku': { leagueId: 'LIIGA', club: 'TPS Turku' },
  'TPS Turku': { leagueId: 'LIIGA', club: 'TPS Turku' },
  Rodovre: { leagueId: 'OTHER', club: 'Rødovre Mighty Bulls' },
  HV71: { leagueId: 'SHL', club: 'HV71' },
  Yekaterinburg: { leagueId: 'KHL', club: 'Avtomobilist Yekaterinburg' },
  Moskva: { leagueId: 'KHL', club: 'Dynamo Moscow' },
  Yaroslavl: { leagueId: 'KHL', club: 'Lokomotiv Yaroslavl' },
  Severestal: { leagueId: 'KHL', club: 'Severstal Cherepovets' },
  Verva: { leagueId: 'OTHER', club: 'Verva Litvínov' },
  Bratislava: { leagueId: 'OTHER', club: 'Slovan Bratislava' },
  Jukurit: { leagueId: 'LIIGA', club: 'Jukurit' },
  Ajoie: { leagueId: 'SWISS_NL', club: 'HC Ajoie' },
  Sport: { leagueId: 'OTHER', club: 'Sport Ghiaccio' },
  Grenoble: { leagueId: 'OTHER', club: 'Brûleurs de Loups' },
  Lausanne: { leagueId: 'SWISS_NL', club: 'Lausanne HC' },
  Assat: { leagueId: 'LIIGA', club: 'Ässät' },
  Ässät: { leagueId: 'LIIGA', club: 'Ässät' },
  Mountfield: { leagueId: 'EXTRALIGA', club: 'Mountfield HK' },
  Rouen: { leagueId: 'OTHER', club: 'Rouen' },
  Angers: { leagueId: 'OTHER', club: 'Angers' },
  Vitkovice: { leagueId: 'EXTRALIGA', club: 'HC Vítkovice' },
  Hameenlinna: { leagueId: 'LIIGA', club: 'Hämeenlinna' },
  Marseille: { leagueId: 'OTHER', club: 'Marseille' },
  'Kupio Kalpa': { leagueId: 'LIIGA', club: 'KalPa' },
  Davos: { leagueId: 'SWISS_NL', club: 'HC Davos' },
  Langnau: { leagueId: 'SWISS_NL', club: 'SC Langnau' },
  'Dukla Michalovce': { leagueId: 'EXTRALIGA', club: 'Dukla Michalovce' },
  Mannheim: { leagueId: 'DEL', club: 'Adler Mannheim' },
  Munchen: { leagueId: 'DEL', club: 'EHC Red Bull München' },
  München: { leagueId: 'DEL', club: 'EHC Red Bull München' },
  Abbotsford: { leagueId: 'AHL', club: 'Abbotsford Canucks' },
  Syracuse: { leagueId: 'AHL', club: 'Syracuse Crunch' },
  Berlin: { leagueId: 'DEL', club: 'Eisbären Berlin' },
  Koln: { leagueId: 'DEL', club: 'Kölner Haie' },
  Köln: { leagueId: 'DEL', club: 'Kölner Haie' },
  Ingolstadt: { leagueId: 'DEL', club: 'ERC Ingolstadt' },
  Bremerhaven: { leagueId: 'DEL', club: 'Fischtown Pinguins' },
  'ZSC Lions': { leagueId: 'SWISS_NL', club: 'ZSC Lions' },
  'ZSC Lions Zurigo': { leagueId: 'SWISS_NL', club: 'ZSC Lions Zürich' },
  Zurich: { leagueId: 'SWISS_NL', club: 'ZSC Lions Zürich' },
  Fribourg: { leagueId: 'SWISS_NL', club: 'Fribourg-Gottéron' },
  Lugano: { leagueId: 'SWISS_NL', club: 'HC Lugano' },
  Genève: { leagueId: 'SWISS_NL', club: 'Genève-Servette' },
  Zug: { leagueId: 'SWISS_NL', club: 'EV Zug' },
  'HC Bolzano': { leagueId: 'ICEHL', club: 'HC Bolzano' },
  'Ambrì Piotta': { leagueId: 'SWISS_NL', club: 'HC Ambrì-Piotta' },
  'HC Val Pusteria': { leagueId: 'ICEHL', club: 'HC Val Pusteria' },
  'Olimpija Lubiana': { leagueId: 'ICEHL', club: 'HK Olimpija Ljubljana' },
  'Schwenninger Wild Wings': {
    leagueId: 'DEL',
    club: 'Schwenninger Wild Wings',
  },
  'Rytiri Kladno': { leagueId: 'EXTRALIGA', club: 'Rytíři Kladno' },
  'Brynäs IF': { leagueId: 'SHL', club: 'Brynäs IF' },
  Kloten: { leagueId: 'SWISS_NL', club: 'Kloten Flyers' },
  Lahti: { leagueId: 'LIIGA', club: 'Pelicans Lahti' },
  'HC Presov': { leagueId: 'OTHER', club: 'HC Prešov' },
  Vorarlberg: { leagueId: 'ICEHL', club: 'Pioneers Vorarlberg' },
  Kassel: { leagueId: 'DEL', club: 'Kassel Huskies' },
  'Sparta Praha': { leagueId: 'EXTRALIGA', club: 'Sparta Praha' },
  'Karlovy Vary': { leagueId: 'EXTRALIGA', club: 'HC Karlovy Vary' },
  Olomouc: { leagueId: 'EXTRALIGA', club: 'HC Olomouc' },
  Providence: { leagueId: 'AHL', club: 'Providence Bruins' },
  'Grand Rapids': { leagueId: 'AHL', club: 'Grand Rapids Griffins' },
  Plzen: { leagueId: 'EXTRALIGA', club: 'HC Škoda Plzeň' },
  'University of Minnesota Duluth': {
    leagueId: 'OTHER',
    club: 'Minnesota Duluth',
  },
  'Leksands IF': { leagueId: 'SHL', club: 'Leksands IF' },
  'Verva Litvinov': { leagueId: 'EXTRALIGA', club: 'Verva Litvínov' },
};

function slug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function toPlayerId(name: string, existing: Set<string>): string {
  const base = slug(name);
  if (!existing.has(base)) {
    existing.add(base);
    return base;
  }
  const parts = name.split(/\s+/);
  if (parts.length >= 2) {
    const withLast = slug(parts[parts.length - 1] + ' ' + parts[0]);
    if (!existing.has(withLast)) {
      existing.add(withLast);
      return withLast;
    }
  }
  let n = 1;
  while (existing.has(`${base}-${n}`)) n++;
  existing.add(`${base}-${n}`);
  return `${base}-${n}`;
}

function resolveLeague(club: string): { leagueId: string; club: string } {
  for (const [key, val] of Object.entries(CLUB_TO_LEAGUE)) {
    if (club.toLowerCase().includes(key.toLowerCase())) return val;
  }
  return { leagueId: 'OTHER', club };
}

/** Known NHL salaries (cap hit) for 2025-26 - from Spotrac/CapFriendly */
const NHL_SALARIES: Record<string, number> = {
  'connor-mcdavid': 12_500_000,
  'nathan-mackinnon': 12_600_000,
  'auston-matthews': 13_250_000,
  'leon-draisaitl': 14_000_000,
  'mitch-marner': 10_903_000,
  'mikko-rantanen': 12_250_000,
  'elias-pettersson': 11_600_000,
  'erik-karlsson': 10_000_000,
  'william-nylander': 11_500_000,
  'david-pastrnak': 11_250_000,
  'rasmus-dahlin': 11_000_000,
  'drew-doughty': 11_000_000,
  'cale-makar': 9_000_000,
  'jack-eichel': 10_000_000,
  'matthew-tkachuk': 9_500_000,
  'brady-tkachuk': 8_142_000,
  'quinn-hughes': 7_850_000,
  'adam-fox': 9_500_000,
  'charlie-mcavoy': 9_500_000,
  'zach-werenski': 9_583_333,
  'roman-josi': 9_059_000,
  'victor-hedman': 7_875_000,
  'connor-hellebuyck': 8_500_000,
  'jake-oettinger': 4_000_000,
  'jeremy-swayman': 3_475_000,
  'sidney-crosby': 8_700_000,
  'bo-horvat': 8_500_000,
  'nick-suzuki': 7_875_000,
  'mark-stone': 9_500_000,
  'sam-reinhart': 6_500_000,
  'thomas-harley': 4_500_000,
  'josh-morrissey': 6_250_000,
  'shea-theodore': 5_200_000,
  'devon-toews': 4_100_000,
  'darcy-kuemper': 5_250_000,
  'logan-thompson': 2_000_000,
  'jordan-binnington': 6_000_000,
  'macklin-celebrini': 975_000,
  'sam-bennett': 4_400_000,
  'brandon-hagel': 4_000_000,
  'seth-jarvis': 2_975_000,
  'brad-marchand': 6_000_000,
  'tom-wilson': 5_166_667,
  'alexandre-texier': 1_800_000,
  'tomas-hertl': 8_137_500,
  'david-pastrnak': 11_250_000,
  'martin-necas': 7_500_000,
  'ondrej-palat': 5_300_000,
  'filip-hronek': 7_250_000,
  'lukas-dostal': 2_250_000,
  'dan-vladar': 2_200_000,
  'karel-vejmelka': 2_725_000,
  'nikolaj-ehlers': 6_000_000,
  'lars-eller': 2_450_000,
  'frederik-andersen': 3_400_000,
  'mads-sogaard': 1_000_000,
  'sebastian-aho': 9_750_000,
  'roope-hintz': 8_500_000,
  'mikko-rantanen': 12_250_000,
  'artturi-lehkonen': 4_500_000,
  'teuvo-teravainen': 5_400_000,
  'anton-lundell': 1_500_000,
  'eetu-luostarinen': 1_500_000,
  'kaapo-kakko': 2_200_000,
  'mikael-granlund': 5_000_000,
  'erik-haula': 3_150_000,
  'joel-armia': 3_400_000,
  'joel-kiviranta': 1_150_000,
  'oliver-kapanen': 918_333,
  'eeli-tolvanen': 1_450_000,
  'miro-heiskanen': 8_450_000,
  'esa-lindell': 5_800_000,
  'olli-maatta': 2_250_000,
  'rasmus-ristolainen': 5_100_000,
  'niko-mikkola': 2_900_000,
  'juuse-saros': 5_400_000,
  'kevin-lankinen': 1_500_000,
  'joonas-korpisalo': 3_000_000,
  'nico-hischier': 7_250_000,
  'kevin-fiala': 7_875_000,
  'timo-meier': 8_800_000,
  'philipp-kurashev': 4_500_000,
  'nino-niederreiter': 4_000_000,
  'roman-josi': 9_059_000,
  'jj-moser': 4_100_000,
  'jonas-siegenthaler': 3_400_000,
  'akira-schmid': 2_000_000,
  'jack-hughes': 8_000_000,
  'auston-matthews': 13_250_000,
  'j-t-miller': 8_000_000,
  'vincent-trocheck': 5_625_000,
  'matt-boldy': 7_000_000,
  'kyle-connor': 7_100_000,
  'jake-guentzel': 9_000_000,
  'clayton-keller': 7_150_000,
  'dylan-larkin': 8_700_000,
  'brady-tkachuk': 8_142_000,
  'matthew-tkachuk': 9_500_000,
  'brock-nelson': 6_000_000,
  'tage-thompson': 7_142_857,
  'brock-faber': 2_925_000,
  'quinn-hughes': 7_850_000,
  'charlie-mcavoy': 5_250_000,
  'noah-hanifin': 4_900_000,
  'jaccob-slavin': 5_300_000,
  'zach-werenski': 9_583_333,
  'jake-sanderson': 8_050_000,
  'jackson-lacombe': 2_000_000,
  'jesper-bratt': 6_300_000,
  'william-nylander': 11_500_000,
  'elias-pettersson': 11_600_000,
  'mika-zibanejad': 8_500_000,
  'filip-forsberg': 8_500_000,
  'adrian-kempe': 5_500_000,
  'joel-eriksson-ek': 5_250_000,
  'elias-lindholm': 7_250_000,
  'lucas-raymond': 4_275_000,
  'gabriel-landeskog': 7_000_000,
  'rickard-rakell': 5_000_000,
  'alexander-wennberg': 4_500_000,
  'marcus-johansson': 3_000_000,
  'pontus-holmberg': 1_500_000,
  'rasmus-andersson': 4_600_000,
  'philip-broberg': 2_000_000,
  'rasmus-dahlin': 11_000_000,
  'oliver-ekman-larsson': 3_500_000,
  'gustav-forsling': 5_500_000,
  'victor-hedman': 7_875_000,
  'erik-karlsson': 10_000_000,
  'hampus-lindholm': 6_500_000,
  'filip-gustavsson': 3_750_000,
  'jacob-markstrom': 6_000_000,
  'jesper-wallstedt': 1_533_333,
};

function getSalary(
  playerId: string,
  leagueId: string,
  isStarter: boolean,
): { salaryUsd: number; salaryEstimated: boolean } {
  const key = playerId.toLowerCase();
  const known = NHL_SALARIES[key];
  if (known != null) return { salaryUsd: known, salaryEstimated: false };
  if (leagueId === 'NHL') {
    const est = isStarter ? 6_000_000 : 2_500_000;
    return { salaryUsd: est, salaryEstimated: true };
  }
  const est = getEstimatedSalary(leagueId);
  return { salaryUsd: Math.round(est), salaryEstimated: true };
}

/** Salary for ranking only (no isStarter needed); national-team players are top performers. */
function getRankingSalary(
  name: string,
  leagueId: string,
  raw: RawPlayer,
): number {
  if (raw.salaryUsd != null) return raw.salaryUsd;
  const key = slug(name);
  const known = NHL_SALARIES[key];
  if (known != null) return known;
  if (leagueId === 'NHL') return 4_000_000;
  return getEstimatedSalary(leagueId);
}

/**
 * Build rank (0 = best) per player by league tier + salary. National-team players are
 * typically top lines on their club teams; worse players are not selected.
 */
function buildPositionRanks(raw: RawPlayer[]): Map<number, number> {
  const result = new Map<number, number>();
  const withScore = raw.map((p, i) => {
    const { leagueId } = resolveLeague(p.club);
    const salary = getRankingSalary(p.name, leagueId, p);
    const tier = getLeagueTierWeight(leagueId);
    return { i, position: p.position, score: tier * 1e9 + salary };
  });
  const forwards = withScore
    .filter((x) => x.position !== 'D' && x.position !== 'G')
    .sort((a, b) => b.score - a.score);
  const defensemen = withScore
    .filter((x) => x.position === 'D')
    .sort((a, b) => b.score - a.score);
  const goalies = withScore
    .filter((x) => x.position === 'G')
    .sort((a, b) => b.score - a.score);
  forwards.forEach((x, rank) => result.set(x.i, rank));
  defensemen.forEach((x, rank) => result.set(x.i, rank));
  goalies.forEach((x, rank) => result.set(x.i, rank));
  return result;
}

/**
 * Build club line/role rank (0 = best) per player within their club. National-team
 * players are typically top performers on their club; rank within club determines
 * club line (1L vs 4L etc).
 */
function buildClubRanks(
  raw: RawPlayer[],
  resolveClub: (club: string) => { leagueId: string; club: string },
): Map<number, number> {
  const withScore = raw.map((p, i) => {
    const { leagueId, club } = resolveClub(p.club);
    const salary = getRankingSalary(p.name, leagueId, p);
    const tier = getLeagueTierWeight(leagueId);
    return {
      i,
      position: p.position,
      clubKey: `${leagueId}:${club}`,
      score: tier * 1e9 + salary,
    };
  });
  const byClub = new Map<string, typeof withScore>();
  for (const x of withScore) {
    const list = byClub.get(x.clubKey) ?? [];
    list.push(x);
    byClub.set(x.clubKey, list);
  }
  const result = new Map<number, number>();
  for (const list of byClub.values()) {
    const forwards = list
      .filter((x) => x.position !== 'D' && x.position !== 'G')
      .sort((a, b) => b.score - a.score);
    const defensemen = list
      .filter((x) => x.position === 'D')
      .sort((a, b) => b.score - a.score);
    const goalies = list
      .filter((x) => x.position === 'G')
      .sort((a, b) => b.score - a.score);
    forwards.forEach((x, rank) => result.set(x.i, rank));
    defensemen.forEach((x, rank) => result.set(x.i, rank));
    goalies.forEach((x, rank) => result.set(x.i, rank));
  }
  return result;
}

function assignLineRole(
  players: RawPlayer[],
  index: number,
  nationalRankByIndex: Map<number, number>,
  clubRankByIndex: Map<number, number>,
  nhlClubLines: Record<string, Record<string, { line: Line; role: Role }>>,
): { line: Line; role: Role; nationalLine: NationalPosition } {
  const natRank = nationalRankByIndex.get(index) ?? 0;
  const clubRank = clubRankByIndex.get(index) ?? 0;
  const p = players[index]!;
  const nationalLine: NationalPosition =
    p.position === 'G'
      ? natRank === 0
        ? 'G1'
        : 'G2'
      : p.position === 'D'
        ? natRank < 4
          ? 'D1'
          : 'D2'
        : natRank < 3
          ? 'L1'
          : natRank < 6
            ? 'L2'
            : natRank < 9
              ? 'L3'
              : 'L4';

  const { leagueId, club } = resolveLeague(p.club);
  const official = leagueId === 'NHL' && nhlClubLines[club]?.[p.name];
  if (official) {
    return { line: official.line, role: official.role, nationalLine };
  }

  if (p.position === 'G') {
    return {
      line: clubRank === 0 ? 'starterG' : 'backupG',
      role: clubRank === 0 ? 'starter' : 'backup',
      nationalLine,
    };
  }
  if (p.position === 'D') {
    return {
      line: clubRank < 4 ? 'top4D' : 'bottomD',
      role: clubRank < 4 ? 'top4' : 'bottom2',
      nationalLine,
    };
  }
  const line: Line =
    clubRank < 3 ? '1L' : clubRank < 6 ? '2L' : clubRank < 9 ? '3L' : '4L';
  const role: Role = clubRank < 6 ? 'top6' : 'bottom6';
  return { line, role, nationalLine };
}

function buildRoster(
  teamId: string,
  raw: RawPlayer[],
  nhlClubLines: Record<string, Record<string, { line: Line; role: Role }>>,
): Array<Record<string, unknown>> {
  const ids = new Set<string>();
  const nationalRankByIndex = buildPositionRanks(raw);
  const clubRankByIndex = buildClubRanks(raw, resolveLeague);
  const players: Array<Record<string, unknown>> = [];
  for (let i = 0; i < raw.length; i++) {
    const r = raw[i]!;
    const { leagueId, club } = resolveLeague(r.club);
    const playerId = toPlayerId(r.name, ids);
    const { line, role, nationalLine } = assignLineRole(
      raw,
      i,
      nationalRankByIndex,
      clubRankByIndex,
      nhlClubLines,
    );
    const isStarter =
      (r.position === 'G' &&
        raw.filter((x) => x.position === 'G').indexOf(r) === 0) ||
      (r.position !== 'G' && i < 10);
    const { salaryUsd, salaryEstimated } =
      r.salaryUsd != null
        ? {
            salaryUsd: r.salaryUsd,
            salaryEstimated: r.salaryEstimated ?? false,
          }
        : getSalary(playerId, leagueId, isStarter);
    players.push({
      playerId,
      playerName: r.name,
      position: r.position,
      leagueId,
      club,
      salaryUsd,
      salaryEstimated,
      line,
      role,
      nationalLine,
    });
  }
  // Always order by playerId so roster JSON diffs show real changes (see AGENTS.md)
  players.sort((a, b) => String(a.playerId).localeCompare(String(b.playerId)));
  return players;
}

// ============ OFFICIAL ROSTERS (NHL.com Feb 2026) ============

const ROSTERS: Record<string, RawPlayer[]> = {
  CAN: [
    { name: 'Sam Bennett', position: 'C', club: 'Florida Panthers' },
    { name: 'Macklin Celebrini', position: 'C', club: 'San Jose Sharks' },
    { name: 'Sidney Crosby', position: 'C', club: 'Pittsburgh Penguins' },
    { name: 'Brandon Hagel', position: 'LW', club: 'Tampa Bay Lightning' },
    { name: 'Bo Horvat', position: 'C', club: 'New York Islanders' },
    { name: 'Seth Jarvis', position: 'C', club: 'Carolina Hurricanes' },
    { name: 'Nathan MacKinnon', position: 'C', club: 'Colorado Avalanche' },
    { name: 'Brad Marchand', position: 'LW', club: 'Florida Panthers' },
    { name: 'Mitch Marner', position: 'RW', club: 'Vegas Golden Knights' },
    { name: 'Connor McDavid', position: 'C', club: 'Edmonton Oilers' },
    { name: 'Sam Reinhart', position: 'C', club: 'Florida Panthers' },
    { name: 'Mark Stone', position: 'RW', club: 'Vegas Golden Knights' },
    { name: 'Nick Suzuki', position: 'C', club: 'Montreal Canadiens' },
    { name: 'Tom Wilson', position: 'RW', club: 'Washington Capitals' },
    { name: 'Drew Doughty', position: 'D', club: 'Los Angeles Kings' },
    { name: 'Thomas Harley', position: 'D', club: 'Dallas Stars' },
    { name: 'Cale Makar', position: 'D', club: 'Colorado Avalanche' },
    { name: 'Josh Morrissey', position: 'D', club: 'Winnipeg Jets' },
    { name: 'Colton Parayko', position: 'D', club: 'St. Louis Blues' },
    { name: 'Travis Sanheim', position: 'D', club: 'Philadelphia Flyers' },
    { name: 'Shea Theodore', position: 'D', club: 'Vegas Golden Knights' },
    { name: 'Devon Toews', position: 'D', club: 'Colorado Avalanche' },
    { name: 'Jordan Binnington', position: 'G', club: 'St. Louis Blues' },
    { name: 'Darcy Kuemper', position: 'G', club: 'Los Angeles Kings' },
    { name: 'Logan Thompson', position: 'G', club: 'Washington Capitals' },
  ],
  USA: [
    { name: 'Matt Boldy', position: 'LW', club: 'Minnesota Wild' },
    { name: 'Kyle Connor', position: 'LW', club: 'Winnipeg Jets' },
    { name: 'Jack Eichel', position: 'C', club: 'Vegas Golden Knights' },
    { name: 'Jack Hughes', position: 'C', club: 'New Jersey Devils' },
    { name: 'Jake Guentzel', position: 'LW', club: 'Tampa Bay Lightning' },
    { name: 'Clayton Keller', position: 'C', club: 'Utah Mammoth' },
    { name: 'Dylan Larkin', position: 'C', club: 'Detroit Red Wings' },
    { name: 'Auston Matthews', position: 'C', club: 'Toronto Maple Leafs' },
    { name: 'J.T. Miller', position: 'C', club: 'New York Rangers' },
    { name: 'Brock Nelson', position: 'C', club: 'Colorado Avalanche' },
    { name: 'Brady Tkachuk', position: 'LW', club: 'Ottawa Senators' },
    { name: 'Matthew Tkachuk', position: 'LW', club: 'Florida Panthers' },
    { name: 'Tage Thompson', position: 'C', club: 'Buffalo Sabres' },
    { name: 'Vincent Trocheck', position: 'C', club: 'New York Rangers' },
    { name: 'Brock Faber', position: 'D', club: 'Minnesota Wild' },
    { name: 'Noah Hanifin', position: 'D', club: 'Vegas Golden Knights' },
    { name: 'Quinn Hughes', position: 'D', club: 'Minnesota Wild' },
    { name: 'Jackson LaCombe', position: 'D', club: 'Anaheim Ducks' },
    { name: 'Charlie McAvoy', position: 'D', club: 'Boston Bruins' },
    { name: 'Jake Sanderson', position: 'D', club: 'Ottawa Senators' },
    { name: 'Jaccob Slavin', position: 'D', club: 'Carolina Hurricanes' },
    { name: 'Zach Werenski', position: 'D', club: 'Columbus Blue Jackets' },
    { name: 'Connor Hellebuyck', position: 'G', club: 'Winnipeg Jets' },
    { name: 'Jake Oettinger', position: 'G', club: 'Dallas Stars' },
    { name: 'Jeremy Swayman', position: 'G', club: 'Boston Bruins' },
  ],
  SWE: [
    { name: 'Jesper Bratt', position: 'LW', club: 'New Jersey Devils' },
    { name: 'Joel Eriksson Ek', position: 'C', club: 'Minnesota Wild' },
    { name: 'Filip Forsberg', position: 'LW', club: 'Nashville Predators' },
    { name: 'Pontus Holmberg', position: 'C', club: 'Tampa Bay Lightning' },
    { name: 'Marcus Johansson', position: 'LW', club: 'Minnesota Wild' },
    { name: 'Adrian Kempe', position: 'LW', club: 'Los Angeles Kings' },
    { name: 'Gabriel Landeskog', position: 'LW', club: 'Colorado Avalanche' },
    { name: 'Elias Lindholm', position: 'C', club: 'Boston Bruins' },
    { name: 'William Nylander', position: 'RW', club: 'Toronto Maple Leafs' },
    { name: 'Elias Pettersson', position: 'C', club: 'Vancouver Canucks' },
    { name: 'Rickard Rakell', position: 'RW', club: 'Pittsburgh Penguins' },
    { name: 'Lucas Raymond', position: 'LW', club: 'Detroit Red Wings' },
    { name: 'Alexander Wennberg', position: 'C', club: 'San Jose Sharks' },
    { name: 'Mika Zibanejad', position: 'C', club: 'New York Rangers' },
    { name: 'Rasmus Andersson', position: 'D', club: 'Vegas Golden Knights' },
    { name: 'Philip Broberg', position: 'D', club: 'St. Louis Blues' },
    { name: 'Rasmus Dahlin', position: 'D', club: 'Buffalo Sabres' },
    {
      name: 'Oliver Ekman-Larsson',
      position: 'D',
      club: 'Toronto Maple Leafs',
    },
    { name: 'Gustav Forsling', position: 'D', club: 'Florida Panthers' },
    { name: 'Victor Hedman', position: 'D', club: 'Tampa Bay Lightning' },
    { name: 'Erik Karlsson', position: 'D', club: 'Pittsburgh Penguins' },
    { name: 'Hampus Lindholm', position: 'D', club: 'Boston Bruins' },
    { name: 'Filip Gustavsson', position: 'G', club: 'Minnesota Wild' },
    { name: 'Jacob Markstrom', position: 'G', club: 'New Jersey Devils' },
    { name: 'Jesper Wallstedt', position: 'G', club: 'Minnesota Wild' },
  ],
  FIN: [
    { name: 'Joel Armia', position: 'RW', club: 'Los Angeles Kings' },
    { name: 'Sebastian Aho', position: 'C', club: 'Carolina Hurricanes' },
    { name: 'Mikael Granlund', position: 'C', club: 'Anaheim Ducks' },
    { name: 'Erik Haula', position: 'C', club: 'Nashville Predators' },
    { name: 'Roope Hintz', position: 'C', club: 'Dallas Stars' },
    { name: 'Kaapo Kakko', position: 'RW', club: 'Seattle Kraken' },
    { name: 'Oliver Kapanen', position: 'C', club: 'Montreal Canadiens' },
    { name: 'Joel Kiviranta', position: 'LW', club: 'Colorado Avalanche' },
    { name: 'Artturi Lehkonen', position: 'LW', club: 'Colorado Avalanche' },
    { name: 'Anton Lundell', position: 'C', club: 'Florida Panthers' },
    { name: 'Eetu Luostarinen', position: 'C', club: 'Florida Panthers' },
    { name: 'Mikko Rantanen', position: 'RW', club: 'Dallas Stars' },
    { name: 'Teuvo Teravainen', position: 'RW', club: 'Chicago Blackhawks' },
    { name: 'Eeli Tolvanen', position: 'RW', club: 'Seattle Kraken' },
    { name: 'Miro Heiskanen', position: 'D', club: 'Dallas Stars' },
    { name: 'Henri Jokiharju', position: 'D', club: 'Boston Bruins' },
    { name: 'Mikko Lehtonen', position: 'D', club: 'ZSC Lions' },
    { name: 'Esa Lindell', position: 'D', club: 'Dallas Stars' },
    { name: 'Olli Maatta', position: 'D', club: 'Utah Mammoth' },
    { name: 'Nikolas Matinpalo', position: 'D', club: 'Ottawa Senators' },
    { name: 'Niko Mikkola', position: 'D', club: 'Florida Panthers' },
    { name: 'Rasmus Ristolainen', position: 'D', club: 'Philadelphia Flyers' },
    { name: 'Joonas Korpisalo', position: 'G', club: 'Boston Bruins' },
    { name: 'Kevin Lankinen', position: 'G', club: 'Vancouver Canucks' },
    { name: 'Juuse Saros', position: 'G', club: 'Nashville Predators' },
  ],
  CZE: [
    { name: 'Roman Cervenka', position: 'C', club: 'Dynamo Pardubice' },
    { name: 'Filip Chlapik', position: 'C', club: 'Spartan Praha' },
    { name: 'Radek Faksa', position: 'C', club: 'Dallas Stars' },
    { name: 'Jakub Flek', position: 'C', club: 'Kometa Brno' },
    { name: 'Tomas Hertl', position: 'C', club: 'Vegas Golden Knights' },
    { name: 'David Kampf', position: 'C', club: 'Vancouver Canucks' },
    { name: 'Ondrej Kase', position: 'RW', club: 'HC Litvinov' },
    { name: 'Dominik Kubalik', position: 'LW', club: 'EV Zug' },
    { name: 'Martin Necas', position: 'C', club: 'Colorado Avalanche' },
    { name: 'Ondrej Palat', position: 'LW', club: 'New York Islanders' },
    { name: 'David Pastrnak', position: 'RW', club: 'Boston Bruins' },
    { name: 'Lukas Sedlak', position: 'C', club: 'Dynamo Pardubice' },
    { name: 'Matej Stransky', position: 'RW', club: 'HC Davos' },
    { name: 'David Tomasek', position: 'C', club: 'Farjestad' },
    { name: 'Radko Gudas', position: 'D', club: 'Anaheim Ducks' },
    { name: 'Filip Hronek', position: 'D', club: 'Vancouver Canucks' },
    { name: 'Michal Kempny', position: 'D', club: 'Brynas IF' },
    { name: 'Tomas Kundratek', position: 'D', club: 'Ocelari Trinec' },
    { name: 'Jan Rutta', position: 'D', club: 'Servette Geneve' },
    { name: 'Radim Simek', position: 'D', club: 'Bili Tygri Liberec' },
    { name: 'David Spacek', position: 'D', club: 'Iowa' },
    { name: 'Jiri Tichacek', position: 'D', club: 'Karpat Oulu' },
    { name: 'Lukas Dostal', position: 'G', club: 'Anaheim Ducks' },
    { name: 'Karel Vejmelka', position: 'G', club: 'Utah Mammoth' },
    { name: 'Dan Vladar', position: 'G', club: 'Philadelphia Flyers' },
  ],
  DEN: [
    { name: 'Mikkal Aagaard', position: 'C', club: 'Skelleftea' },
    { name: 'Mathias Bau', position: 'C', club: 'Herning' },
    { name: 'Oliver Bjorkstrand', position: 'RW', club: 'Tampa Bay Lightning' },
    { name: 'Joachim Blichfeld', position: 'LW', club: 'Tappara' },
    { name: 'Nikolaj Ehlers', position: 'LW', club: 'Carolina Hurricanes' },
    { name: 'Lars Eller', position: 'C', club: 'Ottawa Senators' },
    { name: 'Oscar Fisker Molgaard', position: 'C', club: 'Seattle Kraken' },
    { name: 'Nicklas Jensen', position: 'LW', club: 'Rapperswil-Jona' },
    { name: 'Nick Olesen', position: 'C', club: 'Motor Ceske' },
    { name: 'Morten Poulsen', position: 'C', club: 'Herning' },
    { name: 'Patrick Russell', position: 'RW', club: 'Kolner Haie' },
    { name: 'Frederik Storm', position: 'LW', club: 'Kolner Haie' },
    { name: 'Alexander True', position: 'C', club: 'JYP' },
    { name: 'Christian Wejse', position: 'C', club: 'Fischtown' },
    { name: 'Phillip Bruggisser', position: 'D', club: 'Fischtown' },
    { name: 'Jesper Jensen Aabo', position: 'D', club: 'Klagenfurt' },
    { name: 'Nicholas B Jensen', position: 'D', club: 'Fischtown' },
    { name: 'Anders Koch', position: 'D', club: 'Graz 99' },
    { name: 'Matias Lassen', position: 'D', club: 'Iserlohn' },
    { name: 'Markus Lauridsen', position: 'D', club: 'Pustertal' },
    { name: 'Oliver Lauridsen', position: 'D', club: 'TPS Turkku' },
    { name: 'Malte Setkov', position: 'D', club: 'Rodovre' },
    { name: 'Frederik Andersen', position: 'G', club: 'Carolina Hurricanes' },
    { name: 'Frederik Dichow', position: 'G', club: 'HV71' },
    { name: 'Mads Sogaard', position: 'G', club: 'Ottawa Senators' },
  ],
  GER: [
    { name: 'Leon Draisaitl', position: 'C', club: 'Edmonton Oilers' },
    { name: 'Alexander Ehl', position: 'C', club: 'Mannheim' },
    { name: 'Dominik Kahun', position: 'C', club: 'Lausanne' },
    { name: 'Marc Michaelis', position: 'C', club: 'Mannheim' },
    { name: 'JJ Peterka', position: 'RW', club: 'Utah Mammoth' },
    { name: 'Lukas Reichel', position: 'LW', club: 'Abbotsford' },
    { name: 'Tobias Rieder', position: 'RW', club: 'Munchen' },
    { name: 'Josh Samanski', position: 'C', club: 'Edmonton Oilers' },
    { name: 'Justin Schütz', position: 'LW', club: 'Munchen' },
    { name: 'Wojciech Stachowiak', position: 'LW', club: 'Syracuse' },
    { name: 'Tim Stützle', position: 'C', club: 'Ottawa Senators' },
    { name: 'Nico Sturm', position: 'C', club: 'Minnesota Wild' },
    { name: 'Frederik Tiffels', position: 'LW', club: 'Berlin' },
    { name: 'Parker Tuomie', position: 'RW', club: 'Koln' },
    { name: 'Leon Gawanke', position: 'D', club: 'Mannheim' },
    { name: 'Korbinian Geibel', position: 'D', club: 'Berlin' },
    { name: 'Lukas Kälble', position: 'D', club: 'Mannheim' },
    { name: 'Jonas Muller', position: 'D', club: 'Berlin' },
    { name: 'Moritz Muller', position: 'D', club: 'Koln' },
    { name: 'Moritz Seider', position: 'D', club: 'Detroit Red Wings' },
    { name: 'Fabio Wagner', position: 'D', club: 'Ingolstadt' },
    { name: 'Kai Wissman', position: 'D', club: 'Berlin' },
    { name: 'Maximilian Franzreb', position: 'G', club: 'Mannheim' },
    { name: 'Philipp Grubauer', position: 'G', club: 'Seattle Kraken' },
    { name: 'Mathias Niederberger', position: 'G', club: 'Munchen' },
  ],
  SUI: [
    { name: 'Sven Andrighetto', position: 'RW', club: 'Zurich' },
    { name: 'Christoph Bertschy', position: 'C', club: 'Fribourg' },
    { name: 'Kevin Fiala', position: 'LW', club: 'Los Angeles Kings' },
    { name: 'Nico Hischier', position: 'C', club: 'New Jersey Devils' },
    { name: 'Ken Jager', position: 'C', club: 'Lausanne' },
    { name: 'Simon Knak', position: 'LW', club: 'Davos' },
    { name: 'Philipp Kurashev', position: 'C', club: 'San Jose Sharks' },
    { name: 'Denis Malgin', position: 'C', club: 'Zurich' },
    { name: 'Timo Meier', position: 'RW', club: 'New Jersey Devils' },
    { name: 'Nino Niederreiter', position: 'LW', club: 'Winnipeg Jets' },
    { name: 'Damien Riat', position: 'LW', club: 'Lausanne' },
    { name: 'Sandro Schmid', position: 'C', club: 'Fribourg' },
    { name: 'Pius Suter', position: 'C', club: 'St. Louis Blues' },
    { name: 'Calvin Thurkauf', position: 'LW', club: 'Lugano' },
    { name: 'Tim Berni', position: 'D', club: 'Genève' },
    { name: 'Michael Fora', position: 'D', club: 'Davos' },
    { name: 'Andrea Glauser', position: 'D', club: 'Fribourg' },
    { name: 'Roman Josi', position: 'D', club: 'Nashville Predators' },
    { name: 'Dean Kukan', position: 'D', club: 'Zurich' },
    { name: 'Christian Marti', position: 'D', club: 'Zurich' },
    { name: 'J.J. Moser', position: 'D', club: 'Tampa Bay Lightning' },
    { name: 'Jonas Siegenthaler', position: 'D', club: 'New Jersey Devils' },
    { name: 'Reto Berra', position: 'G', club: 'Fribourg' },
    { name: 'Leonardo Genoni', position: 'G', club: 'Zug' },
    { name: 'Akira Schmid', position: 'G', club: 'Vegas Golden Knights' },
  ],
  SVK: [
    { name: 'Peter Cehlarik', position: 'LW', club: 'Leksands IF' },
    { name: 'Lukas Cingel', position: 'C', club: 'Kometa Brno' },
    { name: 'Dalibor Dvorsky', position: 'C', club: 'St. Louis Blues' },
    { name: 'Libor Hudacek', position: 'C', club: 'Ocelari Trinec' },
    { name: 'Milos Kelemen', position: 'RW', club: 'Dynamo Pardubice' },
    { name: 'Adam Liska', position: 'LW', club: 'Severestal' },
    { name: 'Oliver Okuliar', position: 'LW', club: 'Skelleftea AIK' },
    { name: 'Martin Pospisil', position: 'RW', club: 'Calgary Flames' },
    { name: 'Pavol Regenda', position: 'LW', club: 'San Jose Sharks' },
    { name: 'Adam Ruzicka', position: 'C', club: 'Moskva' },
    { name: 'Juraj Slafkovsky', position: 'LW', club: 'Montreal Canadiens' },
    { name: 'Matus Sukel', position: 'C', club: 'Verva' },
    { name: 'Samuel Takac', position: 'C', club: 'Bratislava' },
    { name: 'Tomas Tatar', position: 'LW', club: 'EV Zug' },
    { name: 'Peter Ceresnak', position: 'D', club: 'Dynamo Pardubice' },
    { name: 'Erik Cernak', position: 'D', club: 'Tampa Bay Lightning' },
    { name: 'Martin Fehervary', position: 'D', club: 'Washington Capitals' },
    { name: 'Martin Gernat', position: 'D', club: 'Yaroslavl' },
    { name: 'Michal Ivan', position: 'D', club: 'Bili Tygri Liberec' },
    { name: 'Patrik Koch', position: 'D', club: 'Ocelari Trinec' },
    { name: 'Martin Marincin', position: 'D', club: 'Ocelari Trinec' },
    { name: 'Simon Nemec', position: 'D', club: 'New Jersey Devils' },
    {
      name: 'Adam Gajan',
      position: 'G',
      club: 'University of Minnesota Duluth',
    },
    { name: 'Samuel Hlavaj', position: 'G', club: 'Iowa' },
    { name: 'Stanislav Skorvanek', position: 'G', club: 'Mountfield' },
  ],
  LAT: [
    { name: 'Oskars Batna', position: 'C', club: 'Lahti' },
    { name: 'Rudolfs Balcers', position: 'LW', club: 'Zurich' },
    { name: 'Teddy Blueger', position: 'C', club: 'Vancouver Canucks' },
    { name: 'Rihards Bukarts', position: 'C', club: 'HC Presov' },
    { name: 'Roberts Bukarts', position: 'LW', club: 'Vorarlberg' },
    { name: 'Kaspars Daugavins', position: 'C', club: 'Kassel' },
    { name: 'Martins Dzierkals', position: 'LW', club: 'Sparta Praha' },
    { name: 'Haralds Egle', position: 'LW', club: 'Karlovy Vary' },
    { name: 'Zemgus Girgensons', position: 'LW', club: 'Tampa Bay Lightning' },
    { name: 'Renars Krastenbergs', position: 'RW', club: 'Olomouc' },
    { name: 'Dans Locmelis', position: 'C', club: 'Providence' },
    { name: 'Anri Ravinskis', position: 'C', club: 'Abbotsford' },
    { name: 'Eduards Tralmaks', position: 'LW', club: 'Grand Rapids' },
    { name: 'Sandis Vilmanis', position: 'LW', club: 'Florida Panthers' },
    { name: 'Uvis Balinskis', position: 'D', club: 'Florida Panthers' },
    { name: 'Oskars Cibulskis', position: 'D', club: 'Herning' },
    { name: 'Ralfs Freibergs', position: 'D', club: 'Vitkovice' },
    { name: 'Janis Jaks', position: 'D', club: 'Karlovy Vary' },
    { name: 'Roberts Mamcics', position: 'D', club: 'Karlovy Vary' },
    { name: 'Kristaps Rubins', position: 'D', club: 'Plzen' },
    { name: 'Alberts Smits', position: 'D', club: 'Jukurit' },
    { name: 'Kristaps Zile', position: 'D', club: 'Bili Tygri Liberec' },
    { name: 'Kristers Gudlevskis', position: 'G', club: 'Bremerhaven' },
    { name: 'Elvis Merzlikins', position: 'G', club: 'Columbus Blue Jackets' },
    { name: 'Arturs Silovs', position: 'G', club: 'Pittsburgh Penguins' },
  ],
  FRA: [
    { name: 'Justin Addamo', position: 'RW', club: 'Jukurit' },
    { name: 'Pierre-Édouard Bellemare', position: 'C', club: 'Ajoie' },
    { name: 'Charles Bertrand', position: 'D', club: 'Sport' },
    { name: 'Louis Boudon', position: 'C', club: 'Jukurit' },
    { name: 'Kévin Bozon', position: 'LW', club: 'Ajoie' },
    { name: 'Stéphane Da Costa', position: 'C', club: 'Yekaterinburg' },
    { name: 'Aurélien Dair', position: 'D', club: 'Grenoble' },
    { name: 'Floran Douay', position: 'LW', club: 'Lausanne' },
    { name: 'Dylan Fabre', position: 'C', club: 'Assat' },
    { name: 'Jordann Perret', position: 'LW', club: 'Mountfield' },
    { name: 'Anthony Rech', position: 'RW', club: 'Rouen' },
    { name: 'Nicolas Ritz', position: 'D', club: 'Angers' },
    { name: 'Alexandre Texier', position: 'C', club: 'Montreal Canadiens' },
    { name: 'Sacha Treille', position: 'LW', club: 'Grenoble' },
    { name: 'Yohann Auvitu', position: 'D', club: 'Vitkovice' },
    { name: 'Jules Boscq', position: 'D', club: 'Hameenlinna' },
    { name: 'Enzo Cantagallo', position: 'D', club: 'Marseille' },
    { name: 'Florian Chakiachvili', position: 'D', club: 'Rouen' },
    { name: 'Pierre Crinon', position: 'D', club: 'Grenoble' },
    { name: 'Hugo Gallet', position: 'D', club: 'Kupio Kalpa' },
    { name: 'Enzo Guebey', position: 'D', club: 'Davos' },
    { name: 'Thomas Thiry', position: 'D', club: 'Ajoie' },
    { name: 'Julian Junca', position: 'G', club: 'Dukla Michalovce' },
    { name: 'Antoine Keller', position: 'G', club: 'Ajoie' },
    { name: 'Martin Neckar', position: 'G', club: 'Langnau' },
  ],
  ITA: [
    { name: 'Matthew Bradley', position: 'C', club: 'HC Bolzano' },
    { name: 'Tommaso De Luca', position: 'C', club: 'Ambrì Piotta' },
    { name: 'Cristiano DiGiacinto', position: 'LW', club: 'HC Bolzano' },
    { name: 'Luca Frigo', position: 'C', club: 'HC Bolzano' },
    { name: 'Mikael Frycklund', position: 'C', club: 'HC Val Pusteria' },
    { name: 'Dustin Gazley', position: 'C', club: 'HC Bolzano' },
    { name: 'Diego Kostner', position: 'C', club: 'Ambrì Piotta' },
    { name: 'Daniel Mantenuto', position: 'C', club: 'HC Bolzano' },
    { name: 'Giovanni Morini', position: 'RW', club: 'Lugano' },
    { name: 'Alexander Petan', position: 'C', club: 'Olimpija Lubiana' },
    { name: 'Tommy Purdeller', position: 'RW', club: 'HC Val Pusteria' },
    { name: 'Nick Saracino', position: 'RW', club: 'HC Val Pusteria' },
    { name: 'Alessandro Segafredo', position: 'D', club: 'ZSC Lions Zurigo' },
    { name: 'Marco Zanetti', position: 'C', club: 'Lugano' },
    { name: 'Dylan Di Perna', position: 'D', club: 'HC Bolzano' },
    { name: 'Gregory Di Tomaso', position: 'D', club: 'HC Val Pusteria' },
    { name: 'Daniel Glira', position: 'D', club: 'HC Val Pusteria' },
    { name: 'Thomas Larkin', position: 'D', club: 'Schwenninger Wild Wings' },
    { name: 'Phil Pietroniro', position: 'D', club: 'Rytiri Kladno' },
    { name: 'Jason Seed', position: 'D', club: 'HC Bolzano' },
    { name: 'Alex Trivellato', position: 'D', club: 'Schwenninger Wild Wings' },
    { name: 'Luca Zanatta', position: 'D', club: 'HC Val Pusteria' },
    { name: 'Damian Clara', position: 'G', club: 'Brynäs IF' },
    { name: 'Davide Fadani', position: 'G', club: 'Kloten' },
    { name: 'Gianluca Vallini', position: 'G', club: 'HC Bolzano' },
  ],
};

function main(): void {
  fs.mkdirSync(OLYMPICS_DIR, { recursive: true });
  const nhlClubLines = loadNhlClubLines();
  const teamIds = Object.keys(ROSTERS);
  for (const teamId of teamIds) {
    const raw = ROSTERS[teamId]!;
    const players = buildRoster(teamId, raw, nhlClubLines);
    const data = {
      teamId,
      competitionId: 'olympics-2026',
      players,
    };
    fs.writeFileSync(
      path.join(OLYMPICS_DIR, `${teamId}.json`),
      JSON.stringify(data, null, 2),
    );
    console.log(`Wrote ${teamId}.json (${players.length} players)`);
  }
  const summary = {
    competitionId: 'olympics-2026',
    competitionName: 'Winter Olympics 2026',
    year: 2026,
    teams: teamIds.map((id) => {
      const roster = JSON.parse(
        fs.readFileSync(path.join(OLYMPICS_DIR, `${id}.json`), 'utf8'),
      ) as { teamId: string; players: Array<Record<string, unknown>> };
      const m = getTeamMetrics(roster);
      return {
        teamId: m.teamId,
        totalSalary: m.totalSalary,
        totalScore: m.totalScore,
        playerCount: m.playerCount,
      };
    }),
  };
  fs.writeFileSync(
    path.join(COMP_DIR, 'olympics-2026.json'),
    JSON.stringify(summary, null, 2),
  );
  console.log(`Wrote olympics-2026.json`);
}

main();
