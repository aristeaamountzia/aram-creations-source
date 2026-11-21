import { shopHeroCopy } from './lib/hero-media';
import type { HeroAppearance } from './lib/hero-appearance';
import { DEFAULT_DESIGN_STUDIO, DesignStudio, normalizeDesignStudio } from './lib/design-studio';
import { DEFAULT_SHIPPING_SETTINGS, normalizeShippingSettings, type ShippingSettings } from './lib/shipping';
import { DEFAULT_PORTFOLIO_DESIGN, normalizePortfolioDesign, type PortfolioDesign } from './lib/portfolio-settings';
export { DEFAULT_SHIPPING_SETTINGS, type ShippingSettings } from './lib/shipping';

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
  heroAppearance?: HeroAppearance;
  borderRadius: string | number;
  heroTitle: string;
  heroSubtitle: string;
  heroVideoUrl: string;
  portfolioHeroVideoUrl: string;
  portfolioDesign: PortfolioDesign;
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
  ...shopHeroCopy(),
  heroVideoUrl: '',
  portfolioHeroVideoUrl: '',
  portfolioDesign: DEFAULT_PORTFOLIO_DESIGN,
  announcementEnabled: false,
  announcementText: '',
  announcementLink: '',
  catalogDensity: 'comfortable',
  categoryOrder: ['Κολιέ', 'Δαχτυλίδια', 'Σκουλαρίκια', 'Βραχιόλια', 'Καρφίτσες', 'Σετ', 'Θήκες Κινητών', 'Άλλα'],
  fallbackLinks: {
    Vinted: 'https://www.vinted.gr/member/231329281',
    Wix: '',
    Instagram: 'https://www.instagram.com/aram.creations/',
    Facebook: 'https://www.facebook.com/share/1DmHHwXCMC/',
    TikTok: 'https://www.tiktok.com/@aram.creations',
    Etsy: ''
  },
  colorPalette: {},
  aiAssistant: { backofficeEndpoint: '' },
  designStudio: DEFAULT_DESIGN_STUDIO,
  shippingSettings: DEFAULT_SHIPPING_SETTINGS
};

export type ShopSettingsInput = Omit<Partial<ShopSettings>, 'shippingSettings' | 'portfolioDesign' | 'designStudio' | 'aiAssistant'> & {
  shippingSettings?: Partial<ShippingSettings>;
  portfolioDesign?: Partial<PortfolioDesign>;
  designStudio?: Partial<DesignStudio>;
  aiAssistant?: Partial<ShopSettings['aiAssistant']>;
};

/** One normalization path for the editor, public Shop and public Portfolio. */
export function normalizeShopSettings(value?: ShopSettingsInput): ShopSettings {
  const data = value || {};
  return {
    ...DEFAULT_SHOP_SETTINGS,
    ...data,
    ...shopHeroCopy(data.heroTitle, data.heroSubtitle),
    visualTheme: data.visualTheme === 'classic' ? 'classic' : 'atelier',
    categoryOrder: Array.isArray(data.categoryOrder) ? data.categoryOrder : DEFAULT_SHOP_SETTINGS.categoryOrder,
    fallbackLinks: { ...DEFAULT_SHOP_SETTINGS.fallbackLinks, ...(data.fallbackLinks || {}) },
    colorPalette: { ...DEFAULT_SHOP_SETTINGS.colorPalette, ...(data.colorPalette || {}) },
    aiAssistant: { ...DEFAULT_SHOP_SETTINGS.aiAssistant, ...(data.aiAssistant || {}) },
    portfolioHeroVideoUrl: typeof data.portfolioHeroVideoUrl === 'string' ? data.portfolioHeroVideoUrl : '',
    portfolioDesign: normalizePortfolioDesign(data.portfolioDesign),
    designStudio: normalizeDesignStudio(data.designStudio),
    shippingSettings: normalizeShippingSettings(data.shippingSettings)
  };
}
