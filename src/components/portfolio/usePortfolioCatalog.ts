import { useEffect, useMemo, useState } from 'react';
import { usePortfolioDesign } from '../../lib/use-portfolio-design';
import { portfolioMedia } from '../../lib/video-links';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';
import { ART_ITEMS } from '../../data';
import { sortPortfolio } from '../../lib/portfolio-order';
import { CategoryId } from '../../types';
import type { PortfolioRecord, StatsFilter, SortOption } from './portfolio-model';


export function usePortfolioCatalog() {
  const design = usePortfolioDesign();

  const [remote, setRemote] = useState<PortfolioRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<CategoryId | 'all'>('all');
  const [statsFilter, setStatsFilter] = useState<StatsFilter>('active');
  const [sortBy, setSortBy] = useState<SortOption>('portfolio_order');
  const [view, setView] = useState<'grid' | 'list'>('grid');

  useEffect(
    () =>
      onSnapshot(
        collection(db, 'portfolio'),
        snapshot => {
          setRemote(
            snapshot.docs.map(item => ({ ...item.data(), id: item.id } as PortfolioRecord))
          );
          setLoading(false);
          setError('');
        },
        err => {
          setLoading(false);
          setError(`Δεν φορτώθηκε το Portfolio: ${err.message}`);
        }
      ),
    []
  );

  const allItems = useMemo(() => {
    const merged = new Map<string, PortfolioRecord>(ART_ITEMS.map(item => [item.id, item]));
    remote.forEach(item =>
      merged.set(item.id, { ...merged.get(item.id), ...item } as PortfolioRecord)
    );
    return sortPortfolio(Array.from(merged.values()));
  }, [remote]);

  const metrics = useMemo(() => {
    const total = allItems.length;
    const active = allItems.filter(item => !item.isDeleted && !item.deletedAt).length;
    const archived = allItems.filter(item => Boolean(item.isDeleted || item.deletedAt)).length;
    const featured = allItems.filter(
      item => Boolean(item.featured) && !item.isDeleted && !item.deletedAt
    ).length;
    let mediaTotal = 0;
    allItems.forEach(item => {
      mediaTotal += portfolioMedia(item).length;
    });
    return { total, active, archived, featured, mediaTotal };
  }, [allItems]);

  const items = useMemo(() => {
    return allItems
      .filter(item => {
        const isArchived = Boolean(item.isDeleted || item.deletedAt);
        if (statsFilter === 'active' && isArchived) return false;
        if (statsFilter === 'archived' && !isArchived) return false;
        if (statsFilter === 'featured' && (isArchived || !item.featured)) return false;

        const matchCat = categoryFilter === 'all' || item.category === categoryFilter;
        const text = `${item.title || item.name} ${item.description || ''} ${item.medium || ''} ${item.dimensions || ''} ${item.year || ''}`;
        const matchQuery = text.toLocaleLowerCase('el').includes(query.toLocaleLowerCase('el'));

        return matchCat && matchQuery;
      })
      .sort((a, b) => {
        if (sortBy === 'year_desc') return (Number(b.year) || 0) - (Number(a.year) || 0);
        if (sortBy === 'year_asc') return (Number(a.year) || 0) - (Number(b.year) || 0);
        if (sortBy === 'title_asc')
          return (a.title || a.name || '').localeCompare(b.title || b.name || '', 'el');
        if (sortBy === 'title_desc')
          return (b.title || b.name || '').localeCompare(a.title || a.name || '', 'el');
        return 0; // default: already sorted by portfolio_order
      });
  }, [allItems, statsFilter, categoryFilter, query, sortBy]);

  return {
    design, loading, error, setError, query, setQuery, categoryFilter, setCategoryFilter, statsFilter,
    setStatsFilter, sortBy, setSortBy, view, setView, allItems, metrics, items
  };
}

export type PortfolioCatalog = ReturnType<typeof usePortfolioCatalog>;
