import React, { useState, useEffect, useMemo } from 'react';
import { CategoryId, ArtItem, ArtMediaItem } from '../types';
import { CATEGORIES, ART_ITEMS } from '../data';
import { sortPortfolio } from '../lib/portfolio-order';
import { db } from '../firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import {
  Palette,
  Eye,
  Mail,
  ArrowUpRight,
  Sparkles,
  Filter,
  Search,
  Film,
  Image as ImageIcon,
  Heart,
  Share2,
  ChevronLeft,
  ChevronRight,
  X,
  Maximize2,
  ZoomIn,
  Play,
  Layers,
  Compass,
  SlidersHorizontal,
  Check,
  ExternalLink,
  Info
} from 'lucide-react';

interface PortfolioViewProps {
  onContactArtist: (item?: ArtItem) => void;
}

const normalizeVideoUrl = (rawUrl?: string): string => {
  const url = String(rawUrl || '').trim();
  if (!url) return '';
  const driveMatch = url.match(/drive\.google\.com\/file\/d\/([^/]+)/i) || url.match(/[?&]id=([^&]+)/i);
  if (driveMatch?.[1] && /drive\.google\.com/i.test(url)) {
    return `https://drive.google.com/file/d/${driveMatch[1]}/preview`;
  }
  return url;
};

const isEmbedVideo = (url: string) => {
  return /youtube\.com|youtu\.be|vimeo\.com|drive\.google\.com/i.test(url);
};

const getEmbedVideoUrl = (url: string) => {
  if (/drive\.google\.com/i.test(url)) {
    return url;
  }
  const yt = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i);
  if (yt?.[1]) {
    return `https://www.youtube.com/embed/${yt[1]}?autoplay=1&mute=0&rel=0`;
  }
  const vimeo = url.match(/vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/([^\/]*)\/videos\/|album\/(\d+)\/video\/|video\/|)(\d+)/i);
  if (vimeo?.[3]) {
    return `https://player.vimeo.com/video/${vimeo[3]}?autoplay=1`;
  }
  return url;
};

