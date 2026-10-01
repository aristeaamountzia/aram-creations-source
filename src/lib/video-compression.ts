import { validateVideoInput, VIDEO_UPLOAD_LIMIT, videoSize } from './video-policy';
export type VideoProgress = { text: string; percent?: number };
export async function prepareVideoUpload(file: File, onProgress: (value: VideoProgress) => void, signal?: AbortSignal): Promise<File> {
  validateVideoInput(file);
  if (signal?.aborted) throw new DOMException('Η συμπίεση ακυρώθηκε.', 'AbortError');
  onProgress({ text: `Προετοιμασία ${file.name} (${videoSize(file.size)})…`, percent: 0 });
  const worker = new Worker(new URL('./video-compression.worker.ts', import.meta.url), { type: 'module' });
  return new Promise((resolve, reject) => {
    let finished = false;
    const cleanup = () => { worker.terminate(); clearTimeout(timer); signal?.removeEventListener('abort', cancel); };
    const fail = (error: Error) => { if (finished) return; finished = true; cleanup(); reject(error); };
    const cancel = () => fail(new DOMException('Η συμπίεση ακυρώθηκε. Το βίντεο δεν ανέβηκε.', 'AbortError'));
    const timer = setTimeout(() => fail(new Error('Η συμπίεση καθυστέρησε πολύ. Δοκίμασε μικρότερο βίντεο.')), 15 * 60 * 1000);
    signal?.addEventListener('abort', cancel, { once: true });
    worker.onerror = () => fail(new Error('Δεν ξεκίνησε η συμπίεση. Ανανέωσε τη σελίδα και δοκίμασε ξανά.'));
    worker.onmessage = ({ data }) => {
      if (finished) return;
      if (data.type === 'progress') { onProgress({ text: `${data.attempt ? 'Δεύτερη συμπίεση' : 'Συμπίεση'} ${file.name}: ${data.progress}%`, percent: data.progress }); return; }
      if (data.type === 'error') { fail(new Error(data.message)); return; }
      if (data.type === 'done') {
        if (!data.blob?.size || data.blob.size > VIDEO_UPLOAD_LIMIT) { fail(new Error('Το τελικό βίντεο πρέπει να είναι έως 30 MB.')); return; }
        const result = file.size <= VIDEO_UPLOAD_LIMIT && file.size < data.blob.size ? file : new File([data.blob], file.name.replace(/\.[^/.]+$/, '') + `-compressed.${data.extension}`, { type: data.blob.type, lastModified: Date.now() });
        finished = true; cleanup();
        onProgress({ text: result === file ? `Το βίντεο είναι ήδη μικρό: ${videoSize(file.size)}. Διατηρήθηκε το αρχικό αρχείο.` : `Συμπίεση ολοκληρώθηκε: ${videoSize(file.size)} → ${videoSize(result.size)}.`, percent: 100 });
        resolve(result);
      }
    };
    worker.postMessage(file);
  });
}

