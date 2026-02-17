import type { Line, Role, Position } from '../types';

/** Human-readable line labels (forwards: 1st–4th line; defense: top 4 / bottom pair; goalies) */
const LINE_LABELS: Record<Line, string> = {
  '1L': '1st Line',
  '2L': '2nd Line',
  '3L': '3rd Line',
  '4L': '4th Line',
  top4D: 'Top 4 D',
  bottomD: 'Bottom Pair',
  starterG: 'Starter',
  backupG: 'Backup',
};

/** Human-readable role labels (forwards: top/bottom 6; defense: top 4 / bottom pair) */
const ROLE_LABELS: Record<Role, string> = {
  top6: 'Top 6',
  bottom6: 'Bottom 6',
  top4: 'Top 4 D',
  bottom2: 'Bottom Pair',
  starter: 'Starter',
  backup: 'Backup',
};

/**
 * Format club line and role for display.
 * For defensemen and goalies, line and role are redundant (e.g. top4D + top4),
 * so only the line label is shown. For forwards, both are shown.
 */
export function formatLineRole(
  line: Line,
  role: Role,
  position: Position,
): string {
  const lineLabel = LINE_LABELS[line];
  const roleLabel = ROLE_LABELS[role];

  if (position === 'D') {
    return lineLabel; // "Top 4 D" or "Bottom Pair"
  }
  if (position === 'G') {
    return lineLabel; // "Starter" or "Backup"
  }
  return `${lineLabel} · ${roleLabel}`;
}
