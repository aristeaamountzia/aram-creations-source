import test from 'node:test';
import assert from 'node:assert/strict';
import {
  extractStoragePathFromUrl,
  extractAllStoragePathsDeep,
  normalizeStorageBaseName,
  buildFirebaseMediaCleanupPlan,
  type StorageFileEntry,
  type FirestoreMediaDoc
} from '../src/lib/firebase-media-cleanup';

test('extractStoragePathFromUrl parses Firebase Storage download URLs, storage.googleapis.com URLs, and gs:// URIs', () => {
  const url =
    'https://firebasestorage.googleapis.com/v0/b/aramcreations-e1529.firebasestorage.app/o/jewelry%2Fportfolio%2F1793265040394-51c6w5r6efu-c3301d5fcf6bdfe2784ad9746726db20.mp4?alt=media&token=abc-123';
  assert.equal(
    extractStoragePathFromUrl(url),
    'jewelry/portfolio/1793265040394-51c6w5r6efu-c3301d5fcf6bdfe2784ad9746726db20.mp4'
  );

  assert.equal(
    extractStoragePathFromUrl(
      'https://storage.googleapis.com/aramcreations-e1529.firebasestorage.app/jewelry/originals/123-orig.jpg'
    ),
    'jewelry/originals/123-orig.jpg'
  );

  assert.equal(
    extractStoragePathFromUrl('gs://aramcreations-e1529.firebasestorage.app/jewelry/hero/shop/123-video.mp4'),
    'jewelry/hero/shop/123-video.mp4'
  );

  assert.equal(extractStoragePathFromUrl('https://images.unsplash.com/photo-123'), null);
  assert.equal(extractStoragePathFromUrl(''), null);
  assert.equal(extractStoragePathFromUrl(null), null);
});

test('normalizeStorageBaseName strips timestamp and random prefixes while preserving numeric Vinted IDs', () => {
  assert.equal(
    normalizeStorageBaseName('1793265040394-51c6w5r6efu-c3301d5fcf6bdfe2784ad9746726db20.mp4'),
    'c3301d5fcf6bdfe2784ad9746726db20.mp4'
  );
  assert.equal(
    normalizeStorageBaseName('1793886061597-c3301d5fcf6bdfe2784ad9746726db20.mp4'),
    'c3301d5fcf6bdfe2784ad9746726db20.mp4'
  );
  assert.equal(
    normalizeStorageBaseName('1781271193472_yc6hk6_ring_photo.jpg'),
    'ring_photo.jpg'
  );
  assert.equal(
    normalizeStorageBaseName('1793871778935-9546772702-1.jpg'),
    '9546772702-1.jpg'
  );
});

