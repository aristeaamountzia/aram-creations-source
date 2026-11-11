import type { HTMLAttributes, MouseEvent } from 'react';
import { Pencil, RotateCcw, X } from 'lucide-react';
import { MediaDownload } from '../MediaDownload';
import { VideoPlayer } from '../VideoPlayer';
import type { ManagedMedia } from './types';

interface MediaCardProps {
  media: ManagedMedia;
  index: number;
  variant: 'shop' | 'private' | 'portfolio';
  downloadName: string;
  dragProps: HTMLAttributes<HTMLDivElement> & { draggable?: boolean };
  canEdit?: boolean;
  canRestore?: boolean;
  onEdit?: () => void;
  onRestore?: () => void;
  onRemove: () => void;
  onMakePrimary?: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  moveUpDisabled?: boolean;
  moveDownDisabled?: boolean;
  onCaptionChange?: (caption: string) => void;
}

export function MediaCard({
  media,
  index,
  variant,
  downloadName,
  dragProps,
  canEdit,
  canRestore,
  onEdit,
  onRestore,
  onRemove,
  onMakePrimary,
  onMoveUp,
  onMoveDown,
  moveUpDisabled,
  moveDownDisabled,
  onCaptionChange
}: MediaCardProps) {
  const isPrivate = variant === 'private';
  const isPortfolio = variant === 'portfolio';
  const stop = (callback?: () => void) => (event: MouseEvent) => {
    event.stopPropagation();
    callback?.();
  };

  const mediaPreview = media.type === 'video' ? (
    isPortfolio ? <VideoPlayer url={media.url} title={media.title || `Portfolio media ${index + 1}`} /> :
      <video src={media.url} referrerPolicy="no-referrer" className={`w-full h-full object-cover pointer-events-none ${isPrivate ? 'grayscale' : ''}`} muted />
  ) : (
    <img src={media.url} alt="" referrerPolicy="no-referrer" loading="lazy" decoding="async" className={`w-full h-full object-cover pointer-events-none ${isPrivate ? 'grayscale' : ''}`} />
  );

  if (isPortfolio) return (
    <div {...dragProps} className="overflow-hidden rounded-xl border border-stone-200 p-2 bg-stone-50 space-y-2 cursor-grab active:cursor-grabbing touch-manipulation">
      <div className="aspect-square w-full rounded-lg bg-stone-200 overflow-hidden relative">
        {mediaPreview}
        {index === 0 && <span className="absolute top-1 left-1 bg-emerald-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow">Κεντρική</span>}
        <MediaDownload media={media} name={downloadName} className="absolute top-1 right-1 z-10" />
      </div>
      <input
        aria-label={`Λεζάντα media ${index + 1}`}
        value={media.title || ''}
        onChange={event => onCaptionChange?.(event.target.value)}
        placeholder="Λεζάντα εικόνας..."
        className="w-full rounded-lg border border-stone-200 bg-white p-1.5 text-[11px] outline-none"
      />
      <div className="flex flex-wrap gap-1 text-[10px]">
        {canEdit && onEdit && <button type="button" onClick={stop(onEdit)} className="px-2 py-1 bg-stone-200 hover:bg-stone-300 rounded font-bold">Edit</button>}
        <button type="button" disabled={index === 0} onClick={stop(onMakePrimary)} className="px-2 py-1 bg-white border border-stone-200 rounded font-bold disabled:opacity-30">Κεντρική</button>
        <button type="button" disabled={moveUpDisabled} onClick={stop(onMoveUp)} className="px-2 py-1 bg-white border border-stone-200 rounded font-bold disabled:opacity-30" aria-label={`Μετακίνηση media ${index + 1} πάνω`}>↑</button>
        <button type="button" disabled={moveDownDisabled} onClick={stop(onMoveDown)} className="px-2 py-1 bg-white border border-stone-200 rounded font-bold disabled:opacity-30" aria-label={`Μετακίνηση media ${index + 1} κάτω`}>↓</button>
        <button type="button" onClick={stop(onRemove)} className="px-2 py-1 bg-rose-50 text-rose-700 border border-rose-200 rounded font-bold ml-auto" aria-label={`Αφαίρεση media ${index + 1}`}><X className="w-4 h-4" /></button>
      </div>
    </div>
  );

  return (
    <div
      {...dragProps}
      className={`relative aspect-square border-2 ${isPrivate ? 'border-stone-300 bg-stone-200 opacity-80' : index === 0 ? 'border-emerald-500 bg-stone-100 shadow-md' : 'border-stone-200 bg-stone-100'} rounded-xl overflow-hidden group cursor-grab active:cursor-grabbing hover:opacity-90 transition`}
    >
      {mediaPreview}

      {isPrivate && <span className="absolute top-1 left-1 bg-stone-800 text-white text-[9px] px-1 rounded shadow-sm">Κρυφό</span>}
      <MediaDownload media={media} name={downloadName} className={`absolute ${isPrivate ? 'top-8' : 'bottom-1'} right-1 z-10`} />

      {canEdit && onEdit && (
        <button type="button" onClick={stop(onEdit)} className={`absolute ${isPrivate ? 'bottom-1' : 'top-1'} left-1 bg-white/90 hover:bg-white text-stone-800 rounded-full p-1 transition shadow cursor-pointer border border-stone-200`} title="Επεξεργασία εικόνας" aria-label={`Επεξεργασία media ${index + 1}`}>
          <Pencil className="w-4 h-4" />
        </button>
      )}
      {canRestore && onRestore && (
        <button type="button" onClick={stop(onRestore)} className={`absolute ${isPrivate ? 'bottom-1 right-9' : 'top-9 left-1'} bg-amber-100/95 hover:bg-amber-200 text-amber-900 rounded-full p-1 transition shadow cursor-pointer border border-amber-200`} title="Επαναφορά αρχικής εικόνας" aria-label={`Επαναφορά media ${index + 1}`}>
          <RotateCcw className="w-4 h-4" />
        </button>
      )}
      <button type="button" onClick={stop(onRemove)} className="absolute top-1 right-1 bg-stone-900/80 hover:bg-rose-600 text-white rounded-full p-1 transition shadow cursor-pointer" aria-label={`Αφαίρεση media ${index + 1}`}>
        <X className="w-5 h-5" />
      </button>

      {!isPrivate && index > 0 && onMakePrimary && (
        <button type="button" onClick={stop(onMakePrimary)} className="absolute bottom-1 left-1 bg-white/95 text-stone-900 text-[9px] font-bold px-2 py-1 rounded shadow">Ορισμός ως κεντρική</button>
      )}
      {media.edited && <span className="absolute top-1 right-9 text-[8px] bg-amber-100 text-amber-900 font-black px-1.5 py-0.5 rounded shadow border border-amber-200">Edited</span>}
      {!isPrivate && index === 0 && <span className="absolute bottom-1 left-1 text-[8px] bg-emerald-600 text-white font-bold px-1.5 py-0.5 rounded shadow">Κεντρική Shop</span>}
    </div>
  );
}
