import { Input, Output, ALL_FORMATS, BlobSource, BufferTarget, Mp4OutputFormat, WebMOutputFormat, Conversion, Quality, getFirstEncodableVideoCodec, getFirstEncodableAudioCodec } from 'mediabunny';
import { validateVideoInput, videoEncodingPlan, VIDEO_UPLOAD_LIMIT } from './video-policy';

interface WorkerPayload {
  file: File;
  stripAudio?: boolean;
}

const scope = self as unknown as { onmessage: (event: MessageEvent<File | WorkerPayload>) => void; postMessage: (message: unknown) => void };
scope.onmessage = async ({ data }) => {
  const payload = data as any;
  const file: File = (payload?.file instanceof File) ? payload.file : (payload instanceof File) ? payload : payload?.file;
  const stripAudioRequested = payload instanceof File ? false : Boolean(payload?.stripAudio);
  if (!file) {
    scope.postMessage({ type: 'error', message: 'Δεν βρέθηκε αρχείο βίντεο.' });
    return;
  }

  let input: Input | undefined;
  try {
    validateVideoInput(file);
    input = new Input({ formats: ALL_FORMATS, source: new BlobSource(file) });
    const video = await input.getPrimaryVideoTrack();
    const audio = await input.getPrimaryAudioTrack();
    if (!video) throw new Error('Το αρχείο δεν περιέχει αναγνώσιμο βίντεο.');

    const duration = await input.computeDuration();
    const originalWidth = await video.getDisplayWidth();
    const originalHeight = await video.getDisplayHeight();

    const canDecodeAudio = !stripAudioRequested && audio ? await audio.canDecode().catch(() => false) : false;
    let keepAudio = Boolean(audio && canDecodeAudio && !stripAudioRequested);

    for (let attempt = 0; attempt < 2; attempt++) {
      const plan = videoEncodingPlan(originalWidth, originalHeight, duration, keepAudio, attempt > 0);

      // 1. Prioritize standard MP4 (AVC / H.264)
      let videoCodec = await getFirstEncodableVideoCodec(['avc'], { width: plan.width, height: plan.height, bitrate: plan.bitrate, frameRate: 30 });
      let mp4 = Boolean(videoCodec);
      let audioCodec: 'aac' | 'opus' | null = null;

      if (mp4 && keepAudio) {
        audioCodec = (await getFirstEncodableAudioCodec(['aac'], { numberOfChannels: 2, sampleRate: 48000, bitrate: plan.audioBitrate }).catch(() => null)) as 'aac' | null;
        if (!audioCodec) {
          // AAC encoding not available in WebCodecs environment; gracefully drop audio and keep MP4 video
          keepAudio = false;
        }
      }

      // 2. If AVC is not encodable, fallback to WebM (VP9/VP8)
      if (!videoCodec) {
        videoCodec = await getFirstEncodableVideoCodec(['vp9', 'vp8'], { width: plan.width, height: plan.height, bitrate: plan.bitrate, frameRate: 30 });
        mp4 = false;
        if (videoCodec && keepAudio) {
          audioCodec = (await getFirstEncodableAudioCodec(['opus'], { numberOfChannels: 2, sampleRate: 48000, bitrate: plan.audioBitrate }).catch(() => null)) as 'opus' | null;
          if (!audioCodec) {
            keepAudio = false;
          }
        }
      }

      if (!videoCodec) {
        throw new Error('Ο browser δεν υποστηρίζει συμπίεση αυτού του βίντεο. Δοκιμάστε πρόσφατο Chrome ή Edge.');
      }

      // Initialize conversion
      let target = new BufferTarget();
      let output = new Output({ target, format: mp4 ? new Mp4OutputFormat({ fastStart: 'in-memory' }) : new WebMOutputFormat() });
      let conversion: Conversion | null = null;

      try {
        conversion = await Conversion.init({
          input,
          output,
          tracks: 'primary',
          tags: {},
          showWarnings: false,
          video: { width: plan.width, height: plan.height, fit: 'contain', frameRate: 30, codec: videoCodec, quality: new Quality({ bitrate: plan.bitrate }), forceTranscode: true, keyFrameInterval: 2 },
          audio: keepAudio && audioCodec ? { codec: audioCodec, quality: new Quality({ bitrate: plan.audioBitrate }), sampleRate: 48000, numberOfChannels: 2, forceTranscode: true } : { discard: true },
        });
      } catch {
        // If conversion initialization threw with audio, retry fresh with audio discarded
        if (keepAudio) {
          keepAudio = false;
          target = new BufferTarget();
          output = new Output({ target, format: mp4 ? new Mp4OutputFormat({ fastStart: 'in-memory' }) : new WebMOutputFormat() });
          conversion = await Conversion.init({
            input,
            output,
            tracks: 'primary',
            tags: {},
            showWarnings: false,
            video: { width: plan.width, height: plan.height, fit: 'contain', frameRate: 30, codec: videoCodec, quality: new Quality({ bitrate: plan.bitrate }), forceTranscode: true, keyFrameInterval: 2 },
            audio: { discard: true },
          }).catch(() => null);
        }
      }

      // If conversion is not valid with audio, retry fresh without audio
      if ((!conversion || !conversion.isValid) && keepAudio) {
        if (conversion) await conversion.cancel().catch(() => {});
        keepAudio = false;
        target = new BufferTarget();
        output = new Output({ target, format: mp4 ? new Mp4OutputFormat({ fastStart: 'in-memory' }) : new WebMOutputFormat() });
        conversion = await Conversion.init({
          input,
          output,
          tracks: 'primary',
          tags: {},
          showWarnings: false,
          video: { width: plan.width, height: plan.height, fit: 'contain', frameRate: 30, codec: videoCodec, quality: new Quality({ bitrate: plan.bitrate }), forceTranscode: true, keyFrameInterval: 2 },
          audio: { discard: true },
        }).catch(() => null);
      }

      if (!conversion || !conversion.isValid) {
        if (conversion) await conversion.cancel().catch(() => {});
        throw new Error('Δεν ήταν δυνατή η συμπίεση του βίντεο. Δοκιμάστε αρχείο MP4 με H.264.');
      }

      let oversize = false;
      const stop = target.on('write', ({ end }) => {
        if (end > VIDEO_UPLOAD_LIMIT && !oversize) {
          oversize = true;
          void conversion?.cancel().catch(() => {});
        }
      });

      conversion.onProgress = value => scope.postMessage({ type: 'progress', progress: Math.min(99, Math.floor(value * 100)), attempt });

      try {
        await conversion.execute();
      } catch (error) {
        if (!oversize) throw error;
      } finally {
        stop();
      }

      if (!oversize && target.buffer && target.buffer.byteLength <= VIDEO_UPLOAD_LIMIT) {
        const blob = new Blob([target.buffer], { type: mp4 ? 'video/mp4' : 'video/webm' });
        if (!blob.size) throw new Error('Δεν δημιουργήθηκε έγκυρο βίντεο.');
        scope.postMessage({ type: 'done', blob, extension: mp4 ? 'mp4' : 'webm', width: plan.width, height: plan.height, duration });
        return;
      }
    }

    throw new Error('Το συμπιεσμένο βίντεο παραμένει πάνω από 30 MB. Επιλέξτε μικρότερο απόσπασμα.');
  } catch (error: any) {
    scope.postMessage({ type: 'error', message: error.message || 'Δεν ολοκληρώθηκε η συμπίεση του βίντεο.' });
  } finally {
    input?.dispose();
  }
};
