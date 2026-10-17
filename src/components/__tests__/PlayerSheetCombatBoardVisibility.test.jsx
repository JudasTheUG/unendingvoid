import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '../../lib/i18n';
import PlayerSheet from '../../pages/PlayerSheet';
import { resolvePartyRest } from '../../lib/campaignActions';

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
    window.alert = vi.fn();
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

  it('renders initial campaign calendar date and opens rest requisition on short rest, advancing time upon DM approval', async () => {
    mockCampaignData = {
      combatActive: false,
      combatEnded: true,
      inGameTime: '2381-05-18T08:00:00',
      turnOrder: [],
    };

    render(<PlayerSheet />);

    expect(screen.getByText(/18 May 2381 08:00/i)).toBeInTheDocument();

    const shortRestBtn = screen.getByRole('button', { name: /Short Rest/i });
    await act(async () => {
      shortRestBtn.click();
    });

    // Requisition modal should be displayed waiting for squad and DM
    expect(screen.getByText(/Squad Rest Requisition/i)).toBeInTheDocument();

    // DM authorizes the rest
    await act(async () => {
      await resolvePartyRest('camp_test_alpha', true, [], '2381-05-18T08:00:00');
    });

    expect(screen.getByText(/18 May 2381 10:00/i)).toBeInTheDocument();
  });

  it('advances calendar date by 8 hours on long rest upon DM authorization', async () => {
    mockCampaignData = {
      combatActive: false,
      combatEnded: true,
      inGameTime: '2381-05-18T08:00:00',
      turnOrder: [],
    };

    render(<PlayerSheet />);

    expect(screen.getByText(/18 May 2381 08:00/i)).toBeInTheDocument();

    const longRestBtn = screen.getByRole('button', { name: /Long Rest/i });
    await act(async () => {
      longRestBtn.click();
    });

    // Requisition modal should be displayed
    expect(screen.getByText(/Squad Rest Requisition/i)).toBeInTheDocument();

    // DM authorizes the long rest (+8h)
    await act(async () => {
      await resolvePartyRest('camp_test_alpha', true, [], '2381-05-18T08:00:00');
    });

    expect(screen.getByText(/18 May 2381 16:00/i)).toBeInTheDocument();
  });
});
