import React, { useState, useMemo } from 'react';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  updateDoc,
  deleteDoc
} from 'firebase/firestore';
import {
  ref,
  listAll,
  getMetadata,
  getDownloadURL,
  deleteObject,
  type StorageReference
} from 'firebase/storage';
import {
  Sparkles,
  Trash2,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  HardDrive,
  FileStack,
  FileWarning,
  Layers,
  ShieldCheck,
  X,
  CheckSquare,
  Square
} from 'lucide-react';
import { auth, db, storage } from '../firebase';
import { loadHistory, persistHistory } from '../lib/catalog-history';
import {
  buildFirebaseMediaCleanupPlan,
  collectKnownUrlByPath,
  extractAllStoragePathsDeep,
  formatBytes,
  type StorageFileEntry,
  type FirestoreMediaDoc,
  type MediaListEntry
} from '../lib/firebase-media-cleanup';

interface ScanProgress {
  step: number;
  totalSteps: number;
  percent: number;
  label: string;
}

interface CleanupExecutionSummary {
  updatedDocsCount: number;
  deletedVintedDocsCount: number;
  deletedStorageFilesCount: number;
  reclaimedBytes: number;
  backupSynced: boolean;
  failedDeletions: { path: string; reason: string }[];
}

function formatDetailedError(err: unknown): string {
  if (!err) return 'Άγνωστο σφάλμα (No error payload)';
  if (typeof err === 'string') return err;
  if (typeof err === 'object') {
    const anyErr = err as { code?: string; message?: string; status?: number; name?: string };
    const parts: string[] = [];
    if (anyErr.code) parts.push(`[${anyErr.code}]`);
    if (typeof anyErr.status === 'number') parts.push(`HTTP ${anyErr.status}`);
    if (anyErr.message) parts.push(anyErr.message);
    if (parts.length > 0) return parts.join(' ');
  }
  return String(err);
}

async function listAllStorageRefsRecursively(
  rootRef: StorageReference,
  onFolderVisited?: (discoveredCount: number, currentFolder: string) => void
): Promise<StorageReference[]> {
  const allItems: StorageReference[] = [];
  const queue: StorageReference[] = [rootRef];

  while (queue.length > 0) {
    const current = queue.shift()!;
    const res = await listAll(current);
    allItems.push(...res.items);
    for (const prefix of res.prefixes) {
      queue.push(prefix);
    }
    if (onFolderVisited) {
      onFolderVisited(allItems.length, current.fullPath || '/');
    }
  }

  return allItems;
}

