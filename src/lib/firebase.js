import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyCXOkPBpKWJSVRN04EF0NFhLHjLOhpv7t0",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "unendingvoid-app.firebaseapp.com",
  projectId: "unendingvoid-app",
  storageBucket: "unendingvoid-app.firebasestorage.app",
  messagingSenderId: "104134316108",
  appId: "1:104134316108:web:af9d5627942ffcf09524e9",
  measurementId: "G-KRLMQX9G09",
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
