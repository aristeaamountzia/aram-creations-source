import type { StorageReference, UploadMetadata } from 'firebase/storage';
import { auth } from '../firebase';
export async function getDownloadURL(ref: StorageReference) { return `gs://${ref.bucket}/${ref.fullPath}`; }
export function uploadBytesResumable(ref: StorageReference, bytes: Blob | Uint8Array | ArrayBuffer, metadata?: UploadMetadata) {
  const blob = bytes instanceof Blob ? bytes : new Blob([bytes as BlobPart]);
  const snapshot = { ref, bytesTransferred: 0, totalBytes: blob.size };
  let progress: ((value: typeof snapshot) => void) | null = null;
  const promise = (async () => {
    if (!auth.currentUser) throw new Error('Συνδέσου στο Back Office.');
    const response = await fetch('/api/private-upload', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await auth.currentUser.getIdToken()}` }, body: JSON.stringify({ path: ref.fullPath, type: metadata?.contentType || blob.type, size: blob.size }) });
    if (!response.ok) throw new Error('Δεν προετοιμάστηκε ιδιωτικό upload.');
    const plan = await response.json();
    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest(); xhr.open('PUT', plan.url);
      for (const [key, value] of Object.entries(plan.headers)) xhr.setRequestHeader(key, String(value));
      xhr.upload.onprogress = event => { snapshot.bytesTransferred = event.loaded; progress?.(snapshot); };
      xhr.onerror = () => reject(new Error('Το upload απέτυχε.'));
      xhr.onload = () => xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`Upload ${xhr.status}`));
      xhr.send(blob);
    });
    snapshot.bytesTransferred = blob.size; progress?.(snapshot); return snapshot;
  })();
  return { snapshot, promise, on(_event: string, next: typeof progress, error: ((reason: any) => void) | null, complete: (() => void) | null) { progress = next; promise.then(() => complete?.(), reason => error?.(reason)); return () => { progress = null; }; } };
}
export async function uploadBytes(ref: StorageReference, bytes: Blob | Uint8Array | ArrayBuffer, metadata?: UploadMetadata) { return uploadBytesResumable(ref, bytes, metadata).promise; }
