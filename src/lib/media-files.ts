import { auth } from '../firebase';
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
    const response = await fetch(url, { signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(15000)]) : AbortSignal.timeout(15000) });
    if (!response.ok || !/^(image|video)\//i.test(response.headers.get('content-type') || '')) throw new Error('Δεν φορτώθηκε το αρχείο.');
    return response;
  } catch (error) {
    signal?.throwIfAborted();
    if (/^(blob:|data:|\/)/.test(url)) throw error;
    return requestMedia(url, 'read', '', signal);
  }
}
export async function editableBlob(media: any, signal?: AbortSignal) {
  if (media.fileObj) return media.fileObj as Blob;
  return (await mediaResponse(typeof media === 'string' ? media : media.url, signal)).blob();
}
export async function downloadMedia(media: any, filename = 'aram-media') {
  const source = typeof media === 'string' ? { url: media } : media;
  if (!source) throw new Error('Δεν υπάρχει αρχείο για λήψη.');
  let name = source.fileObj?.name || source.fileName || filename;
  let blob: Blob;
  if (source.fileObj) blob = source.fileObj;
  else {
    const response = await mediaResponse(source.url);
    name = decodeURIComponent(response.headers.get('X-Aram-Filename') || '') || name;
    blob = await response.blob();
  }
  const extension = ({ 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif', 'image/avif': 'avif', 'video/mp4': 'mp4', 'video/webm': 'webm', 'video/quicktime': 'mov' } as Record<string, string>)[blob.type.split(';')[0]];
  if (extension && !new RegExp(`\\.${extension}$`, 'i').test(name)) name = name.replace(/\.[a-z0-9]{1,5}$/i, '') + '.' + extension;
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a'); link.href = url; link.download = name; document.body.appendChild(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
