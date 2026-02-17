import { describe, expect, it } from 'vitest';
import { getPlayerScore } from './playerScore';
import type { RosterPlayer } from '../types';

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

describe('getPlayerScore', () => {
  it('gives highest score for NHL 1L top6 with elite salary', () => {
    const p = mkPlayer({
      leagueId: 'NHL',
      line: '1L',
      role: 'top6',
      salaryUsd: 14_000_000,
    });
    expect(getPlayerScore(p)).toBe(100);
  });

  it('differentiates NHL 1L top6 by salary (Matthews > Eichel)', () => {
    const matthews = mkPlayer({
      leagueId: 'NHL',
      line: '1L',
      role: 'top6',
      salaryUsd: 13_300_000,
    });
    const eichel = mkPlayer({
      leagueId: 'NHL',
      line: '1L',
      role: 'top6',
      salaryUsd: 10_000_000,
    });
    expect(getPlayerScore(matthews)).toBeGreaterThan(getPlayerScore(eichel));
    expect(getPlayerScore(eichel)).toBeGreaterThanOrEqual(90);
  });

  it('gives lower score for 4L bottom6', () => {
    const p = mkPlayer({ leagueId: 'NHL', line: '4L', role: 'bottom6' });
    const score = getPlayerScore(p);
    expect(score).toBeLessThan(70);
    expect(score).toBeGreaterThan(0);
  });

  it('reduces score for lower-tier league', () => {
    const nhl = mkPlayer({ leagueId: 'NHL', line: '1L', role: 'top6' });
    const shl = mkPlayer({ leagueId: 'SHL', line: '1L', role: 'top6' });
    expect(getPlayerScore(shl)).toBeLessThan(getPlayerScore(nhl));
  });

  it('non-NHL players always score lower than any NHL player', () => {
    const nhlWorst = mkPlayer({ leagueId: 'NHL', line: '4L', role: 'bottom6' });
    const khlBest = mkPlayer({ leagueId: 'KHL', line: '1L', role: 'top6' });
    const shlBest = mkPlayer({ leagueId: 'SHL', line: '1L', role: 'top6' });
    const otherBest = mkPlayer({ leagueId: 'OTHER', line: '1L', role: 'top6' });
    expect(getPlayerScore(khlBest)).toBeLessThan(getPlayerScore(nhlWorst));
    expect(getPlayerScore(shlBest)).toBeLessThan(getPlayerScore(nhlWorst));
    expect(getPlayerScore(otherBest)).toBeLessThan(getPlayerScore(nhlWorst));
  });

  it('gives top4D high score with elite salary', () => {
    const p = mkPlayer({
      position: 'D',
      line: 'top4D',
      role: 'top4',
      salaryUsd: 12_000_000,
    });
    expect(getPlayerScore(p)).toBeGreaterThanOrEqual(95);
  });

  it('gives backupG lower score than starterG', () => {
    const starter = mkPlayer({
      position: 'G',
      line: 'starterG',
      role: 'starter',
    });
    const backup = mkPlayer({ position: 'G', line: 'backupG', role: 'backup' });
    expect(getPlayerScore(backup)).toBeLessThan(getPlayerScore(starter));
  });

  it('handles unknown league with fallback weight', () => {
    const p = mkPlayer({
      leagueId: 'unknown_league',
      line: '1L',
      role: 'top6',
    });
    const score = getPlayerScore(p);
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThan(100);
  });
});
