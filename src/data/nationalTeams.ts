import type { NationalTeam } from '../types';

/** National teams for international competitions (Olympics, World Championship) */
export const NATIONAL_TEAMS: NationalTeam[] = [
  { id: 'CAN', name: 'Canada', abbreviation: 'CAN' },
  { id: 'USA', name: 'United States', abbreviation: 'USA' },
  { id: 'SWE', name: 'Sweden', abbreviation: 'SWE' },
  { id: 'FIN', name: 'Finland', abbreviation: 'FIN' },
  { id: 'RUS', name: 'Russia', abbreviation: 'RUS' },
  { id: 'CZE', name: 'Czech Republic', abbreviation: 'CZE' },
  { id: 'SUI', name: 'Switzerland', abbreviation: 'SUI' },
  { id: 'GER', name: 'Germany', abbreviation: 'GER' },
  { id: 'SVK', name: 'Slovakia', abbreviation: 'SVK' },
  { id: 'LAT', name: 'Latvia', abbreviation: 'LAT' },
  { id: 'NOR', name: 'Norway', abbreviation: 'NOR' },
  { id: 'DEN', name: 'Denmark', abbreviation: 'DEN' },
  { id: 'AUT', name: 'Austria', abbreviation: 'AUT' },
  { id: 'FRA', name: 'France', abbreviation: 'FRA' },
  { id: 'ITA', name: 'Italy', abbreviation: 'ITA' },
  { id: 'KAZ', name: 'Kazakhstan', abbreviation: 'KAZ' },
  { id: 'BLR', name: 'Belarus', abbreviation: 'BLR' },
];

/** ISO 3166-1 alpha-2 codes for flag CDN (flagcdn.com) */
const TEAM_TO_ALPHA2: Record<string, string> = {
  CAN: 'ca',
  USA: 'us',
  SWE: 'se',
  FIN: 'fi',
  RUS: 'ru',
  CZE: 'cz',
  SUI: 'ch',
  GER: 'de',
  SVK: 'sk',
  LAT: 'lv',
  NOR: 'no',
  DEN: 'dk',
  AUT: 'at',
  FRA: 'fr',
  ITA: 'it',
  KAZ: 'kz',
  BLR: 'by',
};

/** Accent colors for roster item left stripe (NHL-style) */
const TEAM_ACCENT_COLORS: Record<string, string> = {
  CAN: '#c41e3a',
  USA: '#bf0a30',
  SWE: '#006aa7',
  FIN: '#002f6c',
  RUS: '#0039a6',
  CZE: '#d7141a',
  SUI: '#ff0000',
  GER: '#000000',
  SVK: '#0147a6',
  LAT: '#9d2235',
  NOR: '#ba0c2f',
  DEN: '#c8102e',
  AUT: '#ed2939',
  FRA: '#002395',
  ITA: '#009246',
  KAZ: '#00afca',
  BLR: '#ae0a0a',
};

export function getTeamFlagUrl(teamId: string, size: 80 | 160 = 80): string {
  const alpha2 = TEAM_TO_ALPHA2[teamId] ?? teamId.toLowerCase().slice(0, 2);
  return `https://flagcdn.com/w${size}/${alpha2}.png`;
}

export function getTeamAccentColor(teamId: string): string {
  return TEAM_ACCENT_COLORS[teamId] ?? '#4a5568';
}
