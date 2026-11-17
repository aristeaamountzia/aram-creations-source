import { validateVideoInput, VIDEO_UPLOAD_LIMIT, videoSize } from './video-policy';
import { validateMediaFile, readMediaMetadata } from './media-validation';
export type VideoProgress = { text: string; percent?: number };
export type VideoUploadOptions = { stripAudio?: boolean };

function compressWithWebCodecs(file: File, onProgress: (value: VideoProgress) => void, signal?: AbortSignal, options?: VideoUploadOptions): Promise<File> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./video-compression.worker.ts', import.meta.url), { type: 'module' });
    const cleanup = () => { worker.terminate(); clearTimeout(timer); signal?.removeEventListener('abort', cancel); };
    const fail = (error: Error) => { cleanup(); reject(error); };
    const cancel = () => fail(new DOMException('Η συμπίεση ακυρώθηκε.', 'AbortError'));
    const timer = setTimeout(() => fail(new Error('Η γρήγορη συμπίεση ξεπέρασε τα 15 λεπτά.')), 15 * 60 * 1000);
    signal?.addEventListener('abort', cancel, { once: true });
    if (signal?.aborted) { cancel(); return; }
    worker.onerror = event => fail(new Error(event.message || 'Δεν ξεκίνησε η γρήγορη συμπίεση βίντεο.'));
    worker.onmessage = ({ data }) => {
      if (data.type === 'progress') {
        onProgress({ text: `${data.attempt ? 'Δεύτερη συμπίεση' : 'Συμπίεση'} ${file.name}: ${data.progress}%`, percent: data.progress });
      } else if (data.type === 'done') {
        if (!data.blob?.size || data.blob.size > VIDEO_UPLOAD_LIMIT || data.blob.type !== 'video/mp4') { fail(new Error('Δεν δημιουργήθηκε MP4 έως 30 MB.')); return; }
        cleanup();
        resolve(new File([data.blob], file.name.replace(/\.[^/.]+$/, '') + '-compressed.mp4', { type: 'video/mp4', lastModified: Date.now() }));
      } else if (data.type === 'error' || data.type === 'needs-transcode') {
        fail(new Error(data.message));
      }
    };
    worker.postMessage({ file, stripAudio: Boolean(options?.stripAudio) });
  });
}

export async function prepareVideoUpload(file: File, onProgress: (value: VideoProgress) => void, signal?: AbortSignal, options?: VideoUploadOptions): Promise<File> {
  const detected = await validateMediaFile(file, 'video');
  const normalized = new File([file], file.name, { type: detected.mime, lastModified: file.lastModified });
  validateVideoInput(normalized);
  if (signal?.aborted) throw new DOMException('Η συμπίεση ακυρώθηκε.', 'AbortError');
  onProgress({ text: `Προετοιμασία ${file.name} (${videoSize(file.size)})…`, percent: 0 });
  let result: File;
  try {
    result = await compressWithWebCodecs(normalized, onProgress, signal, options);
    await readMediaMetadata(result, 'video');
  } catch (error) {
    if (signal?.aborted || (error instanceof Error && error.name === 'AbortError')) throw new DOMException('Η μετατροπή ακυρώθηκε.', 'AbortError');
    const { transcodeVideoInBrowser } = await import('./video-transcode-browser');
    result = await transcodeVideoInBrowser(normalized, onProgress, signal, options);
    await readMediaMetadata(result, 'video');
  }
  if (signal?.aborted) throw new DOMException('Η μετατροπή ακυρώθηκε.', 'AbortError');
  onProgress({ text: `Συμπίεση ολοκληρώθηκε: ${videoSize(file.size)} → ${videoSize(result.size)}.`, percent: 100 });
  return result;
}
