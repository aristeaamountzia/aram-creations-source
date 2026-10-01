import React from 'react';
import type { VideoProgress } from '../lib/video-compression';
export function VideoUploadStatus({ value, busy, onCancel }: { value: VideoProgress | null; busy: boolean; onCancel: () => void }) {
  if (!value) return null;
  return <div className="rounded-xl border border-stone-200 bg-stone-50 p-3 text-sm text-stone-700"><p role="status" aria-live="polite">{value.text}</p>{busy && <><progress aria-label="Πρόοδος συμπίεσης βίντεο" max={100} value={value.percent ?? 0} className="mt-2 h-2 w-full" /><button type="button" onClick={onCancel} className="mt-2 rounded-lg border bg-white px-3 py-1.5 text-xs font-bold">Ακύρωση συμπίεσης</button></>}</div>;
}

