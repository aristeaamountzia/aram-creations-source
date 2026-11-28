import { localizedName, localizedDescription, localizedTerm, publicTextLanguage } from '../lib/public-copy';
import { storefrontLink } from '../lib/public-locale';
import { usePublicLanguage } from "../lib/use-public-language";
import { CollectionHero } from './content/CollectionHero';
import { ImageLightbox } from './ImageLightbox';
import { compareSoldLast, inventoryLabel, isSoldItem } from '../lib/stock-edit';
import { VintedReviewsSection } from './VintedReviewsSection';
import { ContentCard } from './content/ContentCard';
import { DetailView } from './content/DetailView';
import { FilterBar } from './content/FilterBar';
import { MediaGallery } from './content/MediaGallery';
import { SectionShell } from './content/SectionShell';
import { StatusBadge } from './content/StatusBadge';
import React, { useState, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { JewelryItem } from '../types';
import { JEWELRY_CATALOG } from '../data';
import { db } from '../firebase';
import { DEFAULT_SHOP_SETTINGS, normalizeShopSettings, ShopSettings } from '../shopSettings';
import { sanitizeVintedDescription } from '../lib/vinted-sanitizer';
import { portfolioHeroVideoUrl, initialHeroSnapshot, cacheHeroSnapshot, pickHeroSnapshot } from '../lib/hero-media';
import { isUnconfirmedEmptyCatalog } from '../lib/catalog-snapshot';
import { trackShopMetric } from '../lib/shop-metrics';
import {
  collection,
  doc,
  onSnapshot
} from 'firebase/firestore';
import {
  ShoppingBag,
  ExternalLink,
  Heart,
  X,
  Eye,
  Check,
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
    titleEn: 'Real Bougainvillea Resin Necklace',
    descriptionEn: 'A handmade necklace with natural bougainvillea petals preserved in clear resin.',
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
    titleEn: '24K Gold Leaf Drop Earrings',
    descriptionEn: 'Lightweight drop earrings with 24K gold leaf, made for daily wear and special occasions.',
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
    name: 'Βραχιόλι με Φυσικά Βότσαλα',
    titleEn: 'Natural Pebble Bracelet',
    descriptionEn: 'A handmade cuff with smooth pebbles from the Cyclades.',
    title: 'Βραχιόλι με Φυσικά Βότσαλα',
    category: 'Βραχιόλια',
    collection: 'Cyclades Shore',
    status: 'Διαθέσιμο',
    price: 32,
    stock: 1,
    materials: ['Βότσαλα Πάρου', 'Ημιπολύτιμοι Λίθοι'],
    colors: ['Γκρι', 'Χαλκός', 'Τυρκουάζ'],
    description: 'Χειροποίητο βραχιόλι με λειασμένα θαλασσινά βότσαλα από τις Κυκλάδες.',
    imageUrl: 'https://images.unsplash.com/photo-1611591475152-473549646b9a?w=800&auto=format&fit=crop&q=80',
    favorites: 9,
    likes: 9,
    views: 95
  },
  {
    id: 'jewel-04',
    name: 'Δαχτυλίδι Ακανόνιστου Σχεδιασμού με Μαύρη Τουρμαλίνη',
    titleEn: 'Raw Black Tourmaline Ring',
    descriptionEn: 'An organically shaped ring with a raw black tourmaline crystal.',
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
    titleEn: 'Blue Ocean Waves Necklace and Earring Set',
    descriptionEn: 'A pendant necklace and matching drop earrings inspired by the waves of the Aegean.',
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
    titleEn: 'Custom Painted Phone Case',
    descriptionEn: 'A phone case painted by hand in acrylics and finished with protective clear resin.',
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
    if (typeHint === 'image') return false;
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
  const { locale, t } = usePublicLanguage();
  // Start with the last-known (or build-time) hero content so the hero and its
  // video render immediately instead of waiting for the Firestore round trip.
  const [shopSettings, setShopSettings] = useState<ShopSettings>(() => normalizeShopSettings(initialHeroSnapshot()));
  const [jewelryList, setJewelryList] = useState<JewelryItem[]>([]);
  const [isCatalogLoading, setIsCatalogLoading] = useState(true);
  const reviewsJumpDuringLoad = useRef(window.location.hash === '#customer-reviews');
  const [catalogOffline, setCatalogOffline] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('Όλα');
  const [selectedCollection, setSelectedCollection] = useState('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('featured');
  const [availableOnly, setAvailableOnly] = useState<boolean>(false);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState<boolean>(false);

  useEffect(() => {
    return onSnapshot(doc(db, 'settings', 'shop'), (snapshot) => {
      const data = snapshot.exists() ? snapshot.data() : undefined;
      setShopSettings(normalizeShopSettings({ ...data, ...pickHeroSnapshot(data) }));
      if (data) cacheHeroSnapshot(data);
    }, (error) => {
      console.warn('Shop settings could not be loaded:', error);
    });
  }, []);

  const visibleCategories = useMemo(() => {
    const actual = new Set(jewelryList.map(item => item.category).filter(Boolean) as string[]);
    const ordered = shopSettings.categoryOrder.filter(category => actual.has(category));
    return ['Όλα', ...ordered, ...Array.from(actual).filter(category => !ordered.includes(category)).sort((a, b) => a.localeCompare(b, 'el'))];
  }, [jewelryList, shopSettings.categoryOrder]);
  const collections = useMemo(() => [...new Set(jewelryList.map(item => item.collection?.trim()).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, 'el')), [jewelryList]);

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
      const jewelryColl = collection(db, 'shopCatalog');
      const unsubscribe = onSnapshot(jewelryColl, (snapshot) => {
        if (isUnconfirmedEmptyCatalog(snapshot)) return;
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

      trackShopMetric(item.id, 'view').catch(err => console.warn('Could not persist view count:', err));
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

    trackShopMetric(itemId, 'favorite', !isCurrentlyFav).catch(err => console.warn('Could not persist like:', err));
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
      const collection = item.collection?.trim() || '';
      const desc = item.description || '';
      const materials = (item.materials || []).join(' ');
      const colors = (item.colors || []).join(' ');

      const matchesCat = selectedCategory === 'Όλα' || cat === selectedCategory;
      const matchesSearch =
        !searchQuery ||
        [name, cat, collection, desc, materials, colors, localizedName(item, locale), localizedDescription(item, locale), ...[cat, collection, ...(item.materials || []), ...(item.colors || [])].map(term => localizedTerm(term, locale))].join(' ').toLowerCase().includes(searchQuery.toLowerCase().trim());
      const matchesFav = !showFavoritesOnly || favoriteIds.includes(item.id);

      return matchesCat && (!selectedCollection || collection === selectedCollection) && matchesSearch && matchesFav;
    }).sort((a, b) => {
      const availabilityOrder = compareSoldLast(a, b);
      if (sortBy === 'price-asc') {
        return (Number(a.price) || 0) - (Number(b.price) || 0) || availabilityOrder;
      }
      if (sortBy === 'price-desc') {
        return (Number(b.price) || 0) - (Number(a.price) || 0) || availabilityOrder;
      }
      if (sortBy === 'popular') return getItemLikes(b) - getItemLikes(a) || availabilityOrder;
      if (sortBy === 'views') return getItemViews(b) - getItemViews(a) || availabilityOrder;
      if (availabilityOrder) return availabilityOrder;
      return (Number(b.shopOrder) || 0) - (Number(a.shopOrder) || 0);
    });
  }, [jewelryList, selectedCategory, selectedCollection, searchQuery, showFavoritesOnly, favoriteIds, availableOnly, sortBy, locale]);

  // Catalog Stats
  const totalAvailable = useMemo(() => {
    return jewelryList.filter(isAvailableForSale).length;
  }, [jewelryList]);

  // Modal item navigation
  const currentModalIndex = selectedItem ? filteredItems.findIndex((it) => it.id === selectedItem.id) : -1;
  const hasPrevModalItem = currentModalIndex > 0;
  const hasNextModalItem = currentModalIndex !== -1 && currentModalIndex < filteredItems.length - 1;

  const handlePrevModalItem = () => {
    if (hasPrevModalItem) {
      handleOpenDetail(filteredItems[currentModalIndex - 1]);
    }
  };

  const handleNextModalItem = () => {
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
  const resolvedHeroVideoUrl = portfolioHeroVideoUrl(shopSettings.heroVideoUrl);

  useLayoutEffect(() => {
    if (isCatalogLoading || !reviewsJumpDuringLoad.current) return;
    reviewsJumpDuringLoad.current = false;
    const target = document.getElementById('customer-reviews');
    if (target && (document.activeElement === target || window.location.hash === '#customer-reviews')) {
      document.getElementById('shop-catalog')?.classList.add('catalog-reviews-jump');
      target.scrollIntoView({ behavior: 'instant', block: 'start' });
    }
  }, [isCatalogLoading]);

  const handleScrollToReviews = (e: React.MouseEvent) => {
    if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
    e.preventDefault();
    const target = document.getElementById('customer-reviews') || document.getElementById('vinted-reviews');
    if (!target) return;
    reviewsJumpDuringLoad.current = isCatalogLoading;
    if (window.location.hash !== '#customer-reviews') window.location.hash = 'customer-reviews';
    // Offscreen cards use content-visibility with estimated heights. Materialize
    // them before calculating the destination so the jump reaches the reviews.
    document.getElementById('shop-catalog')?.classList.add('catalog-reviews-jump');
    target.scrollIntoView({ behavior: 'instant', block: 'start' });
    target.focus({ preventScroll: true });
  };

  const announcementHref = storefrontLink(shopSettings.announcementLink, locale, window.location.origin);

  return (
    <SectionShell section="shop" className="catalog-view">
      <CollectionHero key={resolvedHeroVideoUrl} collection="shop" videoUrl={resolvedHeroVideoUrl}
        title={t(shopSettings.heroTitle.trim() || "Χειροποίητα κοσμήματα", "Handmade jewelry")}
        description={t(shopSettings.heroSubtitle.trim(), "Handmade pieces with real flowers and resin.")} appearance={shopSettings.heroAppearance} />

      {shopSettings.announcementEnabled && shopSettings.announcementText && (
        <div className="bg-stone-900 px-4 py-3 text-center text-sm font-semibold text-white">
          <span lang={publicTextLanguage(shopSettings.announcementText, locale)}>{announcementHref ? <a href={announcementHref} className="underline underline-offset-2">{shopSettings.announcementText}</a> : shopSettings.announcementText}</span>
        </div>
      )}

      {/* Main Content Area */}
      <div id="shop-catalog" tabIndex={-1} className="public-catalog gallery-catalog max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="gallery-catalog-heading">
          <h2 className="catalog-heading">{t("Η συλλογή", "The collection")}</h2>
          <a href="#customer-reviews" onClick={handleScrollToReviews} className="inline-flex items-center gap-1 text-sm underline underline-offset-4"><Star size={14} aria-hidden="true" />{t(" Αξιολογήσεις", " Reviews")}</a>
        </div>

        {collections.length > 0 && (
          <label className="gallery-collection catalog-sort">
            <span>{t("Συλλογή", "Collection")}</span>
            <select value={selectedCollection} onChange={event => setSelectedCollection(event.target.value)}>
              <option value="">{t("Όλες οι συλλογές", "All collections")}</option>
              {selectedCollection && !collections.includes(selectedCollection) && <option value={selectedCollection}>{localizedTerm(selectedCollection, locale)}</option>}
              {collections.map(collection => <option key={collection} value={collection}>{localizedTerm(collection, locale)}</option>)}
            </select>
          </label>
        )}
        <details className="gallery-filters">
          <summary>{t("Φίλτρα και αναζήτηση", "Filters and search")}</summary>
          <FilterBar label={t("Φίλτρα Shop", "Shop filters")} search={searchQuery} onSearch={setSearchQuery}
          placeholder={t("Όνομα, συλλογή, υλικό ή χρώμα", "Name, collection, material or color")}
          categories={visibleCategories.map(category => ({ id: category, label: localizedTerm(category, locale) }))}
          selectedCategory={selectedCategory} onCategory={setSelectedCategory}
          actions={<>
            <button
              onClick={() => setAvailableOnly(!availableOnly)}
              aria-pressed={availableOnly} type="button"
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition ${
                availableOnly
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                  : 'bg-white text-stone-600 border-stone-200 hover:border-stone-300'
              }`}
            >{t("Μόνο Διαθέσιμα", "In stock only")}</button>

            <button
              onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
              aria-pressed={showFavoritesOnly} type="button"
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition flex items-center gap-1.5 ${
                showFavoritesOnly
                  ? 'bg-rose-50 text-rose-700 border-rose-300'
                  : 'bg-white text-stone-600 border-stone-200 hover:border-stone-300'
              }`}
            >
              <Heart className={`w-3.5 h-3.5 ${showFavoritesOnly ? 'fill-rose-500 text-rose-500' : 'text-stone-500'}`} />
              <span>{t("Αγαπημένα (", "Favorites (")}{favoriteIds.length})</span>
            </button>

            {/* Sort Select */}
            <div className="catalog-sort flex max-w-full min-w-0 flex-wrap items-center gap-1.5 bg-stone-50 border border-stone-200 rounded-xl px-2.5 py-1.5 text-xs text-stone-700">
              <label htmlFor="catalog-sort-select" className="text-[11px] text-stone-500 uppercase font-bold cursor-pointer">{t("Ταξινόμηση:", "Sort:")}</label>
              <select
                id="catalog-sort-select"
                aria-label={t("Ταξινόμηση δημιουργιών", "Sort products")}
                aria-describedby="catalog-sort-note"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="min-w-0 max-w-full bg-transparent font-bold text-stone-800 focus:outline-none cursor-pointer text-xs"
              >
                <option value="featured">{t("Προτεινόμενα", "Featured")}</option>
                <option value="popular">{t("Πιο Δημοφιλή (Likes)", "Most liked")}</option>
                <option value="views">{t("Περισσότερες Προβολές", "Most viewed")}</option>
                <option value="price-asc">{t("Τιμή (Χαμηλή → Υψηλή)", "Price (low to high)")}</option>
                <option value="price-desc">{t("Τιμή (Υψηλή → Χαμηλή)", "Price (high to low)")}</option>
              </select>
              <span id="catalog-sort-note" className="basis-full text-[10px] font-normal text-stone-500">
                {t("Τα εξαντλημένα εμφανίζονται τελευταία.", "Sold items appear last.")}
              </span>
            </div>
          </>} />
        </details>


        {/* Catalog Results Header */}
        <div className="gallery-results flex items-center justify-between text-xs font-bold text-stone-500 px-1">
          <span aria-live="polite">{isCatalogLoading ? t("Φόρτωση καταλόγου…", "Loading catalog…") : t(`${filteredItems.length} δημιουργίες βρέθηκαν`, `${filteredItems.length} ${filteredItems.length === 1 ? 'product' : 'products'} found`)}</span>
          {(selectedCategory !== 'Όλα' || selectedCollection || searchQuery || availableOnly || showFavoritesOnly) && (
            <button
              onClick={() => {
                setSelectedCategory('Όλα');
                setSelectedCollection('');
                setSearchQuery('');
                setAvailableOnly(false);
                setShowFavoritesOnly(false);
              }}
              className="text-stone-800 hover:underline font-bold"
            >{t("Καθαρισμός φίλτρων", "Clear filters")}</button>
          )}
        </div>

        {catalogOffline && (
          <div role="status" className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-xs text-amber-900">{t("Δεν ήταν δυνατή η σύνδεση με τον ζωντανό κατάλογο. Εμφανίζονται ενδεικτικά τοπικά προϊόντα και η διαθεσιμότητά τους μπορεί να μην είναι ενημερωμένη.", "The live catalog could not be loaded. These are sample products and their availability may have changed.")}</div>
        )}

        {/* Products Grid */}
        {isCatalogLoading ? (
          <div role="status" className="py-24 text-center bg-white border border-stone-200/90 rounded-2xl p-8 text-sm text-stone-500">{t("Φόρτωση καταλόγου…", "Loading catalog…")}</div>
        ) : filteredItems.length === 0 ? (
          <div className="py-24 text-center bg-white border border-stone-200/90 rounded-2xl p-8 space-y-3">
            <p className="text-base font-bold text-stone-800">
              {showFavoritesOnly ? t("Δεν έχεις προσθέσει ακόμα αγαπημένα κοσμήματα.", "You haven’t added any favorites yet.") : t("Δεν βρέθηκαν δημιουργίες που να ταιριάζουν στα κριτήριά σου.", "No products match your filters.")}
            </p>
            <p className="text-xs text-stone-500">{t("Δοκίμασε να αλλάξεις κατηγορία ή να καθαρίσεις τα ενεργά φίλτρα αναζήτησης.", "Try another category or clear the filters.")}</p>
            <button
              onClick={() => {
                setSelectedCategory('Όλα');
                setSearchQuery('');
                setAvailableOnly(false);
                setShowFavoritesOnly(false);
              }}
              className="mt-3 px-4 py-2 rounded-xl bg-stone-900 text-white text-xs font-bold hover:bg-stone-800 transition"
            >{t("Επιστροφή σε όλη τη συλλογή", "Back to the full collection")}</button>
          </div>
        ) : (
          <div className="studio-product-grid grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4" data-density={shopSettings.catalogDensity}>
            {filteredItems.map((item) => {
              const isFav = favoriteIds.includes(item.id);
              const isAvailable = isAvailableForSale(item);
              const isSold = isSoldItem(item);
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
                <ContentCard
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
                  aria-label={t(`${localizedName(item, locale) || 'Κόσμημα'}. Πατήστε Enter για λεπτομέρειες.`, `${localizedName(item, locale) || 'Jewelry'}. Press Enter for details.`)}
                  muted={!isAvailable}
                  className="border-stone-200/80 hover:border-stone-400/80"
                >
                  {/* Media Container (Clean 4:5 Luxury Jewelry Aspect) */}
                  <div className="relative aspect-[3/4] overflow-hidden bg-stone-100">
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
                        alt={localizedName(item, locale) || t("Κόσμημα Aram Creations", "Aram Creations jewelry")}
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
                        <StatusBadge className="px-3.5 py-1.5 tracking-[0.2em]">{t("Πουλήθηκε", "Sold")}</StatusBadge>
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
                        <StatusBadge>{localizedTerm(inventoryLabel(item), locale)}</StatusBadge>
                      </div>
                    )}

                    {/* Sleek Minimal Heart / Favorite Button */}
                    <button
                      type="button"
                      onClick={(e) => toggleFavorite(item.id, e)}
                      aria-label={isFav ? t(`Αφαίρεση ${localizedName(item, locale)} από τα αγαπημένα`, `Remove ${localizedName(item, locale)} from favorites`) : t(`Προσθήκη ${localizedName(item, locale)} στα αγαπημένα`, `Save ${localizedName(item, locale)} to favorites`)}
                      aria-pressed={isFav}
                      className={`catalog-card-favorite absolute top-2.5 right-2.5 z-10 w-8 h-8 rounded-full backdrop-blur-xs transition-transform active:scale-90 flex items-center justify-center border shadow-xs ${
                        isFav
                          ? 'bg-rose-50/95 border-rose-200 text-rose-600'
                          : 'bg-white/80 hover:bg-white border-stone-200/80 text-stone-600 hover:text-stone-900'
                      }`}
                      title={isFav ? t("Αφαίρεση από τα αγαπημένα", "Remove from favorites") : t("Προσθήκη στα αγαπημένα", "Add to favorites")}
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
                            aria-label={t(`Φωτογραφία ${dotIdx + 1}`, `Photo ${dotIdx + 1}`)}
                          />
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Card Content Info (Clean MONÉ-style Layout) */}
                  <div className="catalog-card-copy">
                    <div>
                      {/* Micro-header: Category + Refined Views & Likes */}
                      <div className="catalog-card-meta">
                        <span className="catalog-card-category">
                          {localizedTerm(item.category || item.collection || '', locale) || t("Κόσμημα", "Jewelry")}
                        </span>
                        <div className="catalog-card-counts flex items-center gap-2.5 text-[11px] font-medium">
                          <span className="flex items-center gap-1" title={t(`${viewsCount} προβολές`, `${viewsCount} views`)}>
                            <Eye className="w-3 h-3 text-stone-400" />
                            <span>{viewsCount}</span>
                          </span>
                          <span className="flex items-center gap-1" title={t(`${likesCount} αγαπημένα`, `${likesCount} favorites`)}>
                            <Heart className={`w-3 h-3 ${isFav ? 'fill-rose-500 text-rose-500' : 'text-stone-400'}`} />
                            <span>{likesCount}</span>
                          </span>
                        </div>
                      </div>

                      {/* Clean Product Title */}
                      <h3 className="catalog-card-title">
                        <span lang={publicTextLanguage(localizedName(item, locale), locale)}>{localizedName(item, locale)}</span>
                      </h3>
                    </div>

                    {/* Footer: Price & Subtle Actions */}
                    <div className="catalog-card-footer">
                      <div className="flex items-baseline gap-1.5 flex-wrap">
                        {item.originalPrice && Number(item.originalPrice) > Number(item.price) ? (
                          <>
                            <span className="text-base font-bold text-stone-900 tracking-tight" style={{ fontFamily: 'inherit' }}>
                              {item.price ? `${item.price}€` : '-'}
                            </span>
                            <span className="text-xs font-medium text-stone-400 line-through">
                              {Number(item.originalPrice).toFixed(2)}€
                            </span>
                          </>
                        ) : (
                          <span className="text-base font-semibold text-stone-900 tracking-tight" style={{ fontFamily: 'inherit' }}>
                            {item.price ? `${item.price}€` : '-'}
                          </span>
                        )}
                      </div>

                      <div className="catalog-card-actions">
                        {vintedLink && (
                          <a
                            href={vintedLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="px-2 py-1.5 rounded-lg bg-teal-50/80 border border-teal-200/80 text-teal-800 text-[11px] font-semibold hover:bg-teal-100 transition-colors flex items-center gap-1"
                            title={t("Αγορά μέσω Vinted", "Buy on Vinted")}
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
                              <span>{t("Μπήκε!", "Added!")}</span>
                            </>
                          ) : (
                            <>
                              <ShoppingBag className="w-3.5 h-3.5" />
                              <span>{!isAvailable ? (isSold ? t("Πουλήθηκε", "Sold") : t("Μη διαθέσιμο", "Unavailable")) : t("Καλάθι", "Bag")}</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </ContentCard>
              );
            })}
          </div>
        )}
      </div>

      {/* Comprehensive Product Detail Modal with Full Media & Metrics Support */}
      {selectedItem && (
        <DetailView
          title={t('Λεπτομέρειες', 'Details') + ': ' + (localizedName(selectedItem, locale) || t('Κόσμημα', 'Jewelry'))}
          onClose={() => setSelectedItem(null)}
          onPrevious={hasPrevModalItem ? handlePrevModalItem : undefined}
          onNext={hasNextModalItem ? handleNextModalItem : undefined}
          previousLabel={t("Προηγούμενο κόσμημα", "Previous product")}
          nextLabel={t("Επόμενο κόσμημα", "Next product")}
        >
            {/* LEFT COLUMN: Rich Media Stage (Images & Videos) */}
            <div className="shop-detail-media w-full shrink-0 border-b border-stone-200 bg-stone-100 p-4 sm:p-6 md:w-1/2 md:border-b-0 md:border-r">
              <MediaGallery
                media={selectedMediaList}
                activeIndex={activeMediaIndex}
                onActiveIndex={setActiveMediaIndex}
                title={localizedName(selectedItem, locale) || t("Κόσμημα", "Jewelry")}
                onOpen={activeMedia?.type === 'video' ? undefined : () => setIsLightboxOpen(true)}
              />
            </div>

            {/* RIGHT COLUMN: Product Details, Metrics, Materials & Actions */}
            <div className="w-full md:w-1/2 p-6 sm:p-8 flex flex-col justify-between overflow-y-auto">
              <div className="space-y-4">
                {/* Category & Collection */}
                <div className="flex items-center justify-between gap-3 border-b border-stone-100 pb-3 pr-14 sm:pr-16">
                  <span className="text-xs font-bold uppercase tracking-wider text-stone-500 min-w-0 flex-1 truncate">
                    {localizedTerm(selectedItem.category || '', locale)} {selectedItem.collection && `• ${localizedTerm(selectedItem.collection, locale)}`}
                  </span>

                  {/* Likes & Views Metrics Display - Clean Non-breaking Pill */}
                  <div className="flex items-center gap-2.5 text-xs font-semibold text-stone-600 bg-stone-100/90 border border-stone-200/90 px-3 py-1 rounded-full shrink-0 whitespace-nowrap shadow-xs">
                    <span className="flex items-center gap-1 text-stone-600" title={t(`${getItemViews(selectedItem)} προβολές`, `${getItemViews(selectedItem)} views`)}>
                      <Eye className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                      <span>{getItemViews(selectedItem)}</span>
                      <span className="text-[11px] font-normal text-stone-500 hidden sm:inline">
                        {getItemViews(selectedItem) === 1 ? t("προβολή", "view") : t("προβολές", "views")}
                      </span>
                    </span>
                    <span className="text-stone-300">·</span>
                    <button
                      onClick={(e) => toggleFavorite(selectedItem.id, e)}
                      aria-label={favoriteIds.includes(selectedItem.id) ? t("Αφαίρεση από τα αγαπημένα", "Remove from favorites") : t("Προσθήκη στα αγαπημένα", "Add to favorites")}
                      aria-pressed={favoriteIds.includes(selectedItem.id)}
                      className={`flex items-center gap-1 transition ${
                        favoriteIds.includes(selectedItem.id) ? 'text-rose-600 font-bold' : 'hover:text-stone-800'
                      }`}
                      title={t("Αγαπημένο", "Favorite")}
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
                  <h2 className="catalog-detail-title">
                    <span lang={publicTextLanguage(localizedName(selectedItem, locale), locale)}>{localizedName(selectedItem, locale)}</span>
                  </h2>
                  <div className="mt-2 flex items-baseline gap-3 flex-wrap">
                    <span className="text-lg sm:text-2xl font-semibold text-stone-900">
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
                        ? isSoldItem(selectedItem)
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-amber-100 text-amber-900'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}>
                      {localizedTerm(inventoryLabel(selectedItem), locale)}
                    </span>
                  </div>
                  {isSoldItem(selectedItem) ? (
                    <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] font-medium leading-relaxed text-rose-900">{t("Αυτό το κομμάτι είναι μοναδικό και έχει ήδη πουληθεί. Αν θέλεις κάτι παρόμοιο, επικοινώνησε μαζί μας μέσω", "This one-of-a-kind piece has sold. If you’d like something similar, contact us on")}{' '}
                      {/^https:\/\//i.test(shopSettings.fallbackLinks?.Instagram || '') ? <a href={shopSettings.fallbackLinks.Instagram} target="_blank" rel="noopener noreferrer" className="font-bold underline">Instagram</a> : 'Instagram'}{t(" ή", " or")}{' '}
                      <a href="mailto:aristeaamnta@gmail.com" className="font-bold underline">email</a>.
                    </div>
                  ) : null}
                </div>

                {/* Description */}
                {localizedDescription(selectedItem, locale) && (
                  <p className="text-xs sm:text-sm text-stone-600 leading-relaxed font-sans whitespace-pre-wrap pt-2">
                    <span lang={publicTextLanguage(localizedDescription(selectedItem, locale), locale)}>{sanitizeVintedDescription(localizedDescription(selectedItem, locale))}</span>
                  </p>
                )}

                {/* Materials list */}
                {selectedItem.materials && selectedItem.materials.length > 0 && (
                  <div className="pt-3 border-t border-stone-100">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400 block mb-1.5">{t("Υλικά Κατασκευής", "Materials")}</span>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedItem.materials.map((mat, i) => (
                        <span
                          key={i}
                          className="bg-stone-100 text-stone-800 text-xs px-2.5 py-1 rounded-lg font-medium border border-stone-200"
                        >
                          {localizedTerm(mat, locale)}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Colors */}
                {selectedItem.colors && selectedItem.colors.length > 0 && (
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400 block mb-1.5">{t("Χρώματα", "Colors")}</span>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedItem.colors.map((col, i) => (
                        <span
                          key={i}
                          className="bg-white border border-stone-200 text-stone-800 text-xs px-2.5 py-1 rounded-lg font-medium"
                        >
                          <span className="inline-block w-2.5 h-2.5 rounded-full mr-1.5 border border-stone-200 align-middle" style={{ backgroundColor: shopSettings.colorPalette[col] || '#e7e5e4' }} aria-hidden="true" />
                          {localizedTerm(col, locale)}
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
                        <span className="block text-[10px] uppercase font-bold text-stone-400">{t("Διαστάσεις", "Dimensions")}</span>
                        <span className="font-medium">{selectedItem.dimensions}</span>
                      </div>
                    )}
                    {selectedItem.weight && (
                      <div>
                        <span className="block text-[10px] uppercase font-bold text-stone-400">{t("Βάρος", "Weight")}</span>
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
                      ? isSoldItem(selectedItem) ? t("Πουλήθηκε", "Sold") : localizedTerm(selectedItem.status || '', locale) || t("Μη διαθέσιμο", "Unavailable")
                      : t("Προσθήκη στην Τσάντα Αγορών", "Add to bag")}
                  </span>
                </button>

                {/* Vinted and External Purchase Links */}
                {(selectedItem.purchaseLinks || []).map((link, idx) => {
                  const href = storefrontLink(link.url || '', locale, window.location.origin);
                  return href && (
                  <a
                    key={idx}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-3 rounded-xl bg-teal-50 hover:bg-teal-100 border border-teal-200 text-teal-900 font-bold text-xs flex items-center justify-center gap-2 transition"
                  >
                    <span>{t("Αγορά μέσω ", "Buy on ")}{link.site || 'Vinted'}</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                  );
                })}
              </div>
            </div>
        </DetailView>
      )}

      {isLightboxOpen && selectedItem && zoomImages.length > 0 && (
        <ImageLightbox images={zoomImages} title={localizedName(selectedItem, locale) || t("Κόσμημα", "Jewelry")}
          index={zoomImages.findIndex(media => media.mediaIndex === activeMediaIndex)}
          onIndexChange={index => setActiveMediaIndex(zoomImages[index].mediaIndex)}
          onClose={() => setIsLightboxOpen(false)} />
      )}

      {/* Official Customer Reviews & Social Proof */}
      <VintedReviewsSection
        theme={shopSettings.visualTheme}
      />
    </SectionShell>
  );
};
