import { createHash } from 'node:crypto';
import { Timestamp, GeoPoint, DocumentReference, type Firestore } from 'firebase-admin/firestore';
import { assertEmulatorIsolation, type emulatorServices } from '../../server/test-isolation';
type Bucket = ReturnType<typeof emulatorServices>['bucket'];

function encode(value: any): any {
  if (value instanceof Timestamp) return { $type: 'timestamp', seconds: value.seconds, nanoseconds: value.nanoseconds };
  if (value instanceof Date) return { $type: 'date', value: value.toISOString() };
  if (value instanceof GeoPoint) return { $type: 'geopoint', latitude: value.latitude, longitude: value.longitude };
  if (value instanceof DocumentReference) return { $type: 'reference', path: value.path };
  if (Buffer.isBuffer(value) || value instanceof Uint8Array) return { $type: 'bytes', value: Buffer.from(value).toString('base64') };
  if (Array.isArray(value)) return value.map(encode);
  if (value && typeof value === 'object') return { $type: 'map', entries: Object.keys(value).sort().map(k => [k, encode(value[k])]) };
  return value;
}
function decode(value: any, db: Firestore): any {
  if (value?.$type === 'timestamp') return new Timestamp(value.seconds, value.nanoseconds);
  if (value?.$type === 'date') return new Date(value.value);
  if (value?.$type === 'geopoint') return new GeoPoint(value.latitude, value.longitude);
  if (value?.$type === 'reference') return db.doc(value.path);
  if (value?.$type === 'bytes') return Buffer.from(value.value, 'base64');
  if (value?.$type === 'map') return Object.fromEntries(value.entries.map(([k, v]: [string, any]) => [k, decode(v, db)]));
  if (Array.isArray(value)) return value.map(v => decode(v, db));
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, decode(v, db)]));
  return value;
}
const digest = (value: any) => createHash('sha256').update(JSON.stringify(encode(value))).digest('hex');
type Payload = { format: string; createdAt: string; documents: { path: string; data: any }[]; media: { path: string; contentType: string; bytes: string; sha256: string }[] };
export async function createPermanentFixtureBackup(db: Firestore, bucket: Bucket, id: string) {
  assertEmulatorIsolation();
  if (!/^stage1-[a-z0-9-]+$/.test(id)) throw new Error('Invalid fixture backup ID.');
  const documents: Payload['documents'] = [];
  async function visit(collections: FirebaseFirestore.CollectionReference[]) {
    for (const collection of collections) {
      for (const doc of await collection.listDocuments()) {
        const snapshot = await doc.get();
        if (snapshot.exists) documents.push({ path: doc.path, data: encode(snapshot.data()) });
        await visit(await doc.listCollections());
      }
    }
  }
  await visit(await db.listCollections());
  documents.sort((a, b) => a.path.localeCompare(b.path));
  const media: Payload['media'] = [];
  const [files] = await bucket.getFiles();
  for (const file of files.filter(f => !f.name.startsWith('stage1-permanent-backups/'))) {
    const [bytes] = await file.download(), [metadata] = await file.getMetadata();
    media.push({ path: file.name, contentType: metadata.contentType || 'application/octet-stream', bytes: bytes.toString('base64'), sha256: createHash('sha256').update(bytes).digest('hex') });
  }
  media.sort((a, b) => a.path.localeCompare(b.path));
  const payload: Payload = { format: 'aram-stage1-fixture-v1', createdAt: new Date().toISOString(), documents, media };
  const envelope = { payload, sha256: digest(payload), documentCount: documents.length, mediaCount: media.length };
  const file = bucket.file(`stage1-permanent-backups/${id}.json`);
  // Storage Emulator does not enforce generation preconditions. A create-only
  // Firestore manifest also prevents this tool from overwriting an existing ID.
  const manifest = db.doc(`stage1BackupManifests/${id}`);
  await manifest.create({ state: 'writing', path: file.name, sha256: envelope.sha256 });
  await file.save(JSON.stringify(envelope), { resumable: false, contentType: 'application/json', preconditionOpts: { ifGenerationMatch: 0 } });
  const [downloaded] = await file.download();
  const verified = verifyFixtureBackup(downloaded);
  await manifest.update({ state: 'verified', documentCount: verified.documentCount, mediaCount: verified.mediaCount });
  return verified;
}
export function verifyFixtureBackup(bytes: Buffer | Uint8Array) {
  const envelope = JSON.parse(Buffer.from(bytes).toString());
  if (envelope.payload?.format !== 'aram-stage1-fixture-v1' || digest(envelope.payload) !== envelope.sha256 || envelope.documentCount !== envelope.payload.documents.length || envelope.mediaCount !== envelope.payload.media.length) throw new Error('Backup integrity failed.');
  const paths = new Set<string>();
  for (const row of envelope.payload.documents) {
    if (typeof row.path !== 'string' || row.path.split('/').length % 2 || paths.has(row.path)) throw new Error('Invalid document manifest.');
    paths.add(row.path);
  }
  for (const row of envelope.payload.media) if (createHash('sha256').update(Buffer.from(row.bytes, 'base64')).digest('hex') !== row.sha256) throw new Error('Media integrity failed.');
  return envelope as { payload: Payload; sha256: string; documentCount: number; mediaCount: number };
}
export async function restoreToFixtureNamespace(db: Firestore, bucket: Bucket, backup: ReturnType<typeof verifyFixtureBackup>, namespace: string) {
  assertEmulatorIsolation();
  if (!/^stage1-[a-z0-9-]+$/.test(namespace)) throw new Error('Invalid fixture namespace.');
  for (const row of backup.payload.documents) await db.doc(`stage1Restores/${namespace}/${row.path}`).create(decode(row.data, db));
  for (const row of backup.payload.media) await bucket.file(`stage1Restores/${namespace}/${row.path}`).save(Buffer.from(row.bytes, 'base64'), { resumable: false, contentType: row.contentType, preconditionOpts: { ifGenerationMatch: 0 } });
}
export async function undoFixtureColors(db: Firestore, id: string, before: string[], expectedAfter: string[]) {
  assertEmulatorIsolation();
  await db.runTransaction(async tx => {
    const ref = db.doc(`jewelry/${id}`), snapshot = await tx.get(ref), current = snapshot.data();
    if (!current || digest(current.colors) !== digest(expectedAfter)) throw new Error('Concurrent color edit; rollback refused.');
    if (Object.values(current.checkoutReservations || {}).some(q => Number(q) > 0)) throw new Error('Active order; rollback refused.');
    // Only the audited field is restored. Never stock, reservations, status or orders.
    tx.update(ref, { colors: before });
  });
}
