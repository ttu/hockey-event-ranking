import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TeamSelector } from './TeamSelector';
import { NATIONAL_TEAMS } from '../data/nationalTeams';

describe('TeamSelector', () => {
  it('renders dropdown with teams', () => {
    render(
      <TeamSelector
        value="CAN"
        teams={NATIONAL_TEAMS.slice(0, 3)}
        onChange={() => {}}
      />,
    );
    expect(screen.getByRole('combobox')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Canada')).toBeInTheDocument();
  });

  it('fires onChange when selection changes', () => {
    const onChange = vi.fn();
    render(
      <TeamSelector
        value="CAN"
        teams={NATIONAL_TEAMS.slice(0, 3)}
        onChange={onChange}
      />,
    );
    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'USA' } });
    expect(onChange).toHaveBeenCalledWith('USA');
  });
});
