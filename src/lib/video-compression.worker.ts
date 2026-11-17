import { Input, Output, ALL_FORMATS, BlobSource, BufferTarget, Mp4OutputFormat, Conversion, Quality, getFirstEncodableVideoCodec, getFirstEncodableAudioCodec } from 'mediabunny';
import { validateVideoInput, videoEncodingPlan, VIDEO_UPLOAD_LIMIT } from './video-policy';

const scope = self as unknown as { onmessage: (event: MessageEvent<{ file: File; stripAudio?: boolean }>) => void; postMessage: (message: unknown) => void };
scope.onmessage = async ({ data: { file, stripAudio } }) => {
  let input: Input | undefined;
  try {
    validateVideoInput(file);
    input = new Input({ formats: ALL_FORMATS, source: new BlobSource(file) });
    const video = await input.getPrimaryVideoTrack();
    const audio = await input.getPrimaryAudioTrack();
    if (!video) throw new Error('Το αρχείο δεν περιέχει αναγνώσιμο βίντεο.');
    const duration = await input.computeDuration();
    const width = await video.getDisplayWidth(), height = await video.getDisplayHeight();
    if (video.codec === 'hevc' || !await video.canDecode()) throw new Error('Απαιτείται μετατροπή του codec βίντεο.');
    const keepAudio = Boolean(audio && !stripAudio);
    if (keepAudio && !await audio.canDecode()) throw new Error('Απαιτείται μετατροπή του codec ήχου.');
    for (let attempt = 0; attempt < 2; attempt++) {
      const plan = videoEncodingPlan(width, height, duration, keepAudio, attempt > 0);
      const videoCodec = await getFirstEncodableVideoCodec(['avc'], { width: plan.width, height: plan.height, bitrate: plan.bitrate, frameRate: 30 });
      const audioCodec = keepAudio ? await getFirstEncodableAudioCodec(['aac'], { numberOfChannels: 2, sampleRate: 48000, bitrate: plan.audioBitrate }) : null;
      if (!videoCodec || (keepAudio && !audioCodec)) throw new Error('Απαιτείται μετατροπή σε MP4/H.264/AAC.');
      const target = new BufferTarget();
      const output = new Output({ target, format: new Mp4OutputFormat({ fastStart: 'in-memory' }) });
      const conversion = await Conversion.init({
        input, output, tracks: 'primary', tags: {}, showWarnings: false,
        video: { width: plan.width, height: plan.height, fit: 'contain', frameRate: 30, codec: videoCodec, quality: new Quality({ bitrate: plan.bitrate }), forceTranscode: true, keyFrameInterval: 2 },
        audio: keepAudio ? { codec: audioCodec!, quality: new Quality({ bitrate: plan.audioBitrate }), sampleRate: 48000, numberOfChannels: 2, forceTranscode: true } : { discard: true },
      });
      // Invalid/discarded audio must use the decoder fallback instead of losing sound.
      if (!conversion.isValid || conversion.discardedTracks.some(track => track.reason !== 'discarded_by_user')) {
        await conversion.cancel().catch(() => {});
        throw new Error('Η γρήγορη μετατροπή δεν διατηρεί όλα τα επιλεγμένα κανάλια.');
      }
      let oversize = false;
      const stop = target.on('write', ({ end }) => { if (end > VIDEO_UPLOAD_LIMIT && !oversize) { oversize = true; void conversion.cancel().catch(() => {}); } });
      conversion.onProgress = value => scope.postMessage({ type: 'progress', progress: Math.min(99, Math.floor(value * 100)), attempt });
      try { await conversion.execute(); } catch (error) { if (!oversize) throw error; } finally { stop(); }
      if (!oversize && target.buffer?.byteLength && target.buffer.byteLength <= VIDEO_UPLOAD_LIMIT) {
        scope.postMessage({ type: 'done', blob: new Blob([target.buffer], { type: 'video/mp4' }), duration });
        return;
      }
    }
    throw new Error('Το συμπιεσμένο βίντεο παραμένει πάνω από 30 MB.');
  } catch (error) {
    scope.postMessage({ type: 'needs-transcode', message: error instanceof Error ? error.message : String(error) });
  } finally { input?.dispose(); }
};
