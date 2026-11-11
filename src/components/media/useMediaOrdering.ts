import { useState, type DragEvent } from 'react';

export function moveMediaItem<T>(items: readonly T[], fromIndex: number, toIndex: number): T[] {
  if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0 || fromIndex >= items.length || toIndex >= items.length) {
    return [...items];
  }
  const next = [...items];
  const [item] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, item);
  return next;
}

export function useMediaOrdering<T>(
  items: readonly T[],
  onChange: (items: T[]) => void,
  onReorder?: (items: T[], fromIndex: number, toIndex: number) => void
) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const reorder = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;
    const next = moveMediaItem(items, fromIndex, toIndex);
    onChange(next);
    onReorder?.(next, fromIndex, toIndex);
  };

  return {
    draggedIndex,
    dragProps: (index: number) => ({
      draggable: true,
      onDragStart: (event: DragEvent<HTMLElement>) => {
        setDraggedIndex(index);
        event.dataTransfer.effectAllowed = 'move';
      },
      onDragOver: (event: DragEvent<HTMLElement>) => event.preventDefault(),
      onDrop: (event: DragEvent<HTMLElement>) => {
        event.preventDefault();
        if (draggedIndex !== null) reorder(draggedIndex, index);
        setDraggedIndex(null);
      },
      onDragEnd: () => setDraggedIndex(null)
    }),
    moveToStart: (index: number) => reorder(index, 0),
    moveUp: (index: number) => reorder(index, Math.max(0, index - 1)),
    moveDown: (index: number) => reorder(index, Math.min(items.length - 1, index + 1))
  };
}
