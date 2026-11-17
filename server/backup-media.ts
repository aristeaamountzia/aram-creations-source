import { createHash, randomUUID } from 'node:crypto';
import { Readable, Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { mediaLocation } from './media-path';
import type { ArchivedMedia } from './backup-format';

export const MEDIA_BACKUP_PREFIX = 'backups/media/';
const digest = (value: string) => createHash('sha256').update(value).digest('hex');
const isMissing = (error: any) => error?.code === 404;
// These two video URLs already exist in the bundled Portfolio seed.
const legacySeedVideos = new Set([
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4'
]);
function backupMediaLocation(url: string) {
  return legacySeedVideos.has(url) ? { bucket: '', object: '', external: url } : mediaLocation(url);
}
export async function existingMetadata(file: any) {
  try { return (await file.getMetadata())[0]; }
  catch (error) { if (isMissing(error)) return null; throw error; }
}

export function collectBackupMedia(values: any[]) {
  const urls = new Set<string>();
  const mediaFields = new Set(['image', 'imageUrl', 'images', 'videoUrl', 'originalUrl', 'heroVideoUrl', 'portfolioHeroVideoUrl', 'mediaList', 'shopMedia', 'privateMedia', 'restoreBackup']);
  const visit = (value: any, mediaContext = false) => {
    if (typeof value === 'string') {
      if (mediaContext && value.startsWith('blob:')) urls.add(value);
      if (value.startsWith('jewelry/')) urls.add(`https://storage.googleapis.com/aramcreations-e1529.firebasestorage.app/${value}`);
      else if (value.startsWith('https://')) {
        try { const location = backupMediaLocation(value); if (!location.object.startsWith('backups/')) urls.add(value); }
        catch { if (mediaContext) urls.add(value); }
      }
    } else if (Array.isArray(value)) value.forEach(item => visit(item, mediaContext));
    else if (value && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype) {
      for (const [key, item] of Object.entries(value)) visit(item, mediaFields.has(key) || ((value.type === 'image' || value.type === 'video') && key === 'url'));
    }
  };
  values.forEach(value => visit(value));
  return [...urls];
}

export function assertArchive(entry: ArchivedMedia, metadata: any) {
  if (!entry.archive.startsWith(MEDIA_BACKUP_PREFIX) || !/^\d+$/.test(entry.generation) ||
      !metadata || String(metadata.generation) !== entry.generation || String(metadata.size) !== entry.size || metadata.crc32c !== entry.crc32c) {
    throw new Error(`Το αντίγραφο αρχείου λείπει ή έχει αλλάξει: ${entry.archive}`);
  }
}

/** Copies are immutable and private; source Firebase download tokens are not inherited. */
export async function archiveMedia(bucket: any, url: string, fetcher: typeof fetch = fetch): Promise<ArchivedMedia> {
  const location = backupMediaLocation(url);
  if (location.object.startsWith('backups/')) throw new Error('Ένα backup δεν μπορεί να αντιγράφει άλλο backup.');
  let destination: any, originalMetadata: any, source: any;
  const index = location.object ? bucket.file('backups/media-index/' + digest(location.bucket + '/' + location.object) + '.json') : null;
  if (location.object) {
    const sourceBucket = location.bucket === bucket.name ? bucket : bucket.storage.bucket(location.bucket);
    try { originalMetadata = (await sourceBucket.file(location.object).getMetadata())[0]; }
    catch (error) {
      if (!isMissing(error)) throw error;
      // A cleanup may have removed an original that an older completed backup already secured.
      let bytes: Buffer;
      try { [bytes] = await index.download(); }
      catch (lookupError) { if (isMissing(lookupError)) throw new Error('Το αρχικό αρχείο λείπει και δεν υπάρχει παλαιότερο αντίγραφό του.'); throw lookupError; }
      const retained: ArchivedMedia = JSON.parse(bytes.toString());
      if (retained.bucket !== location.bucket || retained.object !== location.object) throw new Error('Το ευρετήριο backup δεν συμφωνεί με το αρχικό αρχείο.');
      assertArchive(retained, (await bucket.file(retained.archive, { generation: retained.generation }).getMetadata())[0]);
      return { ...retained, urls: [url] };
    }
    source = sourceBucket.file(location.object, { generation: String(originalMetadata.generation) });
    destination = bucket.file(MEDIA_BACKUP_PREFIX + digest(`${location.bucket}/${location.object}@${originalMetadata.generation}`));
  } else destination = bucket.file(MEDIA_BACKUP_PREFIX + digest(location.external));
  let archived = await existingMetadata(destination);
  if (!archived) {
    try {
      if (source) await source.copy(destination, { contentType: originalMetadata.contentType || 'application/octet-stream', cacheControl: 'private, no-store', metadata: { firebaseStorageDownloadTokens: null, backup: 'true' }, preconditionOpts: { ifGenerationMatch: 0 } });
      else {
        const response = await fetcher(location.external, { redirect: 'error', signal: AbortSignal.timeout(45000) });
        if (!response.ok || !response.body) throw new Error(`Το αρχείο απάντησε HTTP ${response.status}.`);
        const contentType = response.headers.get('content-type')?.split(';')[0] || '';
        if (!/^(image|video)\//.test(contentType)) throw new Error(`Μη έγκυρος τύπος αρχείου: ${contentType || 'χωρίς Content-Type'}.`);
        let size = 0;
        const bounded = new Transform({ transform(chunk, _encoding, callback) {
          size += chunk.length;
          callback(size > 512 * 1024 * 1024 ? new Error('Το αρχείο υπερβαίνει τα 512 MB.') : null, chunk);
        } });
        await pipeline(Readable.fromWeb(response.body as any), bounded, destination.createWriteStream({
          resumable: false, preconditionOpts: { ifGenerationMatch: 0 },
          metadata: { contentType, cacheControl: 'private, no-store', metadata: { backup: 'true' } }
        }));
      }
    } catch (error: any) { if (error?.code !== 412) throw error; }
    archived = (await destination.getMetadata())[0];
  }
  if (!archived.crc32c || !archived.size || !archived.generation || (source && (String(archived.size) !== String(originalMetadata.size) || archived.crc32c !== originalMetadata.crc32c))) {
    throw new Error('Το μέγεθος ή το checksum του αντιγράφου δεν συμφωνεί με το αρχείο.');
  }
  if (archived.metadata?.firebaseStorageDownloadTokens) throw new Error('Το αντίγραφο αρχείου διατηρεί δημόσιο token. Δεν επιβεβαιώθηκε ως ιδιωτικό backup.');
  const result: ArchivedMedia = { urls: [url], ...(source ? { bucket: location.bucket, object: location.object, originalMetadata: {
    contentType: originalMetadata.contentType, cacheControl: originalMetadata.cacheControl || '', metadata: originalMetadata.metadata || {}
  } } : {}), archive: destination.name, generation: String(archived.generation), size: String(archived.size), crc32c: archived.crc32c, contentType: archived.contentType || 'application/octet-stream' };
  if (index) {
    const indexed = await existingMetadata(index);
    if (indexed?.metadata?.sourceGeneration !== String(originalMetadata.generation)) await index.save(JSON.stringify(result), {
      resumable: false, metadata: { contentType: 'application/json', cacheControl: 'private, no-store', metadata: { sourceGeneration: String(originalMetadata.generation) } }
    });
  }
  return result;
}

/** Restore missing originals only. Existing, different files are never overwritten. */
export async function restoreArchivedMedia(bucket: any, entry: ArchivedMedia, apply: boolean) {
  const archived = bucket.file(entry.archive, { generation: entry.generation });
  assertArchive(entry, (await archived.getMetadata())[0]);
  if (entry.object && (!['aramcreations-e1529.firebasestorage.app', 'aramcreations-e1529.appspot.com'].includes(entry.bucket!) || entry.object.startsWith('backups/'))) throw new Error('Μη επιτρεπτός προορισμός media.');
  const targetBucket = entry.bucket && entry.bucket !== bucket.name ? bucket.storage.bucket(entry.bucket) : bucket;
  const targetName = entry.object || `jewelry/recovered/${digest(entry.archive + '@' + entry.generation)}`;
  const target = targetBucket.file(targetName), current = await existingMetadata(target);
  if (current && (String(current.size) !== entry.size || current.crc32c !== entry.crc32c)) throw new Error(`Υπάρχει διαφορετικό αρχείο: ${targetName}`);
  if (entry.object) {
    if (apply && !current) await archived.copy(target, { contentType: entry.contentType, cacheControl: entry.originalMetadata?.cacheControl || '', metadata: entry.originalMetadata?.metadata || {}, preconditionOpts: { ifGenerationMatch: 0 } });
    return { needed: !current, replacements: entry.urls.map(url => [url, url] as const) };
  }
  let token = current?.metadata?.firebaseStorageDownloadTokens || randomUUID();
  if (apply && !current) await archived.copy(target, { contentType: entry.contentType, metadata: { firebaseStorageDownloadTokens: token }, preconditionOpts: { ifGenerationMatch: 0 } });
  const url = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(targetName)}?alt=media&token=${token}`;
  return { needed: !current, replacements: entry.urls.map(original => [original, url] as const) };
}
