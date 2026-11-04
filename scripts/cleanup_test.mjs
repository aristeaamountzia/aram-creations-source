import fs from 'node:fs';
import { cert, initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const envContent = fs.readFileSync('./.env', 'utf-8');
const saMatch = envContent.match(/FIREBASE_SERVICE_ACCOUNT=(.+)/);
const serviceAccount = JSON.parse(saMatch[1]);
const app = initializeApp({ credential: cert(serviceAccount) }, 'cleanup');
const db = getFirestore(app);

const testOrderId = "77777777-1234-4234-8234-1234567890aa";
const productId = "0688CEqpVUNrYL78OUeb";

console.log('Cleaning up test order:', testOrderId);
await db.doc(`orders/${testOrderId}`).delete().catch(() => {});
await db.doc(`orderNotifications/${testOrderId}`).delete().catch(() => {});
await db.doc(`jewelry/${productId}`).update({
  stock: 1,
  status: 'Διαθέσιμο',
  [`checkoutReservations.${testOrderId}`]: FieldValue.delete()
});

console.log('Restored product', productId, 'to Διαθέσιμο, stock: 1');

