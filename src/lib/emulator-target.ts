export const EMULATOR_PROJECT = 'demo-aram-stage1';
export const EMULATOR_BUCKET = `${EMULATOR_PROJECT}.firebasestorage.app`;

export function loopbackEndpoint(value: string | undefined, label: string) {
  const match = value?.match(/^(127\.0\.0\.1|localhost):(\d{2,5})$/);
  if (!match || Number(match[2]) > 65535) throw new Error(`Isolation refused: ${label} must use a loopback emulator.`);
  return { host: match[1], port: Number(match[2]) };
}

export function browserEmulatorTarget(env: Record<string, string | undefined>, hostname: string) {
  if (!env.VITE_ARAM_TEST_MODE) return null;
  if (env.VITE_ARAM_TEST_MODE !== 'emulator' || !['localhost', '127.0.0.1', '::1'].includes(hostname)) {
    throw new Error('Isolation refused: test browser must run locally.');
  }
  if (env.VITE_ARAM_TEST_PROJECT !== EMULATOR_PROJECT) throw new Error('Isolation refused: incorrect test project.');
  return {
    projectId: EMULATOR_PROJECT, storageBucket: EMULATOR_BUCKET,
    auth: loopbackEndpoint(env.VITE_FIREBASE_AUTH_EMULATOR_HOST, 'Auth'),
    firestore: loopbackEndpoint(env.VITE_FIRESTORE_EMULATOR_HOST, 'Firestore'),
    storage: loopbackEndpoint(env.VITE_FIREBASE_STORAGE_EMULATOR_HOST, 'Storage'),
  };
}
