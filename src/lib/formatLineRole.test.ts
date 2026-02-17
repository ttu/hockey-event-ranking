import { describe, expect, it } from 'vitest';
import { formatLineRole } from './formatLineRole';

describe('formatLineRole', () => {
  it('formats forwards with line and role', () => {
    expect(formatLineRole('1L', 'top6', 'C')).toBe('1st Line · Top 6');
    expect(formatLineRole('2L', 'top6', 'LW')).toBe('2nd Line · Top 6');
    expect(formatLineRole('3L', 'bottom6', 'RW')).toBe('3rd Line · Bottom 6');
    expect(formatLineRole('4L', 'bottom6', 'C')).toBe('4th Line · Bottom 6');
  });

  it('formats defensemen with single label (line and role are redundant)', () => {
    expect(formatLineRole('top4D', 'top4', 'D')).toBe('Top 4 D');
    expect(formatLineRole('bottomD', 'bottom2', 'D')).toBe('Bottom Pair');
  });

  it('formats goalies with single label', () => {
    expect(formatLineRole('starterG', 'starter', 'G')).toBe('Starter');
    expect(formatLineRole('backupG', 'backup', 'G')).toBe('Backup');
  });
});
