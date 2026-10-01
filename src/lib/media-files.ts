import { auth } from '../firebase';
export async function requestMedia(url: string, action: 'edit' | 'download', filename = '', signal?: AbortSignal) {
  const user = auth.currentUser;
  if (!user) throw new Error('Συνδέσου στο Back Office.');
  const response = await fetch('/api/media', { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${await user.getIdToken()}` }, body: JSON.stringify({ url, action, filename }), signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(45000)]) : AbortSignal.timeout(45000) });
  if (!response.ok) { const data = await response.json().catch(() => ({})); throw new Error(data.error || `Σφάλμα αρχείου (${response.status}).`); }
  return response;
}
export async function editableBlob(media: any, signal?: AbortSignal) {
  if (media.fileObj) return media.fileObj as Blob;
  if (/^(blob:|data:)/.test(media.url)) { const response = await fetch(media.url, { signal }); if (!response.ok) throw new Error('Το τοπικό αρχείο δεν υπάρχει πλέον.'); return response.blob(); }
  return (await requestMedia(media.url, 'edit', '', signal)).blob();
}
export async function downloadMedia(media: any, filename = 'aram-media') {
  let url: string, revoke = false;
  let name = media.fileObj?.name || media.fileName || filename;
  if (media.fileObj || /^(blob:|data:)/.test(media.url)) { url = URL.createObjectURL(media.fileObj || await (await fetch(media.url)).blob()); revoke = true; }
  else { const response = await requestMedia(media.url, 'download', name); if (response.headers.get('content-type')?.includes('application/json')) { const data = await response.json(); url = data.url; name = data.filename || name; } else { name = decodeURIComponent(response.headers.get('X-Aram-Filename') || '') || name; url = URL.createObjectURL(await response.blob()); revoke = true; } }
  const link = document.createElement('a'); link.href = url; link.download = name; document.body.appendChild(link); link.click(); link.remove(); if (revoke) setTimeout(() => URL.revokeObjectURL(url), 60000);
}
