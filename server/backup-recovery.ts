import { BACKUP_COLLECTIONS, restoredDocuments, type FullBackup } from './backup-format';
import { restoreArchivedMedia } from './backup-media';

/** Preflight is read-only. Apply restores media and creates documents in an empty namespace. */
export async function recoverBackup(backup: FullBackup, services: any, options: {
  prefix: string; apply?: boolean; allowPartial?: boolean; mediaOnly?: boolean;
}) {
  if (backup.format !== 'aram-catalog-v2' || backup.project !== 'aramcreations-e1529' || !Array.isArray(backup.documents) || !Array.isArray(backup.media)) throw new Error('Χρειάζεται έγκυρο πλήρες backup aram-catalog-v2. Τα παλιά v1 είναι μόνο δεδομένα.');
  if (options.prefix && !/^recovery_[a-zA-Z0-9_]+_$/.test(options.prefix)) throw new Error('Το prefix επαναφοράς πρέπει να έχει μορφή recovery_όνομα_.');
  if (options.apply && !backup.mediaIncluded && !options.allowPartial) throw new Error('Το backup έχει ελλείψεις αρχείων. Απαιτείται ρητά --allow-partial για εφαρμογή.');
  const scoped = { doc: (path: string) => services.db.doc(options.prefix + path) };
  // Decode and validate the whole snapshot before making any writes.
  const initial = restoredDocuments(backup, scoped);
  if (!options.mediaOnly) {
    for (const name of BACKUP_COLLECTIONS) {
      const snapshot = await services.db.collection(options.prefix + name).limit(1).get();
      if (!snapshot.empty) throw new Error(`Ο προορισμός ${options.prefix + name} δεν είναι κενός. Η επαναφορά δεν αντικαθιστά ενεργά δεδομένα.`);
    }
    for (let i = 0; i < initial.length; i += 400) {
      const existing = await services.db.getAll(...initial.slice(i, i + 400).map(row => scoped.doc(row.path)));
      if (existing.some(row => row.exists)) throw new Error('Υπάρχουν ήδη εγγραφές ή τμήματα ιστορικού στον προορισμό.');
    }
  }
  const plan = [];
  for (const entry of backup.media) plan.push(await restoreArchivedMedia(services.bucket, entry, false));
  if (!options.apply) return { dryRun: true, documents: initial.length, mediaToRestore: plan.filter(row => row.needed).length, missingMedia: backup.missingMedia.length, prefix: options.prefix };
  const replacements = new Map<string, string>();
  for (const entry of backup.media) {
    const result = await restoreArchivedMedia(services.bucket, entry, true);
    result.replacements.forEach(([from, to]) => replacements.set(from, to));
  }
  const documents = restoredDocuments(backup, scoped, replacements);
  if (!options.mediaOnly) for (let i = 0; i < documents.length; i += 400) {
    const batch = services.db.batch();
    for (const row of documents.slice(i, i + 400)) batch.create(scoped.doc(row.path), row.data);
    await batch.commit();
  }
  return { dryRun: false, documents: options.mediaOnly ? 0 : documents.length, restoredMedia: plan.filter(row => row.needed).length, missingMedia: backup.missingMedia.length, prefix: options.prefix };
}
