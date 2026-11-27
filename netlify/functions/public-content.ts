import { adminDatabase } from '../../server/admin-database';
import { ART_ITEMS } from '../../src/data';
import {
  buildPublicSitemap,
  mergePublicPortfolio,
  publicContentRoute,
  renderPublicArtwork,
  renderPublicProduct,
  type PublicSeoItem,
} from '../../src/lib/public-seo';
import type { PublicLocale } from '../../src/lib/public-locale';

const headers = {
  'Cache-Control': 'public, max-age=300, s-maxage=900, stale-while-revalidate=3600',
  'X-Content-Type-Options': 'nosniff',
};

// Bind public SEO URLs directly to this function. Rewrites can lose to the
// site's existing SPA fallback, so sitemap and item routes must be explicit.
export const config = {
  path: ['/sitemap.xml', '/product/:id', '/en/product/:id', '/portfolio/:id', '/en/portfolio/:id'],
};

function html(body: string, status = 200) {
  return new Response(body, { status, headers: { ...headers, 'Content-Type': 'text/html; charset=utf-8' } });
}

function xml(body: string) {
  return new Response(body, { headers: { ...headers, 'Content-Type': 'application/xml; charset=utf-8' } });
}

async function readSitemapContent() {
  const { db } = adminDatabase();
  const [productSnapshot, artworkSnapshot] = await Promise.all([db.collection('shopCatalog').get(), db.collection('portfolio').get()]);
  const products = productSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as PublicSeoItem[];
  const remoteArtworks = artworkSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as PublicSeoItem[];
  const artworks = mergePublicPortfolio(ART_ITEMS as PublicSeoItem[], remoteArtworks);
  return { products, artworks };
}

async function readPublicItem(resource: string, id: string) {
  const { db } = adminDatabase();
  const collection = resource === 'product' ? 'shopCatalog' : 'portfolio';
  const snapshot = await db.collection(collection).doc(id).get();
  const remote = snapshot.exists ? [{ ...snapshot.data(), id: snapshot.id } as PublicSeoItem] : [];
  if (resource === 'product') return remote[0] || null;
  const seed = (ART_ITEMS as PublicSeoItem[]).filter(item => item.id === id);
  return mergePublicPortfolio(seed, remote)[0] || null;
}

export default async function handler(request: Request, context?: { params?: Record<string, string> }) {
  if (request.method !== 'GET' && request.method !== 'HEAD') return html('Method not allowed', 405);
  try {
    const url = new URL(request.url);
    const params = url.searchParams;
    const route = publicContentRoute(url.pathname, context?.params?.id || '');
    const resource = params.get('resource') || route?.resource;
    if (resource === 'sitemap') {
      const { products, artworks } = await readSitemapContent();
      return xml(buildPublicSitemap({ products, artworks }));
    }

    const id = params.get('id') || route?.id || '';
    if (!id || id.includes('/')) return html('Not found', 404);
    const locale: PublicLocale = params.get('locale') === 'en' || !params.has('locale') && route?.locale === 'en' ? 'en' : 'el';
    if (resource === 'product') {
      const item = await readPublicItem(resource, id);
      if (!item || item.isDeleted || item.deletedAt) return html('Not found', 404);
      return item ? html(renderPublicProduct(item, locale)) : html('Not found', 404);
    }
    if (resource === 'artwork') {
      const item = await readPublicItem(resource, id);
      if (!item || item.isDeleted || item.deletedAt) return html('Not found', 404);
      return item ? html(renderPublicArtwork(item, locale)) : html('Not found', 404);
    }
    return html('Not found', 404);
  } catch {
    // Never return an incomplete sitemap: a data read failure is an explicit 503.
    return new Response('Public content is temporarily unavailable.', {
      status: 503,
      headers: { ...headers, 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' },
    });
  }
}
