const COMPETITION_LABELS: Record<string, string> = {
  'four-nations-2025': '4 Nations Face-Off 2025',
  'olympics-2026': 'Winter Olympics 2026',
};

export interface CompetitionSelectorProps {
  competitionId: string;
  competitions: readonly string[];
  onChange: (id: string) => void;
}

export function CompetitionSelector({
  competitionId,
  competitions,
  onChange,
}: CompetitionSelectorProps) {
  return (
    <select
      role="combobox"
      value={competitionId}
      onChange={(e) => onChange(e.target.value)}
      aria-label="Select competition"
    >
      {competitions.map((id) => (
        <option key={id} value={id}>
          {COMPETITION_LABELS[id] ?? id}
        </option>
      ))}
    </select>
  );
}
