import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import config from '../vite.config';
import { initialContent, searchPages } from '../src/lib/search-content';

test('search landing pages include readable content and distinct portfolio metadata', async () => {
  const resolved = typeof config === 'function' ? await config({ command: 'build', mode: 'production' }) : config;
  const plugin: any = resolved.plugins?.flat().find((entry: any) => entry?.name === 'search-landing-pages');
  assert.ok(plugin);
  const html = plugin.transformIndexHtml(readFileSync(new URL('../index.html', import.meta.url), 'utf8'));
  assert.ok(html.includes(initialContent()));
  assert.ok(html.includes('href="/portfolio/"'));
  assert.ok(!html.includes('aggregateRating'));
  const emitted: any[] = [];
  plugin.generateBundle.call({ emitFile: (asset: any) => emitted.push(asset) }, {}, {
    'index.html': { type: 'asset', source: html },
  });
  assert.equal(emitted.length, 1);
  assert.equal(emitted[0].fileName, 'portfolio/index.html');
  const portfolio = emitted[0].source;
  assert.ok(portfolio.includes(initialContent(true)));
  assert.ok(!portfolio.includes(initialContent()));
  assert.ok(portfolio.includes(`<title>${searchPages.portfolio.title}</title>`));
  assert.ok(portfolio.includes('rel="canonical" href="https://aramcreationsofficial.netlify.app/portfolio/"'));
  assert.equal(portfolio.split(searchPages.portfolio.description).length - 1, 3);
});
