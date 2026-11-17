import { initializeApp, applicationDefault, deleteApp as deleteAdminApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { syncPublicJewelry } from '../server/public-catalog-sync';

// Run only after the publisher is deployed, with GOOGLE_APPLICATION_CREDENTIALS
// pointing to an authorized local credential outside the repository.
const projectId = 'aramcreations-e1529';
if (process.argv[2] !== `--project=${projectId}`) throw new Error(`Specify --project=${projectId}`);
const app = initializeApp({ credential: applicationDefault(), projectId }, 'catalog-migration');
try {
  const db = getFirestore(app);
  const [source, target] = await Promise.all([db.collection('jewelry').select().get(), db.collection('shopCatalog').select().get()]);
  const ids = [...new Set([...source.docs, ...target.docs].map(doc => doc.id))];
  const results: Record<string, number> = {};
  for (const id of ids) {
    const state = await syncPublicJewelry(db, id);
    results[state] = (results[state] || 0) + 1;
  }
  console.log(JSON.stringify({ projectId, database: '(default)', records: ids.length, results }));
} finally { await deleteAdminApp(app); }
