import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import InitiativeRollModal from '../player/InitiativeRollModal';
import CombatTracker from '../dm/CombatTracker';

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key) => key,
    i18n: { language: 'en' },
  }),
}));

// Mock dice overlay triggerInteractiveRoll
vi.mock('../dice/DiceOverlay', () => ({
  triggerInteractiveRoll: vi.fn(),
}));

// Mock campaign actions
vi.mock('../../lib/campaignActions', () => ({
  requestInitiative: vi.fn().mockResolvedValue({ initiativeRequested: true }),
  submitInitiativeRoll: vi.fn().mockResolvedValue({ total: 18 }),
  setCombatTurnOrder: vi.fn().mockResolvedValue({ combatActive: true }),
}));

describe('InitiativeRollModal & Leeeerooyy Button', () => {
  const mockCharacter = {
    id: 'char_kael',
    name: 'Kaelen Voss',
    displayName: 'Kaelen Voss',
    stats: { dexterity: 16 }, // +3 DEX mod
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders modal with "Leeeerooyy..." button and operative DEX mod', () => {
    render(
      <InitiativeRollModal
        character={mockCharacter}
        campaignId="camp_1"
        forceOpen={true}
      />
    );

    expect(screen.getByText('combat.rollInitiativeTitle')).toBeInTheDocument();
    expect(screen.getByText('Kaelen Voss')).toBeInTheDocument();
    expect(screen.getByText('+3')).toBeInTheDocument();

    // Check exact button requested by user
    const rollButton = screen.getByText('Leeeerooyy...');
    expect(rollButton).toBeInTheDocument();
  });

  it('computes and displays Alert trait (+10) along with DEX modifier (+3 = +13)', () => {
    const alertChar = {
      id: 'char_alert',
      name: 'Anthony Alert',
      displayName: 'Anthony Alert',
      stats: { dexterity: 16 }, // +3
      traits: [{ id: 'trait_alert', name: 'Alert Feat', initiativeBonus: 10 }],
    };

    render(
      <InitiativeRollModal
        character={alertChar}
        campaignId="camp_1"
        forceOpen={true}
      />
    );

    // Total should be +13
    expect(screen.getByText('+13')).toBeInTheDocument();
    expect(screen.getByText('DEX: +3')).toBeInTheDocument();
    expect(screen.getByText('Alert Feat: +10')).toBeInTheDocument();
  });

  it('clicking "Leeeerooyy..." closes popup, triggers 3D dice, and submits identical roll to DM', async () => {
    const { submitInitiativeRoll } = await import('../../lib/campaignActions');
    const { triggerInteractiveRoll } = await import('../dice/DiceOverlay');

    const onClose = vi.fn();

    render(
      <InitiativeRollModal
        character={mockCharacter}
        campaignId="camp_1"
        forceOpen={true}
        onClose={onClose}
      />
    );

    const rollButton = screen.getByText('Leeeerooyy...');
    await act(async () => {
      fireEvent.click(rollButton);
    });

    // Verify triggerInteractiveRoll was called immediately with fixedResults
    expect(triggerInteractiveRoll).toHaveBeenCalledTimes(1);
    const callArgs = triggerInteractiveRoll.mock.calls[0];
    const notation = callArgs[0];
    const mod = callArgs[1];
    const fixedResults = callArgs[5];

    expect(notation).toBe('1d20');
    expect(mod).toBe(3);
    expect(Array.isArray(fixedResults)).toBe(true);
    const d20 = fixedResults[0];

    // Verify submitInitiativeRoll was called with the exact same d20 and total
    expect(submitInitiativeRoll).toHaveBeenCalledTimes(1);
    expect(submitInitiativeRoll).toHaveBeenCalledWith(
      'camp_1',
      expect.objectContaining({
        playerId: 'char_kael',
        playerName: 'Kaelen Voss',
        roll: d20,
        modifier: 3,
        total: d20 + 3,
      })
    );
  });
});

describe('CombatTracker DM Initiative Flow', () => {
  const mockPlayers = [
    { id: 'p1', name: 'Anthony', displayName: 'Anthony', stats: { dexterity: 14 } },
    { id: 'p2', name: 'Lyra', displayName: 'Lyra', stats: { dexterity: 12 } },
  ];

  it('renders "Ask Initiative" button and allows auto-rolling enemy initiatives', async () => {
    const { requestInitiative } = await import('../../lib/campaignActions');

    render(
      <CombatTracker
        campaignId="camp_1"
        players={mockPlayers}
        turnOrder={['p1', 'p2']}
        currentTurn={0}
        combatActive={false}
      />
    );

    // Check Ask Initiative button
    const askButton = screen.getByTitle("Broadcast initiative request to all players with 'Leeeerooyy...' button");
    expect(askButton).toBeInTheDocument();

    fireEvent.click(askButton);
    expect(requestInitiative).toHaveBeenCalledWith('camp_1');

    // Auto-roll enemies
    const autoRollBtn = screen.getByText('Auto-Roll Hostile Initiatives');
    fireEvent.click(autoRollBtn);

    // Finalize Turn Order button
    const finalizeBtn = screen.getByText('Finalize Turn Order & Engage Combat');
    expect(finalizeBtn).toBeInTheDocument();
  });

  it('switches from "Awaiting operative rolls" to "All Players Ready" when all players submit rolls', () => {
    localStorage.setItem(
      'unendingvoid:initiative_rolls',
      JSON.stringify({
        p1: { playerId: 'p1', roll: 14, total: 16 },
        p2: { playerId: 'p2', roll: 10, total: 11 },
      })
    );

    render(
      <CombatTracker
        campaignId="camp_1"
        players={mockPlayers}
        turnOrder={['p1', 'p2']}
        currentTurn={0}
        combatActive={false}
      />
    );

    // Both players submitted rolls, so it should display "combat.allPlayersReady"
    const readyElements = screen.getAllByText('combat.allPlayersReady');
    expect(readyElements.length).toBeGreaterThan(0);
  });
});
