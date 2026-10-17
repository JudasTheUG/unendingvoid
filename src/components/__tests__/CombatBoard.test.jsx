import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CombatBoardPage from '../../pages/CombatBoardPage';
import * as campaignActions from '../../lib/campaignActions';

// Mock react-router-dom useParams
vi.mock('react-router-dom', () => ({
  useParams: () => ({ campaignId: 'camp_alpha' }),
  useNavigate: () => vi.fn(),
  Link: ({ children }) => <a>{children}</a>,
}));

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, fallback) => fallback || key,
    i18n: { language: 'en' },
  }),
}));

// Mock useAuth
vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({
    user: { uid: 'dm_user_1', displayName: 'Dungeon Master' },
    profile: { role: 'dm' },
  }),
}));

// Mock Firebase onSnapshot for campaign and players
vi.mock('firebase/firestore', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    doc: vi.fn((db, col, id) => ({ col, id })),
    onSnapshot: vi.fn((docRef, onNext) => {
      if (docRef?.col === 'players') {
        const pName = docRef.id === 'char_ugur' ? 'Uğur GELEÇ' : 'Salih Eyyübi';
        onNext({
          exists: () => true,
          id: docRef.id,
          data: () => ({
            displayName: pName,
            name: pName,
            hp: 100,
            maxHp: 100,
          }),
        });
        return () => {};
      }

      // Mock snapshot data for campaign
      onNext({
        exists: () => true,
        data: () => ({
          name: 'The Expanse Void',
          dmId: 'dm_user_1',
          combatActive: true,
          combatMode: 'ground',
          turnOrder: ['char_ugur', 'char_salih', 'en_sniper'],
          activeCharacters: [
            { characterId: 'char_ugur', uid: 'char_ugur', displayName: 'Uğur GELEÇ' },
            { characterId: 'char_salih', uid: 'char_salih', displayName: 'Salih Eyyübi' },
          ],
          enemies: [
            { id: 'en_sniper', name: 'MCRN Sniper', hp: 35, maxHp: 35, dexMod: 3, status: 'Normal', effect: 'None' },
          ],
          combatState: {
            tokens: {
              char_ugur: { x: 4, y: 8 },
              char_salih: { x: 4, y: 12 },
              en_sniper: { x: 27, y: 10 },
            },
            targets: {
              char_ugur: 'en_sniper',
            },
            playerStatuses: {
              char_ugur: 'Normal',
              char_salih: 'Normal',
            },
            playerEffects: {},
          },
          round: 1,
          currentTurn: 0,
        }),
      });
      return () => {};
    }),
    updateDoc: vi.fn().mockResolvedValue(),
    serverTimestamp: () => 'SERVER_TIME',
  };
});

// Mock campaign actions
vi.mock('../../lib/campaignActions', () => ({
  updateTokenPosition: vi.fn().mockResolvedValue(),
  setCombatTarget: vi.fn().mockResolvedValue(),
  updateCombatantStats: vi.fn().mockResolvedValue(),
  advanceCombatTurn: vi.fn().mockResolvedValue(),
  addCombatantToCombat: vi.fn().mockResolvedValue({ id: 'en_new' }),
}));

// Mock useDiceSync
vi.mock('../../hooks/useDiceSync', () => ({
  useDiceSync: vi.fn((onNewRoll, onHistoryLoaded) => {
    React.useEffect(() => {
      if (onHistoryLoaded) {
        onHistoryLoaded([
          {
            id: 'roll_1',
            playerName: 'Uğur GELEÇ',
            label: 'Plasma Rifle Attack',
            notation: '1d20',
            results: [19],
            modifier: 4,
            total: 23,
            timestamp: Date.now(),
          },
        ]);
      }
    }, []);
  }),
  getStoredRolls: vi.fn().mockReturnValue([]),
}));

// Mock 3D dice overlay
vi.mock('../dice/DiceOverlay', () => ({
  default: () => <div data-testid="dice-overlay-mock" />,
}));

describe('CombatBoardPage & 32x32 Grid System', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders all combatant names properly including displayName without leaving blanks', () => {
    render(<CombatBoardPage />);

    // Check that player names from activeCharacters / displayName are rendered
    expect(screen.getAllByText(/Uğur GELEÇ/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Salih Eyyübi/i)).toBeInTheDocument();
    expect(screen.getByText(/MCRN Sniper/i)).toBeInTheDocument();
  });

  it('renders tokens on the grid with coordinates and active turn indicator', () => {
    render(<CombatBoardPage />);

    // Tokens should be rendered on the grid (initials: "UĞ", "SA", "MC")
    const ugurInitials = screen.getAllByText('UĞ');
    expect(ugurInitials.length).toBeGreaterThan(0);

    const mcrnInitials = screen.getAllByText('MC');
    expect(mcrnInitials.length).toBeGreaterThan(0);
  });

  it('renders manual entry field with Damage and Heal buttons for DM', async () => {
    render(<CombatBoardPage />);

    // Manual entry input exists
    const amtInputs = screen.getAllByPlaceholderText(/Amt/i);
    expect(amtInputs.length).toBeGreaterThan(0);

    // Damage & Heal buttons exist
    const damageButtons = screen.getAllByText(/Damage/i);
    expect(damageButtons.length).toBeGreaterThan(0);

    const healButtons = screen.getAllByText(/Heal/i);
    expect(healButtons.length).toBeGreaterThan(0);

    // Apply 10 damage to first combatant
    fireEvent.change(amtInputs[0], { target: { value: '10' } });
    await act(async () => {
      fireEvent.click(damageButtons[0]);
    });

    expect(campaignActions.updateCombatantStats).toHaveBeenCalledWith(
      'camp_alpha',
      'char_ugur',
      false,
      expect.objectContaining({ hp: 90 })
    );
  });

  it('renders Status combobox (Normal, Unconscious, Dead) and Effect combobox for DM', async () => {
    render(<CombatBoardPage />);

    const selectElements = screen.getAllByRole('combobox');
    expect(selectElements.length).toBeGreaterThan(0);

    // First select is Status, change to Unconscious
    await act(async () => {
      fireEvent.change(selectElements[0], { target: { value: 'Unconscious' } });
    });

    expect(campaignActions.updateCombatantStats).toHaveBeenCalledWith(
      'camp_alpha',
      'char_ugur',
      false,
      expect.objectContaining({ status: 'Unconscious' })
    );
  });

  it('renders the Quantum Roll Ledger directly visible on the right panel', () => {
    render(<CombatBoardPage />);

    expect(screen.getByText(/Quantum Roll Ledger/i)).toBeInTheDocument();
    expect(screen.getByText(/Plasma Rifle Attack/i)).toBeInTheDocument();
    expect(screen.getByText('23')).toBeInTheDocument();
  });

  it('allows DM to open spawn hostile modal and add an enemy to combat', async () => {
    render(<CombatBoardPage />);

    const spawnBtn = screen.getByText(/\+ Spawn Hostile \/ NPC/i);
    fireEvent.click(spawnBtn);

    expect(screen.getByText(/Spawn Tactical Hostile \/ NPC/i)).toBeInTheDocument();
    expect(screen.getByText(/Syndicate Sniper/i)).toBeInTheDocument();

    // Click preset
    await act(async () => {
      fireEvent.click(screen.getByText(/Syndicate Sniper/i));
    });

    expect(campaignActions.addCombatantToCombat).toHaveBeenCalledWith(
      'camp_alpha',
      expect.objectContaining({ name: 'Syndicate Sniper', hp: 35 })
    );
  });
});
