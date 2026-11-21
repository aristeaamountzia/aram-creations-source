import { useEffect, useRef } from 'react';

const modalSelector = '[role="dialog"][aria-modal="true"]';
const controls = 'button, a[href], input:not([type="hidden"]), select, textarea, [tabindex]';

export function useDialogKeyboard(open: boolean, onDismiss: () => void) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const dismissRef = useRef(onDismiss);
  dismissRef.current = onDismiss;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!open || !dialog) return;
    const previous = document.activeElement;
    const tabbable = () => [...dialog.querySelectorAll<HTMLElement>(controls)].filter(
      element => element.tabIndex >= 0 && !element.matches(':disabled') &&
        !element.closest('[inert], [aria-hidden="true"]') && element.getClientRects().length > 0,
    );
    const focusDialog = requestAnimationFrame(() => {
      if (!dialog.contains(document.activeElement)) dialog.focus({ preventScroll: true });
    });
    const onKey = (event: KeyboardEvent) => {
      const top = [...document.querySelectorAll<HTMLElement>(modalSelector)]
        .filter(element => element.getClientRects().length > 0).at(-1);
      if (top !== dialog) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopImmediatePropagation();
        dismissRef.current();
      }
      if (event.key !== 'Tab') return;
      const options = tabbable();
      const next = event.shiftKey ? options.at(-1) : options[0];
      const edge = event.shiftKey ? options[0] : options.at(-1);
      if (!dialog.contains(document.activeElement) || document.activeElement === edge || document.activeElement === dialog || !options.length) {
        event.preventDefault();
        (next ?? dialog).focus({ preventScroll: true });
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => {
      cancelAnimationFrame(focusDialog);
      window.removeEventListener('keydown', onKey, true);
      if (previous instanceof HTMLElement && previous.isConnected) previous.focus({ preventScroll: true });
    };
  }, [open]);

  return dialogRef;
}
