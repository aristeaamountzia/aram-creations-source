import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { initializeApp as initializeAdmin, cert } from 'firebase-admin/app';
import { getAuth as getAdminAuth } from 'firebase-admin/auth';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, signInWithCustomToken, signOut } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, deleteDoc, terminate } from 'firebase/firestore';
import { applyVintedRefresh } from '../src/lib/vinted-storage';
import { vintedRefreshPatch } from '../src/lib/vinted-refresh';
const credentialPath = process.env.ORDER_TEST_CREDENTIAL_PATH;
if (!credentialPath) throw new Error('Set local credential path.');
const admin = initializeAdmin({ credential: cert(JSON.parse(readFileSync(credentialPath, 'utf8'))) }, 'vinted-storage-test');
const app = initializeApp({ apiKey: 'AIzaSyCbOy-d0naXBGw6TR-2dGS5Wb4IEkZYDKU', projectId: 'aramcreations-e1529' }, 'vinted-storage-test');
const auth = getAuth(app), db = getFirestore(app), collection = `checkout_test_${randomUUID().replaceAll('-', '')}`, ref = doc(db, collection, 'fixture');
try {
  const user = await getAdminAuth(admin).getUserByEmail('aristeaamnta@gmail.com');
  await signInWithCustomToken(auth, await getAdminAuth(admin).createCustomToken(user.uid));
  const baseline = { price: 10, status: 'Διαθέσιμο', stock: 1, purchaseLinks: [{ site: 'Vinted', url: 'https://www.vinted.gr/items/123-fixture' }] };
  await setDoc(ref, baseline);
  const { patch } = vintedRefreshPatch(baseline, { priceKnown: true, price: 20, currency: 'EUR', isReserved: true, availabilityKnown: true }, { sitePrice: 25 });
  await applyVintedRefresh(db, 'fixture', baseline, patch, collection);
  const saved = (await getDoc(ref)).data()!;
  assert.equal(saved.price, 25); assert.equal(saved.vintedBasePrice, 20); assert.equal(saved.status, 'Κρατημένο');
  assert.equal(saved.vintedRefreshBackup.data.price, 10);
  await assert.rejects(applyVintedRefresh(db, 'fixture', baseline, patch, collection));
  await setDoc(ref, { ...baseline, checkoutReservations: { order: 1 } });
  await assert.rejects(applyVintedRefresh(db, 'fixture', baseline, { stock: 0 }, collection));
  console.log('PASS: actual browser SDK authentication, Vinted price/status write, backup and concurrent-order protection.');
} finally { await deleteDoc(ref).catch(() => {}); await signOut(auth); await terminate(db); await deleteApp(app); await admin.delete(); }

