import {
  signInWithPopup,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './firebase';

const googleProvider = new GoogleAuthProvider();

export const signInGoogle = () => signInWithPopup(auth, googleProvider);

export const signInEmail = (email, password) =>
  signInWithEmailAndPassword(auth, email, password);

export const registerEmail = async (email, password, displayName) => {
  const cred = await createUserWithEmailAndPassword(auth, email, password);

  // Create initial player document with default stats
  await setDoc(doc(db, 'players', cred.user.uid), {
    uid: cred.user.uid,
    displayName,
    role: 'player',
    locale: 'en',
    hp: 100,
    maxHp: 100,
    shields: 50,
    maxShields: 50,
    credits: 500,
    stats: {
      strength: 10,
      dexterity: 10,
      constitution: 10,
      intelligence: 10,
      wisdom: 10,
      charisma: 10,
    },
    traits: [],
    inventory: [],
    equippedWeapon: null,
    equippedArmor: null,
    spaceship: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return cred;
};

export const logout = () => signOut(auth);
