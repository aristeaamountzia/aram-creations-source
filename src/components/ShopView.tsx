import { ImageLightbox } from './ImageLightbox';
import { CatalogControls } from './CatalogControls';
import React, { useState, useEffect, useMemo } from 'react';
import { JewelryItem } from '../types';
import { JEWELRY_CATALOG } from '../data';
import { db } from '../firebase';
import { DEFAULT_SHOP_SETTINGS, normalizeShopSettings, ShopSettings } from '../shopSettings';
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
  Eye,
  Check,
  Play,
  Maximize2
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

  return (
    <div className="catalog-view shop-view min-h-screen" style={{ backgroundColor: shopSettings.bgColor, color: shopSettings.textColor, fontFamily: `'${shopSettings.fontFamily}', sans-serif` }}>
      {/* Authentic Artisan Hero Banner */}
      <section className={`shop-hero ${shopSettings.heroVideoUrl ? 'catalog-hero--video' : ''} relative overflow-hidden py-16 sm:py-20 px-4 sm:px-6 lg:px-8 border-b border-stone-800 text-center`} style={{ backgroundColor: shopSettings.heroBgColor, color: shopSettings.heroTitleColor }}>
        {shopSettings.heroVideoUrl && <video className="absolute inset-0 h-full w-full object-cover" src={shopSettings.heroVideoUrl} autoPlay muted loop playsInline aria-hidden="true" />}
        {shopSettings.heroVideoUrl && <div className="absolute inset-0 bg-black/50" aria-hidden="true" />}
        <div className="relative w-full max-w-4xl mx-auto space-y-4">
          <h1 className={`${shopSettings.heroTitleSize} font-bold tracking-tight break-words`} style={{ color: shopSettings.heroVideoUrl ? '#fff' : shopSettings.heroTitleColor, fontFamily: `'${shopSettings.fontFamily}', sans-serif` }}>
            {shopSettings.heroTitle}
          </h1>
          <p className="text-sm sm:text-base max-w-2xl mx-auto leading-relaxed opacity-90" style={{ color: shopSettings.heroVideoUrl ? '#fff' : shopSettings.heroSubtitleColor }}>
            {shopSettings.heroSubtitle}
          </p>

          {/* Quick Stats badges */}
          <div className="pt-2 flex flex-wrap justify-center gap-2.5 text-[11px] font-bold">
            <span className="px-3.5 py-1 rounded-full bg-white/10 text-stone-200 border border-white/10">
              {isCatalogLoading ? '—' : totalAvailable} διαθέσιμα κομμάτια
            </span>
            <span className="px-3.5 py-1 rounded-full bg-white/10 text-stone-200 border border-white/10">
              {visibleCategories.length - 1} κατηγορίες
            </span>
            <span className="px-3.5 py-1 rounded-full bg-white/10 text-stone-200 border border-white/10">
              {isCatalogLoading ? '—' : jewelryList.length} συνολικές δημιουργίες
            </span>
          </div>
        </div>
      </section>

      {shopSettings.announcementEnabled && shopSettings.announcementText && (
        <div className="px-4 py-3 text-center text-sm font-semibold" style={{ backgroundColor: shopSettings.primaryColor, color: '#fff' }}>
          {shopSettings.announcementLink ? <a href={shopSettings.announcementLink} className="underline underline-offset-2">{shopSettings.announcementText}</a> : shopSettings.announcementText}
        </div>
      )}

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-6">
        
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
              <span className="text-[11px] text-stone-400 uppercase font-bold">Ταξινόμηση:</span>
              <select
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
                  className={`catalog-card group bg-white border border-stone-200/90 rounded-2xl overflow-hidden hover:border-stone-400 hover:shadow-sm transition-all duration-300 flex flex-col justify-between cursor-pointer ${
                    !isAvailable ? 'opacity-85' : ''
                  }`}
                  style={{ borderRadius: shopSettings.borderRadius }}
                >
                  {/* Media Container with multi-media support */}
                  <div className="relative aspect-[4/5] overflow-hidden bg-stone-100">
                    {activeCardMedia.type === 'video' ? (
                      <video
                        src={activeCardMedia.url}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        muted
                        loop
                        autoPlay
                        playsInline
                      />
                    ) : (
                      <img
                        src={activeCardMedia.url}
                        alt={item.name || item.title || 'Κόσμημα Aram Creations'}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        loading="lazy"
                      />
                    )}

                    {/* Media type indicators */}
                    <div className="absolute bottom-3 left-3 flex items-center gap-1.5">
                      {hasVideo && (
                        <span className="px-2 py-0.5 rounded-lg bg-black/70 backdrop-blur-md text-white text-[10px] font-bold flex items-center gap-1 shadow-sm">
                          <Play className="w-2.5 h-2.5 fill-white" />
                          <span>Βίντεο</span>
                        </span>
                      )}
                      {hasMultipleMedia && (
                        <span className="px-2 py-0.5 rounded-lg bg-black/70 backdrop-blur-md text-white text-[10px] font-bold shadow-sm">
                          {mediaList.length} φωτό
                        </span>
                      )}
                    </div>

                    {/* Card mini-gallery navigation dots if item has multiple images */}
                    {hasMultipleMedia && (
                      <div
                        className="absolute bottom-3 right-3 max-w-[80%] overflow-x-auto flex items-center gap-1 z-10 bg-black/50 backdrop-blur-sm px-1.5 py-1 rounded-full opacity-90 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity"
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

                    {/* Category badge */}
                    <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-md border border-stone-200 text-stone-800 text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-lg font-bold shadow-sm">
                      {item.category || 'Κόσμημα'}
                    </div>

                    {/* Like & Status buttons */}
                    <div className="absolute top-3 right-3 flex items-center gap-1.5 z-10">
                      {!isAvailable && (
                        <span className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider border rounded-lg shadow-sm ${isSold ? 'text-white bg-rose-600 border-rose-700 ring-2 ring-rose-200' : 'text-amber-900 bg-amber-100 border-amber-200'}`}>
                          {isSold ? 'Πουλήθηκε' : item.status || 'Μη διαθέσιμο'}
                        </span>
                      )}
                      <button
                          type="button"
                          onClick={(e) => toggleFavorite(item.id, e)}
                          aria-label={isFav ? `Αφαίρεση ${item.name || item.title} από τα αγαπημένα` : `Προσθήκη ${item.name || item.title} στα αγαπημένα`}
                          aria-pressed={isFav}
                          className={`p-2 rounded-xl backdrop-blur-md transition-transform active:scale-95 shadow-sm flex items-center gap-1 border ${
                            isFav
                              ? 'bg-rose-50 border-rose-200 text-rose-600'
                              : 'bg-white/90 border-stone-200 text-stone-700 hover:text-rose-600 hover:bg-white'
                          }`}
                          title={isFav ? 'Αφαίρεση από τα αγαπημένα' : 'Προσθήκη στα αγαπημένα'}
                        >
                          <Heart className={`w-3.5 h-3.5 ${isFav ? 'fill-rose-500 text-rose-500' : ''}`} />
                          <span className="text-[11px] font-bold">{likesCount}</span>
                      </button>
                    </div>
                  </div>

                  {/* Card Content Info */}
                  <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-3">
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-1">
                        {item.collection && (
                          <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">
                            {item.collection}
                          </span>
                        )}
                        <div className="flex items-center gap-1 text-[11px] font-bold text-stone-400 ml-auto">
                          <Eye className="w-3 h-3" />
                          <span>{viewsCount}</span>
                        </div>
                      </div>

                      <h3 className="text-sm sm:text-base font-bold text-stone-900 line-clamp-2 group-hover:text-stone-700 transition-colors">
                        {item.name || item.title}
                      </h3>

                      {item.description && (
                        <p className="text-xs text-stone-500 line-clamp-2 mt-1.5 leading-relaxed font-sans">
                          {item.description}
                        </p>
                      )}
                    </div>

                    {/* Footer: Price & Actions */}
                    <div className="pt-3 border-t border-stone-100 flex items-center justify-between gap-2">
                      <div>
                        <span className="text-[10px] text-stone-400 uppercase font-bold block">Τιμή</span>
                        <span className="text-lg font-bold text-stone-900" style={{ fontFamily: `'${shopSettings.fontFamily}', sans-serif` }}>
                          {item.price ? `${item.price}€` : '-'}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {vintedLink && (
                          <a
                            href={vintedLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="px-2.5 py-2 rounded-xl bg-teal-50 border border-teal-200 text-teal-800 text-xs font-bold hover:bg-teal-100 transition flex items-center gap-1"
                            title="Αγορά μέσω Vinted"
                          >
                            <span>Vinted</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}

                        <button
                          disabled={!isAvailable}
                          onClick={(e) => handleAdd(item, e)}
                          className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm ${
                            !isAvailable
                              ? 'bg-stone-100 text-stone-400 border border-stone-200 cursor-not-allowed'
                              : isAdded
                              ? 'bg-emerald-600 text-white font-bold'
                              : 'bg-stone-900 hover:bg-stone-800 text-white'
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
                              <span>{!isAvailable ? (isSold ? 'Πουλήθηκε' : item.status || 'Μη διαθέσιμο') : 'Καλάθι'}</span>
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
                <div className="flex items-center justify-between gap-2 border-b border-stone-100 pb-3 pr-12">
                  <span className="text-xs font-bold uppercase tracking-wider text-stone-500">
                    {selectedItem.category} {selectedItem.collection && `• ${selectedItem.collection}`}
                  </span>

                  {/* Likes & Views Metrics Display */}
                  <div className="flex items-center gap-3 text-xs font-bold text-stone-500">
                    <span className="flex items-center gap-1">
                      <Eye className="w-3.5 h-3.5" />
                      <span>{getItemViews(selectedItem)} προβολές</span>
                    </span>
                    <button
                      onClick={(e) => toggleFavorite(selectedItem.id, e)}
                      aria-label={favoriteIds.includes(selectedItem.id) ? 'Αφαίρεση από τα αγαπημένα' : 'Προσθήκη στα αγαπημένα'}
                      aria-pressed={favoriteIds.includes(selectedItem.id)}
                      className={`flex items-center gap-1 transition ${
                        favoriteIds.includes(selectedItem.id) ? 'text-rose-600' : 'hover:text-stone-800'
                      }`}
                      title="Αγαπημένο"
                    >
                      <Heart
                        className={`w-3.5 h-3.5 ${
                          favoriteIds.includes(selectedItem.id) ? 'fill-rose-500 text-rose-500' : ''
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
                  <div className="mt-2 flex items-baseline gap-3">
                    <span className="text-2xl sm:text-3xl font-bold text-stone-900">
                      {selectedItem.price ? `${selectedItem.price}€` : '-'}
                    </span>
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
                  <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-medium leading-relaxed text-amber-900">Η τιμή περιλαμβάνει υπολογισμένα μεταφορικά. Στο Vinted το τελικό ποσό μπορεί να διαφέρει ανάλογα με την αποστολή και τις χρεώσεις της πλατφόρμας.</p>
                </div>

                {/* Description */}
                {selectedItem.description && (
                  <p className="text-xs sm:text-sm text-stone-600 leading-relaxed font-sans whitespace-pre-wrap pt-2">
                    {selectedItem.description}
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

      {Object.entries(shopSettings.fallbackLinks).some(([, url]) => /^https:\/\//i.test(url)) && (
        <nav aria-label="Σύνδεσμοι Aram Creations" className="mt-12 border-t border-stone-200 px-4 py-8 text-center text-xs font-semibold sm:px-6">
          <p className="mb-4 text-[11px] uppercase tracking-wider text-stone-500">Βρείτε μας και εδώ</p>
          <div className="flex flex-wrap justify-center gap-2">
            {Object.entries(shopSettings.fallbackLinks).filter(([, url]) => /^https:\/\//i.test(url)).map(([name, url]) => (
              <a key={name} href={url} target="_blank" rel="noopener noreferrer" className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-stone-700 transition hover:border-stone-400 hover:text-stone-950">{name}</a>
            ))}
          </div>
        </nav>
      )}
    </div>
  );
};
