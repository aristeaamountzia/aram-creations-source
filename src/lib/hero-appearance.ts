export type HeroAppearance = Partial<Record<'heroMinHeight' | 'heroOverlay' | 'heroTitleSize' | 'heroTitleInk' | 'heroBodyInk' | 'heroContentWidth' | 'heroTopPadding' | 'heroBottomPadding', string>>;
export function heroAppearanceCss(value: HeroAppearance = {}) {
  return Object.fromEntries(Object.entries(value).filter(([, val]) => val).map(([key, val]) => [`--ds-${key.replace(/[A-Z]/g, c => `-${c.toLowerCase()}`)}`, val]));
}
