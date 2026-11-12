import React, { useEffect, useRef } from 'react';
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
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    const frame = window.requestAnimationFrame(() => {
      const initialFocus = dialogRef.current?.querySelector<HTMLElement>('[data-detail-close]')
        || dialogRef.current?.querySelector<HTMLElement>('button:not(:disabled), a[href], [tabindex]:not([tabindex="-1"])');
      (initialFocus || dialogRef.current)?.focus({ preventScroll: true });
    });
    document.body.style.overflow = 'hidden';

    return () => {
      window.cancelAnimationFrame(frame);
      document.body.style.overflow = previousOverflow;
      if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const dialog = dialogRef.current;
      if (!dialog) return;
      const modalDialogs = [...document.querySelectorAll<HTMLElement>('[role="dialog"][aria-modal="true"]')];
      if (modalDialogs[modalDialogs.length - 1] !== dialog) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopImmediatePropagation();
        onClose();
        return;
      }
      if ((event.key === 'ArrowLeft' || event.key === 'ArrowRight')
        && !(event.target as HTMLElement | null)?.closest('input, textarea, select, video, [contenteditable="true"]')) {
        const action = event.key === 'ArrowLeft' ? onPrevious : onNext;
        if (action) {
          event.preventDefault();
          event.stopImmediatePropagation();
          action();
        }
        return;
      }
      if (event.key !== 'Tab') return;

      const focusable = [...dialog.querySelectorAll<HTMLElement>(
        'a[href], button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])'
      )].filter(element => !element.hidden && element.getAttribute('aria-hidden') !== 'true' && element.getClientRects().length > 0);
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) {
        event.preventDefault();
        dialog.focus();
      } else if (event.shiftKey && (document.activeElement === first || !dialog.contains(document.activeElement))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !dialog.contains(document.activeElement))) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [onClose, onNext, onPrevious]);

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label={title}
      tabIndex={-1}
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
