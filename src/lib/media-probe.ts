/** The pinned WASM ffprobe core can leave ret=-1 on success; require complete
 * JSON output rather than treating that sentinel as a failed decode. */
export function parseMediaProbe(text: string, status: number, detail = ''): Record<string, any> {
  let metadata: any;
  try { metadata = JSON.parse(text); } catch { /* Report the actual probe failure below. */ }
  if (![0, -1].includes(status) || !metadata || metadata.error || !Array.isArray(metadata.streams) || !metadata.streams.length || !metadata.format || typeof metadata.format !== 'object') {
    throw new Error(`Δεν διαβάστηκαν έγκυρα metadata βίντεο (ffprobe ${status})${detail ? `: ${detail}` : '.'}`);
  }
  return metadata;
}
