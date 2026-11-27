const buckets = new Set(['aramcreations-e1529.firebasestorage.app', 'aramcreations-e1529.appspot.com']);
export function mediaLocation(raw: string) {
  const url = new URL(raw);
  if (url.protocol !== 'https:' || url.username || url.password || url.port) throw new Error('Μη έγκυρος σύνδεσμος αρχείου.');
  if (url.hostname === 'firebasestorage.googleapis.com') {
    const match = url.pathname.match(/^\/v0\/b\/([^/]+)\/o\/(.+)$/);
    if (!match || !buckets.has(decodeURIComponent(match[1]))) throw new Error('Το αρχείο δεν ανήκει στο Aram Creations.');
    return { bucket: decodeURIComponent(match[1]), object: decodeURIComponent(match[2]), external: '' };
  }
  if (url.hostname === 'storage.googleapis.com') {
    const match = url.pathname.match(/^\/([^/]+)\/(.+)$/);
    if (!match || !buckets.has(decodeURIComponent(match[1]))) throw new Error('Το αρχείο δεν ανήκει στο Aram Creations.');
    return { bucket: decodeURIComponent(match[1]), object: decodeURIComponent(match[2]), external: '' };
  }
  if (/^images\d*\.vinted\.net$/.test(url.hostname) || ['static.wixstatic.com', 'video.wixstatic.com'].includes(url.hostname)) return { bucket: '', object: '', external: url.href };
  throw new Error('Αυτός ο πάροχος αρχείων δεν υποστηρίζεται.');
}
export function mediaExtension(contentType: string): string | undefined {
  return ({ 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif', 'image/avif': 'avif', 'image/bmp': 'bmp', 'video/mp4': 'mp4', 'video/webm': 'webm', 'video/quicktime': 'mov' } as Record<string, string>)[contentType.split(';')[0].trim().toLowerCase()];
}
export function mediaContentType(contentType: string, ...filenames: string[]): string {
  const normalized = String(contentType || '').split(';')[0].trim().toLowerCase();
  if (normalized && normalized !== 'application/octet-stream' && normalized !== 'binary/octet-stream') return normalized;
  const byExtension: Record<string, string> = {
    jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp',
    gif: 'image/gif', avif: 'image/avif', bmp: 'image/bmp', svg: 'image/svg+xml',
    heic: 'image/heic', heif: 'image/heif', mp4: 'video/mp4', webm: 'video/webm',
    mov: 'video/quicktime',
  };
  for (const filename of filenames) {
    const clean = String(filename || '').split(/[?#]/, 1)[0];
    const extension = clean.slice(clean.lastIndexOf('.') + 1).toLowerCase();
    if (byExtension[extension]) return byExtension[extension];
  }
  return normalized;
}
export function mediaFilename(name: string, contentType: string) {
  const extension = mediaExtension(contentType);
  const clean = String(name || 'aram-media').normalize('NFKC').replace(/[\x00-\x1f<>:"/\\|?*]/g, '-').slice(0, 160).replace(/^\.+/, '') || 'aram-media';
  return extension && !new RegExp(`\\.${extension}$`, 'i').test(clean) ? clean.replace(/\.[a-z0-9]{1,5}$/i, '') + '.' + extension : clean;
}

