import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const OUTPUT_DIR = path.resolve(ROOT_DIR, 'audit-results');
const SCREENSHOTS_DIR = path.resolve(OUTPUT_DIR, 'screenshots', 'deep');
const AUTH_STATE_FILE = path.resolve(ROOT_DIR, '.auth', 'admin-state.json');

if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runDeepAudit() {
  console.log('================================================================');
  console.log('🔬 ΕΝΑΡΞΗ ΒΑΘΙΑΣ ΑΥΤΟΝΟΜΗΣ ΕΠΙΘΕΩΡΗΣΗΣ BACK-OFFICE & FRONTEND');
  console.log('================================================================\n');

  const auditReport = {
    startedAt: new Date().toISOString(),
    completedAt: null,
    sections: {},
    consoleErrors: [],
    networkErrors: [],
    screenshots: []
  };

  const browser = await chromium.launch({
    channel: 'chrome',
    headless: true // Fast and autonomous
  });

  const context = await browser.newContext({
    storageState: fs.existsSync(AUTH_STATE_FILE) ? AUTH_STATE_FILE : undefined,
    viewport: { width: 1440, height: 900 }
  });

  const page = await context.newPage();

  page.on('console', msg => {
    if (msg.type() === 'error') {
      auditReport.consoleErrors.push({ text: msg.text(), location: msg.location() });
    }
  });

  page.on('requestfailed', req => {
    auditReport.networkErrors.push({ url: req.url(), error: req.failure()?.errorText });
  });

  async function takeSnap(name, caption, fullPage = false) {
    const file = path.join(SCREENSHOTS_DIR, `${name}.png`);
    await page.screenshot({ path: file, fullPage });
    auditReport.screenshots.push({ name, caption, file });
    console.log(`  📸 [${name}] ${caption}`);
    return file;
  }

  // --- SECTION 1: BACK OFFICE - CATALOG & STATS ---
  console.log('\n--- 1. BACK OFFICE: CATALOG & METRICS ---');
  await page.goto('https://aramcreationsofficial.netlify.app/#admin', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await sleep(3500); // Allow Firestore sync

  await takeSnap('01-catalog-initial', 'Αρχική οθόνη καταλόγου Back Office', true);

  // Status Filter clicks
  console.log('  Testing Status Filters...');
  const statusFilters = ['Διαθέσιμα', 'Μη Διαθέσιμα', 'Πωληθέντα', 'Συνολικά'];
  for (const sf of statusFilters) {
    const btn = await page.$(`button:has-text("${sf}")`);
    if (btn) {
      await btn.click();
      await sleep(800);
    }
  }
  await takeSnap('02-status-filtered', 'Φιλτράρισμα κατάστασης αποθέματος');

  // View Mode Grid vs List
  console.log('  Testing View Mode toggle...');
  const listBtn = await page.$('button[title*="List" i], button:has(svg.lucide-list)');
  if (listBtn) {
    await listBtn.click();
    await sleep(1000);
    await takeSnap('03-catalog-list-view', 'Προβολή καταλόγου σε List View');
  }
  const gridBtn = await page.$('button[title*="Grid" i], button:has(svg.lucide-grid), button:has(svg.lucide-layout-grid)');
  if (gridBtn) {
    await gridBtn.click();
    await sleep(1000);
  }

  // --- SECTION 2: NEW PRODUCT MODAL & TABS ---
  console.log('\n--- 2. BACK OFFICE: NEW PRODUCT FORM MODAL ---');
  const newProductBtn = await page.$('button:has-text("Νέα Καταχώρηση")');
  if (newProductBtn) {
    await newProductBtn.click();
    await sleep(1500);
    await takeSnap('04-modal-new-product', 'Modal Νέας Καταχώρησης Προϊόντος');

    // Inspect tabs inside product modal
    const formTabButtons = await page.$$('div[role="dialog"] button, .fixed button');
    for (const btn of formTabButtons) {
      const text = (await btn.innerText()).trim();
      if (['Βασικά', 'Τιμή', 'Φωτογραφίες', 'Βίντεο', 'SEO', 'AI', 'Tags', 'Media'].some(t => text.includes(t))) {
        await btn.click();
        await sleep(600);
      }
    }
    await takeSnap('05-modal-product-tabs', 'Περιήγηση στα tabs της φόρμας προϊόντος');

    // Close modal safely without saving
    const closeBtn = await page.$('button:has-text("Ακύρωση"), button[aria-label="Close"], button:has(svg.lucide-x)');
    if (closeBtn) {
      await closeBtn.click();
      await sleep(1000);
    }
  }

  // --- SECTION 3: VINTED SYNC MODAL ---
  console.log('\n--- 3. BACK OFFICE: VINTED IMPORT MODAL ---');
  const vintedBtn = await page.$('button:has-text("Import Vinted")');
  if (vintedBtn) {
    await vintedBtn.click();
    await sleep(1500);
    await takeSnap('06-modal-vinted-import', 'Modal συγχρονισμού / εισαγωγής Vinted');
    const closeVinted = await page.$('button:has-text("Κλείσιμο"), button:has-text("Ακύρωση"), button:has(svg.lucide-x)');
    if (closeVinted) {
      await closeVinted.click();
      await sleep(800);
    }
  }

  // --- SECTION 4: VERSION HISTORY MODAL ---
  console.log('\n--- 4. BACK OFFICE: VERSION HISTORY MODAL ---');
  const historyBtn = await page.$('button:has-text("Ιστορικό")');
  if (historyBtn) {
    await historyBtn.click();
    await sleep(1500);
    await takeSnap('07-modal-version-history', 'Modal Ιστορικού Εκδόσεων & Επαναφοράς');
    const closeHist = await page.$('button:has-text("Κλείσιμο"), button:has(svg.lucide-x)');
    if (closeHist) {
      await closeHist.click();
      await sleep(800);
    }
  }

  // --- SECTION 5: ORDERS PANEL ---
  console.log('\n--- 5. BACK OFFICE: ORDERS MANAGEMENT ---');
  const ordersTab = await page.$('button:has-text("Παραγγελίες")');
  if (ordersTab) {
    await ordersTab.click();
    await sleep(2000);
    await takeSnap('08-orders-management', 'Πίνακας Διαχείρισης Παραγγελιών');
  }

  // --- SECTION 6: PORTFOLIO BACKOFFICE ---
  console.log('\n--- 6. BACK OFFICE: PORTFOLIO MANAGEMENT ---');
  const portfolioTab = await page.$('button:has-text("Portfolio")');
  if (portfolioTab) {
    await portfolioTab.click();
    await sleep(2000);
    await takeSnap('09-portfolio-backoffice', 'Πίνακας Διαχείρισης Portfolio & Έργων');
  }

  // Return to Shop Backoffice
  const shopTab = await page.$('button:has-text("Shop")');
  if (shopTab) {
    await shopTab.click();
    await sleep(1500);
  }

  // --- SECTION 7: SETTINGS & DESIGN CUSTOMIZER ---
  console.log('\n--- 7. BACK OFFICE: DESIGN & SETTINGS MODAL ---');
  const settingsBtn = await page.$('button:has(svg.lucide-settings), button:has-text("Ρυθμίσεις")');
  if (settingsBtn) {
    await settingsBtn.click();
    await sleep(2000);
    await takeSnap('10-settings-design-panel', 'Ρυθμίσεις Συστήματος & Customizer Design');

    // Inspect sub-settings tabs
    const subSettings = ['design', 'shop', 'portfolio', 'fields', 'assistant'];
    for (const sub of subSettings) {
      const subBtn = await page.$(`button:has-text("${sub}"), [data-tab="${sub}"]`);
      if (subBtn) {
        await subBtn.click();
        await sleep(800);
      }
    }
    const closeSettings = await page.$('button:has-text("Κλείσιμο"), button:has(svg.lucide-x)');
    if (closeSettings) {
      await closeSettings.click();
      await sleep(1000);
    }
  }

  // --- SECTION 8: FRONTEND SHOP LIVE INTERACTION ---
  console.log('\n--- 8. FRONTEND PUBLIC SHOP INSPECTION ---');
  await page.goto('https://aramcreationsofficial.netlify.app/#shop', { waitUntil: 'domcontentloaded' });
  await sleep(3000);

  await takeSnap('11-frontend-shop-hero', 'Hero Section Καταστήματος με Video & Scroll Cue');

  // Test Product Card Quick View / Modal
  console.log('  Testing Product Card click...');
  const firstProductCard = await page.$('article, div[data-product-id], .group:has(h3), div:has(button:has-text("Καλάθι"))');
  if (firstProductCard) {
    await firstProductCard.scrollIntoViewIfNeeded();
    await sleep(800);
    await firstProductCard.click();
    await sleep(1500);
    await takeSnap('12-frontend-product-modal', 'Modal Λεπτομερειών Προϊόντος / Quick View');
    const closeProdModal = await page.$('button[aria-label="Close"], button:has(svg.lucide-x)');
    if (closeProdModal) {
      await closeProdModal.click();
      await sleep(800);
    }
  }

  // --- SECTION 9: FRONTEND PORTFOLIO LIVE INTERACTION ---
  console.log('\n--- 9. FRONTEND PUBLIC PORTFOLIO INSPECTION ---');
  await page.goto('https://aramcreationsofficial.netlify.app/#portfolio', { waitUntil: 'domcontentloaded' });
  await sleep(3000);
  await takeSnap('13-frontend-portfolio-hero', 'Hero Section Portfolio & Parity Check');

  // --- SECTION 10: MOBILE RESPONSIVENESS CHECK ---
  console.log('\n--- 10. MOBILE RESPONSIVENESS (iPhone 375x812) ---');
  await page.setViewportSize({ width: 375, height: 812 });
  await sleep(1500);
  await takeSnap('14-mobile-portfolio', 'Mobile Portfolio View');

  await page.goto('https://aramcreationsofficial.netlify.app/#shop', { waitUntil: 'domcontentloaded' });
  await sleep(2000);
  await takeSnap('15-mobile-shop-hero', 'Mobile Shop Hero & Navigation');

  await page.goto('https://aramcreationsofficial.netlify.app/#admin', { waitUntil: 'domcontentloaded' });
  await sleep(2500);
  await takeSnap('16-mobile-admin-dashboard', 'Mobile Back Office Dashboard & Controls');

  auditReport.completedAt = new Date().toISOString();

  const reportFile = path.join(OUTPUT_DIR, 'deep-audit-report.json');
  fs.writeFileSync(reportFile, JSON.stringify(auditReport, null, 2), 'utf-8');

  await browser.close();

  console.log('\n================================================================');
  console.log('✅ ΟΛΟΚΛΗΡΩΘΗΚΕ Η ΒΑΘΙΑ ΑΥΤΟΝΟΜΗ ΕΠΙΘΕΩΡΗΣΗ');
  console.log(`📊 Αναφορά: ${reportFile}`);
  console.log(`🖼️ Screenshots: ${SCREENSHOTS_DIR}`);
  console.log('================================================================\n');
}

runDeepAudit().catch(err => {
  console.error('❌ Fatal error in deep audit:', err);
  process.exit(1);
});

