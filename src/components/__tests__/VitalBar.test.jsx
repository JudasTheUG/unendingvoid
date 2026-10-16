import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import VitalBar from '../shared/VitalBar';

describe('VitalBar Component', () => {
  it('renders label and current/max values correctly', () => {
    render(<VitalBar label="Hull Integrity" current={75} max={100} type="hp" />);

    expect(screen.getByText('Hull Integrity')).toBeInTheDocument();
    expect(screen.getByText('75')).toBeInTheDocument();
    expect(screen.getByText('/ 100')).toBeInTheDocument();
    expect(screen.getByText('75%')).toBeInTheDocument();
  });

  it('renders shields with 100% calculation and safe clamping', () => {
    render(<VitalBar label="Energy Shields" current={60} max={60} type="shield" />);

    expect(screen.getByText('Energy Shields')).toBeInTheDocument();
    expect(screen.getByText('60')).toBeInTheDocument();
    expect(screen.getByText('100%')).toBeInTheDocument();
  });

  it('clamps negative current values safely to 0', () => {
    render(<VitalBar label="Overkill HP" current={-20} max={100} type="hp" />);

    expect(screen.getByText('0')).toBeInTheDocument();
    expect(screen.getByText('0%')).toBeInTheDocument();
  });
});
