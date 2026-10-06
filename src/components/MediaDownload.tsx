import React, { useState } from 'react';
import { downloadMedia } from '../lib/media-files';
import { videoLink } from '../lib/video-links';
export function MediaDownload({ media, name = 'aram-media', className = '' }: { media: any; name?: string; className?: string }) {
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const link = videoLink(typeof media === 'string' ? media : media?.url || '');
  if (link) return <a className={className + ' text-xs underline'} onClick={event => event.stopPropagation()} href={link.original} target="_blank" rel="noopener noreferrer">Άνοιγμα βίντεο ↗</a>;
  return <span className={className} onClick={event => event.stopPropagation()}><button type="button" disabled={busy} onClick={async () => { setBusy(true); setError(''); try { await downloadMedia(media, name); } catch (error: any) { setError(error.message); } finally { setBusy(false); } }} className="bg-white/95 text-stone-900 border border-stone-300 rounded-lg px-2 py-1 text-xs font-bold shadow-sm disabled:opacity-50" aria-label="Λήψη αρχείου">{busy ? 'Λήψη…' : '↓ Λήψη'}</button>{error && <span role="alert" className="block mt-1 rounded bg-rose-50 text-rose-800 text-xs p-2 max-w-xs">{error}</span>}</span>;
}
