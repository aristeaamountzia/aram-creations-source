import { useId, useRef, type PointerEvent } from 'react';

/** Touch dragging starts only on the grip, keeping normal page scrolling available. */
export function useTouchReorder(onMove: (from: string, to: string) => void, disabled = false) {
  const group = useId();
  const drag = useRef<{ from: string; target: string; x: number; y: number; moved: boolean } | null>(null);
  const clear = () => {
    document.querySelectorAll('[data-touch-target]').forEach(node => node.removeAttribute('data-touch-target'));
    drag.current = null;
  };
  return (id: string) => ({
    'data-reorder-group': group,
    'data-reorder-id': id,
    onPointerDown: (event: PointerEvent<HTMLElement>) => {
      if (disabled || event.pointerType === 'mouse' || !(event.target as HTMLElement).closest('[data-reorder-handle]')) return;
      event.stopPropagation();
      event.currentTarget.setPointerCapture(event.pointerId);
      drag.current = { from: id, target: id, x: event.clientX, y: event.clientY, moved: false };
    },
    onPointerMove: (event: PointerEvent<HTMLElement>) => {
      const state = drag.current;
      if (!state) return;
      event.preventDefault(); event.stopPropagation();
      if (Math.hypot(event.clientX - state.x, event.clientY - state.y) > 6) state.moved = true;
      if (!state.moved) return;
      const target = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>('[data-reorder-id]');
      if (target?.dataset.reorderGroup === group) {
        document.querySelectorAll('[data-touch-target]').forEach(node => node.removeAttribute('data-touch-target'));
        target.setAttribute('data-touch-target', 'true');
        state.target = target.dataset.reorderId!;
      }
      let scrollable = event.currentTarget.parentElement;
      while (scrollable && !(scrollable.scrollHeight > scrollable.clientHeight && /auto|scroll/.test(getComputedStyle(scrollable).overflowY))) scrollable = scrollable.parentElement;
      const bounds = scrollable?.getBoundingClientRect();
      const top = bounds?.top || 0, bottom = bounds?.bottom || window.innerHeight;
      const dy = event.clientY < top + 70 ? -18 : event.clientY > bottom - 70 ? 18 : 0;
      if (dy) { if (scrollable) scrollable.scrollBy(0, dy); else window.scrollBy(0, dy); }
    },
    onPointerUp: (event: PointerEvent<HTMLElement>) => {
      const state = drag.current;
      if (!state) return;
      event.stopPropagation(); clear();
      if (state.moved && state.from !== state.target) onMove(state.from, state.target);
    },
    onPointerCancel: clear,
    onLostPointerCapture: clear
  });
}
