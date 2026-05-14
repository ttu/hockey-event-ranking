import { useState, useEffect, useRef } from 'react';
import {
  Routes,
  Route,
  useParams,
  useNavigate,
  Navigate,
} from 'react-router-dom';
import { TeamSelector } from './components/TeamSelector';
import { CompetitionSelector } from './components/CompetitionSelector';
import { InfoView } from './components/InfoView';
import { TeamRankingsView } from './components/TeamRankingsView';
import type { TeamRanking, SortBy } from './components/TeamRankingsView';
import { RosterList } from './components/PlayerList';
import {
  loadCompetitionSummary,
  loadTeamRoster,
  COMPETITION_IDS,
  type CompetitionId,
} from './lib/loadData';
import { getTeamMetrics, getPlayersWithScores } from './lib/teamMetrics';
import { getLeague } from './data/leagues';
import { NATIONAL_TEAMS } from './data/nationalTeams';
import { getTeamFlagUrl } from './data/nationalTeams';
import { APP_LOGO_URL } from './data/teamAssets';
import type { CompetitionSummary, TeamRoster } from './types';
import './App.css';

const validTeamIds = new Set(NATIONAL_TEAMS.map((t) => t.id));
const competitionIdSet = new Set<string>(COMPETITION_IDS);
const DEFAULT_COMPETITION: CompetitionId =
  COMPETITION_IDS[COMPETITION_IDS.length - 1];

