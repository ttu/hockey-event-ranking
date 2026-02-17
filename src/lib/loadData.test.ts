import { describe, it, expect, vi, beforeEach } from 'vitest';
import { loadCompetition } from './loadData';

function jsonResponse(data: unknown): Response {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}

function notFoundResponse(): Response {
  return new Response('', { status: 404 });
}

describe('loadCompetition', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  it('returns Competition for olympics-2026', async () => {
    const mockSummary = {
      competitionId: 'olympics-2026',
      competitionName: 'Winter Olympics 2026',
      year: 2026,
      teams: [
        {
          teamId: 'CAN',
          totalSalary: 1_000_000,
          totalScore: 100,
          playerCount: 1,
        },
      ],
    };

    const mockRoster = {
      teamId: 'CAN',
      players: [
        {
          playerId: 'p1',
          playerName: 'Test',
          position: 'C',
          leagueId: 'NHL',
          club: 'Edmonton',
          salaryUsd: 1_000_000,
          salaryEstimated: false,
          line: '1L',
          role: 'top6',
        },
      ],
    };

    vi.mocked(fetch).mockImplementation((input: RequestInfo | URL) => {
      const path =
        typeof input === 'string'
          ? input
          : input instanceof URL
            ? input.toString()
            : input.url;
      if (path.includes('olympics-2026.json') && !path.includes('/CAN')) {
        return Promise.resolve(jsonResponse(mockSummary));
      }
      if (path.includes('overrides.json')) {
        return Promise.resolve(notFoundResponse());
      }
      if (path.includes('/CAN.json')) {
        return Promise.resolve(jsonResponse(mockRoster));
      }
      return Promise.resolve(new Response('', { status: 404 }));
    });

    const result = await loadCompetition('olympics-2026');

    expect(result.competitionId).toBe('olympics-2026');
    expect(result.teams).toHaveLength(1);
    expect(result.teams[0].teamId).toBe('CAN');
    expect(result.teams[0].players[0].playerName).toBe('Test');
  });

  it('throws on fetch error', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response('', { status: 404, statusText: 'Not Found' }),
    );

    await expect(loadCompetition('unknown')).rejects.toThrow(
      /Competition unknown/,
    );
  });
});
