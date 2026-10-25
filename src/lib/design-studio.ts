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
  fontFamily: "Jura, sans-serif", baseSize: '16px', pageBackground: '#f5f1e9', surface: '#fffdfa', ink: '#302c27', muted: '#716a61', line: '#ddd5c9', accent: '#6253ae',
  radius: '12px', cardRadius: '12px', cardPadding: '20px', sectionGap: '32px',
  headerBackground: '#201d1a', headerInk: '#fffdfa', headerMuted: '#c8c0b5', headerHeight: '76px', headerGap: '24px', navActiveBackground: '#f7f3ec', navActiveInk: '#201d1a',
  buttonBackground: '#6253ae', buttonInk: '#ffffff', buttonRadius: '10px', buttonPaddingX: '20px', buttonPaddingY: '10px',
  badgeBackground: '#f5f1e9', badgeInk: '#514663', badgeBorder: '#ddd5c9', badgeRadius: '999px',
  adminCardBackground: '#ffffff', adminCardBorder: '#e7e5e4', adminCardInk: '#1c1917', adminMetaInk: '#78716c', adminStatusBackground: '#dcfce7', adminStatusInk: '#047857', adminTagBackground: '#f8fafc', adminTagInk: '#57534e', dragBackground: '#ffffff', dragInk: '#57534e',
  heroMinHeight: '500px', heroOverlay: '0.55', heroTitleSize: '42px', heroTitleInk: '#ffffff', heroBodyInk: '#ffffff', heroContentWidth: '896px', heroTopPadding: '64px', heroBottomPadding: '64px',
  portfolioCardBackground: '#fffdfa', portfolioCardBorder: '#ddd5c9', portfolioCardTitleInk: '#302c27', portfolioCardBodyInk: '#716a61', portfolioCardPadding: '20px', portfolioLinkInk: '#514663',
  modalBackground: '#fffdfa', modalInk: '#302c27', modalMuted: '#716a61', modalBorder: '#ddd5c9', modalRadius: '18px'
};

export function normalizeDesignStudio(value?: Partial<DesignStudio>): DesignStudio {
  return { ...DEFAULT_DESIGN_STUDIO, ...(value || {}) };
}

export function designStudioCss(value?: Partial<DesignStudio>): Record<string, string> {
  const d = normalizeDesignStudio(value);
  return Object.fromEntries(Object.entries(d).map(([key, val]) => [`--ds-${key.replace(/[A-Z]/g, c => `-${c.toLowerCase()}`)}`, val]));
}
