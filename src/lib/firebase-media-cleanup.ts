export interface StorageFileEntry {
  fullPath: string;
  name: string;
  size: number;
  md5Hash?: string;
  contentType?: string;
  timeCreated?: string;
  downloadUrl?: string;
}

export interface MediaListEntry {
  url: string;
  type?: 'image' | 'video';
  cropData?: unknown;
  originalUrl?: string;
  [key: string]: unknown;
}

export interface FirestoreMediaDoc {
  id: string;
  collection: 'jewelry' | 'portfolio' | 'settings';
  title?: string;
  vintedId?: string;
  vintedUrl?: string;
  imageUrl?: string;
  image?: string;
  src?: string;
  videoUrl?: string;
  heroVideoUrl?: string;
  portfolioHeroVideoUrl?: string;
  images?: string[];
  mediaList?: MediaListEntry[];
  raw: Record<string, unknown>;
}

export interface DuplicateStorageGroup {
  signature: string;
  reason: 'md5' | 'basename-size' | 'vinted-photo-slot';
  canonical: StorageFileEntry;
  duplicates: StorageFileEntry[];
  reclaimableBytes: number;
}

export interface DocumentUpdatePlan {
  id: string;
  collection: 'jewelry' | 'portfolio' | 'settings';
  title: string;
  changesSummary: string[];
  beforeSnapshot: Record<string, unknown>;
  patch: Record<string, unknown>;
}

export interface DuplicateVintedListingGroup {
  vintedKey: string;
  title: string;
  keepDoc: FirestoreMediaDoc;
  duplicateDocs: FirestoreMediaDoc[];
}

export interface FirebaseMediaCleanupPlan {
  totalStorageFiles: number;
  totalStorageBytes: number;
  referencedPaths: Set<string>;
  protectedOriginalPaths: Set<string>;
  historyProtectedFiles: StorageFileEntry[];
  historyProtectedBytes: number;
  orphanedFiles: StorageFileEntry[];
  orphanedBytes: number;
  duplicateGroups: DuplicateStorageGroup[];
  duplicateFilesToDelete: StorageFileEntry[];
  duplicateBytes: number;
  documentUpdates: DocumentUpdatePlan[];
  duplicateVintedListings: DuplicateVintedListingGroup[];
  totalFilesToDelete: StorageFileEntry[];
  totalReclaimableBytes: number;
}

const ARAM_BUCKETS = new Set([
  'aramcreations-e1529.firebasestorage.app',
  'aramcreations-e1529.appspot.com'
]);

/**
 * Extracts the Firebase Storage object path (e.g. "jewelry/portfolio/123-img.jpg")
 * from any Firebase Storage download URL, storage.googleapis.com URL, or gs:// URI.
 */
