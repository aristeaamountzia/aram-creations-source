import { createPermanentFixtureBackup, restoreToFixtureNamespace, verifyFixtureBackup } from '../stage1/backup-prototype';
import publicMediaHandler from '../../netlify/functions/public-media';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { initializeApp, deleteApp } from 'firebase/app';
import { connectAuthEmulator, getAuth, signInWithCustomToken, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator, doc, collection, getDocFromServer, query, where, getDocs, serverTimestamp, terminate } from 'firebase/firestore';
import { getBytes, ref } from 'firebase/storage';
import { emulatorServices } from '../../server/test-isolation';
import { commitCatalog, reconcileCatalog, cleanupMedia } from '../../server/catalog-publication';
import { projectProduct, projectSettings } from '../../server/public-projection';
import { wire } from '../../src/lib/catalog-wire';
import { configureCatalogWrites, setDoc, updateDoc, addDoc, deleteDoc, writeBatch } from '../../src/lib/catalog-write';
import { persistHistory, restoreHistory } from '../../src/lib/catalog-history';
import { applyVintedRefresh } from '../../src/lib/vinted-storage';
import { buildCatalogExcel } from '../../src/lib/catalog-excel';
import { createOrdersHandler } from '../../netlify/functions/orders';
import writeHandler from '../../netlify/functions/catalog-write';
import metricsHandler from '../../netlify/functions/catalog-metrics';
import mediaHandler from '../../netlify/functions/media';
import reconcileHandler from '../../netlify/functions/catalog-reconcile';
import backupHandler from '../../netlify/functions/catalog-backup-schedule';
import emailHandler from '../../netlify/functions/order-email-retry';
import { downloadBackup, listBackups } from '../../server/catalog-backups';
import { EMULATOR_PROJECT, EMULATOR_BUCKET } from '../../src/lib/emulator-target';

