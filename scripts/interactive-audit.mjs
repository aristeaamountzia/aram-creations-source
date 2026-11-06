import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const OUTPUT_DIR = path.resolve(ROOT_DIR, 'audit-results');
const SCREENSHOTS_DIR = path.resolve(OUTPUT_DIR, 'screenshots');
const AUTH_DIR = path.resolve(ROOT_DIR, '.auth');
const AUTH_STATE_FILE = path.join(AUTH_DIR, 'admin-state.json');

for (const dir of [SCREENSHOTS_DIR, AUTH_DIR]) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

async function pause(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  const targetUrl = process.argv.find(arg => arg.startsWith('http')) || 'https://aramcreationsofficial.netlify.app';

  console.log('================================================================');
  console.log('🚀 ΕΚΚΙΝΗΣΗ ΖΩΝΤΑΝΟΥ BROWSER AUDITOR (HEADFUL INTERACTIVE MODE)');
  console.log(`🌐 Στόχος: ${targetUrl}#admin`);
  console.log('================================================================\n');

  const hasSavedAuth = fs.existsSync(AUTH_STATE_FILE);

  console.log('[Browser] Ανοίγει ο Google Chrome στην οθόνη σου...');
  const browser = await chromium.launch({
    channel: 'chrome',
    headless: false,
    slowMo: 600, // Human-readable pacing so user can follow every action
    args: ['--start-maximized', '--disable-blink-features=AutomationControlled']
  });

  const contextOptions = {
    viewport: null, // Full screen responsive
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  };

  if (hasSavedAuth) {
    try {
      contextOptions.storageState = AUTH_STATE_FILE;
      console.log('[Auth] Βρέθηκε αποθηκευμένο session εισόδου!');
    } catch (e) {
      console.warn('[Auth] Αποτυχία φόρτωσης παλαιού session:', e.message);
    }
  }

  const context = await browser.newContext(contextOptions);
  const page = await context.newPage();

  const auditLog = {
    startedAt: new Date().toISOString(),
    findings: [],
    consoleErrors: [],
    networkFailures: [],
    screenshots: []
  };

  page.on('console', msg => {
    if (msg.type() === 'error') {
      auditLog.consoleErrors.push({ text: msg.text(), location: msg.location() });
      console.log(`  🔴 [Console Error] ${msg.text()}`);
    }
  });

  page.on('requestfailed', req => {
    auditLog.networkFailures.push({ url: req.url(), error: req.failure()?.errorText });
  });

  console.log(`[Navigation] Μετάβαση στο ${targetUrl}#admin...`);
  await page.goto(`${targetUrl}#admin`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await pause(2000);

  // Check if we need login
  const isLoginForm = await page.$('input[type="password"]');
  if (isLoginForm) {
    console.log('\n================================================================');
    console.log('👉 ΠΑΡΑΚΑΛΩ ΣΥΝΔΕΣΟΥ ΣΤΟ BACK OFFICE ΣΤΟ ΠΑΡΑΘΥΡΟ ΠΟΥ ΑΝΟΙΞΕ!');
    console.log('Πληκτρολόγησε email/password και πάτησε "Σύνδεση".');
    console.log('Ο αυτόνομος agent παρακολουθεί και θα ξεκινήσει μόλις συνδεθείς.');
    console.log('================================================================\n');

    // Wait up to 3 minutes for user to login
    await page.waitForSelector('input[type="password"]', { state: 'detached', timeout: 180000 });
    console.log('✅ Επιτυχής σύνδεση! Αποθήκευση session...');
    await pause(2500);

    // Save storage state for future runs
    await context.storageState({ path: AUTH_STATE_FILE });
    console.log(`💾 Το session αποθηκεύτηκε στο: ${AUTH_STATE_FILE}`);
  } else {
    console.log('✅ Το session είναι ήδη ενεργό! Προχωράμε στην επιθεώρηση...');
  }

  // Allow backoffice components to fully mount
  await pause(3000);

  console.log('\n------------------------------------------------------------');
  console.log('🔍 [ΒΗΜΑ 1/7] ΕΠΙΘΕΩΡΗΣΗ ΚΑΤΑΛΟΓΟΥ ΠΡΟΪΟΝΤΩΝ (JEWELRY CATALOG)');
  console.log('------------------------------------------------------------');

  const shot1 = path.join(SCREENSHOTS_DIR, 'backoffice-01-catalog-overview.png');
  await page.screenshot({ path: shot1, fullPage: true });
  auditLog.screenshots.push({ step: 'Catalog Overview', file: shot1 });
  console.log(`  📸 Screenshot: ${shot1}`);

  // Test Grid vs List view toggle
  console.log('  Testing Grid / List toggle buttons...');
  const viewToggleButtons = await page.$$('button:has(svg)');
  if (viewToggleButtons.length > 0) {
    await viewToggleButtons[0].hover();
    await pause(800);
  }

  // Test Search Box
  console.log('  Testing Search input interaction...');
  const searchInput = await page.$('input[placeholder*="Αναζήτηση"], input[placeholder*="search" i], input[type="search"]');
  if (searchInput) {
    await searchInput.click();
    await searchInput.fill('Δαχτυλίδι');
    await pause(1500);
    const shotSearch = path.join(SCREENSHOTS_DIR, 'backoffice-02-search-filter.png');
    await page.screenshot({ path: shotSearch });
    auditLog.screenshots.push({ step: 'Search Filter', file: shotSearch });
    await searchInput.fill('');
    await pause(1000);
  }

  // Test Scroll in catalog
  console.log('  Testing smooth catalog scrolling...');
  await page.evaluate(() => window.scrollBy({ top: 600, behavior: 'smooth' }));
  await pause(1500);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
  await pause(1000);

  console.log('\n------------------------------------------------------------');
  console.log('🔍 [ΒΗΜΑ 2/7] ΕΠΙΘΕΩΡΗΣΗ PORTFOLIO MANAGER');
  console.log('------------------------------------------------------------');
  const portfolioTabBtn = await page.$('button:has-text("Portfolio"), button:has-text("Έργα"), [data-collection="portfolio"]');
  if (portfolioTabBtn) {
    console.log('  Κλικ στο Portfolio tab...');
    await portfolioTabBtn.click();
    await pause(2500);
    const shotPortfolio = path.join(SCREENSHOTS_DIR, 'backoffice-03-portfolio-collection.png');
    await page.screenshot({ path: shotPortfolio, fullPage: true });
    auditLog.screenshots.push({ step: 'Portfolio Collection', file: shotPortfolio });
    console.log(`  📸 Screenshot: ${shotPortfolio}`);
  } else {
    console.log('  (Portfolio tab button lookup through text query)');
  }

  console.log('\n------------------------------------------------------------');
  console.log('🔍 [ΒΗΜΑ 3/7] ΕΠΙΘΕΩΡΗΣΗ ORDERS PANEL (ΠΑΡΑΓΓΕΛΙΕΣ)');
  console.log('------------------------------------------------------------');
  const ordersTabBtn = await page.$('button:has-text("Παραγγελίες"), button:has-text("Orders"), [data-collection="orders"]');
  if (ordersTabBtn) {
    console.log('  Κλικ στο Παραγγελίες tab...');
    await ordersTabBtn.click();
    await pause(2500);
    const shotOrders = path.join(SCREENSHOTS_DIR, 'backoffice-04-orders-panel.png');
    await page.screenshot({ path: shotOrders, fullPage: true });
    auditLog.screenshots.push({ step: 'Orders Panel', file: shotOrders });
    console.log(`  📸 Screenshot: ${shotOrders}`);
  }

  console.log('\n------------------------------------------------------------');
  console.log('🔍 [ΒΗΜΑ 4/7] ΕΠΙΘΕΩΡΗΣΗ ΕΡΓΑΛΕΙΩΝ ΜΑΖΙΚΗΣ ΕΠΕΞΕΡΓΑΣΙΑΣ (BULK TOOLS)');
  console.log('------------------------------------------------------------');
  const bulkToolsBtn = await page.$('button:has-text("Μαζική"), button:has-text("Bulk"), button:has-text("Εργαλεία")');
  if (bulkToolsBtn) {
    console.log('  Άνοιγμα Bulk Operations modal...');
    await bulkToolsBtn.click();
    await pause(2000);
    const shotBulk = path.join(SCREENSHOTS_DIR, 'backoffice-05-bulk-tools-modal.png');
    await page.screenshot({ path: shotBulk });
    auditLog.screenshots.push({ step: 'Bulk Tools Modal', file: shotBulk });
    console.log(`  📸 Screenshot: ${shotBulk}`);

    // Inspect sub-tabs in Bulk modal
    const bulkSubTabs = ['search_replace', 'pricing', 'tags', 'fields'];
    for (const sub of bulkSubTabs) {
      const subBtn = await page.$(`button:has-text("${sub}"), [data-tab="${sub}"]`);
      if (subBtn) {
        await subBtn.click();
        await pause(1000);
      }
    }

    // Close modal safely
    const closeBtn = await page.$('button:has-text("Κλείσιμο"), button:has-text("Ακύρωση"), button[aria-label="Close"], button:has(svg.lucide-x)');
    if (closeBtn) {
      await closeBtn.click();
      await pause(1000);
    }
  }

  console.log('\n------------------------------------------------------------');
  console.log('🔍 [ΒΗΜΑ 5/7] ΕΠΙΘΕΩΡΗΣΗ ΡΥΘΜΙΣΕΩΝ DESIGN & HERO SECTION');
  console.log('------------------------------------------------------------');
  const settingsBtn = await page.$('button:has-text("Ρυθμίσεις"), button:has-text("Settings"), button:has-text("Design")');
  if (settingsBtn) {
    console.log('  Άνοιγμα Ρυθμίσεων...');
    await settingsBtn.click();
    await pause(2000);
    const shotSettings = path.join(SCREENSHOTS_DIR, 'backoffice-06-settings-panel.png');
    await page.screenshot({ path: shotSettings, fullPage: true });
    auditLog.screenshots.push({ step: 'Settings Panel', file: shotSettings });
    console.log(`  📸 Screenshot: ${shotSettings}`);
  }

  console.log('\n------------------------------------------------------------');
  console.log('🔍 [ΒΗΜΑ 6/7] ΕΠΙΘΕΩΡΗΣΗ ΙΣΤΟΡΙΚΟΥ ΕΚΔΟΣΕΩΝ (VERSION HISTORY)');
  console.log('------------------------------------------------------------');
  const historyBtn = await page.$('button:has-text("Ιστορικό"), button:has-text("History"), button:has-text("Επαναφορά")');
  if (historyBtn) {
    console.log('  Άνοιγμα Ιστορικού...');
    await historyBtn.click();
    await pause(1800);
    const shotHistory = path.join(SCREENSHOTS_DIR, 'backoffice-07-version-history.png');
    await page.screenshot({ path: shotHistory });
    auditLog.screenshots.push({ step: 'Version History', file: shotHistory });
    console.log(`  📸 Screenshot: ${shotHistory}`);

    const closeHistory = await page.$('button:has-text("Κλείσιμο"), button[aria-label="Close"]');
    if (closeHistory) await closeHistory.click();
    await pause(1000);
  }

  console.log('\n------------------------------------------------------------');
  console.log('🔍 [ΒΗΜΑ 7/7] ΕΠΙΣΤΡΟΦΗ ΣΤΟ SHOP & FRONTEND LIVE VERIFICATION');
  console.log('------------------------------------------------------------');
  console.log('  Μετάβαση στο #shop...');
  await page.evaluate(() => { window.location.hash = '#shop'; });
  await pause(2500);

  // Scroll smoothly down the shop page
  console.log('  Smooth scrolling στο δημόσιο κατάστημα...');
  for (let s = 0; s < 4; s++) {
    await page.evaluate(() => window.scrollBy({ top: 500, behavior: 'smooth' }));
    await pause(1200);
  }
  const shotShopFinal = path.join(SCREENSHOTS_DIR, 'frontend-01-shop-full-scroll.png');
  await page.screenshot({ path: shotShopFinal });
  auditLog.screenshots.push({ step: 'Shop Full Scroll', file: shotShopFinal });
  console.log(`  📸 Screenshot: ${shotShopFinal}`);

  auditLog.completedAt = new Date().toISOString();
  const summaryFile = path.join(OUTPUT_DIR, 'live-interactive-audit-summary.json');
  fs.writeFileSync(summaryFile, JSON.stringify(auditLog, null, 2), 'utf-8');

  console.log('\n================================================================');
  console.log('🎉 Η ΖΩΝΤΑΝΗ ΕΠΙΘΕΩΡΗΣΗ ΟΛΟΚΛΗΡΩΘΗΚΕ ΜΕ ΕΠΙΤΥΧΙΑ!');
  console.log(`📁 Όλα τα screenshots και logs αποθηκεύτηκαν στο: ${OUTPUT_DIR}`);
  console.log('================================================================\n');

  // Keep browser open for a few seconds so user can enjoy the final state
  await pause(5000);
  await browser.close();
}

main().catch(err => {
  console.error('❌ Fatal error in interactive audit:', err);
  process.exit(1);
});

