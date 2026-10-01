import { editableBlob } from './media-files';
import type { Thumbnail } from './catalog-excel';

export async function loadExcelThumbnail(url: string, signal?: AbortSignal): Promise<Thumbnail> {
  signal?.throwIfAborted();
  let blob: Blob;
  const controller = new AbortController();
  const cancel = () => controller.abort();
  signal?.addEventListener('abort', cancel, { once: true });
  const timer = setTimeout(cancel, 15000);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok || !response.headers.get('content-type')?.startsWith('image/')) throw new Error('Η εικόνα δεν φορτώθηκε.');
    blob = await response.blob();
  } catch {
    signal?.throwIfAborted();
    // Authenticated existing media proxy also handles missing CORS headers/tokens.
    blob = await editableBlob({ url }, signal);
  } finally { clearTimeout(timer); signal?.removeEventListener('abort', cancel); }
  signal?.throwIfAborted();
  const image = await createImageBitmap(blob, { resizeWidth: 160, resizeQuality: 'high' });
  try {
    const canvas = document.createElement('canvas'); canvas.width = 160; canvas.height = 160;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Δεν είναι διαθέσιμη η δημιουργία μικρογραφίας.');
    context.fillStyle = '#ffffff'; context.fillRect(0, 0, 160, 160);
    const scale = Math.min(160 / image.width, 160 / image.height);
    const width = image.width * scale, height = image.height * scale;
    context.drawImage(image, (160 - width) / 2, (160 - height) / 2, width, height);
    return { base64: canvas.toDataURL('image/jpeg', 0.76), extension: 'jpeg' };
  } finally { image.close(); }
}
