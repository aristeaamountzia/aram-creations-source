import type { FFmpeg } from '@ffmpeg/ffmpeg';

export const codecAbort = () => new DOMException('Η μετατροπή ακυρώθηκε.', 'AbortError');
let queue: Promise<unknown> = Promise.resolve();

/** Serialize expensive conversions; each worker is released after its job. */
export function withMediaCodec<T>(
  run: (codec: FFmpeg, log: string[]) => Promise<T>,
  signal?: AbortSignal,
  onLoading?: () => void,
): Promise<T> {
  const job = queue.catch(() => {}).then(async () => {
    if (signal?.aborted) throw codecAbort();
    onLoading?.();
    const { FFmpeg } = await import('@ffmpeg/ffmpeg');
    if (signal?.aborted) throw codecAbort();
    const codec = new FFmpeg();
    const log: string[] = [];
    codec.on('log', ({ message }) => { log.push(message); if (log.length > 25) log.shift(); });
    const abort = () => codec.terminate();
    signal?.addEventListener('abort', abort, { once: true });
    let timedOut = false;
    const timer = setTimeout(() => { timedOut = true; abort(); }, 15 * 60 * 1000);
    try {
      let loadTimer: ReturnType<typeof setTimeout>;
      try {
        await Promise.race([
          codec.load({
            classWorkerURL: new URL('/codecs/ffmpeg-0.12.15/worker.js', location.origin).href,
            coreURL: new URL('/codecs/core-0.12.10/ffmpeg-core.js', location.origin).href,
            wasmURL: new URL('/codecs/core-0.12.10/ffmpeg-core.wasm', location.origin).href,
          }),
          new Promise<never>((_, reject) => { loadTimer = setTimeout(() => reject(new Error('Τα εργαλεία μετατροπής δεν φορτώθηκαν σε 90 δευτερόλεπτα. Έλεγξε τη σύνδεση και δοκίμασε ξανά.')), 90000); }),
        ]);
      } finally { clearTimeout(loadTimer); }
      await codec.createDir('/input');
      return await run(codec, log);
    } catch (error) {
      if (signal?.aborted) throw codecAbort();
      if (timedOut) throw new Error('Η μετατροπή ξεπέρασε τα 15 λεπτά. Επίλεξε μικρότερο αρχείο.');
      throw error instanceof Error ? error : new Error(String(error));
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener('abort', abort);
      codec.terminate();
    }
  });
  queue = job;
  // A queued cancellation rejects immediately, without interrupting another file.
  if (!signal) return job;
  return new Promise<T>((resolve, reject) => {
    const abort = () => reject(codecAbort());
    signal.addEventListener('abort', abort, { once: true });
    if (signal.aborted) abort();
    job.then(resolve, reject).finally(() => signal.removeEventListener('abort', abort));
  });
}

export function codecFailure(log: string[]) {
  return log.filter(line => /error|invalid|unsupported|not found|could not|failed|not implemented/i.test(line)).slice(-3).join(' · ')
    || log.slice(-2).join(' · ') || 'Δεν δημιουργήθηκε αποκωδικοποιήσιμο αρχείο.';
}
