import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RosterList } from './PlayerList';

const mockPlayers = [
  {
    playerId: 'p1',
    playerName: 'Connor McDavid',
    position: 'C' as const,
    leagueId: 'NHL',
    club: 'Edmonton Oilers',
    salaryUsd: 12_500_000,
    salaryEstimated: false,
    line: '1L' as const,
    role: 'top6' as const,
    score: 100,
  },
  {
    playerId: 'p2',
    playerName: 'Cale Makar',
    position: 'D' as const,
    leagueId: 'NHL',
    club: 'Colorado Avalanche',
    salaryUsd: 9_000_000,
    salaryEstimated: false,
    line: 'top4D' as const,
    role: 'top4' as const,
    score: 95,
  },
];

describe('RosterList', () => {
  it('renders players with name and salary', () => {
    render(<RosterList players={mockPlayers} teamId="CAN" />);
    expect(screen.getByText('Connor McDavid')).toBeInTheDocument();
    expect(screen.getByText('$12.5M')).toBeInTheDocument();
  });

  it('renders human-readable line and role for forwards', () => {
    render(<RosterList players={mockPlayers} teamId="CAN" />);
    expect(screen.getByText('1st Line · Top 6')).toBeInTheDocument();
  });

  it('renders human-readable line for defensemen (Top 4 D instead of top4D · top4)', () => {
    render(<RosterList players={mockPlayers} teamId="CAN" />);
    expect(screen.getByText('Top 4 D')).toBeInTheDocument();
  });
});
