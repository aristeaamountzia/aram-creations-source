import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { initializeApp as initializeClient, deleteApp } from 'firebase/app';
import { connectAuthEmulator, getAuth, signInWithCustomToken, signOut } from 'firebase/auth';
import { connectFirestoreEmulator, getFirestore, doc, getDocFromServer, getDocs, collection, query, where, setDoc, terminate } from 'firebase/firestore';
import { getBytes, ref } from 'firebase/storage';
import { Timestamp } from 'firebase-admin/firestore';
import { randomUUID } from 'node:crypto';
import { emulatorServices, assertEmulatorIsolation } from '../../server/test-isolation';
import { EMULATOR_PROJECT, EMULATOR_BUCKET } from '../../src/lib/emulator-target';
import { createOrdersHandler } from '../../netlify/functions/orders';
import backupSchedule from '../../netlify/functions/catalog-backup-schedule';
import emailSchedule from '../../netlify/functions/order-email-retry';
import mediaHandler from '../../netlify/functions/media';
import aiHandler from '../../netlify/functions/backoffice-ai';
import wixHandler from '../../netlify/functions/wix-project';
import { sendOrderEmail } from '../../server/order-notifications';
import { persistHistory, loadHistory, restoreHistory } from '../../src/lib/catalog-history';
import { applyVintedRefresh } from '../../src/lib/vinted-storage';
import { buildCatalogExcel } from '../../src/lib/catalog-excel';
import { splitForReview, adminCompatibilityView } from './privacy-prototype';
import { createPermanentFixtureBackup, restoreToFixtureNamespace, verifyFixtureBackup, undoFixtureColors } from './backup-prototype';
import { colorDryRun } from './options-dry-run';

assertEmulatorIsolation();
const services = emulatorServices('stage1-fixtures');
const env = await initializeTestEnvironment({ projectId: EMULATOR_PROJECT, firestore: { host: '127.0.0.1', port: 8080, rules: readFileSync('firestore.rules', 'utf8') }, storage: { host: '127.0.0.1', port: 9199, rules: readFileSync('storage.rules', 'utf8') } });
const anonymous = env.unauthenticatedContext();
const admin = env.authenticatedContext('fixture-admin', { admin: true, email: 'admin@example.invalid', email_verified: true });
const source = { name: 'Synthetic product', price: 20, stock: 3, status: 'Διαθέσιμο', description: 'Approved public description', notes: 'Mixed legacy text pending review', cost: 4, storage: 'Private fixture shelf', colors: ['Μοβ', 'Μωβ'], materials: ['Ρητίνη', 'Υγρό Γυαλί'], showInShop: false, imageUrl: 'https://private.invalid/token-photo', images: ['https://private.invalid/token-photo'], mediaList: [{ url: 'https://private.invalid/token-photo', showInShop: false, originalUrl: 'https://private.invalid/original' }, { url: 'https://public.invalid/approved.jpg', type: 'image', showInShop: true }] };

