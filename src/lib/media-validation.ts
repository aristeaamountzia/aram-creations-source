export type MediaKind = 'image' | 'video';
export type DetectedMedia = { kind: MediaKind; mime: string };
export type MediaMetadata = { width: number; height: number; duration?: number; mime?: string };

export function shouldFetchStoredMediaBytes(url: string, pageOrigin: string) {
  try {
    const parsed = new URL(url);
    const local = parsed.protocol === 'http:' && ['127.0.0.1', 'localhost', '[::1]'].includes(parsed.hostname);
    return parsed.origin === pageOrigin || local;
  } catch {
    return false;
  }
}

export const IMAGE_UPLOAD_LIMIT = 30 * 1024 * 1024;
export const VIDEO_FILE_ACCEPT = 'video/*,.mp4,.m4v,.mov,.webm,.mkv,.avi,.ogv,.ogg,.3gp,.3g2,.mpeg,.mpg,.m2v,.mts,.m2ts,.ts,.flv,.wmv,.asf';
export const MEDIA_FILE_ACCEPT = `image/*,.jpg,.jpeg,.jfif,.png,.webp,.gif,.avif,.heic,.heif,.hif,.bmp,.tif,.tiff,.svg,.ico,.psd,.jp2,.j2k,.jxl,${VIDEO_FILE_ACCEPT}`;

const ascii = (bytes: Uint8Array, start: number, length: number) =>
  String.fromCharCode(...bytes.slice(start, start + length));

export function detectMediaSignature(bytes: Uint8Array): DetectedMedia | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { kind: 'image', mime: 'image/jpeg' };
  }
  if (bytes.length >= 8 && bytes.slice(0, 8).every((value, index) => value === [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a][index])) {
    return { kind: 'image', mime: 'image/png' };
  }
  if (bytes.length >= 12 && ascii(bytes, 0, 4) === 'RIFF' && ascii(bytes, 8, 4) === 'WEBP') {
    return { kind: 'image', mime: 'image/webp' };
  }
  if (bytes.length >= 6 && ['GIF87a', 'GIF89a'].includes(ascii(bytes, 0, 6))) {
    return { kind: 'image', mime: 'image/gif' };
  }
  if (bytes.length >= 12 && ascii(bytes, 4, 4) === 'ftyp') {
    const brands = ascii(bytes, 8, Math.min(bytes.length - 8, 32));
    if (/avif|avis/.test(brands)) return { kind: 'image', mime: 'image/avif' };
    if (/heic|heix|hevc|hevx|heim|heis|mif1|msf1/.test(brands)) return { kind: 'image', mime: 'image/heif' };
    if (/3gp|3g2/.test(brands)) return { kind: 'video', mime: 'video/3gpp' };
    const brand = ascii(bytes, 8, 4);
    return { kind: 'video', mime: /qt  /.test(brand) ? 'video/quicktime' : 'video/mp4' };
  }
  if (bytes.length >= 4 && bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3) {
    return { kind: 'video', mime: ascii(bytes, 0, bytes.length).includes('webm') ? 'video/webm' : 'video/x-matroska' };
  }
  if (bytes.length >= 12 && ascii(bytes, 0, 4) === 'RIFF' && ascii(bytes, 8, 4) === 'AVI ') {
    return { kind: 'video', mime: 'video/x-msvideo' };
  }
  if (bytes.length >= 4 && ascii(bytes, 0, 4) === 'OggS') {
    return { kind: 'video', mime: 'video/ogg' };
  }
  if (ascii(bytes, 0, 2) === 'BM') return { kind: 'image', mime: 'image/bmp' };
  if (['II*\x00', 'MM\x00*', 'II+\x00', 'MM\x00+'].includes(ascii(bytes, 0, 4))) return { kind: 'image', mime: 'image/tiff' };
  if (bytes.length >= 4 && bytes[0] === 0 && bytes[1] === 0 && bytes[2] === 1 && bytes[3] === 0) return { kind: 'image', mime: 'image/x-icon' };
  if (ascii(bytes, 0, 4) === '8BPS') return { kind: 'image', mime: 'image/vnd.adobe.photoshop' };
  if (ascii(bytes, 4, 8) === 'jP  \r\n\x87\n' || (bytes[0] === 0xff && bytes[1] === 0x4f && bytes[2] === 0xff && bytes[3] === 0x51)) return { kind: 'image', mime: 'image/jp2' };
  if ((bytes[0] === 0xff && bytes[1] === 0x0a) || ascii(bytes, 4, 8) === 'JXL \r\n\x87\n') return { kind: 'image', mime: 'image/jxl' };
  const text = new TextDecoder().decode(bytes).replace(/^\uFEFF/, '').trimStart().replace(/^<\?xml[^>]*\?>\s*/i, '').replace(/^(?:<!--[\s\S]*?-->\s*)*/, '').replace(/^<!DOCTYPE\s+svg\s[^>]*>\s*/i, '');
  if (/^<svg(?:\s|>)/i.test(text)) return { kind: 'image', mime: 'image/svg+xml' };
  if (ascii(bytes, 0, 3) === 'FLV') return { kind: 'video', mime: 'video/x-flv' };
  if (bytes.length >= 16 && bytes.slice(0, 16).every((b, i) => b === [0x30,0x26,0xb2,0x75,0x8e,0x66,0xcf,0x11,0xa6,0xd9,0,0xaa,0,0x62,0xce,0x6c][i])) return { kind: 'video', mime: 'video/x-ms-asf' };
  if (bytes[0] === 0 && bytes[1] === 0 && bytes[2] === 1 && [0xba, 0xb3].includes(bytes[3])) return { kind: 'video', mime: 'video/mpeg' };
  if ((bytes[0] === 0x47 && bytes[188] === 0x47) || (bytes[4] === 0x47 && bytes[196] === 0x47)) return { kind: 'video', mime: 'video/mp2t' };
  // Older QuickTime files may start with a movie or media atom instead of ftyp.
  if (['moov', 'mdat', 'wide'].includes(ascii(bytes, 4, 4))) return { kind: 'video', mime: 'video/quicktime' };
  return null;
}

