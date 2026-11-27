import type { PublicLocale } from './public-locale';

export const SITE_URL = 'https://aramcreationsofficial.netlify.app';

export interface PublicSeoItem extends Record<string, any> {
  id: string;
}

export function mergePublicPortfolio(seed: PublicSeoItem[], remote: PublicSeoItem[]) {
  const merged = new Map(seed.map(item => [item.id, { ...item }]));
  const deleted = new Set<string>();
  for (const item of remote) {
    if (!item.id) continue;
    if (item.isDeleted || item.deletedAt) {
      deleted.add(item.id);
      continue;
    }
    merged.set(item.id, { ...merged.get(item.id), ...item });
  }
  for (const id of deleted) merged.delete(id);
  return [...merged.values()].filter(item => !item.isDeleted && !item.deletedAt);
}

const escapeXml = (value: string) => value.replace(/[<>&'\"]/g, character => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[character]!));
const escapeHtml = (value: unknown) => String(value ?? '').replace(/[<>&'\"]/g, character => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&#39;', '"': '&quot;' }[character]!));
const jsonForScript = (value: unknown) => JSON.stringify(value).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026');

function safeHttpUrl(value: unknown) {
  if (typeof value !== 'string') return '';
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : '';
  } catch { return ''; }
}

function mediaUrls(item: PublicSeoItem, imageOnly = false) {
  const list = Array.isArray(item.mediaList) ? item.mediaList : [];
  const isVideo = (url: string) => /\.(mp4|webm|ogg|mov)(\?|#|$)/i.test(url);
  const urls = list.filter((media: any) => media && media.showInShop !== false && (!imageOnly || media.type !== 'video'))
    .map((media: any) => safeHttpUrl(media.url)).filter((url: string) => url && (!imageOnly || !isVideo(url)));
  if (!urls.length) {
    const fallback = [item.imageUrl, item.image, item.src, ...(Array.isArray(item.images) ? item.images : [])]
      .map(safeHttpUrl).filter((url: string) => url && (!imageOnly || (url !== item.videoUrl && !isVideo(url) && !(item.fileType === 'video' && (url === item.imageUrl || url === item.src)))));
    return [...new Set(fallback)];
  }
  return [...new Set(urls)];
}

const encodedId = (id: string) => encodeURIComponent(id);
export const publicProductPath = (locale: PublicLocale, id: string) => `${locale === 'en' ? '/en' : ''}/product/${encodedId(id)}`;
export const publicArtworkPath = (locale: PublicLocale, id: string) => `${locale === 'en' ? '/en' : ''}/portfolio/${encodedId(id)}`;

export function publicContentRoute(pathname: string, routeId = '') {
  const parts = pathname.split('/').filter(Boolean);
  if (pathname === '/sitemap.xml') return { resource: 'sitemap', id: '', locale: 'el' as PublicLocale };
  const locale: PublicLocale = parts[0] === 'en' ? 'en' : 'el';
  const offset = locale === 'en' ? 1 : 0;
  const section = parts[offset];
  if (section !== 'product' && section !== 'portfolio') return null;
  let id = parts[offset + 1] || routeId;
  if (parts[offset + 1]) {
    try { id = decodeURIComponent(id); } catch { return null; }
  }
  if (!id || id.includes('/')) return null;
  return { resource: section === 'product' ? 'product' : 'artwork', id, locale };
}

function alternates(elUrl: string, enUrl: string) {
  return `<xhtml:link rel="alternate" hreflang="el" href="${escapeXml(SITE_URL + elUrl)}"/><xhtml:link rel="alternate" hreflang="en" href="${escapeXml(SITE_URL + enUrl)}"/><xhtml:link rel="alternate" hreflang="x-default" href="${escapeXml(SITE_URL + elUrl)}"/>`;
}

function sitemapUrl(path: string, alt?: { el: string; en: string }, images: string[] = []) {
  const links = alt ? alternates(alt.el, alt.en) : '';
  const imageTags = images.map(url => `<image:image><image:loc>${escapeXml(url)}</image:loc></image:image>`).join('');
  return `<url><loc>${escapeXml(SITE_URL + path)}</loc>${links}${imageTags}</url>`;
}

export function buildPublicSitemap({ products, artworks }: { products: PublicSeoItem[]; artworks: PublicSeoItem[] }) {
  const pages = [
    sitemapUrl('/', { el: '/', en: '/en/' }),
    sitemapUrl('/en/', { el: '/', en: '/en/' }),
    sitemapUrl('/portfolio/', { el: '/portfolio/', en: '/en/portfolio/' }),
    sitemapUrl('/en/portfolio/', { el: '/portfolio/', en: '/en/portfolio/' }),
  ];
  for (const item of products.filter(item => item.id && !item.isDeleted && !item.deletedAt)) {
    const el = publicProductPath('el', item.id), en = publicProductPath('en', item.id);
    const images = mediaUrls(item, true);
    pages.push(sitemapUrl(el, { el, en }, images), sitemapUrl(en, { el, en }, images));
  }
  for (const item of artworks.filter(item => item.id && !item.isDeleted && !item.deletedAt)) {
    const el = publicArtworkPath('el', item.id), en = publicArtworkPath('en', item.id);
    const images = mediaUrls(item, true);
    pages.push(sitemapUrl(el, { el, en }, images), sitemapUrl(en, { el, en }, images));
  }
  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">${pages.join('')}</urlset>`;
}

function localizedProduct(item: PublicSeoItem, locale: PublicLocale) {
  const name = locale === 'en' ? item.titleEn || item.name || item.title : item.name || item.title || item.titleEn;
  const description = locale === 'en' ? item.descriptionEn || item.description || item.notes : item.description || item.notes || item.descriptionEn;
  return { name: String(name || (locale === 'en' ? 'Handmade jewelry' : 'Χειροποίητο κόσμημα')), description: String(description || '') };
}

function localizedArtwork(item: PublicSeoItem, locale: PublicLocale) {
  const title = locale === 'en' ? item.titleEn || item.title || item.name : item.title || item.name || item.titleEn;
  const description = locale === 'en' ? item.descriptionEn || item.description : item.description || item.descriptionEn;
  return { title: String(title || (locale === 'en' ? 'Artwork' : 'Έργο τέχνης')), description: String(description || '') };
}

function htmlPage({ locale, path, title, description, image, schema, body }: {
  locale: PublicLocale; path: string; title: string; description: string; image: string; schema: unknown; body: string;
}) {
  const elPath = path.replace(/^\/en(?=\/)/, '');
  const enPath = `/en${elPath}`;
  const imageUrl = image || `${SITE_URL}/logo.png`;
  return `<!doctype html><html lang="${locale}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="index,follow,max-image-preview:large"><title>${escapeHtml(title)}</title><meta name="description" content="${escapeHtml(description)}"><link rel="canonical" href="${escapeHtml(SITE_URL + path)}"><link rel="alternate" hreflang="el" href="${escapeHtml(SITE_URL + elPath)}"><link rel="alternate" hreflang="en" href="${escapeHtml(SITE_URL + enPath)}"><link rel="alternate" hreflang="x-default" href="${escapeHtml(SITE_URL + elPath)}"><meta property="og:type" content="website"><meta property="og:site_name" content="Aram Creations"><meta property="og:url" content="${escapeHtml(SITE_URL + path)}"><meta property="og:title" content="${escapeHtml(title)}"><meta property="og:description" content="${escapeHtml(description)}"><meta property="og:image" content="${escapeHtml(imageUrl)}"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${escapeHtml(title)}"><meta name="twitter:description" content="${escapeHtml(description)}"><meta name="twitter:image" content="${escapeHtml(imageUrl)}"><script type="application/ld+json">${jsonForScript(schema)}</script><style>:root{font-family:Arial,sans-serif;color:#181818;background:#fafafa}*{box-sizing:border-box}body{margin:0}.wrap{max-width:980px;margin:auto;padding:clamp(1rem,4vw,3rem)}a{color:inherit;text-underline-offset:.2em}.back{display:inline-block;margin-bottom:1.5rem}.card{display:grid;grid-template-columns:minmax(0,1fr) minmax(16rem,.9fr);gap:clamp(1.5rem,5vw,4rem);align-items:start;background:white;border:1px solid #e4e4e4;border-radius:1rem;padding:clamp(1rem,4vw,2.5rem)}img{display:block;width:100%;height:auto;max-height:70vh;object-fit:contain;background:#f4f4f4;border-radius:.5rem}h1{font-size:clamp(1.75rem,4vw,2.6rem);line-height:1.15;margin:.25rem 0 1rem}p{line-height:1.7;color:#555}.price{font-size:1.25rem;font-weight:700;margin:1.5rem 0}.cta{display:inline-block;padding:.8rem 1.1rem;border-radius:.5rem;background:#181818;color:white;text-decoration:none}.gallery{display:grid;grid-template-columns:repeat(auto-fit,minmax(7rem,1fr));gap:.75rem;margin-top:1rem}.gallery img{height:8rem;object-fit:cover}@media(max-width:680px){.card{grid-template-columns:1fr}}</style></head><body><main class="wrap">${body}</main></body></html>`;
}

export function renderPublicProduct(item: PublicSeoItem, locale: PublicLocale) {
  const path = publicProductPath(locale, item.id);
  const { name, description } = localizedProduct(item, locale);
  const images = mediaUrls(item, true);
  const image = images[0] || '';
  const price = Number(item.price);
  const hasPrice = Number.isFinite(price) && price >= 0;
  const stock = Number(item.stock ?? item.stockCount);
  const inStock = item.status === 'Διαθέσιμο' && (item.stock == null && item.stockCount == null || Number.isFinite(stock) && stock > 0);
  const schema = { '@context': 'https://schema.org', '@type': 'Product', '@id': SITE_URL + path + '#product', name, description, image: images, sku: item.id, url: SITE_URL + path, offers: hasPrice ? { '@type': 'Offer', url: SITE_URL + path, priceCurrency: 'EUR', price: price.toFixed(2), availability: inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock', seller: { '@type': 'OnlineStore', name: 'Aram Creations', url: SITE_URL } } : undefined };
  const shopPath = locale === 'en' ? '/en/' : '/';
  const body = `<a class="back" href="${shopPath}">${locale === 'en' ? '← Back to Shop' : '← Επιστροφή στο Shop'}</a><article class="card">${image ? `<img src="${escapeHtml(image)}" alt="${escapeHtml(name)}">` : '<div aria-hidden="true"></div>'}<div><h1>${escapeHtml(name)}</h1>${description ? `<p>${escapeHtml(description)}</p>` : ''}${hasPrice ? `<p class="price">€${price.toFixed(2)}</p>` : ''}<a class="cta" href="${shopPath}">${locale === 'en' ? 'Browse Shop' : 'Περιήγηση στο Shop'}</a></div></article>${images.length > 1 ? `<div class="gallery">${images.slice(1).map(url => `<img src="${escapeHtml(url)}" alt="${escapeHtml(name)}">`).join('')}</div>` : ''}`;
  return htmlPage({ locale, path, title: `${name} | Aram Creations`, description: description || name, image, schema, body });
}

export function renderPublicArtwork(item: PublicSeoItem, locale: PublicLocale) {
  const path = publicArtworkPath(locale, item.id);
  const { title, description } = localizedArtwork(item, locale);
  const images = mediaUrls(item, true);
  const media = (Array.isArray(item.mediaList) ? item.mediaList : []).filter((entry: any) => entry?.showInShop !== false && safeHttpUrl(entry?.url) && entry.type !== 'video' && !/\.(mp4|webm|ogg|mov)(\?|#|$)/i.test(entry.url));
  const image = images[0] || '';
  const schema = { '@context': 'https://schema.org', '@type': 'CreativeWork', '@id': SITE_URL + path + '#work', name: title, description, image: images, url: SITE_URL + path, creator: { '@type': 'Organization', name: 'Aram Creations', url: SITE_URL } };
  const portfolioPath = locale === 'en' ? '/en/portfolio/' : '/portfolio/';
  const body = `<a class="back" href="${portfolioPath}">${locale === 'en' ? '← Back to Portfolio' : '← Επιστροφή στο Portfolio'}</a><article class="card">${image ? `<img src="${escapeHtml(image)}" alt="${escapeHtml(title)}">` : '<div aria-hidden="true"></div>'}<div><h1>${escapeHtml(title)}</h1>${description ? `<p>${escapeHtml(description)}</p>` : ''}${item.medium ? `<p>${escapeHtml(item.medium)}${item.year ? ` · ${escapeHtml(item.year)}` : ''}</p>` : item.year ? `<p>${escapeHtml(item.year)}</p>` : ''}</div></article>${media.length > 1 ? `<div class="gallery">${media.slice(1).map((entry: any) => `<img src="${escapeHtml(safeHttpUrl(entry.url))}" alt="${escapeHtml(entry.title || title)}">`).join('')}</div>` : ''}`;
  return htmlPage({ locale, path, title: `${title} | Portfolio | Aram Creations`, description: description || title, image, schema, body });
}

export function buildBaseSitemapPages() {
  return [
    { path: '/', alt: '/en/' }, { path: '/en/', alt: '/' },
    { path: '/portfolio/', alt: '/en/portfolio/' }, { path: '/en/portfolio/', alt: '/portfolio/' },
  ];
}