export const PortfolioView: React.FC<PortfolioViewProps> = ({ onContactArtist }) => {
  // Only the 8 independent art categories (excluding jewelry which is in Shop)
  const artCategories = useMemo(() => CATEGORIES.filter((c) => c.id !== 'jewelry'), []);

  // Firebase Live Sync with fallback to ART_ITEMS
  const [items, setItems] = useState<ArtItem[]>(ART_ITEMS);
  const [selectedCatId, setSelectedCatId] = useState<CategoryId | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'video' | 'multiple' | 'favorites'>('all');
  const [sortBy, setSortBy] = useState<'default' | 'newest' | 'title' | 'category'>('default');

  // Theme state (persisted in localStorage)
  const [portfolioTheme, setPortfolioTheme] = useState<'light' | 'dark'>(() => {
    try {
      return (localStorage.getItem('aram_portfolio_theme') as 'light' | 'dark') || 'light';
    } catch {
      return 'light';
    }
  });

  const isDark = portfolioTheme === 'dark';

  // Sync theme to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('aram_portfolio_theme', portfolioTheme);
    } catch (_) {}
  }, [portfolioTheme]);
  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('aram_portfolio_favorites') || '[]');
      return Array.isArray(saved) ? saved.filter((id): id is string => typeof id === 'string') : [];
    } catch {
      return [];
    }
  });

  // Modal Detail state
  const [selectedItem, setSelectedItem] = useState<ArtItem | null>(null);
  const [shareError, setShareError] = useState('');
  const [activeMediaIdx, setActiveMediaIdx] = useState<number>(0);
  const [isZoomOpen, setIsZoomOpen] = useState(false);
  const [copiedToast, setCopiedToast] = useState(false);

  // Sync favorites to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('aram_portfolio_favorites', JSON.stringify(favorites));
    } catch (e) {
      console.warn('Failed to persist favorites', e);
    }
  }, [favorites]);

  const closeItemDetail = () => {
    setSelectedItem(null);
    if (window.location.hash.startsWith('#portfolio/')) {
      window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}#portfolio`);
    }
  };

  useEffect(() => {
    const sharedId = window.location.hash.startsWith('#portfolio/')
      ? decodeURIComponent(window.location.hash.slice('#portfolio/'.length))
      : '';
    if (!sharedId) return;
    const sharedItem = items.find((item) => item.id === sharedId);
    if (sharedItem) {
      setSelectedItem(sharedItem);
      setActiveMediaIdx(0);
    }
  }, [items]);

  useEffect(() => {
    if (!window.location.hash.startsWith('#portfolio/')) return;
    const timer = window.setTimeout(() => {
      const sharedId = decodeURIComponent(window.location.hash.slice('#portfolio/'.length));
      const sharedItem = items.find((item) => item.id === sharedId);
      if (sharedItem) {
        setSelectedItem(sharedItem);
        setActiveMediaIdx(0);
      }
    }, 50);
    return () => window.clearTimeout(timer);
  }, []);

  // Optional Firestore real-time sync for portfolio items
  useEffect(() => {
    try {
      const colRef = collection(db, 'portfolio');
      const unsubscribe = onSnapshot(
        colRef,
        (snapshot) => {
            const firestoreItems: ArtItem[] = [];
            const deletedIds = new Set<string>();
            snapshot.forEach((docSnap) => {
              const data: any = { ...ART_ITEMS.find(item => item.id === docSnap.id), ...docSnap.data() };
              if (data.isDeleted || data.deletedAt) {
                deletedIds.add(docSnap.id);
                return;
              }
              const primaryImg = data.imageUrl || data.image || data.src || '';
              const resolvedMediaList = (data.mediaList && data.mediaList.length > 0)
                ? data.mediaList.map((m: any) => ({
                    url: m.url,
                    type: m.type || 'image',
                    title: m.title || data.title || data.name || ''
                  }))
                : (primaryImg ? [{ url: primaryImg, type: data.fileType || 'image', title: data.title || data.name || '' }] : []);

              firestoreItems.push({
                id: docSnap.id,
                ...data,
                title: data.title || data.name || 'Χωρίς Τίτλο',
                portfolioOrder: data.portfolioOrder,
                description: data.description || data.notes || '',
                image: primaryImg,
                mediaList: resolvedMediaList,
                videoUrl: data.videoUrl || (data.fileType === 'video' ? primaryImg : undefined)
              } as ArtItem);
            });
            // Merge with local static items, avoiding duplicates and skipping deleted
            const combinedMap = new Map<string, ArtItem>();
            ART_ITEMS.forEach((it) => {
              if (!deletedIds.has(it.id)) combinedMap.set(it.id, it);
            });
            firestoreItems.forEach((it) => {
              if (!deletedIds.has(it.id)) combinedMap.set(it.id, it);
            });
            setItems(Array.from(combinedMap.values()));
        },
        (error) => {
          console.warn('Firestore portfolio sync offline, using local curated catalog:', error);
        }
      );
      return () => unsubscribe();
    } catch (e) {
      console.warn('Firebase portfolio not configured, using ART_ITEMS', e);
    }
  }, []);

  const toggleFavorite = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setFavorites((prev) =>
      prev.includes(id) ? prev.filter((fid) => fid !== id) : [...prev, id]
    );
  };

  // Helper to extract media list for any item
  const getItemMediaList = (item: ArtItem): ArtMediaItem[] => {
    if (item.mediaList && item.mediaList.length > 0) {
      return item.mediaList;
    }
    const list: ArtMediaItem[] = [];
    if (item.image) {
      list.push({ url: item.image, type: 'image', title: item.title });
    }
    if (item.videoUrl) {
      list.push({ url: item.videoUrl, type: 'video', title: `${item.title} (Video)` });
    }
    return list.length > 0 ? list : [{ url: item.image || '', type: 'image', title: item.title }];
  };

  // Helper to check if item has video
  const itemHasVideo = (item: ArtItem): boolean => {
    if (item.videoUrl) return true;
    if (item.mediaList && item.mediaList.some((m) => m.type === 'video')) return true;
    return false;
  };

  // Filter and sort items
  const filteredAndSortedItems = useMemo(() => {
    let result = items.filter((item) => {
      // Category filter
      if (selectedCatId !== 'all' && item.category !== selectedCatId) {
        return false;
      }

      // Media mode filter
      if (filterMode === 'video' && !itemHasVideo(item)) {
        return false;
      }
      if (filterMode === 'multiple') {
        const media = getItemMediaList(item);
        if (media.length <= 1) return false;
      }
      if (filterMode === 'favorites' && !favorites.includes(item.id)) {
        return false;
      }

      // Search term
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const titleMatch = item.title?.toLowerCase().includes(q);
        const descMatch = item.description?.toLowerCase().includes(q);
        const medMatch = item.medium?.toLowerCase().includes(q);
        const dimMatch = item.dimensions?.toLowerCase().includes(q);
        const yearMatch = item.year?.toLowerCase().includes(q);
        const catMatch = CATEGORIES.find((c) => c.id === item.category)?.title.toLowerCase().includes(q);
        if (!titleMatch && !descMatch && !medMatch && !dimMatch && !yearMatch && !catMatch) {
          return false;
        }
      }

      return true;
    });

    // Sort
    if (sortBy === 'default') {
      result = sortPortfolio(result);
    } else if (sortBy === 'newest') {
      result.sort((a, b) => (b.year || '').localeCompare(a.year || ''));
    } else if (sortBy === 'title') {
      result.sort((a, b) => a.title.localeCompare(b.title, 'el'));
    } else if (sortBy === 'category') {
      result.sort((a, b) => a.category.localeCompare(b.category));
    }

    return result;
  }, [items, selectedCatId, filterMode, favorites, searchTerm, sortBy]);

  // Current item navigation in modal
  const currentIndex = selectedItem
    ? filteredAndSortedItems.findIndex((it) => it.id === selectedItem.id)
    : -1;
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex >= 0 && currentIndex < filteredAndSortedItems.length - 1;

  const goToPrev = () => {
    if (hasPrev) {
      setSelectedItem(filteredAndSortedItems[currentIndex - 1]);
      setActiveMediaIdx(0);
    }
  };

  const goToNext = () => {
    if (hasNext) {
      setSelectedItem(filteredAndSortedItems[currentIndex + 1]);
      setActiveMediaIdx(0);
    }
  };

  // Keyboard navigation for modal
  useEffect(() => {
    if (!selectedItem) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isZoomOpen) setIsZoomOpen(false);
        else closeItemDetail();
      } else if (e.key === 'ArrowLeft') {
        goToPrev();
      } else if (e.key === 'ArrowRight') {
        goToNext();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedItem, currentIndex, isZoomOpen]);

  const handleShare = async (item: ArtItem) => {
    const url = new URL(window.location.href);
    url.hash = `portfolio/${encodeURIComponent(item.id)}`;
    setShareError('');
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${item.title} • Aristea Amountzia Fine Art`,
          text: item.description,
          url: url.toString()
        });
      } catch (error) {
        if ((error as DOMException)?.name !== 'AbortError') setShareError('Δεν ήταν δυνατή η κοινοποίηση. Δοκιμάστε ξανά.');
      }
    } else {
      try {
        await navigator.clipboard.writeText(url.toString());
        setCopiedToast(true);
        setTimeout(() => setCopiedToast(false), 2500);
      } catch {
        setShareError('Δεν επιτράπηκε η αντιγραφή του συνδέσμου από το πρόγραμμα περιήγησης.');
      }
    }
  };

  const activeCategoryMeta = artCategories.find((c) => c.id === selectedCatId);
  const totalVideoCount = items.filter(itemHasVideo).length;

  return (
    <div className={`min-h-screen pb-24 font-sans transition-colors duration-300 ${
      isDark ? 'bg-[#0C0D0E] text-stone-200 selection:bg-stone-700 selection:text-stone-100' : 'bg-[#FAF8F5] text-stone-900 selection:bg-stone-300'
    }`}>
      
      {/* Toast Notification */}
      {copiedToast && (
        <div className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 text-xs animate-in fade-in slide-in-from-bottom-2 border ${
          isDark ? 'bg-stone-900 text-stone-100 border-stone-700' : 'bg-stone-900 text-white border-stone-800'
        }`}>
          <Check className="w-4 h-4 text-emerald-400" />
          <span>Ο σύνδεσμος του έργου αντιγράφηκε στο πρόχειρο!</span>
        </div>
      )}
      {shareError && (
        <div role="alert" className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-2xl text-xs bg-rose-50 text-rose-800 border border-rose-200">
          {shareError}
        </div>
      )}

      {/* Portfolio introduction follows the Shop's typography and spacing. */}
      <section className={`border-b px-4 py-16 text-center transition-colors duration-300 sm:px-6 sm:py-20 ${
        isDark ? 'border-stone-800 bg-[#0F1012]' : 'border-stone-200 bg-white'
      }`}>
        <div className="mx-auto max-w-4xl">
          <h1 className={`mt-4 text-3xl font-bold tracking-tight md:text-4xl ${
            isDark ? 'text-stone-100' : 'text-stone-900'
          }`}>
            Έργα & Δημιουργίες
          </h1>

          <p className={`mx-auto mt-4 max-w-2xl text-sm leading-relaxed sm:text-base ${
            isDark ? 'text-stone-300' : 'text-stone-600'
          }`}>
            Γλυπτική, σχέδιο, φωτογραφία και ψηφιακές δημιουργίες. Κάθε έργο έχει τη δική του ιστορία.
          </p>

          <div className="mt-5 flex flex-wrap justify-center gap-2.5 text-[11px] font-bold">
            {[`${items.length} έργα`, `${artCategories.length} κατηγορίες`, `${totalVideoCount} έργα με βίντεο`].map(label => (
              <span key={label} className={`rounded-full border px-3.5 py-1 ${
                isDark ? 'border-stone-700 bg-stone-800 text-stone-200' : 'border-stone-200 bg-stone-50 text-stone-600'
              }`}>
                {label}
              </span>
            ))}
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              {/* Portfolio Theme Switcher Button */}
              <button
                onClick={() => setPortfolioTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))}
                aria-pressed={isDark}
                className={`flex items-center gap-2 rounded-lg border px-4 py-2.5 text-xs font-bold transition ${
                  isDark
                    ? 'border-stone-700 bg-stone-800 text-stone-100 hover:bg-stone-700'
                    : 'border-stone-200 bg-white text-stone-800 hover:border-stone-400'
                }`}
                title="Αλλαγή Θέματος Portfolio (Φωτεινό / Σκούρο)"
              >
                <Sparkles className="h-4 w-4" />
                <span>{isDark ? '☀️ Φωτεινό Θέμα' : '🌙 Σκούρο Θέμα'}</span>
              </button>

              <button
                onClick={() => onContactArtist()}
                className={`flex items-center gap-2 rounded-lg px-5 py-2.5 text-xs font-bold transition sm:text-sm ${
                  isDark ? 'bg-stone-100 hover:bg-white text-stone-950' : 'bg-stone-900 hover:bg-stone-800 text-white'
                }`}
              >
                <Mail className="w-4 h-4" />
                <span>Ανάθεση Έργου / Επικοινωνία</span>
              </button>
          </div>
        </div>
      </section>

      {/* 2. Interactive Control Bar (Categories, Search, Media Filter, Sort) */}
      <section className={`sticky top-20 z-30 backdrop-blur-md border-b py-4 px-4 sm:px-6 ${isDark ? 'bg-[#0C0D0E]/95 border-stone-800' : 'bg-white/95 border-stone-200'}`}>
        <div className="max-w-7xl mx-auto space-y-3">
          
          {/* Top Row: Search & Filters */}
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
            {/* Search Bar */}
            <div className="relative flex-1 w-full lg:max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-500" />
              <input
                type="text"
                placeholder="Αναζήτηση σε τίτλο, υλικά, διαστάσεις, τεχνική..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`w-full pl-10 pr-9 py-2 rounded-xl border text-xs sm:text-sm focus:outline-none focus:border-stone-500 transition-colors ${isDark ? 'bg-stone-900/90 border-stone-800 text-stone-200 placeholder-stone-500' : 'bg-stone-50 border-stone-300 text-stone-900 placeholder-stone-500'}`}
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  aria-label="Καθαρισμός αναζήτησης"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-200 p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Media Mode Chips & Sort */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 horizontal-scrollbar">
              <button
                onClick={() => setFilterMode('all')}
                aria-pressed={filterMode === 'all'}
                className={`text-xs px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                  filterMode === 'all'
                    ? 'bg-stone-200 text-stone-950 font-semibold'
                    : isDark ? 'bg-stone-900 text-stone-400 hover:text-stone-200 border border-stone-800' : 'bg-white text-stone-600 hover:text-stone-900 border border-stone-300'
                }`}
              >
                <span>Όλα ({items.length})</span>
              </button>

              <button
                onClick={() => setFilterMode('video')}
                aria-pressed={filterMode === 'video'}
                className={`text-xs px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                  filterMode === 'video'
                    ? 'bg-red-500 text-white font-semibold'
                    : isDark ? 'bg-stone-900 text-stone-400 hover:text-red-300 border border-stone-800' : 'bg-white text-stone-600 hover:text-red-700 border border-stone-300'
                }`}
              >
                <Film className="w-3.5 h-3.5" />
                <span>Με Βίντεο ({totalVideoCount})</span>
              </button>

              <button
                onClick={() => setFilterMode('multiple')}
                aria-pressed={filterMode === 'multiple'}
                className={`text-xs px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                  filterMode === 'multiple'
                    ? 'bg-amber-400 text-stone-950 font-semibold'
                    : isDark ? 'bg-stone-900 text-stone-400 hover:text-stone-200 border border-stone-800' : 'bg-white text-stone-600 hover:text-stone-900 border border-stone-300'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Gallery & Multi-Shot</span>
              </button>

              <button
                onClick={() => setFilterMode('favorites')}
                aria-pressed={filterMode === 'favorites'}
                className={`text-xs px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                  filterMode === 'favorites'
                    ? 'bg-rose-600 text-white font-semibold'
                    : isDark ? 'bg-stone-900 text-stone-400 hover:text-rose-300 border border-stone-800' : 'bg-white text-stone-600 hover:text-rose-700 border border-stone-300'
                }`}
              >
                <Heart className="w-3.5 h-3.5 fill-current" />
                <span>Αγαπημένα ({favorites.length})</span>
              </button>

              {/* Sort Selector */}
              <div className="relative shrink-0">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className={`appearance-none text-xs px-3.5 py-1.5 pr-8 rounded-lg border hover:border-stone-500 focus:outline-none cursor-pointer ${isDark ? 'bg-stone-900 text-stone-300 border-stone-800' : 'bg-white text-stone-700 border-stone-300'}`}
                >
                  <option value="default">Προεπιλογή (Wix Curated)</option>
                  <option value="newest">Νεότερα</option>
                  <option value="title">Αλφαβητικά (Α-Ω)</option>
                  <option value="category">Ανά Κατηγορία</option>
                </select>
                <SlidersHorizontal className="w-3 h-3 text-stone-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Bottom Row: Category Pills Scrollbar */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 horizontal-scrollbar pt-1">
            <button
              onClick={() => setSelectedCatId('all')}
              aria-pressed={selectedCatId === 'all'}
              className={`text-xs px-3.5 py-1.5 rounded-full whitespace-nowrap transition-all ${
                selectedCatId === 'all'
                  ? 'bg-stone-100 text-stone-950 font-bold shadow'
                  : isDark ? 'bg-stone-900/90 text-stone-400 hover:text-stone-200 border border-stone-800' : 'bg-white text-stone-600 hover:text-stone-900 border border-stone-300'
              }`}
            >
              Όλες οι Κατηγορίες
            </button>

            {artCategories.map((cat) => {
              const count = items.filter((it) => it.category === cat.id).length;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCatId(cat.id)}
                  aria-pressed={selectedCatId === cat.id}
                  className={`text-xs px-3.5 py-1.5 rounded-full whitespace-nowrap transition-all flex items-center gap-1.5 ${
                    selectedCatId === cat.id
                      ? 'bg-stone-100 text-stone-950 font-bold shadow'
                      : isDark ? 'bg-stone-900/90 text-stone-400 hover:text-stone-200 border border-stone-800' : 'bg-white text-stone-600 hover:text-stone-900 border border-stone-300'
                  }`}
                >
                  <span>{cat.title}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    selectedCatId === cat.id ? 'bg-stone-900/20 text-stone-900' : isDark ? 'bg-stone-800 text-stone-400' : 'bg-stone-200 text-stone-600'
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Active Category Description Notice */}
          {activeCategoryMeta && (
            <div className="p-3.5 rounded-xl bg-stone-900/60 border border-stone-800 text-xs text-stone-300 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="font-semibold text-stone-100">{activeCategoryMeta.title}:</span>{' '}
                <span className="text-stone-400">{activeCategoryMeta.description}</span>
              </div>
              <span className="shrink-0 text-[10px] font-mono text-stone-400 bg-stone-800 px-2.5 py-0.5 rounded border border-stone-700/60">
                {activeCategoryMeta.pillarLabel}
              </span>
            </div>
          )}
        </div>
      </section>

      {/* 3. Artwork Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 mt-10">
        
        {/* Results Header */}
        <div className={`flex items-center justify-between text-xs mb-6 font-mono ${isDark ? 'text-stone-400' : 'text-stone-600'}`}>
          <span>Εμφάνιση {filteredAndSortedItems.length} έργων</span>
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className={`underline underline-offset-4 ${isDark ? 'hover:text-stone-200' : 'hover:text-stone-950'}`}
            >
              Καθαρισμός αναζήτησης
            </button>
          )}
        </div>

        {filteredAndSortedItems.length === 0 ? (
          <div className={`py-24 text-center border border-dashed rounded-2xl p-8 ${isDark ? 'border-stone-800 bg-stone-900/20' : 'border-stone-300 bg-white'}`}>
            <Palette className="w-12 h-12 text-stone-600 mx-auto mb-4" />
            <h3 className={`text-lg font-serif ${isDark ? 'text-stone-200' : 'text-stone-900'}`}>Δεν βρέθηκαν έργα</h3>
            <p className={`text-xs mt-1 max-w-sm mx-auto ${isDark ? 'text-stone-400' : 'text-stone-600'}`}>
              Δοκιμάστε να αλλάξετε τα φίλτρα, την αναζήτηση ή να επιλέξετε άλλη κατηγορία.
            </p>
            <button
              onClick={() => {
                setSelectedCatId('all');
                setSearchTerm('');
                setFilterMode('all');
              }}
              className={`mt-4 px-4 py-2 rounded-lg text-xs transition-colors ${isDark ? 'bg-stone-800 hover:bg-stone-700 text-stone-200' : 'bg-stone-200 hover:bg-stone-300 text-stone-800'}`}
            >
              Επαναφορά Όλων
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {filteredAndSortedItems.map((item) => {
              const cat = CATEGORIES.find((c) => c.id === item.category);
              const mediaList = getItemMediaList(item);
              const hasVideo = itemHasVideo(item);
              const isFav = favorites.includes(item.id);

              return (
                <div
                  key={item.id}
                  id={`art-card-${item.id}`}
                  onClick={() => {
                    setSelectedItem(item);
                    setActiveMediaIdx(0);
                  }}
                  onKeyDown={(event) => {
                    if (event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) {
                      event.preventDefault();
                      setSelectedItem(item);
                      setActiveMediaIdx(0);
                    }
                  }}
                  role="group"
                  tabIndex={0}
                  aria-label={`${item.title}. Πατήστε Enter για άνοιγμα έργου.`}
                  className={`group cursor-pointer rounded-2xl overflow-hidden border transition-all duration-300 flex flex-col justify-between shadow-lg hover:shadow-2xl hover:-translate-y-1 ${isDark ? 'bg-[#121316] border-stone-800/90 hover:border-stone-600' : 'bg-white border-stone-200 hover:border-stone-400'}`}
                >
                  {/* Media Visual Container */}
                  <div className="relative aspect-[4/3] overflow-hidden bg-stone-950">
                    <img
                      src={item.image}
                      alt={item.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 filter brightness-95"
                    />

                    {/* Gradient Overlay for badges legibility */}
                    <div className="absolute inset-0 bg-gradient-to-t from-stone-950/80 via-transparent to-stone-950/40 opacity-70 group-hover:opacity-40 transition-opacity" />

                    {/* Top Badges */}
                    <div className="absolute top-3 left-3 flex items-center gap-1.5 z-10">
                      <span className="bg-stone-950/90 backdrop-blur-md text-stone-300 text-[10px] font-mono uppercase px-2.5 py-0.5 rounded-full border border-stone-700/60">
                        {cat?.title}
                      </span>
                      {item.year && (
                        <span className="bg-stone-950/90 backdrop-blur-md text-stone-400 text-[10px] font-mono px-2 py-0.5 rounded-full border border-stone-700/60">
                          {item.year}
                        </span>
                      )}
                    </div>

                    {/* Top Right: Favorite button */}
                    <button
                      onClick={(e) => toggleFavorite(item.id, e)}
                      aria-label={isFav ? `Αφαίρεση ${item.title} από τα αγαπημένα` : `Προσθήκη ${item.title} στα αγαπημένα`}
                      aria-pressed={isFav}
                      className={`absolute top-3 right-3 z-10 p-2 rounded-full backdrop-blur-md transition-transform active:scale-90 border ${
                        isFav
                          ? 'bg-rose-950/90 text-rose-400 border-rose-800'
                    : isDark ? 'bg-stone-950/70 text-stone-400 hover:text-stone-100 border-stone-700/60' : 'bg-white/90 text-stone-600 hover:text-stone-950 border-stone-300'
                      }`}
                      title={isFav ? 'Αφαίρεση από τα αγαπημένα' : 'Προσθήκη στα αγαπημένα'}
                    >
                      <Heart className={`w-3.5 h-3.5 ${isFav ? 'fill-current' : ''}`} />
                    </button>

                    {/* Bottom Media Indicators */}
                    <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between z-10">
                      <div className="flex items-center gap-1.5">
                        {/* Video indicator badge */}
                        {hasVideo && (
                          <span className="inline-flex items-center gap-1 bg-red-600/90 backdrop-blur-md text-white text-[10px] font-bold px-2 py-0.5 rounded-md shadow-md animate-pulse">
                            <Film className="w-3 h-3" />
                            <span>Βίντεο</span>
                          </span>
                        )}

                        {/* Media counter */}
                        {mediaList.length > 1 && (
                          <span className="inline-flex items-center gap-1 bg-stone-950/80 backdrop-blur-md text-stone-300 text-[10px] font-mono px-2 py-0.5 rounded-md border border-stone-700/50">
                            <Layers className="w-3 h-3" />
                            <span>{mediaList.length} media</span>
                          </span>
                        )}
                      </div>

                      {/* Status badge */}
                      {item.status && (
                        <span className="text-[10px] font-mono text-stone-300 bg-stone-900/85 backdrop-blur-md px-2 py-0.5 rounded border border-stone-700/50">
                          {item.status}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Artwork Content Info */}
                  <div className="p-5 flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className={`font-serif text-lg sm:text-xl transition-colors line-clamp-1 ${isDark ? 'text-stone-100 group-hover:text-stone-200' : 'text-stone-900 group-hover:text-stone-700'}`}>
                        {item.title}
                      </h3>
                      
                      <div className={`mt-1 text-xs font-mono line-clamp-1 ${isDark ? 'text-stone-400' : 'text-stone-600'}`}>
                        {item.medium}
                      </div>

                      {item.dimensions && (
                        <div className={`mt-0.5 text-[11px] font-mono ${isDark ? 'text-stone-500' : 'text-stone-600'}`}>
                          Διαστάσεις: {item.dimensions}
                        </div>
                      )}

                      <p className={`mt-3 text-xs line-clamp-2 leading-relaxed ${isDark ? 'text-stone-400' : 'text-stone-600'}`}>
                        {item.description}
                      </p>
                    </div>

                    {/* Footer Row */}
                    <div className={`mt-5 pt-3.5 border-t flex items-center justify-between text-xs ${isDark ? 'border-stone-800/80 text-stone-400' : 'border-stone-200 text-stone-600'}`}>
                      <span className={`text-[11px] font-mono ${isDark ? 'text-stone-500' : 'text-stone-600'}`}>
                        {hasVideo ? 'Προβολή Έργου & Βίντεο' : 'Προβολή Έργου'}
                      </span>
                      <span className={`flex items-center gap-1 transition-colors font-medium ${isDark ? 'text-stone-300 group-hover:text-white' : 'text-stone-700 group-hover:text-stone-950'}`}>
                        <span>Άνοιγμα</span>
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 4. Rich Artwork Detail Modal (Shop-like experience with Video and Gallery) */}
      {selectedItem && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
          onClick={closeItemDetail}
        >
          {/* Side Floating Arrow: Previous */}
          {hasPrev && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                goToPrev();
              }}
              className="hidden lg:flex fixed left-4 top-1/2 -translate-y-1/2 p-3.5 bg-stone-900/90 hover:bg-stone-800 text-stone-100 rounded-full shadow-2xl z-50 border border-stone-700 transition"
              title="Προηγούμενο έργο (Αριστερό βέλος)"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
          )}

          {/* Side Floating Arrow: Next */}
          {hasNext && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                goToNext();
              }}
              className="hidden lg:flex fixed right-4 top-1/2 -translate-y-1/2 p-3.5 bg-stone-900/90 hover:bg-stone-800 text-stone-100 rounded-full shadow-2xl z-50 border border-stone-700 transition"
              title="Επόμενο έργο (Δεξί βέλος)"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          )}

          {/* Modal Container */}
          <div
            onClick={(e) => e.stopPropagation()}
            className={`border max-w-4xl w-full rounded-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200 flex flex-col md:flex-row my-auto max-h-[92vh] ${isDark ? 'bg-[#121316] border-stone-700 text-stone-200' : 'bg-white border-stone-200 text-stone-900'}`}
          >
            {/* Left Column: Media Stage & Thumbnails Strip */}
            <div className={`w-full md:w-1/2 p-4 flex flex-col justify-between border-b md:border-b-0 md:border-r shrink-0 ${isDark ? 'bg-[#090A0B] border-stone-800' : 'bg-stone-100 border-stone-200'}`}>
              {(() => {
                const mediaList = getItemMediaList(selectedItem);
                const currentMedia = mediaList[activeMediaIdx] || mediaList[0];
                const isVideo = currentMedia?.type === 'video';
                const rawUrl = currentMedia?.url || selectedItem.image;
                const normalizedUrl = isVideo ? normalizeVideoUrl(rawUrl) : rawUrl;

                return (
                  <div className="flex flex-col h-full justify-between">
                    {/* Main Media Stage */}
                    <div className="aspect-[4/3] sm:aspect-square w-full bg-black rounded-xl overflow-hidden relative flex items-center justify-center border border-stone-800/80 shadow-inner group">
                      {isVideo ? (
                        isEmbedVideo(normalizedUrl) ? (
                          <iframe
                            src={getEmbedVideoUrl(normalizedUrl)}
                            title={selectedItem.title}
                            className="w-full h-full border-0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                          />
                        ) : (
                          <video
                            key={normalizedUrl}
                            src={normalizedUrl}
                            controls
                            autoPlay
                            loop
                            playsInline
                            className="w-full h-full object-contain"
                          />
                        )
                      ) : (
                        <>
                          <img
                            src={normalizedUrl}
                            alt={selectedItem.title}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-contain cursor-zoom-in"
                            onClick={() => setIsZoomOpen(true)}
                          />
                          <button
                            onClick={() => setIsZoomOpen(true)}
                            className="absolute bottom-3 right-3 p-2 rounded-lg bg-stone-900/80 hover:bg-stone-800 text-stone-200 border border-stone-700/80 text-xs flex items-center gap-1.5 transition opacity-90 group-hover:opacity-100"
                            title="Μεγέθυνση σε πλήρη οθόνη"
                          >
                            <Maximize2 className="w-3.5 h-3.5" />
                            <span>Zoom</span>
                          </button>
                        </>
                      )}

                      {/* Media Counter Pill */}
                      <div className="absolute top-3 left-3 bg-stone-900/85 backdrop-blur-md px-2.5 py-1 rounded-md text-[11px] font-mono text-stone-300 border border-stone-700/60">
                        {isVideo ? '🎬 Βίντεο' : `📸 Εικόνα ${activeMediaIdx + 1} / ${mediaList.length}`}
                      </div>
                    </div>

                    {/* Thumbnails Gallery Strip */}
                    {mediaList.length > 1 && (
                      <div className={`mt-3 pt-3 border-t ${isDark ? 'border-stone-800/80' : 'border-stone-300'}`}>
                        <div className={`text-[11px] font-mono mb-2 flex items-center justify-between ${isDark ? 'text-stone-400' : 'text-stone-600'}`}>
                          <span>Διαθέσιμα Media ({mediaList.length})</span>
                          <span className={`text-[10px] ${isDark ? 'text-stone-500' : 'text-stone-600'}`}>Κάντε κλικ για εναλλαγή</span>
                        </div>
                        <div className="flex items-center gap-2 overflow-x-auto pb-1 horizontal-scrollbar">
                          {mediaList.map((media, idx) => {
                            const isThumbVideo = media.type === 'video';
                            const isActive = idx === activeMediaIdx;

                            return (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => setActiveMediaIdx(idx)}
                                aria-label={`Εμφάνιση ${media.type === 'video' ? 'βίντεο' : 'εικόνας'} ${idx + 1}`}
                                aria-pressed={isActive}
                                className={`relative w-14 h-14 rounded-lg overflow-hidden shrink-0 border transition-all ${
                                  isActive
                                    ? 'border-amber-400 ring-2 ring-amber-400/20 scale-105'
                                    : isDark ? 'border-stone-800 hover:border-stone-600 opacity-70 hover:opacity-100' : 'border-stone-300 hover:border-stone-500 opacity-80 hover:opacity-100'
                                }`}
                              >
                                {isThumbVideo ? (
                                  <div className="w-full h-full bg-stone-900 flex flex-col items-center justify-center text-red-400">
                                    <Play className="w-4 h-4 fill-current" />
                                    <span className="text-[8px] font-mono mt-0.5">VIDEO</span>
                                  </div>
                                ) : (
                                  <img
                                    src={media.url}
                                    alt={media.title || `Thumb ${idx + 1}`}
                                    className="w-full h-full object-cover"
                                  />
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* Right Column: Curatorial & Artwork Metadata */}
            <div className="w-full md:w-1/2 p-6 flex flex-col justify-between overflow-y-auto">
              <div>
                {/* Header Strip with Close button */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`text-xs font-mono uppercase px-2.5 py-1 rounded ${isDark ? 'text-stone-300 bg-stone-800' : 'text-stone-700 bg-stone-100'}`}>
                      {CATEGORIES.find((c) => c.id === selectedItem.category)?.title}
                    </span>
                    {selectedItem.year && (
                      <span className={`text-xs font-mono px-2 py-1 rounded ${isDark ? 'text-stone-400 bg-stone-800/80' : 'text-stone-600 bg-stone-100'}`}>
                        {selectedItem.year}
                      </span>
                    )}
                    {selectedItem.status && (
                    <span className={`text-xs font-mono px-2.5 py-1 rounded ${isDark ? 'text-emerald-400 bg-emerald-950/40 border border-emerald-800/50' : 'text-emerald-800 bg-emerald-50 border border-emerald-200'}`}>
                        {selectedItem.status}
                      </span>
                    )}
                  </div>

                  <button
                    onClick={closeItemDetail}
                    className={`p-1.5 rounded-full transition ${isDark ? 'bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white' : 'bg-stone-100 hover:bg-stone-200 text-stone-600 hover:text-stone-950'}`}
                    title="Κλείσιμο (Esc)"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Title & Medium */}
                <h2 className={`mt-4 text-2xl sm:text-3xl font-serif leading-snug ${isDark ? 'text-stone-100' : 'text-stone-900'}`}>
                  {selectedItem.title}
                </h2>

                <div className={`mt-2 text-xs font-mono flex items-center gap-1.5 ${isDark ? 'text-amber-300/90' : 'text-amber-800'}`}>
                  <Palette className="w-3.5 h-3.5" />
                  <span>{selectedItem.medium}</span>
                </div>

                {selectedItem.dimensions && (
                  <div className={`mt-1 text-xs font-mono flex items-center gap-1.5 ${isDark ? 'text-stone-400' : 'text-stone-600'}`}>
                    <Compass className="w-3.5 h-3.5" />
                    <span>Διαστάσεις: {selectedItem.dimensions}</span>
                  </div>
                )}

                {/* Curatorial Description */}
                <div className="mt-5">
                  <h4 className={`text-[11px] font-mono uppercase tracking-wider mb-1 ${isDark ? 'text-stone-500' : 'text-stone-600'}`}>
                    Επιμελητική Περιγραφή
                  </h4>
                  <p className={`text-sm leading-relaxed ${isDark ? 'text-stone-300' : 'text-stone-700'}`}>
                    {selectedItem.description}
                  </p>
                </div>

                {/* Curatorial Highlights / Details */}
                {selectedItem.details && selectedItem.details.length > 0 && (
                  <div className="mt-5">
                    <h4 className={`text-[11px] font-mono uppercase tracking-wider mb-2 ${isDark ? 'text-stone-500' : 'text-stone-600'}`}>
                      Χαρακτηριστικά & Τεχνική
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedItem.details.map((detail, idx) => (
                        <span
                          key={idx}
                          className={`text-[11px] px-2.5 py-1 rounded font-mono ${isDark ? 'bg-stone-800/80 text-stone-300 border border-stone-700/60' : 'bg-stone-100 text-stone-700 border border-stone-200'}`}
                        >
                          • {detail}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Wix Provenance Strip removed as requested */}
              </div>

              {/* Bottom Actions Bar */}
              <div className={`mt-8 pt-5 border-t flex flex-wrap items-center justify-between gap-3 ${isDark ? 'border-stone-800' : 'border-stone-200'}`}>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleFavorite(selectedItem.id)}
                    aria-pressed={favorites.includes(selectedItem.id)}
                    aria-label={favorites.includes(selectedItem.id) ? 'Αφαίρεση από τα αγαπημένα' : 'Προσθήκη στα αγαπημένα'}
                    className={`px-3 py-2 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition ${
                      favorites.includes(selectedItem.id)
                        ? isDark ? 'bg-rose-950/60 border-rose-800 text-rose-300' : 'bg-rose-50 border-rose-200 text-rose-700'
                        : isDark ? 'bg-stone-900 border-stone-700 text-stone-300 hover:text-white' : 'bg-white border-stone-300 text-stone-700 hover:text-stone-950'
                    }`}
                  >
                    <Heart className={`w-3.5 h-3.5 ${favorites.includes(selectedItem.id) ? 'fill-current' : ''}`} />
                    <span>{favorites.includes(selectedItem.id) ? 'Στα Αγαπημένα' : 'Αγαπημένο'}</span>
                  </button>

                  <button
                    onClick={() => handleShare(selectedItem)}
                    className={`px-3 py-2 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition ${isDark ? 'bg-stone-900 hover:bg-stone-800 border-stone-700 text-stone-300 hover:text-white' : 'bg-white hover:bg-stone-100 border-stone-300 text-stone-700 hover:text-stone-950'}`}
                    title="Κοινοποίηση"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>Κοινοποίηση</span>
                  </button>
                </div>

                <button
                  onClick={() => {
                    const it = selectedItem;
                    closeItemDetail();
                    onContactArtist(it);
                  }}
                  className={`px-5 py-2.5 rounded-xl font-semibold text-xs sm:text-sm flex items-center gap-2 transition shadow-md ${isDark ? 'bg-stone-100 hover:bg-white text-stone-950 hover:shadow-stone-100/15' : 'bg-stone-900 hover:bg-stone-800 text-white'}`}
                >
                  <Mail className="w-4 h-4" />
                  <span>Εκδήλωση Ενδιαφέροντος</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. Fullscreen Lightbox / Zoom Modal */}
      {isZoomOpen && selectedItem && (
        <div
          className="fixed inset-0 z-60 bg-black/95 backdrop-blur-lg flex items-center justify-center p-4"
          onClick={() => setIsZoomOpen(false)}
        >
          <button
            onClick={() => setIsZoomOpen(false)}
            className="absolute top-6 right-6 z-10 p-3 rounded-full bg-stone-900/90 text-stone-200 hover:text-white border border-stone-700"
            title="Κλείσιμο Fullscreen (Esc)"
          >
            <X className="w-6 h-6" />
          </button>

          <div
            className="max-w-5xl max-h-[90vh] flex flex-col items-center justify-center relative"
            onClick={(e) => e.stopPropagation()}
          >
            {(() => {
              const mediaList = getItemMediaList(selectedItem);
              const currentMedia = mediaList[activeMediaIdx] || mediaList[0];
              const isVideo = currentMedia?.type === 'video';
              const rawUrl = currentMedia?.url || selectedItem.image;
              const normalizedUrl = isVideo ? normalizeVideoUrl(rawUrl) : rawUrl;

              return isVideo ? (
                isEmbedVideo(normalizedUrl) ? (
                  <iframe
                    src={getEmbedVideoUrl(normalizedUrl)}
                    title={selectedItem.title}
                    className="w-[85vw] h-[75vh] max-w-4xl border-0 rounded-xl"
                    allowFullScreen
                  />
                ) : (
                  <video
                    src={normalizedUrl}
                    controls
                    autoPlay
                    className="max-h-[85vh] max-w-full rounded-xl"
                  />
                )
              ) : (
                <img
                  src={normalizedUrl}
                  alt={selectedItem.title}
                  referrerPolicy="no-referrer"
                  className="max-h-[85vh] max-w-full object-contain rounded-xl shadow-2xl"
                />
              );
            })()}

            <div className="mt-3 text-center">
              <h3 className="text-stone-100 font-serif text-lg">{selectedItem.title}</h3>
              <p className="text-stone-400 text-xs font-mono mt-0.5">{selectedItem.medium}</p>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

