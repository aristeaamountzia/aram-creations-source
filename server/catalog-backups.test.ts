import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { Writable } from 'node:stream';
import { gunzipSync } from 'node:zlib';
import { Timestamp, GeoPoint } from 'firebase-admin/firestore';
import { encodeBackupValue, decodeBackupValue, restoredDocuments, type FullBackup } from './backup-format';
import { archiveMedia, restoreArchivedMedia } from './backup-media';
import { createBackup, runBackupJob, backupJobStatus, backupWorkerUrl } from './catalog-backups';
import { recoverBackup } from './backup-recovery';

function fixture() {
  const objects = new Map<string, any>(), versions = new Map<string, any>(), records = new Map<string, any>();
  let generation = 0, reads = 0, copies = 0, writes = 0;
  const bucket: any = { name: 'aramcreations-e1529.firebasestorage.app', storage: { bucket: () => bucket }, file(name: string, options?: any) {
    const object = () => {
      reads++;
      const result = options?.generation ? versions.get(name + '@' + options.generation) : objects.get(name);
      if (!result) throw Object.assign(new Error('File not found: ' + name), { code: 404 });
      return result;
    };
    return { name,
      getMetadata: async () => [object().metadata], download: async () => [Buffer.from(object().bytes)],
      save: async (data: any, config: any = {}) => {
        const current = objects.get(name), required = config.preconditionOpts?.ifGenerationMatch;
        if (required !== undefined && String(required) !== String(current?.metadata.generation || 0)) throw Object.assign(new Error('Generation conflict'), { code: 412 });
        const bytes = Buffer.from(data), metadata = { ...config.metadata, name, generation: String(++generation), size: String(bytes.length), crc32c: createHash('sha256').update(bytes).digest('base64') };
        const value = { bytes, metadata }; objects.set(name, value); versions.set(name + '@' + generation, value); writes++;
      },
      copy: async (destination: any, config: any = {}) => {
        const value = object(); copies++;
        const custom = { ...(value.metadata.metadata || {}), ...config.metadata };
        for (const key of Object.keys(custom)) if (custom[key] === null) delete custom[key];
        await destination.save(value.bytes, { preconditionOpts: config.preconditionOpts, metadata: { ...value.metadata, contentType: config.contentType || value.metadata.contentType, cacheControl: config.cacheControl ?? value.metadata.cacheControl, metadata: custom } });
        return [destination];
      },
      createWriteStream: (config: any) => {
        const chunks: Buffer[] = [];
        return new Writable({ write(chunk, _encoding, next) { chunks.push(Buffer.from(chunk)); next(); },
          final(next) { bucket.file(name).save(Buffer.concat(chunks), config).then(() => next(), next); } });
      }
    };
  } };
  const ref = (path: string) => ({ path, id: path.split('/').at(-1), collection: (name: string) => collection(path + '/' + name) });
  const snap = (path: string) => ({ ref: ref(path), id: path.split('/').at(-1), exists: records.has(path), data: () => records.get(path) });
  const collection = (path: string) => {
    const query = { path, limit: (_count: number) => query, get: async () => {
      const docs = [...records.keys()].filter(key => key.startsWith(path + '/') && key.split('/').length === path.split('/').length + 1).map(snap);
      return { docs, size: docs.length, empty: !docs.length };
    } }; return query;
  };
  const db: any = { doc: ref, collection, getAll: async (...refs: any[]) => refs.map(r => snap(r.path)),
    runTransaction: async (callback: any, options: any) => { assert.equal(options.readOnly, true); return callback({ get: (query: any) => query.get() }); },
    batch: () => { const pending: any[] = []; return { create: (ref: any, data: any) => pending.push({ ref, data }), commit: async () => {
      for (const row of pending) if (records.has(row.ref.path)) throw new Error('Document exists');
      pending.forEach(row => { records.set(row.ref.path, row.data); writes++; });
    } }; }
  };
  return { bucket, db, records, objects, versions, stats: () => ({ reads, copies, writes }) };
}
const ownUrl = 'https://firebasestorage.googleapis.com/v0/b/aramcreations-e1529.firebasestorage.app/o/jewelry%2Foriginal.jpg?alt=media&token=original-token';
const externalUrl = 'https://static.wixstatic.com/media/external.jpg';
const externalFetch = async () => new Response(Buffer.from('external image bytes'), { headers: { 'Content-Type': 'image/jpeg' } });

test('background jobs target their own Netlify deploy without depending on build-only env vars', () => {
  const old = process.env.CATALOG_BACKUP_WORKER_URL; delete process.env.CATALOG_BACKUP_WORKER_URL;
  try { assert.equal(backupWorkerUrl({ deploy: { id: 'abcdef123456' }, site: { name: 'fixture-site' } }), 'https://abcdef123456--fixture-site.netlify.app/.netlify/functions/catalog-backup-worker'); }
  finally { if (old === undefined) delete process.env.CATALOG_BACKUP_WORKER_URL; else process.env.CATALOG_BACKUP_WORKER_URL = old; }
});

