import { doc, updateDoc, arrayUnion, arrayRemove, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

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