export function extractStoragePathFromUrl(url: string | undefined | null): string | null {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith('gs://')) {
    const slashIdx = trimmed.indexOf('/', 5);
    if (slashIdx === -1) return null;
    return trimmed.slice(slashIdx + 1) || null;
  }

  if (trimmed.includes('firebasestorage.googleapis.com')) {
    const match = trimmed.match(/\/o\/([^?#]+)/);
    if (match && match[1]) {
      try {
        return decodeURIComponent(match[1]);
      } catch {
        return match[1];
      }
    }
  }

  if (trimmed.includes('storage.googleapis.com')) {
    try {
      const parsed = new URL(trimmed);
      if (parsed.hostname === 'storage.googleapis.com') {
        const match = parsed.pathname.match(/^\/([^/]+)\/(.+)$/);
        if (match && ARAM_BUCKETS.has(decodeURIComponent(match[1]))) {
          return decodeURIComponent(match[2]);
        }
      }
    } catch {
      return null;
    }
  }

  return null;
}

/**
 * Recursively extracts all Firebase Storage paths from any arbitrary JSON/Firestore structure
 * (including nested objects like vintedRefreshBackup, restoreBackup, catalogHistory before/after, etc.).
 */
export function extractAllStoragePathsDeep(value: unknown, out = new Set<string>()): Set<string> {
  if (!value) return out;
  if (typeof value === 'string') {
    const p = extractStoragePathFromUrl(value);
    if (p) out.add(p);
    return out;
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      extractAllStoragePathsDeep(item, out);
    }
    return out;
  }
  if (typeof value === 'object') {
    for (const val of Object.values(value as Record<string, unknown>)) {
      extractAllStoragePathsDeep(val, out);
    }
  }
  return out;
}

/**
 * Normalizes a Firebase Storage filename by stripping leading upload timestamps
 * and random tokens generated during upload:
 * - "1793265040394-51c6w5r6efu-c3301d5f.mp4" -> "c3301d5f.mp4"
 * - "1781271193472_yc6hk6_photo.jpg" -> "photo.jpg"
 * - "1793886061597-c3301d5f.mp4" -> "c3301d5f.mp4"
 * - "1793871778935-9546772702-1.jpg" -> "9546772702-1.jpg"
 */
export function normalizeStorageBaseName(fileNameOrPath: string): string {
  const base = (fileNameOrPath.split('/').pop() || fileNameOrPath).trim();
  if (!base) return '';

  // Pattern 1: <10-14 digit timestamp>-<alphanumeric random token with at least one letter>-<rest>
  const tsRandHyphen = base.match(/^\d{10,14}-(?=[a-z0-9]*[a-z])[a-z0-9]{5,14}-(.+)$/i);
  if (tsRandHyphen && tsRandHyphen[1]) {
    return tsRandHyphen[1].toLowerCase();
  }

  // Pattern 2: <10-14 digit timestamp>_<alphanumeric random token with at least one letter>_<rest>
  const tsRandUnderscore = base.match(/^\d{10,14}_(?=[a-z0-9]*[a-z])[a-z0-9]{4,14}_(.+)$/i);
  if (tsRandUnderscore && tsRandUnderscore[1]) {
    return tsRandUnderscore[1].toLowerCase();
  }

  // Pattern 3: <10-14 digit timestamp>-<rest>
  const tsHyphen = base.match(/^\d{10,14}-(.+)$/);
  if (tsHyphen && tsHyphen[1]) {
    return tsHyphen[1].toLowerCase();
  }

  // Pattern 4: <10-14 digit timestamp>_<rest>
  const tsUnderscore = base.match(/^\d{10,14}_(.+)$/);
  if (tsUnderscore && tsUnderscore[1]) {
    return tsUnderscore[1].toLowerCase();
  }

  return base.toLowerCase();
}

/**
 * Extracts Vinted ID from vintedId or vintedUrl field.
 */
export function extractVintedIdFromDoc(doc: Pick<FirestoreMediaDoc, 'vintedId' | 'vintedUrl' | 'raw'>): string | null {
  if (typeof doc.vintedId === 'string' && doc.vintedId.trim()) {
    return doc.vintedId.trim();
  }
  const url = typeof doc.vintedUrl === 'string' ? doc.vintedUrl.trim() : '';
  if (url) {
    const match = url.match(/\/items\/(\d+)/);
    if (match && match[1]) return match[1];
  }
  return null;
}

/**
 * Collects all Storage object paths referenced anywhere in a Firestore document
 * (both explicit media fields and any nested backup/originalUrl fields in doc.raw).
 */
export function collectDocStoragePaths(doc: FirestoreMediaDoc): Set<string> {
  const paths = new Set<string>();
  const addUrl = (u: unknown) => {
    if (typeof u !== 'string') return;
    const p = extractStoragePathFromUrl(u);
    if (p) paths.add(p);
  };

  addUrl(doc.imageUrl);
  addUrl(doc.image);
  addUrl(doc.src);
  addUrl(doc.videoUrl);
  addUrl(doc.heroVideoUrl);
  addUrl(doc.portfolioHeroVideoUrl);

  if (Array.isArray(doc.images)) {
    doc.images.forEach(addUrl);
  }
  if (Array.isArray(doc.mediaList)) {
    doc.mediaList.forEach(entry => {
      if (entry && typeof entry === 'object') {
        addUrl(entry.url);
        addUrl(entry.originalUrl);
      }
    });
  }

  // Also walk doc.raw deeply so vintedRefreshBackup, restoreBackup, etc. are always respected
  if (doc.raw && typeof doc.raw === 'object') {
    extractAllStoragePathsDeep(doc.raw, paths);
  }

  return paths;
}

/**
 * Collects a map of storagePath -> known download URL from all Firestore documents,
 * so canonical files already referenced in Firestore keep their exact download URL.
 */
export function collectKnownUrlByPath(docs: FirestoreMediaDoc[]): Map<string, string> {
  const map = new Map<string, string>();
  const recordUrl = (u: unknown) => {
    if (typeof u !== 'string') return;
    const trimmed = u.trim();
    const p = extractStoragePathFromUrl(trimmed);
    if (p && !map.has(p)) {
      map.set(p, trimmed);
    }
  };

  const walk = (val: unknown) => {
    if (!val) return;
    if (typeof val === 'string') {
      recordUrl(val);
      return;
    }
    if (Array.isArray(val)) {
      val.forEach(walk);
      return;
    }
    if (typeof val === 'object') {
      for (const v of Object.values(val as Record<string, unknown>)) {
        walk(v);
      }
    }
  };

  for (const doc of docs) {
    recordUrl(doc.imageUrl);
    recordUrl(doc.image);
    recordUrl(doc.src);
    recordUrl(doc.videoUrl);
    recordUrl(doc.heroVideoUrl);
    recordUrl(doc.portfolioHeroVideoUrl);
    if (Array.isArray(doc.images)) {
      doc.images.forEach(recordUrl);
    }
    if (Array.isArray(doc.mediaList)) {
      doc.mediaList.forEach(entry => {
        if (entry && typeof entry === 'object') {
          recordUrl(entry.url);
          recordUrl(entry.originalUrl);
        }
      });
    }
    if (doc.raw) {
      walk(doc.raw);
    }
  }

  return map;
}

/**
 * Normalizes a URL for deduplication within a single document's images/mediaList array.
 * If it is a Firebase Storage URL, uses its Storage path; otherwise uses the trimmed URL.
 */
function getUrlIdentityKey(url: string): string {
  const storagePath = extractStoragePathFromUrl(url);
  if (storagePath) return `storage:${storagePath}`;
  return `url:${url.trim()}`;
}

/**
 * Computes a comprehensive, safe cleanup and deduplication plan across Firebase Storage and Firestore.
 */
export function buildFirebaseMediaCleanupPlan(
  storageFiles: StorageFileEntry[],
  docs: FirestoreMediaDoc[],
  options?: {
    includeDuplicateVintedDocIdsToDelete?: Set<string>;
    protectedHistoryPaths?: Set<string>;
    protectHistoryFiles?: boolean;
  }
): FirebaseMediaCleanupPlan {
  const deletedDocIds = options?.includeDuplicateVintedDocIdsToDelete ?? new Set<string>();
  const protectedHistoryPaths = options?.protectedHistoryPaths ?? new Set<string>();
  const protectHistoryFiles = options?.protectHistoryFiles !== false;

  // 1. Identify duplicate Vinted listings in 'jewelry' collection
  const vintedMap = new Map<string, FirestoreMediaDoc[]>();
  for (const doc of docs) {
    if (doc.collection !== 'jewelry') continue;
    const vintedId = extractVintedIdFromDoc(doc);
    if (!vintedId) continue;
    const list = vintedMap.get(vintedId) || [];
    list.push(doc);
    vintedMap.set(vintedId, list);
  }

  const duplicateVintedListings: DuplicateVintedListingGroup[] = [];
  for (const [vintedKey, group] of vintedMap.entries()) {
    if (group.length <= 1) continue;
    const sorted = [...group].sort((a, b) => {
      const aMediaCount = (a.mediaList?.length || 0) + (a.images?.length || 0);
      const bMediaCount = (b.mediaList?.length || 0) + (b.images?.length || 0);
      if (bMediaCount !== aMediaCount) return bMediaCount - aMediaCount;
      return a.id.localeCompare(b.id);
    });
    duplicateVintedListings.push({
      vintedKey,
      title: sorted[0].title || `Vinted #${vintedKey}`,
      keepDoc: sorted[0],
      duplicateDocs: sorted.slice(1)
    });
  }

  // Active docs (excluding any duplicate Vinted docs the admin explicitly opted to delete)
  const activeDocs = docs.filter(d => !deletedDocIds.has(d.id));

  // 2. Collect all currently referenced Storage paths across active docs + track Image Editor originalUrl paths
  const referencedPaths = new Set<string>();
  const protectedOriginalPaths = new Set<string>();

  for (const doc of activeDocs) {
    for (const p of collectDocStoragePaths(doc)) {
      referencedPaths.add(p);
      if (p.startsWith('jewelry/originals/')) {
        protectedOriginalPaths.add(p);
      }
    }
    if (Array.isArray(doc.mediaList)) {
      for (const m of doc.mediaList) {
        const origPath = extractStoragePathFromUrl(m?.originalUrl);
        if (origPath) protectedOriginalPaths.add(origPath);
      }
    }
  }

  const knownUrlByPath = collectKnownUrlByPath(docs);

  // 3. Group Storage files into duplicate clusters by content hash (md5Hash) or normalized (baseName + size)
  const parentOf = new Map<string, string>();
  const fileByPath = new Map<string, StorageFileEntry>();
  for (const f of storageFiles) {
    parentOf.set(f.fullPath, f.fullPath);
    fileByPath.set(f.fullPath, f);
  }

  const findRoot = (x: string): string => {
    let curr = x;
    while (parentOf.get(curr) !== curr) {
      const next = parentOf.get(curr)!;
      parentOf.set(curr, parentOf.get(next) || next);
      curr = next;
    }
    return curr;
  };

  const unionPaths = (a: string, b: string) => {
    const ra = findRoot(a);
    const rb = findRoot(b);
    if (ra !== rb) {
      parentOf.set(rb, ra);
    }
  };

  const groupReasonByRoot = new Map<string, 'md5' | 'basename-size' | 'vinted-photo-slot'>();

  // Pass A: Exact MD5 Hash + Size match (100% byte-for-byte identical files)
  const byMd5 = new Map<string, StorageFileEntry[]>();
  for (const file of storageFiles) {
    if (file.md5Hash && file.size > 0) {
      const key = `${file.md5Hash}:${file.size}`;
      const list = byMd5.get(key) || [];
      list.push(file);
      byMd5.set(key, list);
    }
  }
  for (const list of byMd5.values()) {
    if (list.length > 1) {
      for (let i = 1; i < list.length; i++) {
        unionPaths(list[0].fullPath, list[i].fullPath);
      }
      groupReasonByRoot.set(findRoot(list[0].fullPath), 'md5');
    }
  }

  // Pass B: Normalized Base Filename + Exact Size match (when > 0 bytes)
  const byBaseAndSize = new Map<string, StorageFileEntry[]>();
  for (const file of storageFiles) {
    const normBase = normalizeStorageBaseName(file.name || file.fullPath);
    if (normBase && file.size > 0) {
      const key = `${normBase}:${file.size}`;
      const list = byBaseAndSize.get(key) || [];
      list.push(file);
      byBaseAndSize.set(key, list);
    }
  }
  for (const list of byBaseAndSize.values()) {
    if (list.length > 1) {
      const first = list[0];
      for (let i = 1; i < list.length; i++) {
        const candidate = list[i];
        const md5Conflict =
          first.md5Hash && candidate.md5Hash && first.md5Hash !== candidate.md5Hash;
        if (!md5Conflict) {
          unionPaths(first.fullPath, candidate.fullPath);
          const root = findRoot(first.fullPath);
          if (!groupReasonByRoot.has(root)) {
            groupReasonByRoot.set(root, 'basename-size');
          }
        }
      }
    }
  }

  // Collect clusters
  const clusters = new Map<string, StorageFileEntry[]>();
  for (const file of storageFiles) {
    const root = findRoot(file.fullPath);
    const list = clusters.get(root) || [];
    list.push(file);
    clusters.set(root, list);
  }

  const duplicateGroups: DuplicateStorageGroup[] = [];
  const canonicalPathByDuplicatePath = new Map<string, string>();
  const duplicateFilesSet = new Set<string>();

  for (const [root, members] of clusters.entries()) {
    if (members.length <= 1) continue;

    // Sort to pick the best canonical file:
    // 1. Prefer files that are referenced in active Firestore docs AND have a known URL or downloadUrl
    // 2. Prefer files referenced in active Firestore docs
    // 3. Prefer files with earliest timeCreated (original upload)
    // 4. Deterministic tie-breaker by fullPath
    const sorted = [...members].sort((a, b) => {
      const aRef = referencedPaths.has(a.fullPath) ? 1 : 0;
      const bRef = referencedPaths.has(b.fullPath) ? 1 : 0;
      if (bRef !== aRef) return bRef - aRef;

      const aHasUrl = knownUrlByPath.has(a.fullPath) || Boolean(a.downloadUrl) ? 1 : 0;
      const bHasUrl = knownUrlByPath.has(b.fullPath) || Boolean(b.downloadUrl) ? 1 : 0;
      if (bHasUrl !== aHasUrl) return bHasUrl - aHasUrl;

      if (a.timeCreated && b.timeCreated && a.timeCreated !== b.timeCreated) {
        return a.timeCreated.localeCompare(b.timeCreated);
      }
      return a.fullPath.localeCompare(b.fullPath);
    });

    const canonical = sorted[0];
    const duplicates = sorted.slice(1);

    const canonicalUrl = canonical.downloadUrl || knownUrlByPath.get(canonical.fullPath);
    const safeDuplicates: StorageFileEntry[] = [];

    for (const dup of duplicates) {
      if (protectHistoryFiles && protectedHistoryPaths.has(dup.fullPath)) continue;
      const isReferenced = referencedPaths.has(dup.fullPath);
      if (isReferenced && !canonicalUrl) {
        continue;
      }
      safeDuplicates.push(dup);
      canonicalPathByDuplicatePath.set(dup.fullPath, canonical.fullPath);
      duplicateFilesSet.add(dup.fullPath);
    }

    if (safeDuplicates.length > 0) {
      const reclaimableBytes = safeDuplicates.reduce((acc, f) => acc + (f.size || 0), 0);
      duplicateGroups.push({
        signature: normalizeStorageBaseName(canonical.name || canonical.fullPath) || canonical.fullPath,
        reason: groupReasonByRoot.get(root) || 'md5',
        canonical,
        duplicates: safeDuplicates,
        reclaimableBytes
      });
    }
  }

  // 4. Identify orphaned Storage files vs History-protected files (Undo / Redo / Ιστορικό / Drafts)
  const canonicalTargetsOfReferencedDups = new Set<string>();
  for (const [dupPath, canonPath] of canonicalPathByDuplicatePath.entries()) {
    if (referencedPaths.has(dupPath)) {
      canonicalTargetsOfReferencedDups.add(canonPath);
    }
  }

  const orphanedFiles: StorageFileEntry[] = [];
  const historyProtectedFiles: StorageFileEntry[] = [];

  for (const file of storageFiles) {
    if (duplicateFilesSet.has(file.fullPath)) {
      continue;
    }
    const isRefInActive =
      referencedPaths.has(file.fullPath) || canonicalTargetsOfReferencedDups.has(file.fullPath);
    if (isRefInActive) {
      continue;
    }

    const isRefInHistory = protectedHistoryPaths.has(file.fullPath);
    if (isRefInHistory && protectHistoryFiles) {
      historyProtectedFiles.push(file);
    } else {
      orphanedFiles.push(file);
    }
  }

  // 5. Compute Firestore document updates (rewriting duplicate Storage URLs to canonical URLs + deduplicating images[] and mediaList[])
  const resolveCanonicalUrl = (rawUrl: string | undefined): string | undefined => {
    if (!rawUrl || typeof rawUrl !== 'string') return rawUrl;
    const storagePath = extractStoragePathFromUrl(rawUrl);
    if (!storagePath) return rawUrl;
    const canonPath = canonicalPathByDuplicatePath.get(storagePath);
    if (!canonPath) return rawUrl;
    const canonFile = fileByPath.get(canonPath);
    return canonFile?.downloadUrl || knownUrlByPath.get(canonPath) || rawUrl;
  };

  const documentUpdates: DocumentUpdatePlan[] = [];

  for (const doc of activeDocs) {
    const patch: Record<string, unknown> = {};
    const beforeSnapshot: Record<string, unknown> = {};
    const changesSummary: string[] = [];

    const scalarFields = [
      'imageUrl',
      'image',
      'src',
      'videoUrl',
      'heroVideoUrl',
      'portfolioHeroVideoUrl'
    ] as const;

    for (const field of scalarFields) {
      const currentVal = doc[field];
      if (typeof currentVal === 'string' && currentVal.trim()) {
        const nextVal = resolveCanonicalUrl(currentVal);
        if (nextVal && nextVal !== currentVal) {
          beforeSnapshot[field] = currentVal;
          patch[field] = nextVal;
          changesSummary.push(`Ενοποίηση διπλότυπου URL στο πεδίο ${field}`);
        }
      }
    }

    if (Array.isArray(doc.images) && doc.images.length > 0) {
      const seenKeys = new Set<string>();
      const nextImages: string[] = [];
      let rewrittenCount = 0;
      let removedDupCount = 0;

      for (const imgUrl of doc.images) {
        if (typeof imgUrl !== 'string' || !imgUrl.trim()) continue;
        const resolved = resolveCanonicalUrl(imgUrl) || imgUrl;
        if (resolved !== imgUrl) rewrittenCount++;

        const key = getUrlIdentityKey(resolved);
        if (seenKeys.has(key)) {
          removedDupCount++;
          continue;
        }
        seenKeys.add(key);
        nextImages.push(resolved);
      }

      const changed =
        nextImages.length !== doc.images.length ||
        nextImages.some((u, idx) => u !== doc.images![idx]);

      if (changed) {
        beforeSnapshot.images = doc.images;
        patch.images = nextImages;
        if (rewrittenCount > 0) {
          changesSummary.push(`Αντικατάσταση ${rewrittenCount} διπλότυπων URL σε images[]`);
        }
        if (removedDupCount > 0) {
          changesSummary.push(`Αφαίρεση ${removedDupCount} διπλών εγγραφών από images[]`);
        }
      }
    }

    if (Array.isArray(doc.mediaList) && doc.mediaList.length > 0) {
      const seenKeys = new Set<string>();
      const nextMediaList: MediaListEntry[] = [];
      let rewrittenCount = 0;
      let removedDupCount = 0;

      for (const entry of doc.mediaList) {
        if (!entry || typeof entry !== 'object' || typeof entry.url !== 'string' || !entry.url.trim()) {
          continue;
        }
        const resolvedUrl = resolveCanonicalUrl(entry.url) || entry.url;
        const resolvedOrig =
          typeof entry.originalUrl === 'string' && entry.originalUrl.trim()
            ? resolveCanonicalUrl(entry.originalUrl) || entry.originalUrl
            : entry.originalUrl;

        if (resolvedUrl !== entry.url || resolvedOrig !== entry.originalUrl) {
          rewrittenCount++;
        }

        const key = getUrlIdentityKey(resolvedUrl);
        if (seenKeys.has(key)) {
          removedDupCount++;
          continue;
        }
        seenKeys.add(key);

        const nextEntry: MediaListEntry = {
          ...entry,
          url: resolvedUrl
        };
        if (resolvedOrig !== undefined) {
          nextEntry.originalUrl = resolvedOrig;
        }
        nextMediaList.push(nextEntry);
      }

      const origJson = JSON.stringify(doc.mediaList);
      const nextJson = JSON.stringify(nextMediaList);

      if (origJson !== nextJson) {
        beforeSnapshot.mediaList = doc.mediaList;
        patch.mediaList = nextMediaList;
        if (rewrittenCount > 0) {
          changesSummary.push(`Αντικατάσταση ${rewrittenCount} διπλότυπων URL σε mediaList[]`);
        }
        if (removedDupCount > 0) {
          changesSummary.push(`Αφαίρεση ${removedDupCount} διπλών εγγραφών από mediaList[]`);
        }
      }
    }

    if (patch.mediaList && Array.isArray(patch.mediaList) && patch.mediaList.length > 0) {
      const firstImage = (patch.mediaList as MediaListEntry[]).find(m => m.type !== 'video');
      if (firstImage && doc.collection === 'jewelry') {
        if (typeof doc.imageUrl === 'string' && !patch.imageUrl) {
          const resolvedPrimary = resolveCanonicalUrl(doc.imageUrl);
          if (resolvedPrimary && resolvedPrimary !== doc.imageUrl) {
            beforeSnapshot.imageUrl = doc.imageUrl;
            patch.imageUrl = resolvedPrimary;
          }
        }
      }
    }

    if (Object.keys(patch).length > 0) {
      documentUpdates.push({
        id: doc.id,
        collection: doc.collection,
        title: doc.title || doc.id,
        changesSummary,
        beforeSnapshot,
        patch
      });
    }
  }

  const duplicateFilesToDelete = duplicateGroups.flatMap(g => g.duplicates);
  const duplicateBytes = duplicateFilesToDelete.reduce((acc, f) => acc + (f.size || 0), 0);
  const orphanedBytes = orphanedFiles.reduce((acc, f) => acc + (f.size || 0), 0);
  const historyProtectedBytes = historyProtectedFiles.reduce((acc, f) => acc + (f.size || 0), 0);
  const totalFilesToDelete = [...duplicateFilesToDelete, ...orphanedFiles];
  const totalReclaimableBytes = duplicateBytes + orphanedBytes;
  const totalStorageBytes = storageFiles.reduce((acc, f) => acc + (f.size || 0), 0);

  return {
    totalStorageFiles: storageFiles.length,
    totalStorageBytes,
    referencedPaths,
    protectedOriginalPaths,
    historyProtectedFiles,
    historyProtectedBytes,
    orphanedFiles,
    orphanedBytes,
    duplicateGroups,
    duplicateFilesToDelete,
    duplicateBytes,
    documentUpdates,
    duplicateVintedListings,
    totalFilesToDelete,
    totalReclaimableBytes
  };
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 KB';
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(2)} MB`;
}
