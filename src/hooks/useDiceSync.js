import { useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, limit, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';

const LOCAL_STORAGE_HISTORY_KEY = 'unendingvoid:rolls_history';

/**
 * Retrieve cached roll history from localStorage.
 */
export function getStoredRolls() {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

/**
 * useDiceSync - Listens for incoming real-time dice rolls across all connected players
 * and synchronizes the Quantum Roll Ledger.
 * @param {function} onNewRoll - Callback when a new real-time roll arrives
 * @param {function} onHistoryLoaded - Callback when initial historical rolls are loaded
 */
export function useDiceSync(onNewRoll, onHistoryLoaded) {
  useEffect(() => {
    // 1. Initial cached history load
    try {
      const cached = getStoredRolls();
      if (cached.length > 0 && onHistoryLoaded) {
        onHistoryLoaded(cached);
      }
    } catch (e) {}

    if (!db) return;

    // 2. Query Firestore rolls ordered by timestamp
    const q = query(
      collection(db, 'rolls'),
      orderBy('timestamp', 'desc'),
      limit(25)
    );

    let isInitial = true;
    const unsub = onSnapshot(
      q,
      (snap) => {
        const loadedRolls = [];
        snap.forEach((doc) => {
          loadedRolls.push({ id: doc.id, ...doc.data() });
        });

        if (isInitial) {
          isInitial = false;
          if (onHistoryLoaded && loadedRolls.length > 0) {
            onHistoryLoaded(loadedRolls);
          }
          return;
        }

        snap.docChanges().forEach((change) => {
          if (change.type === 'added') {
            const data = change.doc.data();
            const rollObj = { id: change.doc.id, ...data };
            if (onNewRoll) onNewRoll(rollObj);
          }
        });
      },
      (err) => {
        console.warn('[DiceSync] Listener warning:', err.message);
      }
    );

    return unsub;
  }, [onNewRoll, onHistoryLoaded]);
}

/**
 * publishRoll - Publishes a roll result with deterministic 3D physics seeds to Firestore.
 * Ensures data is 100% compliant with Firestore schemas (NO nested arrays).
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

  // Firestore rejects nested arrays ([[vx, vy, vz]]). Sanitize velocities into an array of objects.
  const sanitizedVelocities = (velocities && velocities.length > 0 ? velocities : [
    [Math.random() * 10, Math.random() * 10, Math.random() * 10]
  ]).map((v) =>
    Array.isArray(v)
      ? { x: Number(v[0]) || 0, y: Number(v[1]) || 0, z: Number(v[2]) || 0 }
      : (typeof v === 'object' && v !== null ? v : { x: 0, y: 0, z: 0 })
  );

  // Flatten results into a 1D array of primitives
  const sanitizedResults = (Array.isArray(results) ? results.flat() : [results]).map((val) =>
    typeof val === 'number' || typeof val === 'string' ? val : String(val)
  );

  const rollPayload = {
    playerId: userId || 'operative',
    playerName: playerName || 'Unknown Operative',
    role: role || (secretFlag ? 'dm' : 'player'),
    isSecret: secretFlag,
    isDMRoll: secretFlag,
    diceNotation: notation,
    notation,
    results: sanitizedResults,
    total: total,
    modifier: Number(modifier) || 0,
    purpose,
    physics: {
      seed: physicsSeed,
      velocities: sanitizedVelocities,
    },
    clientTimestamp: Date.now(),
    timestamp: Date.now(),
  };

  // Immediate multi-tab / local event broadcast & history cache
  try {
    localStorage.setItem('unendingvoid:latest_roll', JSON.stringify(rollPayload));
    window.dispatchEvent(new CustomEvent('unendingvoid:multiplayer_roll', { detail: rollPayload }));

    const rawHist = localStorage.getItem(LOCAL_STORAGE_HISTORY_KEY);
    const hist = rawHist ? JSON.parse(rawHist) : [];
    const updatedHist = [rollPayload, ...hist.filter((r) => r.clientTimestamp !== rollPayload.clientTimestamp)].slice(0, 30);
    localStorage.setItem(LOCAL_STORAGE_HISTORY_KEY, JSON.stringify(updatedHist));
  } catch (e) {}

  if (db) {
    try {
      const docRef = await addDoc(collection(db, 'rolls'), {
        ...rollPayload,
        timestamp: serverTimestamp(),
      });
      rollPayload.id = docRef.id;
    } catch (err) {
      console.warn('[DiceSync] Firestore note:', err.message);
    }
  }

  return rollPayload;
}
