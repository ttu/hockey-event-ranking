import { getPlayerScore } from './playerScore';
import type { RosterPlayer, TeamRoster } from '../types';

export interface TeamMetrics {
  teamId: string;
  totalSalary: number;
  totalScore: number;
  playerCount: number;
  averageScore: number;
}

/**
 * Compute team metrics: total salary (absolute value), total player score, average score.
 */
export function getTeamMetrics(roster: TeamRoster): TeamMetrics {
  const players = roster.players;
  const totalSalary = players.reduce((sum, p) => sum + p.salaryUsd, 0);
  const totalScore = players.reduce((sum, p) => sum + getPlayerScore(p), 0);
  const playerCount = players.length;
  const averageScore = playerCount > 0 ? totalScore / playerCount : 0;
  return {
    teamId: roster.teamId,
    totalSalary,
    totalScore,
    playerCount,
    averageScore,
  };
}

/**
 * Player with precomputed score.
 */
export interface PlayerWithScore extends RosterPlayer {
  score: number;
}

export function getPlayersWithScores(
  players: RosterPlayer[],
): PlayerWithScore[] {
  return players.map((p) => ({ ...p, score: getPlayerScore(p) }));
}
