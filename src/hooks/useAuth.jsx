import { useState, useEffect, createContext, useContext } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        try {
          const userDocRef = doc(db, 'players', firebaseUser.uid);
          const snap = await getDoc(userDocRef);

          if (snap.exists()) {
            setProfile({ uid: snap.id, ...snap.data() });
          } else {
            // Auto-provision initial player profile so new logins are never uninitialized
            const initialDoc = {
              uid: firebaseUser.uid,
              displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Void Operative',
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

            // Save to Firestore in background
            setDoc(userDocRef, initialDoc).catch((e) =>
              console.warn('[useAuth] Background profile auto-create warning:', e.message)
            );
          }
        } catch (err) {
          console.warn('[Auth] Profile fetch exception, using fallback profile:', err);
          setProfile({
            uid: firebaseUser.uid,
            displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Void Operative',
            role: 'player',
            hp: 100,
            maxHp: 100,
            shields: 50,
            maxShields: 50,
            credits: 500,
            stats: { strength: 10, dexterity: 10, constitution: 10, intelligence: 10, wisdom: 10, charisma: 10 },
            traits: [],
            inventory: [],
          });
        }
      } else {
        setUser(null);
        setProfile(null);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  return (
    <AuthContext.Provider value={{ user, profile, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
