import { catalogColorSwatch, catalogLabelKey, colorKey, materialKey, uniqueCatalogLabels } from '../src/lib/catalog-labels';
import { localizedDescription } from '../src/lib/public-copy';
import { publicJewelryRecord } from '../src/lib/public-catalog';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import config from '../vite.config';
import { initialContent, searchPage, searchPages } from '../src/lib/search-content';
import { languageSwitchPath, modeFromLocation, portfolioItemId, portfolioItemPath, storefrontLink } from '../src/lib/public-locale';
import { buildPublicSitemap, mergePublicPortfolio, publicContentRoute, renderPublicArtwork, renderPublicProduct } from '../src/lib/public-seo';

test('search landing pages include readable content and distinct portfolio metadata', async () => {
  const resolved = typeof config === 'function' ? await config({ command: 'build', mode: 'production' }) : config;
  const plugin: any = resolved.plugins?.flat().find((entry: any) => entry?.name === 'search-landing-pages');
  assert.ok(plugin);
  const html = plugin.transformIndexHtml(readFileSync(new URL('../index.html', import.meta.url), 'utf8'));
  assert.ok(html.includes(initialContent()));
  assert.ok(html.includes('href="/portfolio/"'));
  assert.ok(!html.includes('aggregateRating'));
  const devPortfolio = plugin.transformIndexHtml(readFileSync(new URL('../index.html', import.meta.url), 'utf8'), {
    path: '/index.html', originalUrl: '/en/portfolio/?ref=preview',
  });
  assert.match(devPortfolio, /<html lang="en"[\s>]/);
  assert.ok(devPortfolio.includes(initialContent(true, 'en')));
  const emitted: any[] = [];
  plugin.generateBundle.call({ emitFile: (asset: any) => emitted.push(asset) }, {}, {
    'index.html': { type: 'asset', source: html },
  });
  assert.deepEqual(emitted.map(asset => asset.fileName).sort(), ['en/index.html', 'en/portfolio/index.html', 'portfolio/index.html']);
  const portfolio = emitted.find(asset => asset.fileName === 'portfolio/index.html').source;
  const englishShop = emitted.find(asset => asset.fileName === 'en/index.html').source;
  const englishPortfolio = emitted.find(asset => asset.fileName === 'en/portfolio/index.html').source;
  assert.ok(englishShop.includes(initialContent(false, 'en')));
  assert.ok(englishPortfolio.includes(initialContent(true, 'en')));
  for (const [markup, section] of [[englishShop, 'shop'], [englishPortfolio, 'portfolio']] as const) {
    const page = searchPage(section, 'en');
    assert.match(markup, /<html lang="en"[\s>]/);
    assert.ok(markup.includes(`<title>${page.title}</title>`));
    assert.ok(markup.includes(`rel="canonical" href="https://aramcreationsofficial.netlify.app${page.path}"`));
    assert.ok(markup.includes(`hreflang="en" href="https://aramcreationsofficial.netlify.app${page.path}"`));
    assert.ok(markup.includes(`hreflang="el" href="https://aramcreationsofficial.netlify.app${searchPage(section, 'el').path}"`));
  }
  assert.ok(portfolio.includes(initialContent(true)));
  assert.ok(!portfolio.includes(initialContent()));
  assert.ok(portfolio.includes(`<title>${searchPages.portfolio.title}</title>`));
  assert.ok(portfolio.includes('rel="canonical" href="https://aramcreationsofficial.netlify.app/portfolio/"'));
  for (const tag of ['name="description"', 'property="og:description"', 'name="twitter:description"']) {
    assert.ok(portfolio.includes(`<meta ${tag} content="${searchPages.portfolio.description}"`));
  }
  assert.ok(html.includes(`<title>${searchPages.shop.title}</title>`));
  for (const page of [html, portfolio, englishShop, englishPortfolio]) {
    assert.doesNotMatch(page, /βόλος|βόλου|volos|artisan|εικαστικ/i);
    assert.doesNotMatch(page, /copper[ -]+wire|χάλκινο σύρμα|σύρμα χαλκού/i);
    assert.equal((page.match(/<h1\b/g) || []).length, 1);
    assert.doesNotMatch(page, /clip:rect/);
  }
  for (const [markup, page] of [[html, searchPages.shop], [portfolio, searchPages.portfolio]] as const) {
    const structured = JSON.parse(markup.match(/id="aram-schema-jsonld" type="application\/ld\+json">([^<]+)<\/script>/)![1]);
    assert.equal(structured['@graph'].find(node => node['@type'] === 'CollectionPage').url, 'https://aramcreationsofficial.netlify.app' + page.path);
    assert.match(markup, new RegExp(`property="og:image" content="[^"]+${page.image}"`));
  }
});

