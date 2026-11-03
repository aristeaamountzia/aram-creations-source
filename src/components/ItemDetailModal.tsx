import { sanitizeVintedDescription } from '../lib/vinted-sanitizer';
import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

export interface ItemDetailModalProps {
  open: boolean;
  item: any | null;
  mode?: 'shop' | 'portfolio';
  categoryLabel?: string;
  onClose: () => void;
  onEdit?: (item: any) => void;
  onClone?: (item: any) => void;
  onDelete?: (item: any) => void;
  onEditImage?: (imageUrl: string) => void;
}

export const ItemDetailModal: React.FC<ItemDetailModalProps> = ({
  open,
  item,
  mode = 'shop',
  categoryLabel,
  onClose,
  onEdit,
  onClone,
  onDelete,
  onEditImage
}) => {
  const [activeMediaIdx, setActiveMediaIdx] = useState(0);

  // Close on Escape key
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open || !item) return null;

  const title = item.name || item.title || 'Χωρίς τίτλο';
  const mediaList: Array<{ url: string; type?: string; title?: string }> =
    item.mediaList && item.mediaList.length > 0
      ? item.mediaList
      : item.imageUrl
      ? [{ url: item.imageUrl, type: item.fileType || 'image' }]
      : item.image
      ? [{ url: item.image, type: 'image' }]
      : [];

  const currentMedia = mediaList[activeMediaIdx] || mediaList[0];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Λεπτομέρειες"
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto cursor-pointer"
    >
      <div
        onClick={e => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-stone-200 animate-fade-in cursor-default"
      >
        {/* Header with thumbnail */}
        <div className="px-6 py-4 border-b border-stone-200 bg-stone-50 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            {currentMedia && (
              <div className="w-12 h-12 rounded-xl bg-stone-200 overflow-hidden shrink-0 border border-stone-300">
                <img src={currentMedia.url} alt="" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
              </div>
            )}
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-stone-400">
                {mode === 'shop' ? 'Shop Προϊόν' : 'Portfolio Έργο'}
              </span>
              <h2 className="text-base font-black text-stone-900 leading-tight">{title}</h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Κλείσιμο"
            className="p-1.5 text-stone-400 hover:text-stone-800 rounded-lg hover:bg-stone-200 transition"
          ><X className="w-4 h-4" /></button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-[1.1fr_1fr] gap-6">
          {/* Media Gallery */}
          <div className="space-y-3">
            <div className="aspect-square bg-stone-100 rounded-xl overflow-hidden border border-stone-200 flex items-center justify-center relative shadow-sm">
              {currentMedia ? (
                currentMedia.type === 'video' ? (
                  <video src={currentMedia.url} controls referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                ) : (
                  <img src={currentMedia.url} alt={title} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                )
              ) : (
                <span className="text-xs text-stone-400">Χωρίς εικόνα</span>
              )}
              {currentMedia && onEditImage && currentMedia.type !== 'video' && (
                <button
                  type="button"
                  onClick={() => {
                    if (/\.gif($|\?)/i.test(currentMedia.url)) {
                      alert('Η επεξεργασία αρχείων GIF (animation) δεν υποστηρίζεται για αποφυγή απώλειας κίνησης.');
                      return;
                    }
                    onEditImage(currentMedia.url);
                  }}
                  className="absolute bottom-3 right-3 bg-white/90 hover:bg-white text-stone-800 text-xs font-bold px-3 py-1.5 rounded-lg shadow border border-stone-200 flex items-center gap-1 transition"
                >
                  Επεξεργασία Εικόνας
                </button>
              )}
            </div>

            {/* Thumbnail Strip */}
            {mediaList.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {mediaList.map((m, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setActiveMediaIdx(idx)}
                    className={`h-14 w-14 rounded-lg overflow-hidden border-2 shrink-0 transition ${
                      activeMediaIdx === idx
                        ? 'border-stone-900 ring-2 ring-stone-900/20'
                        : 'border-stone-200 opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img src={m.url} alt="" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Details Column */}
          <div className="space-y-4 text-xs">
            {/* Status & Price Banner */}
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <span className="px-2.5 py-1 bg-stone-100 text-stone-800 rounded-full font-bold uppercase tracking-wider text-[10px]">
                {item.status || 'Διαθέσιμο'}
              </span>
              {mode === 'shop' && item.price && (
                <span className="text-2xl font-black text-stone-900">{item.price}€</span>
              )}
            </div>

            {/* Field Table */}
            <div className="space-y-2">
              <div className="flex justify-between py-1 border-b border-stone-100">
                <span className="text-stone-500 font-bold uppercase">Κατηγορία</span>
                <span className="font-bold text-stone-800">
                  {categoryLabel || item.category || '—'}
                </span>
              </div>

              {item.collection && (
                <div className="flex justify-between py-1 border-b border-stone-100">
                  <span className="text-stone-500 font-bold uppercase">Συλλογή</span>
                  <span className="font-bold text-stone-800">{item.collection}</span>
                </div>
              )}

              {item.stock !== undefined && (
                <div className="flex justify-between py-1 border-b border-stone-100">
                  <span className="text-stone-500 font-bold uppercase">Απόθεμα</span>
                  <span className="font-bold text-stone-800">{item.stock} τμχ</span>
                </div>
              )}

              {item.year && (
                <div className="flex justify-between py-1 border-b border-stone-100">
                  <span className="text-stone-500 font-bold uppercase">Έτος</span>
                  <span className="font-bold text-stone-800">{item.year}</span>
                </div>
              )}

              {item.dimensions && (
                <div className="flex justify-between py-1 border-b border-stone-100">
                  <span className="text-stone-500 font-bold uppercase">Διαστάσεις</span>
                  <span className="font-bold text-stone-800">{item.dimensions}</span>
                </div>
              )}

              {item.medium && (
                <div className="flex justify-between py-1 border-b border-stone-100">
                  <span className="text-stone-500 font-bold uppercase">Υλικό / Τεχνική</span>
                  <span className="font-bold text-stone-800">{item.medium}</span>
                </div>
              )}
            </div>

            {/* Tags: Colors & Materials */}
            {((item.colors && item.colors.length > 0) ||
              (item.materials && item.materials.length > 0)) && (
              <div className="pt-2">
                <span className="block text-stone-400 font-black uppercase text-[10px] mb-1.5">
                  Χρώματα & Υλικά
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {item.colors?.map((c: string) => (
                    <span
                      key={c}
                      className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded border border-indigo-100 font-bold text-[10px]"
                    >
                      {c}
                    </span>
                  ))}
                  {item.materials?.map((m: string) => (
                    <span
                      key={m}
                      className="px-2 py-0.5 bg-stone-50 text-stone-600 rounded border border-stone-200 font-bold text-[10px]"
                    >
                      {m}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Description */}
            {item.description && (
              <div className="pt-2">
                <span className="block text-stone-400 font-black uppercase text-[10px] mb-1">
                  Περιγραφή
                </span>
                <p className="bg-stone-50 p-3 rounded-lg text-stone-700 leading-relaxed text-xs border border-stone-100">
                  {sanitizeVintedDescription(item.description)}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-stone-200 bg-stone-50 flex items-center justify-between shrink-0">
          <div className="flex gap-2">
            {onClone && (
              <button
                type="button"
                onClick={() => {
                  onClone(item);
                  onClose();
                }}
                className="px-3 py-1.5 bg-white border border-stone-200 rounded-lg text-xs font-bold text-stone-700 hover:bg-stone-100 transition shadow-sm"
              >
                Αντιγραφή
              </button>
            )}
            {onDelete && (
              <button
                type="button"
                onClick={() => {
                  onDelete(item);
                  onClose();
                }}
                className="px-3 py-1.5 bg-rose-50 border border-rose-200 rounded-lg text-xs font-bold text-rose-700 hover:bg-rose-100 transition shadow-sm"
              >
                Διαγραφή
              </button>
            )}
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-stone-200 rounded-lg text-xs font-bold text-stone-600 hover:bg-white transition"
            >
              Κλείσιμο
            </button>
            {onEdit && (
              <button
                type="button"
                onClick={() => {
                  onEdit(item);
                  onClose();
                }}
                className="px-5 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-lg text-xs font-bold shadow-md transition"
              >
                Επεξεργασία
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
