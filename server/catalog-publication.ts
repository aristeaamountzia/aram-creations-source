import { createHash } from 'node:crypto';
import { FieldValue, Timestamp, GeoPoint, type Firestore } from 'firebase-admin/firestore';
import { projectionPath, wire, type CatalogOperation } from '../src/lib/catalog-wire';
import { notesSourceHash, projectProduct, projectSettings, publicMediaCandidates, visible } from './public-projection';
import { adminDatabase } from './admin-database';
import { testModeEnabled } from './test-isolation';

export class CatalogError extends Error { constructor(message: string, public status = 400, public code = 'CATALOG_INVALID') { super(message); } }
export function requirePrivacyRuntime() {
  if (!testModeEnabled() && process.env.ARAM_PRIVACY_RELEASE_ENABLED !== '1') throw new CatalogError('Η μετάβαση δημόσιων δεδομένων δεν έχει ενεργοποιηθεί.', 503);
}
const hash = (value: any) => createHash('sha256').update(JSON.stringify(wire(value))).digest('hex');
const validPath = (path: string) => /^(?:jewelry|portfolio)\/[A-Za-z0-9_-]{1,128}$/.test(path) || path === 'settings/shop' || /^catalogHistory\/[A-Za-z0-9_-]{1,128}(?:\/parts\/\d+)?$/.test(path);
const transformMarker = Symbol('catalog-transform');
function decode(value: any, db: Firestore, transforms = true): any {
  if (!Array.isArray(value)) throw new CatalogError('Μη έγκυρος τύπος δεδομένων.');
  switch (value[0]) {
    case 'value': return value[1];
    case 'undefined': return undefined;
    case 'date': return new Date(value[1]);
    case 'timestamp': return new Timestamp(value[1], value[2]);
    case 'geo': return new GeoPoint(value[1], value[2]);
    case 'bytes': return typeof value[1] === 'string' ? Buffer.from(value[1], 'base64') : Buffer.from(value[1]);
    case 'reference': if (!validPath(value[1])) throw new CatalogError('Μη επιτρεπόμενη αναφορά.'); return db.doc(value[1]);
    case 'array': return value[1].map((v: any) => decode(v, db, transforms));
    case 'map': return Object.fromEntries(value[1].map(([k, v]: any) => { if (k.split('.').some((part: string) => ['__proto__', 'constructor', 'prototype'].includes(part))) throw new CatalogError('Μη έγκυρο πεδίο.'); return [k, decode(v, db, transforms)]; }));
    case 'transform': {
      const operand = decode(value[2], db, transforms);
      if (!transforms) return { [transformMarker]: value[1], operand };
      switch (value[1]) {
        case 'serverTimestamp': return FieldValue.serverTimestamp();
        case 'deleteField': return FieldValue.delete();
        case 'increment': return FieldValue.increment(operand);
        case 'arrayUnion': return FieldValue.arrayUnion(...operand);
        case 'arrayRemove': return FieldValue.arrayRemove(...operand);
      }
    }
  }
  throw new CatalogError('Μη υποστηριζόμενος τύπος δεδομένων.');
}
const deleted = Symbol('delete');
function materialize(value: any, previous: any, now: Timestamp): any {
  if (value?.[transformMarker]) {
    switch (value[transformMarker]) {
      case 'serverTimestamp': return now;
      case 'deleteField': return deleted;
      case 'increment': return (typeof previous === 'number' ? previous : 0) + value.operand;
      case 'arrayUnion': return [...(Array.isArray(previous) ? previous : []), ...value.operand.filter((x: any) => !(previous || []).some((y: any) => hash(x) === hash(y)))];
      case 'arrayRemove': return (Array.isArray(previous) ? previous : []).filter((x: any) => !value.operand.some((y: any) => hash(x) === hash(y)));
    }
  }
  if (Array.isArray(value)) return value.map(v => materialize(v, undefined, now));
  if (value && value.constructor === Object) return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, materialize(v, previous?.[k], now)]).filter(([, v]) => v !== deleted));
  return value;
}
function merge(previous: any, patch: any, now: Timestamp, recursive = false) {
  const next = { ...(previous || {}) };
  for (const [key, raw] of Object.entries(patch)) {
    const parts = recursive ? [key] : key.split('.'); let parent = next;
    for (const part of parts.slice(0, -1)) parent = parent[part] = { ...(parent[part] || {}) };
    const last = parts.at(-1)!;
    const isMap = raw && typeof raw === 'object' && raw.constructor === Object && !(raw as any)[transformMarker];
    const value = recursive && isMap ? merge(parent[last], raw, now, true) : materialize(raw, parent[last], now);
    if (value === deleted) delete parent[last]; else parent[last] = value;
  }
  return next;
}
function candidate(previous: any, op: CatalogOperation, db: Firestore, now: Timestamp) {
  if (op.method === 'delete') return undefined;
  if (op.method === 'sync') return previous;
  if (op.method === 'update' && !previous) throw new CatalogError('Η καταχώρηση δεν υπάρχει.', 409, 'CATALOG_CONFLICT');
  const patch = decode(op.data, db, false);
  if (op.mergeFields) throw new CatalogError('Explicit mergeFields is not used by this application.');
  return merge(op.method === 'set' && !op.merge ? {} : previous, patch, now, op.method === 'set');
}