function formatSalary(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n}`;
}

function AppContent() {
  const { competitionId: pathCompetition, teamId: pathTeam } = useParams<{
    competitionId?: string;
    teamId?: string;
  }>();
  const navigate = useNavigate();

  // Resolve competition: from path, or legacy /CAN -> default competition
  const competitionId: CompetitionId =
    pathCompetition && competitionIdSet.has(pathCompetition)
      ? (pathCompetition as CompetitionId)
      : DEFAULT_COMPETITION;

  // Resolve team: from path, or legacy single-segment /CAN (pathCompetition is teamId)
  const selectedTeam = (() => {
    if (pathTeam && validTeamIds.has(pathTeam)) return pathTeam;
    // Legacy: /CAN with no competition segment -> pathCompetition is the team
    if (
      pathCompetition &&
      validTeamIds.has(pathCompetition) &&
      !competitionIdSet.has(pathCompetition)
    ) {
      return pathCompetition;
    }
    return null;
  })();

  const showRankingsView = selectedTeam === null;

  // Redirect legacy /CAN to /olympics-2026/CAN, or invalid /foo to /olympics-2026
  useEffect(() => {
    if (!pathCompetition) return;
    if (
      validTeamIds.has(pathCompetition) &&
      !competitionIdSet.has(pathCompetition)
    ) {
      navigate(`/${DEFAULT_COMPETITION}/${pathCompetition}`, { replace: true });
    } else if (!competitionIdSet.has(pathCompetition)) {
      navigate(
        pathTeam
          ? `/${DEFAULT_COMPETITION}/${pathTeam}`
          : `/${DEFAULT_COMPETITION}`,
        {
          replace: true,
        },
      );
    }
  }, [pathCompetition, pathTeam, navigate]);

  const [summary, setSummary] = useState<CompetitionSummary | null>(null);
  const [rosterCache, setRosterCache] = useState<Record<string, TeamRoster>>(
    {},
  );
  const [sortBy, setSortBy] = useState<SortBy>('salary');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const loadIdRef = useRef(0);
  const [showInfoView, setShowInfoView] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const loadId = (loadIdRef.current += 1);
    queueMicrotask(() => {
      setError(null);
      setLoading(true);
      setRosterCache({});
    });

    loadCompetitionSummary(competitionId)
      .then((data) => {
        if (!cancelled && loadIdRef.current === loadId) {
          setSummary(data);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err));
        }
      })
      .finally(() => {
        if (!cancelled && loadIdRef.current === loadId) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [competitionId]);

  useEffect(() => {
    if (!selectedTeam || !summary?.teamIds.includes(selectedTeam)) return;
    if (rosterCache[selectedTeam]) return;

    let cancelled = false;
    queueMicrotask(() => setLoading(true));
    loadTeamRoster(competitionId, selectedTeam)
      .then((roster) => {
        if (!cancelled) {
          setRosterCache((prev) => ({ ...prev, [selectedTeam]: roster }));
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [competitionId, selectedTeam, summary?.teamIds, rosterCache]);

  const handleTeamSelect = (id: string) => {
    navigate(`/${competitionId}/${id}`);
  };

  const handleShowRankings = () => {
    navigate(`/${competitionId}`);
  };

  const handleCompetitionChange = (id: string) => {
    navigate(selectedTeam ? `/${id}/${selectedTeam}` : `/${id}`);
  };

  const teamsWithData = summary?.teamIds ?? [];
  const teamOptions = NATIONAL_TEAMS.filter((t) =>
    teamsWithData.length > 0 ? teamsWithData.includes(t.id) : true,
  );

  const rankings: TeamRanking[] = (summary?.teams ?? [])
    .map((t) => {
      const team = NATIONAL_TEAMS.find((n) => n.id === t.teamId);
      return {
        teamId: t.teamId,
        teamName: team?.name ?? t.teamId,
        totalSalary: t.totalSalary,
        totalScore: t.totalScore,
        averageScore: t.averageScore,
        playerCount: t.playerCount,
        rank: 0,
      };
    })
    .sort((a, b) => {
      if (sortBy === 'salary') return b.totalSalary - a.totalSalary;
      if (sortBy === 'score') return b.totalScore - a.totalScore;
      return b.averageScore - a.averageScore;
    })
    .map((r, i) => ({ ...r, rank: i + 1 }));

  const selectedRoster = selectedTeam
    ? (rosterCache[selectedTeam] ?? null)
    : null;
  const selectedMetrics = selectedRoster
    ? getTeamMetrics(selectedRoster)
    : null;
  const playersWithScores = selectedRoster
    ? getPlayersWithScores(selectedRoster.players)
    : [];

  const leagueBreakdown = (() => {
    if (!selectedRoster) return [];
    const counts = new Map<string, number>();
    for (const p of selectedRoster.players) {
      counts.set(p.leagueId, (counts.get(p.leagueId) ?? 0) + 1);
    }
    return Array.from(counts, ([leagueId, count]) => ({
      leagueId,
      count,
    })).sort((a, b) => b.count - a.count);
  })();

  const selectedTeamData = selectedTeam
    ? NATIONAL_TEAMS.find((t) => t.id === selectedTeam)
    : undefined;

  useEffect(() => {
    const competitionName = summary?.competitionName;
    const teamName = selectedTeamData?.name ?? selectedTeam;
    if (selectedTeam && teamName && competitionName) {
      document.title = `${teamName} — ${competitionName} | Hockey Event Ranking`;
    } else if (competitionName) {
      document.title = `${competitionName} | Hockey Event Ranking`;
    } else {
      document.title = 'Hockey Event Ranking';
    }
  }, [selectedTeam, selectedTeamData, summary?.competitionName]);

  return (
    <main className="app">
      <header className="app-header">
        <div className="app-header__brand">
          {selectedTeam && selectedTeamData ? (
            <img
              src={getTeamFlagUrl(selectedTeam)}
              alt=""
              className="app-header__logo"
              aria-hidden
            />
          ) : (
            <img
              src={APP_LOGO_URL}
              alt=""
              className="app-header__logo"
              aria-hidden
            />
          )}
          <h1>Hockey Event Ranking - Team Value Comparison</h1>
        </div>
        <div className="app-controls">
          {!showRankingsView && (
            <button
              type="button"
              onClick={handleShowRankings}
              className="app-header__rankings-link"
            >
              Rankings
            </button>
          )}
          {!showRankingsView && selectedTeam && (
            <TeamSelector
              value={selectedTeam}
              teams={teamOptions}
              onChange={handleTeamSelect}
            />
          )}
          {showRankingsView && (
            <CompetitionSelector
              competitionId={competitionId}
              competitions={COMPETITION_IDS}
              onChange={handleCompetitionChange}
            />
          )}
          <button
            type="button"
            onClick={() => setShowInfoView(true)}
            className="app-controls__copy-link"
            aria-label="About"
            title="About"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M12 16v-4M12 8h.01" />
            </svg>
          </button>
        </div>
      </header>

      {showInfoView && <InfoView onClose={() => setShowInfoView(false)} />}

      {error && (
        <div role="alert" className="app-error">
          {error}
        </div>
      )}

      {loading ? (
        <div className="app-loading" role="status" aria-live="polite">
          <span className="app-loading__spinner" aria-hidden />
          <span className="app-loading__text">Loading roster data…</span>
        </div>
      ) : showRankingsView && rankings.length > 0 ? (
        <TeamRankingsView
          rankings={rankings}
          sortBy={sortBy}
          onSortChange={setSortBy}
          onTeamSelect={handleTeamSelect}
        />
      ) : selectedTeam && selectedRoster && selectedMetrics ? (
        <>
          <section className="app-score">
            <article className="team-summary-card">
              <h2 className="team-summary-card__title">
                {selectedTeamData?.name ?? selectedTeam}
              </h2>
              {summary?.competitionName && (
                <p className="team-summary-card__competition">
                  {summary.competitionName}
                </p>
              )}
              <dl className="team-summary-card__metrics">
                <dt>Total value</dt>
                <dd>{formatSalary(selectedMetrics.totalSalary)}</dd>
                <dt>Total score</dt>
                <dd>{selectedMetrics.totalScore.toLocaleString()}</dd>
                <dt>Average score</dt>
                <dd>{selectedMetrics.averageScore.toFixed(1)}</dd>
                <dt>Players</dt>
                <dd>{selectedMetrics.playerCount}</dd>
                <dt className="team-summary-card__leagues-label">Leagues</dt>
                <dd className="team-summary-card__leagues-value">
                  <ul className="team-summary-card__leagues">
                    {leagueBreakdown.map((l) => (
                      <li
                        key={l.leagueId}
                        className="team-summary-card__league"
                      >
                        <span className="team-summary-card__league-name">
                          {getLeague(l.leagueId)?.name ?? l.leagueId}
                        </span>
                        <span className="team-summary-card__league-count">
                          {l.count}/{selectedMetrics.playerCount}
                        </span>
                      </li>
                    ))}
                  </ul>
                </dd>
              </dl>
            </article>
          </section>

          <section className="app-players" aria-label="Roster">
            <div className="app-players__header">
              <h2>Roster</h2>
            </div>
            <RosterList players={playersWithScores} teamId={selectedTeam} />
          </section>
        </>
      ) : (
        <div className="app-loading" role="status" aria-live="polite">
          <span className="app-loading__spinner" aria-hidden />
          <span className="app-loading__text">Loading…</span>
        </div>
      )}
    </main>
  );
}

function App() {
  return (
    <Routes>
      <Route
        path="/"
        element={<Navigate to={`/${DEFAULT_COMPETITION}`} replace />}
      />
      <Route path="/:competitionId" element={<AppContent />} />
      <Route path="/:competitionId/:teamId" element={<AppContent />} />
    </Routes>
  );
}

export default App;