test('old and new Portfolio links resolve the same artwork in both languages', () => {
  const item = 'Έργο #1';
  const link = new URL(portfolioItemPath('en', item), 'https://example.com');
  assert.equal(link.pathname, '/en/portfolio/');
  assert.equal(portfolioItemId(link.hash), item);
  assert.equal(modeFromLocation('/', link.hash), 'portfolio');
  assert.equal(modeFromLocation('/en/', link.hash), 'portfolio');
  assert.equal(modeFromLocation('/en/portfolio/', '#shop'), 'shop');
  assert.equal(modeFromLocation('/en/', '#portfolio-other'), 'shop');
  assert.equal(portfolioItemId('#portfolio/%E0%A4%A'), null);
  assert.equal(portfolioItemId('#portfolio/'), null);
  assert.equal(languageSwitchPath('el', 'portfolio', '', link.hash), portfolioItemPath('el', item));
});

test('sitemap lists supported locale pages without fabricated modification dates', () => {
  const sitemap = readFileSync(new URL('../public/sitemap.xml', import.meta.url), 'utf8');
  const urls = [...sitemap.matchAll(/<url>([\s\S]*?)<\/url>/g)].map(([, url]) => url);
  const expectedPaths = ['/', '/en/', '/portfolio/', '/en/portfolio/'];

  assert.equal(urls.length, expectedPaths.length);
  assert.deepEqual(urls.map(url => url.match(/<loc>https:\/\/aramcreationsofficial\.netlify\.app([^<]*)<\/loc>/)?.[1]), expectedPaths);
  assert.doesNotMatch(sitemap, /<lastmod>/, 'lastmod should be emitted only when it can reflect actual content changes');
  for (const url of urls) {
    assert.match(url, /hreflang="el"/);
    assert.match(url, /hreflang="en"/);
    assert.match(url, /hreflang="x-default"/);
  }
});

test('generated sitemap includes public detail URLs, locale alternates and safe image entries', () => {
  const sitemap = buildPublicSitemap({
    products: [
      { id: 'necklace-1', name: 'Necklace', imageUrl: 'https://cdn.example.test/necklace.jpg' },
      { id: 'deleted-product', name: 'Old', deletedAt: '2026-01-01' },
    ],
    artworks: [
      { id: 'work-1', title: 'Work', mediaList: [{ url: 'https://cdn.example.test/work.jpg', type: 'image' }] },
      { id: 'archived-work', title: 'Old work', isDeleted: true },
    ],
  });
  assert.equal((sitemap.match(/<url>/g) || []).length, 8);
  assert.match(sitemap, /<loc>https:\/\/aramcreationsofficial\.netlify\.app\/product\/necklace-1<\/loc>/);
  assert.match(sitemap, /hreflang="en" href="https:\/\/aramcreationsofficial\.netlify\.app\/en\/portfolio\/work-1"/);
  assert.match(sitemap, /<image:loc>https:\/\/cdn\.example\.test\/work\.jpg<\/image:loc>/);
  assert.doesNotMatch(sitemap, /deleted-product|archived-work/);
  assert.doesNotMatch(sitemap, /<lastmod>/);
});

test('Netlify SEO paths resolve to the sitemap or the correct localized public item', () => {
  assert.deepEqual(publicContentRoute('/sitemap.xml'), { resource: 'sitemap', id: '', locale: 'el' });
  assert.deepEqual(publicContentRoute('/product/necklace%201'), { resource: 'product', id: 'necklace 1', locale: 'el' });
  assert.deepEqual(publicContentRoute('/product/necklace%201', 'other-id'), { resource: 'product', id: 'necklace 1', locale: 'el' });
  assert.deepEqual(publicContentRoute('/en/portfolio/work-1'), { resource: 'artwork', id: 'work-1', locale: 'en' });
  assert.equal(publicContentRoute('/en/portfolio/%E0%A4%A'), null);
  assert.equal(publicContentRoute('/en/portfolio/'), null);
});

