export type CategoryId = 
  | 'jewelry'
  | 'handcrafted-memories'
  | 'custom-objects'
  | 'sculptures'
  | '3d-designs'
  | 'photography'
  | 'graphic-design'
  | 'drawings'
  | 'art-projects';

export type SectionMode = 'shop' | 'portfolio' | 'admin';

export interface CategoryInfo {
  id: CategoryId;
  title: string;
  subtitle: string;
  pillar: 'shop' | 'physical' | 'digital' | 'fine-art';
  pillarLabel: string;
  description: string;
  itemCount: number;
  coverImage: string;
}

export interface ArtMediaItem {
  url: string;
  type: 'image' | 'video';
  title?: string;
}

export interface ArtItem {
  id: string;
  title: string;
  category: CategoryId;
  categoryTitle?: string;
  year: string;
  medium: string;
  dimensions?: string;
  description: string;
  image: string;
  mediaList?: ArtMediaItem[];
  videoUrl?: string;
  details?: string[];
  inquiryOnly?: boolean;
  origin?: string;
  status?: string;
  featured?: boolean;
  favorites?: number;
}

export interface MediaItem {
  url: string;
  type?: 'image' | 'video' | string;
  showInShop?: boolean;
}

export interface PurchaseLink {
  site?: string;
  url?: string;
}

export interface JewelryItem {
  id: string;
  name?: string;
  title?: string;
  subtitle?: string;
  description?: string;
  notes?: string;
  category?: string;
  collection?: string;
  status?: string;
  price: number;
  originalPrice?: number;
  cost?: number;
  stock?: number;
  stockCount?: number;
  inStock?: boolean;
  badge?: string;
  vintedSynced?: boolean;
  vintedUrl?: string;
  vintedBasePrice?: number;
  vintedPricing?: {
    vintedBasePrice: number;
    buyerFixed: number;
    buyerPercent: number;
    shippingMin: number;
    estimatedTotal: number;
    sitePrice: number;
    rounding: string;
    parcelProfile?: string;
    manuallyEdited?: boolean;
  } | null;
  condition?: string;
  edition?: string;
  shopOrder?: number;
  weight?: string;
  dimensions?: string;
  storage?: string;
  materials?: string[];
  colors?: string[];
  imageUrl?: string;
  images?: string[];
  src?: string;
  fileType?: string;
  mediaList?: MediaItem[];
  purchaseLinks?: PurchaseLink[];
  showInNewCollection?: boolean;
  shopFavorites?: number;
  vintedFavorites?: number;
  favorites?: number;
  likes?: number;
  views?: number;
  viewCount?: number;
  vintedViews?: number;
  sourcePlatform?: string;
  sourceUrl?: string;
  createdAt?: any;
  isCustomOrder?: boolean;
  customInscription?: string;
}

export type JewelryProduct = JewelryItem;

export interface CartItem {
  item: JewelryItem;
  quantity: number;
  customInscription?: string;
}

export interface OrderCustomerInfo {
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  postalCode: string;
  notes?: string;
}

export interface OrderRecord {
  id?: string;
  customer: OrderCustomerInfo;
  items: Array<{
    id: string;
    name: string;
    price: number;
    quantity: number;
    imageUrl?: string;
    customInscription?: string;
  }>;
  subtotal: number;
  shippingCost: number;
  total: number;
  shippingMethod: string;
  paymentMethod: string;
  status: 'pending' | 'confirmed' | 'shipped' | 'delivered';
  createdAt: any;
}
