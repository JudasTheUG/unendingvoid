import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';

export function usePlayerData(userId) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      const unsub = onSnapshot(
        doc(db, 'players', userId),
        (snap) => {
          if (snap.exists()) {
            setData({ uid: snap.id, ...snap.data() });
          } else {
            // Provide sensible fallback operative data so interface doesn't hang
            setData({
              uid: userId,
              displayName: 'Void Operative',
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
            });
          }
          setLoading(false);
        },
        (err) => {
          console.warn('[usePlayerData] Snapshot warning (offline/emulator):', err.message);
          setData({
            uid: userId,
            displayName: 'Void Operative',
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
          setLoading(false);
        }
      );

      return unsub;
    } catch (err) {
      console.warn('[usePlayerData] Exception establishing listener:', err);
      setLoading(false);
    }
  }, [userId]);

  return { data, loading };
}