const declaredKind = (mime = ''): MediaKind | null =>
  mime.startsWith('image/') ? 'image' : mime.startsWith('video/') ? 'video' : null;

export async function validateMediaFile(file: Blob & { name?: string }, expectedKind?: MediaKind) {
  if (!file?.size) throw new Error('Το αρχείο είναι κενό.');
  const bytes = new Uint8Array(await file.slice(0, 4096).arrayBuffer());
  const detected = detectMediaSignature(bytes);
  if (!detected) throw new Error('Το πραγματικό περιεχόμενο του αρχείου δεν είναι υποστηριζόμενη εικόνα ή βίντεο.');
  if (detected.kind === 'image' && file.size > IMAGE_UPLOAD_LIMIT) throw new Error('Η εικόνα πρέπει να είναι έως 30 MB.');
  const claimed = declaredKind(file.type);
  if (claimed && claimed !== detected.kind) throw new Error('Ο δηλωμένος τύπος του αρχείου δεν συμφωνεί με το πραγματικό περιεχόμενό του.');
  if (expectedKind && expectedKind !== detected.kind) throw new Error(`Το αρχείο δεν είναι έγκυρο ${expectedKind === 'image' ? 'αρχείο εικόνας' : 'αρχείο βίντεο'}.`);
  return detected;
}

