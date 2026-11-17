import React, { useMemo, useState, useRef } from 'react';

import type { PortfolioCatalog } from './usePortfolioCatalog';

type Dependencies = Pick<PortfolioCatalog, 'items'>;

export function usePortfolioSelection(dependencies: Dependencies) {
  const { items } = dependencies;

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectionAnchorId, setSelectionAnchorId] = useState<string | null>(null);
  const [lassoRect, setLassoRect] = useState<{ left: number; top: number; width: number; height: number } | null>(null);
  const lassoStartRef = useRef<{ x: number; y: number; bounds: DOMRect } | null>(null);
  const lassoBaseSelectionRef = useRef<string[]>([]);
  const portfolioGridRef = useRef<HTMLDivElement | null>(null);

  const selectedItems = items.filter(item => selectedIds.includes(item.id));

  const visibleItemIds = useMemo(() => items.map(item => item.id), [items]);

  const selectItem = (id: string, shiftKey = false) => {
    if (shiftKey && selectionAnchorId) {
      const start = visibleItemIds.indexOf(selectionAnchorId);
      const end = visibleItemIds.indexOf(id);
      if (start >= 0 && end >= 0) {
        const min = Math.min(start, end);
        const max = Math.max(start, end);
        const range = visibleItemIds.slice(min, max + 1);
        setSelectedIds(prev => Array.from(new Set([...prev, ...range])));
        return;
      }
    }
    setSelectedIds(prev => (prev.includes(id) ? prev.filter(itemId => itemId !== id) : [...prev, id]));
    setSelectionAnchorId(id);
  };

  const handleArtworkSelectionClick = (event: React.MouseEvent, id: string) => {
    if (!event.shiftKey) return;
    const target = event.target as HTMLElement;
    if (target.closest('button, input, label, a, select, textarea')) return;
    event.preventDefault();
    selectItem(id, true);
  };

  const finishLassoSelection = (event?: React.PointerEvent<HTMLDivElement>) => {
    if (event && event.currentTarget) {
      try {
        event.currentTarget.releasePointerCapture?.(event.pointerId);
      } catch {}
    }
    lassoStartRef.current = null;
    setLassoRect(null);
  };

  const handleLassoStart = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    const target = event.target as HTMLElement;
    if (target.closest('[data-product-id], button, input, label, a, select, textarea')) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    lassoStartRef.current = { x: event.clientX, y: event.clientY, bounds };
    lassoBaseSelectionRef.current = event.shiftKey ? selectedIds : [];
    if (!event.shiftKey) setSelectedIds([]);
    try {
      event.currentTarget.setPointerCapture?.(event.pointerId);
    } catch {}
    setLassoRect({ left: event.clientX - bounds.left, top: event.clientY - bounds.top, width: 0, height: 0 });
  };

  const handleLassoMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const start = lassoStartRef.current;
    if (!start || !portfolioGridRef.current) return;
    const left = Math.min(start.x, event.clientX);
    const top = Math.min(start.y, event.clientY);
    const right = Math.max(start.x, event.clientX);
    const bottom = Math.max(start.y, event.clientY);
    setLassoRect({ left: left - start.bounds.left, top: top - start.bounds.top, width: right - left, height: bottom - top });
    const touched = Array.from(portfolioGridRef.current.querySelectorAll('[data-product-id]'))
      .filter(node => {
        const rect = node.getBoundingClientRect();
        return rect.left < right && rect.right > left && rect.top < bottom && rect.bottom > top;
      })
      .map(node => (node as HTMLElement).dataset.productId)
      .filter(Boolean) as string[];
    setSelectedIds(Array.from(new Set([...lassoBaseSelectionRef.current, ...touched])));
  };

  return {
    selectedIds, setSelectedIds, lassoRect, portfolioGridRef, selectedItems, selectItem,
    handleArtworkSelectionClick, finishLassoSelection, handleLassoStart, handleLassoMove
  };
}

export type PortfolioSelection = ReturnType<typeof usePortfolioSelection>;
