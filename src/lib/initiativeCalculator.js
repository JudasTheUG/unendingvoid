/**
 * Comprehensive Initiative Calculation Engine
 * Computes initiative bonus taking into account:
 * 1. Base Dexterity Modifier (Math.floor((DEX - 10) / 2))
 * 2. Character Traits (e.g. Alert feat +10, Combat Reflexes, etc.)
 * 3. Cyberware & Equipped Items (e.g. Neural Accelerator +2)
 * 4. Custom Initiative Modifiers
 */

export function calculateInitiativeBonus(character, allTraits = [], allItems = []) {
  if (!character) {
    return { totalBonus: 0, dexMod: 0, extraBonus: 0, bonusSources: [] };
  }

  // 1. Base Dexterity Modifier
  const dexScore =
    character.stats?.dexterity !== undefined
      ? character.stats.dexterity
      : (character.dexterity !== undefined ? character.dexterity : 10);
  const dexMod = Math.floor((dexScore - 10) / 2);

  let extraBonus = 0;
  const bonusSources = [];

  if (dexMod !== 0) {
    bonusSources.push({
      name: 'Dexterity',
      bonus: dexMod,
      type: 'stat',
    });
  }

  // 2. Character Traits (e.g. "Alert" trait +10, etc.)
  const traits = character.traits || [];
  traits.forEach((tItem) => {
    const tId = typeof tItem === 'object' ? tItem.id : tItem;
    const traitDef =
      typeof tItem === 'object'
        ? tItem
        : allTraits.find((t) => t.id === tId);

    if (traitDef) {
      if (typeof traitDef.initiativeBonus === 'number') {
        extraBonus += traitDef.initiativeBonus;
        bonusSources.push({
          name: traitDef.name?.en || traitDef.name || 'Trait Bonus',
          bonus: traitDef.initiativeBonus,
          type: 'trait',
        });
      } else if (
        tId === 'trait_alert' ||
        (typeof traitDef.name === 'string' && traitDef.name.toLowerCase().includes('alert')) ||
        (typeof traitDef.name === 'object' && traitDef.name.en?.toLowerCase().includes('alert'))
      ) {
        extraBonus += 10;
        bonusSources.push({
          name: 'Alert Trait',
          bonus: 10,
          type: 'trait',
        });
      }
    } else if (
      tId === 'trait_alert' ||
      (typeof tId === 'string' && tId.toLowerCase().includes('alert'))
    ) {
      extraBonus += 10;
      bonusSources.push({
        name: 'Alert Trait',
        bonus: 10,
        type: 'trait',
      });
    }
  });

  // 3. Cyberware, Equipped Gear & Items
  const inventory = character.inventory || [];
  inventory.forEach((iItem) => {
    const itemId = typeof iItem === 'object' ? iItem.id : iItem;
    const itemDef =
      typeof iItem === 'object'
        ? iItem
        : allItems.find((it) => it.id === itemId);

    if (itemDef) {
      if (typeof itemDef.initiativeBonus === 'number') {
        extraBonus += itemDef.initiativeBonus;
        bonusSources.push({
          name: itemDef.name?.en || itemDef.name || 'Item Bonus',
          bonus: itemDef.initiativeBonus,
          type: 'item',
        });
      } else if (itemId === 'item_neuro_synapse') {
        extraBonus += 2;
        bonusSources.push({
          name: 'Neural Accelerator Cyber-Implant',
          bonus: 2,
          type: 'item',
        });
      }
    } else if (itemId === 'item_neuro_synapse') {
      extraBonus += 2;
      bonusSources.push({
        name: 'Neural Accelerator Cyber-Implant',
        bonus: 2,
        type: 'item',
      });
    }
  });

  // 4. Custom Initiative Modifiers on Character Model
  const customBonus =
    typeof character.customInitiativeBonus === 'number'
      ? character.customInitiativeBonus
      : (typeof character.initiativeMod === 'number'
          ? character.initiativeMod
          : (typeof character.initiativeBonus === 'number' && !character.traits?.includes('trait_alert')
              ? character.initiativeBonus
              : 0));

  if (customBonus !== 0) {
    extraBonus += customBonus;
    bonusSources.push({
      name: 'Custom Modifier',
      bonus: customBonus,
      type: 'custom',
    });
  }

  const totalBonus = dexMod + extraBonus;

  return {
    totalBonus,
    dexMod,
    extraBonus,
    bonusSources,
  };
}
