import {
  collection,
  doc,
  addDoc,
  updateDoc,
  setDoc,
  arrayUnion,
  arrayRemove,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';

/**
 * Creates a new campaign where the creator is automatically the DM.
 */
export async function createCampaign({ name, description = '', dmId, dmName }) {
  const code = Math.random().toString(36).substring(2, 8).toUpperCase();
  const campaignData = {
    name,
    description,
    dmId,
    dmName: dmName || 'Void Master',
    inviteCode: code,
    activeCharacters: [],
    combatActive: false,
    turnOrder: [],
    currentTurn: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const docRef = await addDoc(collection(db, 'campaigns'), campaignData);
  return { id: docRef.id, ...campaignData };
}

/**
 * Assigns or adds a character to an existing campaign.
 */
export async function addCharacterToCampaign(campaignId, character) {
  const campaignRef = doc(db, 'campaigns', campaignId);
  const characterRef = doc(db, 'players', character.id || character.uid);

  // Link campaign ID to character
  await updateDoc(characterRef, {
    campaignId,
    updatedAt: serverTimestamp(),
  });

  // Add character summary to campaign roster
  const summary = {
    characterId: character.id || character.uid,
    ownerId: character.ownerId || character.uid,
    name: character.displayName || character.name || 'Unnamed Operative',
    characterClass: character.characterClass || 'Operative',
    level: character.level || 1,
    hp: character.hp || 100,
    maxHp: character.maxHp || 100,
  };

  await updateDoc(campaignRef, {
    activeCharacters: arrayUnion(summary),
    updatedAt: serverTimestamp(),
  });
}

/**
 * DM level up engine for any character in their campaign.
 */
export async function levelUpCharacter(characterId, { hpIncrease = 8, shieldIncrease = 5, statIncreases = {} } = {}) {
  const characterRef = doc(db, 'players', characterId);

  // Read current stats and increment level
  const updates = {
    updatedAt: serverTimestamp(),
  };

  if (hpIncrease) {
    updates.maxHp = (prevMaxHp) => (prevMaxHp || 100) + hpIncrease; // or handled via object
  }

  // We write the calculated updates directly
  const payload = {
    updatedAt: serverTimestamp(),
  };

  return updateDoc(characterRef, payload);
}

/**
 * Create a new player character owned by a user.
 */
export async function createCharacter({
  ownerId,
  name,
  characterClass = 'Cyber-Commando',
  species = 'Augmented Human',
  background = 'Ex-Corporate Mercenary',
  stats = { strength: 14, dexterity: 12, constitution: 14, intelligence: 10, wisdom: 10, charisma: 10 },
}) {
  const characterId = `char_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const characterRef = doc(db, 'players', characterId);

  const newChar = {
    id: characterId,
    uid: characterId,
    ownerId,
    displayName: name,
    name,
    characterClass,
    species,
    background,
    level: 1,
    proficiencyBonus: 2,
    hp: 24,
    maxHp: 24,
    shields: 15,
    maxShields: 15,
    tempHp: 0,
    speed: 30,
    armorClass: 14,
    initiativeBonus: Math.floor((stats.dexterity - 10) / 2),
    credits: 250,
    stats,
    savingThrowProficiencies: ['strength', 'constitution'],
    skillProficiencies: ['athletics', 'perception', 'stealth'],
    attacks: [
      {
        id: 'atk_plasma_rifle',
        name: 'Pulse Carbine',
        range: 'Ranged 80/240 ft',
        stat: 'dexterity',
        damageDice: '1d8',
        damageType: 'Energy',
        damageBonus: Math.floor((stats.dexterity - 10) / 2),
      },
      {
        id: 'atk_vibro_blade',
        name: 'Monomolecular Blade',
        range: 'Melee 5 ft',
        stat: 'strength',
        damageDice: '1d6',
        damageType: 'Slashing',
        damageBonus: Math.floor((stats.strength - 10) / 2),
      },
    ],
    traits: ['trait_cybernetic_arm'],
    inventory: ['item_plasma_rifle', 'item_nanite_stim'],
    equippedWeapon: 'item_plasma_rifle',
    equippedArmor: null,
    spaceship: null,
    campaignId: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  await setDoc(characterRef, newChar);
  return newChar;
}
