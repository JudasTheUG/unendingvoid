import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';

const firebaseConfig = {
  // For local emulator development, only projectId is required.
  // Populate remaining keys from Firebase Console for production.
  projectId: 'unendingvoid-app',
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'demo-api-key',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'unendingvoid-app.firebaseapp.com',
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Connect to local emulators in dev mode
if (import.meta.env.DEV) {
  try {
    connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
    connectFirestoreEmulator(db, '127.0.0.1', 8080);
    console.log('[Firebase] Connected to local emulators');
  } catch (e) {
    console.warn('[Firebase] Emulator connection failed — already connected or emulators not running:', e.message);
  }
}
