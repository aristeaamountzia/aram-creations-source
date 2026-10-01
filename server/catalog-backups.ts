import { gzipSync, gunzipSync } from 'node:zlib';
import { adminDatabase } from './admin-database';
export const BACKUP_PREFIX = 'backups/catalog/';
export async function createBackup(now = new Date()) {
  const { db, bucket } = adminDatabase();
  const collections: Record<string, any[]> = {};
  for (const name of ['jewelry', 'portfolio', 'settings', 'orders']) {
    const snapshot = await db.collection(name).get();
    collections[name] = snapshot.docs.map(doc => ({ id: doc.id, data: doc.data() }));
  }
  const backup = { format: 'aram-catalog-v1', createdAt: now.toISOString(), mediaIncluded: false, collections };
  const bytes = gzipSync(JSON.stringify(backup));
  // Rotating slots: 24 hours at 30-minute intervals plus 7 daily snapshots.
  const halfHour = Math.floor(now.getTime() / 1800000) % 48;
  const day = Math.floor(now.getTime() / 86400000) % 7;
  const metadata = { contentType: 'application/gzip', metadata: { createdAt: backup.createdAt, records: String(Object.values(collections).reduce((sum, rows) => sum + rows.length, 0)) } };
  await bucket.file(`${BACKUP_PREFIX}slot-${halfHour}.json.gz`).save(bytes, { resumable: false, metadata });
  await bucket.file(`${BACKUP_PREFIX}daily-${day}.json.gz`).save(bytes, { resumable: false, metadata });
  return { createdAt: backup.createdAt, bytes: bytes.length, records: metadata.metadata.records };
}
export async function listBackups() {
  const { bucket } = adminDatabase();
  const [files] = await bucket.getFiles({ prefix: BACKUP_PREFIX });
  return files.filter(file => /\/(slot-\d+|daily-\d+)\.json\.gz$/.test(file.name)).map(file => ({ name: file.name.slice(BACKUP_PREFIX.length), createdAt: file.metadata.metadata?.createdAt, records: file.metadata.metadata?.records })).sort((a,b) => String(b.createdAt).localeCompare(String(a.createdAt)));
}
export async function downloadBackup(name: string) {
  if (!/^(slot-(?:[0-9]|[1-3][0-9]|4[0-7])|daily-[0-6])\.json\.gz$/.test(name)) throw new Error('Invalid backup');
  const [bytes] = await adminDatabase().bucket.file(`${BACKUP_PREFIX}${name}`).download();
  return gunzipSync(bytes);
}
