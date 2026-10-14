import uploadHandler from '../../netlify/functions/private-upload';
import publicMediaHandler from '../../netlify/functions/public-media';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { chromium } from '@playwright/test';
import { createServer } from 'vite';
import { emulatorServices } from '../../server/test-isolation';
import { commitCatalog } from '../../server/catalog-publication';
import { wire } from '../../src/lib/catalog-wire';
import writeHandler from '../../netlify/functions/catalog-write';
import metricsHandler from '../../netlify/functions/catalog-metrics';
import mediaHandler from '../../netlify/functions/media';

test('Node 22 Chromium: anonymous privacy, admin preview/CSV/notes review and public synchronization without production requests', async () => {
  const services = emulatorServices('stage2-browser-fixtures');
  await services.bucket.file('jewelry/browser-private.png').save(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/lXcAAAAASUVORK5CYII=', 'base64'), { resumable: false, contentType: 'image/png' });
  const source = { name: 'BROWSER_VISIBLE_FIXTURE', price: 20, stock: 3, status: 'Διαθέσιμο', category: 'Κολιέ', description: 'ORIGINAL_PUBLIC_DESCRIPTION', notes: '  ORIGINAL_MIXED_NOTES\n', cost: 98765, storage: 'PRIVATE_LOCATION', createdAt: new Date(), imageUrl: `gs://${services.bucket.name}/jewelry/browser-private.png`, mediaList: [{ url: `gs://${services.bucket.name}/jewelry/browser-private.png`, type: 'image', showInShop: false }] };
  await commitCatalog({ requestId: randomUUID(), operations: [{ method: 'set', path: 'jewelry/browser-visible', data: wire(source) }, { method: 'set', path: 'jewelry/browser-hidden', data: wire({ ...source, name: 'BROWSER_HIDDEN_FIXTURE', showInShop: false }) }], reads: [] }, { uid: 'fixture' }, services);
  const server = await createServer({ configFile: 'vite.config.ts', server: { host: '127.0.0.1', port: 3000, strictPort: true }, plugins: [{ name: 'stage2-local-functions', configureServer(server) {
    server.middlewares.use(async (req, res, next) => {
      const handlers: Record<string, any> = { '/api/catalog-write': writeHandler, '/api/catalog-metrics': metricsHandler, '/api/media': mediaHandler, '/api/private-upload': uploadHandler };
      if (req.url?.startsWith('/api/public-media?')) { const response = await publicMediaHandler(new Request('http://127.0.0.1'+req.url, { headers: req.headers as Record<string, string> })); res.statusCode=response.status; response.headers.forEach((v,k)=>res.setHeader(k,v)); return res.end(Buffer.from(await response.arrayBuffer())); }
      const pathname = req.url!.split('?')[0];
      if (!handlers[pathname]) return next();
      const chunks = []; for await (const chunk of req) chunks.push(chunk);
      const response = await handlers[pathname](new Request(`http://127.0.0.1${req.url}`, { method: req.method, headers: req.headers as Record<string, string>, body: new Uint8Array(Buffer.concat(chunks)) }), { ip: 'browser-fixture' });
      res.statusCode = response.status; response.headers.forEach((v, k) => res.setHeader(k, v)); res.end(Buffer.from(await response.arrayBuffer()));
    });
  } }] });
  await server.listen();
  const browser = await chromium.launch({ executablePath: process.env.ARAM_CHROMIUM_EXECUTABLE, args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-background-networking', '--host-resolver-rules=MAP * 127.0.0.1, EXCLUDE localhost'] }).catch(async error => { await server.close(); throw error; });
  const context = await browser.newContext({ serviceWorkers: 'block' }); const denied: string[] = [], hosts = new Set<string>();
  await context.route('**/*', route => { const url = new URL(route.request().url()); if (!['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname)) { denied.push(url.hostname); return route.abort(); } if ([8080, 9099, 9199].includes(Number(url.port))) hosts.add(`${url.hostname}:${url.port}`); return route.continue(); });
  const page = await context.newPage();
  await context.addInitScript(() => localStorage.setItem('aram_boutique_cart', JSON.stringify([{ item: { id: 'browser-visible', notes: 'OLD_CART_PRIVATE', cost: 1, imageUrl: 'OLD_PRIVATE_URL' }, quantity: 1 }])));
  try {
    await page.goto('http://127.0.0.1:3000');
    await page.getByText('BROWSER_VISIBLE_FIXTURE', { exact: true }).first().waitFor({ timeout: 30000 });
    assert.equal(await page.getByText('BROWSER_HIDDEN_FIXTURE', { exact: true }).count(), 0);
    const anonymous = await page.evaluate(async () => { const load = new Function('url', 'return import(url)'); return (await load('/tests/stage2/browser-driver.ts')).inspectAnonymous(); });
    assert.equal(anonymous.denied, true); assert.equal(anonymous.publicData.notes, undefined); assert.equal(anonymous.publicData.cost, undefined);
    assert.ok(!(await page.evaluate(() => localStorage.getItem('aram_boutique_cart')!)).includes('OLD_CART_PRIVATE'));
    const token = await services.auth.createCustomToken('browser-admin', { admin: true });
    await page.evaluate(async token => { const load = new Function('url', 'return import(url)'); await (await load('/tests/stage2/browser-driver.ts')).login(token); }, token);
    await page.evaluate(() => { window.location.hash = '#admin'; });
    await page.locator('.backoffice-view').getByText('BROWSER_HIDDEN_FIXTURE', { exact: true }).first().waitFor({ timeout: 30000 });
    const downloadPromise = page.waitForEvent('download'); await page.getByRole('button', { name: 'CSV', exact: false }).click(); const download = await downloadPromise;
    await download.saveAs('/tmp/aram-stage2-browser.csv'); const csv = readFileSync('/tmp/aram-stage2-browser.csv', 'utf8'); assert.ok(csv.includes('BROWSER_HIDDEN_FIXTURE')); assert.ok(csv.includes('ORIGINAL_MIXED_NOTES'));
    const row = page.locator('.backoffice-view').getByText('BROWSER_VISIBLE_FIXTURE', { exact: true }).first().locator('xpath=ancestor::*[@draggable="true"][1]');
    await row.getByTitle('Προβολή', { exact: true }).click();
    await page.getByLabel('Δημόσια εκδοχή μετά τον έλεγχο', { exact: false }).fill('BROWSER_APPROVED_DESCRIPTION');
    await page.getByRole('button', { name: 'Έγκριση δημόσιας εκδοχής', exact: true }).click();
    await page.getByText('Η δημόσια εκδοχή εγκρίθηκε. Τα αρχικά notes/description διατηρήθηκαν.', { exact: true }).waitFor({ timeout: 30000 });
    const after = (await services.db.doc('jewelry/browser-visible').get()).data()!; assert.equal(after.notes, source.notes); assert.equal(after.description, source.description);
    await page.evaluate(() => { window.location.hash = '#shop'; });
    await page.getByText('BROWSER_VISIBLE_FIXTURE', { exact: true }).first().waitFor();
    await page.getByText('BROWSER_VISIBLE_FIXTURE', { exact: true }).first().click();
    await page.getByText('BROWSER_APPROVED_DESCRIPTION', { exact: true }).first().waitFor();
    assert.equal(await page.getByText('PRIVATE_LOCATION', { exact: true }).count(), 0);
    assert.ok(!denied.some(h => /^(firestore|identitytoolkit|securetoken|firebasestorage|storage)\.googleapis\.com$/.test(h)));
    assert.ok(hosts.has('127.0.0.1:8080') && hosts.has('127.0.0.1:9099'));
    const [uploaded] = await services.bucket.file('jewelry/browser-upload.png').getMetadata();
    assert.ok(!uploaded.metadata?.firebaseStorageDownloadTokens);
    assert.deepEqual((await services.bucket.file('jewelry/browser-upload.png').download())[0], Buffer.from([1, 2, 3]));
  } finally { await context.close(); await browser.close(); await server.close(); }
});