test('buildFirebaseMediaCleanupPlan detects orphaned files, 2x/3x/4x duplicates, protects History/Originals, and rewrites Firestore references', () => {
  const makeUrl = (path: string) =>
    `https://firebasestorage.googleapis.com/v0/b/aramcreations-e1529.firebasestorage.app/o/${encodeURIComponent(
      path
    )}?alt=media&token=tok`;

  const canonPath = 'jewelry/portfolio/1793265040394-51c6w5r6efu-video.mp4';
  const dupPath2 = 'jewelry/hero/portfolio/1793886061597-video.mp4';
  const dupPath3 = 'jewelry/portfolio/1794000000000-abcdef1234-video.mp4';
  const dupPath4 = 'jewelry/portfolio/1795000000000-xyz9876543-video.mp4';
  const orphanPath = 'jewelry/1780000000000_old_unused_image.jpg';
  const historyUndoPath = 'jewelry/1785000000000_deleted_yesterday_in_undo_history.jpg';
  const originalUneditedPath = 'jewelry/originals/1789000000000_unedited_original.jpg';
  const vintedBackupPath = 'jewelry/vinted-imports/1789500000000_vinted_backup_photo.jpg';

  const storageFiles: StorageFileEntry[] = [
    {
      fullPath: canonPath,
      name: '1793265040394-51c6w5r6efu-video.mp4',
      size: 5_000_000,
      md5Hash: 'HASH_VIDEO_1',
      timeCreated: '2026-03-01T10:00:00Z',
      downloadUrl: makeUrl(canonPath)
    },
    {
      fullPath: dupPath2,
      name: '1793886061597-video.mp4',
      size: 5_000_000,
      md5Hash: 'HASH_VIDEO_1',
      timeCreated: '2026-03-02T10:00:00Z',
      downloadUrl: makeUrl(dupPath2)
    },
    {
      fullPath: dupPath3,
      name: '1794000000000-abcdef1234-video.mp4',
      size: 5_000_000,
      md5Hash: 'HASH_VIDEO_1',
      timeCreated: '2026-03-03T10:00:00Z',
      downloadUrl: makeUrl(dupPath3)
    },
    {
      fullPath: dupPath4,
      name: '1795000000000-xyz9876543-video.mp4',
      size: 5_000_000,
      md5Hash: 'HASH_VIDEO_1',
      timeCreated: '2026-03-04T10:00:00Z',
      downloadUrl: makeUrl(dupPath4)
    },
    {
      fullPath: orphanPath,
      name: '1780000000000_old_unused_image.jpg',
      size: 1_200_000,
      md5Hash: 'HASH_ORPHAN_IMG',
      timeCreated: '2026-02-01T10:00:00Z',
      downloadUrl: makeUrl(orphanPath)
    },
    {
      fullPath: historyUndoPath,
      name: '1785000000000_deleted_yesterday_in_undo_history.jpg',
      size: 800_000,
      md5Hash: 'HASH_HISTORY_IMG',
      timeCreated: '2026-02-15T10:00:00Z',
      downloadUrl: makeUrl(historyUndoPath)
    },
    {
      fullPath: originalUneditedPath,
      name: '1789000000000_unedited_original.jpg',
      size: 900_000,
      md5Hash: 'HASH_ORIG_IMG',
      timeCreated: '2026-02-20T10:00:00Z',
      downloadUrl: makeUrl(originalUneditedPath)
    },
    {
      fullPath: vintedBackupPath,
      name: '1789500000000_vinted_backup_photo.jpg',
      size: 750_000,
      md5Hash: 'HASH_VINTED_BACKUP',
      timeCreated: '2026-02-22T10:00:00Z',
      downloadUrl: makeUrl(vintedBackupPath)
    }
  ];

  const docs: FirestoreMediaDoc[] = [
    {
      id: 'port-1',
      collection: 'portfolio',
      title: 'Portfolio Work 1',
      videoUrl: makeUrl(canonPath),
      mediaList: [
        { url: makeUrl(canonPath), type: 'video', originalUrl: makeUrl(originalUneditedPath) },
        { url: makeUrl(dupPath3), type: 'video' }
      ],
      raw: {
        vintedRefreshBackup: {
          data: {
            imageUrl: makeUrl(vintedBackupPath)
          }
        }
      }
    },
    {
      id: 'shop',
      collection: 'settings',
      title: 'Shop Settings',
      portfolioHeroVideoUrl: makeUrl(dupPath2),
      raw: {}
    }
  ];

  const protectedHistoryPaths = extractAllStoragePathsDeep({
    before: { imageUrl: makeUrl(historyUndoPath) }
  });

  const plan = buildFirebaseMediaCleanupPlan(storageFiles, docs, {
    protectedHistoryPaths,
    protectHistoryFiles: true
  });

  // 1. Orphan detection: ONLY orphanPath is marked orphaned; historyUndoPath, originalUneditedPath, and vintedBackupPath are all protected!
  assert.equal(plan.orphanedFiles.length, 1);
  assert.equal(plan.orphanedFiles[0].fullPath, orphanPath);
  assert.equal(plan.orphanedBytes, 1_200_000);

  // 2. History protection: historyUndoPath is separated into historyProtectedFiles
  assert.equal(plan.historyProtectedFiles.length, 1);
  assert.equal(plan.historyProtectedFiles[0].fullPath, historyUndoPath);

  // 3. Originals protection: originalUneditedPath is tracked in protectedOriginalPaths
  assert.equal(plan.protectedOriginalPaths.has(originalUneditedPath), true);

  // 4. Deep nested fields protection: vintedBackupPath inside doc.raw.vintedRefreshBackup is in referencedPaths
  assert.equal(plan.referencedPaths.has(vintedBackupPath), true);

  // 5. 4x duplicate detection -> 1 canonical kept, 3 duplicates marked for deletion
  assert.equal(plan.duplicateGroups.length, 1);
  assert.equal(plan.duplicateGroups[0].canonical.fullPath, canonPath);
  assert.equal(plan.duplicateGroups[0].duplicates.length, 3);
  assert.equal(plan.duplicateBytes, 15_000_000);

  // 6. Document updates
  assert.equal(plan.documentUpdates.length, 2);
});