test('backup codec preserves timestamps, bytes, geo points, non-finite numbers and user type-marker fields', () => {
  const original = { at: new Timestamp(1234, 987654321), bytes: Buffer.from([0, 255]), point: new GeoPoint(37, 23),
    marker: { type: 'timestamp', seconds: 1 }, numbers: [NaN, Infinity, -Infinity], null: null };
  const decoded = decodeBackupValue(JSON.parse(JSON.stringify(encodeBackupValue(original))), { doc: path => ({ path }) });
  assert.deepEqual(decoded, original);
});

test('media archives are private, deduplicated by source generation and restore original bytes after deletion', async () => {
  const f = fixture();
  await f.bucket.file('jewelry/original.jpg').save(Buffer.from('original image bytes'), { metadata: { contentType: 'image/jpeg', metadata: { firebaseStorageDownloadTokens: 'original-token' } } });
  const media = await archiveMedia(f.bucket, ownUrl);
  assert.equal(f.objects.get(media.archive).metadata.metadata.firebaseStorageDownloadTokens, undefined);
  await archiveMedia(f.bucket, ownUrl); assert.equal(f.stats().copies, 1);
  f.objects.delete('jewelry/original.jpg');
  assert.equal((await archiveMedia(f.bucket, ownUrl)).archive, media.archive);
  const before = f.stats().writes;
  await restoreArchivedMedia(f.bucket, media, false); assert.equal(f.stats().writes, before);
  await restoreArchivedMedia(f.bucket, media, true);
  assert.equal(f.objects.get('jewelry/original.jpg').bytes.toString(), 'original image bytes');
  assert.equal(f.objects.get('jewelry/original.jpg').metadata.metadata.firebaseStorageDownloadTokens, 'original-token');
  await f.bucket.file('jewelry/original.jpg').save(Buffer.from('changed source'), { metadata: { contentType: 'image/jpeg' } });
  assert.notEqual((await archiveMedia(f.bucket, ownUrl)).archive, media.archive);
  await assert.rejects(() => restoreArchivedMedia(f.bucket, media, true), /διαφορετικό αρχείο/);
});

