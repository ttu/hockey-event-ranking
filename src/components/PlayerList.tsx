import { getClubLogoUrl } from '../data/clubLogos';
import { getLeague, getLeagueCountryFlagUrl } from '../data/leagues';
import { getTeamAccentColor } from '../data/nationalTeams';
import { formatLineRole } from '../lib/formatLineRole';
import type { NationalPosition } from '../types';
import type { PlayerWithScore } from '../lib/teamMetrics';

/** Map legacy nationalLine (1L, top4D) to current format (L1, D1) for backwards compat */
const LEGACY_TO_NATIONAL: Record<string, NationalPosition> = {
  '1L': 'L1',
  '2L': 'L2',
  '3L': 'L3',
  '4L': 'L4',
  top4D: 'D1',
  bottomD: 'D2',
  starterG: 'G1',
  backupG: 'G2',
};

function toNationalPosition(
  val: string | undefined,
): NationalPosition | undefined {
  if (!val) return undefined;
  return (LEGACY_TO_NATIONAL[val] ?? val) as NationalPosition;
}

const NAT_ORDER: NationalPosition[] = [
  'L1',
  'L2',
  'L3',
  'L4',
  'D1',
  'D2',
  'G1',
  'G2',
];

/** Fallback when nationalLine missing: forwards→L4, D→D2, G→G2 */
function getNatPos(p: PlayerWithScore): NationalPosition {
  const fromLine = toNationalPosition(p.nationalLine);
  if (fromLine) return fromLine;
  if (p.position === 'G') return 'G2';
  if (p.position === 'D') return 'D2';
  return 'L4';
}

function sortByNationalLine(players: PlayerWithScore[]): PlayerWithScore[] {
  return [...players].sort(
    (a, b) => NAT_ORDER.indexOf(getNatPos(a)) - NAT_ORDER.indexOf(getNatPos(b)),
  );
}

/** Infer national team position from roster order (L1–L4, D1–D2, G1–G2) */
function inferNationalPosition(
  players: PlayerWithScore[],
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

function formatSalary(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n}`;
}

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export interface RosterListProps {
  players: PlayerWithScore[];
  teamId: string;
}

export function RosterList({ players, teamId }: RosterListProps) {
  const accentColor = getTeamAccentColor(teamId);
  const sorted = sortByNationalLine(players);
  return (
    <ul role="list" aria-label="Roster" className="roster-list">
      {sorted.map((p, idx) => {
        const league = getLeague(p.leagueId);
        const logoUrl = getClubLogoUrl(p.club, p.leagueId);
        const flagUrl = getLeagueCountryFlagUrl(p.leagueId);
        const nationalPos =
          toNationalPosition(p.nationalLine) ??
          inferNationalPosition(sorted, idx);
        return (
          <li
            key={p.playerId}
            className="roster-item"
            style={{ '--roster-accent': accentColor } as React.CSSProperties}
          >
            <span
              className="roster-item__national-pos"
              title="Position on national team"
            >
              {nationalPos}
            </span>
            <div className="roster-item__accent">
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt=""
                  className="roster-item__club-logo"
                  loading="lazy"
                  aria-hidden
                />
              ) : (
                <span className="roster-item__club-placeholder" aria-hidden>
                  {p.club.slice(0, 2).toUpperCase()}
                </span>
              )}
            </div>
            <div className="roster-item__avatar" aria-hidden>
              {p.headshotUrl ? (
                <img
                  src={p.headshotUrl}
                  alt=""
                  className="roster-item__headshot"
                  loading="lazy"
                />
              ) : (
                getInitials(p.playerName)
              )}
            </div>
            <div className="roster-item__info">
              <span className="roster-item__name">{p.playerName}</span>
              <span className="roster-item__meta">
                {p.position} · {league?.name ?? p.leagueId}
                {flagUrl && (
                  <img
                    src={flagUrl}
                    alt=""
                    className="roster-item__club-flag"
                    loading="lazy"
                    title="League country"
                    aria-hidden
                  />
                )}
                {' · '}
                {p.club}
              </span>
            </div>
            <div
              className="roster-item__details"
              title="Club team lineup (e.g. 1st line, top 4 defenseman)"
            >
              {formatLineRole(p.line, p.role, p.position)}
            </div>
            <div
              className="roster-item__salary"
              title={
                p.salaryEstimated
                  ? 'Salary is estimated from league average'
                  : undefined
              }
            >
              {formatSalary(p.salaryUsd)}
              {p.salaryEstimated && (
                <span className="roster-item__estimated" aria-hidden>
                  *
                </span>
              )}
            </div>
            <div
              className="roster-item__score-badge"
              title="Player score (league + line + role)"
            >
              {p.score}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
