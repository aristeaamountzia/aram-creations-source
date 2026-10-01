import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { initializeApp as initializeAdmin, cert } from 'firebase-admin/app';
import { getAuth as getAdminAuth } from 'firebase-admin/auth';
import { getFirestore as getAdminFirestore } from 'firebase-admin/firestore';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, signInWithCustomToken, signOut } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, getDocFromServer, terminate } from 'firebase/firestore';
import { persistHistory, loadHistory, restoreHistory } from '../src/lib/catalog-history';
const credentialPath = process.env.ORDER_TEST_CREDENTIAL_PATH;
if (!credentialPath) throw new Error('Set local credential path.');
const admin = initializeAdmin({ credential: cert(JSON.parse(readFileSync(credentialPath, 'utf8'))) }, 'history-integration');
const realDb = getAdminFirestore(admin);
const app = initializeApp({ apiKey: 'AIzaSyCbOy-d0naXBGw6TR-2dGS5Wb4IEkZYDKU', projectId: 'aramcreations-e1529' }, 'history-integration');
const auth = getAuth(app), db = getFirestore(app), collection = `checkout_test_${randomUUID().replaceAll('-', '')}`, ref = doc(db, collection, 'fixture');
try {
  const user = await getAdminAuth(admin).getUserByEmail('aristeaamnta@gmail.com');
  await signInWithCustomToken(auth, await getAdminAuth(admin).createCustomToken(user.uid));
  const entry = { type: 'UPDATE', collection, id: 'fixture', timestamp: new Date().toISOString(), before: { price: 10, description: 'a'.repeat(150000) }, after: { price: 20, description: 'b'.repeat(150000) } };
  await setDoc(ref, { ...entry.after, name: 'Keep this title' });
  await persistHistory(db, entry);
  const cloud = await realDb.collection('catalogHistory').where('collection','==',collection).get();
  assert.equal(cloud.size,1); assert.ok(cloud.docs[0].data().parts > 1);
  const loaded = await loadHistory(db, cloud.docs[0].data()); assert.deepEqual(loaded,entry);
  await restoreHistory(db, loaded); let saved = (await getDoc(ref)).data()!;
  assert.equal(saved.price,10); assert.equal(saved.name,'Keep this title');
  await restoreHistory(db, { ...loaded, before: loaded.after, after: loaded.before });
  saved=(await getDoc(ref)).data()!; assert.equal(saved.price,20);
  await setDoc(ref,{price:30},{merge:true}); await assert.rejects(restoreHistory(db,loaded));
  await setDoc(ref,{price:20,checkoutReservations:{fixture_order:1}},{merge:true}); await assert.rejects(restoreHistory(db,loaded));
  await signOut(auth); await assert.rejects(getDocFromServer(doc(db,'catalogHistory',cloud.docs[0].id)));
  console.log('PASS: cloud history chunks, undo, redo, unrelated fields, concurrent changes, order protection and anonymous access denied.');
} finally {
  await realDb.doc(`${collection}/fixture`).delete();
  const entries = await realDb.collection('catalogHistory').where('collection','==',collection).get();
  for (const entry of entries.docs) await realDb.recursiveDelete(entry.ref);
  await terminate(db); await deleteApp(app); await admin.delete();
}
