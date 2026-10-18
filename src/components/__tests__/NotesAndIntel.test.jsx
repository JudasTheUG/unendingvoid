import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import PlayerNotesTab from '../player/PlayerNotesTab';
import DMIntelBroadcast, { saveLocalBroadcast, getStoredBroadcasts } from '../shared/DMIntelBroadcast';

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key) => key,
    i18n: { language: 'en' },
  }),
}));

// Mock firebase
vi.mock('../../lib/firebase', () => ({
  db: null,
}));

describe('PlayerNotesTab', () => {
  const mockNotes = [
    {
      id: 'note_1',
      type: 'custom',
      title: 'Underworld Lead',
      category: 'outlaw',
      content: 'Contact located at Ceres Sector 4.',
      source: 'Operative Personal Log',
      createdAt: '2026-10-16T10:00:00Z',
    },
    {
      id: 'note_2',
      type: 'saved_intel',
      title: 'MCRN Fleet Alert',
      category: 'military',
      content: 'Stealth ship sighted near Ganymede.',
      source: 'MCRN NAVAL COMMAND',
      imageUrl: 'https://example.com/test.jpg',
      createdAt: '2026-10-16T11:00:00Z',
    },
  ];

  it('renders field notes and classifications', () => {
    render(<PlayerNotesTab notes={mockNotes} onAddNote={vi.fn()} onDeleteNote={vi.fn()} />);

    expect(screen.getByText('Underworld Lead')).toBeInTheDocument();
    expect(screen.getByText('MCRN Fleet Alert')).toBeInTheDocument();
    expect(screen.getByText('Contact located at Ceres Sector 4.')).toBeInTheDocument();
  });

  it('filters notes by search query', () => {
    render(<PlayerNotesTab notes={mockNotes} onAddNote={vi.fn()} onDeleteNote={vi.fn()} />);

    const searchInput = screen.getByPlaceholderText('notes.searchPlaceholder');
    fireEvent.change(searchInput, { target: { value: 'Ganymede' } });

    expect(screen.queryByText('Underworld Lead')).not.toBeInTheDocument();
    expect(screen.getByText('MCRN Fleet Alert')).toBeInTheDocument();
  });

  it('triggers onAddNote when submitting a new field note', () => {
    const handleAdd = vi.fn();
    render(<PlayerNotesTab notes={mockNotes} onAddNote={handleAdd} onDeleteNote={vi.fn()} />);

    // Open compose drawer
    const composeBtn = screen.getByText('notes.compose');
    fireEvent.click(composeBtn);

    const titleInput = screen.getByPlaceholderText('e.g. Ceres Black Market Fuel Prices');
    const contentInput = screen.getByPlaceholderText('Record operative notes, debts, suspicious NPC quotes, coordinates...');
    
    fireEvent.change(titleInput, { target: { value: 'UNN Diplomat Meeting' } });
    fireEvent.change(contentInput, { target: { value: 'Discussed weapon embargo on Tycho.' } });

    const submitBtn = screen.getByText(/notes.saveNote/i);
    fireEvent.click(submitBtn);

    expect(handleAdd).toHaveBeenCalledTimes(1);
    expect(handleAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'UNN Diplomat Meeting',
        content: 'Discussed weapon embargo on Tycho.',
        type: 'custom',
      })
    );
  });
});

