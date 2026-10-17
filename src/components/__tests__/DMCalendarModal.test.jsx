import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '../../lib/i18n';
import DMCalendarModal from '../dm/DMCalendarModal';

describe('DMCalendarModal - Manual Stardate & Chronometer Controller', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not render anything when isOpen is false', () => {
    const { container } = render(
      <DMCalendarModal
        isOpen={false}
        onClose={vi.fn()}
        currentGameTime="2381-05-18T08:00:00"
        onSave={vi.fn()}
      />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders modal dialog with initial time and live preview when isOpen is true', () => {
    render(
      <DMCalendarModal
        isOpen={true}
        onClose={vi.fn()}
        currentGameTime="2381-05-18T08:00:00"
        onSave={vi.fn()}
      />
    );

    expect(screen.getByText(/Galactic Calendar Chronometer/i)).toBeInTheDocument();
    expect(screen.getByText(/18 May 2381 08:00/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Save Stardate/i })).toBeInTheDocument();
  });

  it('updates live preview when quick adjustment buttons are clicked', () => {
    render(
      <DMCalendarModal
        isOpen={true}
        onClose={vi.fn()}
        currentGameTime="2381-05-18T08:00:00"
        onSave={vi.fn()}
      />
    );

    // Click +1 Hour -> 09:00
    fireEvent.click(screen.getByRole('button', { name: /\+1 Hour/i }));
    expect(screen.getByText(/18 May 2381 09:00/i)).toBeInTheDocument();

    // Click +8 Hours -> 17:00
    fireEvent.click(screen.getByRole('button', { name: /\+8 Hours/i }));
    expect(screen.getByText(/18 May 2381 17:00/i)).toBeInTheDocument();

    // Click +1 Day -> 19 May 2381 17:00
    fireEvent.click(screen.getByRole('button', { name: /\+1 Day/i }));
    expect(screen.getByText(/19 May 2381 17:00/i)).toBeInTheDocument();
  });

  it('saves discrete custom date and triggers onSave with serialized time', () => {
    const onSave = vi.fn();
    const onClose = vi.fn();
    render(
      <DMCalendarModal
        isOpen={true}
        onClose={onClose}
        currentGameTime="2381-05-18T08:00:00"
        onSave={onSave}
      />
    );

    // Click +2 Hours (Short Rest) -> 10:00
    fireEvent.click(screen.getByRole('button', { name: /\+2 Hours/i }));
    expect(screen.getByText(/18 May 2381 10:00/i)).toBeInTheDocument();

    // Click Save Stardate
    fireEvent.click(screen.getByRole('button', { name: /Save Stardate/i }));

    expect(onSave).toHaveBeenCalledWith('2381-05-18T10:00:00');
    expect(onClose).toHaveBeenCalled();
  });

  it('calls onClose when cancel is clicked without triggering onSave', () => {
    const onSave = vi.fn();
    const onClose = vi.fn();
    render(
      <DMCalendarModal
        isOpen={true}
        onClose={onClose}
        currentGameTime="2381-05-18T08:00:00"
        onSave={onSave}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Cancel/i }));
    expect(onClose).toHaveBeenCalled();
    expect(onSave).not.toHaveBeenCalled();
  });
});
