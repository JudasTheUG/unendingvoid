import {
  signInWithPopup,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInAnonymously,
  signOut,
} from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './firebase';

const googleProvider = new GoogleAuthProvider();

export const STORAGE_LOCAL_ACCOUNTS = 'unendingvoid_local_accounts';
export const STORAGE_ACTIVE_USER = 'unendingvoid_active_user';
export const STORAGE_ACTIVE_PROFILE = 'unendingvoid_active_profile';

/**
 * Normalizes a username or email input into a valid email string for Firebase Auth.
 * If the input already contains '@', it is treated as an email.
 * Otherwise, it converts the username into a deterministic '@unendingvoid.local' format.
 */
export function normalizeUsernameToEmail(identifier) {
  if (!identifier) return '';
  const trimmed = identifier.trim().toLowerCase();
  if (trimmed.includes('@')) {
    return trimmed;
  }
  // Sanitize username: keep alphanumeric, underscores, dots, and hyphens
  const safeUsername = trimmed.replace(/[^a-z0-9_.-]/g, '_');
  return `${safeUsername || 'user'}@unendingvoid.local`;
}

/**
 * Extracts a readable username from an identifier.
 */
export function extractUsername(identifier) {
  if (!identifier) return 'Operative';
  const trimmed = identifier.trim();
  if (trimmed.includes('@')) {
    return trimmed.split('@')[0];
  }
  return trimmed;
}

/**
 * Reads local accounts stored in the browser's localStorage.
 */
export function getLocalAccounts() {
  try {
    const raw = localStorage.getItem(STORAGE_LOCAL_ACCOUNTS);
    return raw ? JSON.parse(raw) : {};
  } catch (err) {
    console.warn('[authService] Error reading local accounts:', err);
    return {};
  }
}

/**
 * Saves or updates a local account in localStorage.
 */
export function saveLocalAccount(account) {
  try {
    const accounts = getLocalAccounts();
    const key = (account.username || account.email || 'user').toLowerCase();
    accounts[key] = {
      ...account,
      updatedAt: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_LOCAL_ACCOUNTS, JSON.stringify(accounts));
    return accounts[key];
  } catch (err) {
    console.warn('[authService] Error saving local account:', err);
    return account;
  }
}

/**
 * Sets the active user and profile in localStorage and notifies listeners.
 */
export function setActiveSession(user, profile = null) {
  try {
    if (user) {
      localStorage.setItem(STORAGE_ACTIVE_USER, JSON.stringify(user));
      if (profile) {
        localStorage.setItem(STORAGE_ACTIVE_PROFILE, JSON.stringify(profile));
      }
      window.dispatchEvent(
        new CustomEvent('unendingvoid_auth_change', {
          detail: { user, profile },
        })
      );
    }
  } catch (err) {
    console.warn('[authService] Error setting active session:', err);
  }
}

/**
 * Clears the active session from localStorage and notifies listeners.
 */
export function clearActiveSession() {
  try {
    localStorage.removeItem(STORAGE_ACTIVE_USER);
    localStorage.removeItem(STORAGE_ACTIVE_PROFILE);
    window.dispatchEvent(
      new CustomEvent('unendingvoid_auth_change', { detail: null })
    );
  } catch (err) {
    console.warn('[authService] Error clearing active session:', err);
  }
}

/**
 * Signs in with Google OAuth popup.
 */
export const signInGoogle = async () => {
  const cred = await signInWithPopup(auth, googleProvider);
  if (cred?.user) {
    setActiveSession({
      uid: cred.user.uid,
      displayName: cred.user.displayName || 'Void Operative',
      email: cred.user.email,
      isLocal: false,
    });
  }
  return cred;
};

/**
 * Authenticates with a Username or Email and Password.
 * Supports cloud Firebase accounts, local accounts in browser storage, and offline fallbacks.
 */
export const signInEmail = async (identifier, password) => {
  if (!identifier || !password) {
    throw new Error('MISSING_CREDENTIALS');
  }

  const username = extractUsername(identifier).toLowerCase();
  const email = normalizeUsernameToEmail(identifier);

  // 1. Try Firebase Auth first
  try {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    if (cred?.user) {
      const activeUser = {
        uid: cred.user.uid,
        displayName: cred.user.displayName || extractUsername(identifier),
        email: cred.user.email,
        username,
        isLocal: false,
      };
      setActiveSession(activeUser);
      // Cache locally for offline availability
      saveLocalAccount({
        uid: cred.user.uid,
        username,
        displayName: activeUser.displayName,
        email: cred.user.email,
        password, // Cached for offline matching
      });
      return cred;
    }
  } catch (firebaseErr) {
    console.warn('[authService] Cloud sign-in attempt warning:', firebaseErr.code || firebaseErr.message);

    // 2. Check local accounts for offline or local-registered credentials
    const localAccounts = getLocalAccounts();
    const localAcc = localAccounts[username] || localAccounts[email];

    if (localAcc) {
      if (localAcc.password === password) {
        // Password matched locally
        const activeUser = {
          uid: localAcc.uid,
          displayName: localAcc.displayName || username,
          email: localAcc.email || email,
          username,
          isLocal: true,
        };
        const activeProfile = {
          uid: localAcc.uid,
          displayName: activeUser.displayName,
          role: 'player',
          locale: 'en',
          hp: 100,
          maxHp: 100,
          shields: 50,
          maxShields: 50,
          credits: 500,
          stats: { strength: 10, dexterity: 10, constitution: 10, intelligence: 10, wisdom: 10, charisma: 10 },
          traits: [],
          inventory: [],
          isLocal: true,
        };

        // Try anonymous auth in background if Firebase is online so Firestore tokens are valid
        try {
          await signInAnonymously(auth);
        } catch (_) {
          // Offline mode continues safely
        }

        setActiveSession(activeUser, activeProfile);
        return { user: activeUser, isLocal: true };
      } else {
        throw new Error('INVALID_PASSWORD');
      }
    }

    // Neither cloud nor local account matched
    throw firebaseErr;
  }
};

