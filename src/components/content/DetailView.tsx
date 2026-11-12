import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface DetailViewProps {
  title: string;
  onClose: () => void;
  onPrevious?: () => void;
  onNext?: () => void;
  previousLabel?: string;
  nextLabel?: string;
  children: React.ReactNode;
  className?: string;
}

export function DetailView({
  title,
  onClose,
  onPrevious,
  onNext,
  previousLabel = 'Προηγούμενο',
  nextLabel = 'Επόμενο',
  children,
  className = ''
}: DetailViewProps) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="detail-view fixed inset-0 z-50 flex items-center justify-center overflow-y-auto overscroll-contain bg-black/80 p-2 backdrop-blur-sm sm:p-4"
      onClick={event => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      {onPrevious && (
        <button type="button" onClick={onPrevious} aria-label={previousLabel} title={previousLabel} className="detail-view-nav detail-view-nav--previous">
          <ChevronLeft aria-hidden="true" />
        </button>
      )}
      {onNext && (
        <button type="button" onClick={onNext} aria-label={nextLabel} title={nextLabel} className="detail-view-nav detail-view-nav--next">
          <ChevronRight aria-hidden="true" />
        </button>
      )}
      <div className={`detail-view-panel relative my-auto flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden border bg-white text-stone-900 md:flex-row ${className}`} onClick={event => event.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}
