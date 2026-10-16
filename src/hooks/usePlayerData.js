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

    const unsub = onSnapshot(
      doc(db, 'players', userId),
      (snap) => {
        setData(snap.exists() ? { uid: snap.id, ...snap.data() } : null);
        setLoading(false);
      },
      (err) => {
        console.error('[usePlayerData] Snapshot error:', err);
        setLoading(false);
      }
    );

    return unsub;
  }, [userId]);

  return { data, loading };
}
