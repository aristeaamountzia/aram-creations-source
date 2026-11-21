import type { HeroAppearance } from './hero-appearance';
import { CATEGORIES, ART_ITEMS } from '../data';
export type PortfolioDesign = {
  heroAppearance?: HeroAppearance;
  title: string; subtitle: string; contactLabel: string;
  categories: { id: string; title: string; description: string }[];
  statuses: { id: string; label: string }[];
  materials: string[];
  labels: { category: string; status: string; medium: string; dimensions: string; year: string };
};
export const DEFAULT_PORTFOLIO_DESIGN: PortfolioDesign = {
  title: 'Portfolio', subtitle: 'Γλυπτική, σχέδιο, φωτογραφία και ψηφιακές δημιουργίες.', contactLabel: 'Επικοινωνία',
  categories: CATEGORIES.filter(c => c.id !== 'jewelry').map(({id,title,description}) => ({id,title,description})),
  statuses: [...new Set(['Διαθέσιμο', ...ART_ITEMS.map(item => item.status).filter(Boolean)])].map(label => ({id: label!, label: label!})),
  materials: ['Ακρυλικά', 'Χαρτοπολτός', 'Πηλός', 'Ξύλο', 'Ρητίνη', 'Μολύβι', 'Φωτογραφία', 'Ψηφιακός σχεδιασμός'],
  labels: { category: 'Κατηγορία', status: 'Κατάσταση', medium: 'Υλικό / Τεχνική', dimensions: 'Διαστάσεις', year: 'Έτος' }
};
export function normalizePortfolioDesign(raw: Partial<PortfolioDesign> = {}): PortfolioDesign {
  raw = raw || {};
  return { ...DEFAULT_PORTFOLIO_DESIGN, ...raw,
    title: !raw.title || ['Έργα & Δημιουργίες', 'Έργα και Δημιουργίες'].includes(raw.title) ? DEFAULT_PORTFOLIO_DESIGN.title : raw.title,
    subtitle: raw.subtitle === undefined || raw.subtitle === 'Γλυπτική, σχέδιο, φωτογραφία και ψηφιακές δημιουργίες. Κάθε έργο έχει τη δική του ιστορία.' ? DEFAULT_PORTFOLIO_DESIGN.subtitle : raw.subtitle,
    contactLabel: !raw.contactLabel || raw.contactLabel === 'Ανάθεση Έργου / Επικοινωνία' ? DEFAULT_PORTFOLIO_DESIGN.contactLabel : raw.contactLabel,
    categories: Array.isArray(raw.categories) && raw.categories.length ? raw.categories : DEFAULT_PORTFOLIO_DESIGN.categories,
    statuses: Array.isArray(raw.statuses) && raw.statuses.length ? raw.statuses : DEFAULT_PORTFOLIO_DESIGN.statuses,
    materials: Array.isArray(raw.materials) ? raw.materials : DEFAULT_PORTFOLIO_DESIGN.materials,
    labels: { ...DEFAULT_PORTFOLIO_DESIGN.labels, ...raw.labels }
  };
}
export function validatePortfolioDesign(value: PortfolioDesign) {
  if (!value.title.trim()) throw new Error('Χρειάζεται επικεφαλίδα Portfolio.');
  for (const list of [value.categories.map(c => ({id:c.id,label:c.title})), value.statuses]) {
    if (!list.length || list.some(c => !c.id || !c.label.trim()) || new Set(list.map(c => c.id)).size !== list.length) throw new Error('Κάθε κατηγορία και κατάσταση χρειάζεται όνομα και μοναδικό αναγνωριστικό.');
  }
}
export const portfolioStatusLabel = (design: PortfolioDesign, status?: string) => design.statuses.find(s => s.id === status)?.label || status || '';
