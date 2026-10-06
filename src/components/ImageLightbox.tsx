import React, { useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { VideoPlayer } from './VideoPlayer';
import { isVideoUrl, videoLink } from '../lib/video-links';

interface ImageLightboxProps {
  images: { url: string; title?: string; type?: 'image' | 'video' }[];
  index: number;
  title: string;
  onIndexChange: (index: number) => void;
  onClose: () => void;
}

/** Shared media viewer for Shop, Portfolio and back-office import previews. */
export function ImageLightbox({ images, index, title, onIndexChange, onClose }: ImageLightboxProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const touchRef = useRef<{ x: number; y: number } | null>(null);
  const current = Math.max(0, Math.min(index, images.length - 1));
  const media = images[current];
  const isVideo = media?.type === 'video' || isVideoUrl(media?.url || '');
  const move = (direction: number) => {
    if (images.length > 1) onIndexChange((current + direction + images.length) % images.length);
  };

  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus({ preventScroll: true });
    return () => {
      document.body.style.overflow = previousOverflow;
      if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
    };
  }, []);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (['Escape', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
        if (event.key !== 'Escape' && (event.target as HTMLElement)?.closest('video,input,textarea,select')) return;
        event.preventDefault();
        event.stopImmediatePropagation();
        if (event.key === 'Escape') onClose();
        else move(event.key === 'ArrowLeft' ? -1 : 1);
      } else if (event.key === 'Tab') {
        const buttons = [...(dialogRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled),a[href],iframe,video[controls]') || [])];
        const first = buttons[0];
        const last = buttons[buttons.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    };
    window.addEventListener('keydown', handleKey, true);
    return () => window.removeEventListener('keydown', handleKey, true);
  }, [current, images.length, onIndexChange, onClose]);

  if (!images.length) return null;

  return <div ref={dialogRef} role="dialog" aria-modal="true" aria-label={`Πλήρης οθόνη — ${title}`} className="image-lightbox" onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
    <button ref={closeRef} type="button" className="image-lightbox-close" aria-label="Κλείσιμο μεγέθυνσης (Esc)" onClick={onClose}><X aria-hidden="true" /></button>
    {images.length > 1 && <>
      <button type="button" className="image-lightbox-prev" aria-label="Προηγούμενο αρχείο" onClick={() => move(-1)}><ChevronLeft aria-hidden="true" /></button>
      <button type="button" className="image-lightbox-next" aria-label="Επόμενο αρχείο" onClick={() => move(1)}><ChevronRight aria-hidden="true" /></button>
    </>}
    <div className="image-lightbox-stage"
      onTouchStart={event => { touchRef.current = event.touches.length === 1 ? { x: event.touches[0].clientX, y: event.touches[0].clientY } : null; }}
      onTouchMove={event => { if (event.touches.length !== 1) touchRef.current = null; }}
      onTouchCancel={() => { touchRef.current = null; }}
      onTouchEnd={event => {
        const start = touchRef.current;
        touchRef.current = null;
        if (!start || event.touches.length || !event.changedTouches.length) return;
        const dx = event.changedTouches[0].clientX - start.x;
        const dy = event.changedTouches[0].clientY - start.y;
        if (Math.abs(dx) >= 50 && Math.abs(dy) < Math.abs(dx) * .65) move(dx < 0 ? 1 : -1);
      }}>
      {isVideo ? <div className="lightbox-video"><VideoPlayer url={media.url} title={media.title || title} autoPlay /></div> : <img key={media.url} src={media.url} alt={media.title || title} referrerPolicy="no-referrer" draggable={false} />}
    </div>
    <div className="image-lightbox-caption">
      <p>{title}</p>
      <p role="status" aria-live="polite">{isVideo ? 'Βίντεο' : 'Εικόνα'} {current + 1} από {images.length}</p>
      {isVideo && videoLink(media.url) && <a className="lightbox-external-link" href={videoLink(media.url)!.original} target="_blank" rel="noopener noreferrer">Άνοιγμα στον πάροχο βίντεο</a>}
    </div>
  </div>;
}