try {
  await test('baseline rules expose hidden products and private fields; legacy media fallbacks bypass exclusion', async () => {
    await services.db.doc('jewelry/hidden-fixture').set(source);
    const current = (await assertSucceeds(getDocFromServer(doc(anonymous.firestore(), 'jewelry', 'hidden-fixture')))).data()!;
    assert.equal(current.cost, 4); assert.equal(current.showInShop, false); assert.equal(current.notes, source.notes);
    // Matches the legacy images/imageUrl fallback in getItemMediaList.
    assert.ok(current.images.includes(current.mediaList[0].url));
    await assertFails(getDocFromServer(doc(anonymous.firestore(), 'catalogHistory', 'private')));
  });

  await test('real browser SDK Auth and Firestore connect only to emulator; CRUD, history and Vinted regression checks', async () => {
    const app = initializeClient({ apiKey: 'emulator-only', projectId: EMULATOR_PROJECT, authDomain: `${EMULATOR_PROJECT}.firebaseapp.com` }, 'stage1-browser-sdk');
    const auth = getAuth(app), db = getFirestore(app);
    connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
    connectFirestoreEmulator(db, '127.0.0.1', 8080);
    try {
      await signInWithCustomToken(auth, await services.auth.createCustomToken('stage1-admin', { admin: true }));
      assert.equal(auth.app.options.projectId, EMULATOR_PROJECT);
      const before = { price: 10, description: 'a'.repeat(150000), colors: ['Μοβ'], name: 'Preserved title' };
      const after = { ...before, price: 20, description: 'b'.repeat(150000) };
      await setDoc(doc(db, 'jewelry', 'history-fixture'), after);
      const entry = { type: 'UPDATE', collection: 'jewelry', id: 'history-fixture', timestamp: new Date().toISOString(), before, after };
      await persistHistory(db, entry);
      const cloud = await services.db.collection('catalogHistory').where('id', '==', 'history-fixture').get();
      const loaded = await loadHistory(db, cloud.docs[0].data()); assert.deepEqual(loaded, entry);
      await restoreHistory(db, loaded); assert.equal((await services.db.doc('jewelry/history-fixture').get()).data()!.price, 10);
      await restoreHistory(db, { ...loaded, before: after, after: before });
      await setDoc(doc(db, 'jewelry', 'history-fixture'), { checkoutReservations: { order: 1 } }, { merge: true });
      await assert.rejects(restoreHistory(db, loaded));
      const baseline = { price: 10, status: 'Διαθέσιμο', stock: 1, purchaseLinks: [{ site: 'Vinted', url: 'https://www.vinted.gr/items/123-fixture' }] };
      await setDoc(doc(db, 'jewelry', 'vinted-fixture'), baseline);
      await applyVintedRefresh(db, 'vinted-fixture', baseline, { price: 25 });
      assert.equal((await services.db.doc('jewelry/vinted-fixture').get()).data()!.vintedRefreshBackup.data.price, 10);
      await assert.rejects(applyVintedRefresh(db, 'vinted-fixture', baseline, { price: 30 }));
      await signOut(auth);
      await assertFails(setDoc(doc(db, 'jewelry', 'anonymous-write'), { price: 1 }));
    } finally { await terminate(db); await deleteApp(app); }
  });

  await test('stock=3, purchase=1 and cancellation reproduce 3 -> 0 -> 1; retries and concurrency are preserved', async () => {
    await services.db.doc('jewelry/stock-three').set({ name: 'Stock fixture', price: 20, stock: 3, status: 'Διαθέσιμο', colors: ['Μωβ'] });
    const app = initializeClient({ apiKey: 'emulator-only', projectId: EMULATOR_PROJECT }, 'stage1-order-admin');
    const auth = getAuth(app); connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
    await signInWithCustomToken(auth, await services.auth.createCustomToken('order-admin', { admin: true }));
    const token = await auth.currentUser!.getIdToken();
    const handler = createOrdersHandler();
    const payload = (requestId: string) => ({ requestId, expectedTotal: 22.5, shippingMethod: 'boxnow', paymentMethod: 'iris', items: [{ id: 'stock-three', quantity: 1 }], customer: { name: 'Fixture', email: 'fixture@example.invalid', phone: '6900000000', address: 'Fixture 1', city: 'Test', postalCode: '' } });
    const send = (body: any, method = 'POST') => handler(new Request('http://127.0.0.1/api/orders', { method, headers: { 'content-type': 'application/json', ...(method === 'PATCH' ? { authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(body) }), { ip: 'stage1-fixture' });
    try {
      const id = randomUUID(), another = randomUUID();
      const attempts = await Promise.all([send(payload(id)), send(payload(another))]);
      assert.deepEqual(attempts.map(r => r.status).sort(), [201, 409]);
      const winner = attempts[0].status === 201 ? id : another;
      assert.equal((await services.db.doc('jewelry/stock-three').get()).data()!.stock, 0);
      assert.equal((await send(payload(winner))).status, 201);
      assert.equal((await services.db.collection('orders').get()).size, 1);
      assert.equal((await services.db.doc(`orderNotifications/${winner}`).get()).data()!.state, 'sent');
      assert.equal((await send({ id: winner, status: 'cancelled' }, 'PATCH')).status, 200);
      assert.equal((await services.db.doc('jewelry/stock-three').get()).data()!.stock, 1);
      assert.equal((await send({ id: winner, status: 'cancelled' }, 'PATCH')).status, 200);
      assert.equal((await services.db.doc('jewelry/stock-three').get()).data()!.stock, 1);
      assert.equal((await send({ id: winner, status: 'paid' }, 'PATCH')).status, 409);
    } finally { await signOut(auth); await deleteApp(app); }
  });

  await test('Storage, scheduled backups and email retries target emulators; external providers are disabled', async () => {
    await services.bucket.file('jewelry/fixture.png').save(Buffer.from('synthetic-image'), { resumable: false, contentType: 'image/png' });
    await assertFails(getBytes(ref(anonymous.storage(EMULATOR_BUCKET), 'jewelry/fixture.png')));
    assert.deepEqual(Buffer.from(await assertSucceeds(getBytes(ref(admin.storage(EMULATOR_BUCKET), 'jewelry/fixture.png')))), Buffer.from('synthetic-image'));
    await services.bucket.file('jewelry/token-private.png').save('token-fixture', { resumable: false, metadata: { contentType: 'image/png', metadata: { firebaseStorageDownloadTokens: 'stage1-token' } } });
    await assertFails(getBytes(ref(anonymous.storage(EMULATOR_BUCKET), 'jewelry/token-private.png')));
    // A published long-lived download token defeats SDK/rules-only hiding.
    const tokenDownload = await fetch(`http://127.0.0.1:9199/v0/b/${EMULATOR_BUCKET}/o/jewelry%2Ftoken-private.png?alt=media&token=stage1-token`);
    assert.equal(tokenDownload.status, 200); assert.equal(await tokenDownload.text(), 'token-fixture');
    assert.match(await sendOrderEmail('fixture', { number: 'FIXTURE', total: 1 }), /^stage1-email-suppressed/);
    assert.equal((await backupSchedule()).status, 204);
    assert.equal((await emailSchedule()).status, 204);
    const request = new Request('http://127.0.0.1/api/test', { method: 'POST' });
    assert.equal((await mediaHandler(request)).status, 503);
    assert.equal((await aiHandler(request)).status, 503);
    assert.equal((await wixHandler(request)).status, 503);
    const [files] = await services.bucket.getFiles({ prefix: 'backups/catalog/' }); assert.ok(files.length >= 2);
  });

  await test('proposed public projection is lossless for admin adapters, Excel, duplication, AI input and mixed notes', async () => {
    const split = splitForReview(source), combined = adminCompatibilityView('hidden-fixture', split.adminData);
    assert.equal(split.publicData.description, source.description);
    assert.ok(!('notes' in split.publicData)); assert.ok(!('cost' in split.publicData)); assert.ok(!('storage' in split.publicData));
    assert.deepEqual(split.publicData.mediaList, [{ url: 'https://public.invalid/approved.jpg', type: 'image' }]);
    assert.equal(split.adminData.notesReview.state, 'pending');
    assert.deepEqual(combined, { ...source, id: 'hidden-fixture' });
    assert.equal({ ...combined, id: 'copy-fixture' }.notes, source.notes);
    // AI remains admin-only; original fields remain available, without a provider call.
    const aiInput = { notes: combined.notes, cost: combined.cost, materials: combined.materials };
    assert.equal(aiInput.notes, source.notes);
    const excel = await buildCatalogExcel({ shop: [combined], portfolio: [], loadThumbnail: async () => { throw new Error('Fixture deliberately has no image'); } });
    assert.equal(excel.total, 1);
  });

  await test('proposed rules deny anonymous direct access to hidden products and all private documents/media', async () => {
    await env.cleanup();
    const proposal = await initializeTestEnvironment({ projectId: EMULATOR_PROJECT, firestore: { host: '127.0.0.1', port: 8080, rules: readFileSync('tests/stage1/firestore.proposed.rules', 'utf8') }, storage: { host: '127.0.0.1', port: 9199, rules: readFileSync('tests/stage1/storage.proposed.rules', 'utf8') } });
    try {
      const split = splitForReview(source);
      await services.db.doc('publicCatalog/hidden-fixture').set(split.publicData);
      await services.db.doc('productAdmin/hidden-fixture').set(split.adminData);
      await services.db.doc('publicCatalog/visible-fixture').set({ ...split.publicData, showInShop: true });
      const anon = proposal.unauthenticatedContext(), admin = proposal.authenticatedContext('admin', { admin: true });
      const member = proposal.authenticatedContext('member');
      await assertFails(getDocFromServer(doc(anon.firestore(), 'publicCatalog', 'hidden-fixture')));
      await assertFails(getDocs(collection(anon.firestore(), 'publicCatalog')));
      const visible = await assertSucceeds(getDocs(query(collection(anon.firestore(), 'publicCatalog'), where('showInShop', '==', true))));
      assert.equal(visible.size, 1);
      const publicResult = (await assertSucceeds(getDocFromServer(doc(anon.firestore(), 'publicCatalog', 'visible-fixture')))).data()!;
      assert.ok(!('notes' in publicResult));
      for (const path of ['jewelry/hidden-fixture', 'productAdmin/hidden-fixture', 'orders/private', 'catalogHistory/private']) {
        await assertFails(getDocFromServer(doc(anon.firestore(), path)));
        await assertFails(getDocFromServer(doc(member.firestore(), path)));
      }
      await assertSucceeds(getDocFromServer(doc(admin.firestore(), 'productAdmin', 'hidden-fixture')));
      const unverifiedOwner = proposal.authenticatedContext('unverified', { email: 'aristeaamnta@gmail.com', email_verified: false });
      await assertFails(getDocFromServer(doc(unverifiedOwner.firestore(), 'productAdmin', 'hidden-fixture')));
      await assertFails(setDoc(doc(member.firestore(), 'publicCatalog', 'visible-fixture'), { showInShop: true, cost: 9 }));
      await services.bucket.file('privateMedia/private.png').save('private', { resumable: false, contentType: 'image/png' });
      await services.bucket.file('publicMedia/public.png').save('public', { resumable: false, contentType: 'image/png' });
      await assertFails(getBytes(ref(anon.storage(EMULATOR_BUCKET), 'privateMedia/private.png')));
      await assertSucceeds(getBytes(ref(admin.storage(EMULATOR_BUCKET), 'privateMedia/private.png')));
      await assertSucceeds(getBytes(ref(anon.storage(EMULATOR_BUCKET), 'publicMedia/public.png')));
      const privateDownload = await fetch(`http://127.0.0.1:9199/v0/b/${EMULATOR_BUCKET}/o/privateMedia%2Fprivate.png?alt=media&token=unknown-token`);
      assert.notEqual(privateDownload.status, 200);
    } finally { await proposal.cleanup(); }
  });

  await test('immutable backup downloads, verifies, restores documents/subcollections/media and preserves subsequent orders/stock', async () => {
    await services.db.doc('settings/fixture').set({ at: new Timestamp(1234, 567000), bytes: Buffer.from('typed-fixture'), customMap: { $type: 'timestamp', seconds: 7, nanoseconds: 8 } });
    await services.db.doc('catalogHistory/fixture/parts/0').set({ text: 'historical-original' });
    const backup = await createPermanentFixtureBackup(services.db, services.bucket, 'stage1-before-conversion');
    assert.ok(backup.documentCount > 0); assert.ok(backup.mediaCount > 0);
    assert.ok(backup.payload.documents.some(d => d.path === 'catalogHistory/fixture/parts/0'));
    const file = services.bucket.file('stage1-permanent-backups/stage1-before-conversion.json');
    const [bytes] = await file.download(); assert.equal(verifyFixtureBackup(bytes).sha256, backup.sha256);
    const corrupted = JSON.parse(bytes.toString()); corrupted.payload.documents[0].data = { changed: true };
    assert.throws(() => verifyFixtureBackup(Buffer.from(JSON.stringify(corrupted))));
    await assert.rejects(createPermanentFixtureBackup(services.db, services.bucket, 'stage1-before-conversion'));
    await restoreToFixtureNamespace(services.db, services.bucket, backup, 'stage1-restored');
    const restored = (await services.db.doc('stage1Restores/stage1-restored/settings/fixture').get()).data()!;
    assert.equal(restored.at.seconds, 1234); assert.equal(restored.at.nanoseconds, 567000); assert.deepEqual(restored.bytes, Buffer.from('typed-fixture'));
    assert.deepEqual(restored.customMap, { $type: 'timestamp', seconds: 7, nanoseconds: 8 });
    const [restoredMedia] = await services.bucket.file('stage1Restores/stage1-restored/jewelry/fixture.png').download(); assert.equal(restoredMedia.toString(), 'synthetic-image');
    await services.db.doc('jewelry/rollback-fixture').set({ colors: ['Μωβ'], stock: 5, status: 'Διαθέσιμο' });
    await services.db.doc('orders/later-fixture').set({ total: 100, status: 'paid' });
    await undoFixtureColors(services.db, 'rollback-fixture', ['Μοβ'], ['Μωβ']);
    assert.equal((await services.db.doc('jewelry/rollback-fixture').get()).data()!.stock, 5);
    assert.equal((await services.db.doc('orders/later-fixture').get()).data()!.status, 'paid');
    await assert.rejects(undoFixtureColors(services.db, 'rollback-fixture', ['Μοβ'], ['Μωβ']));
    await services.db.doc('jewelry/rollback-fixture').update({ colors: ['Μωβ'], checkoutReservations: { later: 1 } });
    await assert.rejects(undoFixtureColors(services.db, 'rollback-fixture', ['Μοβ'], ['Μωβ']));
  });

  await test('color dry run does not write; only explicit Μοβ -> Μωβ alias is proposed and conflicts are reported', () => {
    const original = structuredClone(source);
    const report = colorDryRun([{ id: 'fixture', colors: source.colors }], { 'Μοβ': '#123456', 'Μωβ': '#654321' });
    assert.deepEqual(report.changes[0].after, ['Μωβ']); assert.equal(report.applied, false); assert.equal(report.paletteConflict, true);
    assert.deepEqual(source, original);
    assert.deepEqual(colorDryRun([{ id: 'fixture', colors: ['Μωβ'] }]).changes, []);
    assert.deepEqual(source.materials, ['Ρητίνη', 'Υγρό Γυαλί']);
  });
} finally { await env.cleanup(); }
