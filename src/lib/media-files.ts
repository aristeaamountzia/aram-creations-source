import { auth } from '../firebase';
import { mediaFilename } from '../../server/media-path';

const mediaSignal = (signal?: AbortSignal) => signal ? AbortSignal.any([signal, AbortSignal.timeout(120000)]) : AbortSignal.timeout(120000);
const isStoredMedia = (url: string) => /^https:\/\/(?:firebasestorage|storage)\.googleapis\.com\//.test(url);

export async function requestMedia(url: string, action: 'edit' | 'download' | 'read', filename = '', signal?: AbortSignal) {
  const user = auth.currentUser;
  if (!user) throw new Error('Συνδέσου στο Back Office.');
  const response = await fetch('/api/media', { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${await user.getIdToken()}` }, body: JSON.stringify({ url, action, filename }), signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(45000)]) : AbortSignal.timeout(45000) });
  if (!response.ok) { const data = await response.json().catch(() => ({})); throw new Error(data.error || `Σφάλμα αρχείου (${response.status}).`); }
  return response;
}
// Public media and same-origin assets can be read without the admin proxy.
// Fall back to the authenticated endpoint when a provider blocks browser CORS.
export async function mediaResponse(url: string, signal?: AbortSignal): Promise<Response> {
  if (!url) throw new Error('Δεν υπάρχει σύνδεσμος αρχείου.');
  signal?.throwIfAborted();
  try {
    const response = await fetch(url, { signal: mediaSignal(signal), referrerPolicy: 'no-referrer' });
    if (!response.ok) throw new Error(`Δεν φορτώθηκε το αρχείο (HTTP ${response.status}).`);
    if (!/^(image|video)\//i.test(response.headers.get('content-type') || '')) throw new Error('Ο σύνδεσμος δεν επέστρεψε εικόνα ή βίντεο.');
    return response;
  } catch (error) {
    signal?.throwIfAborted();
    if (/^(blob:|data:|\/)/.test(url)) throw error;
    if (!auth.currentUser) throw error;
    // Reuse the signed download route: large files must not pass through a
    // buffered Function response. External providers still return media bytes.
    const response = await requestMedia(url, 'download', '', signal);
    if (!response.headers.get('content-type')?.includes('application/json')) return response;
    const download = await response.json();
    if (typeof download.url !== 'string') throw new Error('Δεν επιστράφηκε σύνδεσμος λήψης αρχείου.');
    const signed = await fetch(download.url, { signal: mediaSignal(signal), referrerPolicy: 'no-referrer' });
    if (!signed.ok) throw new Error(`Δεν φορτώθηκε το αρχείο από το Storage (HTTP ${signed.status}).`);
    return signed;
  }
}
export async function editableBlob(media: any, signal?: AbortSignal) {
  if (!media) throw new Error('Δεν υπάρχει εικόνα για επεξεργασία.');
  if (media.fileObj) return media.fileObj as Blob;
  return (await mediaResponse(typeof media === 'string' ? media : media.url, signal)).blob();
}
export async function loadMediaImage(media: { url: string; fileObj?: File }) {
  // The authenticated endpoint gives stored images a same-origin path.
  const blob = !media.fileObj && isStoredMedia(media.url) && auth.currentUser
    ? await requestMedia(media.url, 'read').then(response => response.blob()).catch(() => editableBlob(media))
    : await editableBlob(media);
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return { img, cleanup: () => URL.revokeObjectURL(url) };
  } catch {
    URL.revokeObjectURL(url);
    throw new Error('Το αρχείο δεν μπορεί να αποκωδικοποιηθεί ως εικόνα.');
  }
}
export async function downloadMedia(media: any, filename = 'aram-media') {
  const source = typeof media === 'string' ? { url: media } : media;
  if (!source) throw new Error('Δεν υπάρχει αρχείο για λήψη.');
  let name = source.fileObj?.name || source.fileName || filename;
  if (!source.fileObj && isStoredMedia(source.url || '') && auth.currentUser) {
    const response = await requestMedia(source.url, 'download', name);
    const download = await response.json();
    if (typeof download.url !== 'string') throw new Error('Δεν επιστράφηκε σύνδεσμος λήψης αρχείου.');
    const link = document.createElement('a');
    link.href = download.url;
    link.download = download.filename || name;
    link.referrerPolicy = 'no-referrer';
    document.body.appendChild(link); link.click(); link.remove();
    return;
  }
  let blob: Blob;
  if (source.fileObj) blob = source.fileObj;
  else {
    const response = await mediaResponse(source.url);
    name = decodeURIComponent(response.headers.get('X-Aram-Filename') || '') || name;
    blob = await response.blob();
  }
  name = mediaFilename(name, blob.type);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a'); link.href = url; link.download = name; document.body.appendChild(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
