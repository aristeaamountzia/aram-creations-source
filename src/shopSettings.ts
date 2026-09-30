export interface ShopSettings {
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
}

export const DEFAULT_SHOP_SETTINGS: ShopSettings = {
  fontFamily: 'Jura',
  primaryColor: '#1c1917',
  bgColor: '#fafafa',
  textColor: '#1c1917',
  heroBgColor: '#1c1917',
  heroTitleColor: '#ffffff',
  heroSubtitleColor: '#a8a29e',
  heroTitleSize: 'text-3xl md:text-4xl',
  borderRadius: '0.75rem',
  heroTitle: 'Χειροποίητες Δημιουργίες',
  heroSubtitle: 'Μοναδικές δημιουργίες από μια μεγάλη γκάμα υλικών και τεχνικών. Κάθε κομμάτι είναι φτιαγμένο στο χέρι με αγάπη.',
  heroVideoUrl: '',
  announcementEnabled: false,
  announcementText: '',
  announcementLink: '',
  catalogDensity: 'comfortable',
  categoryOrder: ['Κολιέ', 'Δαχτυλίδια', 'Σκουλαρίκια', 'Βραχιόλια', 'Καρφίτσες', 'Σετ', 'Θήκες Κινητών', 'Άλλα'],
  fallbackLinks: { Vinted: '', Wix: '', Instagram: '', Facebook: '', TikTok: '', Etsy: '' },
  colorPalette: {},
  aiAssistant: { backofficeEndpoint: '' }
};

export function normalizeShopSettings(value: Partial<ShopSettings> | undefined): ShopSettings {
  const data = value || {};
  return {
    ...DEFAULT_SHOP_SETTINGS,
    ...data,
    categoryOrder: Array.isArray(data.categoryOrder) ? data.categoryOrder : DEFAULT_SHOP_SETTINGS.categoryOrder,
    fallbackLinks: { ...DEFAULT_SHOP_SETTINGS.fallbackLinks, ...(data.fallbackLinks || {}) },
    colorPalette: { ...DEFAULT_SHOP_SETTINGS.colorPalette, ...(data.colorPalette || {}) },
    aiAssistant: { ...DEFAULT_SHOP_SETTINGS.aiAssistant, ...(data.aiAssistant || {}) }
  };
}
