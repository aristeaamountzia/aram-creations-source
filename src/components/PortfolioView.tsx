import { localizedArt, localizedCategory } from '../lib/portfolio-copy';
import { localizedTerm, publicTextLanguage } from '../lib/public-copy';
import { portfolioItemId, portfolioItemPath } from '../lib/public-locale';
import { usePublicLanguage } from "../lib/use-public-language";
import { usePortfolioDesign } from '../lib/use-portfolio-design';
import { portfolioStatusLabel } from '../lib/portfolio-settings';
import { portfolioMedia } from '../lib/video-links';
import { ImageLightbox } from './ImageLightbox';
import { pickHeroSnapshot } from '../lib/hero-media';
import { CollectionHero } from './content/CollectionHero';
import { ContentCard } from './content/ContentCard';
import { DetailView } from './content/DetailView';
import { FilterBar } from './content/FilterBar';
import { MediaGallery } from './content/MediaGallery';
import { SectionShell } from './content/SectionShell';
import { StatusBadge } from './content/StatusBadge';
import { initialHeroSnapshot, cacheHeroSnapshot } from '../lib/hero-media';
import { sanitizeVintedDescription } from '../lib/vinted-sanitizer';
import React, { useState, useEffect, useMemo } from 'react';
import { CategoryId, ArtItem, ArtMediaItem } from '../types';
import { CATEGORIES, ART_ITEMS } from '../data';
import { sortPortfolio } from '../lib/portfolio-order';
import { db } from '../firebase';
import { collection, doc, onSnapshot } from 'firebase/firestore';
import { Palette, Mail, ArrowUpRight, Filter, Search, Heart, Share2, X, Play, Compass, Check, Info } from 'lucide-react';
interface PortfolioViewProps {
    onContactArtist: (item?: ArtItem) => void;
}
export const PortfolioView: React.FC<PortfolioViewProps> = ({ onContactArtist }) => {
  const { locale, t } = usePublicLanguage();
    // Only the 8 independent art categories (excluding jewelry which is in Shop)
    const design = usePortfolioDesign();
    const artCategories = design.categories;
    // Firebase Live Sync with fallback to ART_ITEMS
    const [sourceItems, setItems] = useState<ArtItem[]>(ART_ITEMS);
    const items = useMemo(() => sourceItems.map(item => localizedArt(item, locale)), [sourceItems, locale]);
    const [selectedCatId, setSelectedCatId] = useState<CategoryId | 'all'>('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [filterMode, setFilterMode] = useState<'all' | 'favorites'>('all');
    const [heroVideoUrl, setHeroVideoUrl] = useState(() => initialHeroSnapshot().portfolioHeroVideoUrl);
    useEffect(() => onSnapshot(doc(db, 'settings', 'shop'), snapshot => {
        const data = snapshot.data();
        setHeroVideoUrl(pickHeroSnapshot(data).portfolioHeroVideoUrl);
        if (data) cacheHeroSnapshot(data);
    }, error => console.warn('Portfolio hero settings could not be loaded:', error)), []);
    const [sortBy, setSortBy] = useState<'default' | 'newest' | 'title' | 'category'>('default');
    const [layout, setLayout] = useState<'grid' | 'list'>(() => {
        try { return localStorage.getItem('aram_portfolio_layout') === 'list' ? 'list' : 'grid'; }
        catch { return 'grid'; }
    });
    const selectLayout = (value: 'grid' | 'list') => {
        setLayout(value);
        try { localStorage.setItem('aram_portfolio_layout', value); } catch {}
    };
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
    const [sharedId, setSharedId] = useState(() => portfolioItemId(window.location.hash));
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
        setSharedId(null);
        if (window.location.hash.startsWith('#portfolio/')) {
            window.location.replace('#portfolio');
        }
    };
    useEffect(() => {
        const syncSharedItem = () => {
            const id = portfolioItemId(window.location.hash);
            setSharedId(id);
            setActiveMediaIdx(0);
            if (!id) setSelectedItem(null);
        };
        window.addEventListener('hashchange', syncSharedItem);
        window.addEventListener('popstate', syncSharedItem);
        return () => {
            window.removeEventListener('hashchange', syncSharedItem);
            window.removeEventListener('popstate', syncSharedItem);
        };
    }, []);
    useEffect(() => {
        if (!sharedId)
            return;
        const sharedItem = items.find((item) => item.id === sharedId);
        setSelectedItem(sharedItem ?? null);
    }, [items, sharedId]);
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
                        title: data.title || data.name || t("Χωρίς Τίτλο", "Untitled"),
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
            result.sort((a, b) => a.title.localeCompare(b.title, locale));
        }
        else if (sortBy === 'category') {
            result.sort((a, b) => a.category.localeCompare(b.category));
        }
        return result;
    }, [items, selectedCatId, filterMode, favorites, searchTerm, sortBy, artCategories, locale]);
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
        const url = new URL(portfolioItemPath(locale, item.id), window.location.origin);
        setShareError('');
        if (navigator.share) {
            try {
                await navigator.share({
                    title: `${item.title} • Aram Creations`,
                    text: item.description,
                    url: url.toString()
                });
            }
            catch (error) {
                if ((error as DOMException)?.name !== 'AbortError')
                    setShareError(t("Δεν ήταν δυνατή η κοινοποίηση. Δοκιμάστε ξανά.", "Could not share the work. Try again."));
            }
        }
        else {
            try {
                await navigator.clipboard.writeText(url.toString());
                setCopiedToast(true);
                setTimeout(() => setCopiedToast(false), 2500);
            }
            catch {
                setShareError(t("Δεν επιτράπηκε η αντιγραφή του συνδέσμου από το πρόγραμμα περιήγησης.", "The browser blocked copying the link."));
            }
        }
    };
    const activeCategoryMeta = artCategories.find((c) => c.id === selectedCatId);
    const zoomImages = (selectedItem ? getItemMediaList(selectedItem) : [])
        .map((media, index) => ({ ...media, mediaIndex: index }));
    return (<SectionShell section="portfolio" className="portfolio-view">
      
      {/* Toast Notification */}
      {copiedToast && (<div className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 text-xs animate-in fade-in slide-in-from-bottom-2 border ${'bg-stone-900 text-white border-stone-800'}`}>
          <Check className="w-4 h-4 text-emerald-400"/>
          <span>{t("Ο σύνδεσμος του έργου αντιγράφηκε στο πρόχειρο!", "Link copied!")}</span>
        </div>)}
      {shareError && (<div role="alert" className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-2xl text-xs bg-rose-50 text-rose-800 border border-rose-200">
          {shareError}
        </div>)}

      <CollectionHero key={heroVideoUrl} collection="portfolio" videoUrl={heroVideoUrl}
        title={t(design.title, 'Portfolio')} description={t(design.subtitle, 'Sculpture, drawing, photography and digital work.')} appearance={design.heroAppearance}>
        <button type="button" className="studio-link" onClick={() => onContactArtist()}>
          <Mail size={16} aria-hidden="true" /> {t(design.contactLabel, 'Contact')}
        </button>
      </CollectionHero>

      <div id="portfolio-catalog" tabIndex={-1} className="catalog-content public-catalog portfolio-gallery">
        <h2 className="catalog-heading">{t("Τα έργα", "Selected work")}</h2>
        <FilterBar label={t("Φίλτρα Portfolio", "Portfolio filters")} search={searchTerm} onSearch={setSearchTerm}
          placeholder={t("Αναζήτηση έργων", "Search works")} compactCategories
          categories={[{ id: 'all', label: t("Όλες οι κατηγορίες", "All categories") }, ...artCategories.map(category => ({ id: category.id, label: category.title, count: items.filter(item => item.category === category.id).length }))]}
          selectedCategory={selectedCatId} onCategory={id => setSelectedCatId(id as CategoryId | 'all')}
          actions={<>
            <button type="button" aria-pressed={filterMode === 'all'} onClick={() => setFilterMode('all')}>{t("Όλα (", "All (")}{items.length})</button>
            <button type="button" aria-pressed={filterMode === 'favorites'} onClick={() => setFilterMode('favorites')}><Heart aria-hidden="true" />{t("Αγαπημένα (", "Favorites (")}{favorites.length})</button>
            <div className="catalog-sort"><span>{t("Ταξινόμηση:", "Sort:")}</span><select aria-label={t("Ταξινόμηση Portfolio", "Sort portfolio")} value={sortBy} onChange={event => setSortBy(event.target.value as any)}>
              <option value="default">{t("Προτεινόμενα", "Featured")}</option><option value="newest">{t("Νεότερα", "Newest")}</option><option value="title">{t("Αλφαβητικά (Α-Ω)", "Alphabetical (A–Z)")}</option><option value="category">{t("Ανά Κατηγορία", "By category")}</option>
            </select></div>
          </>}>
          {activeCategoryMeta && <p className="catalog-category-note"><strong>{activeCategoryMeta.title}:</strong> <span lang={publicTextLanguage(localizedCategory(activeCategoryMeta, locale), locale)}>{localizedCategory(activeCategoryMeta, locale)}</span></p>}
        </FilterBar>
      </div>

      {/* 3. Artwork Grid */}
      <section className="portfolio-gallery" aria-label={t("Συλλογή έργων", "Works")}>
        
        {/* Results Header */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs mb-6 font-sans text-stone-500">
          <span aria-live="polite">{t(`Έργα: ${filteredAndSortedItems.length}`, `Showing ${filteredAndSortedItems.length} ${filteredAndSortedItems.length === 1 ? 'work' : 'works'}`)}</span>
          <div className="portfolio-layout" role="group" aria-label={t("Προβολή έργων", "Work layout")}>
            <button type="button" aria-pressed={layout === 'grid'} onClick={() => selectLayout('grid')}>{t("Πλέγμα", "Grid")}</button>
            <button type="button" aria-pressed={layout === 'list'} onClick={() => selectLayout('list')}>{t("Λίστα", "List")}</button>
          </div>
          {searchTerm && (<button onClick={() => setSearchTerm('')} className={`underline underline-offset-4 ${'hover:text-stone-950'}`}>{t("Καθαρισμός αναζήτησης", "Clear search")}</button>)}
        </div>

        {filteredAndSortedItems.length === 0 ? (<div className="py-24 text-center border border-stone-200 bg-white rounded-2xl p-8">
            <Palette className="w-12 h-12 text-stone-400 mx-auto mb-4"/>
            <h3 className="text-lg font-sans font-semibold text-stone-900">{t("Δεν βρέθηκαν έργα", "No works found")}</h3>
            <p className="text-xs mt-1 max-w-sm mx-auto text-stone-500">{t("Δοκιμάστε να αλλάξετε τα φίλτρα, την αναζήτηση ή να επιλέξετε άλλη κατηγορία.", "Try changing the filters or searching for something else.")}</p>
            <button onClick={() => {
                setSelectedCatId('all');
                setSearchTerm('');
                setFilterMode('all');
            }} className="mt-4 px-4 py-2 rounded-lg text-xs font-semibold transition-colors bg-stone-900 hover:bg-stone-800 text-white">{t("Επαναφορά Όλων", "Reset filters")}</button>
          </div>) : (<div data-layout={layout} className="portfolio-art-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {filteredAndSortedItems.map((item) => {
                const cat = artCategories.find((c) => c.id === item.category);
                const mediaList = getItemMediaList(item);
                const hasVideo = itemHasVideo(item);
                const isFav = favorites.includes(item.id);
                return (
                  <ContentCard
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
                    aria-label={t(`${item.title}. Πατήστε Enter για άνοιγμα έργου.`, `${item.title}. Press Enter to view artwork.`)}
                    className="border-stone-200/80 hover:border-stone-400/80"
                  >
                    {/* Media Container aspect-[4/5] identical to Shop */}
                    <div className="portfolio-card-media relative aspect-[4/5] overflow-hidden bg-stone-100">
                      {mediaList[0]?.type === 'video' ? (
                        <div className="flex h-full items-center justify-center bg-stone-900">
                          <Play className="h-12 w-12 text-white" aria-label={t("Έργο με βίντεο", "Work with video")} />
                        </div>
                      ) : (
                        <img
                          src={mediaList[0]?.url || item.image}
                          alt={item.title}
                          referrerPolicy="no-referrer"
                          className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ${
                            item.status && (item.status.trim().toLowerCase() === 'πουλήθηκε' || item.status.trim().toLowerCase() === 'sold') ? 'grayscale-[15%] opacity-90' : ''
                          }`}
                          loading="lazy"
                          decoding="async"
                        />
                      )}

                      {/* Discreet Luxury Sold Overlay for Portfolio */}
                      {item.status && (item.status.trim().toLowerCase() === 'πουλήθηκε' || item.status.trim().toLowerCase() === 'sold') && (
                        <div className="absolute inset-0 bg-stone-950/30 backdrop-blur-[1px] z-10 flex items-center justify-center pointer-events-none transition-all duration-300 group-hover:bg-stone-950/20">
                          <StatusBadge className="px-3.5 py-1.5 tracking-[0.2em]">{t("Πουλήθηκε", "Sold")}</StatusBadge>
                        </div>
                      )}

                      {/* Top Right: Minimal Heart / Favorite Button */}
                      <button
                        type="button"
                        onClick={(e) => toggleFavorite(item.id, e)}
                        aria-label={isFav ? t(`Αφαίρεση ${item.title} από τα αγαπημένα`, `Remove ${item.title} from favorites`) : t(`Προσθήκη ${item.title} στα αγαπημένα`, `Save ${item.title} to favorites`)}
                        aria-pressed={isFav}
                        className={`catalog-card-favorite absolute top-2.5 right-2.5 z-10 w-8 h-8 rounded-full backdrop-blur-xs transition-transform active:scale-90 flex items-center justify-center border shadow-xs ${
                          isFav ? 'bg-rose-50/95 text-rose-600 border-rose-200' : 'bg-white/80 text-stone-600 hover:text-stone-900 border-stone-200/80 hover:bg-white'
                        }`}
                        title={isFav ? t("Αφαίρεση από τα αγαπημένα", "Remove from favorites") : t("Προσθήκη στα αγαπημένα", "Add to favorites")}
                      >
                        <Heart className={`w-3.5 h-3.5 ${isFav ? 'fill-rose-500 text-rose-500' : ''}`} />
                      </button>

                      {/* Discreet status badge if present and NOT sold */}
                      {item.status && item.status.trim().toLowerCase() !== 'πουλήθηκε' && item.status.trim().toLowerCase() !== 'sold' && (
                        <div className="absolute top-2.5 left-2.5 z-10">
                          <StatusBadge>{localizedTerm(portfolioStatusLabel(design, item.status), locale)}</StatusBadge>
                        </div>
                      )}
                    </div>

                    {/* Artwork Content Info (Clean MONÉ-style Layout) */}
                    <div className="catalog-card-copy">
                      <div>
                        {/* Micro-header: Category + Year / Dimension */}
                        <div className="catalog-card-meta">
                          <span className="catalog-card-category">
                            {cat?.title || t("Έργο Τέχνης", "Artwork")}
                          </span>
                          {(item.year || item.dimensions) && (
                            <span className="catalog-card-year">
                              {item.year || item.dimensions}
                            </span>
                          )}
                        </div>

                        {/* Title */}
                        <h3 className="catalog-card-title">
                          <span lang={publicTextLanguage(item.title, locale)}>{item.title}</span>
                        </h3>

                        {/* Medium subtitle */}
                        {item.medium && (
                          <p className="catalog-card-subtitle">
                            <span lang={publicTextLanguage(item.medium, locale)}>{item.medium}</span>
                          </p>
                        )}
                      </div>

                      {/* Footer Row */}
                      <div className="catalog-card-footer">
                        <button
                          type="button"
                          onClick={() => { setSelectedItem(item); setActiveMediaIdx(0); }}
                          className="px-3 py-1.5 bg-stone-900 hover:bg-stone-800 text-white rounded-lg text-xs font-semibold transition shadow-xs flex items-center gap-1.5 active:scale-98"
                        >
                          <span>{t("Προβολή", "View")}</span>
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </ContentCard>
                );
            })}
          </div>)}
      </section>

      {/* 4. Rich Artwork Detail Modal (Shop-like experience with Video and Gallery) */}
      {selectedItem && (<DetailView
          title={t(`Λεπτομέρειες: ${selectedItem.title}`, `Details: ${selectedItem.title}`)}
          onClose={closeItemDetail}
          onPrevious={hasPrev ? goToPrev : undefined}
          onNext={hasNext ? goToNext : undefined}
          previousLabel={t("Προηγούμενο έργο", "Previous work")}
          nextLabel={t("Επόμενο έργο", "Next work")}
        >
            {/* Left Column: Media Stage & Thumbnails Strip */}
            <div className="w-full shrink-0 border-b border-stone-200 bg-stone-100 p-4 md:w-1/2 md:border-b-0 md:border-r">
              <MediaGallery
                media={getItemMediaList(selectedItem)}
                activeIndex={activeMediaIdx}
                onActiveIndex={setActiveMediaIdx}
                title={selectedItem.title}
                onOpen={() => setIsZoomOpen(true)}
              />
            </div>

            {/* Right Column: Curatorial & Artwork Metadata */}
            <div className="w-full md:w-1/2 p-6 flex flex-col justify-between overflow-y-auto">
              <div>
                {/* Artwork metadata */}
                <div className="flex items-start justify-between gap-4 md:pr-14">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-sans uppercase px-2.5 py-1 rounded text-stone-700 bg-stone-100">
                      {artCategories.find((c) => c.id === selectedItem.category)?.title}
                    </span>
                    {selectedItem.year && (<span className="text-xs font-sans px-2 py-1 rounded text-stone-600 bg-stone-100">
                        {selectedItem.year}
                      </span>)}
                    {selectedItem.status && (<span className="text-xs font-sans px-2.5 py-1 rounded text-emerald-800 bg-emerald-50 border border-emerald-200">
                        {localizedTerm(portfolioStatusLabel(design, selectedItem.status), locale)}
                      </span>)}
                  </div>

                </div>

                {/* Title & Medium */}
                <h2 className="catalog-detail-title mt-4">
                  <span lang={publicTextLanguage(selectedItem.title, locale)}>{selectedItem.title}</span>
                </h2>

                <div className="mt-2 text-xs font-sans flex items-center gap-1.5 text-stone-700">
                  <Palette className="w-3.5 h-3.5"/>
                  <span>{t(design.labels.medium, 'Medium')}: <span lang={publicTextLanguage(selectedItem.medium || '', locale)}>{selectedItem.medium}</span></span>
                </div>

                {selectedItem.dimensions && (<div className="mt-1 text-xs font-sans flex items-center gap-1.5 text-stone-500">
                    <Compass className="w-3.5 h-3.5"/>
                    <span>{t(design.labels.dimensions, 'Dimensions')}: {selectedItem.dimensions}</span>
                  </div>)}

                {/* Curatorial Description */}
                <div className="mt-5">
                  <h4 className="text-[11px] font-sans uppercase tracking-wider mb-1 text-stone-500">{t("Επιμελητική Περιγραφή", "About the work")}</h4>
                  <p className="text-sm leading-relaxed text-stone-600">
                    <span lang={publicTextLanguage(selectedItem.description, locale)}>{sanitizeVintedDescription(selectedItem.description)}</span>
                  </p>
                </div>

                {/* Curatorial Highlights / Details */}
                {selectedItem.details && selectedItem.details.length > 0 && (<div className="mt-5">
                    <h4 className="text-[11px] font-sans uppercase tracking-wider mb-2 text-stone-500">{t("Χαρακτηριστικά & Τεχνική", "Details and technique")}</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedItem.details.map((detail, idx) => (<span key={idx} className="text-[11px] px-2.5 py-1 rounded font-sans bg-stone-100 text-stone-700 border border-stone-200">
                          • <span lang={publicTextLanguage(detail, locale)}>{detail}</span>
                        </span>))}
                    </div>
                  </div>)}

                {/* Wix Provenance Strip removed as requested */}
              </div>

              {/* Bottom Actions Bar */}
              <div className="mt-8 pt-5 border-t flex flex-wrap items-center justify-between gap-3 border-stone-200">
                <div className="flex items-center gap-2">
                  <button onClick={() => toggleFavorite(selectedItem.id)} aria-pressed={favorites.includes(selectedItem.id)} aria-label={favorites.includes(selectedItem.id) ? t("Αφαίρεση από τα αγαπημένα", "Remove from favorites") : t("Προσθήκη στα αγαπημένα", "Add to favorites")} className={`px-3 py-2 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition ${favorites.includes(selectedItem.id)
                ? 'bg-rose-50 border-rose-200 text-rose-700'
                : 'bg-white border-stone-200 text-stone-700 hover:text-stone-900'}`}>
                    <Heart className={`w-3.5 h-3.5 ${favorites.includes(selectedItem.id) ? 'fill-current' : ''}`}/>
                    <span>{favorites.includes(selectedItem.id) ? t("Στα Αγαπημένα", "In favorites") : t("Αγαπημένο", "Favorite")}</span>
                  </button>

                  <button onClick={() => handleShare(selectedItem)} className="px-3 py-2 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition bg-white hover:bg-stone-100 border-stone-200 text-stone-700 hover:text-stone-900" title={t("Κοινοποίηση", "Share")}>
                    <Share2 className="w-3.5 h-3.5"/>
                    <span>{t("Κοινοποίηση", "Share")}</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const it = selectedItem;
                    closeItemDetail();
                    onContactArtist(it);
                  }}
                  className="px-5 py-2.5 rounded-xl font-semibold text-xs sm:text-sm flex items-center gap-2 transition shadow-sm bg-stone-900 hover:bg-stone-800 text-white cursor-pointer active:scale-95"
                >
                  <Mail className="w-4 h-4 text-white" />
                  <span className="text-white font-semibold">{t("Εκδήλωση Ενδιαφέροντος", "Enquire about this work")}</span>
                </button>
              </div>
            </div>
        </DetailView>)}

      {isZoomOpen && selectedItem && zoomImages.length > 0 && (
        <ImageLightbox images={zoomImages} title={selectedItem.title}
          index={zoomImages.findIndex(media => media.mediaIndex === activeMediaIdx)}
          onIndexChange={index => setActiveMediaIdx(zoomImages[index].mediaIndex)}
          onClose={() => setIsZoomOpen(false)} />
      )}

    </SectionShell>);
};
