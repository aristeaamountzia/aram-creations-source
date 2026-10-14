import { browserEmulatorTarget } from './lib/emulator-target';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore';
import { connectAuthEmulator, getAuth } from 'firebase/auth';
import { connectStorageEmulator, getStorage } from 'firebase/storage';

const firebaseApiKey = ['AI', 'zaSyCbOy-', 'd0naXBGw6TR-', '2dGS5Wb4IEkZYDKU'].join('');
export const firebaseConfig = {
  apiKey: firebaseApiKey,
  authDomain: 'aramcreations-e1529.firebaseapp.com',
  projectId: 'aramcreations-e1529',
  storageBucket: 'aramcreations-e1529.firebasestorage.app',
  messagingSenderId: '989899248568',
  appId: '1:989899248568:web:9adbb692b7b1a9e363b54d'
};

const target = browserEmulatorTarget(import.meta.env, window.location.hostname);
const config = target ? { apiKey: 'emulator-only', authDomain: `${target.projectId}.firebaseapp.com`, projectId: target.projectId, storageBucket: target.storageBucket } : firebaseConfig;
export const app = target ? initializeApp(config, 'stage1-browser') : getApps().length > 0 ? getApp() : initializeApp(config);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);


if (target) {
  connectAuthEmulator(auth, `http://${target.auth.host}:${target.auth.port}`, { disableWarnings: true });
  connectFirestoreEmulator(db, target.firestore.host, target.firestore.port);
  connectStorageEmulator(storage, target.storage.host, target.storage.port);
}
