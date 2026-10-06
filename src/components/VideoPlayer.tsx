import React, { useEffect, useState } from 'react';
import { videoLink } from '../lib/video-links';

export function VideoPlayer({ url, title, autoPlay = false, background = false, onError }: { url: string; title: string; autoPlay?: boolean; background?: boolean; onError?: () => void }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [url]);
  const link = videoLink(url);
  if (link) {
    const embed = new URL(link.embed);
    embed.searchParams.set('autoplay', autoPlay ? '1' : '0');
    if (link.provider === 'youtube') {
      embed.searchParams.set('playsinline', '1'); embed.searchParams.set('rel', '0');
      embed.searchParams.set('mute', background ? '1' : '0');
      if (background) { embed.searchParams.set('controls', '0'); embed.searchParams.set('loop', '1'); embed.searchParams.set('playlist', link.id); embed.searchParams.set('disablekb', '1'); }
    } else if (link.provider === 'vimeo' && background) { embed.searchParams.set('background', '1'); embed.searchParams.set('muted', '1'); embed.searchParams.set('loop', '1'); }
    return <iframe key={embed.href} src={embed.href} title={title} referrerPolicy="strict-origin-when-cross-origin" allow="autoplay; encrypted-media; fullscreen; picture-in-picture" allowFullScreen tabIndex={background ? -1 : undefined} aria-hidden={background || undefined} className={`h-full w-full border-0 ${background ? 'pointer-events-none' : ''}`} />;
  }
  if (failed && !background) return <div role="alert" className="flex h-full items-center justify-center p-6 text-center text-sm text-white bg-stone-900">Το αρχείο βίντεο δεν είναι διαθέσιμο. Έλεγξε τον σύνδεσμο στην επεξεργασία του έργου.</div>;
  return <video key={url} src={url} controls={!background} autoPlay={autoPlay} muted={background} loop={background} playsInline preload="metadata" onError={() => {setFailed(true); onError?.();}} aria-hidden={background || undefined} className={`h-full w-full ${background ? 'object-cover' : 'object-contain'}`} />;
}
