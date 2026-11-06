import { validateVideoInput, VIDEO_UPLOAD_LIMIT, videoSize } from './video-policy';
export type VideoProgress = { text: string; percent?: number };
export type VideoUploadOptions = { stripAudio?: boolean };

async function canBrowserPlayVideoFile(file: File): Promise<boolean> {
  if (typeof document === 'undefined' || typeof URL === 'undefined' || !URL.createObjectURL) {
    return true;
  }
  return new Promise<boolean>((resolve) => {
    const url = URL.createObjectURL(file);
    const v = document.createElement('video');
    v.muted = true;
    v.preload = 'metadata';
    const done = (ok: boolean) => {
      clearTimeout(t);
      v.onloadedmetadata = null;
      v.onerror = null;
      v.removeAttribute('src');
      v.load();
      URL.revokeObjectURL(url);
      resolve(ok);
    };
    const t = setTimeout(() => done(false), 6000);
    v.onloadedmetadata = () => done(v.videoWidth > 0 && v.videoHeight > 0);
    v.onerror = () => done(false);
    v.src = url;
  });
}

async function transcodeVideoViaServer(
  file: File,
  onProgress: (value: VideoProgress) => void,
  signal?: AbortSignal,
  options?: VideoUploadOptions,
  reasonText?: string
): Promise<File> {
  if (signal?.aborted) throw new DOMException('Η συμπίεση ακυρώθηκε.', 'AbortError');
  const stripAudioParam = options?.stripAudio ? '1' : '0';
  onProgress({
    text: reasonText || `Μετατροπή ${file.name} (${videoSize(file.size)}) σε συμβατό H.264 (MP4)… 5%`,
    percent: 5,
  });

  return new Promise<File>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `/api/video-transcode?stripAudio=${stripAudioParam}`, true);
    xhr.responseType = 'blob';
    xhr.setRequestHeader('Content-Type', file.type || 'video/mp4');

    let progressTimer: ReturnType<typeof setInterval> | null = null;
    let simulatedPct = 45;

    const cleanup = () => {
      if (progressTimer) clearInterval(progressTimer);
      signal?.removeEventListener('abort', onAbort);
    };

    const onAbort = () => {
      cleanup();
      xhr.abort();
      reject(new DOMException('Η μετατροπή βίντεο ακυρώθηκε.', 'AbortError'));
    };
    signal?.addEventListener('abort', onAbort, { once: true });

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && event.total > 0) {
        const uploadPct = Math.min(45, Math.max(5, Math.round((event.loaded / event.total) * 45)));
        onProgress({
          text: `Αποστολή ${file.name} για μετατροπή HEVC → H.264: ${uploadPct}%`,
          percent: uploadPct,
        });
        if (event.loaded >= event.total && !progressTimer) {
          progressTimer = setInterval(() => {
            simulatedPct = Math.min(94, simulatedPct + 4);
            onProgress({
              text: `Κωδικοποίηση βίντεο σε καθολικά συμβατό H.264 (MP4): ${simulatedPct}%`,
              percent: simulatedPct,
            });
          }, 600);
        }
      }
    };

    xhr.onload = () => {
      cleanup();
      if (xhr.status >= 200 && xhr.status < 300 && xhr.response instanceof Blob && xhr.response.size > 0) {
        if (xhr.response.size > VIDEO_UPLOAD_LIMIT) {
          reject(new Error(`Το μετατρεπόμενο βίντεο (${videoSize(xhr.response.size)}) υπερβαίνει το όριο των 30 MB.`));
          return;
        }
        const outFile = new File(
          [xhr.response],
          file.name.replace(/\.[^/.]+$/, '') + '-h264.mp4',
          { type: 'video/mp4', lastModified: Date.now() }
        );
        onProgress({
          text: `Μετατροπή σε H.264 ολοκληρώθηκε: ${videoSize(file.size)} → ${videoSize(outFile.size)}.`,
          percent: 100,
        });
        resolve(outFile);
      } else {
        reject(new Error(`Αποτυχία μετατροπής βίντεο σε H.264 (HTTP ${xhr.status}). Εξάγετε το βίντεο σε μορφή MP4 (H.264/AVC).`));
      }
    };

    xhr.onerror = () => {
      cleanup();
      reject(new Error('Αποτυχία σύνδεσης με την υπηρεσία μετατροπής βίντεο H.264.'));
    };

    xhr.send(file);
  });
}

