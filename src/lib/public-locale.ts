export type PublicLocale = 'el' | 'en';
export type PublicSection = 'shop' | 'portfolio';

export const localeFromPath = (path: string): PublicLocale => /^\/en(?:\/|$)/.test(path) ? 'en' : 'el';
export const sectionFromPath = (path: string): PublicSection => /^\/(?:en\/)?portfolio(?:\/|$)/.test(path) ? 'portfolio' : 'shop';
export const publicPath = (locale: PublicLocale, section: PublicSection = 'shop') =>
  (locale === 'en' ? '/en' : '') + (section === 'portfolio' ? '/portfolio/' : '/');

const portfolioItemPrefix = '#portfolio/';

export function portfolioItemId(hash: string) {
  if (!hash.startsWith(portfolioItemPrefix)) return null;
  try {
    const id = decodeURIComponent(hash.slice(portfolioItemPrefix.length));
    return id && !id.includes('/') ? id : null;
  } catch {
    return null;
  }
}

export const portfolioItemPath = (locale: PublicLocale, id: string) =>
  publicPath(locale, 'portfolio') + portfolioItemPrefix + encodeURIComponent(id);

export function modeFromLocation(path: string, hash: string): PublicSection | 'admin' {
  if (hash === '#admin') return 'admin';
  if (hash === '#shop') return 'shop';
  return hash === '#portfolio' || hash.startsWith(portfolioItemPrefix) ? 'portfolio' : sectionFromPath(path);
}

export function languageSwitchPath(locale: PublicLocale, section: PublicSection, search: string, hash: string) {
  const path = publicPath(locale, section);
  if (section === 'portfolio') {
    const id = portfolioItemId(hash);
    return id ? portfolioItemPath(locale, id) : path;
  }
  const params = new URLSearchParams(search);
  if (params.has('session_id') || params.has('order_cancelled')) return path + search + hash;
  return hash === '#customer-reviews' ? path + hash : path;
}

export function storefrontLink(value: unknown, locale: PublicLocale, origin: string) {
  if (typeof value !== 'string') return '';
  const href = value.trim();
  if (!href || /^[#?]/.test(href)) return href;
  try {
    const url = new URL(href, origin + '/');
    if (!['http:', 'https:', 'mailto:', 'tel:'].includes(url.protocol)) return '';
    if (url.origin !== origin) return url.href;
    if (/^\/(?:en\/?|(?:en\/)?portfolio\/?)?$/.test(url.pathname)) {
      return publicPath(locale, modeFromLocation(url.pathname, url.hash) === 'portfolio' ? 'portfolio' : 'shop') + url.search + url.hash;
    }
    return url.pathname + url.search + url.hash;
  } catch {
    return '';
  }
}

export const isGreekText = (text: string) => /\p{Script=Greek}/u.test(text);