const services = emulatorServices('stage2-tests');
const rules = await initializeTestEnvironment({ projectId: EMULATOR_PROJECT, firestore: { host: '127.0.0.1', port: 8080, rules: readFileSync('tests/stage2/firestore.rules', 'utf8') }, storage: { host: '127.0.0.1', port: 9199, rules: readFileSync('tests/stage2/storage.rules', 'utf8') } });
const app = initializeApp({ apiKey: 'emulator-only', projectId: EMULATOR_PROJECT }, 'stage2-admin-client'), auth = getAuth(app), db = getFirestore(app);
connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true }); connectFirestoreEmulator(db, '127.0.0.1', 8080);
await signInWithCustomToken(auth, await services.auth.createCustomToken('stage2-admin', { admin: true }));
configureCatalogWrites(db, async request => { await commitCatalog(request, { uid: 'stage2-admin' }, services); });
const anonymous = rules.unauthenticatedContext();
const base = { name: 'Fixture', description: '  Original description\n', notes: '  Mixed legacy notes\n', price: 20, stock: 3, status: 'Διαθέσιμο', cost: 4, storage: 'Secret shelf', colors: ['Μοβ'], category: 'Κολιέ', createdAt: serverTimestamp(), unknownPrivate: { secret: 'never-public' } };
const canonical = (id: string) => doc(db, 'jewelry', id);
const published = (id: string) => services.db.doc(`publicCatalog/${id}`);
try {
  await test('anonymous and non-admin access: only allowlisted projections, no canonical/notes/history/settings/receipts', async () => {
    await setDoc(canonical('privacy'), base);
    await setDoc(doc(db, 'settings', 'shop'), { heroTitle: 'Public title', aiAssistant: { backofficeEndpoint: 'private-endpoint' }, customFields: { internal: 'private' }, portfolioDesign: { title: 'Art', categories: [{ id: 'x', title: 'X', description: 'D', notes: 'secret' }] } });
    const publicData = (await assertSucceeds(getDocFromServer(doc(anonymous.firestore(), 'publicCatalog', 'privacy')))).data()!;
    assert.equal(publicData.description, base.description);
    for (const field of ['notes', 'cost', 'storage', 'unknownPrivate', 'notesReview', 'internalNotes']) assert.ok(!(field in publicData));
    const settings = (await assertSucceeds(getDocFromServer(doc(anonymous.firestore(), 'publicSettings', 'shop')))).data()!;
    assert.ok(!settings.aiAssistant && !settings.customFields && !settings.portfolioDesign.categories[0].notes);
    for (const path of ['jewelry/privacy', 'settings/shop', 'catalogHistory/private', 'catalogOperations/private', 'orders/private']) await assertFails(getDocFromServer(doc(anonymous.firestore(), path)));
    await assertFails(getDocFromServer(doc(rules.authenticatedContext('member').firestore(), 'jewelry', 'privacy')));
    const directAdmin = rules.authenticatedContext('admin', { admin: true });
    const sdk = await import('firebase/firestore');
    await assertFails(sdk.updateDoc(doc(directAdmin.firestore(), 'jewelry', 'privacy'), { price: 1 }));
    const storageSDK = await import('firebase/storage');
    await assertFails(storageSDK.uploadBytes(storageSDK.ref(directAdmin.storage(EMULATOR_BUCKET), 'jewelry/unsafe-sdk.png'), new Uint8Array([1]), { contentType: 'image/png' }));
    await assertFails(sdk.setDoc(doc(directAdmin.firestore(), 'publicCatalog', 'forged'), { showInShop: true, cost: 1 }));
    assert.equal((await writeHandler(new Request('http://127.0.0.1/api/catalog-write', { method: 'POST', body: '{}' }))).status, 403);
    await services.auth.createUser({ uid: 'unverified-owner', email: 'aristeaamnta@gmail.com', password: 'fixture-password-123', emailVerified: false });
    const memberAuth = getAuth(initializeApp({ apiKey: 'emulator-only', projectId: EMULATOR_PROJECT }, 'unverified-owner')); connectAuthEmulator(memberAuth, 'http://127.0.0.1:9099', { disableWarnings: true }); await signInWithEmailAndPassword(memberAuth, 'aristeaamnta@gmail.com', 'fixture-password-123');
    const response = await writeHandler(new Request('http://127.0.0.1/api/catalog-write', { method: 'POST', headers: { authorization: `Bearer ${await memberAuth.currentUser!.getIdToken()}` }, body: '{}' })); assert.equal(response.status, 403); await deleteApp(memberAuth.app);
  });

  await test('edit, bulk changes, duplication, quick sale, order, settings, Vinted and history use the trusted gateway', async () => {
    await updateDoc(canonical('privacy'), { name: 'Edited', notes: base.notes }); assert.equal((await published('privacy').get()).data()!.name, 'Edited');
    const copy = await addDoc(collection(db, 'jewelry'), { ...base, name: 'Copy' });
    const batch = writeBatch(db); batch.update(canonical('privacy'), { colors: ['Μωβ'], shopOrder: 50 }); batch.update(copy, { colors: ['Μωβ'], shopOrder: 40 }); await batch.commit();
    assert.equal((await published(copy.id).get()).data()!.shopOrder, 40);
    await updateDoc(copy, { status: 'Πουλήθηκε', stock: 0 }); assert.equal((await published(copy.id).get()).data()!.stock, 0);
    const before = (await services.db.doc('jewelry/privacy').get()).data()!;
    await applyVintedRefresh(db, 'privacy', before, { price: 25 }); assert.equal((await published('privacy').get()).data()!.price, 25);
    const entry = { id: 'privacy', collection: 'jewelry', type: 'UPDATE', before: { price: 20 }, after: { price: 25 }, timestamp: new Date().toISOString() };
    await persistHistory(db, entry); await restoreHistory(db, entry); assert.equal((await published('privacy').get()).data()!.price, 20);
    await restoreHistory(db, { ...entry, before: entry.after, after: entry.before }); assert.equal((await published('privacy').get()).data()!.price, 25);
    const latest = (await services.db.doc('jewelry/privacy').get()).data()!;
    assert.equal(latest.notes, base.notes); assert.equal(latest.description, base.description);
    const workbook = await buildCatalogExcel({ shop: [{ ...latest, id: 'privacy' }], portfolio: [], loadThumbnail: async () => { throw Error('No fixture thumbnail'); } }); assert.equal(workbook.total, 1);
    await deleteDoc(copy); assert.equal((await published(copy.id).get()).exists, false);
  });

  await test('notes review preserves both raw fields and invalidates approval when either source text changes', async () => {
    await updateDoc(canonical('privacy'), { notesReview: { state: 'approved', publicDescription: 'Human-approved public text' }, internalNotes: 'Private review text' });
    assert.equal((await published('privacy').get()).data()!.description, 'Human-approved public text');
    let source = (await services.db.doc('jewelry/privacy').get()).data()!; assert.equal(source.notes, base.notes); assert.equal(source.description, base.description);
    await updateDoc(canonical('privacy'), { notes: 'Changed deliberately' }); assert.equal((await published('privacy').get()).data()!.description, base.description);
    source = (await services.db.doc('jewelry/privacy').get()).data()!; assert.equal(source.internalNotes, 'Private review text');
  });

  await test('publication failure is atomic, network retry is idempotent and reconciliation removes stale/deleted records', async () => {
    const request = { requestId: randomUUID(), operations: [{ method: 'update', path: 'jewelry/privacy', data: wire({ price: 99 }) }], reads: [] };
    const prior = (await published('privacy').get()).data()!;
    await assert.rejects(commitCatalog(request, { uid: 'test' }, services, async () => { throw Error('Injected publication failure'); }));
    assert.equal((await services.db.doc('jewelry/privacy').get()).data()!.price, 25); assert.equal((await published('privacy').get()).data()!.price, prior.price);
    await commitCatalog(request, { uid: 'test' }, services); assert.equal((await commitCatalog(request, { uid: 'test' }, services)).replay, true);
    await services.db.doc('jewelry/privacy').update({ price: 30 });
    await services.db.doc('publicCatalog/deleted-ghost').set({ showInShop: true, price: 5 });
    assert.deepEqual((await reconcileCatalog(services)).errors, []);
    assert.equal((await published('privacy').get()).data()!.price, 30); assert.equal((await published('deleted-ghost').get()).exists, false);
    await updateDoc(canonical('privacy'), { showInShop: false }); assert.equal((await published('privacy').get()).exists, false);
    await updateDoc(canonical('privacy'), { showInShop: true });
  });

  await test('private media tokens and legacy aliases are rejected; public derivatives survive only while approved', async () => {
    await services.bucket.file('jewelry/private.png').save('PRIVATE', { resumable: false, metadata: { contentType: 'image/png', metadata: { firebaseStorageDownloadTokens: 'old-token' } } });
    await services.bucket.file('jewelry/public-source.png').save('PUBLIC', { resumable: false, metadata: { contentType: 'image/png', metadata: { firebaseStorageDownloadTokens: 'source-token' } } });
    const url = (path: string, token: string) => `http://127.0.0.1:9199/v0/b/${EMULATOR_BUCKET}/o/${encodeURIComponent(path)}?alt=media&token=${token}`;
    await setDoc(canonical('media'), { ...base, imageUrl: url('jewelry/private.png', 'different-token-alias'), images: [url('jewelry/private.png', 'another-alias')], mediaList: [{ url: url('jewelry/private.png', 'old-token'), showInShop: false }, { url: url('jewelry/public-source.png', 'source-token'), showInShop: true }] });
    const projection = (await published('media').get()).data()!;
    assert.equal(projection.mediaList.length, 1); assert.equal(await (await publicMediaHandler(new Request('http://127.0.0.1'+projection.mediaList[0].url))).text(), 'PUBLIC');
    const range = await publicMediaHandler(new Request('http://127.0.0.1'+projection.mediaList[0].url, { headers: { range: 'bytes=1-3' } })); assert.equal(range.status, 206); assert.equal(await range.text(), 'UBL');
    assert.notEqual((await fetch(url('jewelry/private.png', 'old-token'))).status, 200);
    assert.notEqual((await fetch(url('jewelry/public-source.png', 'source-token'))).status, 200);
    await assertFails(getBytes(ref(anonymous.storage(EMULATOR_BUCKET), 'jewelry/private.png')));
    const request = new Request('http://127.0.0.1/api/media', { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${await auth.currentUser!.getIdToken()}` }, body: JSON.stringify({ action: 'preview', url: url('jewelry/private.png', 'old-token') }) });
    const preview = await mediaHandler(request); assert.equal(preview.status, 200); assert.equal(await preview.text(), 'PRIVATE');
    await updateDoc(canonical('media'), { showInShop: false }); assert.equal((await published('media').get()).exists, false); assert.notEqual((await publicMediaHandler(new Request('http://127.0.0.1'+projection.mediaList[0].url))).status, 200);
  });

  await test('order reservation/cancellation and publication commit together; stock policy remains 3 -> 0 -> 1', async () => {
    await setDoc(canonical('order-product'), base);
    const payload = { requestId: randomUUID(), expectedTotal: 22.5, shippingMethod: 'boxnow', paymentMethod: 'iris', items: [{ id: 'order-product', quantity: 1 }], customer: { name: 'Fixture', email: 'x@example.invalid', phone: '6900000000', address: 'Fixture', city: 'Fixture', postalCode: '' } };
    const req = () => new Request('http://127.0.0.1/api/orders', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
    const failing = createOrdersHandler(() => services, async () => {}, () => { throw Error('Injected publication failure'); });
    assert.equal((await failing(req(), { ip: 'stage2' })).status, 503); assert.equal((await services.db.doc('jewelry/order-product').get()).data()!.stock, 3);
    const handler = createOrdersHandler(); assert.equal((await handler(req(), { ip: 'stage2' })).status, 201); assert.equal((await published('order-product').get()).data()!.stock, 0);
    assert.equal((await handler(req(), { ip: 'stage2' })).status, 201);
    const cancel = new Request('http://127.0.0.1/api/orders', { method: 'PATCH', headers: { 'content-type': 'application/json', authorization: `Bearer ${await auth.currentUser!.getIdToken()}` }, body: JSON.stringify({ id: payload.requestId, status: 'cancelled' }) });
    assert.equal((await handler(cancel, {})).status, 200); assert.equal((await published('order-product').get()).data()!.stock, 1);
  });

  await test('failed media publication exposes no draft bytes; cleanup failure cannot revive hidden media and is retryable', async () => {
    await services.bucket.file('jewelry/draft.png').save('DRAFT', { resumable: false, contentType: 'image/png' });
    const request = { requestId: randomUUID(), operations: [{ method: 'set', path: 'jewelry/draft', data: wire({ ...base, mediaList: [{ url: `gs://${EMULATOR_BUCKET}/jewelry/draft.png`, showInShop: true }] }) }], reads: [] };
    await assert.rejects(commitCatalog(request, { uid: 'test' }, services, async () => { throw Error('Publication failed'); }));
    const [staged] = await services.bucket.getFiles({ prefix: 'publicMedia/jewelry/draft/' }); assert.equal(staged.length, 1);
    const publicUrl = `/api/public-media?asset=${encodeURIComponent(staged[0].name)}`;
    assert.equal((await publicMediaHandler(new Request('http://127.0.0.1'+publicUrl))).status, 404);
    await assertFails(getBytes(ref(anonymous.storage(EMULATOR_BUCKET), staged[0].name)));
    await commitCatalog(request, { uid: 'test' }, services);
    assert.equal((await publicMediaHandler(new Request('http://127.0.0.1'+publicUrl))).status, 200);
    const failingBucket = Object.create(services.bucket), file = services.bucket.file.bind(services.bucket);
    failingBucket.file = (path: string) => { const object = file(path); if (path === staged[0].name) object.delete = async () => { throw Error('Injected cleanup failure'); }; return object; };
    await commitCatalog({ requestId: randomUUID(), operations: [{ method: 'update', path: 'jewelry/draft', data: wire({ showInShop: false }) }], reads: [] }, { uid: 'test' }, { ...services, bucket: failingBucket });
    assert.equal((await publicMediaHandler(new Request('http://127.0.0.1'+publicUrl))).status, 404);
    assert.equal((await file(staged[0].name).exists())[0], true);
    await cleanupMedia(services); assert.equal((await file(staged[0].name).exists())[0], false);
  });

  await test('permanent fixture backup verifies and restores private fields, projections and media without overwriting later commerce', async () => {
    const source = (await services.db.doc('jewelry/privacy').get()).data()!;
    await services.db.doc('jewelry/backup-source').set(source);
    const backup = await createPermanentFixtureBackup(services.db, services.bucket, 'stage1-stage2-permanent');
    const [bytes] = await services.bucket.file('stage1-permanent-backups/stage1-stage2-permanent.json').download();
    assert.equal(verifyFixtureBackup(bytes).sha256, backup.sha256);
    await assert.rejects(createPermanentFixtureBackup(services.db, services.bucket, 'stage1-stage2-permanent'));
    await services.db.doc('jewelry/backup-source').update({ stock: 7 });
    await services.db.doc('orders/after-stage2-backup').set({ status: 'paid', total: 123 });
    await restoreToFixtureNamespace(services.db, services.bucket, backup, 'stage1-stage2-restore');
    const restored = (await services.db.doc('stage1Restores/stage1-stage2-restore/jewelry/backup-source').get()).data()!;
    assert.equal(restored.notes, source.notes); assert.equal(restored.description, source.description);
    assert.equal((await services.db.doc('jewelry/backup-source').get()).data()!.stock, 7);
    assert.equal((await services.db.doc('orders/after-stage2-backup').get()).data()!.status, 'paid');
    const object = backup.payload.media.find(m => m.path === 'jewelry/private.png')!;
    assert.ok(object);
    assert.deepEqual((await services.bucket.file('stage1Restores/stage1-stage2-restore/jewelry/private.png').download())[0], (await services.bucket.file('jewelry/private.png').download())[0]);
    assert.ok((await services.db.doc('stage1Restores/stage1-stage2-restore/publicCatalog/privacy').get()).exists);
  });

  await test('anonymous metrics cannot edit arbitrary fields; schedules and expanded backups remain isolated', async () => {
    const response = await metricsHandler(new Request('http://127.0.0.1/api/catalog-metrics', { method: 'POST', body: JSON.stringify({ id: 'privacy', kind: 'view', delta: 1, requestId: randomUUID(), cost: 0, stock: 900 }) }), { ip: 'test' }); assert.equal(response.status, 200);
    assert.equal((await published('privacy').get()).data()!.views, 1); assert.equal((await services.db.doc('jewelry/privacy').get()).data()!.stock, 3);
    assert.equal((await reconcileHandler()).status, 200); assert.equal((await backupHandler()).status, 204); assert.equal((await emailHandler()).status, 204);
    const rows = await listBackups(), backup = JSON.parse((await downloadBackup(rows[0].name)).toString());
    assert.ok(backup.collections.publicCatalog.length); assert.ok(backup.collections.catalogOperations.length); assert.ok(backup.historyParts.length);
    assert.equal(projectSettings({ heroTitle: 'X', aiAssistant: { secret: 'hidden' } })!.aiAssistant, undefined);
  });
} finally { await terminate(db); await deleteApp(app); await rules.cleanup(); }
