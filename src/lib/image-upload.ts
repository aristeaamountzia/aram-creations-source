import { validateMediaFile, readMediaMetadata } from './media-validation';

async function decodeHeif(file: File): Promise<Blob> {
  const worker = new Worker(new URL('./heif-decoder.worker.ts', import.meta.url), { type: 'module' });
  return new Promise((resolve, reject) => {
    const finish = () => { clearTimeout(timer); worker.terminate(); };
    const timer = setTimeout(() => { finish(); reject(new Error('Η μετατροπή HEIC/HEIF ξεπέρασε τα 60 δευτερόλεπτα.')); }, 60000);
    worker.onerror = event => { finish(); reject(new Error(event.message || 'Δεν φορτώθηκε ο αποκωδικοποιητής HEIC/HEIF.')); };
    worker.onmessage = ({ data }) => { finish(); data.blob?.size ? resolve(data.blob) : reject(new Error(data.error || 'Δεν μετατράπηκε η εικόνα HEIC/HEIF.')); };
    worker.postMessage(file);
  });
}

export async function isAnimatedImage(file: Blob, mime: string) {
  if (mime === 'image/gif') return true;
  if (!['image/png', 'image/webp', 'image/avif'].includes(mime)) return false;
  const bytes = new Uint8Array(await file.arrayBuffer());
  const ascii = (offset: number, length: number) => String.fromCharCode(...bytes.subarray(offset, offset + length));
  if (mime === 'image/avif') return ascii(8, Math.min(64, bytes.length - 8)).includes('avis');
  const view = new DataView(bytes.buffer);
  for (let offset = mime === 'image/png' ? 8 : 12; offset + 8 <= bytes.length;) {
    const png = mime === 'image/png';
    const size = view.getUint32(offset + (png ? 0 : 4), !png);
    const type = ascii(offset + (png ? 4 : 0), 4);
    if (type === 'acTL' || type === 'ANIM') return true;
    const next = offset + 8 + size + (png ? 4 : size % 2);
    if (next <= offset || next > bytes.length) break;
    offset = next;
  }
  return false;
}

async function loadImage(blob: Blob): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(blob);
  try {
    return await new Promise((resolve, reject) => {
      const image = new Image();
      image.referrerPolicy = 'no-referrer';
      const timer = setTimeout(() => reject(new Error('Η εικόνα δεν αποκωδικοποιήθηκε σε 15 δευτερόλεπτα.')), 15000);
      image.onload = () => { clearTimeout(timer); image.naturalWidth && image.naturalHeight ? resolve(image) : reject(new Error('Η εικόνα δεν έχει έγκυρες διαστάσεις.')); };
      image.onerror = () => { clearTimeout(timer); reject(new Error('Ο browser δεν αποκωδικοποιεί αυτή τη μορφή εικόνας.')); };
      image.src = url;
    });
  } finally { URL.revokeObjectURL(url); }
}

async function decodeLegacyImage(file: File): Promise<Blob> {
  const { withMediaCodec, codecFailure } = await import('./media-codecs');
  return withMediaCodec(async (codec, log) => {
    await codec.mount('WORKERFS' as any, { blobs: [{ name: 'source', data: file }] }, '/input');
    const status = await codec.exec(['-i', '/input/source', '-frames:v', '1', '-vf', "scale=w='min(1600,iw)':h='min(1600,ih)':force_original_aspect_ratio=decrease", '/output.png'], 60000);
    if (status !== 0) throw new Error(`Δεν μετατράπηκε η εικόνα ${file.name}: ${codecFailure(log)}`);
    const bytes = await codec.readFile('/output.png');
    if (!(bytes instanceof Uint8Array) || !bytes.byteLength) throw new Error('Η μετατροπή δεν παρήγαγε εικόνα.');
    return new Blob([bytes as Uint8Array<ArrayBuffer>], { type: 'image/png' });
  });
}

export async function prepareImageUpload(file: File, maxSize = 1200, quality = 0.8, keepSmall = false): Promise<File> {
  const detected = await validateMediaFile(file, 'image');
  // Normalize absent/incorrect MIME before preview/storage while preserving animation bytes.
  const normalized = new File([file], file.name, { type: detected.mime, lastModified: file.lastModified });
  if (await isAnimatedImage(file, detected.mime)) {
    await readMediaMetadata(normalized, 'image');
    return normalized;
  }
  let image: HTMLImageElement;
  let converted = false;
  try { image = await loadImage(normalized); }
  catch {
    converted = true;
    const decoded = detected.mime === 'image/heif' ? await decodeHeif(file) : await decodeLegacyImage(file);
    image = await loadImage(decoded);
  }
  if (keepSmall && !converted && detected.mime !== 'image/svg+xml' && image.naturalWidth <= maxSize && image.naturalHeight <= maxSize && file.size < 1.5 * 1024 * 1024) return normalized;
  const scale = Math.min(1, maxSize / Math.max(image.naturalWidth, image.naturalHeight));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Δεν ξεκίνησε η επεξεργασία εικόνας.');
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', quality));
  if (!blob?.size) throw new Error('Δεν δημιουργήθηκε έγκυρη εικόνα JPEG.');
  return new File([blob], file.name.replace(/\.[^/.]+$/, '') + '.jpg', { type: 'image/jpeg', lastModified: Date.now() });
}
