import { gzipSync, gunzipSync } from 'node:zlib';
import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { adminDatabase } from './admin-database';
import { ART_ITEMS } from '../src/data';
import { BACKUP_COLLECTIONS, encodeBackupValue, historyPayloads, type FullBackup } from './backup-format';
import { archiveMedia, collectBackupMedia, existingMetadata } from './backup-media';

export const BACKUP_PREFIX = 'backups/catalog/';
const JOB_PREFIX = 'backups/jobs/';
type Services = ReturnType<typeof adminDatabase>;
type Job = { id: string; createdAt: string; status: string; processed: number; total: number; missing: number; error?: string; name?: string; startedAt?: string };
const jobName = (id: string) => {
  if (!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(id)) throw new Error('Μη έγκυρο αναγνωριστικό backup.');
  return JOB_PREFIX + id + '.json';
};
function workerKey() {
  const key = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || '{}').private_key;
  if (!key) throw new Error('Δεν υπάρχει διαπιστευτήριο για την εργασία backup.');
  return key;
}
export const backupWorkerToken = (id: string, key: string) => createHmac('sha256', key).update('aram-backup:' + id).digest('hex');
const saveJob = (bucket: any, job: Job) => bucket.file(jobName(job.id)).save(JSON.stringify(job), { resumable: false, metadata: { contentType: 'application/json', cacheControl: 'private, no-store' } });

export interface BackupContext { deploy?: { id?: string }; site?: { name?: string } }
export function backupWorkerUrl(context?: BackupContext) {
  const deploy = context?.deploy?.id, site = context?.site?.name;
  const contextual = deploy && site && /^[a-z0-9-]+$/.test(deploy) && /^[a-z0-9-]+$/.test(site)
    ? `https://${deploy}--${site}.netlify.app` : '';
  return process.env.CATALOG_BACKUP_WORKER_URL || new URL('/.netlify/functions/catalog-backup-worker', contextual || process.env.DEPLOY_URL || process.env.PUBLIC_SITE_URL || 'https://aramcreationsofficial.netlify.app').href;
}
export async function dispatchBackupJob(id: string, token: string, context?: BackupContext) {
  const target = backupWorkerUrl(context);
  const response = await fetch(target, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, token }), signal: AbortSignal.timeout(10000), redirect: 'error' });
  if (response.status !== 202) throw new Error(`Η εργασία backup δεν ξεκίνησε (HTTP ${response.status}).`);
}

/** Queue the long operation; the scheduled request stays within its 30-second budget. */
export async function createBackup(now = new Date(), services = adminDatabase(), dispatch = dispatchBackupJob, key = workerKey()) {
  const job: Job = { id: randomUUID(), createdAt: now.toISOString(), status: 'queued', processed: 0, total: 0, missing: 0 };
  await saveJob(services.bucket, job);
  try { await dispatch(job.id, backupWorkerToken(job.id, key)); }
  catch (error: any) { job.status = 'failed'; job.error = error.message; await saveJob(services.bucket, job); throw error; }
  return { jobId: job.id, createdAt: job.createdAt, status: job.status };
}

export async function backupJobStatus(id: string, services = adminDatabase()): Promise<Job> {
  const [bytes] = await services.bucket.file(jobName(id)).download();
  return JSON.parse(bytes.toString());
}

async function captureDocuments(db: Services['db']) {
  return db.runTransaction(async transaction => {
    const result: Array<{ path: string; data: any }> = [];
    let capturedAt = '';
    for (const name of BACKUP_COLLECTIONS) {
      const snapshot = await transaction.get(db.collection(name));
      if (!capturedAt && snapshot.readTime) capturedAt = snapshot.readTime.toDate().toISOString();
      for (const doc of snapshot.docs) {
        result.push({ path: doc.ref.path, data: doc.data() });
        if (name === 'catalogHistory' && Number(doc.data().parts) > 0) {
          const parts = await transaction.get(doc.ref.collection('parts'));
          if (parts.size !== Number(doc.data().parts)) throw new Error(`Λείπουν τμήματα ιστορικού: ${doc.id}`);
          result.push(...parts.docs.map(part => ({ path: part.ref.path, data: part.data() })));
        }
      }
    }
    return { rows: result, capturedAt: capturedAt || new Date().toISOString() };
  }, { readOnly: true });
}

async function publishSlot(bucket: any, name: string, bytes: Buffer, metadata: any) {
  const file = bucket.file(BACKUP_PREFIX + name);
  for (let attempt = 0; attempt < 3; attempt++) {
    const current = await existingMetadata(file);
    // A slower old job cannot overwrite a newer snapshot in the rotating slot.
    if (String(current?.metadata?.createdAt || '') > metadata.metadata.createdAt) return;
    try { await file.save(bytes, { resumable: false, metadata, preconditionOpts: { ifGenerationMatch: current?.generation || 0 } }); return; }
    catch (error: any) { if (error.code !== 412 || attempt === 2) throw error; }
  }
}

