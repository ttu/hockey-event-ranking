/**
 * NHL/league club name -> logo URL.
 * NHL logos: https://assets.nhle.com/logos/nhl/svg/{TEAM}_light.svg
 * League logos (SHL, Swiss NL) as fallback when no club logo available.
 */

/** League logos (fallback for non-NHL leagues). Liiga: SM-liiga 2025 logo (fi.wikipedia.org). */
const LEAGUE_LOGOS: Record<string, string> = {
  LIIGA:
    'https://upload.wikimedia.org/wikipedia/fi/b/b9/Jaakiekon_sm-liiga_logo_2025.svg',
  SHL: 'https://upload.wikimedia.org/wikipedia/commons/9/98/Swedish_Hockey_League_logo.svg',
  SWISS_NL:
    'https://upload.wikimedia.org/wikipedia/commons/e/e7/Swiss_National_League_Logo.svg',
};

const CLUB_TO_ABBREV: Record<string, string> = {
  'Edmonton Oilers': 'EDM',
  'Colorado Avalanche': 'COL',
  'Pittsburgh Penguins': 'PIT',
  'Tampa Bay Lightning': 'TBL',
  'Toronto Maple Leafs': 'TOR',
  'Boston Bruins': 'BOS',
  'Vegas Golden Knights': 'VGK',
  'Florida Panthers': 'FLA',
  'Carolina Hurricanes': 'CAR',
  'Philadelphia Flyers': 'PHI',
  'Montreal Canadiens': 'MTL',
  'Los Angeles Kings': 'LAK',
  'St. Louis Blues': 'STL',
  'Winnipeg Jets': 'WPG',
  'Vancouver Canucks': 'VAN',
  'New York Rangers': 'NYR',
  'New Jersey Devils': 'NJD',
  'Detroit Red Wings': 'DET',
  'New York Islanders': 'NYI',
  'Minnesota Wild': 'MIN',
  'Ottawa Senators': 'OTT',
  'Columbus Blue Jackets': 'CBJ',
  'Dallas Stars': 'DAL',
  'Nashville Predators': 'NSH',
  'Anaheim Ducks': 'ANA',
  'Calgary Flames': 'CGY',
  'Chicago Blackhawks': 'CHI',
  'San Jose Sharks': 'SJS',
  'Utah Hockey Club': 'UTA',
  'Buffalo Sabres': 'BUF',
  'Washington Capitals': 'WSH',
  'Seattle Kraken': 'SEA',
};

const NHL_LOGO_BASE = 'https://assets.nhle.com/logos/nhl/svg';

export function getClubLogoUrl(club: string, leagueId: string): string | null {
  if (leagueId === 'NHL') {
    const abbrev = CLUB_TO_ABBREV[club];
    if (!abbrev) return null;
    return `${NHL_LOGO_BASE}/${abbrev}_light.svg`;
  }
  return LEAGUE_LOGOS[leagueId] ?? null;
}
