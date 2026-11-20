import type { ServiceAccount } from 'firebase-admin/app';

export class FirebaseConfigurationError extends Error {}

/** Accept JSON and JSON encoded once more by an environment-variable editor. */
export function firebaseCredentials(raw = process.env.FIREBASE_SERVICE_ACCOUNT): ServiceAccount {
  if (!raw?.trim()) throw new FirebaseConfigurationError('Δεν έχει οριστεί το FIREBASE_SERVICE_ACCOUNT στον server.');
  let value: any;
  try {
    value = JSON.parse(raw);
    if (typeof value === 'string') value = JSON.parse(value);
  } catch {
    throw new FirebaseConfigurationError('Το FIREBASE_SERVICE_ACCOUNT δεν περιέχει έγκυρο JSON.');
  }
  if (value?.project_id !== 'aramcreations-e1529') {
    throw new FirebaseConfigurationError('Το FIREBASE_SERVICE_ACCOUNT δεν ανήκει στο project aramcreations-e1529.');
  }
  if (typeof value.client_email !== 'string' || typeof value.private_key !== 'string' || !value.private_key.includes('BEGIN PRIVATE KEY')) {
    throw new FirebaseConfigurationError('Το FIREBASE_SERVICE_ACCOUNT δεν περιέχει client_email και private_key διαχειριστή.');
  }
  return { projectId: value.project_id, clientEmail: value.client_email, privateKey: value.private_key.replace(/\\n/g, '\n') };
}
