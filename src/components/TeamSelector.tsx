import type { NationalTeam } from '../types';

export interface TeamSelectorProps {
  value: string;
  teams: NationalTeam[];
  onChange: (teamId: string) => void;
}

export function TeamSelector({ value, teams, onChange }: TeamSelectorProps) {
  return (
    <select
      role="combobox"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label="Select team"
    >
      {teams.map((team) => (
        <option key={team.id} value={team.id}>
          {team.name}
        </option>
      ))}
    </select>
  );
}