export async function prepareVideoUpload(
  file: File,
  onProgress: (value: VideoProgress) => void,
  signal?: AbortSignal,
  options?: VideoUploadOptions
): Promise<File> {
  validateVideoInput(file);
  if (signal?.aborted) throw new DOMException('Η συμπίεση ακυρώθηκε.', 'AbortError');
  onProgress({ text: `Προετοιμασία ${file.name} (${videoSize(file.size)})…`, percent: 0 });
  const canKeepOriginal = !options?.stripAudio
    && file.size <= VIDEO_UPLOAD_LIMIT
    && (/^video\//.test(file.type) || /\.(mp4|webm|mov|m4v|mkv|avi|ogv)$/i.test(file.name));
  let worker: Worker;
  try {
    worker = new Worker(new URL('./video-compression.worker.ts', import.meta.url), { type: 'module' });
  } catch (error) {
    if (canKeepOriginal) {
      onProgress({ text: `Η συμπίεση δεν ξεκίνησε. Διατηρήθηκε το αρχικό βίντεο (${videoSize(file.size)}).`, percent: 100 });
      return file;
    }
    throw error instanceof Error ? error : new Error(String(error));
  }
  return new Promise((resolve, reject) => {
    let finished = false;
    const cleanup = () => { worker.terminate(); clearTimeout(timer); signal?.removeEventListener('abort', cancel); };
    const handleFallbackOrTranscode = async (error: Error, forceServerTranscode = false, transcodeReason?: string) => {
      if (finished) return;
      finished = true;
      cleanup();

      // If user aborted explicitly, honor cancellation
      if (error.name === 'AbortError' || signal?.aborted) {
        reject(error);
        return;
      }

      const browserCanPlay = forceServerTranscode ? false : await canBrowserPlayVideoFile(file);
      if (!browserCanPlay) {
        try {
          const transcoded = await transcodeVideoViaServer(file, onProgress, signal, options, transcodeReason);
          resolve(transcoded);
          return;
        } catch (transcodeErr: any) {
          reject(
            new Error(
              transcodeErr?.message ||
                'Το βίντεο είναι κωδικοποιημένο σε HEVC (H.265) που δεν αναπαράγεται στους περισσότερους browsers. Παρακαλώ μετατρέψτε το σε MP4 (H.264).'
            )
          );
          return;
        }
      }

      // Safe fallback: if original file is already <= 30 MB and is a standard video, keep original file
      if (canKeepOriginal) {
        onProgress({ text: `Το αρχικό βίντεο είναι ήδη κάτω από 30 MB (${videoSize(file.size)}) και διατηρήθηκε.`, percent: 100 });
        resolve(file);
        return;
      }

      reject(error);
    };
    const cancel = () => {
      if (finished) return;
      finished = true;
      cleanup();
      reject(new DOMException('Η συμπίεση ακυρώθηκε. Το βίντεο δεν ανέβηκε.', 'AbortError'));
    };
    const timer = setTimeout(() => {
      void handleFallbackOrTranscode(new Error('Η συμπίεση καθυστέρησε πολύ. Δοκίμασε μικρότερο βίντεο.'));
    }, 15 * 60 * 1000);
    signal?.addEventListener('abort', cancel, { once: true });
    worker.onerror = () => {
      void handleFallbackOrTranscode(new Error('Δεν ξεκίνησε η συμπίεση. Ανανέωσε τη σελίδα και δοκίμασε ξανά.'));
    };
    worker.onmessage = ({ data }) => {
      if (finished) return;
      if (data.type === 'progress') {
        onProgress({ text: `${data.attempt ? 'Δεύτερη συμπίεση' : 'Συμπίεση'} ${file.name}: ${data.progress}%`, percent: data.progress });
        return;
      }
      if (data.type === 'needs-server-transcode') {
        void handleFallbackOrTranscode(new Error(data.message), true, data.message);
        return;
      }
      if (data.type === 'error') {
        void handleFallbackOrTranscode(new Error(data.message));
        return;
      }
      if (data.type === 'done') {
        if (!data.blob?.size || data.blob.size > VIDEO_UPLOAD_LIMIT) {
          void handleFallbackOrTranscode(new Error('Το τελικό βίντεο πρέπει να είναι έως 30 MB.'));
          return;
        }
        const keepOriginalInstead = !options?.stripAudio && file.size <= VIDEO_UPLOAD_LIMIT && file.size < data.blob.size;
        const result = keepOriginalInstead ? file : new File([data.blob], file.name.replace(/\.[^/.]+$/, '') + `-compressed.${data.extension}`, { type: data.blob.type, lastModified: Date.now() });
        finished = true;
        cleanup();
        onProgress({ text: result === file ? `Το βίντεο είναι ήδη μικρό: ${videoSize(file.size)}. Διατηρήθηκε το αρχικό αρχείο.` : `Συμπίεση ολοκληρώθηκε: ${videoSize(file.size)} → ${videoSize(result.size)}.`, percent: 100 });
        resolve(result);
      }
    };
    worker.postMessage({ file, stripAudio: Boolean(options?.stripAudio) });
  });
}
