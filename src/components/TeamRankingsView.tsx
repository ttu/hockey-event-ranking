import { getTeamFlagUrl } from '../data/nationalTeams';

export type SortBy = 'salary' | 'score' | 'avgScore';

export interface TeamRanking {
  teamId: string;
  teamName: string;
  rank: number;
  totalSalary: number;
  totalScore: number;
  averageScore: number;
  playerCount: number;
}

export interface TeamRankingsViewProps {
  rankings: TeamRanking[];
  sortBy: SortBy;
  onSortChange: (sort: SortBy) => void;
  onTeamSelect: (teamId: string) => void;
  onBack?: () => void;
}

function formatSalary(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n}`;
}

export function TeamRankingsView({
  rankings,
  sortBy,
  onSortChange,
  onTeamSelect,
  onBack,
}: TeamRankingsViewProps) {
  return (
    <section className="team-rankings-view" aria-label="Team rankings">
      <div className="team-rankings-view__header">
        {onBack && (
          <button
            type="button"
            className="team-rankings-view__back"
            onClick={onBack}
          >
            ← Back
          </button>
        )}
        <div className="team-rankings-view__controls">
          <h2 className="team-rankings-view__title">Team Rankings</h2>
          <div className="team-rankings-view__sort">
            <span className="team-rankings-view__sort-label">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => onSortChange(e.target.value as SortBy)}
              aria-label="Sort rankings by"
            >
              <option value="salary">Total value (salary)</option>
              <option value="score">Total score</option>
              <option value="avgScore">Average score</option>
            </select>
          </div>
        </div>
      </div>
      <ul className="team-rankings-view__list" role="list">
        {rankings.map((r) => (
          <li key={r.teamId}>
            <button
              type="button"
              className="team-rankings-view__item"
              onClick={() => onTeamSelect(r.teamId)}
            >
              <span className="team-rankings-view__rank">{r.rank}</span>
              <img
                src={getTeamFlagUrl(r.teamId)}
                alt=""
                className="team-rankings-view__logo"
                loading="lazy"
              />
              <span className="team-rankings-view__name">{r.teamName}</span>
              <span className="team-rankings-view__stats">
                {sortBy === 'salary' && (
                  <>
                    <span className="team-rankings-view__primary">
                      {formatSalary(r.totalSalary)}
                    </span>
                    <span className="team-rankings-view__secondary">
                      {r.playerCount} players
                    </span>
                  </>
                )}
                {sortBy === 'score' && (
                  <>
                    <span className="team-rankings-view__primary">
                      {r.totalScore.toLocaleString()}
                    </span>
                    <span className="team-rankings-view__secondary">
                      {formatSalary(r.totalSalary)}
                    </span>
                  </>
                )}
                {sortBy === 'avgScore' && (
                  <>
                    <span className="team-rankings-view__primary">
                      {r.averageScore.toFixed(1)}
                    </span>
                    <span className="team-rankings-view__secondary">
                      {r.playerCount} players
                    </span>
                  </>
                )}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