test('external media is streamed to private storage and recovered to a new owned URL', async () => {
  const f = fixture(), media = await archiveMedia(f.bucket, externalUrl, externalFetch as any);
  const writes = f.stats().writes;
  await archiveMedia(f.bucket, externalUrl, async () => { throw new Error('Must reuse archive'); });
  assert.equal(f.stats().writes, writes);
  const result = await restoreArchivedMedia(f.bucket, media, true);
  assert.match(result.replacements[0][1], /^https:\/\/firebasestorage.googleapis.com\//);
  assert.ok([...f.objects.keys()].some(path => path.startsWith('jewelry/recovered/')));
});

test('background backup includes coherent documents, history parts, notification outbox and actual media', async () => {
  const f = fixture(), key = 'fixture-worker-key'; let token = '';
  await f.bucket.file('jewelry/original.jpg').save('original image bytes', { metadata: { contentType: 'image/jpeg' } });
  f.records.set('jewelry/a', { name: 'Fixture', privateMedia: [{ url: ownUrl }], at: new Timestamp(3, 5) });
  f.records.set('orders/order', { state: 'paid', stockReserved: true });
  f.records.set('orderNotifications/order', { state: 'sent', idempotencyKey: 'retained' });
  f.records.set('catalogHistory/h', { parts: 1 });
  f.records.set('catalogHistory/h/parts/0', { text: JSON.stringify({ before: { imageUrl: externalUrl } }) });
  const job = await createBackup(new Date(), f as any, async (_id, value) => { token = value; }, key);
  const before = f.stats().reads;
  await assert.rejects(() => runBackupJob(job.jobId, 'wrong', f as any, key), /UNAUTHORIZED/);
  assert.equal(f.stats().reads, before);
  await runBackupJob(job.jobId, token, f as any, key, externalFetch as any);
  const status = await backupJobStatus(job.jobId, f as any); assert.equal(status.status, 'complete');
  const snapshot: FullBackup = JSON.parse(gunzipSync(f.objects.get('backups/catalog/' + status.name).bytes).toString());
  assert.equal(snapshot.mediaIncluded, true);
  assert.ok(snapshot.documents.some(row => row.path === 'catalogHistory/h/parts/0'));
  assert.ok(snapshot.documents.some(row => row.path === 'orderNotifications/order'));
  assert.ok(snapshot.media.some(row => row.urls.includes(ownUrl)));
  assert.ok(snapshot.media.some(row => row.urls.includes(externalUrl)));
  const writes = f.stats().writes;
  await runBackupJob(job.jobId, token, f as any, key, externalFetch as any); assert.equal(f.stats().writes, writes);
});

test('missing media produces a partial snapshot and never a false complete result', async () => {
  const f = fixture(); let token = '';
  f.records.set('jewelry/a', { imageUrl: ownUrl });
  const job = await createBackup(new Date(), f as any, async (_id, value) => { token = value; }, 'key');
  await runBackupJob(job.jobId, token, f as any, 'key', externalFetch as any);
  const status = await backupJobStatus(job.jobId, f as any); assert.equal(status.status, 'partial');
  const backup = JSON.parse(gunzipSync(f.objects.get('backups/catalog/' + status.name).bytes).toString());
  assert.equal(backup.mediaIncluded, false); assert.equal(backup.missingMedia.length, 1);
  assert.equal(backup.documents.length, 1);
});

test('recovery drill restores documents, exact media bytes, typed fields, seed tombstones and rewritten chunked history', async () => {
  const f = fixture();
  await f.bucket.file('jewelry/original.jpg').save('original image bytes', { metadata: { contentType: 'image/jpeg' } });
  const media = [await archiveMedia(f.bucket, ownUrl), await archiveMedia(f.bucket, externalUrl, externalFetch as any)];
  f.objects.delete('jewelry/original.jpg');
  const text = JSON.stringify({ before: { url: externalUrl }, after: { url: ownUrl }, padding: 'x'.repeat(100000) });
  const rows = [
    ['jewelry/a', { imageUrl: ownUrl, at: new Timestamp(2, 123), private: externalUrl }],
    ['portfolio/seed', { isDeleted: true }], ['catalogHistory/h', { parts: 2 }],
    ['catalogHistory/h/parts/0', { text: text.slice(0, 35) }], ['catalogHistory/h/parts/1', { text: text.slice(35) }],
    ['orderNotifications/order', { state: 'sent', idempotencyKey: 'retained' }]
  ];
  const backup: FullBackup = { format: 'aram-catalog-v2', project: 'aramcreations-e1529', createdAt: new Date().toISOString(), mediaIncluded: true,
    documents: rows.map(([path, data]) => ({ path: String(path), value: encodeBackupValue(data) })),
    seedPortfolio: [encodeBackupValue({ id: 'seed', title: 'Original seed', image: externalUrl })], media, missingMedia: [] };
  const before = f.stats().writes;
  const dryRun = await recoverBackup(backup, f, { prefix: 'recovery_test_' });
  assert.equal(dryRun.dryRun, true); assert.equal(f.stats().writes, before);
  await recoverBackup(backup, f, { prefix: 'recovery_test_', apply: true });
  assert.equal(f.objects.get('jewelry/original.jpg').bytes.toString(), 'original image bytes');
  assert.equal(f.records.get('recovery_test_jewelry/a').at.nanoseconds, 123);
  assert.match(f.records.get('recovery_test_jewelry/a').private, /jewelry%2Frecovered/);
  assert.equal(f.records.get('recovery_test_portfolio/seed').isDeleted, true);
  assert.equal(f.records.get('recovery_test_portfolio/seed').title, 'Original seed');
  assert.equal(f.records.get('recovery_test_orderNotifications/order').idempotencyKey, 'retained');
  const summary = f.records.get('recovery_test_catalogHistory/h');
  const restored = JSON.parse(Array.from({ length: summary.parts }, (_, i) => f.records.get(`recovery_test_catalogHistory/h/parts/${i}`).text).join(''));
  assert.equal(restored.before.url, f.records.get('recovery_test_jewelry/a').private);
  const after = f.stats().writes;
  await assert.rejects(() => recoverBackup(backup, f, { prefix: 'recovery_test_', apply: true }), /δεν είναι κενός/);
  assert.equal(f.stats().writes, after);
});

test('invalid paths, incomplete history and corrupt media stop recovery before any writes', async () => {
  const f = fixture();
  const backup: FullBackup = { format: 'aram-catalog-v2', project: 'aramcreations-e1529', createdAt: '', mediaIncluded: true,
    documents: [{ path: 'catalogHistory/h', value: encodeBackupValue({ parts: 1 }) }], seedPortfolio: [], media: [], missingMedia: [] };
  assert.throws(() => restoredDocuments(backup, f.db), /Λείπουν/);
  backup.documents = [{ path: 'other/private', value: encodeBackupValue({}) }];
  await assert.rejects(() => recoverBackup(backup, f, { prefix: 'recovery_test_', apply: true }), /Μη επιτρεπτή/);
  backup.documents = [];
  backup.media = [{ archive: 'backups/media/missing', generation: '1', size: '2', crc32c: 'invalid', contentType: 'image/jpeg', urls: [ownUrl] }];
  await assert.rejects(() => recoverBackup(backup, f, { prefix: 'recovery_test_', apply: true }), /File not found/);
  assert.equal(f.stats().writes, 0);
});
