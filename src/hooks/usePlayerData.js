import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';

export function usePlayerData(userId) {
  const [data, setData] = useState(() => {
    if (!userId || typeof localStorage === 'undefined') return null;
    try {
      const raw = localStorage.getItem(`unendingvoid_player_${userId}`);
      if (raw) return JSON.parse(raw);
    } catch (_) {}
    return null;
  });
  const [loading, setLoading] = useState(!data);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      const cached = typeof localStorage !== 'undefined' ? localStorage.getItem(`unendingvoid_player_${userId}`) : null;
      if (cached) {
        try {
          setData(JSON.parse(cached));
        } catch (_) {}
      }
    } catch (_) {}

    try {
      const unsub = onSnapshot(
        doc(db, 'players', userId),
        (snap) => {
          if (snap.exists()) {
            const playerDoc = { uid: snap.id, ...snap.data() };
            setData(playerDoc);
            try {
              localStorage.setItem(`unendingvoid_player_${userId}`, JSON.stringify(playerDoc));
            } catch (_) {}
          } else {
            const localRaw = typeof localStorage !== 'undefined' ? localStorage.getItem(`unendingvoid_player_${userId}`) : null;
            if (localRaw) {
              try {
                setData(JSON.parse(localRaw));
                setLoading(false);
                return;
              } catch (_) {}
            }
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
          const localRaw = typeof localStorage !== 'undefined' ? localStorage.getItem(`unendingvoid_player_${userId}`) : null;
          if (localRaw) {
            try {
              setData(JSON.parse(localRaw));
              setLoading(false);
              return;
            } catch (_) {}
          }
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
