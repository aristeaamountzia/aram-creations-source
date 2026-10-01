import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { getStorage } from 'firebase-admin/storage';
export function adminDatabase() {
  const credentials = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || '{}');
  if (credentials.project_id !== 'aramcreations-e1529') throw new Error('Firebase credentials unavailable');
  const app = getApps().find(a => a.name === 'catalog-services') || initializeApp({ credential: cert(credentials), projectId: credentials.project_id, storageBucket: 'aramcreations-e1529.firebasestorage.app' }, 'catalog-services');
  return { db: getFirestore(app), auth: getAuth(app), bucket: getStorage(app).bucket() };
}
export async function requireAdmin(request: Request) {
  const services = adminDatabase();
  const token = request.headers.get('authorization')?.match(/^Bearer (.+)$/i)?.[1];
  const user = token ? await services.auth.verifyIdToken(token).catch(() => null) : null;
  if (!user || !(user.admin === true || user.email?.toLowerCase() === 'aristeaamnta@gmail.com')) throw new Error('ADMIN_REQUIRED');
  return services;
}
