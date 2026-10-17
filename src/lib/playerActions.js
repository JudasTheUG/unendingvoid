import { doc, updateDoc, deleteDoc, arrayUnion, arrayRemove, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

export const deleteCharacter = (characterId) =>
  deleteDoc(doc(db, 'players', characterId));


export const updatePlayerHP = (userId, hp) =>
  updateDoc(doc(db, 'players', userId), { hp, updatedAt: serverTimestamp() });

export const updatePlayerShields = (userId, shields) =>
  updateDoc(doc(db, 'players', userId), { shields, updatedAt: serverTimestamp() });

export const updatePlayerStat = (userId, stat, value) =>
  updateDoc(doc(db, 'players', userId), {
    [`stats.${stat}`]: value,
    updatedAt: serverTimestamp(),
  });

export const addTrait = (userId, traitId) =>
  updateDoc(doc(db, 'players', userId), {
    traits: arrayUnion(traitId),
    updatedAt: serverTimestamp(),
  });

export const removeTrait = (userId, traitId) =>
  updateDoc(doc(db, 'players', userId), {
    traits: arrayRemove(traitId),
    updatedAt: serverTimestamp(),
  });

export const addItemToInventory = (userId, itemId) =>
  updateDoc(doc(db, 'players', userId), {
    inventory: arrayUnion(itemId),
    updatedAt: serverTimestamp(),
  });

export const removeItemFromInventory = (userId, itemId) =>
  updateDoc(doc(db, 'players', userId), {
    inventory: arrayRemove(itemId),
    updatedAt: serverTimestamp(),
  });

export const updateCredits = (userId, credits) =>
  updateDoc(doc(db, 'players', userId), { credits, updatedAt: serverTimestamp() });

export const equipWeapon = (userId, itemId) =>
  updateDoc(doc(db, 'players', userId), { equippedWeapon: itemId, updatedAt: serverTimestamp() });

export const equipArmor = (userId, itemId) =>
  updateDoc(doc(db, 'players', userId), { equippedArmor: itemId, updatedAt: serverTimestamp() });

export const setSpaceship = (userId, itemId) =>
  updateDoc(doc(db, 'players', userId), { spaceship: itemId, updatedAt: serverTimestamp() });

export const addPlayerNote = (userId, note) =>
  updateDoc(doc(db, 'players', userId), {
    notes: arrayUnion(note),
    updatedAt: serverTimestamp(),
  });

export const removePlayerNote = (userId, note) =>
  updateDoc(doc(db, 'players', userId), {
    notes: arrayRemove(note),
    updatedAt: serverTimestamp(),
  });

export const setPlayerEEMembership = (userId, hasEEMembership = true) =>
  updateDoc(doc(db, 'players', userId), {
    hasEEMembership,
    inventory: arrayUnion('item_ee_membership'),
    updatedAt: serverTimestamp(),
  });

export const assignShipToPlayer = (userId, shipData) => {
  try {
    const raw = localStorage.getItem(`unendingvoid_player_${userId}`);
    const parsed = raw ? JSON.parse(raw) : { uid: userId };
    parsed.ship = shipData;
    parsed.spaceship = shipData?.id || null;
    parsed.spaceshipName = shipData
      ? typeof shipData.name === 'object'
        ? shipData.name.en
        : shipData.name
      : null;
    localStorage.setItem(`unendingvoid_player_${userId}`, JSON.stringify(parsed));
  } catch (_) {}

  return updateDoc(doc(db, 'players', userId), {
    ship: shipData,
    spaceship: shipData?.id || null,
    spaceshipName: shipData ? (typeof shipData.name === 'object' ? shipData.name.en : shipData.name) : null,
    updatedAt: serverTimestamp(),
  });
};

export const updateShipVitals = (userId, { hull, shields }) => {
  try {
    const raw = localStorage.getItem(`unendingvoid_player_${userId}`);
    const parsed = raw ? JSON.parse(raw) : { uid: userId };
    if (parsed.ship) {
      parsed.ship.hull = hull;
      parsed.ship.shields = shields;
    } else {
      parsed.ship = { hull, shields };
    }
    localStorage.setItem(`unendingvoid_player_${userId}`, JSON.stringify(parsed));
  } catch (_) {}

  return updateDoc(doc(db, 'players', userId), {
    'ship.hull': hull,
    'ship.shields': shields,
    updatedAt: serverTimestamp(),
  });
};

export const removeShipFromPlayer = (userId) => {
  try {
    const raw = localStorage.getItem(`unendingvoid_player_${userId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      parsed.ship = null;
      parsed.spaceship = null;
      parsed.spaceshipName = null;
      localStorage.setItem(`unendingvoid_player_${userId}`, JSON.stringify(parsed));
    }
  } catch (_) {}

  return updateDoc(doc(db, 'players', userId), {
    ship: null,
    spaceship: null,
    spaceshipName: null,
    updatedAt: serverTimestamp(),
  });
};

export const updatePlayerInventory = (userId, inventory) =>
  updateDoc(doc(db, 'players', userId), {
    inventory,
    updatedAt: serverTimestamp(),
  });

export const addPlayerDesign = (userId, designId) =>
  updateDoc(doc(db, 'players', userId), {
    designs: arrayUnion(designId),
    inventory: arrayUnion(`design_${designId}`),
    updatedAt: serverTimestamp(),
  });

export const updatePlayerAvatar = (userId, avatarUrl) => {
  try {
    const raw = localStorage.getItem(`unendingvoid_player_${userId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      parsed.avatarUrl = avatarUrl;
      parsed.photoURL = avatarUrl;
      parsed.imageUrl = avatarUrl;
      localStorage.setItem(`unendingvoid_player_${userId}`, JSON.stringify(parsed));
    }
  } catch (_) {}

  return updateDoc(doc(db, 'players', userId), {
    avatarUrl,
    photoURL: avatarUrl,
    imageUrl: avatarUrl,
    updatedAt: serverTimestamp(),
  });
};



