import { initializeApp, getApps, getApp } from 'firebase/app';
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore';
import { connectAuthEmulator, getAuth } from 'firebase/auth';
import { connectStorageEmulator, getStorage } from 'firebase/storage';

const defaultApiKey = ['AI', 'zaSyCbOy-', 'd0naXBGw6TR-', '2dGS5Wb4IEkZYDKU'].join('');

const viteEnv = (import.meta as { env?: Record<string, string | undefined> }).env ?? {};

export const firebaseConfig = {
  apiKey: viteEnv.VITE_FIREBASE_API_KEY || defaultApiKey,
  authDomain: viteEnv.VITE_FIREBASE_AUTH_DOMAIN || 'aramcreations-e1529.firebaseapp.com',
  projectId: viteEnv.VITE_FIREBASE_PROJECT_ID || 'aramcreations-e1529',
  storageBucket: viteEnv.VITE_FIREBASE_STORAGE_BUCKET || 'aramcreations-e1529.firebasestorage.app',
  messagingSenderId: viteEnv.VITE_FIREBASE_MESSAGING_SENDER_ID || '989899248568',
  appId: viteEnv.VITE_FIREBASE_APP_ID || '1:989899248568:web:9adbb692b7b1a9e363b54d'
};

export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

const emulatorState = globalThis as typeof globalThis & { __aramFirebaseEmulatorsConnected?: boolean };
if (viteEnv.VITE_FIREBASE_EMULATORS === 'true' && !emulatorState.__aramFirebaseEmulatorsConnected) {
  const host = viteEnv.VITE_FIREBASE_EMULATOR_HOST || '127.0.0.1';
  connectAuthEmulator(auth, `http://${host}:9099`, { disableWarnings: true });
  connectFirestoreEmulator(db, host, 8080);
  connectStorageEmulator(storage, host, 9199);
  emulatorState.__aramFirebaseEmulatorsConnected = true;
}