describe('DMIntelBroadcast', () => {
  it('renders floating comms button and expands read-only feed', () => {
    const handleSave = vi.fn();
    render(<DMIntelBroadcast onSaveToNotes={handleSave} />);

    // Check button
    const toggleBtn = screen.getByTitle('Open DM Tactical Comms Feed');
    expect(toggleBtn).toBeInTheDocument();

    // Open panel
    fireEvent.click(toggleBtn);

    // Verify monitor notice (no player data entry)
    expect(screen.getByText('intel.readOnly')).toBeInTheDocument();
    expect(screen.getByText('intel.noInputAllowed')).toBeInTheDocument();

    // Verify sample intel items rendered
    expect(screen.getByText('Epstein Drive Plume Detected // Sector 4')).toBeInTheDocument();
  });

  it('triggers onSaveToNotes when clicking Save to Notes', () => {
    const handleSave = vi.fn();
    render(<DMIntelBroadcast onSaveToNotes={handleSave} />);

    // Open panel
    fireEvent.click(screen.getByTitle('Open DM Tactical Comms Feed'));

    const saveButtons = screen.getAllByTitle("Save this briefing to your character's Field Notes");
    expect(saveButtons.length).toBeGreaterThan(0);

    fireEvent.click(saveButtons[0]);
    expect(handleSave).toHaveBeenCalledTimes(1);
    expect(handleSave).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'saved_intel',
        title: 'Epstein Drive Plume Detected // Sector 4',
      })
    );
  });

  it('preserves extensive broadcast history in saveLocalBroadcast without 30-item truncation', () => {
    localStorage.clear();
    for (let i = 0; i < 45; i++) {
      saveLocalBroadcast({
        id: `intel_hist_${i}`,
        title: `Transmission #${i}`,
        content: `Log payload ${i}`,
        createdAt: Date.now() + i * 1000,
      });
    }
    const stored = getStoredBroadcasts();
    expect(stored.length).toBeGreaterThanOrEqual(45);
  });

  it('closes TAC-COMMS when unendingvoid:close_tac_comms event is triggered', () => {
    render(<DMIntelBroadcast />);
    const toggleBtn = screen.getByTitle('Open DM Tactical Comms Feed');
    fireEvent.click(toggleBtn);
    expect(screen.getByText('intel.readOnly')).toBeInTheDocument();

    // Trigger close_tac_comms
    act(() => {
      window.dispatchEvent(new CustomEvent('unendingvoid:close_tac_comms'));
    });
    expect(screen.queryByText('intel.readOnly')).not.toBeInTheDocument();
  });

  it('dispatches unendingvoid:close_ledger event when opening TAC-COMMS', () => {
    const closeLedgerSpy = vi.fn();
    window.addEventListener('unendingvoid:close_ledger', closeLedgerSpy);

    render(<DMIntelBroadcast />);
    const toggleBtn = screen.getByTitle('Open DM Tactical Comms Feed');
    fireEvent.click(toggleBtn);

    expect(closeLedgerSpy).toHaveBeenCalled();
    window.removeEventListener('unendingvoid:close_ledger', closeLedgerSpy);
  });

  it('triggers blinking unread dot when new broadcast is dispatched while TAC-COMMS is closed, and clears on open', () => {
    localStorage.clear();
    render(<DMIntelBroadcast />);

    // Initially closed, no unread dot
    expect(screen.queryByTestId('tac-comms-unread-dot')).not.toBeInTheDocument();

    // Dispatch new broadcast event (e.g. from DM broadcast)
    act(() => {
      window.dispatchEvent(
        new CustomEvent('unendingvoid:new_broadcast', {
          detail: {
            id: 'intel_test_live_99',
            title: 'Critical Threat Inbound',
            content: 'Hostile stealth fleet on intercept course.',
            createdAt: Date.now(),
          },
        })
      );
    });

    // Unread dot must appear with blinking animation
    expect(screen.getByTestId('tac-comms-unread-dot')).toBeInTheDocument();

    // Click TAC-COMMS to open
    const toggleBtn = screen.getByTitle('Open DM Tactical Comms Feed');
    fireEvent.click(toggleBtn);

    // Unread dot must be cleared
    expect(screen.queryByTestId('tac-comms-unread-dot')).not.toBeInTheDocument();
  });

  it('triggers unread dot on multi-tab storage event when new broadcast arrives', () => {
    localStorage.clear();
    render(<DMIntelBroadcast />);

    act(() => {
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: 'unendingvoid:latest_broadcast',
          newValue: JSON.stringify({
            broadcast: {
              id: 'intel_cross_tab_101',
              title: 'Subspace Alert',
              content: 'Relay transmission received.',
              createdAt: Date.now(),
            },
          }),
        })
      );
    });

    expect(screen.getByTestId('tac-comms-unread-dot')).toBeInTheDocument();
  });
});

