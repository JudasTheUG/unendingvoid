import {
  signInWithPopup,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInAnonymously,
  signOut,
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './firebase';

const googleProvider = new GoogleAuthProvider();

export const STORAGE_LOCAL_ACCOUNTS = 'unendingvoid_local_accounts';
export const STORAGE_ACTIVE_USER = 'unendingvoid_active_user';
export const STORAGE_ACTIVE_PROFILE = 'unendingvoid_active_profile';

/**
 * Validates standard email address format using RFC 5322 compatible regex.
 */
export function validateEmail(email) {
  if (!email || typeof email !== 'string') return false;
  const regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return regex.test(email.trim());
}

/**
 * Validates username format: 3-20 characters, alphanumeric, underscores, and hyphens.
 */
export function validateUsername(username) {
  if (!username || typeof username !== 'string') return false;
  const trimmed = username.trim();
  if (trimmed.length < 3 || trimmed.length > 20) return false;
  const regex = /^[a-zA-Z0-9_-]+$/;
  return regex.test(trimmed);
}

/**
 * Normalizes a username or email input into an internal safe email string if no email domain provided.
 */
export function normalizeUsernameToEmail(identifier) {
  if (!identifier) return '';
  const trimmed = identifier.trim().toLowerCase();
  if (trimmed.includes('@')) {
    return trimmed;
  }
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
    const key = (account.username || extractUsername(account.email) || 'user').toLowerCase();
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
 * Checks whether a given username is available (uniqueness control).
 * Checks both local accounts in browser and cloud Firestore registry.
 */
export async function isUsernameAvailable(username) {
  if (!validateUsername(username)) return false;
  const key = username.trim().toLowerCase();

  // 1. Check local accounts
  const localAccounts = getLocalAccounts();
  if (localAccounts[key]) {
    return false;
  }

  // 2. Check Firestore /usernames collection
  try {
    const snap = await getDoc(doc(db, 'usernames', key));
    if (snap.exists()) {
      return false;
    }
  } catch (err) {
    console.warn('[authService] isUsernameAvailable Firestore check notice:', err.message);
  }

  return true;
}

/**
 * Resolves a username to its registered email address.
 */
export async function resolveIdentifierToEmail(identifier) {
  if (!identifier) return '';
  const trimmed = identifier.trim().toLowerCase();
  if (trimmed.includes('@')) {
    return trimmed;
  }

  // 1. Check local accounts
  const localAccounts = getLocalAccounts();
  if (localAccounts[trimmed]?.email) {
    return localAccounts[trimmed].email;
  }

  // 2. Check Firestore /usernames/{username}
  try {
    const snap = await getDoc(doc(db, 'usernames', trimmed));
    if (snap.exists() && snap.data()?.email) {
      return snap.data().email;
    }
  } catch (err) {
    console.warn('[authService] resolveIdentifierToEmail Firestore lookup notice:', err.message);
  }

  // 3. Fallback to deterministic internal domain
  return normalizeUsernameToEmail(trimmed);
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
 * Resolves usernames to emails and checks both cloud Firebase and local accounts.
 */
export const signInEmail = async (identifier, password) => {
  if (!identifier || !password) {
    throw new Error('MISSING_CREDENTIALS');
  }

  const username = extractUsername(identifier).toLowerCase();
  const email = await resolveIdentifierToEmail(identifier);

  // 1. Try Firebase Auth with resolved email
  try {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    if (cred?.user) {
      const activeUser = {
        uid: cred.user.uid,
        displayName: cred.user.displayName || username,
        email: cred.user.email,
        username,
        isLocal: false,
      };
      setActiveSession(activeUser);
      saveLocalAccount({
        uid: cred.user.uid,
        username,
        displayName: activeUser.displayName,
        email: cred.user.email,
        password,
      });
      return cred;
    }
  } catch (firebaseErr) {
    console.warn('[authService] Cloud sign-in warning:', firebaseErr.code || firebaseErr.message);

    // 2. Check local accounts for matching credentials
    const localAccounts = getLocalAccounts();
    const localAcc = localAccounts[username] || localAccounts[email] || localAccounts[identifier.toLowerCase()];

    if (localAcc) {
      if (localAcc.password === password) {
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

        try {
          await signInAnonymously(auth);
        } catch (_) {}

        setActiveSession(activeUser, activeProfile);
        return { user: activeUser, isLocal: true };
      } else {
        throw new Error('INVALID_PASSWORD');
      }
    }

    throw firebaseErr;
  }
};

/**
 * Registers an operative with Username, Email, Password, and optional Callsign.
 * Enforces email validation, username format, and username uniqueness.
 */
export const registerWithCredentials = async ({ username, email, password, displayName }) => {
  if (!username || !email || !password) {
    throw new Error('MISSING_FIELDS');
  }

  const cleanUsername = username.trim().toLowerCase();
  const cleanEmail = email.trim().toLowerCase();

  // 1. Username format control
  if (!validateUsername(cleanUsername)) {
    throw new Error('INVALID_USERNAME_FORMAT');
  }

  // 2. Email format validation
  if (!validateEmail(cleanEmail)) {
    throw new Error('INVALID_EMAIL');
  }

  // 3. Password length control
  if (password.length < 6) {
    throw new Error('PASSWORD_TOO_SHORT');
  }

  // 4. Username uniqueness control
  const available = await isUsernameAvailable(cleanUsername);
  if (!available) {
    throw new Error('USERNAME_TAKEN');
  }

  const finalDisplayName = displayName?.trim() || cleanUsername;

  // 5. Try Firebase Auth User Creation
  try {
    const cred = await createUserWithEmailAndPassword(auth, cleanEmail, password);

    // Claim username in Firestore /usernames/{username}
    try {
      await setDoc(doc(db, 'usernames', cleanUsername), {
        uid: cred.user.uid,
        email: cleanEmail,
        createdAt: serverTimestamp(),
      });
    } catch (uErr) {
      console.warn('[authService] Usernames registry warning:', uErr.message);
    }

    const initialData = {
      uid: cred.user.uid,
      displayName: finalDisplayName,
      username: cleanUsername,
      email: cleanEmail,
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

    try {
      await setDoc(doc(db, 'players', cred.user.uid), initialData);
    } catch (fsErr) {
      console.warn('[authService] Firestore player doc creation warning:', fsErr.message);
    }

    const activeUser = {
      uid: cred.user.uid,
      displayName: finalDisplayName,
      email: cleanEmail,
      username: cleanUsername,
      isLocal: false,
    };

    setActiveSession(activeUser, initialData);

    saveLocalAccount({
      uid: cred.user.uid,
      username: cleanUsername,
      displayName: finalDisplayName,
      email: cleanEmail,
      password,
    });

    return cred;
  } catch (firebaseErr) {
    console.warn('[authService] Cloud registration warning:', firebaseErr.code || firebaseErr.message);

    if (firebaseErr.code === 'auth/email-already-in-use') {
      throw new Error('EMAIL_IN_USE');
    }

    // 6. Local Account Fallback (offline / emulator down)
    const uid = `local_${cleanUsername}_${Date.now().toString(36)}`;
    const localUser = {
      uid,
      username: cleanUsername,
      displayName: finalDisplayName,
      email: cleanEmail,
      password,
      isLocal: true,
      createdAt: new Date().toISOString(),
    };

    const localProfile = {
      uid,
      displayName: finalDisplayName,
      username: cleanUsername,
      email: cleanEmail,
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

    try {
      await signInAnonymously(auth);
    } catch (_) {}

    setActiveSession(localUser, localProfile);
    return { user: localUser, isLocal: true };
  }
};

/**
 * Backward compatibility wrapper for registerEmail.
 */
export const registerEmail = async (identifier, password, displayName) => {
  const isEmail = identifier.includes('@');
  const email = isEmail ? identifier : normalizeUsernameToEmail(identifier);
  const username = extractUsername(identifier);

  return registerWithCredentials({
    username,
    email,
    password,
    displayName,
  });
};

/**
 * Fast one-click local guest login without requiring a password.
 */
export const loginLocalGuest = async (customName = '') => {
  const guestCode = Math.random().toString(36).substring(2, 7).toUpperCase();
  const displayName = customName?.trim() || `Operative-${guestCode}`;
  const username = `guest_${guestCode.toLowerCase()}`;

  let uid = `local_guest_${Date.now().toString(36)}`;

  try {
    const cred = await signInAnonymously(auth);
    if (cred?.user?.uid) {
      uid = cred.user.uid;
    }
  } catch (err) {
    console.warn('[authService] Anonymous Firebase sign-in notice:', err.message);
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
