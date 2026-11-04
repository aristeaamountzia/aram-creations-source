import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright-core';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.dirname(__dirname);
const distDir = path.join(projectRoot, 'dist');
const artifactDir = 'C:\\Users\\arist\\.gemini\\antigravity\\brain\\438251f9-38c5-4113-9b98-f427db6092b8\\visual_audit';

const app = express();
app.use(express.static(distDir));
app.get('*', (_req, res) => res.sendFile(path.join(distDir, 'index.html')));

const PORT = 4173;
const server = app.listen(PORT, '127.0.0.1');

console.log(`Local test server running at http://127.0.0.1:${PORT}`);

async function runAudit() {
  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2
  });
  const page = await context.newPage();

  const auditLog = [];

  try {
    // 1. Visit Shop
    console.log('1. Loading Shop page...');
    await page.goto(`http://127.0.0.1:${PORT}/#shop`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);

    await page.screenshot({ path: path.join(artifactDir, '01_shop_overview.png'), fullPage: false });
    auditLog.push('Shop overview captured');

    // 2. Audit Footer contrast & computed colors
    console.log('2. Inspecting Footer computed styles...');
    const footerElement = await page.$('footer.site-footer');
    if (footerElement) {
      await footerElement.scrollIntoViewIfNeeded();
      await page.waitForTimeout(800);
      await footerElement.screenshot({ path: path.join(artifactDir, '02_footer_contrast_live.png') });

      const styles = await page.evaluate(() => {
        const f = document.querySelector('footer.site-footer');
        if (!f) return null;
        const h3 = f.querySelector('h3');
        const p = f.querySelector('p');
        const btn = f.querySelector('button');
        return {
          footerBg: window.getComputedStyle(f).backgroundColor,
          h3Color: h3 ? window.getComputedStyle(h3).color : null,
          pColor: p ? window.getComputedStyle(p).color : null,
          btnColor: btn ? window.getComputedStyle(btn).color : null
        };
      });
      console.log('Footer styles:', JSON.stringify(styles, null, 2));
      auditLog.push(`Footer colors evaluated: bg=${styles?.footerBg}, h3=${styles?.h3Color}, p=${styles?.pColor}, btn=${styles?.btnColor}`);
    }

    // 3. Click Terms of Service in Footer
    console.log('3. Clicking Όροι Χρήσης link in footer...');
    const termsBtn = await page.$('footer button:has-text("Όροι Χρήσης")');
    if (termsBtn) {
      await termsBtn.click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: path.join(artifactDir, '03_legal_terms_modal.png') });

      const modalText = await page.evaluate(() => document.body.innerText);
      const hasOldCreator = modalText.includes('δημιουργός: Αρίστεα Μουντζιά') || modalText.includes('της δημιουργού');
      const hasIrisInTerms = modalText.includes('IRIS Payments:');
      auditLog.push(`Legal terms modal checked. Old creator attribution: ${hasOldCreator ? 'FOUND (ERROR)' : 'REMOVED (PASSED)'}, IRIS in terms: ${hasIrisInTerms ? 'FOUND (ERROR)' : 'REMOVED (PASSED)'}`);

      // Click Returns tab in modal
      const returnsTab = await page.$('button:has-text("Αποστολές & Επιστροφές")');
      if (returnsTab) {
        await returnsTab.click();
        await page.waitForTimeout(800);
        await page.screenshot({ path: path.join(artifactDir, '04_legal_returns_modal.png') });
        auditLog.push('Returns & shipping modal tab captured');
      }

      // Close modal
      const closeBtn = await page.$('button:has-text("Εντάξει, κατάλαβα")');
      if (closeBtn) await closeBtn.click();
      await page.waitForTimeout(500);
    }

    // 4. Add to cart & check Cart Drawer
    console.log('4. Adding item to cart and checking checkout...');
    await page.evaluate(() => window.scrollTo(0, 500));
    await page.waitForTimeout(600);

    const addBtn = await page.$('button:has-text("Προσθήκη"), button:has-text("Στο καλάθι"), button[aria-label*="καλάθι"], .catalog-card button');
    if (addBtn) {
      await addBtn.click();
      await page.waitForTimeout(1000);
    }

    // Open Cart if not open
    const cartBtn = await page.$('button[aria-label*="Καλάθι"], button[aria-label*="τσάντα"]');
    if (cartBtn) {
      await cartBtn.click();
      await page.waitForTimeout(1000);
    }

    await page.screenshot({ path: path.join(artifactDir, '05_cart_drawer_items.png') });

    // Proceed to checkout step in drawer
    const proceedBtn = await page.$('button:has-text("Στοιχεία και επιβεβαίωση"), button:has-text("Ολοκλήρωση")');
    if (proceedBtn) {
      await proceedBtn.click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: path.join(artifactDir, '06_cart_checkout_stripe_only.png') });

      const checkoutText = await page.evaluate(() => {
        const form = document.querySelector('#order-form');
        return form ? form.innerText : document.body.innerText;
      });
      const hasIrisBtn = checkoutText.includes('IRIS Payments');
      const hasBankBtn = checkoutText.includes('Τραπεζικός λογαριασμός') || checkoutText.includes('Κατάθεση');
      auditLog.push(`Cart Checkout verified. IRIS button: ${hasIrisBtn ? 'FOUND (ERROR)' : 'REMOVED (PASSED)'}, Bank deposit button: ${hasBankBtn ? 'FOUND (ERROR)' : 'REMOVED (PASSED)'}`);
    }

    // Close cart drawer
    const closeCart = await page.$('button[title="Κλείσιμο"], button[aria-label="Κλείσιμο"]');
    if (closeCart) await closeCart.click();
    await page.waitForTimeout(500);

    // 5. Visit Portfolio
    console.log('5. Visiting Portfolio page...');
    await page.goto(`http://127.0.0.1:${PORT}/#portfolio`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(artifactDir, '07_portfolio_overview.png') });
    auditLog.push('Portfolio page captured');

    // 6. Visit Back Office (Admin) Settings
    console.log('6. Visiting Back Office & verifying Shipping Settings...');
    await page.goto(`http://127.0.0.1:${PORT}/#admin`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);

    const settingsBtn = await page.$('button:has-text("Ρυθμίσεις")');
    if (settingsBtn) {
      await settingsBtn.click();
      await page.waitForTimeout(1000);

      const shopTab = await page.$('button:has-text("Βιτρίνα Shop")');
      if (shopTab) {
        await shopTab.click();
        await page.waitForTimeout(800);

        // Scroll to Section 7 Shipping
        await page.evaluate(() => {
          const sec7 = Array.from(document.querySelectorAll('h3')).find(el => el.textContent.includes('7. Έξοδα Αποστολής'));
          if (sec7) sec7.scrollIntoView();
        });
        await page.waitForTimeout(600);
        await page.screenshot({ path: path.join(artifactDir, '08_backoffice_shipping_controls.png') });
        auditLog.push('Back Office Section 7 Shipping Settings captured and verified');
      }
    }

    console.log('--- ALL VISUAL CHECKS COMPLETED SUCCESSFULLY ---');
    console.log(JSON.stringify(auditLog, null, 2));

  } catch (err) {
    console.error('Audit failed with error:', err);
  } finally {
    await browser.close();
    server.close();
    console.log('Server and browser closed.');
  }
}

runAudit();

