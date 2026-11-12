import React from 'react';
import { ChevronLeft, ChevronRight, Maximize2, Play } from 'lucide-react';
import { VideoPlayer } from '../VideoPlayer';

export interface GalleryMedia {
  url: string;
  type?: string;
  title?: string;
}

interface MediaGalleryProps {
  media: GalleryMedia[];
  activeIndex: number;
  onActiveIndex: (index: number) => void;
  title: string;
  onOpen?: (index: number) => void;
  autoPlayVideo?: boolean;
}

export function MediaGallery({ media, activeIndex, onActiveIndex, title, onOpen, autoPlayVideo = true }: MediaGalleryProps) {
  const current = media[activeIndex] || media[0];
  const currentIndex = Math.max(0, media.indexOf(current));
  const isVideo = current?.type === 'video';
  const move = (direction: -1 | 1) => {
    if (media.length < 2) return;
    onActiveIndex((currentIndex + direction + media.length) % media.length);
  };

  return (
    <div className="media-gallery flex h-full flex-col justify-between">
      <div className="media-gallery-stage group relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-xl border bg-black">
        {current && (isVideo ? (
          <VideoPlayer url={current.url} title={current.title || title} autoPlay={autoPlayVideo} />
        ) : (
          <img
            key={current.url}
            src={current.url}
            alt={current.title || title}
            referrerPolicy="no-referrer"
            loading="lazy"
            decoding="async"
            className={`h-full w-full object-contain ${onOpen ? 'cursor-zoom-in' : ''}`}
            onClick={() => onOpen?.(currentIndex)}
          />
        ))}

        {current && onOpen && (
          <button type="button" onClick={() => onOpen(currentIndex)} aria-label={isVideo ? 'Πλήρης προβολή βίντεο' : 'Πλήρης μεγέθυνση εικόνας'} className="media-gallery-zoom">
            <Maximize2 aria-hidden="true" />
          </button>
        )}

        {media.length > 1 && (
          <>
            <button type="button" onClick={() => move(-1)} aria-label="Προηγούμενο media" className="media-gallery-arrow media-gallery-arrow--previous"><ChevronLeft aria-hidden="true" /></button>
            <button type="button" onClick={() => move(1)} aria-label="Επόμενο media" className="media-gallery-arrow media-gallery-arrow--next"><ChevronRight aria-hidden="true" /></button>
            <span className="media-gallery-count" aria-live="polite">{currentIndex + 1} / {media.length}</span>
          </>
        )}
      </div>

      {current?.title && <p className="media-gallery-caption">{current.title}</p>}

      {media.length > 1 && (
        <div className="media-gallery-thumbnails horizontal-scrollbar" aria-label="Επιλογή media">
          {media.map((item, index) => (
            <button
              key={`${item.url}-${index}`}
              type="button"
              onClick={() => onActiveIndex(index)}
              aria-label={`Εμφάνιση ${item.type === 'video' ? 'βίντεο' : 'εικόνας'} ${index + 1}`}
              aria-pressed={currentIndex === index}
              className="media-gallery-thumbnail"
            >
              {item.type === 'video' ? (
                <span className="flex h-full w-full items-center justify-center bg-stone-900 text-white"><Play className="h-4 w-4 fill-current" aria-hidden="true" /></span>
              ) : (
                <img src={item.url} alt={item.title || `Thumbnail ${index + 1}`} referrerPolicy="no-referrer" loading="lazy" decoding="async" className="h-full w-full object-cover" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
