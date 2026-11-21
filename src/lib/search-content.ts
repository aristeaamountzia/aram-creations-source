import { getBuildHeroSnapshot, heroPosterFor } from './hero-media';
import { DEFAULT_PORTFOLIO_DESIGN } from './portfolio-settings';

export const SITE_URL = 'https://aramcreationsofficial.netlify.app';
export const searchPages = {
  shop: {
    path: '/',
    title: 'Aram Creations | Χειροποίητα κοσμήματα',
    description: 'Σκουλαρίκια, κολιέ και δαχτυλίδια από το Aram Creations.',
    heading: 'Χειροποίητα κοσμήματα',
  },
  portfolio: {
    path: '/portfolio/',
    title: 'Portfolio | Aram Creations',
    description: 'Γλυπτική, σχέδιο, φωτογραφία και ψηφιακές δημιουργίες.',
    heading: 'Portfolio',
  },
};

export function studioContent(portfolio = false) {
  return portfolio
    ? '<section aria-labelledby="studio-heading"><h2 id="studio-heading">Aram Creations</h2><p>Γλυπτική, σχέδιο, φωτογραφία και ψηφιακές δημιουργίες.</p><p><a href="mailto:aristeaamnta@gmail.com">Επικοινωνία</a></p></section>'
    : '<section aria-labelledby="studio-heading"><h2 id="studio-heading">Aram Creations</h2><p>Χειροποίητα κοσμήματα με άνθη, ρητίνη και χάλκινο σύρμα.</p><p><a href="mailto:aristeaamnta@gmail.com">Επικοινωνία</a> · <a href="/portfolio/">Portfolio</a></p></section>';
}

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]!));

function heroShell(portfolio: boolean) {
  const hero = getBuildHeroSnapshot();
  const collection = portfolio ? 'portfolio' : 'shop';
  const fallback = '/assets/hero/' + collection + '-hero-v1.jpg';
  const poster = portfolio ? heroPosterFor(hero.portfolioHeroVideoUrl) || fallback : '/assets/hero/shop-gallery.webp';
  const title = escapeHtml(portfolio ? DEFAULT_PORTFOLIO_DESIGN.title : hero.heroTitle.trim() || 'Χειροποίητα κοσμήματα');
  const description = escapeHtml(portfolio ? DEFAULT_PORTFOLIO_DESIGN.subtitle : hero.heroSubtitle);
  return `<section class="collection-hero gallery-hero gallery-hero--${collection}" aria-hidden="true"><div class="collection-hero-copy"><h1 class="collection-title">${title}</h1>${description ? `<p class="collection-intro">${description}</p>` : ''}</div><div class="collection-hero-media"><img src="${poster}" alt="" fetchpriority="high" decoding="async" /></div></section>`;
}

export function initialContent(portfolio = false) {
  return `<div id="root-loader"><div class="studio-loading-header"><span>aram.creations</span></div>${heroShell(portfolio)}</div><main style="position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0;"><nav aria-label="Κύρια πλοήγηση"><a href="/">Shop</a> · <a href="/portfolio/">Portfolio</a></nav><h1>${searchPages[portfolio ? 'portfolio' : 'shop'].heading}</h1>${studioContent(portfolio)}<p>Για τον κατάλογο ενεργοποιήστε τη JavaScript.</p></main>`;
}