export async function readMediaMetadata(source: File | string, kind: MediaKind): Promise<MediaMetadata> {
  if (typeof document === 'undefined' || typeof URL === 'undefined') return { width: 1, height: 1 };
  const localUrl = typeof source === 'string' ? source : URL.createObjectURL(source);
  const revoke = typeof source !== 'string';
  try {
    if (kind === 'image') {
      return await new Promise<MediaMetadata>((resolve, reject) => {
        const image = new Image();
        const timer = setTimeout(() => reject(new Error('Η εικόνα δεν αποκωδικοποιήθηκε εγκαίρως.')), 10000);
        image.onload = () => {
          clearTimeout(timer);
          const width = image.naturalWidth;
          const height = image.naturalHeight;
          if (!width || !height) reject(new Error('Η εικόνα δεν έχει έγκυρες διαστάσεις.'));
          else resolve({ width, height });
        };
        image.onerror = () => { clearTimeout(timer); reject(new Error('Η εικόνα δεν αποκωδικοποιείται.')); };
        image.src = localUrl;
      });
    }
    return await new Promise<MediaMetadata>((resolve, reject) => {
      const video = document.createElement('video');
      const cleanup = () => {
        video.onloadedmetadata = null;
        video.onerror = null;
        video.removeAttribute('src');
        video.load();
      };
      const timer = setTimeout(() => { cleanup(); reject(new Error('Το βίντεο δεν φόρτωσε metadata εγκαίρως.')); }, 12000);
      video.preload = 'metadata';
      video.muted = true;
      video.onloadedmetadata = () => {
        clearTimeout(timer);
        const metadata = { width: video.videoWidth, height: video.videoHeight, duration: video.duration };
        cleanup();
        if (!metadata.width || !metadata.height || !Number.isFinite(metadata.duration) || metadata.duration <= 0) {
          reject(new Error('Το βίντεο δεν έχει έγκυρες διαστάσεις ή διάρκεια.'));
        } else resolve(metadata);
      };
      video.onerror = () => { clearTimeout(timer); cleanup(); reject(new Error('Το βίντεο δεν αναπαράγεται στον browser.')); };
      video.src = localUrl;
    });
  } finally {
    if (revoke) URL.revokeObjectURL(localUrl);
  }
}

export async function validatePreparedMedia(file: File, expectedKind: MediaKind) {
  const detected = await validateMediaFile(file, expectedKind);
  const metadata = await readMediaMetadata(file, expectedKind);
  return { ...detected, ...metadata };
}

export async function verifyStoredMedia(url: string, expectedKind: MediaKind): Promise<MediaMetadata> {
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    throw new Error('Το αποθηκευμένο media URL δεν είναι έγκυρο.');
  }
  const isLocalEmulator = parsedUrl.protocol === 'http:' && ['127.0.0.1', 'localhost', '[::1]'].includes(parsedUrl.hostname);
  if (parsedUrl.protocol !== 'https:' && !isLocalEmulator) {
    throw new Error('Το αποθηκευμένο media URL δεν είναι ασφαλές HTTPS URL.');
  }
  const metadata = await readMediaMetadata(url, expectedKind);
  const pageOrigin = typeof location !== 'undefined' ? location.origin : '';
  // Firebase download URLs may be readable as image/video elements while a
  // custom Range fetch is rejected by the bucket's CORS policy. Decoding above
  // verifies the actual stored bytes without that unnecessary cross-origin fetch.
  if (shouldFetchStoredMediaBytes(url, pageOrigin)) {
    const response = await fetch(url, { headers: { Range: 'bytes=0-63' }, cache: 'no-store' });
    if (!response.ok) throw new Error(`Το αποθηκευμένο αρχείο δεν φορτώνει (HTTP ${response.status}).`);
    const bytes = new Uint8Array(await response.arrayBuffer());
    const detected = detectMediaSignature(bytes);
    if (!detected || detected.kind !== expectedKind) throw new Error('Το αποθηκευμένο URL δεν επιστρέφει έγκυρο media περιεχόμενο.');
    const contentType = response.headers.get('content-type') || detected.mime;
    if (declaredKind(contentType) && declaredKind(contentType) !== expectedKind) throw new Error('Το αποθηκευμένο MIME type δεν συμφωνεί με το media.');
    return { ...metadata, mime: contentType };
  }
  return metadata;
}
