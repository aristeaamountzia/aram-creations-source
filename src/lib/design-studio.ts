export type DesignStudio = {
  brandName: string; shopCaption: string; portfolioCaption: string; shopNavLabel: string; portfolioNavLabel: string; cartLabel: string; contactLabel: string;
  fontFamily: string; baseSize: string; pageBackground: string; surface: string; ink: string; muted: string; line: string; accent: string;
  radius: string; cardRadius: string; cardPadding: string; sectionGap: string;
  headerBackground: string; headerInk: string; headerMuted: string; headerHeight: string; headerGap: string; navActiveBackground: string; navActiveInk: string;
  buttonBackground: string; buttonInk: string; buttonRadius: string; buttonPaddingX: string; buttonPaddingY: string;
  badgeBackground: string; badgeInk: string; badgeBorder: string; badgeRadius: string;
  adminCardBackground: string; adminCardBorder: string; adminCardInk: string; adminMetaInk: string; adminStatusBackground: string; adminStatusInk: string; adminTagBackground: string; adminTagInk: string; dragBackground: string; dragInk: string;
  heroMinHeight: string; heroOverlay: string; heroTitleSize: string; heroTitleInk: string; heroBodyInk: string; heroContentWidth: string; heroTopPadding: string; heroBottomPadding: string;
  portfolioCardBackground: string; portfolioCardBorder: string; portfolioCardTitleInk: string; portfolioCardBodyInk: string; portfolioCardPadding: string; portfolioLinkInk: string;
  modalBackground: string; modalInk: string; modalMuted: string; modalBorder: string; modalRadius: string;
};

export const DEFAULT_DESIGN_STUDIO: DesignStudio = {
  brandName: 'aram.creations', shopCaption: 'Χειροποίητα κοσμήματα', portfolioCaption: 'Τέχνη & δημιουργίες', shopNavLabel: 'Shop', portfolioNavLabel: 'Portfolio', cartLabel: 'Καλάθι', contactLabel: 'Επικοινωνία',
  fontFamily: "Jura, sans-serif", baseSize: '15px', pageBackground: '#fafaf9', surface: '#ffffff', ink: '#18181b', muted: '#71717a', line: '#e4e4e7', accent: '#18181b',
  radius: '10px', cardRadius: '12px', cardPadding: '16px', sectionGap: '32px',
  headerBackground: '#ffffff', headerInk: '#18181b', headerMuted: '#71717a', headerHeight: '76px', headerGap: '24px', navActiveBackground: '#18181b', navActiveInk: '#ffffff',
  buttonBackground: '#18181b', buttonInk: '#ffffff', buttonRadius: '8px', buttonPaddingX: '18px', buttonPaddingY: '10px',
  badgeBackground: '#f4f4f5', badgeInk: '#18181b', badgeBorder: '#e4e4e7', badgeRadius: '999px',
  adminCardBackground: '#ffffff', adminCardBorder: '#e4e4e7', adminCardInk: '#18181b', adminMetaInk: '#71717a', adminStatusBackground: '#f4f4f5', adminStatusInk: '#18181b', adminTagBackground: '#f4f4f5', adminTagInk: '#27272a', dragBackground: '#ffffff', dragInk: '#27272a',
  heroMinHeight: '520px', heroOverlay: '0.50', heroTitleSize: '40px', heroTitleInk: '#ffffff', heroBodyInk: '#f4f4f5', heroContentWidth: '896px', heroTopPadding: '64px', heroBottomPadding: '64px',
  portfolioCardBackground: '#ffffff', portfolioCardBorder: '#e4e4e7', portfolioCardTitleInk: '#18181b', portfolioCardBodyInk: '#71717a', portfolioCardPadding: '16px', portfolioLinkInk: '#18181b',
  modalBackground: '#ffffff', modalInk: '#18181b', modalMuted: '#71717a', modalBorder: '#e4e4e7', modalRadius: '16px'
};

export function normalizeDesignStudio(value?: Partial<DesignStudio>): DesignStudio {
  return { ...DEFAULT_DESIGN_STUDIO, ...(value || {}) };
}

export function designStudioCss(value?: Partial<DesignStudio>): Record<string, string> {
  const d = normalizeDesignStudio(value);
  return Object.fromEntries(Object.entries(d).map(([key, val]) => [`--ds-${key.replace(/[A-Z]/g, c => `-${c.toLowerCase()}`)}`, val]));
}