async function publishBackup(backup: FullBackup, bucket: any, id: string) {
  const bytes = gzipSync(JSON.stringify(backup)), now = new Date(backup.createdAt);
  const halfHour = Math.floor(now.getTime() / 1800000) % 48, day = Math.floor(now.getTime() / 86400000) % 7;
  const metadata = { contentType: 'application/gzip', cacheControl: 'private, no-store', metadata: {
    createdAt: backup.createdAt, records: String(backup.documents.length), mediaIncluded: String(backup.mediaIncluded),
    mediaFiles: String(backup.media.length), missingMedia: String(backup.missingMedia.length), format: backup.format, jobId: id
  } };
  await publishSlot(bucket, `slot-${halfHour}.json.gz`, bytes, metadata);
  await publishSlot(bucket, `daily-${day}.json.gz`, bytes, metadata);
  return `slot-${halfHour}.json.gz`;
}

export async function runBackupJob(id: string, token: string, services = adminDatabase(), key = workerKey(), fetcher: typeof fetch = fetch) {
  jobName(id);
  const expected = Buffer.from(backupWorkerToken(id, key)), supplied = Buffer.from(String(token || ''));
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) throw new Error('BACKUP_JOB_UNAUTHORIZED');
  const jobFile = services.bucket.file(jobName(id)), current = (await jobFile.getMetadata())[0];
  const [jobBytes] = await services.bucket.file(jobName(id), { generation: current.generation }).download();
  const job: Job = JSON.parse(jobBytes.toString());
  if (['complete', 'partial'].includes(job.status)) return;
  if (Date.now() - Date.parse(job.createdAt) > 60 * 60 * 1000) throw new Error('Η εργασία backup έχει λήξει.');
  if (['reading', 'media'].includes(job.status)) return;
  job.status = 'reading'; job.startedAt = new Date().toISOString();
  try { await jobFile.save(JSON.stringify(job), { resumable: false, preconditionOpts: { ifGenerationMatch: current.generation }, metadata: { contentType: 'application/json', cacheControl: 'private, no-store' } }); }
  catch (error: any) { if (error.code === 412) return; throw error; }
  try {
    const { rows, capturedAt } = await captureDocuments(services.db);
    const urls = collectBackupMedia([...rows.map(row => row.data), ...historyPayloads(rows), ...ART_ITEMS]);
    const backup: FullBackup = { format: 'aram-catalog-v2', project: 'aramcreations-e1529', createdAt: capturedAt,
      mediaIncluded: false, documents: rows.map(row => ({ path: row.path, value: encodeBackupValue(row.data) })),
      seedPortfolio: ART_ITEMS.map(encodeBackupValue), media: [], missingMedia: [] };
    // The consistent document snapshot survives even if media transfer is interrupted.
    backup.missingMedia = urls.map(url => ({ url, error: 'Εκκρεμεί η αντιγραφή του αρχείου.' }));
    await publishBackup(backup, services.bucket, id);
    backup.missingMedia = [];
    job.status = 'media'; job.total = urls.length; await saveJob(services.bucket, job);
    let cursor = 0, progress = Promise.resolve();
    const worker = async () => {
      while (cursor < urls.length) {
        const url = urls[cursor++];
        try { backup.media.push(await archiveMedia(services.bucket, url, fetcher)); }
        catch (error: any) { backup.missingMedia.push({ url, error: error.message }); }
        job.processed++; job.missing = backup.missingMedia.length;
        if (job.processed % 5 === 0 || job.processed === job.total) {
          const value = { ...job }; progress = progress.then(() => saveJob(services.bucket, value)); await progress;
        }
      }
    };
    await Promise.all(Array.from({ length: 3 }, worker)); await progress;
    backup.mediaIncluded = backup.missingMedia.length === 0;
    job.name = await publishBackup(backup, services.bucket, id);
    job.status = backup.mediaIncluded ? 'complete' : 'partial';
    if (backup.missingMedia.length) job.error = `${backup.missingMedia.length} αρχεία δεν αντιγράφηκαν. ${backup.missingMedia[0].error}`;
    await saveJob(services.bucket, job);
  } catch (error: any) { job.status = 'failed'; job.error = error.message; await saveJob(services.bucket, job); throw error; }
}

export async function listBackups() {
  const { bucket } = adminDatabase();
  const [files] = await bucket.getFiles({ prefix: BACKUP_PREFIX });
  return files.filter(file => /\/(slot-\d+|daily-\d+)\.json\.gz$/.test(file.name)).map(file => ({
    name: file.name.slice(BACKUP_PREFIX.length), createdAt: file.metadata.metadata?.createdAt,
    records: file.metadata.metadata?.records, mediaIncluded: file.metadata.metadata?.mediaIncluded,
    format: file.metadata.metadata?.format, mediaFiles: file.metadata.metadata?.mediaFiles,
    missingMedia: file.metadata.metadata?.missingMedia
  })).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
}
export function assertBackupName(name: string) {
  if (!/^(slot-(?:[0-9]|[1-3][0-9]|4[0-7])|daily-[0-6])\.json\.gz$/.test(name)) throw new Error('Μη έγκυρο όνομα backup.');
}
export async function downloadBackup(name: string) {
  assertBackupName(name);
  const [bytes] = await adminDatabase().bucket.file(BACKUP_PREFIX + name).download();
  return gunzipSync(bytes);
}
export async function backupDownloadLink(name: string) {
  assertBackupName(name);
  const [url] = await adminDatabase().bucket.file(BACKUP_PREFIX + name).getSignedUrl({ action: 'read', expires: Date.now() + 300000, responseDisposition: `attachment; filename="aram-${name}"` });
  return url;
}
