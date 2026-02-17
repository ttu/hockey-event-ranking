import { describe, expect, it } from 'vitest';
import { getTeamMetrics, getPlayersWithScores } from './teamMetrics';
import type { RosterPlayer, TeamRoster } from '../types';

function mkPlayer(overrides: Partial<RosterPlayer>): RosterPlayer {
  return {
    playerId: 'p1',
    playerName: 'Test',
    position: 'C',
    leagueId: 'NHL',
    club: 'Team',
    salaryUsd: 1_000_000,
    salaryEstimated: false,
    line: '1L',
    role: 'top6',
    ...overrides,
  };
}

describe('getTeamMetrics', () => {
  it('sums salary and score across players', () => {
    const roster: TeamRoster = {
      teamId: 'CAN',
      players: [
        mkPlayer({ playerId: 'a', salaryUsd: 5_000_000 }),
        mkPlayer({ playerId: 'b', salaryUsd: 3_000_000 }),
      ],
    };
    const m = getTeamMetrics(roster);
    expect(m.teamId).toBe('CAN');
    expect(m.totalSalary).toBe(8_000_000);
    expect(m.playerCount).toBe(2);
    expect(m.totalScore).toBeGreaterThan(0);
    expect(m.averageScore).toBe(m.totalScore / 2);
  });

  it('returns zeros for empty roster', () => {
    const roster: TeamRoster = { teamId: 'USA', players: [] };
    const m = getTeamMetrics(roster);
    expect(m.totalSalary).toBe(0);
    expect(m.totalScore).toBe(0);
    expect(m.playerCount).toBe(0);
    expect(m.averageScore).toBe(0);
  });
});

describe('getPlayersWithScores', () => {
  it('adds score to each player', () => {
    const players: RosterPlayer[] = [
      mkPlayer({ playerId: 'a', salaryUsd: 14_000_000 }),
      mkPlayer({ playerId: 'b', line: '4L', role: 'bottom6' }),
    ];
    const result = getPlayersWithScores(players);
    expect(result).toHaveLength(2);
    expect(result[0].score).toBe(100);
    expect(result[1].score).toBeLessThan(100);
  });
});
