import fs from 'node:fs';
import { cert, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const envContent = fs.readFileSync('./09_NEW_APPLICATION/.env', 'utf-8');
const saMatch = envContent.match(/FIREBASE_SERVICE_ACCOUNT=(.+)/);
if (!saMatch) {
  console.error('No service account found in .env');
  process.exit(1);
}

const serviceAccount = JSON.parse(saMatch[1]);
const app = initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore(app);

const snap = await db.collection('jewelry').limit(5).get();
console.log('Found', snap.size, 'jewelry items:');
for (const doc of snap.docs) {
  const d = doc.data();
  console.log({
    id: doc.id,
    name: d.name || d.title,
    price: d.price,
    stock: d.stock,
    status: d.status
  });
}

