import { Input, Output, ALL_FORMATS, BlobSource, BufferTarget, Mp4OutputFormat, WebMOutputFormat, Conversion, Quality, getFirstEncodableVideoCodec, getFirstEncodableAudioCodec } from 'mediabunny';
import { validateVideoInput, videoEncodingPlan, VIDEO_UPLOAD_LIMIT } from './video-policy';

const scope = self as unknown as { onmessage: (event: MessageEvent<File>) => void; postMessage: (message: unknown) => void };
scope.onmessage = async ({ data: file }) => {
  let input: Input | undefined;
  try {
    validateVideoInput(file);
    input = new Input({ formats: ALL_FORMATS, source: new BlobSource(file) });
    const video = await input.getPrimaryVideoTrack(), audio = await input.getPrimaryAudioTrack();
    if (!video) throw new Error('Το αρχείο δεν περιέχει αναγνώσιμο βίντεο.');
    const duration = await input.computeDuration();
    const originalWidth = await video.getDisplayWidth(), originalHeight = await video.getDisplayHeight();
    for (let attempt = 0; attempt < 2; attempt++) {
      const plan = videoEncodingPlan(originalWidth, originalHeight, duration, Boolean(audio), attempt > 0);
      let videoCodec = await getFirstEncodableVideoCodec(['avc'], { width: plan.width, height: plan.height, bitrate: plan.bitrate, frameRate: 30 });
      let audioCodec = audio ? await getFirstEncodableAudioCodec(['aac'], { numberOfChannels: 2, sampleRate: 48000, bitrate: plan.audioBitrate }) : null;
      const mp4 = Boolean(videoCodec && (!audio || audioCodec));
      if (!mp4) {
        videoCodec = await getFirstEncodableVideoCodec(['vp9', 'vp8'], { width: plan.width, height: plan.height, bitrate: plan.bitrate, frameRate: 30 });
        audioCodec = audio ? await getFirstEncodableAudioCodec(['opus'], { numberOfChannels: 2, sampleRate: 48000, bitrate: plan.audioBitrate }) : null;
      }
      if (!videoCodec || (audio && !audioCodec)) throw new Error('Ο browser δεν υποστηρίζει τη συμπίεση αυτού του βίντεο. Δοκίμασε πρόσφατο Chrome ή Edge.');
      const target = new BufferTarget();
      const output = new Output({ target, format: mp4 ? new Mp4OutputFormat({ fastStart: 'in-memory' }) : new WebMOutputFormat() });
      const conversion = await Conversion.init({ input, output, tracks: 'primary', tags: {},
        video: { width: plan.width, height: plan.height, fit: 'contain', frameRate: 30, codec: videoCodec, quality: new Quality({ bitrate: plan.bitrate }), forceTranscode: true, keyFrameInterval: 2 },
        audio: audio ? { codec: audioCodec!, quality: new Quality({ bitrate: plan.audioBitrate }), sampleRate: 48000, numberOfChannels: 2, forceTranscode: true } : { discard: true },
      });
      if (!conversion.isValid || conversion.discardedTracks.some(entry => entry.reason !== 'discarded_by_user')) {
        await conversion.cancel();
        throw new Error('Δεν μπορεί να συμπιεστεί αυτός ο τύπος βίντεο με διατήρηση του ήχου. Δοκίμασε MP4 με H.264 ή WebM.');
      }
      let oversize = false;
      const stop = target.on('write', ({ end }) => { if (end > VIDEO_UPLOAD_LIMIT && !oversize) { oversize = true; void conversion.cancel().catch(() => {}); } });
      conversion.onProgress = value => scope.postMessage({ type: 'progress', progress: Math.min(99, Math.floor(value * 100)), attempt });
      try { await conversion.execute(); } catch (error) { if (!oversize) throw error; } finally { stop(); }
      if (!oversize && target.buffer && target.buffer.byteLength <= VIDEO_UPLOAD_LIMIT) {
        const blob = new Blob([target.buffer], { type: mp4 ? 'video/mp4' : 'video/webm' });
        if (!blob.size) throw new Error('Δεν δημιουργήθηκε έγκυρο βίντεο.');
        scope.postMessage({ type: 'done', blob, extension: mp4 ? 'mp4' : 'webm', width: plan.width, height: plan.height, duration });
        return;
      }
    }
    throw new Error('Το συμπιεσμένο βίντεο παραμένει πάνω από 30 MB. Επίλεξε μικρότερο απόσπασμα.');
  } catch (error: any) { scope.postMessage({ type: 'error', message: error.message || 'Δεν ολοκληρώθηκε η συμπίεση του βίντεο.' }); }
  finally { input?.dispose(); }
};

