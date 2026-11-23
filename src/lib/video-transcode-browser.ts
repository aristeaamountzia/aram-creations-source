import { withMediaCodec, codecFailure, codecAbort } from './media-codecs';
import { videoEncodingPlan, VIDEO_UPLOAD_LIMIT, videoSize } from './video-policy';
import type { VideoProgress, VideoUploadOptions } from './video-compression';
import { parseMediaProbe } from './media-probe';

export async function transcodeVideoInBrowser(file: File, onProgress: (value: VideoProgress) => void, signal?: AbortSignal, options?: VideoUploadOptions): Promise<File> {
  onProgress({ text: `Αναμονή μετατροπής ${file.name} σε MP4…` });
  return withMediaCodec(async (codec, log) => {
    await codec.mount('WORKERFS' as any, { blobs: [{ name: 'source', data: file }] }, '/input');
    onProgress({ text: `Ανάγνωση βίντεο ${file.name}…` });
    const probe = async (path: string, output: string) => {
      await codec.deleteFile(output).catch(() => {});
      const result = await codec.ffprobe(['-v', 'error', '-show_streams', '-show_format', '-of', 'json', path, '-o', output], 30000);
      const text = await codec.readFile(output, 'utf8').catch(() => '');
      return parseMediaProbe(String(text), result, codecFailure(log));
    };
    const metadata = await probe('/input/source', '/probe.json');
    const video = metadata.streams?.find((stream: any) => stream.codec_type === 'video' && !stream.disposition?.attached_pic);
    if (!video) throw new Error('Το αρχείο δεν περιέχει αναγνώσιμο βίντεο.');
    const duration = Number(metadata.format?.duration || video.duration);
    const rotation = Math.abs(Number(video.tags?.rotate || video.side_data_list?.find((side: any) => side.rotation)?.rotation || 0));
    const rotated = rotation % 180 === 90;
    const hasAudio = !options?.stripAudio && metadata.streams.some((stream: any) => stream.codec_type === 'audio');
    const compatibleSource = file.type === 'video/mp4' && video.codec_name === 'h264' ? file.size : undefined;
    for (let attempt = 0; attempt < 2; attempt++) {
      if (signal?.aborted) throw codecAbort();
      const plan = videoEncodingPlan(Number(rotated ? video.height : video.width), Number(rotated ? video.width : video.height), duration, hasAudio, attempt > 0, compatibleSource);
      const progress = ({ time }: { time: number }) => {
        const percent = Math.min(99, Math.max(0, Math.floor(time / 1_000_000 / duration * 100)));
        onProgress({ text: `${attempt ? 'Δεύτερη μετατροπή' : 'Μετατροπή'} ${file.name} σε MP4: ${percent}%`, percent });
      };
      codec.on('progress', progress);
      const output = `/output-${attempt}.mp4`;
      try {
        const status = await codec.exec([
          '-i', '/input/source', '-map', `0:${video.index}`,
          ...(hasAudio ? ['-map', '0:a:0', '-c:a', 'aac', '-b:a', String(plan.audioBitrate), '-ac', '2', '-ar', '48000'] : ['-an']),
          '-vf', `scale=${plan.width}:${plan.height}:force_original_aspect_ratio=decrease:force_divisible_by=2,setsar=1`,
          '-r', '30', '-c:v', 'libx264', '-preset', 'ultrafast', '-pix_fmt', 'yuv420p',
          '-b:v', String(plan.bitrate), '-maxrate', String(plan.bitrate), '-bufsize', String(plan.bitrate * 2),
          '-movflags', '+faststart', '-map_metadata', '-1', '-fs', String(VIDEO_UPLOAD_LIMIT + 1024 * 1024), output,
        ], 14 * 60 * 1000);
        if (status !== 0) throw new Error(`Αποτυχία μετατροπής ${file.name}: ${codecFailure(log)}`);
        const bytes = await codec.readFile(output);
        if (!(bytes instanceof Uint8Array) || !bytes.byteLength) throw new Error('Δεν δημιουργήθηκε βίντεο MP4.');
        if (bytes.byteLength > VIDEO_UPLOAD_LIMIT) continue;
        const verified = await probe(output, '/verified.json');
        const outputDuration = Number(verified.format?.duration);
        if (!Number.isFinite(outputDuration) || outputDuration <= 0 || outputDuration < duration - 0.3) throw new Error('Η μετατροπή δεν διατήρησε όλη τη διάρκεια του βίντεο.');
        if (hasAudio && !verified.streams?.some((stream: any) => stream.codec_type === 'audio')) throw new Error('Η μετατροπή δεν διατήρησε τον ήχο.');
        const result = new File([bytes as Uint8Array<ArrayBuffer>], file.name.replace(/\.[^/.]+$/, '') + '-h264.mp4', { type: 'video/mp4', lastModified: Date.now() });
        onProgress({ text: `Μετατροπή ολοκληρώθηκε: ${videoSize(file.size)} → ${videoSize(result.size)}.`, percent: 100 });
        return result;
      } finally {
        codec.off('progress', progress);
        await codec.deleteFile(output).catch(() => {});
      }
    }
    throw new Error('Το συμπιεσμένο βίντεο παραμένει πάνω από 30 MB. Επίλεξε μικρότερο απόσπασμα.');
  }, signal, () => onProgress({ text: 'Φόρτωση εργαλείων μετατροπής βίντεο…' }));
}
