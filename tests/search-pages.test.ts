import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import config from '../vite.config';
import { initialContent, searchPage, searchPages } from '../src/lib/search-content';
import { languageSwitchPath, modeFromLocation, portfolioItemId, portfolioItemPath, storefrontLink } from '../src/lib/public-locale';

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
