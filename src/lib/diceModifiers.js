/**
 * Calculate total roll modifier from player's traits and stats.
 * @param {Object} player - Player document
 * @param {Object[]} traitDefs - Trait definition documents
 * @param {string} purpose - Roll purpose (attack, skill_check, etc.)
 * @returns {number} Total modifier to add to dice result
 */
export function calculateModifier(player, traitDefs, purpose) {
  if (!player) return 0;
  let modifier = 0;

  // Stat-based modifier (D&D-style: floor((stat - 10) / 2))
  const relevantStat = getRelevantStat(purpose);
  if (relevantStat && player.stats?.[relevantStat] !== undefined) {
    modifier += Math.floor((player.stats[relevantStat] - 10) / 2);
  }

  // Trait modifiers
  if (player.traits && traitDefs) {
    for (const traitId of player.traits) {
      const trait = traitDefs.find((t) => t.id === traitId);
      if (trait?.rollModifier) {
        modifier += trait.rollModifier;
      }
    }
  }

  return modifier;
}

function getRelevantStat(purpose) {
  const map = {
    attack: 'strength',
    ranged_attack: 'dexterity',
    skill_check: 'intelligence',
    saving_throw: 'constitution',
    persuasion: 'charisma',
    perception: 'wisdom',
  };
  return map[purpose] || null;
}
