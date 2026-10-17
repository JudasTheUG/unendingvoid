import { useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, limit, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';

/**
 * useDiceSync - Listens for incoming real-time dice rolls across all connected players.
 * @param {function} onNewRoll - Callback when a new roll is recorded in Firestore
 */
export function useDiceSync(onNewRoll) {
  useEffect(() => {
    // Listen for recent rolls
    const q = query(
      collection(db, 'rolls'),
      orderBy('timestamp', 'desc'),
      limit(1)
    );

    let isInitial = true;
    const unsub = onSnapshot(q, (snap) => {
      // Avoid firing on initial cache load unless desired
      if (isInitial) {
        isInitial = false;
        return;
      }

      snap.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const data = change.doc.data();
          onNewRoll({ id: change.doc.id, ...data });
        }
      });
    }, (err) => {
      console.warn('[DiceSync] Listener warning:', err.message);
    });

    return unsub;
  }, [onNewRoll]);
}

/**
 * publishRoll - Publishes a roll result with deterministic 3D physics seeds to Firestore.
 */
export async function publishRoll({
  userId,
  playerName,
  role = 'player',
  isSecret = false,
  isDMRoll = false,
  notation,
  results,
  total,
  modifier = 0,
  purpose = 'custom',
  physicsSeed = Math.floor(Math.random() * 1000000),
  velocities = [],
}) {
  const secretFlag = Boolean(isSecret || isDMRoll || role === 'dm');
  const rollPayload = {
    playerId: userId,
    playerName: playerName || 'Unknown Operative',
    role: role || (secretFlag ? 'dm' : 'player'),
    isSecret: secretFlag,
    isDMRoll: secretFlag,
    diceNotation: notation,
    notation,
    results: Array.isArray(results) ? results : [results],
    total: total,
    modifier: Number(modifier) || 0,
    purpose,
    physics: {
      seed: physicsSeed,
      velocities: velocities.length > 0 ? velocities : [[Math.random() * 10, Math.random() * 10, Math.random() * 10]],
    },
    timestamp: Date.now(),
  };

  // Immediate multi-tab / local event broadcast
  try {
    localStorage.setItem('unendingvoid:latest_roll', JSON.stringify(rollPayload));
    window.dispatchEvent(new CustomEvent('unendingvoid:multiplayer_roll', { detail: rollPayload }));
  } catch (e) {}

  if (db) {
    try {
      await addDoc(collection(db, 'rolls'), {
        ...rollPayload,
        timestamp: serverTimestamp(),
      });
    } catch (err) {
      console.warn('[DiceSync] Firestore note:', err.message);
    }
  }

  return rollPayload;
}
