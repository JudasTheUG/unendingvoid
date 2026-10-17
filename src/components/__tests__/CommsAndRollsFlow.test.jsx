import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CommsAndRollsFlow from '../shared/CommsAndRollsFlow';
import { saveLocalBroadcast } from '../shared/DMIntelBroadcast';

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, fallback) => {
      const map = {
        'flow.tabTitle': 'Live Flow',
        'flow.headerTitle': 'Tactical Flow // Comms & Quantum Rolls',
        'flow.commsColumnTitle': 'TAC-COMMS Stream',
        'flow.rollsColumnTitle': 'Quantum Roll Ledger Stream',
        'flow.allChannels': 'All Channels',
        'flow.totalRolls': 'Total Rolls',
        'flow.quickRoll': 'Quick Roll',
        'flow.saveToNotes': 'Save to Field Notes',
        'flow.broadcastNow': 'Broadcast Comms',
      };
      return map[key] || fallback || key;
    },
    i18n: { language: 'en' },
  }),
}));

// Mock firebase
vi.mock('../../lib/firebase', () => ({
  db: null,
}));

describe('CommsAndRollsFlow Component', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders both TAC-COMMS and Quantum Roll Ledger streams simultaneously', () => {
    render(<CommsAndRollsFlow isDM={false} user={{ uid: 'user_1' }} />);

    // Header title
    expect(screen.getByText('Tactical Flow // Comms & Quantum Rolls')).toBeInTheDocument();

    // Both column titles must be visible at the exact same time
    expect(screen.getByText('TAC-COMMS Stream')).toBeInTheDocument();
    expect(screen.getByText('Quantum Roll Ledger Stream')).toBeInTheDocument();

    // Quick roll toolbar must be present
    expect(screen.getByText(/Quick Roll/i)).toBeInTheDocument();
  });

  it('displays real-time dice rolls in the roll ledger stream', () => {
    render(<CommsAndRollsFlow isDM={false} user={{ uid: 'user_1' }} />);

    // Dispatch a multiplayer roll
    act(() => {
      window.dispatchEvent(
        new CustomEvent('unendingvoid:multiplayer_roll', {
          detail: {
            id: 'roll_test_1',
            playerName: 'Valkyrie',
            notation: '1d20+4',
            results: [16],
            total: 20,
            purpose: 'Plasma Railgun Sniping',
            timestamp: '12:00:00 UTC',
          },
        })
      );
    });

    // Roll item should appear in the right column
    expect(screen.getByText('Valkyrie')).toBeInTheDocument();
    expect(screen.getByText('Plasma Railgun Sniping')).toBeInTheDocument();
    expect(screen.getAllByText('20').length).toBeGreaterThanOrEqual(1);
  });

  it('displays incoming TAC-COMMS broadcasts in the comms stream', () => {
    const handleSave = vi.fn();
    render(<CommsAndRollsFlow isDM={false} user={{ uid: 'user_1' }} onSaveToNotes={handleSave} />);

    // Dispatch a new broadcast
    act(() => {
      saveLocalBroadcast({
        id: 'intel_flow_test',
        sender: 'FLEET COMMAND',
        channel: 'FLEET COMMAND',
        priority: 'EMERGENCY',
        title: 'Corvette Intercept Vector',
        content: 'Hostile stealth corvette entering retrograde orbit around Callisto.',
        timestamp: '14:20:00 UTC',
        createdAt: Date.now(),
      });
    });

    expect(screen.getByText('Corvette Intercept Vector')).toBeInTheDocument();
    expect(screen.getByText(/Hostile stealth corvette entering retrograde orbit/i)).toBeInTheDocument();

    // Save to notes action
    const saveBtn = screen.getAllByText('Save to Field Notes')[0];
    fireEvent.click(saveBtn);
    expect(handleSave).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Corvette Intercept Vector',
      })
    );
  });

  it('dispatches unendingvoid:roll when clicking quick roll buttons', () => {
    const rollSpy = vi.fn();
    window.addEventListener('unendingvoid:roll', rollSpy);

    render(<CommsAndRollsFlow isDM={false} user={{ uid: 'user_1' }} />);

    const d20Btn = screen.getByRole('button', { name: 'd20' });
    fireEvent.click(d20Btn);

    expect(rollSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        detail: expect.objectContaining({
          notation: '1d20',
        }),
      })
    );

    window.removeEventListener('unendingvoid:roll', rollSpy);
  });

  it('allows DMs to access the in-flow quick broadcaster', () => {
    render(<CommsAndRollsFlow isDM={true} user={{ uid: 'dm_1' }} profile={{ role: 'dm' }} />);

    const broadcastBtn = screen.getByText('Broadcast Comms');
    expect(broadcastBtn).toBeInTheDocument();

    fireEvent.click(broadcastBtn);
    expect(screen.getByText(/Transmit Fleet Directive/i)).toBeInTheDocument();
  });

  it('renders IntelMediaPreview fallback card for external or Pinterest links that fail to load', () => {
    render(<CommsAndRollsFlow isDM={false} user={{ uid: 'user_1' }} />);

    act(() => {
      saveLocalBroadcast({
        id: 'intel_pinterest_test',
        sender: 'MCRN NAVAL COMMAND',
        channel: 'FLEET COMMAND',
        priority: 'URGENT',
        title: 'Tactical Recon Probe',
        content: 'Surveillance probe photo payload.',
        imageUrl: 'https://pin.it/broken-or-external-image',
        timestamp: '15:00:00 UTC',
        createdAt: Date.now(),
      });
    });

    expect(screen.getByText('Tactical Recon Probe')).toBeInTheDocument();
    const img = screen.getByAltText('Tactical Recon Probe');
    fireEvent.error(img);

    // After load error, Pinterest Intel Attachment card must render cleanly without broken image box
    expect(screen.getByText(/Pinterest Intel Attachment/i)).toBeInTheDocument();
    expect(screen.getByText(/Surveillance still hosted on Pinterest/i)).toBeInTheDocument();
  });
});
