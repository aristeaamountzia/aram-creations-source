import { editableBlob } from './media-files';
import type { Thumbnail } from './catalog-excel';

export async function loadExcelThumbnail(url: string, signal?: AbortSignal): Promise<Thumbnail> {
  signal?.throwIfAborted();
  const blob = await editableBlob({ url }, signal);
  signal?.throwIfAborted();
  // Safari and some image formats cannot be decoded with createImageBitmap.
  let image: ImageBitmap | HTMLImageElement;
  try {
    image = await createImageBitmap(blob, { resizeWidth: 160, resizeQuality: 'high' });
  } catch {
    signal?.throwIfAborted();
    const objectUrl = URL.createObjectURL(blob);
    try {
      const element = new Image();
      element.src = objectUrl;
      await element.decode();
      image = element;
    } finally { URL.revokeObjectURL(objectUrl); }
  }
  signal?.throwIfAborted();
  try {
    const canvas = document.createElement('canvas'); canvas.width = 160; canvas.height = 160;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Δεν είναι διαθέσιμη η δημιουργία μικρογραφίας.');
    context.fillStyle = '#ffffff'; context.fillRect(0, 0, 160, 160);
    const scale = Math.min(160 / image.width, 160 / image.height);
    const width = image.width * scale, height = image.height * scale;
    context.drawImage(image, (160 - width) / 2, (160 - height) / 2, width, height);
    return { base64: canvas.toDataURL('image/jpeg', 0.76), extension: 'jpeg' };
  } finally { if ('close' in image) image.close(); }
}
