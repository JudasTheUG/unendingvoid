import { describe, it, expect } from 'vitest';
import { calculateModifier } from '../diceModifiers';

describe('calculateModifier', () => {
  const mockPlayer = {
    stats: {
      strength: 16,     // Mod: +3
      dexterity: 14,    // Mod: +2
      constitution: 10, // Mod: 0
      intelligence: 18, // Mod: +4
      wisdom: 8,        // Mod: -1
      charisma: 12,     // Mod: +1
    },
    traits: ['trait_arm', 'trait_lucky', 'trait_cynical'],
  };

  const mockTraitDefs = [
    { id: 'trait_arm', rollModifier: 1 },
    { id: 'trait_lucky', rollModifier: 2 },
    { id: 'trait_cynical', rollModifier: -1 },
    { id: 'trait_passive', rollModifier: 0 },
  ];

  it('calculates strength modifier correctly for attack purpose (+3 stat + 2 traits = +5)', () => {
    // Stat mod for STR 16: floor((16-10)/2) = 3
    // Traits: 1 + 2 - 1 = 2
    // Total: 3 + 2 = 5
    const mod = calculateModifier(mockPlayer, mockTraitDefs, 'attack');
    expect(mod).toBe(5);
  });

  it('calculates dexterity modifier correctly for ranged attack (+2 stat + 2 traits = +4)', () => {
    const mod = calculateModifier(mockPlayer, mockTraitDefs, 'ranged_attack');
    expect(mod).toBe(4);
  });

  it('calculates intelligence modifier correctly for skill check (+4 stat + 2 traits = +6)', () => {
    const mod = calculateModifier(mockPlayer, mockTraitDefs, 'skill_check');
    expect(mod).toBe(6);
  });

  it('calculates negative stat modifier correctly for wisdom (WIS 8: -1 stat + 2 traits = +1)', () => {
    const mod = calculateModifier(mockPlayer, mockTraitDefs, 'perception');
    expect(mod).toBe(1);
  });

  it('handles player with no traits gracefully', () => {
    const playerNoTraits = { ...mockPlayer, traits: [] };
    const mod = calculateModifier(playerNoTraits, mockTraitDefs, 'attack');
    expect(mod).toBe(3);
  });

  it('handles unknown purpose by only applying trait modifiers', () => {
    const mod = calculateModifier(mockPlayer, mockTraitDefs, 'unmapped_custom');
    expect(mod).toBe(2); // Only traits: 1 + 2 - 1
  });

  it('handles empty trait defs without crashing', () => {
    const mod = calculateModifier(mockPlayer, [], 'attack');
    expect(mod).toBe(3);
  });
});
