import type { StorageReference } from 'firebase/storage';
import { requestMedia } from './media-files';
// Retain private originals for undo/redo, duplicates and verified backup.
// Physical purge is a separate, unapproved retention operation.
export async function deleteObject(ref: StorageReference) {
  await requestMedia(`gs://${ref.bucket}/${ref.fullPath}`, 'archive');
}
