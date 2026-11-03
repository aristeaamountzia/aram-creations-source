import { usePortfolioDesign } from '../lib/use-portfolio-design';
import { DEFAULT_DESIGN_STUDIO, DesignStudio, normalizeDesignStudio } from '../lib/design-studio';
import { portfolioStatusLabel } from '../lib/portfolio-settings';
import { portfolioMedia } from '../lib/video-links';
import { VideoPlayer } from './VideoPlayer';
import { ImageLightbox } from './ImageLightbox';
import { CatalogControls } from './CatalogControls';
import { PortfolioHero, portfolioHeroVideoUrl } from './PortfolioHero';
import { sanitizeVintedDescription } from '../lib/vinted-sanitizer';
import React, { useState, useEffect, useMemo } from 'react';
import { CategoryId, ArtItem, ArtMediaItem } from '../types';
import { CATEGORIES, ART_ITEMS } from '../data';
import { sortPortfolio } from '../lib/portfolio-order';
import { db } from '../firebase';
import { collection, doc, onSnapshot } from 'firebase/firestore';
import { Palette, Eye, Mail, ArrowUpRight, Sparkles, Filter, Search, Film, Image as ImageIcon, Heart, Share2, ChevronLeft, ChevronRight, X, Maximize2, ZoomIn, Play, Layers, Compass, SlidersHorizontal, Check, ExternalLink, Info } from 'lucide-react';
interface PortfolioViewProps {
    onContactArtist: (item?: ArtItem) => void;
}
export const PortfolioView: React.FC<PortfolioViewProps> = ({ onContactArtist }) => {
    // Only the 8 independent art categories (excluding jewelry which is in Shop)
    const design = usePortfolioDesign();
    const artCategories = design.categories;
    // Firebase Live Sync with fallback to ART_ITEMS
    const [items, setItems] = useState<ArtItem[]>(ART_ITEMS);
    const [selectedCatId, setSelectedCatId] = useState<CategoryId | 'all'>('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [filterMode, setFilterMode] = useState<'all' | 'favorites'>('all');
    const [heroVideoUrl, setHeroVideoUrl] = useState('');
    const [designStudio, setDesignStudio] = useState<DesignStudio>(DEFAULT_DESIGN_STUDIO);
    useEffect(() => onSnapshot(doc(db, 'settings', 'shop'), snapshot => {
        const data = snapshot.data();
        setHeroVideoUrl(portfolioHeroVideoUrl(data?.portfolioHeroVideoUrl));
        if (data?.designStudio) {
            setDesignStudio(normalizeDesignStudio(data.designStudio));
        }
    }, error => console.warn('Portfolio hero settings could not be loaded:', error)), []);
    const [sortBy, setSortBy] = useState<'default' | 'newest' | 'title' | 'category'>('default');
    const [favorites, setFavorites] = useState<string[]>(() => {
        try {
            const saved = JSON.parse(localStorage.getItem('aram_portfolio_favorites') || '[]');
            return Array.isArray(saved) ? saved.filter((id): id is string => typeof id === 'string') : [];
        }
        catch {
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
        }
        catch (e) {
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
        if (!sharedId)
            return;
        const sharedItem = items.find((item) => item.id === sharedId);
        if (sharedItem) {
            setSelectedItem(sharedItem);
            setActiveMediaIdx(0);
        }
    }, [items]);
    useEffect(() => {
        if (!window.location.hash.startsWith('#portfolio/'))
            return;
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
            const unsubscribe = onSnapshot(colRef, (snapshot) => {
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
                    if (!deletedIds.has(it.id))
                        combinedMap.set(it.id, it);
                });
                firestoreItems.forEach((it) => {
                    if (!deletedIds.has(it.id))
                        combinedMap.set(it.id, it);
                });
                setItems(Array.from(combinedMap.values()));
            }, (error) => {
                console.warn('Firestore portfolio sync offline, using local curated catalog:', error);
            });
            return () => unsubscribe();
        }
        catch (e) {
            console.warn('Firebase portfolio not configured, using ART_ITEMS', e);
        }
    }, []);
    const toggleFavorite = (id: string, e?: React.MouseEvent) => {
        if (e)
            e.stopPropagation();
        setFavorites((prev) => prev.includes(id) ? prev.filter((fid) => fid !== id) : [...prev, id]);
    };
    const getItemMediaList = portfolioMedia;
    // Helper to check if item has video
    const itemHasVideo = (item: ArtItem): boolean => {
        if (item.videoUrl)
            return true;
        if (item.mediaList && item.mediaList.some((m) => m.type === 'video'))
            return true;
        return getItemMediaList(item).some(m => m.type === 'video');
    };
    // Filter and sort items
    const filteredAndSortedItems = useMemo(() => {
        let result = items.filter((item) => {
            // Category filter
            if (selectedCatId !== 'all' && item.category !== selectedCatId) {
                return false;
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
                const catMatch = artCategories.find((c) => c.id === item.category)?.title.toLowerCase().includes(q);
                if (!titleMatch && !descMatch && !medMatch && !dimMatch && !yearMatch && !catMatch) {
                    return false;
                }
            }
            return true;
        });
        // Sort
        if (sortBy === 'default') {
            result = sortPortfolio(result);
        }
        else if (sortBy === 'newest') {
            result.sort((a, b) => (b.year || '').localeCompare(a.year || ''));
        }
        else if (sortBy === 'title') {
            result.sort((a, b) => a.title.localeCompare(b.title, 'el'));
        }
        else if (sortBy === 'category') {
            result.sort((a, b) => a.category.localeCompare(b.category));
        }
        return result;
    }, [items, selectedCatId, filterMode, favorites, searchTerm, sortBy, artCategories]);
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
        if (!selectedItem || isZoomOpen)
            return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                if (isZoomOpen)
                    setIsZoomOpen(false);
                else
                    closeItemDetail();
            }
            else if (e.key === 'ArrowLeft') {
                goToPrev();
            }
            else if (e.key === 'ArrowRight') {
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
            }
            catch (error) {
                if ((error as DOMException)?.name !== 'AbortError')
                    setShareError('Δεν ήταν δυνατή η κοινοποίηση. Δοκιμάστε ξανά.');
            }
        }
        else {
            try {
                await navigator.clipboard.writeText(url.toString());
                setCopiedToast(true);
                setTimeout(() => setCopiedToast(false), 2500);
            }
            catch {
                setShareError('Δεν επιτράπηκε η αντιγραφή του συνδέσμου από το πρόγραμμα περιήγησης.');
            }
        }
    };
    const activeCategoryMeta = artCategories.find((c) => c.id === selectedCatId);
    const totalVideoCount = items.filter(itemHasVideo).length;
    const zoomImages = (selectedItem ? getItemMediaList(selectedItem) : [])
        .map((media, index) => ({ ...media, mediaIndex: index }));
    return (<div className="portfolio-view min-h-screen pb-24 font-sans transition-colors duration-300 bg-[#fafaf9] text-[#18181b]"
      style={{
        backgroundColor: designStudio.pageBackground || '#fafaf9',
        color: designStudio.ink || '#18181b',
        fontFamily: designStudio.fontFamily || "'Jura', sans-serif"
      }}>
      
      {/* Toast Notification */}
      {copiedToast && (<div className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 text-xs animate-in fade-in slide-in-from-bottom-2 border ${'bg-stone-900 text-white border-stone-800'}`}>
          <Check className="w-4 h-4 text-emerald-400"/>
          <span>Ο σύνδεσμος του έργου αντιγράφηκε στο πρόχειρο!</span>
        </div>)}
      {shareError && (<div role="alert" className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-2xl text-xs bg-rose-50 text-rose-800 border border-rose-200">
          {shareError}
        </div>)}

      <PortfolioHero design={design} videoUrl={heroVideoUrl} itemCount={items.length} categoryCount={artCategories.length}
        videoCount={totalVideoCount} onContactArtist={() => onContactArtist()} />

      <div id="portfolio-catalog" className="catalog-content max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        <CatalogControls label="Φίλτρα Portfolio" search={searchTerm} onSearch={setSearchTerm}
          placeholder="Αναζήτηση σε τίτλο, υλικά, διαστάσεις, τεχνική..."
          categories={[{ id: 'all', label: 'Όλες οι Κατηγορίες' }, ...artCategories.map(category => ({ id: category.id, label: category.title, count: items.filter(item => item.category === category.id).length }))]}
          selectedCategory={selectedCatId} onCategory={id => setSelectedCatId(id as CategoryId | 'all')}
          actions={<>
            <button type="button" aria-pressed={filterMode === 'all'} onClick={() => setFilterMode('all')}>Όλα ({items.length})</button>
            <button type="button" aria-pressed={filterMode === 'favorites'} onClick={() => setFilterMode('favorites')}><Heart aria-hidden="true" />Αγαπημένα ({favorites.length})</button>
            <div className="catalog-sort"><span>Ταξινόμηση:</span><select aria-label="Ταξινόμηση Portfolio" value={sortBy} onChange={event => setSortBy(event.target.value as any)}>
              <option value="default">Προτεινόμενα</option><option value="newest">Νεότερα</option><option value="title">Αλφαβητικά (Α-Ω)</option><option value="category">Ανά Κατηγορία</option>
            </select></div>
          </>}>
          {activeCategoryMeta && <p className="catalog-category-note"><strong>{activeCategoryMeta.title}:</strong> {activeCategoryMeta.description}</p>}
        </CatalogControls>
      </div>

      {/* 3. Artwork Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Results Header */}
        <div className="flex items-center justify-between text-xs mb-6 font-sans text-stone-500">
          <span>Εμφάνιση {filteredAndSortedItems.length} έργων</span>
          {searchTerm && (<button onClick={() => setSearchTerm('')} className={`underline underline-offset-4 ${'hover:text-stone-950'}`}>
              Καθαρισμός αναζήτησης
            </button>)}
        </div>

        {filteredAndSortedItems.length === 0 ? (<div className="py-24 text-center border border-stone-200 bg-white rounded-2xl p-8">
            <Palette className="w-12 h-12 text-stone-400 mx-auto mb-4"/>
            <h3 className="text-lg font-sans font-semibold text-stone-900">Δεν βρέθηκαν έργα</h3>
            <p className="text-xs mt-1 max-w-sm mx-auto text-stone-500">
              Δοκιμάστε να αλλάξετε τα φίλτρα, την αναζήτηση ή να επιλέξετε άλλη κατηγορία.
            </p>
            <button onClick={() => {
                setSelectedCatId('all');
                setSearchTerm('');
                setFilterMode('all');
            }} className="mt-4 px-4 py-2 rounded-lg text-xs font-semibold transition-colors bg-stone-900 hover:bg-stone-800 text-white">
              Επαναφορά Όλων
            </button>
          </div>) : (<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {filteredAndSortedItems.map((item) => {
                const cat = artCategories.find((c) => c.id === item.category);
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
                    className="catalog-card group cursor-pointer bg-white border border-stone-200/80 rounded-xl overflow-hidden hover:border-stone-400/80 hover:shadow-xs transition-all duration-300 flex flex-col justify-between"
                    style={{
                      borderRadius: designStudio.cardRadius || '12px',
                      backgroundColor: designStudio.surface || '#ffffff',
                      borderColor: designStudio.line || '#e4e4e7'
                    }}
                  >
                    {/* Media Container aspect-[4/5] identical to Shop */}
                    <div className="relative aspect-[4/5] overflow-hidden bg-stone-100">
                      {mediaList[0]?.type === 'video' ? (
                        <div className="flex h-full items-center justify-center bg-stone-900">
                          <Play className="h-12 w-12 text-white" aria-label="Έργο με βίντεο" />
                        </div>
                      ) : (
                        <img
                          src={mediaList[0]?.url || item.image}
                          alt={item.title}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          loading="lazy"
                        />
                      )}

                      {/* Top Right: Minimal Heart / Favorite Button */}
                      <button
                        type="button"
                        onClick={(e) => toggleFavorite(item.id, e)}
                        aria-label={isFav ? `Αφαίρεση ${item.title} από τα αγαπημένα` : `Προσθήκη ${item.title} στα αγαπημένα`}
                        aria-pressed={isFav}
                        className={`absolute top-2.5 right-2.5 z-10 w-8 h-8 rounded-full backdrop-blur-xs transition-transform active:scale-90 flex items-center justify-center border shadow-xs ${
                          isFav ? 'bg-rose-50/95 text-rose-600 border-rose-200' : 'bg-white/80 text-stone-600 hover:text-stone-900 border-stone-200/80 hover:bg-white'
                        }`}
                        title={isFav ? 'Αφαίρεση από τα αγαπημένα' : 'Προσθήκη στα αγαπημένα'}
                      >
                        <Heart className={`w-3.5 h-3.5 ${isFav ? 'fill-rose-500 text-rose-500' : ''}`} />
                      </button>

                      {/* Discreet status badge if present */}
                      {item.status && (
                        <div className="absolute top-2.5 left-2.5 z-10">
                          <span className="px-2.5 py-0.5 rounded-full bg-stone-900/90 text-stone-100 text-[10px] font-semibold tracking-wider uppercase shadow-xs backdrop-blur-xs">
                            {portfolioStatusLabel(design, item.status)}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Artwork Content Info (Clean MONÉ-style Layout) */}
                    <div className="p-3.5 sm:p-4 flex-1 flex flex-col justify-between space-y-2.5">
                      <div>
                        {/* Micro-header: Category + Year / Dimension */}
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] font-semibold text-stone-400 uppercase tracking-[0.16em]">
                            {cat?.title || 'Έργο Τέχνης'}
                          </span>
                          {(item.year || item.dimensions) && (
                            <span className="text-[11px] font-medium text-stone-400">
                              {item.year || item.dimensions}
                            </span>
                          )}
                        </div>

                        {/* Title */}
                        <h3 className="text-sm font-semibold text-stone-900 line-clamp-1 group-hover:text-stone-600 transition-colors tracking-tight mt-1">
                          {item.title}
                        </h3>

                        {/* Medium subtitle */}
                        {item.medium && (
                          <p className="text-xs text-stone-500 line-clamp-1 mt-0.5">
                            {item.medium}
                          </p>
                        )}
                      </div>

                      {/* Footer Row */}
                      <div className="pt-2.5 border-t border-stone-100 flex items-center justify-between gap-2">
                        <span className="text-xs font-medium text-stone-400">
                          {item.year || 'Portfolio'}
                        </span>
                        <button
                          type="button"
                          onClick={() => { setSelectedItem(item); setActiveMediaIdx(0); }}
                          className="px-3 py-1.5 bg-stone-900 hover:bg-stone-800 text-white rounded-lg text-xs font-semibold transition shadow-xs flex items-center gap-1.5 active:scale-98"
                        >
                          <span>Προβολή</span>
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
            })}
          </div>)}
      </section>

      {/* 4. Rich Artwork Detail Modal (Shop-like experience with Video and Gallery) */}
      {selectedItem && (<div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto" onClick={closeItemDetail}>
          {/* Side Floating Arrow: Previous */}
          {hasPrev && (<button onClick={(e) => {
                    e.stopPropagation();
                    goToPrev();
                }} className="hidden lg:flex fixed left-4 top-1/2 -translate-y-1/2 p-3.5 bg-stone-900/90 hover:bg-stone-800 text-stone-100 rounded-full shadow-2xl z-50 border border-stone-700 transition" title="Προηγούμενο έργο (Αριστερό βέλος)">
              <ChevronLeft className="w-6 h-6"/>
            </button>)}

          {/* Side Floating Arrow: Next */}
          {hasNext && (<button onClick={(e) => {
                    e.stopPropagation();
                    goToNext();
                }} className="hidden lg:flex fixed right-4 top-1/2 -translate-y-1/2 p-3.5 bg-stone-900/90 hover:bg-stone-800 text-stone-100 rounded-full shadow-2xl z-50 border border-stone-700 transition" title="Επόμενο έργο (Δεξί βέλος)">
              <ChevronRight className="w-6 h-6"/>
            </button>)}

          {/* Modal Container */}
          <div onClick={(e) => e.stopPropagation()} className={`border max-w-4xl w-full rounded-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200 flex flex-col md:flex-row my-auto max-h-[92vh] ${'bg-white border-[#e5def3] text-[#252134]'}`}>
            {/* Left Column: Media Stage & Thumbnails Strip */}
            <div className={`w-full md:w-1/2 p-4 flex flex-col justify-between border-b md:border-b-0 md:border-r shrink-0 ${'bg-stone-100 border-[#e5def3]'}`}>
              {(() => {
                const mediaList = getItemMediaList(selectedItem);
                const currentMedia = mediaList[activeMediaIdx] || mediaList[0];
                const isVideo = currentMedia?.type === 'video';
                const rawUrl = currentMedia?.url || selectedItem.image;
                const normalizedUrl = rawUrl;
                return (<div className="flex flex-col h-full justify-between">
                    {/* Main Media Stage */}
                    <div className="aspect-[4/3] sm:aspect-square w-full bg-black rounded-xl overflow-hidden relative flex items-center justify-center border border-stone-800/80 shadow-inner group">
                      {isVideo ? (<VideoPlayer url={normalizedUrl} title={selectedItem.title} autoPlay />) : (<>
                          <img src={normalizedUrl} alt={selectedItem.title} referrerPolicy="no-referrer" className="w-full h-full object-contain cursor-zoom-in" onClick={() => setIsZoomOpen(true)}/>
                          <button onClick={() => setIsZoomOpen(true)} className="absolute bottom-3 right-3 p-2 rounded-lg bg-stone-900/80 hover:bg-stone-800 text-stone-200 border border-stone-700/80 text-xs flex items-center gap-1.5 transition opacity-90 group-hover:opacity-100" title="Μεγέθυνση σε πλήρη οθόνη">
                            <Maximize2 className="w-3.5 h-3.5"/>
                            <span>Zoom</span>
                          </button>
                        </>)}

                      {/* Media Counter Pill */}
                      <div className="absolute top-3 left-3 bg-stone-900/85 backdrop-blur-md px-2.5 py-1 rounded-md text-[11px] font-sans text-stone-300 border border-stone-700/80">
                        {isVideo ? 'Βίντεο' : `Εικόνα ${activeMediaIdx + 1} / ${mediaList.length}`}
                      </div>
                    </div>

                    {isVideo && <button type="button" onClick={() => setIsZoomOpen(true)} className="mt-2 rounded-lg border px-3 py-2 text-sm">Προβολή βίντεο σε πλήρη οθόνη</button>}
                    {/* Thumbnails Gallery Strip */}
                    {mediaList.length > 1 && (<div className={`mt-3 pt-3 border-t 'border-stone-200'`}>
                        <div className={`text-[11px] font-sans mb-2 flex items-center justify-between 'text-stone-500'`}>
                          <span>Διαθέσιμα Media ({mediaList.length})</span>
                          <span className={`text-[10px] 'text-stone-500'`}>Κάντε κλικ για εναλλαγή</span>
                        </div>
                        <div className="flex items-center gap-2 overflow-x-auto pb-1 horizontal-scrollbar">
                          {mediaList.map((media, idx) => {
                            const isThumbVideo = media.type === 'video';
                            const isActive = idx === activeMediaIdx;
                            return (<button key={idx} type="button" onClick={() => setActiveMediaIdx(idx)} aria-label={`Εμφάνιση ${media.type === 'video' ? 'βίντεο' : 'εικόνας'} ${idx + 1}`} aria-pressed={isActive} className={`relative w-14 h-14 rounded-lg overflow-hidden shrink-0 border transition-all ${isActive
                                    ? 'border-stone-900 ring-2 ring-stone-900/20 scale-105'
                                    : 'border-stone-200 hover:border-stone-400 opacity-80 hover:opacity-100'}`}>
                                {isThumbVideo ? (<div className="w-full h-full bg-stone-900 flex flex-col items-center justify-center text-red-400">
                                    <Play className="w-4 h-4 fill-current"/>
                                    <span className="text-[8px] font-sans mt-0.5">VIDEO</span>
                                  </div>) : (<img src={media.url} alt={media.title || `Thumb ${idx + 1}`} referrerPolicy="no-referrer" className="w-full h-full object-cover"/>)}
                              </button>);
                        })}
                        </div>
                      </div>)}
                  </div>);
            })()}
            </div>

            {/* Right Column: Curatorial & Artwork Metadata */}
            <div className="w-full md:w-1/2 p-6 flex flex-col justify-between overflow-y-auto">
              <div>
                {/* Header Strip with Close button */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`text-xs font-sans uppercase px-2.5 py-1 rounded 'text-stone-700 bg-stone-100'`}>
                      {artCategories.find((c) => c.id === selectedItem.category)?.title}
                    </span>
                    {selectedItem.year && (<span className={`text-xs font-sans px-2 py-1 rounded 'text-stone-600 bg-stone-100'`}>
                        {selectedItem.year}
                      </span>)}
                    {selectedItem.status && (<span className={`text-xs font-sans px-2.5 py-1 rounded ${'text-emerald-800 bg-emerald-50 border border-emerald-200'}`}>
                        {portfolioStatusLabel(design, selectedItem.status)}
                      </span>)}
                  </div>

                  <button onClick={closeItemDetail} className={`p-1.5 rounded-full transition 'bg-stone-100 hover:bg-stone-200 text-stone-600 hover:text-stone-900'`} title="Κλείσιμο (Esc)">
                    <X className="w-5 h-5"/>
                  </button>
                </div>

                {/* Title & Medium */}
                <h2 className={`mt-4 text-2xl sm:text-3xl font-sans leading-snug 'text-stone-900'`}>
                  {selectedItem.title}
                </h2>

                <div className={`mt-2 text-xs font-sans flex items-center gap-1.5 'text-stone-700'`}>
                  <Palette className="w-3.5 h-3.5"/>
                  <span>{design.labels.medium}: {selectedItem.medium}</span>
                </div>

                {selectedItem.dimensions && (<div className={`mt-1 text-xs font-sans flex items-center gap-1.5 'text-stone-500'`}>
                    <Compass className="w-3.5 h-3.5"/>
                    <span>{design.labels.dimensions}: {selectedItem.dimensions}</span>
                  </div>)}

                {/* Curatorial Description */}
                <div className="mt-5">
                  <h4 className={`text-[11px] font-sans uppercase tracking-wider mb-1 'text-stone-500'`}>
                    Επιμελητική Περιγραφή
                  </h4>
                  <p className={`text-sm leading-relaxed 'text-stone-600'`}>
                    {sanitizeVintedDescription(selectedItem.description)}
                  </p>
                </div>

                {/* Curatorial Highlights / Details */}
                {selectedItem.details && selectedItem.details.length > 0 && (<div className="mt-5">
                    <h4 className={`text-[11px] font-sans uppercase tracking-wider mb-2 'text-stone-500'`}>
                      Χαρακτηριστικά & Τεχνική
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedItem.details.map((detail, idx) => (<span key={idx} className={`text-[11px] px-2.5 py-1 rounded font-sans 'bg-stone-100 text-stone-700 border border-stone-200'`}>
                          • {detail}
                        </span>))}
                    </div>
                  </div>)}

                {/* Wix Provenance Strip removed as requested */}
              </div>

              {/* Bottom Actions Bar */}
              <div className={`mt-8 pt-5 border-t flex flex-wrap items-center justify-between gap-3 'border-stone-200'`}>
                <div className="flex items-center gap-2">
                  <button onClick={() => toggleFavorite(selectedItem.id)} aria-pressed={favorites.includes(selectedItem.id)} aria-label={favorites.includes(selectedItem.id) ? 'Αφαίρεση από τα αγαπημένα' : 'Προσθήκη στα αγαπημένα'} className={`px-3 py-2 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition ${favorites.includes(selectedItem.id)
                ? 'bg-rose-50 border-rose-200 text-rose-700'
                : 'bg-white border-stone-200 text-stone-700 hover:text-stone-900'}`}>
                    <Heart className={`w-3.5 h-3.5 ${favorites.includes(selectedItem.id) ? 'fill-current' : ''}`}/>
                    <span>{favorites.includes(selectedItem.id) ? 'Στα Αγαπημένα' : 'Αγαπημένο'}</span>
                  </button>

                  <button onClick={() => handleShare(selectedItem)} className={`px-3 py-2 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition 'bg-white hover:bg-stone-100 border-stone-200 text-stone-700 hover:text-stone-900'`} title="Κοινοποίηση">
                    <Share2 className="w-3.5 h-3.5"/>
                    <span>Κοινοποίηση</span>
                  </button>
                </div>

                <button onClick={() => {
                const it = selectedItem;
                closeItemDetail();
                onContactArtist(it);
            }} className={`px-5 py-2.5 rounded-xl font-semibold text-xs sm:text-sm flex items-center gap-2 transition shadow-md 'bg-stone-900 hover:bg-stone-800 text-white'`}>
                  <Mail className="w-4 h-4"/>
                  <span>Εκδήλωση Ενδιαφέροντος</span>
                </button>
              </div>
            </div>
          </div>
        </div>)}

      {isZoomOpen && selectedItem && zoomImages.length > 0 && (
        <ImageLightbox images={zoomImages} title={selectedItem.title}
          index={zoomImages.findIndex(media => media.mediaIndex === activeMediaIdx)}
          onIndexChange={index => setActiveMediaIdx(zoomImages[index].mediaIndex)}
          onClose={() => setIsZoomOpen(false)} />
      )}

    </div>);
};
