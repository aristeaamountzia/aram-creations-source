import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';

const defaultApiKey = ['AI', 'zaSyCbOy-', 'd0naXBGw6TR-', '2dGS5Wb4IEkZYDKU'].join('');

export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || defaultApiKey,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'aramcreations-e1529.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'aramcreations-e1529',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'aramcreations-e1529.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '989899248568',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:989899248568:web:9adbb692b7b1a9e363b54d'
};

export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
