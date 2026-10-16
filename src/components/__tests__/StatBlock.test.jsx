import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import StatBlock from '../shared/StatBlock';

describe('StatBlock Component', () => {
  it('calculates and displays positive D&D modifier (+3 for 16)', () => {
    render(<StatBlock name="strength" label="Strength" value={16} />);

    expect(screen.getByText('Strength')).toBeInTheDocument();
    expect(screen.getByText('16')).toBeInTheDocument();
    expect(screen.getByText('+3')).toBeInTheDocument();
  });

  it('calculates and displays negative modifier (-1 for 8)', () => {
    render(<StatBlock name="wisdom" label="Wisdom" value={8} />);

    expect(screen.getByText('8')).toBeInTheDocument();
    expect(screen.getByText('-1')).toBeInTheDocument();
  });

  it('calculates neutral modifier (+0 for 10)', () => {
    render(<StatBlock name="charisma" label="Charisma" value={10} />);

    expect(screen.getByText('+0')).toBeInTheDocument();
  });

  it('triggers onRoll callback when clicked with stat name and modifier', () => {
    const handleRoll = vi.fn();
    render(<StatBlock name="dexterity" label="Dexterity" value={14} onRoll={handleRoll} />);

    fireEvent.click(screen.getByText('Dexterity'));
    expect(handleRoll).toHaveBeenCalledTimes(1);
    expect(handleRoll).toHaveBeenCalledWith('dexterity', 2);
  });
});
