export type HeroAppearance = Partial<Record<'heroMinHeight' | 'heroOverlay' | 'heroTitleSize' | 'heroTitleInk' | 'heroBodyInk' | 'heroContentWidth' | 'heroTopPadding' | 'heroBottomPadding', string>>;
export function heroAppearanceCss(value: HeroAppearance = {}) {
  return Object.fromEntries(Object.entries(value).filter(([, val]) => val).map(([key, val]) => [`--ds-${key.replace(/[A-Z]/g, c => `-${c.toLowerCase()}`)}`, val]));
}

export const galleryHeroFields = [
  ['heroTitleSize', 'Μέγεθος τίτλου', 'px', 20, 120],
  ['heroMinHeight', 'Ελάχιστο ύψος', 'px', 280, 1200],
  ['heroContentWidth', 'Πλάτος κειμένου', 'px', 280, 1600],
  ['heroTopPadding', 'Επάνω περιθώριο', 'px', 72, 240],
  ['heroBottomPadding', 'Κάτω περιθώριο', 'px', 16, 240],
  ['heroOverlay', 'Σκοτεινότητα φόντου (0–1)', '', 0, 1],
] as const;

export function galleryHeroCss(value: HeroAppearance = {}) {
  return Object.fromEntries(galleryHeroFields.flatMap(([field, , unit, min, max]) => {
    const raw = value[field];
    if (!raw || !/^-?\d+(?:\.\d+)?(?:px)?$/.test(raw)) return [];
    const number = parseFloat(raw);
    const key = field.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`);
    return [[`--gallery-${key}`, `${Math.min(max, Math.max(min, number))}${unit}`]];
  }));
}
