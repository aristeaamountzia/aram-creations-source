import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { createOrdersHandler } from '../netlify/functions/orders';
import { notifyOrder } from './order-notifications';

// Run explicitly with a local credential path. No production catalog records are touched.
const path = process.env.ORDER_TEST_CREDENTIAL_PATH;
if (!path) throw new Error('Set ORDER_TEST_CREDENTIAL_PATH to a local service account file.');
const app = initializeApp({ credential: cert(JSON.parse(readFileSync(path, 'utf8'))) }, 'order-integration');
const realDb = getFirestore(app);
const prefix = `checkout_test_${randomUUID().replaceAll('-', '')}_`;
const scopedDb = {
  doc: (path: string) => realDb.doc(prefix + path),
  collection: (path: string) => realDb.collection(prefix + path),
  runTransaction: realDb.runTransaction.bind(realDb),
};
const realAuth = getAuth(app);
// Token decoding is independently provided by Firebase; this fixture exercises authorized order transitions.
const fixtureAuth = Object.assign(Object.create(realAuth), {
  verifyIdToken: async (token: string) => token === 'fixture-admin' ? { uid: 'fixture-admin', admin: true } : null,
});
let sentCount = 0;
const handler = createOrdersHandler(() => ({ db: scopedDb as any, auth: fixtureAuth }), (db, id) => notifyOrder(db, id, async () => { sentCount++; return 'fixture-email'; }));
const first = randomUUID(), second = randomUUID();
const payload = (id: string) => ({ requestId: id, expectedTotal: 22.5, shippingMethod: 'boxnow', paymentMethod: 'iris', items: [{ id: 'fixture', quantity: 1 }], customer: { name: 'Checkout verification', email: 'test@example.invalid', phone: '6900000000', address: 'Test 1', city: 'Test', postalCode: '', notes: 'Automated isolated verification' } });
const send = (method: string, body?: any, admin = false) => handler(new Request('https://lovely-bienenstitch-b6079c.netlify.app/api/orders', { method, headers: { 'content-type': 'application/json', ...(admin ? { authorization: 'Bearer fixture-admin' } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) }), { ip: prefix });
try {
  await scopedDb.doc('jewelry/fixture').set({ name: 'Isolated fixture', price: 20, stock: 9, status: 'Διαθέσιμο' });
  assert.equal((await send('GET')).status, 401);
  const attempts = await Promise.all([send('POST', payload(first)), send('POST', payload(second))]);
  assert.deepEqual(attempts.map(r => r.status).sort(), [201, 409]);
  const winner = attempts[0].status === 201 ? first : second;
  assert.equal((await scopedDb.doc('jewelry/fixture').get()).data()?.stock, 0);
  assert.equal((await send('POST', payload(winner))).status, 201);
  assert.equal((await scopedDb.collection('orders').get()).size, 1);
  assert.equal(sentCount, 1);
  assert.equal((await scopedDb.doc(`orderNotifications/${winner}`).get()).data()?.state, 'sent');
  await scopedDb.doc(`orderNotifications/${winner}`).set({ state: 'pending', payload: { number: 'TEST', total: 22.5 } });
  await notifyOrder(scopedDb as any, winner, async () => { throw new Error('MAIL_HTTP_429'); });
  assert.equal((await scopedDb.doc(`orderNotifications/${winner}`).get()).data()?.state, 'pending');
  await notifyOrder(scopedDb as any, winner, async () => 'fixture-retry');
  assert.equal((await scopedDb.doc(`orderNotifications/${winner}`).get()).data()?.state, 'sent');
  assert.equal((await scopedDb.doc('jewelry/fixture').get()).data()?.stock, 0);
  assert.equal((await send('PATCH', { id: winner, status: 'cancelled' }, true)).status, 200);
  assert.equal((await scopedDb.doc('jewelry/fixture').get()).data()?.stock, 1);
  assert.equal((await send('PATCH', { id: winner, status: 'cancelled' }, true)).status, 200);
  assert.equal((await scopedDb.doc('jewelry/fixture').get()).data()?.stock, 1);
  assert.equal((await send('PATCH', { id: winner, status: 'paid' }, true)).status, 409);
  assert.equal((await send('GET', undefined, true)).status, 200);
  console.log('PASS: Firestore concurrency, persistence, retries, cancellation and private access.');
} finally {
  for (const collection of ['jewelry', 'orders', 'orderRateLimits', 'orderNotifications']) {
    const docs = await scopedDb.collection(collection).get();
    const batch = realDb.batch();
    docs.docs.forEach(doc => batch.delete(doc.ref));
    await batch.commit();
  }
  await app.delete();
}
