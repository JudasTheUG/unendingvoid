import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import DiceOverlay, { ARENA_CONFIG } from '../dice/DiceOverlay';
import { publishRoll } from '../../hooks/useDiceSync';

// Mock Three.js WebGLRenderer to avoid WebGL context issues in jsdom
vi.mock('three', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    WebGLRenderer: function () {
      this.setSize = vi.fn();
      this.setPixelRatio = vi.fn();
      this.render = vi.fn();
      this.dispose = vi.fn();
      this.domElement = document.createElement('canvas');
    },
  };
});

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key) => {
      const dict = {
        'dice.dmPrivateMode': 'DM Screen (Private Rolls)',
        'dice.dmSecretBadge': 'DM Secret',
        'dice.dmSecretBanner': 'DM Roll (Behind Screen)',
      };
      return dict[key] || key;
    },
    i18n: { language: 'en' },
  }),
}));

// Mock firestore
vi.mock('../../lib/firebase', () => ({
  db: {},
}));

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  addDoc: vi.fn().mockResolvedValue({ id: 'roll_mock_123' }),
  onSnapshot: vi.fn(() => vi.fn()),
  query: vi.fn(),
  orderBy: vi.fn(),
  limit: vi.fn(),
  serverTimestamp: vi.fn(),
}));

describe('DM Roll Privacy vs Player Roll Visibility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('publishRoll sets role: "dm" and isSecret: true when role is dm', async () => {
    const payload = await publishRoll({
      userId: 'dm_master',
      playerName: 'Void Architect (DM)',
      role: 'dm',
      notation: '1d20',
      results: [19],
      total: 19,
      purpose: 'Secret Trap Check',
    });

    expect(payload.role).toBe('dm');
    expect(payload.isSecret).toBe(true);
    expect(payload.isDMRoll).toBe(true);
  });

  it('publishRoll sets role: "player" and isSecret: false for player rolls', async () => {
    const payload = await publishRoll({
      userId: 'player_anthony',
      playerName: 'Anthony',
      role: 'player',
      notation: '1d20+3',
      results: [15],
      total: 18,
      purpose: 'Perception Check',
    });

    expect(payload.role).toBe('player');
    expect(payload.isSecret).toBe(false);
    expect(payload.isDMRoll).toBe(false);
  });

  it('renders DM Screen private badge when viewer is DM', () => {
    const dmProfile = {
      role: 'dm',
      displayName: 'Void Architect (DM)',
    };

    render(
      <DiceOverlay
        user={{ uid: 'dm_1' }}
        profile={dmProfile}
        isDM={true}
      />
    );

    // DM badge must be in the UI
    expect(screen.getByText(/DM Screen/i)).toBeInTheDocument();
  });

  it('does NOT render DM Screen badge when viewer is a Player', () => {
    const playerProfile = {
      role: 'player',
      displayName: 'Anthony',
    };

    render(
      <DiceOverlay
        user={{ uid: 'p_1' }}
        profile={playerProfile}
        isDM={false}
      />
    );

    // Player HUD must not have DM Screen private badge
    expect(screen.queryByText(/DM Screen/i)).not.toBeInTheDocument();
  });

  it('hides secret DM rolls from player ledger and shows them in DM ledger', () => {
    // 1. In player overlay, dispatch a remote DM roll
    const playerProfile = { role: 'player', displayName: 'Anthony' };
    const { unmount } = render(
      <DiceOverlay
        user={{ uid: 'p_1' }}
        profile={playerProfile}
        isDM={false}
      />
    );

    // Open ledger
    const ledgerBtn = screen.getByTitle(/Toggle Quantum Roll Ledger/i);
    fireEvent.click(ledgerBtn);

    // Dispatch a secret DM roll event
    act(() => {
      window.dispatchEvent(
        new CustomEvent('unendingvoid:multiplayer_roll', {
          detail: {
            playerId: 'dm_1',
            playerName: 'Void Master (DM)',
            role: 'dm',
            isSecret: true,
            notation: '1d20',
            results: [18],
            total: 18,
            purpose: 'Behind Screen Ambush Check',
          },
        })
      );
    });

    // The secret roll MUST NOT be in the player's ledger!
    expect(screen.queryByText('Behind Screen Ambush Check')).not.toBeInTheDocument();
    unmount();

    // 2. In DM overlay, the DM roll IS visible in the ledger with the secret badge
    const dmProfile = { role: 'dm', displayName: 'Void Master (DM)' };
    render(
      <DiceOverlay
        user={{ uid: 'dm_1' }}
        profile={dmProfile}
        isDM={true}
      />
    );

    const dmledgerBtn = screen.getByTitle(/Toggle Quantum Roll Ledger/i);
    fireEvent.click(dmledgerBtn);

    act(() => {
      window.dispatchEvent(
        new CustomEvent('unendingvoid:multiplayer_roll', {
          detail: {
            playerId: 'dm_other',
            playerName: 'Co-DM',
            role: 'dm',
            isSecret: true,
            notation: '1d20',
            results: [18],
            total: 18,
            purpose: 'Behind Screen Ambush Check',
          },
        })
      );
    });

    // The secret roll IS present for the DM
    expect(screen.getByText('Behind Screen Ambush Check')).toBeInTheDocument();
    expect(screen.getByText(/DM Secret/i)).toBeInTheDocument();
  });

  it('exports ARENA_CONFIG constraining rolls to expanded tactical arena field', () => {
    expect(ARENA_CONFIG).toBeDefined();
    expect(ARENA_CONFIG.halfWidth).toBe(9.8);
    expect(ARENA_CONFIG.halfHeight).toBe(4.95);
    expect(ARENA_CONFIG.minX).toBe(-9.8);
    expect(ARENA_CONFIG.maxX).toBe(9.8);
    expect(ARENA_CONFIG.minY).toBe(-5.5);
    expect(ARENA_CONFIG.maxY).toBe(4.4);
    expect(ARENA_CONFIG.restitution).toBeGreaterThan(0.5);
  });

  it('renders holographic central dice arena when a roll is displayed', () => {
    const { unmount } = render(
      <DiceOverlay
        user={{ uid: 'p_1' }}
        profile={{ role: 'player', displayName: 'Nova' }}
        isDM={false}
      />
    );

    // Trigger a multiplayer roll display
    act(() => {
      window.dispatchEvent(
        new CustomEvent('unendingvoid:multiplayer_roll', {
          detail: {
            playerId: 'p_2',
            playerName: 'Cipher',
            notation: '1d20',
            results: [15],
            total: 15,
            purpose: 'Perception',
          },
        })
      );
    });

    // Holographic central arena field is displayed
    expect(screen.getByTestId('holographic-dice-arena')).toBeInTheDocument();
    unmount();
  });
});

