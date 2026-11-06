import { DEFAULT_DESIGN_STUDIO, DesignStudio, normalizeDesignStudio } from './lib/design-studio';

export interface ShippingSettings {
  boxnowPrice: number;
  boxnowFreeThreshold: number;
  courierPrice: number;
  courierFreeThreshold: number;
  customNotes?: string;
}

export const DEFAULT_SHIPPING_SETTINGS: ShippingSettings = {
  boxnowPrice: 2.50,
  boxnowFreeThreshold: 45.00,
  courierPrice: 4.00,
  courierFreeThreshold: 50.00,
  customNotes: ''
};

export interface ShopSettings {
  /** Presentation-only switch. It never changes catalog, orders or integrations. */
  visualTheme: 'atelier' | 'classic';
  fontFamily: string;
  primaryColor: string;
  bgColor: string;
  textColor: string;
  heroBgColor: string;
  heroTitleColor: string;
  heroSubtitleColor: string;
  heroTitleSize: string;
  borderRadius: string;
  heroTitle: string;
  heroSubtitle: string;
  heroVideoUrl: string;
  announcementEnabled: boolean;
  announcementText: string;
  announcementLink: string;
  catalogDensity: string;
  categoryOrder: string[];
  fallbackLinks: Record<string, string>;
  colorPalette: Record<string, string>;
  aiAssistant: { backofficeEndpoint: string };
  designStudio: DesignStudio;
  shippingSettings: ShippingSettings;
}

export const DEFAULT_SHOP_SETTINGS: ShopSettings = {
  visualTheme: 'atelier',
  fontFamily: 'Jura',
  primaryColor: '#18181b',
  bgColor: '#fafaf9',
  textColor: '#18181b',
  heroBgColor: '#0c0a09',
  heroTitleColor: '#ffffff',
  heroSubtitleColor: '#a1a1aa',
  heroTitleSize: 'text-3xl md:text-4xl',
  borderRadius: '0.625rem',
  heroTitle: 'Χειροποίητα κοσμήματα από τον Βόλο',
  heroSubtitle: 'Μοναδικές δημιουργίες από μια μεγάλη γκάμα υλικών και τεχνικών. Κάθε κομμάτι είναι φτιαγμένο στο χέρι με αγάπη.',
  heroVideoUrl: '',
  announcementEnabled: false,
  announcementText: '',
  announcementLink: '',
  catalogDensity: 'comfortable',
  categoryOrder: ['Κολιέ', 'Δαχτυλίδια', 'Σκουλαρίκια', 'Βραχιόλια', 'Καρφίτσες', 'Σετ', 'Θήκες Κινητών', 'Άλλα'],
  fallbackLinks: { Vinted: '', Wix: '', Instagram: '', Facebook: '', TikTok: '', Etsy: '' },
  colorPalette: {},
  aiAssistant: { backofficeEndpoint: '' },
  designStudio: DEFAULT_DESIGN_STUDIO,
  shippingSettings: DEFAULT_SHIPPING_SETTINGS
};

export function normalizeShopSettings(value: Partial<ShopSettings> | undefined): ShopSettings {
  const data = value || {};
  return {
    ...DEFAULT_SHOP_SETTINGS,
    ...data,
    visualTheme: data.visualTheme === 'classic' ? 'classic' : 'atelier',
    categoryOrder: Array.isArray(data.categoryOrder) ? data.categoryOrder : DEFAULT_SHOP_SETTINGS.categoryOrder,
    fallbackLinks: { ...DEFAULT_SHOP_SETTINGS.fallbackLinks, ...(data.fallbackLinks || {}) },
    colorPalette: { ...DEFAULT_SHOP_SETTINGS.colorPalette, ...(data.colorPalette || {}) },
    aiAssistant: { ...DEFAULT_SHOP_SETTINGS.aiAssistant, ...(data.aiAssistant || {}) },
    designStudio: normalizeDesignStudio(data.designStudio),
    shippingSettings: {
      boxnowPrice: Number(data.shippingSettings?.boxnowPrice ?? DEFAULT_SHIPPING_SETTINGS.boxnowPrice),
      boxnowFreeThreshold: Number(data.shippingSettings?.boxnowFreeThreshold ?? DEFAULT_SHIPPING_SETTINGS.boxnowFreeThreshold),
      courierPrice: Number(data.shippingSettings?.courierPrice ?? DEFAULT_SHIPPING_SETTINGS.courierPrice),
      courierFreeThreshold: Number(data.shippingSettings?.courierFreeThreshold ?? DEFAULT_SHIPPING_SETTINGS.courierFreeThreshold),
      customNotes: String(data.shippingSettings?.customNotes || '')
    }
  };
}
