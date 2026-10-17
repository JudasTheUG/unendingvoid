import { describe, it, expect } from 'vitest';
import { calculateInitiativeBonus } from '../initiativeCalculator';

describe('Initiative Calculator Engine', () => {
  const sampleTraitsCatalog = [
    {
      id: 'trait_alert',
      name: { en: 'Alert (Combat Reflexes)', tr: 'Teyakkuz' },
      initiativeBonus: 10,
    },
    {
      id: 'trait_void_veteran',
      name: { en: 'Void Veteran' },
    },
  ];

  const sampleItemsCatalog = [
    {
      id: 'item_neuro_synapse',
      name: { en: 'Neural Accelerator Cyber-Implant' },
      initiativeBonus: 2,
    },
    {
      id: 'item_plasma_rifle',
      name: { en: 'Pulse Rifle' },
    },
  ];

  it('computes basic dexterity modifier when no traits or gear exist', () => {
    const char1 = { stats: { dexterity: 16 } };
    const res1 = calculateInitiativeBonus(char1);
    expect(res1.dexMod).toBe(3);
    expect(res1.extraBonus).toBe(0);
    expect(res1.totalBonus).toBe(3);
    expect(res1.bonusSources).toEqual([
      { name: 'Dexterity', bonus: 3, type: 'stat' },
    ]);

    const char2 = { stats: { dexterity: 8 } };
    const res2 = calculateInitiativeBonus(char2);
    expect(res2.dexMod).toBe(-1);
    expect(res2.totalBonus).toBe(-1);

    const char3 = { stats: { dexterity: 10 } };
    const res3 = calculateInitiativeBonus(char3);
    expect(res3.dexMod).toBe(0);
    expect(res3.totalBonus).toBe(0);
  });

  it('adds +10 for Alert trait (d20 + DEX + Alert trait)', () => {
    // Character with DEX 16 (+3) and Alert trait (+10)
    const alertCharacter = {
      name: 'Anthony',
      stats: { dexterity: 16 },
      traits: ['trait_alert'],
    };

    const res = calculateInitiativeBonus(alertCharacter, sampleTraitsCatalog);
    expect(res.dexMod).toBe(3);
    expect(res.extraBonus).toBe(10);
    expect(res.totalBonus).toBe(13); // 3 + 10 = 13
    expect(res.bonusSources).toHaveLength(2);
    expect(res.bonusSources[0]).toEqual({ name: 'Dexterity', bonus: 3, type: 'stat' });
    expect(res.bonusSources[1].bonus).toBe(10);
    expect(res.bonusSources[1].type).toBe('trait');
  });

  it('supports Alert trait passed as an embedded object', () => {
    const charWithEmbeddedTrait = {
      name: 'Anthony',
      stats: { dexterity: 14 }, // +2 DEX
      traits: [{ id: 'trait_alert', name: 'Alert Feat', initiativeBonus: 10 }],
    };

    const res = calculateInitiativeBonus(charWithEmbeddedTrait);
    expect(res.dexMod).toBe(2);
    expect(res.extraBonus).toBe(10);
    expect(res.totalBonus).toBe(12);
  });

  it('combines DEX + Alert Trait + Cyberware implants + Custom bonus', () => {
    const fullyAugmentedChar = {
      name: 'Anthony Cybersoldier',
      stats: { dexterity: 18 }, // +4 DEX
      traits: ['trait_alert'], // +10
      inventory: ['item_neuro_synapse'], // +2
      customInitiativeBonus: 1, // +1
    };

    const res = calculateInitiativeBonus(
      fullyAugmentedChar,
      sampleTraitsCatalog,
      sampleItemsCatalog
    );

    expect(res.dexMod).toBe(4);
    expect(res.extraBonus).toBe(13); // 10 + 2 + 1
    expect(res.totalBonus).toBe(17); // 4 + 10 + 2 + 1 = 17
    expect(res.bonusSources).toHaveLength(4);
  });

  it('gracefully handles null, empty, or undefined character objects', () => {
    const res = calculateInitiativeBonus(null);
    expect(res.totalBonus).toBe(0);
    expect(res.dexMod).toBe(0);
    expect(res.extraBonus).toBe(0);
    expect(res.bonusSources).toEqual([]);
  });
});
