import { describe, it, expect } from 'vitest';
import type { RosterPlayer, Competition } from '../types';

describe('RosterPlayer type', () => {
  it('has required fields', () => {
    const player: RosterPlayer = {
      playerId: 'p1',
      playerName: 'Test',
      position: 'C',
      leagueId: 'NHL',
      club: 'Edmonton Oilers',
      salaryUsd: 1_000_000,
      salaryEstimated: false,
      line: '1L',
      role: 'top6',
    };
    expect(typeof player.playerId).toBe('string');
    expect(typeof player.salaryUsd).toBe('number');
    expect(player.position).toBe('C');
  });
});

describe('Competition type', () => {
  it('has competitionId, year, teams', () => {
    const comp: Competition = {
      competitionId: 'olympics-2026',
      competitionName: 'Winter Olympics 2026',
      year: 2026,
      teams: [],
    };
    expect(comp.competitionId).toBe('olympics-2026');
    expect(comp.year).toBe(2026);
    expect(Array.isArray(comp.teams)).toBe(true);
  });
});
