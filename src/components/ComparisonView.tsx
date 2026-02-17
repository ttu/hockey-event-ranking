import { getTeamFlagUrl } from '../data/nationalTeams';
import { getTeamMetrics } from '../lib/teamMetrics';
import type { TeamRoster } from '../types';
import type { NationalTeam } from '../types';

function formatSalary(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n}`;
}

export interface ComparisonViewProps {
  rosters: TeamRoster[];
  teams: NationalTeam[];
  onBack: () => void;
}

export function ComparisonView({
  rosters,
  teams,
  onBack,
}: ComparisonViewProps) {
  const teamData = rosters.map((r) => {
    const m = getTeamMetrics(r);
    const team = teams.find((t) => t.id === r.teamId);
    return {
      roster: r,
      metrics: m,
      name: team?.name ?? r.teamId,
    };
  });

  const maxSalary = Math.max(...teamData.map((d) => d.metrics.totalSalary), 1);
  const maxScore = Math.max(...teamData.map((d) => d.metrics.totalScore), 1);

  return (
    <section className="comparison-view" aria-label="Team comparison">
      <div className="comparison-view__header">
        <button
          type="button"
          className="comparison-view__back"
          onClick={onBack}
        >
          ← Back to rankings
        </button>
        <h2 className="comparison-view__title">Head-to-Head Comparison</h2>
      </div>
      <div className="comparison-view__grid">
        {teamData.map(({ roster, metrics, name }) => (
          <article
            key={roster.teamId}
            className="comparison-card"
            aria-labelledby={`comparison-${roster.teamId}`}
          >
            <div className="comparison-card__header">
              <img
                src={getTeamFlagUrl(roster.teamId)}
                alt=""
                className="comparison-card__flag"
                loading="lazy"
              />
              <h3
                id={`comparison-${roster.teamId}`}
                className="comparison-card__name"
              >
                {name}
              </h3>
            </div>
            <dl className="comparison-card__metrics">
              <dt>Total value</dt>
              <dd>{formatSalary(metrics.totalSalary)}</dd>
              <dt>Total score</dt>
              <dd>{metrics.totalScore.toLocaleString()}</dd>
              <dt>Average score</dt>
              <dd>{metrics.averageScore.toFixed(1)}</dd>
              <dt>Players</dt>
              <dd>{metrics.playerCount}</dd>
            </dl>
            <div className="comparison-card__bars">
              <div className="comparison-card__bar-group">
                <span className="comparison-card__bar-label">Value</span>
                <div className="comparison-card__bar-track">
                  <div
                    className="comparison-card__bar-fill"
                    style={{
                      width: `${(metrics.totalSalary / maxSalary) * 100}%`,
                    }}
                  />
                </div>
              </div>
              <div className="comparison-card__bar-group">
                <span className="comparison-card__bar-label">Score</span>
                <div className="comparison-card__bar-track">
                  <div
                    className="comparison-card__bar-fill comparison-card__bar-fill--score"
                    style={{
                      width: `${(metrics.totalScore / maxScore) * 100}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
