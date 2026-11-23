import { getBuildHeroSnapshot, heroPosterFor } from './hero-media';
import { DEFAULT_PORTFOLIO_DESIGN } from './portfolio-settings';
import { publicPath, type PublicLocale, type PublicSection } from './public-locale';

export const SITE_URL = 'https://aramcreationsofficial.netlify.app';
export const searchPages = {
  shop: {
    path: '/',
    title: 'Aram Creations | Χειροποίητα κοσμήματα',
    description: 'Χειροποίητα κολιέ και σκουλαρίκια με αληθινά άνθη και ρητίνη. Δείτε τη συλλογή Aram Creations.',
    heading: 'Χειροποίητα κοσμήματα',
    image: '/assets/hero/shop-hero-v1.jpg',
    imageAlt: 'Χειροποίητα κοσμήματα Aram Creations',
  },
  portfolio: {
    path: '/portfolio/',
    title: 'Portfolio | Aram Creations',
    description: 'Δείτε έργα γλυπτικής, σχεδίου, φωτογραφίας και ψηφιακές δημιουργίες στο portfolio του Aram Creations.',
    heading: 'Portfolio',
    image: '/assets/hero/portfolio-hero-v1.jpg',
    imageAlt: 'Έργα από το portfolio Aram Creations',
  },
};

const englishPages = {
  shop: { title: 'Handmade Jewelry | Aram Creations', heading: 'Handmade jewelry', description: 'Explore handmade necklaces and earrings with real flowers and resin by Aram Creations.', imageAlt: 'Handmade jewelry by Aram Creations' },
  portfolio: { title: 'Portfolio | Aram Creations', heading: 'Portfolio', description: 'Explore sculpture, drawing, photography, and digital work in the Aram Creations portfolio.', imageAlt: 'Work from the Aram Creations portfolio' },
};

export function searchPage(section: PublicSection, locale: PublicLocale) {
  const page = searchPages[section];
  return locale === 'en' ? { ...page, ...englishPages[section], path: publicPath(locale, section) } : page;
}

export function searchStructuredData(page: typeof searchPages[keyof typeof searchPages], locale: PublicLocale = 'el') {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'OnlineStore', '@id': SITE_URL + '/#store', name: 'Aram Creations',
        url: SITE_URL + '/', logo: SITE_URL + '/logo.png', description: searchPage('shop', locale).description,
        sameAs: [
          'https://www.vinted.gr/member/231329281',
          'https://www.instagram.com/aram.creations/',
          'https://www.tiktok.com/@aram.creations',
          'https://www.facebook.com/share/1DmHHwXCMC/',
          'https://linktr.ee/aristeaamnt',
        ],
      },
      {
        '@type': 'WebSite', '@id': SITE_URL + '/#website', name: 'Aram Creations', url: SITE_URL + '/',
        inLanguage: ['el-GR', 'en'], publisher: { '@id': SITE_URL + '/#store' },
      },
      {
        '@type': 'CollectionPage', '@id': SITE_URL + page.path + '#page',
        url: SITE_URL + page.path, name: page.title, description: page.description, inLanguage: locale === 'el' ? 'el-GR' : 'en',
        isPartOf: { '@id': SITE_URL + '/#website' },
        primaryImageOfPage: { '@type': 'ImageObject', contentUrl: SITE_URL + page.image },
      },
    ],
  };
}

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]!));

function heroShell(portfolio: boolean, locale: PublicLocale) {
  const hero = getBuildHeroSnapshot();
  const collection = portfolio ? 'portfolio' : 'shop';
  const fallback = '/assets/hero/' + collection + '-hero-v1.jpg';
  const poster = portfolio ? heroPosterFor(hero.portfolioHeroVideoUrl) || fallback : '/assets/hero/shop-gallery.webp';
  const page = searchPage(collection, locale);
  const title = escapeHtml(locale === 'en' ? page.heading : portfolio ? DEFAULT_PORTFOLIO_DESIGN.title : hero.heroTitle.trim() || page.heading);
  const description = escapeHtml(locale === 'en' ? page.description : portfolio ? DEFAULT_PORTFOLIO_DESIGN.subtitle : hero.heroSubtitle);
  return `<section class="collection-hero gallery-hero gallery-hero--${collection}"><div class="collection-hero-copy"><h1 class="collection-title">${title}</h1>${description ? `<p class="collection-intro">${description}</p>` : ''}</div><div class="collection-hero-media"><img src="${poster}" alt="" fetchpriority="high" decoding="async" /></div></section>`;
}

export function initialContent(portfolio = false, locale: PublicLocale = 'el') {
  const english = locale === 'en';
  const alternate = english ? 'el' : 'en';
  const shop = publicPath(locale);
  const work = publicPath(locale, 'portfolio');
  return `<div id="root-loader"><header class="studio-loading-header"><a href="${shop}">aram.creations</a><nav aria-label="${english ? 'Main navigation' : 'Κύρια πλοήγηση'}"><a href="${shop}">Shop</a><a href="${work}">Portfolio</a><a href="${publicPath(alternate, portfolio ? 'portfolio' : 'shop')}" lang="${alternate}">${english ? 'Ελληνικά' : 'English'}</a></nav></header><main>${heroShell(portfolio, locale)}<noscript><p class="studio-noscript">${english ? 'Enable JavaScript to browse the catalog.' : 'Για τον κατάλογο ενεργοποιήστε τη JavaScript.'} <a href="mailto:aristeaamnta@gmail.com">${english ? 'Contact' : 'Επικοινωνία'}</a></p><nav class="studio-noscript-nav" aria-label="${english ? 'Site links' : 'Σύνδεσμοι ιστότοπου'}"><a href="${shop}#customer-reviews">${english ? 'Customer Reviews' : 'Αξιολογήσεις'}</a> | <a href="${shop}#artist-profile">${english ? 'Artist Profile' : 'Βιογραφικό'}</a> | <a href="${shop}#contact">${english ? 'Contact' : 'Επικοινωνία'}</a> | <a href="${shop}#terms">${english ? 'Terms of Use' : 'Όροι Χρήσης'}</a> | <a href="${shop}#privacy">${english ? 'Privacy Policy' : 'Πολιτική Απορρήτου'}</a> | <a href="${shop}#returns">${english ? 'Shipping and Returns' : 'Αποστολές και Επιστροφές'}</a></nav></noscript></main></div>`;
}
