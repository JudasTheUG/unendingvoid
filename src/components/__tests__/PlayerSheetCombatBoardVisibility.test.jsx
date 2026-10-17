import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '../../lib/i18n';
import PlayerSheet from '../../pages/PlayerSheet';

let mockCampaignData = {
  combatActive: false,
  combatEnded: true,
  turnOrder: [],
};

vi.mock('../dice/DiceOverlay', () => ({
  default: () => <div data-testid="mock-dice-overlay" />,
  triggerInteractiveRoll: vi.fn(),
}));

vi.mock('react-router-dom', () => ({
  useParams: () => ({ characterId: 'char_test_ugur' }),
  useNavigate: () => vi.fn(),
  Link: ({ children }) => <a>{children}</a>,
}));

vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({
    user: { uid: 'user_ugur', displayName: 'Uğur GELEÇ' },
    profile: { role: 'player' },
  }),
}));

vi.mock('../../hooks/usePlayerData', () => ({
  usePlayerData: () => ({
    data: {
      id: 'char_test_ugur',
      uid: 'char_test_ugur',
      campaignId: 'camp_test_alpha',
      displayName: 'Uğur GELEÇ',
      characterClass: 'Cyber-Commando',
      level: 1,
      hp: 100,
      maxHp: 100,
      shields: 50,
      maxShields: 50,
      credits: 250,
      stats: { strength: 14, dexterity: 12, constitution: 14, intelligence: 10, wisdom: 10, charisma: 10 },
      traits: [],
      inventory: [],
    },
    loading: false,
  }),
}));

vi.mock('../../hooks/useCollection', () => ({
  useCollection: () => ({ docs: [], loading: false }),
}));

vi.mock('firebase/firestore', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    doc: vi.fn((db, col, id) => ({ col, id })),
    onSnapshot: vi.fn((docRef, onNext) => {
      if (docRef?.col === 'campaigns') {
        onNext({
          exists: () => true,
          data: () => mockCampaignData,
        });
      }
      return () => {};
    }),
  };
});

describe('PlayerSheet - Combat Board Button Inactive Visibility Engine', () => {
  beforeEach(() => {
    localStorage.clear();
    mockCampaignData = {
      combatActive: false,
      combatEnded: true,
      turnOrder: [],
    };
  });

  it('does NOT render Enter Tactical Combat Board button when combat is inactive in campaign', () => {
    mockCampaignData = {
      combatActive: false,
      combatEnded: true,
      turnOrder: [],
    };

    render(<PlayerSheet />);

    expect(screen.queryByText(/Enter Tactical Combat Board/i)).not.toBeInTheDocument();
  });

  it('renders Enter Tactical Combat Board button when combat is actively running with combatants', () => {
    mockCampaignData = {
      combatActive: true,
      combatEnded: false,
      turnOrder: ['char_test_ugur', 'enemy_1'],
    };

    render(<PlayerSheet />);

    expect(screen.getByText(/Enter Tactical Combat Board/i)).toBeInTheDocument();
  });

  it('immediately removes Enter Tactical Combat Board button when combat ends via storage event', () => {
    mockCampaignData = {
      combatActive: true,
      combatEnded: false,
      turnOrder: ['char_test_ugur', 'enemy_1'],
    };

    render(<PlayerSheet />);
    expect(screen.getByText(/Enter Tactical Combat Board/i)).toBeInTheDocument();

    // Simulate combat end in another tab
    act(() => {
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: 'unendingvoid:combat_ended',
          newValue: JSON.stringify({ campaignId: 'camp_test_alpha', timestamp: Date.now() }),
        })
      );
    });

    expect(screen.queryByText(/Enter Tactical Combat Board/i)).not.toBeInTheDocument();
  });
});