test('SEO detail pages preserve seed content, honor portfolio tombstones, and escape public text', () => {
  const artwork = mergePublicPortfolio([{ id: 'work', title: 'Seed' }, { id: 'removed', title: 'Removed' }], [
    { id: 'work', titleEn: 'English title' }, { id: 'removed', isDeleted: true },
  ]);
  assert.deepEqual(artwork, [{ id: 'work', title: 'Seed', titleEn: 'English title' }]);
  const productPage = renderPublicProduct({ id: 'p1', name: '<Necklace>', description: 'A & B', price: 18 }, 'en');
  assert.match(productPage, /<html lang="en">/);
  assert.match(productPage, /&lt;Necklace&gt;/);
  assert.match(productPage, /"@type":"Product"/);
  const artworkPage = renderPublicArtwork({ id: 'work', title: 'Blue', titleEn: 'Blue work' }, 'en');
  assert.match(artworkPage, /"@type":"CreativeWork"/);
  assert.match(artworkPage, /canonical" href="https:\/\/aramcreationsofficial\.netlify\.app\/en\/portfolio\/work"/);
});

test('Netlify uses a branded not-found page instead of the homepage rewrite for unknown paths', () => {
  const netlifyConfig = readFileSync(new URL('../netlify.toml', import.meta.url), 'utf8');
  const notFound = readFileSync(new URL('../public/404.html', import.meta.url), 'utf8');

  assert.doesNotMatch(netlifyConfig, /from\s*=\s*"\/\*"\s*\n\s*to\s*=\s*"\/index\.html"\s*\n\s*status\s*=\s*200/);
  assert.match(notFound, /<title>[^<]*404[^<]*<\/title>/);
  assert.match(notFound, /href="\/"/);
  assert.match(notFound, /href="\/en\/"/);
});

test('checkout and configured links keep their targets when the language changes', () => {
  const origin = 'https://aramcreationsofficial.netlify.app';
  assert.equal(languageSwitchPath('en', 'shop', '?session_id=cs_test_123&order_id=order-1', '#order-success'),
    '/en/?session_id=cs_test_123&order_id=order-1#order-success');
  assert.equal(languageSwitchPath('el', 'shop', '?order_cancelled=order-1&cancel_token=token', '#cart'),
    '/?order_cancelled=order-1&cancel_token=token#cart');
  assert.equal(storefrontLink('portfolio/#portfolio/work', 'en', origin), '/en/portfolio/#portfolio/work');
  assert.equal(storefrontLink(origin + '/en/', 'el', origin), '/');
  assert.equal(storefrontLink('/api/artist-profile?cv=1', 'en', origin), '/api/artist-profile?cv=1');
  assert.equal(storefrontLink('#customer-reviews', 'en', origin), '#customer-reviews');
  assert.equal(storefrontLink('https://www.vinted.gr/items/123', 'en', origin), 'https://www.vinted.gr/items/123');
});


test('public descriptions agree across the Shop and the indexed product page', () => {
  const saved = {
    id: 'test-item',
    name: 'Δοκιμή',
    notes: 'Δημόσια περιγραφή\nΠροσοχή: Δεν αντιγράφηκαν όλες οι Vinted εικόνες στο Firebase Storage.',
  };
  const projected = { id: saved.id, ...publicJewelryRecord(saved) };
  assert.equal(localizedDescription(projected, 'el'), 'Δημόσια περιγραφή');
  assert.match(renderPublicProduct(projected, 'el'), /Δημόσια περιγραφή/);
  assert.doesNotMatch(renderPublicProduct(projected, 'el'), /Firebase Storage/);
  assert.equal(localizedDescription({ ...saved, description: '' }, 'el'), '');
});

test('catalogue aliases share swatches and explicitly public listing links remain distinguishable', () => {
  assert.deepEqual(uniqueCatalogLabels(['Μωβ', 'μοβ'], colorKey), ['Μωβ']);
  assert.equal(catalogColorSwatch('μέντα', { 'Μέντα': '#accafe' }), '#accafe');
  assert.equal(catalogColorSwatch('Μοβ'), catalogColorSwatch('Μωβ'));
  assert.deepEqual(uniqueCatalogLabels(['Υγρό Γυαλί', 'Υγρό Γυαλί (Resin)', 'Εποξική Ρητίνη'], materialKey), ['Υγρό Γυαλί', 'Εποξική Ρητίνη']);
  assert.equal(catalogLabelKey('Σκουλαρίκια'), catalogLabelKey('σκουλαρικια'));
  const record = publicJewelryRecord({ postedPlatforms: [
    { site: 'Public', url: 'https://example.com/public', showInShop: true },
    { site: 'Private', url: 'https://example.com/private' },
  ] });
  assert.deepEqual(record.postedPlatforms, [{ site: 'Public', url: 'https://example.com/public', showInShop: true }]);
});
