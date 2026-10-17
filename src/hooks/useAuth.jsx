import { useState, useEffect, createContext, useContext, useCallback } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import {
  STORAGE_ACTIVE_USER,
  STORAGE_ACTIVE_PROFILE,
  logout as authLogout,
  loginLocalGuest as authLoginGuest,
  signInEmail,
  registerEmail,
} from '../lib/authService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // Initialize state eagerly from local session storage to avoid flashing
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_ACTIVE_USER);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [profile, setProfile] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_ACTIVE_PROFILE);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [loading, setLoading] = useState(true);

  // Sync state from localStorage
  const syncFromStorage = useCallback(() => {
    try {
      const storedUser = localStorage.getItem(STORAGE_ACTIVE_USER);
      if (storedUser) {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
        const storedProfile = localStorage.getItem(STORAGE_ACTIVE_PROFILE);
        if (storedProfile) {
          setProfile(JSON.parse(storedProfile));
        }
        setLoading(false);
        return true;
      } else {
        setUser(null);
        setProfile(null);
      }
    } catch (e) {
      console.warn('[useAuth] syncFromStorage error:', e);
    }
    return false;
  }, []);

  useEffect(() => {
    // 1. Listen for custom auth events from authService
    const handleAuthEvent = (e) => {
      if (e.detail?.user) {
        setUser(e.detail.user);
        if (e.detail.profile) {
          setProfile(e.detail.profile);
        }
      } else {
        setUser(null);
        setProfile(null);
      }
      setLoading(false);
    };

    window.addEventListener('unendingvoid_auth_change', handleAuthEvent);

    // 2. Firebase onAuthStateChanged listener
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const basicUser = {
          uid: firebaseUser.uid,
          displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Void Operative',
          email: firebaseUser.email,
          isLocal: false,
        };
        setUser(basicUser);

        try {
          const userDocRef = doc(db, 'players', firebaseUser.uid);
          const snap = await getDoc(userDocRef);

          if (snap.exists()) {
            const data = { uid: snap.id, ...snap.data() };
            setProfile(data);
            localStorage.setItem(STORAGE_ACTIVE_PROFILE, JSON.stringify(data));
          } else {
            // Auto-provision initial player profile
            const initialDoc = {
              uid: firebaseUser.uid,
              displayName: basicUser.displayName,
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

            setProfile(initialDoc);
            localStorage.setItem(STORAGE_ACTIVE_PROFILE, JSON.stringify(initialDoc));

            // Persist to Firestore in background
            setDoc(userDocRef, initialDoc).catch((e) =>
              console.warn('[useAuth] Background profile auto-create warning:', e.message)
            );
          }
        } catch (err) {
          console.warn('[Auth] Profile fetch exception, using fallback profile:', err);
          const fallbackProfile = {
            uid: firebaseUser.uid,
            displayName: basicUser.displayName,
            role: 'player',
            hp: 100,
            maxHp: 100,
            shields: 50,
            maxShields: 50,
            credits: 500,
            stats: { strength: 10, dexterity: 10, constitution: 10, intelligence: 10, wisdom: 10, charisma: 10 },
            traits: [],
            inventory: [],
          };
          setProfile(fallbackProfile);
        }
      } else {
        // If Firebase Auth reports null, check if a local user is active in storage
        const hasLocal = syncFromStorage();
        if (!hasLocal) {
          setUser(null);
          setProfile(null);
        }
      }
      setLoading(false);
    });

    return () => {
      window.removeEventListener('unendingvoid_auth_change', handleAuthEvent);
      unsub();
    };
  }, [syncFromStorage]);

  const login = useCallback(async (usernameOrEmail, password) => {
    return signInEmail(usernameOrEmail, password);
  }, []);

  const register = useCallback(async (usernameOrEmail, password, displayName) => {
    return registerEmail(usernameOrEmail, password, displayName);
  }, []);

  const loginGuest = useCallback(async (customName) => {
    return authLoginGuest(customName);
  }, []);

  const logout = useCallback(async () => {
    await authLogout();
    setUser(null);
    setProfile(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        login,
        register,
        loginGuest,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
