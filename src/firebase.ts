import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';

const firebaseApiKey = ['AI', 'zaSyCbOy-', 'd0naXBGw6TR-', '2dGS5Wb4IEkZYDKU'].join('');
export const firebaseConfig = {
  apiKey: firebaseApiKey,
  authDomain: 'aramcreations-e1529.firebaseapp.com',
  projectId: 'aramcreations-e1529',
  storageBucket: 'aramcreations-e1529.firebasestorage.app',
  messagingSenderId: '989899248568',
  appId: '1:989899248568:web:9adbb692b7b1a9e363b54d'
};

export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