export function FirebaseMediaCleanup({
  onCleaned
}: {
  onCleaned?: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [progress, setProgress] = useState<ScanProgress | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [storageFiles, setStorageFiles] = useState<StorageFileEntry[] | null>(null);
  const [firestoreDocs, setFirestoreDocs] = useState<FirestoreMediaDoc[] | null>(null);
  const [protectedHistoryPaths, setProtectedHistoryPaths] = useState<Set<string>>(new Set());

  // Controls which categories of cleanup the admin wants to execute
  const [cleanDuplicates, setCleanDuplicates] = useState(true);
  const [cleanOrphans, setCleanOrphans] = useState(true);
  const [cleanDocReferences, setCleanDocReferences] = useState(true);
  const [protectHistoryFiles, setProtectHistoryFiles] = useState(true);
  const [selectedDuplicateVintedDocIds, setSelectedDuplicateVintedDocIds] = useState<Set<string>>(
    new Set()
  );

  const [executionSummary, setExecutionSummary] = useState<CleanupExecutionSummary | null>(null);

  const plan = useMemo(() => {
    if (!storageFiles || !firestoreDocs) return null;
    return buildFirebaseMediaCleanupPlan(storageFiles, firestoreDocs, {
      includeDuplicateVintedDocIdsToDelete: selectedDuplicateVintedDocIds,
      protectedHistoryPaths,
      protectHistoryFiles
    });
  }, [
    storageFiles,
    firestoreDocs,
    selectedDuplicateVintedDocIds,
    protectedHistoryPaths,
    protectHistoryFiles
  ]);

  const startScan = async () => {
    setIsScanning(true);
    setErrorMessage(null);
    setExecutionSummary(null);
    setProgress({
      step: 1,
      totalSteps: 3,
      percent: 5,
      label: 'Βήμα 1/3: Ανάγνωση Προϊόντων, Portfolio, Ρυθμίσεων & Ιστορικού (Undo/Redo)...'
    });

    try {
      // Step 1: Load Firestore documents + recent catalogHistory for Undo/Redo protection
      const [jewelrySnap, portfolioSnap, shopSettingsSnap, historySnap] = await Promise.all([
        getDocs(collection(db, 'jewelry')),
        getDocs(collection(db, 'portfolio')),
        getDoc(doc(db, 'settings', 'shop')),
        getDocs(query(collection(db, 'catalogHistory'), orderBy('timestamp', 'desc'), limit(40))).catch(
          () => null
        )
      ]);

      const docsList: FirestoreMediaDoc[] = [];

      jewelrySnap.forEach(docSnap => {
        const data = docSnap.data() as Record<string, unknown>;
        docsList.push({
          id: docSnap.id,
          collection: 'jewelry',
          title:
            typeof data.name === 'string' && data.name.trim()
              ? data.name
              : typeof data.title === 'string'
                ? data.title
                : docSnap.id,
          vintedId: typeof data.vintedId === 'string' ? data.vintedId : undefined,
          vintedUrl: typeof data.vintedUrl === 'string' ? data.vintedUrl : undefined,
          imageUrl: typeof data.imageUrl === 'string' ? data.imageUrl : undefined,
          image: typeof data.image === 'string' ? data.image : undefined,
          src: typeof data.src === 'string' ? data.src : undefined,
          videoUrl: typeof data.videoUrl === 'string' ? data.videoUrl : undefined,
          images: Array.isArray(data.images)
            ? data.images.filter((x): x is string => typeof x === 'string')
            : undefined,
          mediaList: Array.isArray(data.mediaList)
            ? (data.mediaList as MediaListEntry[])
            : undefined,
          raw: data
        });
      });

      portfolioSnap.forEach(docSnap => {
        const data = docSnap.data() as Record<string, unknown>;
        docsList.push({
          id: docSnap.id,
          collection: 'portfolio',
          title: typeof data.title === 'string' ? data.title : docSnap.id,
          imageUrl: typeof data.imageUrl === 'string' ? data.imageUrl : undefined,
          image: typeof data.image === 'string' ? data.image : undefined,
          src: typeof data.src === 'string' ? data.src : undefined,
          videoUrl: typeof data.videoUrl === 'string' ? data.videoUrl : undefined,
          images: Array.isArray(data.images)
            ? data.images.filter((x): x is string => typeof x === 'string')
            : undefined,
          mediaList: Array.isArray(data.mediaList)
            ? (data.mediaList as MediaListEntry[])
            : undefined,
          raw: data
        });
      });

      if (shopSettingsSnap.exists()) {
        const data = shopSettingsSnap.data() as Record<string, unknown>;
        docsList.push({
          id: 'shop',
          collection: 'settings',
          title: 'Ρυθμίσεις Καταστήματος & Portfolio Hero',
          heroVideoUrl: typeof data.heroVideoUrl === 'string' ? data.heroVideoUrl : undefined,
          portfolioHeroVideoUrl:
            typeof data.portfolioHeroVideoUrl === 'string'
              ? data.portfolioHeroVideoUrl
              : undefined,
          raw: data
        });
      }

      // Collect Storage paths referenced in Undo/Redo History (catalogHistory + localStorage) & Drafts
      const historyPaths = new Set<string>();
      try {
        const localHistoryRaw = localStorage.getItem('aram_version_history');
        if (localHistoryRaw) {
          extractAllStoragePathsDeep(JSON.parse(localHistoryRaw), historyPaths);
        }
      } catch {
        // Ignore malformed localStorage
      }
      try {
        const localDraftRaw = localStorage.getItem('aram_draft');
        if (localDraftRaw) {
          extractAllStoragePathsDeep(JSON.parse(localDraftRaw), historyPaths);
        }
      } catch {
        // Ignore malformed localStorage
      }

      if (historySnap && !historySnap.empty) {
        const historyEntries = historySnap.docs.map(d => d.data());
        await Promise.all(
          historyEntries.slice(0, 25).map(async entry => {
            try {
              const fullEntry = await loadHistory(db, entry);
              extractAllStoragePathsDeep(fullEntry, historyPaths);
            } catch {
              extractAllStoragePathsDeep(entry, historyPaths);
            }
          })
        );
      }

      const knownUrlMap = collectKnownUrlByPath(docsList);

      // Step 2: Recursively list all Storage objects under jewelry/
      setProgress({
        step: 2,
        totalSteps: 3,
        percent: 25,
        label: 'Βήμα 2/3: Εύρεση όλων των αρχείων στο Firebase Storage (jewelry/**)...'
      });

      const rootRef = ref(storage, 'jewelry');
      const allRefs = await listAllStorageRefsRecursively(rootRef, (count, folder) => {
        setProgress({
          step: 2,
          totalSteps: 3,
          percent: Math.min(45, 25 + Math.floor(count / 25)),
          label: `Βήμα 2/3: Εντοπίστηκαν ${count} αρχεία στον φάκελο ${folder}...`
        });
      });

      // Step 3: Fetch metadata (size, md5Hash, timeCreated) in batches of 15
      const entries: StorageFileEntry[] = [];
      const totalFiles = allRefs.length;
      const concurrency = 15;

      for (let i = 0; i < totalFiles; i += concurrency) {
        const batch = allRefs.slice(i, i + concurrency);
        const batchResults = await Promise.all(
          batch.map(async itemRef => {
            try {
              const meta = await getMetadata(itemRef);
              return {
                fullPath: itemRef.fullPath,
                name: itemRef.name,
                size: typeof meta.size === 'number' ? meta.size : 0,
                md5Hash: meta.md5Hash || undefined,
                contentType: meta.contentType || undefined,
                timeCreated: meta.timeCreated || undefined,
                downloadUrl: knownUrlMap.get(itemRef.fullPath)
              } satisfies StorageFileEntry;
            } catch {
              return {
                fullPath: itemRef.fullPath,
                name: itemRef.name,
                size: 0,
                downloadUrl: knownUrlMap.get(itemRef.fullPath)
              } satisfies StorageFileEntry;
            }
          })
        );
        entries.push(...batchResults);

        const done = Math.min(totalFiles, i + batch.length);
        const pct = totalFiles > 0 ? 45 + Math.round((done / totalFiles) * 55) : 100;
        setProgress({
          step: 3,
          totalSteps: 3,
          percent: pct,
          label: `Βήμα 3/3: Ανάλυση αποτυπώματος (MD5 & μέγεθος) ${done}/${totalFiles} αρχείων (${pct}%)...`
        });
      }

      setProtectedHistoryPaths(historyPaths);
      setFirestoreDocs(docsList);
      setStorageFiles(entries);
      setSelectedDuplicateVintedDocIds(new Set());
      setProgress(null);
    } catch (err) {
      setErrorMessage(
        `Αποτυχία σάρωσης Firebase Storage/Firestore: ${formatDetailedError(err)}`
      );
      setProgress(null);
    } finally {
      setIsScanning(false);
    }
  };

  const executeCleanup = async () => {
    if (!plan || !firestoreDocs || !storageFiles) return;

    setIsExecuting(true);
    setErrorMessage(null);
    setExecutionSummary(null);

    const failedDeletions: { path: string; reason: string }[] = [];
    let updatedDocsCount = 0;
    let deletedVintedDocsCount = 0;
    let deletedStorageFilesCount = 0;
    let reclaimedBytes = 0;
    let backupSynced = false;

    try {
      // Ensure any canonical file whose URL is needed for rewriting has a downloadUrl resolved
      const knownUrlMap = collectKnownUrlByPath(firestoreDocs);
      for (const group of plan.duplicateGroups) {
        const canon = group.canonical;
        if (!canon.downloadUrl && !knownUrlMap.has(canon.fullPath)) {
          try {
            const url = await getDownloadURL(ref(storage, canon.fullPath));
            canon.downloadUrl = url;
          } catch {
            // Keep safe fallback if download URL cannot be fetched
          }
        }
      }

      // Recompute plan with any freshly fetched canonical downloadUrls
      const activePlan = buildFirebaseMediaCleanupPlan(storageFiles, firestoreDocs, {
        includeDuplicateVintedDocIdsToDelete: selectedDuplicateVintedDocIds,
        protectedHistoryPaths,
        protectHistoryFiles
      });

      const docUpdatesToRun = cleanDocReferences ? activePlan.documentUpdates : [];
      const vintedDocsToDelete = Array.from(selectedDuplicateVintedDocIds);
      const storageFilesToRemove: StorageFileEntry[] = [
        ...(cleanDuplicates ? activePlan.duplicateFilesToDelete : []),
        ...(cleanOrphans ? activePlan.orphanedFiles : [])
      ];

      const totalOperations =
        docUpdatesToRun.length + vintedDocsToDelete.length + storageFilesToRemove.length;

      if (totalOperations === 0) {
        setIsExecuting(false);
        return;
      }

      let completedOps = 0;

      // Step 1/3: Update Firestore documents so no document points to a duplicate before we delete it
      for (let i = 0; i < docUpdatesToRun.length; i++) {
        const updateItem = docUpdatesToRun[i];
        completedOps++;
        const pct = Math.round((completedOps / totalOperations) * 100);
        setProgress({
          step: 1,
          totalSteps: 3,
          percent: pct,
          label: `Βήμα 1/3: Ενημέρωση εγγράφου ${i + 1}/${docUpdatesToRun.length} (${updateItem.title}) — ${pct}%`
        });

        const targetRef =
          updateItem.collection === 'settings'
            ? doc(db, 'settings', updateItem.id)
            : doc(db, updateItem.collection, updateItem.id);

        await updateDoc(targetRef, updateItem.patch);
        await persistHistory(db, {
          type: 'UPDATE',
          collection: updateItem.collection,
          id: updateItem.id,
          name: updateItem.title,
          message: 'Ενοποίηση διπλότυπων συνδέσμων media (Firebase Cleanup)',
          timestamp: new Date().toISOString(),
          before: updateItem.beforeSnapshot,
          after: updateItem.patch
        }).catch(() => {});
        updatedDocsCount++;
      }

      // Step 2/3: Delete any opted-in duplicate Vinted listings (and record in catalogHistory so Undo works)
      for (let i = 0; i < vintedDocsToDelete.length; i++) {
        const docId = vintedDocsToDelete[i];
        completedOps++;
        const pct = Math.round((completedOps / totalOperations) * 100);
        setProgress({
          step: 2,
          totalSteps: 3,
          percent: pct,
          label: `Βήμα 2/3: Διαγραφή διπλότυπης καταχώρησης ${i + 1}/${vintedDocsToDelete.length} — ${pct}%`
        });

        const oldDoc = firestoreDocs.find(d => d.id === docId);
        await deleteDoc(doc(db, 'jewelry', docId));
        if (oldDoc) {
          await persistHistory(db, {
            type: 'DELETE',
            collection: 'jewelry',
            id: docId,
            name: oldDoc.title || docId,
            message: 'Διαγραφή διπλότυπης καταχώρησης Vinted',
            timestamp: new Date().toISOString(),
            before: oldDoc.raw,
            after: null
          }).catch(() => {});
        }
        deletedVintedDocsCount++;
      }

      // Step 3/3: Delete duplicate & orphaned files in Firebase Storage in batches of 8
      const deleteBatchSize = 8;
      for (let i = 0; i < storageFilesToRemove.length; i += deleteBatchSize) {
        const batch = storageFilesToRemove.slice(i, i + deleteBatchSize);
        await Promise.all(
          batch.map(async fileEntry => {
            try {
              await deleteObject(ref(storage, fileEntry.fullPath));
              deletedStorageFilesCount++;
              reclaimedBytes += fileEntry.size || 0;
            } catch (err) {
              const code = (err as { code?: string })?.code || '';
              if (code === 'storage/object-not-found') {
                deletedStorageFilesCount++;
              } else {
                failedDeletions.push({
                  path: fileEntry.fullPath,
                  reason: formatDetailedError(err)
                });
              }
            }
          })
        );

        completedOps += batch.length;
        const pct = Math.min(100, Math.round((completedOps / totalOperations) * 100));
        setProgress({
          step: 3,
          totalSteps: 3,
          percent: pct,
          label: `Βήμα 3/3: Διαγραφή περιττών αρχείων Storage (${Math.min(
            storageFilesToRemove.length,
            i + batch.length
          )}/${storageFilesToRemove.length}) — ${pct}%`
        });
      }

      // Automatically trigger a fresh Catalog Backup so backups/catalog/ has the updated canonical URLs
      if ((updatedDocsCount > 0 || deletedVintedDocsCount > 0) && auth.currentUser) {
        try {
          const token = await auth.currentUser.getIdToken();
          const backupRes = await fetch('/api/catalog-backups', {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` }
          });
          backupSynced = backupRes.ok;
        } catch {
          backupSynced = false;
        }
      }

      // Update local state to reflect deleted files and docs
      const deletedPathsSet = new Set(
        storageFilesToRemove
          .map(f => f.fullPath)
          .filter(p => !failedDeletions.some(fd => fd.path === p))
      );
      setStorageFiles(prev =>
        prev ? prev.filter(f => !deletedPathsSet.has(f.fullPath)) : null
      );
      setFirestoreDocs(prev => {
        if (!prev) return null;
        return prev
          .filter(d => !selectedDuplicateVintedDocIds.has(d.id))
          .map(d => {
            const upd = docUpdatesToRun.find(
              u => u.id === d.id && u.collection === d.collection
            );
            if (!upd) return d;
            return {
              ...d,
              ...(upd.patch as Partial<FirestoreMediaDoc>)
            };
          });
      });
      setSelectedDuplicateVintedDocIds(new Set());

      setExecutionSummary({
        updatedDocsCount,
        deletedVintedDocsCount,
        deletedStorageFilesCount,
        reclaimedBytes,
        backupSynced,
        failedDeletions
      });
      setProgress(null);

      if (onCleaned) {
        onCleaned();
      }
    } catch (err) {
      setErrorMessage(
        `Σφάλμα κατά την εκτέλεση καθαρισμού: ${formatDetailedError(err)}`
      );
      setProgress(null);
    } finally {
      setIsExecuting(false);
    }
  };

  const toggleDuplicateVintedDoc = (docId: string) => {
    setSelectedDuplicateVintedDocIds(prev => {
      const next = new Set(prev);
      if (next.has(docId)) {
        next.delete(docId);
      } else {
        next.add(docId);
      }
      return next;
    });
  };

  const openAndScan = () => {
    setIsOpen(true);
    if (!storageFiles && !isScanning) {
      void startScan();
    }
  };

  const selectedFilesToDeleteCount =
    (cleanDuplicates ? plan?.duplicateFilesToDelete.length || 0 : 0) +
    (cleanOrphans ? plan?.orphanedFiles.length || 0 : 0);

  const selectedBytesToReclaim =
    (cleanDuplicates ? plan?.duplicateBytes || 0 : 0) +
    (cleanOrphans ? plan?.orphanedBytes || 0 : 0);

  const selectedDocsToUpdateCount = cleanDocReferences
    ? plan?.documentUpdates.length || 0
    : 0;

  return (
    <>
      <button
        type="button"
        onClick={openAndScan}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-medium transition-colors shadow-xs"
        title="Έλεγχος και καθαρισμός διπλών/τριπλών/τετραπλών εικόνων & βίντεο στο Firebase Storage"
      >
        <Sparkles className="w-3.5 h-3.5 text-amber-700" />
        <span>Καθαρισμός Firebase Media</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-y-auto">
          <div className="bg-white border border-stone-200 shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 bg-stone-900 text-white border-b border-stone-800">
              <div className="flex items-center gap-2.5">
                <HardDrive className="w-5 h-5 text-amber-400" />
                <div>
                  <h2 className="text-base font-semibold tracking-wide">
                    Καθαρισμός & Ενοποίηση Firebase Storage (Εικόνες & Βίντεο)
                  </h2>
                  <p className="text-xs text-stone-300">
                    Ασφαλής έλεγχος με πλήρη προστασία για Backups, Ιστορικό (Undo/Redo), Επεξεργασία Εικόνας (Originals) & Vinted Refresh
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => !isScanning && !isExecuting && setIsOpen(false)}
                disabled={isScanning || isExecuting}
                className="p-1.5 text-stone-400 hover:text-white disabled:opacity-40"
                aria-label="Κλείσιμο"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 overflow-y-auto space-y-5 flex-1 bg-stone-50">
              {/* Progress Bar (Rule 2 Compliance) */}
              {progress && (
                <div className="bg-white border border-amber-300 p-4 shadow-xs">
                  <div className="flex items-center justify-between text-xs font-semibold text-stone-800 mb-2">
                    <span className="flex items-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin text-amber-600" />
                      {progress.label}
                    </span>
                    <span className="font-mono text-amber-800">
                      Βήμα {progress.step}/{progress.totalSteps} • {progress.percent}%
                    </span>
                  </div>
                  <div className="w-full h-2.5 bg-stone-200 overflow-hidden">
                    <div
                      className="h-full bg-amber-600 transition-all duration-200"
                      style={{ width: `${Math.max(3, Math.min(100, progress.percent))}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Specific Error Alert (Rule 2 Compliance) */}
              {errorMessage && (
                <div className="bg-red-50 border border-red-300 p-4 text-xs text-red-900 flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <div className="font-semibold mb-1">Λεπτομέρειες Σφάλματος:</div>
                    <div className="font-mono break-all">{errorMessage}</div>
                  </div>
                </div>
              )}

              {/* Execution Completion Banner */}
              {executionSummary && (
                <div className="bg-emerald-50 border border-emerald-300 p-4 text-xs text-emerald-950 space-y-2">
                  <div className="flex items-center gap-2 font-semibold text-sm text-emerald-900">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <span>Ο καθαρισμός ολοκληρώθηκε επιτυχώς!</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                    <div className="bg-white p-2.5 border border-emerald-200">
                      <div className="text-stone-500">Διαγράφηκαν Αρχεία</div>
                      <div className="text-base font-bold text-emerald-800">
                        {executionSummary.deletedStorageFilesCount}
                      </div>
                    </div>
                    <div className="bg-white p-2.5 border border-emerald-200">
                      <div className="text-stone-500">Χώρος που Ελευθερώθηκε</div>
                      <div className="text-base font-bold text-emerald-800">
                        {formatBytes(executionSummary.reclaimedBytes)}
                      </div>
                    </div>
                    <div className="bg-white p-2.5 border border-emerald-200">
                      <div className="text-stone-500">Ενημερώθηκαν Προϊόντα/Έργα</div>
                      <div className="text-base font-bold text-emerald-800">
                        {executionSummary.updatedDocsCount}
                      </div>
                    </div>
                    <div className="bg-white p-2.5 border border-emerald-200">
                      <div className="text-stone-500">Διπλές Καταχωρήσεις Vinted</div>
                      <div className="text-base font-bold text-emerald-800">
                        {executionSummary.deletedVintedDocsCount}
                      </div>
                    </div>
                  </div>
                  {executionSummary.backupSynced && (
                    <div className="text-[11px] text-emerald-800 font-medium pt-1 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-600" />
                      <span>Δημιουργήθηκε αυτόματα νέο συγχρονισμένο Αντίγραφο Ασφαλείας (Backup Καταλόγου).</span>
                    </div>
                  )}
                  {executionSummary.failedDeletions.length > 0 && (
                    <div className="pt-2 text-amber-900">
                      <div className="font-semibold">
                        Προσοχή: {executionSummary.failedDeletions.length} αρχεία δεν διαγράφηκαν:
                      </div>
                      <ul className="list-disc pl-5 mt-1 space-y-0.5 font-mono text-[11px]">
                        {executionSummary.failedDeletions.slice(0, 5).map(f => (
                          <li key={f.path}>
                            {f.path}: {f.reason}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* Plan Overview */}
              {plan && (
                <>
                  {/* Safety Guarantees Banner */}
                  <div className="bg-emerald-50/80 border border-emerald-200 p-3.5 text-xs text-stone-800 space-y-1.5">
                    <div className="font-bold text-emerald-950 flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
                      <span>Εγγυήσεις Ασφάλειας Back Office (Backups, Edit, Undo/Redo, Vinted):</span>
                    </div>
                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-[11px] text-stone-700 pl-5 list-disc">
                      <li>
                        <strong>Αρχικές Εικόνες (Image Editor «Επαναφορά Αρχικής»):</strong>{' '}
                        Προστατεύονται αυτόματα ({plan.protectedOriginalPaths.size} αρχεία στο{' '}
                        <code className="font-mono">originalUrl / jewelry/originals</code>).
                      </li>
                      <li>
                        <strong>Ιστορικό & Undo/Redo:</strong> Ελέγχθηκαν οι εγγραφές του{' '}
                        <code className="font-mono">catalogHistory</code> και τα πρόχειρα ({plan.historyProtectedFiles.length} αρχεία προστατεύονται).
                      </li>
                      <li>
                        <strong>Αντίγραφα Ασφαλείας (Catalog Backups):</strong> Τα αρχεία στο{' '}
                        <code className="font-mono">backups/catalog/</code> δεν αγγίζονται ποτέ και ενημερώνονται αυτόματα μετά τον καθαρισμό.
                      </li>
                      <li>
                        <strong>Αρχειοθετημένα Έργα Portfolio & Vinted Backups:</strong> Όλα τα ενεργά και αρχειοθετημένα έργα καθώς και τα <code className="font-mono">vintedRefreshBackup</code> προστατεύονται.
                      </li>
                    </ul>
                  </div>

                  {/* Top KPI Summary Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div className="bg-white border border-stone-200 p-3.5">
                      <div className="text-xs text-stone-500">Σύνολο Αρχείων Storage</div>
                      <div className="text-lg font-bold text-stone-900 mt-0.5">
                        {plan.totalStorageFiles}
                      </div>
                      <div className="text-[11px] text-stone-500">
                        Συνολικός όγκος: {formatBytes(plan.totalStorageBytes)}
                      </div>
                    </div>

                    <div className="bg-white border border-amber-200 p-3.5">
                      <div className="text-xs text-amber-800 font-medium flex items-center gap-1">
                        <FileStack className="w-3.5 h-3.5" />
                        Διπλά / 3πλά / 4πλά Αρχεία
                      </div>
                      <div className="text-lg font-bold text-amber-900 mt-0.5">
                        {plan.duplicateFilesToDelete.length} αντίγραφα
                      </div>
                      <div className="text-[11px] text-amber-700">
                        Σε {plan.duplicateGroups.length} ομάδες ({formatBytes(plan.duplicateBytes)})
                      </div>
                    </div>

                    <div className="bg-white border border-rose-200 p-3.5">
                      <div className="text-xs text-rose-800 font-medium flex items-center gap-1">
                        <FileWarning className="w-3.5 h-3.5" />
                        Ορφανά Αρχεία (Χωρίς Προϊόν)
                      </div>
                      <div className="text-lg font-bold text-rose-900 mt-0.5">
                        {plan.orphanedFiles.length} αρχεία
                      </div>
                      <div className="text-[11px] text-rose-700">
                        Όγκος: {formatBytes(plan.orphanedBytes)}
                      </div>
                    </div>

                    <div className="bg-white border border-emerald-200 p-3.5">
                      <div className="text-xs text-emerald-800 font-medium flex items-center gap-1">
                        <Layers className="w-3.5 h-3.5" />
                        Συνολική Εξοικονόμηση
                      </div>
                      <div className="text-lg font-bold text-emerald-900 mt-0.5">
                        {formatBytes(selectedBytesToReclaim)}
                      </div>
                      <div className="text-[11px] text-emerald-700">
                        {selectedFilesToDeleteCount} περιττά αρχεία προς αφαίρεση
                      </div>
                    </div>
                  </div>

                  {/* Action Selection Checkboxes */}
                  <div className="bg-white border border-stone-200 p-4 space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-stone-700">
                      Επιλογές Ασφαλούς Καθαρισμού
                    </h3>

                    <label className="flex items-start gap-2.5 cursor-pointer text-xs text-stone-800">
                      <input
                        type="checkbox"
                        checked={protectHistoryFiles}
                        onChange={e => setProtectHistoryFiles(e.target.checked)}
                        className="mt-0.5"
                      />
                      <div>
                        <span className="font-semibold text-emerald-900">
                          Προστασία αρχείων Ιστορικού (Undo/Redo) & Πρόχειρων ({plan.historyProtectedFiles.length} αρχεία • {formatBytes(plan.historyProtectedBytes)}) — Συνιστάται
                        </span>
                        <p className="text-stone-500 text-[11px]">
                          Κρατάει ασφαλή όσα αρχεία δεν εμφανίζονται σε ενεργό προϊόν σήμερα αλλά αναφέρονται στο Ιστορικό Εκδόσεων, ώστε αν πατήσεις Undo ή Επαναφορά Ιστορικού να υπάρχουν όλες οι παλιές φωτογραφίες.
                        </p>
                      </div>
                    </label>

                    <label className="flex items-start gap-2.5 cursor-pointer text-xs text-stone-800">
                      <input
                        type="checkbox"
                        checked={cleanDuplicates}
                        onChange={e => setCleanDuplicates(e.target.checked)}
                        className="mt-0.5"
                      />
                      <div>
                        <span className="font-semibold">
                          Διαγραφή διπλών, τριπλών & τετραπλών αντιγράφων ({plan.duplicateFilesToDelete.length} αρχεία • {formatBytes(plan.duplicateBytes)})
                        </span>
                        <p className="text-stone-500 text-[11px]">
                          Κρατάει 1 κύριο αρχείο για κάθε εικόνα/βίντεο με ίδιο MD5 αποτύπωμα και διαγράφει τα περιττά αντίγραφα.
                        </p>
                      </div>
                    </label>

                    <label className="flex items-start gap-2.5 cursor-pointer text-xs text-stone-800">
                      <input
                        type="checkbox"
                        checked={cleanOrphans}
                        onChange={e => setCleanOrphans(e.target.checked)}
                        className="mt-0.5"
                      />
                      <div>
                        <span className="font-semibold">
                          Διαγραφή ορφανών αρχείων Storage ({plan.orphanedFiles.length} αρχεία • {formatBytes(plan.orphanedBytes)})
                        </span>
                        <p className="text-stone-500 text-[11px]">
                          Αφαιρεί παλιές εικόνες και βίντεο που είχαν ανεβεί στο Storage αλλά δεν χρησιμοποιούνται πλέον σε κανένα προϊόν, έργο Portfolio, Hero βίντεο ή αρχική εικόνα επαναφοράς.
                        </p>
                      </div>
                    </label>

                    <label className="flex items-start gap-2.5 cursor-pointer text-xs text-stone-800">
                      <input
                        type="checkbox"
                        checked={cleanDocReferences}
                        onChange={e => setCleanDocReferences(e.target.checked)}
                        className="mt-0.5"
                      />
                      <div>
                        <span className="font-semibold">
                          Αυτόματη ενοποίηση συνδέσμων σε Προϊόντα & Portfolio ({plan.documentUpdates.length} έγγραφα)
                        </span>
                        <p className="text-stone-500 text-[11px]">
                          Ενημερώνει αυτόματα τα προϊόντα και το Portfolio ώστε να δείχνουν στο 1 κύριο αρχείο, καταγράφει την αλλαγή στο Ιστορικό και αφαιρεί τυχόν διπλές εγγραφές της ίδιας φωτογραφίας/βίντεο μέσα στο ίδιο προϊόν.
                        </p>
                      </div>
                    </label>
                  </div>

                  {/* Section 1: Duplicate Storage Groups Breakdown */}
                  {plan.duplicateGroups.length > 0 && (
                    <div className="bg-white border border-stone-200 p-4 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-stone-800">
                          1. Διπλά / Τριπλά / Τετραπλά Αρχεία ({plan.duplicateGroups.length} ομάδες)
                        </h3>
                        <span className="text-[11px] text-amber-800 font-medium">
                          Διατηρείται 1 αρχείο ανά ομάδα • Διαγράφονται {plan.duplicateFilesToDelete.length}
                        </span>
                      </div>
                      <div className="max-h-48 overflow-y-auto border border-stone-100 divide-y divide-stone-100 text-xs">
                        {plan.duplicateGroups.map(group => {
                          const totalCopies = 1 + group.duplicates.length;
                          return (
                            <div
                              key={group.canonical.fullPath}
                              className="p-2.5 flex items-start justify-between gap-3 hover:bg-stone-50"
                            >
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="px-1.5 py-0.5 bg-amber-100 text-amber-900 font-bold text-[10px]">
                                    {totalCopies}x αντίγραφα
                                  </span>
                                  <span className="font-mono text-[11px] text-stone-800 truncate">
                                    {group.signature}
                                  </span>
                                </div>
                                <div className="text-[11px] text-emerald-700 mt-1 truncate flex items-center gap-1">
                                  <CheckCircle2 className="w-3 h-3 shrink-0 text-emerald-600" />
                                  <span>Διατηρείται: <span className="font-mono">{group.canonical.fullPath}</span></span>
                                </div>
                                <div className="text-[11px] text-rose-700 mt-0.5 space-y-0.5">
                                  {group.duplicates.map(d => (
                                    <div key={d.fullPath} className="truncate font-mono flex items-center gap-1">
                                      <X className="w-3 h-3 shrink-0 text-rose-600" />
                                      <span>Διαγραφή: {d.fullPath} ({formatBytes(d.size)})</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                              <div className="text-right shrink-0 font-mono text-[11px] text-stone-600">
                                -{formatBytes(group.reclaimableBytes)}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Section 2: Orphaned Storage Files Breakdown */}
                  {plan.orphanedFiles.length > 0 && (
                    <div className="bg-white border border-stone-200 p-4 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-stone-800">
                          2. Ορφανά Αρχεία στο Firebase Storage ({plan.orphanedFiles.length} αρχεία)
                        </h3>
                        <span className="text-[11px] text-rose-800 font-medium">
                          Δεν χρησιμοποιούνται σε κανένα ενεργό προϊόν ή έργο ({formatBytes(plan.orphanedBytes)})
                        </span>
                      </div>
                      <div className="max-h-44 overflow-y-auto border border-stone-100 divide-y divide-stone-100 text-xs">
                        {plan.orphanedFiles.map(file => (
                          <div
                            key={file.fullPath}
                            className="p-2 flex items-center justify-between gap-3 hover:bg-stone-50 font-mono text-[11px]"
                          >
                            <span className="text-stone-700 truncate">{file.fullPath}</span>
                            <span className="text-stone-500 shrink-0">{formatBytes(file.size)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Section 3: Duplicate Vinted Listings (Optional Admin Selection) */}
                  {plan.duplicateVintedListings.length > 0 && (
                    <div className="bg-white border border-amber-300 p-4 space-y-2.5">
                      <div>
                        <h3 className="text-xs font-bold uppercase tracking-wider text-amber-900">
                          3. Διπλοεγγραφές Προϊόντων Vinted στη Βάση ({plan.duplicateVintedListings.length} προϊόντα)
                        </h3>
                        <p className="text-[11px] text-stone-600 mt-0.5">
                          Τα παρακάτω προϊόντα έχουν εισαχθεί 2 φορές με τον ίδιο κωδικό Vinted, δημιουργώντας διπλές φωτογραφίες στο Storage. Επιλέξτε αν θέλετε να αφαιρεθεί το διπλότυπο αντίγραφο:
                        </p>
                      </div>
                      <div className="divide-y divide-stone-100 border border-stone-200 text-xs">
                        {plan.duplicateVintedListings.map(group => (
                          <div key={group.vintedKey} className="p-3 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-stone-900">
                                {group.title} (Vinted #{group.vintedKey})
                              </span>
                              <span className="text-[11px] text-emerald-700 font-mono">
                                Διατηρείται ID: {group.keepDoc.id}
                              </span>
                            </div>
                            <div className="space-y-1.5 pl-2">
                              {group.duplicateDocs.map(dupDoc => {
                                const checked = selectedDuplicateVintedDocIds.has(dupDoc.id);
                                return (
                                  <button
                                    key={dupDoc.id}
                                    type="button"
                                    onClick={() => toggleDuplicateVintedDoc(dupDoc.id)}
                                    className="flex items-center gap-2 text-left text-xs text-stone-800 hover:text-stone-950"
                                  >
                                    {checked ? (
                                      <CheckSquare className="w-4 h-4 text-amber-700 shrink-0" />
                                    ) : (
                                      <Square className="w-4 h-4 text-stone-400 shrink-0" />
                                    )}
                                    <span>
                                      Διαγραφή διπλότυπης καταχώρησης{' '}
                                      <span className="font-mono text-[11px] bg-stone-100 px-1 py-0.5">
                                        {dupDoc.id}
                                      </span>{' '}
                                      και των διπλών φωτογραφιών της στο Storage
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Clean State Message */}
                  {plan.duplicateFilesToDelete.length === 0 &&
                    plan.orphanedFiles.length === 0 &&
                    plan.documentUpdates.length === 0 && (
                      <div className="bg-emerald-50 border border-emerald-200 p-6 text-center space-y-2">
                        <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                        <div className="text-sm font-semibold text-emerald-950">
                          Το Firebase Storage και η βάση σας είναι ήδη 100% καθαρά!
                        </div>
                        <div className="text-xs text-emerald-800">
                          Δεν βρέθηκαν διπλά/τριπλά/τετραπλά ή ορφανά αρχεία.
                        </div>
                      </div>
                    )}
                </>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-white border-t border-stone-200 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={startScan}
                disabled={isScanning || isExecuting}
                className="flex items-center gap-1.5 px-3.5 py-2 border border-stone-300 text-stone-700 hover:bg-stone-100 text-xs font-medium disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
                <span>Νέα Σάρωση</span>
              </button>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  disabled={isScanning || isExecuting}
                  className="px-4 py-2 border border-stone-300 text-stone-700 hover:bg-stone-100 text-xs font-medium disabled:opacity-50"
                >
                  Κλείσιμο
                </button>

                {plan &&
                  (selectedFilesToDeleteCount > 0 ||
                    selectedDocsToUpdateCount > 0 ||
                    selectedDuplicateVintedDocIds.size > 0) && (
                    <button
                      type="button"
                      onClick={executeCleanup}
                      disabled={isScanning || isExecuting}
                      className="flex items-center gap-1.5 px-4 py-2 bg-amber-700 hover:bg-amber-800 text-white text-xs font-semibold shadow-xs disabled:opacity-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>
                        Εκτέλεση Καθαρισμού ({selectedFilesToDeleteCount} αρχεία •{' '}
                        {formatBytes(selectedBytesToReclaim)})
                      </span>
                    </button>
                  )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
