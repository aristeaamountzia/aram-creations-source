export const VIDEO_INPUT_LIMIT = 1024 * 1024 * 1024;
export const VIDEO_UPLOAD_LIMIT = 30 * 1024 * 1024;
export const VIDEO_MAX_SECONDS = 600;
export const VIDEO_UPLOAD_HELP = 'Αυτόματη συμπίεση βίντεο στον browser · αρχικό έως 1 GB / 10 λεπτά · τελικό έως 30 MB.';
export const videoSize = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(1)} MB`;

export function validateVideoInput(file: Pick<File, 'size' | 'type'>) {
  if (!file.type.startsWith('video/') || !file.size) throw new Error('Επίλεξε έγκυρο αρχείο βίντεο.');
  if (file.size > VIDEO_INPUT_LIMIT) throw new Error('Το αρχικό βίντεο ξεπερνά το όριο 1 GB. Δεν θα ανέβει.');
}

export function videoEncodingPlan(width: number, height: number, duration: number, hasAudio: boolean, retry = false) {
  if (![width, height, duration].every(value => Number.isFinite(value) && value > 0)) throw new Error('Δεν διαβάστηκαν οι διαστάσεις ή η διάρκεια του βίντεο.');
  if (duration > VIDEO_MAX_SECONDS) throw new Error('Το βίντεο ξεπερνά τα 10 λεπτά. Επίλεξε μικρότερο απόσπασμα.');
  const audioBitrate = hasAudio ? 96000 : 0;
  // Reserve space for container overhead and variable bitrate spikes.
  const bitrate = Math.floor(Math.min(2000000, (24 * 1024 * 1024 * 8 / duration) - audioBitrate) * (retry ? 0.65 : 1));
  const longEdge = bitrate < 500000 ? 640 : bitrate < 1000000 ? 960 : 1280;
  const shortEdge = longEdge * 9 / 16;
  const scale = Math.min(1, longEdge / Math.max(width, height), shortEdge / Math.min(width, height));
  return { width: Math.max(2, Math.floor(width * scale / 2) * 2), height: Math.max(2, Math.floor(height * scale / 2) * 2), bitrate, audioBitrate };
}

