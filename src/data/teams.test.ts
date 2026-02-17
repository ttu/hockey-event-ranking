import { describe, it, expect } from 'vitest';
import { TEAMS } from './teams';

describe('TEAMS', () => {
  it('has national teams', () => {
    expect(TEAMS.length).toBeGreaterThanOrEqual(10);
  });

  it('includes CAN with correct data', () => {
    const can = TEAMS.find((t) => t.id === 'CAN');
    expect(can).toBeDefined();
    expect(can?.name).toBe('Canada');
    expect(can?.abbreviation).toBe('CAN');
  });

  it('each team has id, name, abbreviation', () => {
    for (const team of TEAMS) {
      expect(typeof team.id).toBe('string');
      expect(team.id.length).toBeGreaterThan(0);
      expect(typeof team.name).toBe('string');
      expect(typeof team.abbreviation).toBe('string');
    }
  });
});
