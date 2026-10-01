import { test } from 'node:test';
import assert from 'node:assert/strict';
import { app } from '../api-server';

test('refresh endpoint uses listing metadata and distinguishes unknown availability and missing metrics', async () => {
  const original = globalThis.fetch;
  let fixture = '';
  const listing = 'https://www.vinted.gr/items/12345-test';
  globalThis.fetch = (async (input: any, init: any) => {
    if (String(input).startsWith('https://www.vinted.gr')) {
      const response = new Response(fixture, { status: 200 });
      Object.defineProperty(response, 'url', { value: listing }); return response;
    }
    return original(input, init);
  }) as typeof fetch;
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  const address = server.address() as any;
  async function inspect() { return (await original(`http://127.0.0.1:${address.port}/api/vinted-link?refresh=1&url=${encodeURIComponent(listing)}`)).json(); }
  try {
    fixture = `<script type="application/ld+json">${JSON.stringify({ '@type': 'Product', url: listing, name: 'Listing', offers: { price: '20.00', priceCurrency: 'EUR', availability: 'https://schema.org/InStock' } })}</script>`;
    let data = await inspect();
    assert.equal(data.ok, true); assert.equal(data.item.price, 20); assert.equal(data.item.priceKnown, true);
    assert.equal(data.item.availability, 'available'); assert.equal(data.item.availabilityKnown, true); assert.equal(data.item.vintedFavorites, null);
    fixture = '<meta property="og:title" content="Listing"><span>Recommended: 10.00 €</span>';
    data = await inspect();
    assert.equal(data.item.priceKnown, false); assert.equal(data.item.availabilityKnown, false);
    fixture = `<script id="__NEXT_DATA__" type="application/json">${JSON.stringify({ props: { pageProps: { item: { id: 12345, title: 'Listing', price: { amount: '12', currency_code: 'EUR' }, is_sold: true, is_reserved: false } } } })}</script>`;
    data = await inspect();
    assert.equal(data.item.isSold, true); assert.equal(data.item.availabilityKnown, true); assert.equal(data.item.priceKnown, true);
    console.log('Verified listing-specific prices, unknown data and explicit sale metadata.');
  } finally { globalThis.fetch = original; await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())); }
});