export function ownedMediaPath(raw: string, bucketName: string): string | null {
  if (raw.startsWith(`gs://${bucketName}/`)) return raw.slice(`gs://${bucketName}/`.length);
  try {
    const url = new URL(raw);
    const allowedHost = url.hostname === 'firebasestorage.googleapis.com' || (testModeEnabled() && ['127.0.0.1', 'localhost'].includes(url.hostname));
    const match = url.pathname.match(/^\/v0\/b\/([^/]+)\/o\/(.+)$/);
    if (allowedHost && match && decodeURIComponent(match[1]) === bucketName) return decodeURIComponent(match[2]);
  } catch { /* External/relative assets are checked separately. */ }
  return null;
}
export async function preparePublicMedia(path: string, data: any, bucket: ReturnType<typeof adminDatabase>['bucket'], publicationId: string) {
  const prefix = `publicMedia/${path}/`, desired = new Set<string>(), media: { url: string; type: string }[] = [];
  const settings = path === 'settings/shop';
  const candidates = data && (settings || visible(data)) ? settings ? ['heroVideoUrl', 'portfolioHeroVideoUrl'].filter(k => data[k]).map(k => ({ key: k, url: data[k], type: 'video' })) : publicMediaCandidates(data) : [];
  for (const item of candidates) {
    const sourcePath = ownedMediaPath(item.url, bucket.name);
    if (sourcePath) {
      const source = bucket.file(sourcePath), [metadata] = await source.getMetadata();
      if (!/^(image|video)\//.test(metadata.contentType || '') || Number(metadata.size) > 30 * 1024 * 1024) throw new CatalogError('Μη υποστηριζόμενο δημόσιο αρχείο.');
      const destination = `${prefix}${publicationId}-${createHash('sha256').update(`${sourcePath}:${metadata.generation}:${metadata.md5Hash || ''}`).digest('hex')}`;
      desired.add(destination);
      if (!(await bucket.file(destination).exists())[0]) {
        const [bytes] = await source.download();
        await bucket.file(destination).save(bytes, { resumable: false, metadata: { contentType: metadata.contentType, metadata: {} } });
      }
      // Derivatives stay private in Storage. The public reader checks the
      // current committed projection before serving bytes (including ranges).
      const url = `/api/public-media?asset=${encodeURIComponent(destination)}`;
      media.push({ ...item, url });
    } else if (/^https:\/\//i.test(item.url) && !/firebasestorage|storage\.googleapis/i.test(item.url)) {
      // External public URLs remain external. A hidden URL is never fetched/published.
      media.push(item);
    } else if (/^\/(?!\/)/.test(item.url) && !/private|original/i.test(item.url)) media.push(item);
    else throw new CatalogError('Το αρχείο χρειάζεται έλεγχο πριν δημοσιευθεί.');
  }
  // Revoke source tokens, including hidden/fallback/original references, only
  // after public derivatives are ready. Runtime is explicitly gated.
  const raw = data ? [...(data.mediaList || []).flatMap((m: any) => [m.url, m.originalUrl]), ...(data.images || []), ...['imageUrl', 'src', 'image', 'videoUrl', 'heroVideoUrl', 'portfolioHeroVideoUrl'].map(k => data[k])] : [];
  for (const object of new Set(raw.filter(v => typeof v === 'string').map(v => ownedMediaPath(v, bucket.name)).filter(Boolean))) {
    if (String(object).startsWith('publicMedia/')) continue;
    const file = bucket.file(String(object)); const [metadata] = await file.getMetadata();
    if (metadata.metadata?.firebaseStorageDownloadTokens) {
      if (testModeEnabled()) {
        // The emulator tracks tokens separately from GCS custom metadata.
        // This owner bypass exists only on the validated loopback emulator.
        for (const token of String(metadata.metadata.firebaseStorageDownloadTokens).split(',')) {
          const response = await fetch(`http://${process.env.FIREBASE_STORAGE_EMULATOR_HOST}/v0/b/${bucket.name}/o/${encodeURIComponent(String(object))}?delete_token=${encodeURIComponent(token)}`, { method: 'POST', headers: { authorization: 'Bearer owner' } });
          if (!response.ok) throw new CatalogError('Δεν ολοκληρώθηκε η ανάκληση δοκιμαστικού token.', 503);
        }
      } else {
        await file.setMetadata({ metadata: { ...metadata.metadata, firebaseStorageDownloadTokens: null } });
      }
    }
  }
  return settings ? Object.fromEntries(media.map((m: any) => [m.key, m.url])) : media;
}

export async function commitCatalog(request: any, user: { uid: string }, services = adminDatabase(), beforeCommit: () => Promise<void> = async () => {}) {
  requirePrivacyRuntime();
  const { db, bucket } = services;
  if (!/^[a-f0-9-]{36}$/.test(request.requestId || '') || !Array.isArray(request.operations) || request.operations.length > 500 || !Array.isArray(request.reads || [])) throw new CatalogError('Μη έγκυρη συναλλαγή.');
  const operations: CatalogOperation[] = request.operations;
  if (operations.some(op => !validPath(op.path) || !['set', 'update', 'delete', 'sync'].includes(op.method)) || (request.reads || []).some((r: any) => !validPath(r.path))) throw new CatalogError('Μη επιτρεπόμενη καταχώρηση.');
  if (new Set(operations.map(op => op.path)).size !== operations.length) throw new CatalogError('Πολλαπλές αλλαγές στο ίδιο έγγραφο δεν επιτρέπονται.');
  const receipt = db.doc(`catalogOperations/${request.requestId}`), fingerprint = hash({ request, uid: user.uid });
  const previous = await receipt.get();
  if (previous.exists) { if (previous.data()!.fingerprint !== fingerprint) throw new CatalogError('Το αίτημα άλλαξε.', 409); return { ok: true, replay: true }; }
  const paths = [...new Set([...operations.map(o => o.path), ...(request.reads || []).map((r: any) => r.path)])];
  const snapshots = paths.length ? await db.getAll(...paths.map(p => db.doc(p))) : [];
  const initial = new Map(snapshots.map(s => [s.ref.path, s.exists ? s.data() : undefined]));
  const oldAssets: string[] = [];
  for (const op of operations) {
    const pub = projectionPath(op.path); if (!pub) continue;
    const data = (await db.doc(pub).get()).data();
    for (const url of [...(data?.mediaList || []).map((m: any) => m.url), data?.heroVideoUrl, data?.portfolioHeroVideoUrl]) {
      if (typeof url === 'string' && url.startsWith('/api/public-media?asset=')) oldAssets.push(new URL(url, 'http://localhost').searchParams.get('asset')!);
    }
  }
  const now = Timestamp.now(), plans: { op: CatalogOperation; next: any; projection: any }[] = [];
  for (const op of operations) {
    const next = candidate(initial.get(op.path), op, db, now);
    if (next?.notesReview && (op.method === 'set' || op.method === 'update')) {
      const patch = decode(op.data, db, false);
      if (patch.notesReview) next.notesReview = { ...next.notesReview, reviewedBy: user.uid, sourceHash: notesSourceHash(next) };
    }
    const publicPath = projectionPath(op.path);
    const media = publicPath ? await preparePublicMedia(op.path, next, bucket, request.requestId) : [];
    plans.push({ op, next, projection: op.path === 'settings/shop' ? projectSettings(next, media as Record<string, string>) : projectProduct(next, media as any[], op.path.startsWith('portfolio/')) });
  }
  await beforeCommit();
  await db.runTransaction(async tx => {
    const replay = await tx.get(receipt);
    if (replay.exists) { if (replay.data()!.fingerprint !== fingerprint) throw new CatalogError('Το αίτημα άλλαξε.', 409); return; }
    const latest = paths.length ? await tx.getAll(...paths.map(p => db.doc(p))) : [];
    for (const snap of latest) if (hash(snap.exists ? snap.data() : undefined) !== hash(initial.get(snap.ref.path))) throw new CatalogError('Η καταχώρηση άλλαξε. Δοκίμασε ξανά.', 409, 'CATALOG_CONFLICT');
    for (const read of request.reads || []) {
      const current = initial.get(read.path);
      if ((current !== undefined) !== read.exists || JSON.stringify(wire(current)) !== JSON.stringify(read.data)) throw new CatalogError('Η καταχώρηση άλλαξε. Δοκίμασε ξανά.', 409, 'CATALOG_CONFLICT');
    }
    for (const plan of plans) {
      const ref = db.doc(plan.op.path);
      if (plan.op.method === 'delete') tx.delete(ref);
      else if (plan.op.method !== 'sync') tx.set(ref, plan.next);
      const publicPath = projectionPath(plan.op.path);
      if (publicPath) { if (plan.projection) tx.set(db.doc(publicPath), plan.projection); else tx.delete(db.doc(publicPath)); }
    }
    tx.create(receipt, { fingerprint, at: new Date().toISOString(), by: user.uid, paths: operations.map(o => o.path) });
    if (oldAssets.length) tx.set(db.doc(`catalogMediaCleanup/${request.requestId}`), { assets: [...new Set(oldAssets)], state: 'pending' });
  });
  await cleanupMedia(services).catch(() => {});
  return { ok: true, replay: false };
}
export async function cleanupMedia(services = adminDatabase()) {
  requirePrivacyRuntime();
  const jobs = await services.db.collection('catalogMediaCleanup').where('state', '==', 'pending').limit(50).get();
  for (const job of jobs.docs) {
    for (const asset of job.data().assets || []) {
      if (!/^publicMedia\/(jewelry|portfolio|settings)\//.test(asset)) throw new CatalogError('Invalid cleanup path.');
      await services.bucket.file(asset).delete({ ignoreNotFound: true });
    }
    await job.ref.update({ state: 'done' });
  }
}
export async function reconcileCatalog(services = adminDatabase()) {
  requirePrivacyRuntime();
  const paths = new Set<string>(['settings/shop']);
  for (const [source, publicName] of [['jewelry', 'publicCatalog'], ['portfolio', 'publicPortfolio']]) {
    for (const name of [source, publicName]) { const rows = await services.db.collection(name).get(); rows.docs.forEach(d => paths.add(`${source}/${d.id}`)); }
  }
  const errors: string[] = [];
  for (const path of paths) { try { await commitCatalog({ requestId: crypto.randomUUID(), operations: [{ method: 'sync', path }], reads: [] }, { uid: 'catalog-reconcile' }, services); } catch { errors.push(path); } }
  await cleanupMedia(services).catch(() => errors.push('media-cleanup'));
  return { checked: paths.size, errors };
}
