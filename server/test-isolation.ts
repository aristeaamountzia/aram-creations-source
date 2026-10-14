import { EMULATOR_PROJECT, EMULATOR_BUCKET, loopbackEndpoint } from '../src/lib/emulator-target';
import { getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

export function assertEmulatorIsolation(env: NodeJS.ProcessEnv = process.env) {
  if (env.ARAM_TEST_MODE !== 'emulator' || env.GCLOUD_PROJECT !== EMULATOR_PROJECT) throw new Error('Isolation refused: emulator demo project required.');
  for (const key of ['FIRESTORE_EMULATOR_HOST', 'FIREBASE_AUTH_EMULATOR_HOST', 'FIREBASE_STORAGE_EMULATOR_HOST']) loopbackEndpoint(env[key], key);
  for (const key of ['FIREBASE_SERVICE_ACCOUNT', 'GOOGLE_APPLICATION_CREDENTIALS', 'ORDER_TEST_CREDENTIAL_PATH', 'RESEND_API_KEY', 'GEMINI_API_KEY', 'AI_ACCESS_CODE', 'GOOGLE_GEMINI_BASE_URL']) {
    if (env[key]) throw new Error(`Isolation refused: ${key} must be absent in tests.`);
  }
  return { projectId: EMULATOR_PROJECT, storageBucket: EMULATOR_BUCKET };
}
export function emulatorServices(name: string) {
  const target = assertEmulatorIsolation();
  const app = getApps().find(a => a.name === name) || initializeApp(target, name);
  if (app.options.projectId !== EMULATOR_PROJECT) throw new Error('Isolation refused: existing app targets another project.');
  return { app, db: getFirestore(app), auth: getAuth(app), bucket: getStorage(app).bucket() };
}
export function testModeEnabled() {
  if (!process.env.ARAM_TEST_MODE) return false;
  assertEmulatorIsolation();
  return true;
}
