import { ImageLightbox } from './ImageLightbox';
import { CatalogControls } from './CatalogControls';
import { VintedReviewsSection } from './VintedReviewsSection';
import React, { useState, useEffect, useMemo } from 'react';
import { JewelryItem } from '../types';
import { JEWELRY_CATALOG } from '../data';
import { db } from '../firebase';
import { DEFAULT_SHOP_SETTINGS, normalizeShopSettings, ShopSettings } from '../shopSettings';
import { DEFAULT_DESIGN_STUDIO } from '../lib/design-studio';
import { sanitizeVintedDescription } from '../lib/vinted-sanitizer';
import { portfolioHeroVideoUrl } from './PortfolioHero';
import {
  collection,
  doc,
  onSnapshot,
  updateDoc,
  increment
} from 'firebase/firestore';
import {
  ShoppingBag,
  ExternalLink,
  Heart,
  ZoomIn,
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Eye,
  Check,
  Play,
  Maximize2,
  Star
} from 'lucide-react';

interface ShopViewProps {
  onAddToCart: (item: JewelryItem) => void;
}

export interface MediaItemResolved {
  url: string;
  type: 'image' | 'video';
}

const FALLBACK_JEWELRY: JewelryItem[] = [
  {
    id: 'jewel-01',
    name: 'Κολιέ Υγρού Γυαλιού με Αληθινά Άνθη Μπουκαμβίλιας',
    title: 'Κολιέ Υγρού Γυαλιού με Αληθινά Άνθη Μπουκαμβίλιας',
    category: 'Κολιέ',
    collection: 'Flora & Resin',
    status: 'Διαθέσιμο',
    price: 28,
    stock: 2,
    materials: ['Υγρό Γυαλί (Resin)', 'Αληθινά Αποξηραμένα Άνθη', 'Αλυσίδα από Ανοξείδωτο Ατσάλι'],
    colors: ['Φούξια', 'Χρυσό', 'Διάφανο'],
    description: 'Μοναδικό χειροποίητο κολιέ με φυσικά άνθη μπουκαμβίλιας εγκλωβισμένα σε διαυγές κρυστάλλινο υγρό γυαλί. Κάθε πέταλο διατηρεί τη φυσική του υφή και ζωηράδα.',
    imageUrl: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=800&auto=format&fit=crop&q=80',
    mediaList: [
      { url: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=800&auto=format&fit=crop&q=80', type: 'image' },
      { url: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=800&auto=format&fit=crop&q=80', type: 'image' }
    ],
    favorites: 14,
    likes: 14,
    views: 128,
    purchaseLinks: [{ site: 'Vinted', url: 'https://www.vinted.gr/member/231329281' }]
  },
  {
    id: 'jewel-02',
    name: 'Σκουλαρίκια Σταγόνας με Φύλλα Χρυσού 24Κ',
    title: 'Σκουλαρίκια Σταγόνας με Φύλλα Χρυσού 24Κ',
    category: 'Σκουλαρίκια',
    collection: 'Golden Aura',
    status: 'Διαθέσιμο',
    price: 24,
    stock: 1,
    materials: ['Φύλλα Χρυσού 24Κ', 'Υγρό Γυαλί UV', 'Υποαλλεργικό Ατσάλι 316L'],
    colors: ['Χρυσό', 'Διάφανο'],
    description: 'Εκλεπτυσμένα σκουλαρίκια σε σχήμα σταγόνας. Ελαφριά και άνετα για καθημερινή χρήση αλλά και επίσημες εμφανίσεις.',
    imageUrl: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=800&auto=format&fit=crop&q=80',
    mediaList: [
      { url: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=800&auto=format&fit=crop&q=80', type: 'image' },
      { url: 'https://images.unsplash.com/photo-1611591475152-473549646b9a?w=800&auto=format&fit=crop&q=80', type: 'image' }
    ],
    favorites: 22,
    likes: 22,
    views: 240,
    purchaseLinks: [{ site: 'Vinted', url: 'https://www.vinted.gr/member/231329281' }]
  },
  {
    id: 'jewel-03',
    name: 'Βραχιόλι με Φυσικά Βότσαλα & Σύρμα Χαλκού',
    title: 'Βραχιόλι με Φυσικά Βότσαλα & Σύρμα Χαλκού',
    category: 'Βραχιόλια',
    collection: 'Cyclades Shore',
    status: 'Διαθέσιμο',
    price: 32,
    stock: 1,
    materials: ['Βότσαλα Πάρου', 'Σύρμα Χαλκού', 'Ημιπολύτιμοι Λίθοι'],
    colors: ['Γκρι', 'Χαλκός', 'Τυρκουάζ'],
    description: 'Χειροποίητο cuff βραχιόλι διαμορφωμένο στο χέρι με σύρμα χαλκού και λειασμένα θαλασσινά βότσαλα από τις Κυκλάδες.',
    imageUrl: 'https://images.unsplash.com/photo-1611591475152-473549646b9a?w=800&auto=format&fit=crop&q=80',
    favorites: 9,
    likes: 9,
    views: 95
  },
  {
    id: 'jewel-04',
    name: 'Δαχτυλίδι Ακανόνιστου Σχεδιασμού με Μαύρη Τουρμαλίνη',
    title: 'Δαχτυλίδι Ακανόνιστου Σχεδιασμού με Μαύρη Τουρμαλίνη',
    category: 'Δαχτυλίδια',
    collection: 'Raw Earth',
    status: 'Διαθέσιμο',
    price: 26,
    stock: 1,
    materials: ['Μαύρη Τουρμαλίνη', 'Ασήμι 925 Επιμεταλλωμένο', 'Υγρό Γυαλί'],
    colors: ['Μαύρο', 'Ασημί'],
    description: 'Δαχτυλίδι με ακατέργαστο φυσικό κρύσταλλο μαύρης τουρμαλίνης για προστασία και ιδιαίτερο στυλ.',
    imageUrl: 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=800&auto=format&fit=crop&q=80',
    favorites: 18,
    likes: 18,
    views: 180
  },
  {
    id: 'jewel-05',
    name: 'Σετ Κολιέ & Σκουλαρίκια Blue Ocean Waves',
    title: 'Σετ Κολιέ & Σκουλαρίκια Blue Ocean Waves',
    category: 'Σετ',
    collection: 'Aegean Waves',
    status: 'Διαθέσιμο',
    price: 48,
    stock: 1,
    materials: ['Υγρό Γυαλί', 'Χρωστικές Αλκοόλης', 'Ατσάλι'],
    colors: ['Βαθύ Μπλε', 'Τυρκουάζ', 'Χρυσό'],
    description: 'Εντυπωσιακό σετ εμπνευσμένο από τα κύματα του Αιγαίου. Περιλαμβάνει κολιέ μενταγιόν και ασορτί κρεμαστά σκουλαρίκια.',
    imageUrl: 'https://images.unsplash.com/photo-1599643477877-530eb83abc8e?w=800&auto=format&fit=crop&q=80',
    favorites: 31,
    likes: 31,
    views: 310
  },
  {
    id: 'jewel-06',
    name: 'Custom Θήκη Κινητού με Ακρυλικά & Υγρό Γυαλί',
    title: 'Custom Θήκη Κινητού με Ακρυλικά & Υγρό Γυαλί',
    category: 'Θήκες Κινητών',
    collection: 'Wearable Art',
    status: 'Διαθέσιμο',
    price: 35,
    stock: 2,
    materials: ['Θήκη Σιλικόνης TPU', 'Ακρυλικά Χρώματα', 'Υγρό Γυαλί Ανθεκτικό στις Πτώσεις'],
    colors: ['Πολύχρωμο', 'Μαύρο'],
    description: 'Ζωγραφισμένη στο χέρι θήκη κινητού με προστατευτική επίστρωση υγρού γυαλιού για απαράμιλλη λάμψη και αντοχή.',
    imageUrl: 'https://images.unsplash.com/photo-1586953208448-b95a79798f07?w=800&auto=format&fit=crop&q=80',
    favorites: 12,
    likes: 12,
    views: 140
  }
];

const CATEGORIES = ['Όλα', 'Κολιέ', 'Σκουλαρίκια', 'Βραχιόλια', 'Δαχτυλίδια', 'Σετ', 'Καρφίτσες', 'Θήκες Κινητών', 'Άλλα'];

/**
 * Extracts and normalizes all available media (images & videos) for any item
 */
export function getItemMediaList(item: JewelryItem): MediaItemResolved[] {
  const result: MediaItemResolved[] = [];
  const seenUrls = new Set<string>();

  const isVideo = (url: string, typeHint?: string) => {
    if (typeHint === 'video') return true;
    if (item.fileType === 'video') return true;
    return /\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(url);
  };

  // 1. Check mediaList array
  if (Array.isArray(item.mediaList) && item.mediaList.length > 0) {
    for (const m of item.mediaList) {
      if (m && m.url && m.showInShop !== false && !seenUrls.has(m.url)) {
        seenUrls.add(m.url);
        result.push({
          url: m.url,
          type: isVideo(m.url, m.type) ? 'video' : 'image'
        });
      }
    }
  }

  // 2. Check images array
  if (Array.isArray(item.images) && item.images.length > 0) {
    for (const url of item.images) {
      if (url && typeof url === 'string' && !seenUrls.has(url)) {
        seenUrls.add(url);
        result.push({
          url,
          type: isVideo(url) ? 'video' : 'image'
        });
      }
    }
  }

  // 3. Check videoUrl
  if ((item as any).videoUrl && !seenUrls.has((item as any).videoUrl)) {
    const vUrl = (item as any).videoUrl;
    seenUrls.add(vUrl);
    result.push({ url: vUrl, type: 'video' });
  }

  // 4. Check imageUrl / src
  const primaryUrl = item.imageUrl || item.src;
  if (primaryUrl && !seenUrls.has(primaryUrl)) {
    seenUrls.add(primaryUrl);
    result.unshift({
      url: primaryUrl,
      type: isVideo(primaryUrl, item.fileType) ? 'video' : 'image'
    });
  }

  // Fallback placeholder if completely empty
  if (result.length === 0) {
    result.push({
      url: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=800&auto=format&fit=crop&q=80',
      type: 'image'
    });
  }

  return result;
}

export function getItemLikes(item: JewelryItem): number {
  return Number(item.shopFavorites ?? item.likes ?? item.favorites ?? item.vintedFavorites ?? 0) || 0;
}

export function getItemViews(item: JewelryItem): number {
  return Number(item.views ?? item.viewCount ?? 0) || 0;
}

export function isAvailableForSale(item: JewelryItem): boolean {
  const stock = item.stock;
  return item.status === 'Διαθέσιμο' && (stock === undefined || stock === null || (Number.isFinite(Number(stock)) && Number(stock) > 0));
}

export const ShopView: React.FC<ShopViewProps> = ({ onAddToCart }) => {
  const [shopSettings, setShopSettings] = useState<ShopSettings>(DEFAULT_SHOP_SETTINGS);
  const [jewelryList, setJewelryList] = useState<JewelryItem[]>([]);
  const [isCatalogLoading, setIsCatalogLoading] = useState(true);
  const [catalogOffline, setCatalogOffline] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('Όλα');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('featured');
  const [availableOnly, setAvailableOnly] = useState<boolean>(false);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState<boolean>(false);
  const [heroVideoFailed, setHeroVideoFailed] = useState<boolean>(false);
  const [heroVideoRetry, setHeroVideoRetry] = useState<number>(0);

  useEffect(() => {
    setHeroVideoFailed(false);
    setHeroVideoRetry(0);
  }, [shopSettings.heroVideoUrl]);

  useEffect(() => {
    return onSnapshot(doc(db, 'settings', 'shop'), (snapshot) => {
      setShopSettings(normalizeShopSettings(snapshot.exists() ? snapshot.data() : undefined));
    }, (error) => console.warn('Shop settings could not be loaded:', error));
  }, []);

  const visibleCategories = useMemo(() => {
    const actual = new Set(jewelryList.map(item => item.category).filter(Boolean) as string[]);
    const ordered = shopSettings.categoryOrder.filter(category => actual.has(category));
    return ['Όλα', ...ordered, ...Array.from(actual).filter(category => !ordered.includes(category)).sort((a, b) => a.localeCompare(b, 'el'))];
  }, [jewelryList, shopSettings.categoryOrder]);

  // Favorite IDs state
  const [favoriteIds, setFavoriteIds] = useState<string[]>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('aram_shop_favorites') || '[]');
      return Array.isArray(saved) ? saved.filter((id): id is string => typeof id === 'string') : [];
    } catch {
      return [];
    }
  });

  // Modal Detail State
  const [selectedItem, setSelectedItem] = useState<JewelryItem | null>(null);
  const [activeMediaIndex, setActiveMediaIndex] = useState<number>(0);
  const [addedIds, setAddedIds] = useState<Record<string, boolean>>({});
  const [cardActiveMediaIndex, setCardActiveMediaIndex] = useState<Record<string, number>>({});
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  // Close modals on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isLightboxOpen) { setIsLightboxOpen(false); return; }
        if (selectedItem) { setSelectedItem(null); return; }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isLightboxOpen, selectedItem]);

  // 1. Live Firestore Sync
  useEffect(() => {
    let fallbackTimer: ReturnType<typeof setTimeout> | undefined;
    try {
      const jewelryColl = collection(db, 'jewelry');
      const unsubscribe = onSnapshot(jewelryColl, (snapshot) => {
        if (fallbackTimer) clearTimeout(fallbackTimer);
        const items = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data()
        })) as JewelryItem[];
        // Firestore is the source of truth. A deleted or missing database record
        // must not be resurrected by merging the local seed catalog.
        setJewelryList(items.filter((item: any) => !item.isDeleted && !item.deletedAt));
        setCatalogOffline(false);
        setIsCatalogLoading(false);
      }, (err) => {
        console.warn('Firestore live subscription fallback:', err);
        setJewelryList(JEWELRY_CATALOG);
        setCatalogOffline(true);
        setIsCatalogLoading(false);
      });
      fallbackTimer = setTimeout(() => {
        setJewelryList((current) => current.length ? current : JEWELRY_CATALOG);
        setCatalogOffline(true);
        setIsCatalogLoading(false);
      }, 8000);
      return () => {
        if (fallbackTimer) clearTimeout(fallbackTimer);
        unsubscribe();
      };
    } catch (e) {
      console.warn('Firestore initialization fallback:', e);
      setJewelryList(JEWELRY_CATALOG);
      setCatalogOffline(true);
      setIsCatalogLoading(false);
    }
  }, []);

  // Open Detail Modal & Register View
  const handleOpenDetail = (item: JewelryItem) => {
    setSelectedItem(item);
    setActiveMediaIndex(0);
    setIsLightboxOpen(false);

    // Track view once per browser session for each item
    const sessionKey = `aram_viewed_${item.id}`;
    if (!sessionStorage.getItem(sessionKey)) {
      sessionStorage.setItem(sessionKey, 'true');

      // Optimistically update local view count
      setJewelryList((prev) =>
        prev.map((it) => {
          if (it.id === item.id) {
            const currentViews = Math.max(getItemViews(it), Number(it.vintedViews) || 0);
            return {
              ...it,
              views: currentViews + 1,
              viewCount: currentViews + 1
            };
          }
          return it;
        })
      );

      // Persist view to Firestore
      try {
        const itemRef = doc(db, 'jewelry', item.id);
      updateDoc(itemRef, {
          views: increment(1),
          viewCount: increment(1)
        }).catch((err) => console.warn('Could not persist view count:', err));
      } catch (_) {}
    }
  };

  // Toggle Like / Favorite with Firestore sync
  const toggleFavorite = (itemId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const isCurrentlyFav = favoriteIds.includes(itemId);
    const nextFavoriteIds = isCurrentlyFav
      ? favoriteIds.filter((id) => id !== itemId)
      : [...favoriteIds, itemId];

    setFavoriteIds(nextFavoriteIds);
    try {
      localStorage.setItem('aram_shop_favorites', JSON.stringify(nextFavoriteIds));
    } catch (_) {}

    const delta = isCurrentlyFav ? -1 : 1;

    // Optimistically update local state
    setJewelryList((prev) =>
      prev.map((item) => {
        if (item.id === itemId) {
          const currentLikes = getItemLikes(item);
          const nextLikes = Math.max(0, currentLikes + delta);
          return {
            ...item,
            likes: nextLikes,
            favorites: nextLikes,
            shopFavorites: nextLikes
          };
        }
        return item;
      })
    );

    if (selectedItem && selectedItem.id === itemId) {
      const currentLikes = getItemLikes(selectedItem);
      const nextLikes = Math.max(0, currentLikes + delta);
      setSelectedItem((prev) => prev ? {
        ...prev,
        likes: nextLikes,
        favorites: nextLikes,
        shopFavorites: nextLikes
      } : null);
    }

    // Persist to Firestore
    try {
      const itemRef = doc(db, 'jewelry', itemId);
      updateDoc(itemRef, {
        likes: increment(delta),
        favorites: increment(delta),
        shopFavorites: increment(delta)
      }).catch((err) => console.warn('Could not persist like:', err));
    } catch (_) {}
  };

  const handleAdd = (item: JewelryItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    onAddToCart(item);
    setAddedIds((prev) => ({ ...prev, [item.id]: true }));
    setTimeout(() => {
      setAddedIds((prev) => ({ ...prev, [item.id]: false }));
    }, 2000);
  };

  // Filtered & Sorted items
  const filteredItems = useMemo(() => {
    return jewelryList.filter((item) => {
      if (availableOnly && !isAvailableForSale(item)) return false;

      const name = item.name || item.title || '';
      const cat = item.category || '';
      const desc = item.description || '';
      const materials = (item.materials || []).join(' ');
      const colors = (item.colors || []).join(' ');

      const matchesCat = selectedCategory === 'Όλα' || cat === selectedCategory;
      const matchesSearch =
        !searchQuery ||
        [name, cat, desc, materials, colors].join(' ').toLowerCase().includes(searchQuery.toLowerCase().trim());
      const matchesFav = !showFavoritesOnly || favoriteIds.includes(item.id);

      return matchesCat && matchesSearch && matchesFav;
    }).sort((a, b) => {
      if (sortBy === 'price-asc') return (Number(a.price) || 0) - (Number(b.price) || 0);
      if (sortBy === 'price-desc') return (Number(b.price) || 0) - (Number(a.price) || 0);
      if (sortBy === 'popular') return getItemLikes(b) - getItemLikes(a);
      if (sortBy === 'views') return getItemViews(b) - getItemViews(a);
      return (Number(b.shopOrder) || 0) - (Number(a.shopOrder) || 0);
    });
  }, [jewelryList, selectedCategory, searchQuery, showFavoritesOnly, favoriteIds, availableOnly, sortBy]);

  // Catalog Stats
  const totalAvailable = useMemo(() => {
    return jewelryList.filter(isAvailableForSale).length;
  }, [jewelryList]);

  // Modal item navigation
  const currentModalIndex = selectedItem ? filteredItems.findIndex((it) => it.id === selectedItem.id) : -1;
  const hasPrevModalItem = currentModalIndex > 0;
  const hasNextModalItem = currentModalIndex !== -1 && currentModalIndex < filteredItems.length - 1;

  const handlePrevModalItem = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (hasPrevModalItem) {
      handleOpenDetail(filteredItems[currentModalIndex - 1]);
    }
  };

  const handleNextModalItem = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (hasNextModalItem) {
      handleOpenDetail(filteredItems[currentModalIndex + 1]);
    }
  };

  // Selected item media list
  const selectedMediaList = useMemo(() => {
    return selectedItem ? getItemMediaList(selectedItem) : [];
  }, [selectedItem]);

  const activeMedia = selectedMediaList[activeMediaIndex] || selectedMediaList[0];
  const zoomImages = selectedMediaList.map((media, index) => ({ ...media, mediaIndex: index })).filter(media => media.type !== 'video');
  const ds = shopSettings.designStudio || DEFAULT_DESIGN_STUDIO;
  const resolvedHeroVideoUrl = portfolioHeroVideoUrl(shopSettings.heroVideoUrl);
  const hasHeroVideo = Boolean(resolvedHeroVideoUrl) && !heroVideoFailed;

  return (
    <div className="catalog-view shop-view min-h-screen" style={{ backgroundColor: ds.pageBackground || shopSettings.bgColor, color: ds.ink || shopSettings.textColor, fontFamily: ds.fontFamily || `'${shopSettings.fontFamily}', sans-serif` }}>
      {/* Authentic Artisan Hero Banner */}
      <section
        className={`shop-hero ${hasHeroVideo ? 'catalog-hero--video bg-stone-950' : 'bg-stone-950'} min-h-[520px] h-[62svh] max-h-[680px] flex flex-col justify-center items-center relative overflow-hidden py-16 sm:py-24 px-4 sm:px-6 lg:px-8 border-b border-stone-800 text-center transition-colors`}
        style={{
          backgroundColor: hasHeroVideo ? '#0c0a09' : (shopSettings.heroBgColor && shopSettings.heroBgColor !== '#ffffff' ? shopSettings.heroBgColor : '#0c0a09'),
          color: '#ffffff'
        }}
      >
        {hasHeroVideo && (
          <video
            key={`${resolvedHeroVideoUrl}-${heroVideoRetry}`}
            className="absolute inset-0 h-full w-full object-cover"
            src={heroVideoRetry > 0
              ? (resolvedHeroVideoUrl.includes('?') ? `${resolvedHeroVideoUrl}&_cb=${heroVideoRetry}` : `${resolvedHeroVideoUrl}?_cb=${heroVideoRetry}`)
              : resolvedHeroVideoUrl
            }
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            referrerPolicy="no-referrer"
            onError={() => {
              if (heroVideoRetry < 2) {
                setHeroVideoRetry(c => c + 1);
              } else {
                setHeroVideoFailed(true);
              }
            }}
            aria-hidden="true"
          />
        )}
        <div
          className="absolute inset-0 bg-black/60 backdrop-blur-[1px]"
          style={{ opacity: Number(ds.heroOverlay) || 0.55 }}
          aria-hidden="true"
        />
        <div className="relative z-10 w-full max-w-4xl mx-auto space-y-4 my-auto">
          <h1
            className={`${shopSettings.heroTitleSize || 'text-3xl sm:text-4xl md:text-5xl'} font-bold tracking-tight break-words text-white drop-shadow-sm`}
            style={{
              fontFamily: ds.fontFamily || `'${shopSettings.fontFamily}', sans-serif`
            }}
          >
            {shopSettings.heroTitle}
          </h1>
          <p
            className="text-sm sm:text-base md:text-lg max-w-2xl mx-auto leading-relaxed text-stone-200 opacity-95 drop-shadow-xs"
          >
            {shopSettings.heroSubtitle}
          </p>

          {/* Refined brand proof-point */}
          <div className="pt-2 flex items-center justify-center gap-2 text-xs text-stone-300 font-medium">
            <a
              href="#customer-reviews"
              onClick={(e) => {
                e.preventDefault();
                const el = document.getElementById('customer-reviews') || document.getElementById('vinted-reviews');
                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 hover:bg-white/15 border border-white/15 backdrop-blur-xs text-stone-200 transition cursor-pointer"
              title="Δείτε τις επίσημες αξιολογήσεις των πελατών"
            >
              <Star className="w-3 h-3 fill-amber-300 text-amber-300 shrink-0" strokeWidth={1.5} />
              <span>5.0 • 10 αξιολογήσεις στο Vinted</span>
            </a>
          </div>
        </div>

        {/* Animated scroll down indicator for mobile & desktop */}
        <button
          type="button"
          onClick={() => {
            const el = document.getElementById('shop-catalog') || document.querySelector('.catalog-controls');
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }}
          className="absolute bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-1.5 cursor-pointer transition group focus:outline-hidden text-white/90 hover:text-white"
          aria-label="Κύλιση για δημιουργίες — προβολή καταλόγου"
        >
          <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-widest drop-shadow-md group-hover:scale-105 transition-transform">
            Κύλιση για δημιουργίες
          </span>
          <div className="w-8 h-8 rounded-full bg-black/40 backdrop-blur-md border border-white/30 flex items-center justify-center shadow-lg animate-bounce group-hover:bg-black/60 transition">
            <ChevronDown className="w-4 h-4 text-white drop-shadow" />
          </div>
        </button>
      </section>

      {shopSettings.announcementEnabled && shopSettings.announcementText && (
        <div className="px-4 py-3 text-center text-sm font-semibold" style={{ backgroundColor: shopSettings.primaryColor, color: '#fff' }}>
          {shopSettings.announcementLink ? <a href={shopSettings.announcementLink} className="underline underline-offset-2">{shopSettings.announcementText}</a> : shopSettings.announcementText}
        </div>
      )}

      {/* Main Content Area */}
      <div id="shop-catalog" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-6">

        <CatalogControls label="Φίλτρα Shop" search={searchQuery} onSearch={setSearchQuery}
          placeholder="Αναζήτηση με όνομα, υλικό, χρώμα..."
          categories={visibleCategories.map(category => ({ id: category, label: category }))}
          selectedCategory={selectedCategory} onCategory={setSelectedCategory} accent={shopSettings.primaryColor}
          actions={<>
            <button
              onClick={() => setAvailableOnly(!availableOnly)}
              aria-pressed={availableOnly}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition ${
                availableOnly
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                  : 'bg-white text-stone-600 border-stone-200 hover:border-stone-300'
              }`}
            >
              Μόνο Διαθέσιμα
            </button>

            <button
              onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
              aria-pressed={showFavoritesOnly}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition flex items-center gap-1.5 ${
                showFavoritesOnly
                  ? 'bg-rose-50 text-rose-700 border-rose-300'
                  : 'bg-white text-stone-600 border-stone-200 hover:border-stone-300'
              }`}
            >
              <Heart className={`w-3.5 h-3.5 ${showFavoritesOnly ? 'fill-rose-500 text-rose-500' : 'text-stone-500'}`} />
              <span>Αγαπημένα ({favoriteIds.length})</span>
            </button>

            {/* Sort Select */}
            <div className="catalog-sort flex max-w-full min-w-0 items-center gap-1.5 bg-stone-50 border border-stone-200 rounded-xl px-2.5 py-1.5 text-xs text-stone-700">
              <label htmlFor="catalog-sort-select" className="text-[11px] text-stone-500 uppercase font-bold cursor-pointer">
                Ταξινόμηση:
              </label>
              <select
                id="catalog-sort-select"
                aria-label="Ταξινόμηση δημιουργιών"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="min-w-0 max-w-full bg-transparent font-bold text-stone-800 focus:outline-none cursor-pointer text-xs"
              >
                <option value="featured">Προτεινόμενα</option>
                <option value="popular">Πιο Δημοφιλή (Likes)</option>
                <option value="views">Περισσότερες Προβολές</option>
                <option value="price-asc">Τιμή (Χαμηλή → Υψηλή)</option>
                <option value="price-desc">Τιμή (Υψηλή → Χαμηλή)</option>
              </select>
            </div>
          </>} />

        <h2 className="sr-only">Συλλογή Κοσμημάτων & Δημιουργιών</h2>

        {/* Catalog Results Header */}
        <div className="flex items-center justify-between text-xs font-bold text-stone-500 px-1">
          <span>{isCatalogLoading ? 'Φόρτωση καταλόγου…' : `${filteredItems.length} δημιουργίες βρέθηκαν`}</span>
          {(selectedCategory !== 'Όλα' || searchQuery || availableOnly || showFavoritesOnly) && (
            <button
              onClick={() => {
                setSelectedCategory('Όλα');
                setSearchQuery('');
                setAvailableOnly(false);
                setShowFavoritesOnly(false);
              }}
              className="text-stone-800 hover:underline font-bold"
            >
              Καθαρισμός φίλτρων
            </button>
          )}
        </div>

        {catalogOffline && (
          <div role="status" className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-xs text-amber-900">
            Δεν ήταν δυνατή η σύνδεση με τον ζωντανό κατάλογο. Εμφανίζονται ενδεικτικά τοπικά προϊόντα και η διαθεσιμότητά τους μπορεί να μην είναι ενημερωμένη.
          </div>
        )}

        {/* Products Grid */}
        {isCatalogLoading ? (
          <div role="status" className="py-24 text-center bg-white border border-stone-200/90 rounded-2xl p-8 text-sm text-stone-500">
            Φόρτωση καταλόγου…
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="py-24 text-center bg-white border border-stone-200/90 rounded-2xl p-8 space-y-3">
            <p className="text-base font-bold text-stone-800">
              {showFavoritesOnly ? 'Δεν έχεις προσθέσει ακόμα αγαπημένα κοσμήματα.' : 'Δεν βρέθηκαν δημιουργίες που να ταιριάζουν στα κριτήριά σου.'}
            </p>
            <p className="text-xs text-stone-500">
              Δοκίμασε να αλλάξεις κατηγορία ή να καθαρίσεις τα ενεργά φίλτρα αναζήτησης.
            </p>
            <button
              onClick={() => {
                setSelectedCategory('Όλα');
                setSearchQuery('');
                setAvailableOnly(false);
                setShowFavoritesOnly(false);
              }}
              className="mt-3 px-4 py-2 rounded-xl bg-stone-900 text-white text-xs font-bold hover:bg-stone-800 transition"
            >
              Επιστροφή σε όλη τη συλλογή
            </button>
          </div>
        ) : (
          <div className={`grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 ${shopSettings.catalogDensity === 'compact' ? 'gap-3 sm:gap-4' : shopSettings.catalogDensity === 'spacious' ? 'gap-8 sm:gap-10' : 'gap-6 sm:gap-8'}`}>
            {filteredItems.map((item) => {
              const isFav = favoriteIds.includes(item.id);
              const isAvailable = isAvailableForSale(item);
              const isSold = item.status === 'Πουλήθηκε' || (item.status !== 'Κρατημένο' && item.stock !== undefined && item.stock !== null && Number(item.stock) <= 0);
              const isAdded = !!addedIds[item.id];
              const vintedLink = (item.purchaseLinks || []).find((l) => l.site?.toLowerCase() === 'vinted')?.url;

              // Media list & active media index on card
              const mediaList = getItemMediaList(item);
              const currentCardMediaIdx = cardActiveMediaIndex[item.id] || 0;
              const activeCardMedia = mediaList[currentCardMediaIdx] || mediaList[0];
              const hasMultipleMedia = mediaList.length > 1;
              const hasVideo = mediaList.some((m) => m.type === 'video');

              const likesCount = getItemLikes(item);
              const viewsCount = getItemViews(item);

              return (
                <div
                  key={item.id}
                  onClick={() => handleOpenDetail(item)}
                  onKeyDown={(event) => {
                    if (event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) {
                      event.preventDefault();
                      handleOpenDetail(item);
                    }
                  }}
                  role="group"
                  tabIndex={0}
                  aria-label={`${item.name || item.title || 'Κόσμημα'}. Πατήστε Enter για λεπτομέρειες.`}
                  className={`catalog-card group bg-white border border-stone-200/80 rounded-xl overflow-hidden hover:border-stone-400/80 hover:shadow-xs transition-all duration-300 flex flex-col justify-between cursor-pointer ${
                    !isAvailable ? 'opacity-85' : ''
                  }`}
                  style={{ borderRadius: ds.cardRadius || "12px", backgroundColor: ds.surface || "#ffffff", borderColor: ds.line || "#e4e4e7" }}
                >
                  {/* Media Container (Clean 4:5 Luxury Jewelry Aspect) */}
                  <div className="relative aspect-[4/5] overflow-hidden bg-stone-100">
                    {activeCardMedia.type === 'video' ? (
                      <video
                        src={activeCardMedia.url}
                        className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 ${
                          isSold ? 'grayscale-[15%] opacity-90' : ''
                        }`}
                        muted
                        loop
                        autoPlay
                        playsInline
                        preload="metadata"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <img
                        src={activeCardMedia.url}
                        alt={item.name || item.title || 'Κόσμημα Aram Creations'}
                        referrerPolicy="no-referrer"
                        className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 ${
                          isSold ? 'grayscale-[15%] opacity-90' : ''
                        }`}
                        loading="lazy"
                        decoding="async"
                      />
                    )}

                    {/* Discreet Luxury Sold Overlay */}
                    {isSold && (
                      <div className="absolute inset-0 bg-stone-950/30 backdrop-blur-[1px] z-10 flex items-center justify-center pointer-events-none transition-all duration-300 group-hover:bg-stone-950/20">
                        <span className="px-3.5 py-1.5 rounded-full bg-stone-900/85 backdrop-blur-md border border-white/20 text-stone-100 text-[10px] sm:text-[11px] font-bold tracking-[0.2em] uppercase shadow-md">
                          Πουλήθηκε
                        </span>
                      </div>
                    )}

                    {/* Discount badge if has originalPrice */}
                    {isAvailable && item.originalPrice && Number(item.originalPrice) > Number(item.price) && (
                      <div className="absolute top-2.5 left-2.5 z-10">
                        <span className="px-2.5 py-0.5 text-[10px] font-black tracking-wider uppercase rounded-full bg-rose-600 text-white shadow-xs">
                          -{Math.round(((Number(item.originalPrice) - Number(item.price)) / Number(item.originalPrice)) * 100)}%
                        </span>
                      </div>
                    )}

                    {/* Discreet status badge if not available and NOT sold */}
                    {!isAvailable && !isSold && (
                      <div className="absolute top-2.5 left-2.5 z-10">
                        <span className="px-2.5 py-0.5 text-[10px] font-semibold tracking-wider uppercase rounded-full backdrop-blur-xs bg-stone-800/80 text-stone-200">
                          {item.status || 'Μη διαθέσιμο'}
                        </span>
                      </div>
                    )}

                    {/* Sleek Minimal Heart / Favorite Button */}
                    <button
                      type="button"
                      onClick={(e) => toggleFavorite(item.id, e)}
                      aria-label={isFav ? `Αφαίρεση ${item.name || item.title} από τα αγαπημένα` : `Προσθήκη ${item.name || item.title} στα αγαπημένα`}
                      aria-pressed={isFav}
                      className={`absolute top-2.5 right-2.5 z-10 w-8 h-8 rounded-full backdrop-blur-xs transition-transform active:scale-90 flex items-center justify-center border shadow-xs ${
                        isFav
                          ? 'bg-rose-50/95 border-rose-200 text-rose-600'
                          : 'bg-white/80 hover:bg-white border-stone-200/80 text-stone-600 hover:text-stone-900'
                      }`}
                      title={isFav ? 'Αφαίρεση από τα αγαπημένα' : 'Προσθήκη στα αγαπημένα'}
                    >
                      <Heart className={`w-3.5 h-3.5 ${isFav ? 'fill-rose-500 text-rose-500' : ''}`} />
                    </button>

                    {/* Subtle Gallery Dots on Hover */}
                    {hasMultipleMedia && (
                      <div
                        className="absolute bottom-2.5 left-1/2 -translate-x-1/2 flex items-center gap-1 z-10 bg-black/40 backdrop-blur-xs px-2 py-1 rounded-full opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {mediaList.map((_, dotIdx) => (
                          <button
                            key={dotIdx}
                            type="button"
                            onClick={() =>
                              setCardActiveMediaIndex((prev) => ({
                                ...prev,
                                [item.id]: dotIdx
                              }))
                            }
                            className={`w-1.5 h-1.5 shrink-0 rounded-full transition-all ${
                              currentCardMediaIdx === dotIdx ? 'bg-white scale-125' : 'bg-white/50 hover:bg-white/80'
                            }`}
                            aria-label={`Φωτογραφία ${dotIdx + 1}`}
                          />
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Card Content Info (Clean MONÉ-style Layout) */}
                  <div className="p-3.5 sm:p-4 flex-1 flex flex-col justify-between space-y-2.5">
                    <div>
                      {/* Micro-header: Category + Refined Views & Likes */}
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-semibold text-stone-400 uppercase tracking-[0.16em]">
                          {item.category || item.collection || 'Κόσμημα'}
                        </span>
                        <div className="flex items-center gap-2.5 text-[11px] text-stone-400 font-medium">
                          <span className="flex items-center gap-1" title={`${viewsCount} προβολές`}>
                            <Eye className="w-3 h-3 text-stone-400" />
                            <span>{viewsCount}</span>
                          </span>
                          <span className="flex items-center gap-1" title={`${likesCount} αγαπημένα`}>
                            <Heart className={`w-3 h-3 ${isFav ? 'fill-rose-500 text-rose-500' : 'text-stone-400'}`} />
                            <span>{likesCount}</span>
                          </span>
                        </div>
                      </div>

                      {/* Clean Product Title */}
                      <h3 className="text-sm font-semibold text-stone-900 line-clamp-1 group-hover:text-stone-600 transition-colors tracking-tight mt-1">
                        {item.name || item.title}
                      </h3>
                    </div>

                    {/* Footer: Price & Subtle Actions */}
                    <div className="pt-2.5 border-t border-stone-100 flex items-center justify-between gap-2">
                      <div className="flex items-baseline gap-1.5 flex-wrap">
                        {item.originalPrice && Number(item.originalPrice) > Number(item.price) ? (
                          <>
                            <span className="text-base font-bold text-stone-900 tracking-tight" style={{ fontFamily: `'${shopSettings.fontFamily}', sans-serif` }}>
                              {item.price ? `${item.price}€` : '-'}
                            </span>
                            <span className="text-xs font-medium text-stone-400 line-through">
                              {Number(item.originalPrice).toFixed(2)}€
                            </span>
                          </>
                        ) : (
                          <span className="text-base font-semibold text-stone-900 tracking-tight" style={{ fontFamily: `'${shopSettings.fontFamily}', sans-serif` }}>
                            {item.price ? `${item.price}€` : '-'}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5">
                        {vintedLink && (
                          <a
                            href={vintedLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="px-2 py-1.5 rounded-lg bg-teal-50/80 border border-teal-200/80 text-teal-800 text-[11px] font-semibold hover:bg-teal-100 transition-colors flex items-center gap-1"
                            title="Αγορά μέσω Vinted"
                          >
                            <span>Vinted</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        )}

                        <button
                          disabled={!isAvailable}
                          onClick={(e) => handleAdd(item, e)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                            !isAvailable
                              ? 'bg-stone-100 text-stone-400 border border-stone-200/80 cursor-not-allowed'
                              : isAdded
                              ? 'bg-emerald-700 text-white font-semibold'
                              : 'bg-stone-900 hover:bg-stone-800 active:scale-[0.98] text-white focus-visible:ring-2 focus-visible:ring-stone-900 focus-visible:outline-none'
                          }`}
                        >
                          {isAdded ? (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              <span>Μπήκε!</span>
                            </>
                          ) : (
                            <>
                              <ShoppingBag className="w-3.5 h-3.5" />
                              <span>{!isAvailable ? (isSold ? 'Πουλήθηκε' : 'Μη διαθέσιμο') : 'Καλάθι'}</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Comprehensive Product Detail Modal with Full Media & Metrics Support */}
      {selectedItem && (
        <div
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto overscroll-contain"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedItem(null);
          }}
        >
          {/* Previous product catalog arrow */}
          {hasPrevModalItem && (
            <button
              onClick={handlePrevModalItem}
              className="hidden lg:flex fixed left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white text-stone-900 shadow-2xl items-center justify-center hover:bg-stone-100 transition z-50 border border-stone-200"
              title="Προηγούμενο κόσμημα"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
          )}

          {/* Next product catalog arrow */}
          {hasNextModalItem && (
            <button
              onClick={handleNextModalItem}
              className="hidden lg:flex fixed right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white text-stone-900 shadow-2xl items-center justify-center hover:bg-stone-100 transition z-50 border border-stone-200"
              title="Επόμενο κόσμημα"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          )}

          <div
            className="bg-white border border-stone-200 rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col md:flex-row overflow-hidden text-stone-900 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={() => setSelectedItem(null)}
              className="absolute top-4 right-4 z-30 p-2 rounded-full bg-stone-100 text-stone-600 hover:text-stone-900 hover:bg-stone-200 border border-stone-300 transition shadow-sm"
              aria-label="Κλείσιμο παραθύρου"
            >
              <X className="w-5 h-5" />
            </button>

            {/* LEFT COLUMN: Rich Media Stage (Images & Videos) */}
            <div className="w-full md:w-1/2 bg-stone-100 p-4 sm:p-6 flex flex-col justify-between border-b md:border-b-0 md:border-r border-stone-200">
              {/* Primary Active Media Display */}
              <div className="relative aspect-square w-full rounded-2xl overflow-hidden bg-stone-200 border border-stone-300 flex items-center justify-center">
                {activeMedia ? (
                  activeMedia.type === 'video' ? (
                    <video
                      key={activeMedia.url}
                      src={activeMedia.url}
                      controls
                      autoPlay
                      muted
                      loop
                      playsInline
                      className="w-full h-full object-contain bg-black"
                    />
                  ) : (
                    <img
                      key={activeMedia.url}
                      src={activeMedia.url}
                      alt={selectedItem.name || selectedItem.title}
                      referrerPolicy="no-referrer"
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-contain"
                    />
                  )
                ) : null}

                {/* Lightbox / Zoom full size button */}
                {activeMedia && activeMedia.type !== 'video' && (
                  <button
                    onClick={() => setIsLightboxOpen(true)}
                    className="absolute top-3 left-3 p-2 rounded-xl bg-white/80 backdrop-blur-md text-stone-700 hover:text-stone-900 hover:bg-white border border-stone-200 shadow-sm transition"
                    title="Πλήρης μεγέθυνση εικόνας"
                  >
                    <Maximize2 className="w-4 h-4" />
                  </button>
                )}

                {/* Previous/Next media navigation inside the item */}
                {selectedMediaList.length > 1 && (
                  <>
                    <button
                      onClick={() =>
                        setActiveMediaIndex((prev) =>
                          prev > 0 ? prev - 1 : selectedMediaList.length - 1
                        )
                      }
                      className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/80 backdrop-blur-md text-stone-800 hover:bg-white shadow-sm border border-stone-200 transition"
                      title="Προηγούμενη φωτογραφία"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() =>
                        setActiveMediaIndex((prev) =>
                          prev < selectedMediaList.length - 1 ? prev + 1 : 0
                        )
                      }
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/80 backdrop-blur-md text-stone-800 hover:bg-white shadow-sm border border-stone-200 transition"
                      title="Επόμενη φωτογραφία"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </>
                )}

                {/* Media Counter Badge */}
                {selectedMediaList.length > 1 && (
                  <div className="absolute bottom-3 right-3 px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-md text-white text-[11px] font-bold">
                    {activeMediaIndex + 1} / {selectedMediaList.length}
                  </div>
                )}
              </div>

              {/* Bottom Thumbnail Strip */}
              {selectedMediaList.length > 1 && (
                <div className="flex gap-2.5 mt-3.5 overflow-x-auto pb-1 horizontal-scrollbar">
                  {selectedMediaList.map((media, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setActiveMediaIndex(idx)}
                      aria-label={`Εμφάνιση ${media.type === 'video' ? 'βίντεο' : 'εικόνας'} ${idx + 1}`}
                      aria-pressed={activeMediaIndex === idx}
                      className={`relative w-16 h-16 rounded-xl overflow-hidden border-2 transition-all shrink-0 ${
                        activeMediaIndex === idx
                          ? 'border-stone-900 scale-105 shadow-sm'
                          : 'border-stone-300 opacity-60 hover:opacity-100'
                      }`}
                    >
                      {media.type === 'video' ? (
                        <div className="w-full h-full bg-stone-900 text-white flex items-center justify-center">
                          <Play className="w-4 h-4 fill-white" />
                        </div>
                      ) : (
                        <img
                          src={media.url}
                          alt={`Thumbnail ${idx + 1}`}
                          referrerPolicy="no-referrer"
                          loading="lazy"
                          decoding="async"
                          className="w-full h-full object-cover"
                        />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* RIGHT COLUMN: Product Details, Metrics, Materials & Actions */}
            <div className="w-full md:w-1/2 p-6 sm:p-8 flex flex-col justify-between overflow-y-auto">
              <div className="space-y-4">
                {/* Category & Collection */}
                <div className="flex items-center justify-between gap-3 border-b border-stone-100 pb-3 pr-14 sm:pr-16">
                  <span className="text-xs font-bold uppercase tracking-wider text-stone-500 min-w-0 flex-1 truncate">
                    {selectedItem.category} {selectedItem.collection && `• ${selectedItem.collection}`}
                  </span>

                  {/* Likes & Views Metrics Display - Clean Non-breaking Pill */}
                  <div className="flex items-center gap-2.5 text-xs font-semibold text-stone-600 bg-stone-100/90 border border-stone-200/90 px-3 py-1 rounded-full shrink-0 whitespace-nowrap shadow-xs">
                    <span className="flex items-center gap-1 text-stone-600" title={`${getItemViews(selectedItem)} προβολές`}>
                      <Eye className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                      <span>{getItemViews(selectedItem)}</span>
                      <span className="text-[11px] font-normal text-stone-500 hidden sm:inline">
                        {getItemViews(selectedItem) === 1 ? 'προβολή' : 'προβολές'}
                      </span>
                    </span>
                    <span className="text-stone-300">·</span>
                    <button
                      onClick={(e) => toggleFavorite(selectedItem.id, e)}
                      aria-label={favoriteIds.includes(selectedItem.id) ? 'Αφαίρεση από τα αγαπημένα' : 'Προσθήκη στα αγαπημένα'}
                      aria-pressed={favoriteIds.includes(selectedItem.id)}
                      className={`flex items-center gap-1 transition ${
                        favoriteIds.includes(selectedItem.id) ? 'text-rose-600 font-bold' : 'hover:text-stone-800'
                      }`}
                      title="Αγαπημένο"
                    >
                      <Heart
                        className={`w-3.5 h-3.5 shrink-0 ${
                          favoriteIds.includes(selectedItem.id) ? 'fill-rose-500 text-rose-500' : 'text-stone-400'
                        }`}
                      />
                      <span>{getItemLikes(selectedItem)}</span>
                    </button>
                  </div>
                </div>

                {/* Title & Price */}
                <div>
                  <h2 className="text-2xl sm:text-3xl font-bold text-stone-900 leading-snug" style={{ fontFamily: 'Jura, sans-serif' }}>
                    {selectedItem.name || selectedItem.title}
                  </h2>
                  <div className="mt-2 flex items-baseline gap-3 flex-wrap">
                    <span className="text-2xl sm:text-3xl font-bold text-stone-900">
                      {selectedItem.price ? `${selectedItem.price}€` : '-'}
                    </span>
                    {selectedItem.originalPrice && Number(selectedItem.originalPrice) > Number(selectedItem.price) && (
                      <>
                        <span className="text-lg text-stone-400 line-through font-medium">
                          {Number(selectedItem.originalPrice).toFixed(2)}€
                        </span>
                        <span className="text-xs font-black px-2 py-0.5 rounded-full bg-rose-600 text-white shadow-xs">
                          -{Math.round(((Number(selectedItem.originalPrice) - Number(selectedItem.price)) / Number(selectedItem.originalPrice)) * 100)}%
                        </span>
                      </>
                    )}
                    <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                      !isAvailableForSale(selectedItem)
                        ? selectedItem.status === 'Πουλήθηκε' || (selectedItem.status !== 'Κρατημένο' && selectedItem.stock !== undefined && selectedItem.stock !== null && Number(selectedItem.stock) <= 0)
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-amber-100 text-amber-900'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}>
                      {selectedItem.status || 'Διαθέσιμο'}
                    </span>
                  </div>
                  {selectedItem.status === 'Πουλήθηκε' || (selectedItem.status !== 'Κρατημένο' && selectedItem.stock !== undefined && selectedItem.stock !== null && Number(selectedItem.stock) <= 0) ? (
                    <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] font-medium leading-relaxed text-rose-900">
                      Αυτό το κομμάτι είναι μοναδικό και έχει ήδη πουληθεί. Αν θέλεις κάτι παρόμοιο, επικοινώνησε μαζί μας μέσω{' '}
                      {/^https:\/\//i.test(shopSettings.fallbackLinks?.Instagram || '') ? <a href={shopSettings.fallbackLinks.Instagram} target="_blank" rel="noopener noreferrer" className="font-bold underline">Instagram</a> : 'Instagram'} ή{' '}
                      <a href="mailto:aristeaamnta@gmail.com" className="font-bold underline">email</a>.
                    </div>
                  ) : (
                    <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-medium leading-relaxed text-amber-900">Η τιμή περιλαμβάνει υπολογισμένα μεταφορικά. Στο Vinted το τελικό ποσό μπορεί να διαφέρει ανάλογα με την αποστολή και τις χρεώσεις της πλατφόρμας.</p>
                  )}
                </div>

                {/* Description */}
                {selectedItem.description && (
                  <p className="text-xs sm:text-sm text-stone-600 leading-relaxed font-sans whitespace-pre-wrap pt-2">
                    {sanitizeVintedDescription(selectedItem.description)}
                  </p>
                )}

                {/* Materials list */}
                {selectedItem.materials && selectedItem.materials.length > 0 && (
                  <div className="pt-3 border-t border-stone-100">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400 block mb-1.5">
                      Υλικά Κατασκευής
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedItem.materials.map((mat, i) => (
                        <span
                          key={i}
                          className="bg-stone-100 text-stone-800 text-xs px-2.5 py-1 rounded-lg font-medium border border-stone-200"
                        >
                          {mat}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Colors */}
                {selectedItem.colors && selectedItem.colors.length > 0 && (
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400 block mb-1.5">
                      Χρώματα
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedItem.colors.map((col, i) => (
                        <span
                          key={i}
                          className="bg-white border border-stone-200 text-stone-800 text-xs px-2.5 py-1 rounded-lg font-medium"
                        >
                          <span className="inline-block w-2.5 h-2.5 rounded-full mr-1.5 border border-stone-200 align-middle" style={{ backgroundColor: shopSettings.colorPalette[col] || '#e7e5e4' }} aria-hidden="true" />
                          {col}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Dimensions / Weight */}
                {(selectedItem.dimensions || selectedItem.weight) && (
                  <div className="flex gap-6 text-xs text-stone-600 pt-2">
                    {selectedItem.dimensions && (
                      <div>
                        <span className="block text-[10px] uppercase font-bold text-stone-400">Διαστάσεις</span>
                        <span className="font-medium">{selectedItem.dimensions}</span>
                      </div>
                    )}
                    {selectedItem.weight && (
                      <div>
                        <span className="block text-[10px] uppercase font-bold text-stone-400">Βάρος</span>
                        <span className="font-medium">{selectedItem.weight}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Purchase and Add to Bag Actions */}
              <div className="pt-6 border-t border-stone-100 space-y-2.5 mt-6">
                <button
                  disabled={!isAvailableForSale(selectedItem)}
                  onClick={() => {
                    handleAdd(selectedItem);
                    setSelectedItem(null);
                  }}
                  className={`w-full py-3.5 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-md ${
                    !isAvailableForSale(selectedItem)
                      ? 'bg-stone-200 text-stone-500 cursor-not-allowed'
                      : 'bg-stone-900 hover:bg-stone-800 text-white'
                  }`}
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>
                    {!isAvailableForSale(selectedItem)
                      ? selectedItem.status === 'Πουλήθηκε' || (selectedItem.status !== 'Κρατημένο' && selectedItem.stock !== undefined && selectedItem.stock !== null && Number(selectedItem.stock) <= 0) ? 'Πουλήθηκε' : selectedItem.status || 'Μη διαθέσιμο'
                      : 'Προσθήκη στην Τσάντα Αγορών'}
                  </span>
                </button>

                {/* Vinted and External Purchase Links */}
                {(selectedItem.purchaseLinks || []).map((link, idx) => (
                  <a
                    key={idx}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-3 rounded-xl bg-teal-50 hover:bg-teal-100 border border-teal-200 text-teal-900 font-bold text-xs flex items-center justify-center gap-2 transition"
                  >
                    <span>Αγορά μέσω {link.site || 'Vinted'}</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {isLightboxOpen && selectedItem && zoomImages.length > 0 && (
        <ImageLightbox images={zoomImages} title={selectedItem.name || selectedItem.title || 'Κόσμημα'}
          index={zoomImages.findIndex(media => media.mediaIndex === activeMediaIndex)}
          onIndexChange={index => setActiveMediaIndex(zoomImages[index].mediaIndex)}
          onClose={() => setIsLightboxOpen(false)} />
      )}

      {/* Official Customer Reviews & Social Proof */}
      <VintedReviewsSection
        theme={shopSettings.visualTheme}
        fontFamily={shopSettings.fontFamily}
      />
    </div>
  );
};