/**
 * Registers an operative account with Username or Email, Password, and Display Name.
 * Creates Cloud Firestore profile and saves to local account storage.
 */
export const registerEmail = async (identifier, password, displayName) => {
  if (!identifier || !password) {
    throw new Error('MISSING_CREDENTIALS');
  }

  const username = extractUsername(identifier).toLowerCase();
  const email = normalizeUsernameToEmail(identifier);
  const finalDisplayName = displayName?.trim() || extractUsername(identifier);

  // 1. Check local accounts to avoid collisions
  const localAccounts = getLocalAccounts();
  if (localAccounts[username]) {
    // Already registered locally
    throw new Error('USER_EXISTS');
  }

  // 2. Try Firebase Auth Registration
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);

    const initialData = {
      uid: cred.user.uid,
      displayName: finalDisplayName,
      username,
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
    };

    // Create player doc in Firestore
    try {
      await setDoc(doc(db, 'players', cred.user.uid), initialData);
    } catch (fsErr) {
      console.warn('[authService] Firestore doc creation warning:', fsErr.message);
    }

    const activeUser = {
      uid: cred.user.uid,
      displayName: finalDisplayName,
      email: cred.user.email,
      username,
      isLocal: false,
    };

    setActiveSession(activeUser, initialData);

    // Save account locally
    saveLocalAccount({
      uid: cred.user.uid,
      username,
      displayName: finalDisplayName,
      email: cred.user.email,
      password,
    });

    return cred;
  } catch (firebaseErr) {
    console.warn('[authService] Cloud registration failed, creating local operative profile:', firebaseErr.code || firebaseErr.message);

    // If already registered in Firebase, bubble error
    if (firebaseErr.code === 'auth/email-already-in-use') {
      throw firebaseErr;
    }

    // 3. Create Fallback Local Account (for offline, emulator down, or local-only mode)
    const uid = `local_${username}_${Date.now().toString(36)}`;
    const localUser = {
      uid,
      username,
      displayName: finalDisplayName,
      email,
      password,
      isLocal: true,
      createdAt: new Date().toISOString(),
    };

    const localProfile = {
      uid,
      displayName: finalDisplayName,
      username,
      role: 'player',
      locale: 'en',
      hp: 100,
      maxHp: 100,
      shields: 50,
      maxShields: 50,
      credits: 500,
      stats: { strength: 10, dexterity: 10, constitution: 10, intelligence: 10, wisdom: 10, charisma: 10 },
      traits: [],
      inventory: [],
      equippedWeapon: null,
      equippedArmor: null,
      spaceship: null,
      isLocal: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    saveLocalAccount(localUser);

    try {
      localStorage.setItem(`unendingvoid_player_${uid}`, JSON.stringify(localProfile));
    } catch (_) {}

    // Try background anonymous login to allow Firestore access if available
    try {
      await signInAnonymously(auth);
    } catch (_) {}

    setActiveSession(localUser, localProfile);
    return { user: localUser, isLocal: true };
  }
};

/**
 * Fast one-click local guest login without requiring a password.
 */
export const loginLocalGuest = async (customName = '') => {
  const guestCode = Math.random().toString(36).substring(2, 7).toUpperCase();
  const displayName = customName?.trim() || `Operative-${guestCode}`;
  const username = `guest_${guestCode.toLowerCase()}`;

  let uid = `local_guest_${Date.now().toString(36)}`;

  // Attempt anonymous Firebase login if available
  try {
    const cred = await signInAnonymously(auth);
    if (cred?.user?.uid) {
      uid = cred.user.uid;
    }
  } catch (err) {
    console.warn('[authService] Anonymous Firebase sign-in warning:', err.message);
  }

  const guestUser = {
    uid,
    username,
    displayName,
    email: `${username}@unendingvoid.local`,
    isLocal: true,
  };

  const guestProfile = {
    uid,
    displayName,
    username,
    role: 'player',
    locale: 'en',
    hp: 100,
    maxHp: 100,
    shields: 50,
    maxShields: 50,
    credits: 500,
    stats: { strength: 10, dexterity: 10, constitution: 10, intelligence: 10, wisdom: 10, charisma: 10 },
    traits: [],
    inventory: [],
    isLocal: true,
  };

  setActiveSession(guestUser, guestProfile);
  return { user: guestUser, isLocal: true };
};

/**
 * Logs out the active user, clearing local session and signing out of Firebase.
 */
export const logout = async () => {
  clearActiveSession();
  try {
    await signOut(auth);
  } catch (err) {
    console.warn('[authService] Firebase signout error:', err.message);
  }
};
