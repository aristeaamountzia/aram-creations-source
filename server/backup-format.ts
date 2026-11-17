import { Timestamp, GeoPoint, DocumentReference } from 'firebase-admin/firestore';

export const BACKUP_COLLECTIONS = ['jewelry', 'portfolio', 'settings', 'orders', 'orderNotifications', 'catalogHistory'] as const;
export interface BackupRow { path: string; value: any }
export interface ArchivedMedia {
  urls: string[]; bucket?: string; object?: string; originalMetadata?: Record<string, any>;
  archive: string; generation: string; size: string; crc32c: string; contentType: string;
}
export interface FullBackup {
  format: 'aram-catalog-v2'; project: string; createdAt: string; mediaIncluded: boolean;
  documents: BackupRow[]; seedPortfolio: any[]; media: ArchivedMedia[];
  missingMedia: Array<{ url: string; error: string }>;
}

// Every map is tagged, so a user field that resembles a type marker cannot collide.
export function encodeBackupValue(value: any): any {
  if (value instanceof Timestamp) return { type: 'timestamp', seconds: value.seconds, nanoseconds: value.nanoseconds };
  if (value instanceof GeoPoint) return { type: 'geopoint', latitude: value.latitude, longitude: value.longitude };
  if (value instanceof DocumentReference) return { type: 'reference', path: value.path };
  if (value instanceof Date) return { type: 'date', value: value.toISOString() };
  if (Buffer.isBuffer(value) || value instanceof Uint8Array) return { type: 'bytes', value: Buffer.from(value).toString('base64') };
  if (Array.isArray(value)) return { type: 'array', value: value.map(encodeBackupValue) };
  if (typeof value === 'number' && !Number.isFinite(value)) return { type: 'number', value: String(value) };
  if (value && typeof value === 'object') return { type: 'map', value: Object.entries(value).map(([key, item]) => [key, encodeBackupValue(item)]) };
  return { type: 'scalar', value };
}

export function decodeBackupValue(node: any, db: { doc(path: string): any }): any {
  switch (node?.type) {
    case 'timestamp': return new Timestamp(node.seconds, node.nanoseconds);
    case 'geopoint': return new GeoPoint(node.latitude, node.longitude);
    case 'reference': return db.doc(node.path);
    case 'date': return new Date(node.value);
    case 'bytes': return Buffer.from(node.value, 'base64');
    case 'array': return node.value.map(item => decodeBackupValue(item, db));
    case 'map': return Object.fromEntries(node.value.map(([key, value]) => [key, decodeBackupValue(value, db)]));
    case 'number': return Number(node.value);
    case 'scalar': return node.value;
    default: throw new Error('Άγνωστη κωδικοποίηση δεδομένων backup.');
  }
}

export function assertBackupPath(path: string) {
  const parts = String(path).split('/');
  if (!(BACKUP_COLLECTIONS as readonly string[]).includes(parts[0]) || !parts[1] ||
      !(parts.length === 2 || (parts[0] === 'catalogHistory' && parts.length === 4 && parts[2] === 'parts' && /^\d+$/.test(parts[3])))) {
    throw new Error(`Μη επιτρεπτή εγγραφή backup: ${path}`);
  }
}

/** Include chunked before/after history when locating original and private media. */
export function historyPayloads(rows: Array<{ path: string; data: any }>) {
  const groups = new Map<string, Array<{ index: number; text: string }>>();
  for (const row of rows) if (/^catalogHistory\/[^/]+\/parts\/\d+$/.test(row.path)) {
    const parent = row.path.split('/').slice(0, 2).join('/');
    if (!groups.has(parent)) groups.set(parent, []);
    groups.get(parent)!.push({ index: Number(row.path.split('/').at(-1)), text: row.data.text });
  }
  return [...groups].map(([path, parts]) => {
    parts.sort((a, b) => a.index - b.index);
    if (parts.some((part, index) => part.index !== index || typeof part.text !== 'string')) throw new Error(`Ελλιπές ιστορικό: ${path}`);
    try { return JSON.parse(parts.map(part => part.text).join('')); }
    catch { throw new Error(`Μη αναγνώσιμο ιστορικό: ${path}`); }
  });
}

export function replaceBackupUrls(value: any, replacements: Map<string, string>): any {
  if (typeof value === 'string') {
    if (replacements.has(value)) return replacements.get(value);
    return value;
  }
  if (Array.isArray(value)) return value.map(item => replaceBackupUrls(item, replacements));
  if (value && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype) {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, replaceBackupUrls(item, replacements)]));
  }
  return value;
}

/** Rechunk history after URL replacement; a replacement may cross an old chunk boundary. */
export function restoredDocuments(backup: FullBackup, db: { doc(path: string): any }, replacements = new Map<string, string>()) {
  const seen = new Set<string>();
  const rows = backup.documents.map(row => {
    assertBackupPath(row.path);
    if (seen.has(row.path)) throw new Error(`Διπλή εγγραφή backup: ${row.path}`);
    seen.add(row.path);
    return { path: row.path, data: decodeBackupValue(row.value, db) };
  });
  const groups = new Map<string, Array<{ path: string; data: any }>>();
  for (const row of rows) if (/\/parts\/\d+$/.test(row.path)) {
    const parent = row.path.split('/').slice(0, 2).join('/');
    if (!groups.has(parent)) groups.set(parent, []);
    groups.get(parent)!.push(row);
  }
  const result = rows.filter(row => !/\/parts\/\d+$/.test(row.path)).map(row => ({ ...row, data: replaceBackupUrls(row.data, replacements) }));
  for (const [parent, parts] of groups) {
    const payload = historyPayloads(parts)[0];
    const text = JSON.stringify(replaceBackupUrls(payload, replacements));
    const chunks = Array.from({ length: Math.ceil(text.length / 100000) }, (_, i) => text.slice(i * 100000, (i + 1) * 100000));
    const summary = result.find(row => row.path === parent);
    if (!summary || parts.length !== summary.data.parts) throw new Error(`Ελλιπές ιστορικό: ${parent}`);
    summary.data.parts = chunks.length;
    chunks.forEach((text, index) => result.push({ path: `${parent}/parts/${index}`, data: { text } }));
  }
  for (const row of result) if (row.path.startsWith('catalogHistory/') && row.path.split('/').length === 2 && row.data.parts && !groups.has(row.path)) throw new Error(`Λείπουν τα τμήματα ιστορικού: ${row.path}`);
  // Preserve the seed version as well as its remote overrides and deletion tombstones.
  for (const encoded of backup.seedPortfolio || []) {
    const seed = replaceBackupUrls(decodeBackupValue(encoded, db), replacements);
    if (typeof seed.id !== 'string' || !seed.id || seed.id.includes('/')) throw new Error('Μη έγκυρο αρχικό έργο στο backup.');
    const path = `portfolio/${seed.id}`; assertBackupPath(path);
    const override = result.find(row => row.path === path);
    if (override) override.data = { ...seed, ...override.data };
    else result.push({ path, data: seed });
  }
  return result;
}
