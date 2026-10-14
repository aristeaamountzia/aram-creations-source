import test from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';
import { createServer } from 'vite';
import { emulatorServices, assertEmulatorIsolation } from '../../server/test-isolation';
import { EMULATOR_PROJECT } from '../../src/lib/emulator-target';

test('actual browser uses local Auth/Firestore/Storage; characterizes hidden product/media display without production access', async () => {
  assertEmulatorIsolation();
  const services = emulatorServices('stage1-browser-fixtures');
  await services.db.doc('jewelry/browser-hidden').set({ name: 'BROWSER_HIDDEN_FIXTURE', createdAt: new Date(), category: 'Κολιέ', price: 10, stock: 1, status: 'Διαθέσιμο', showInShop: false, imageUrl: '/synthetic-private.png', images: ['/synthetic-private.png'], mediaList: [{ url: '/synthetic-private.png', type: 'image', showInShop: false }] });
  const server = await createServer({ configFile: 'vite.config.ts', server: { host: '127.0.0.1', port: 3000, strictPort: true }, optimizeDeps: { include: ['firebase/auth', 'firebase/firestore', 'firebase/storage'] } });
  await server.listen();
  const browser = await chromium.launch({ executablePath: process.env.ARAM_CHROMIUM_EXECUTABLE, args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-background-networking', '--host-resolver-rules=MAP * 127.0.0.1, EXCLUDE localhost'] }).catch(async error => { await server.close(); throw error; });
  const context = await browser.newContext({ serviceWorkers: 'block' });
  const denied: string[] = [], firebaseHosts = new Set<string>();
  await context.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (!['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) { denied.push(url.hostname); return route.abort(); }
    if ([8080, 9099, 9199].includes(Number(url.port))) firebaseHosts.add(`${url.hostname}:${url.port}`);
    if (url.pathname.startsWith('/synthetic-')) return route.fulfill({ contentType: 'image/png', body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/lXcAAAAASUVORK5CYII=', 'base64') });
    return route.continue();
  });
  const page = await context.newPage();
  try {
    await page.goto('http://127.0.0.1:3000');
    await page.getByText('BROWSER_HIDDEN_FIXTURE', { exact: true }).first().waitFor({ timeout: 30000 });
    // Current UI bug is intentionally characterized, not repaired in this stage.
    assert.ok(await page.locator('img[src="/synthetic-private.png"]').count() > 0);
    const token = await services.auth.createCustomToken('browser-admin', { admin: true });
    const project = await page.evaluate(async ({ token }) => {
      const load = new Function('url', 'return import(url)') as (url: string) => Promise<any>;
      const driver = await load('/tests/stage1/browser-driver.ts');
      return driver.exerciseBrowserServices(token);
    }, { token });
    assert.equal(project, EMULATOR_PROJECT);
    const [bytes] = await services.bucket.file('jewelry/browser-upload.png').download(); assert.deepEqual(bytes, Buffer.from([1, 2, 3]));
    assert.ok(firebaseHosts.has('127.0.0.1:8080')); assert.ok(firebaseHosts.has('127.0.0.1:9099')); assert.ok(firebaseHosts.has('127.0.0.1:9199'));
    const productionService = /^(?:(?:firestore|identitytoolkit|securetoken|firebasestorage|storage)\.googleapis\.com|.*\.firebaseapp\.com)$/;
    assert.ok(!denied.some(host => productionService.test(host)), 'browser attempted production Firebase access');
    console.log('Browser blocked nonlocal hosts:', [...new Set(denied)].sort().join(', '));
    await page.setViewportSize({ width: 390, height: 844 });
    assert.ok(await page.getByText('BROWSER_HIDDEN_FIXTURE', { exact: true }).first().isVisible());
    await page.evaluate(() => { window.location.hash = '#admin'; });
    await page.locator('.backoffice-view').getByText('BROWSER_HIDDEN_FIXTURE', { exact: true }).first().waitFor({ timeout: 30000 });
    assert.ok(await page.locator('.backoffice-view').getByText('BROWSER_HIDDEN_FIXTURE', { exact: true }).first().isVisible());
  } finally { await context.close(); await browser.close(); await server.close(); }
});
