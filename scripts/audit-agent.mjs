import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const OUTPUT_DIR = path.resolve(ROOT_DIR, 'audit-results');
const SCREENSHOTS_DIR = path.resolve(OUTPUT_DIR, 'screenshots');

if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

export async function runLiveAudit({
  targetUrl = 'https://aramcreationsofficial1.netlify.app',
  headless = true,
  deviceProfiles = [
    { name: 'Desktop-1440x900', width: 1440, height: 900, isMobile: false },
    { name: 'Mobile-iPhone-375x812', width: 375, height: 812, isMobile: true }
  ]
} = {}) {
  const report = {
    targetUrl,
    timestamp: new Date().toISOString(),
    consoleLogs: [],
    networkErrors: [],
    routesAudited: [],
    screenshots: []
  };

  console.log(`[Audit] Launching Chrome (headless: ${headless})...`);
  const browser = await chromium.launch({
    channel: 'chrome',
    headless: headless
  });

  try {
    for (const profile of deviceProfiles) {
      console.log(`\n--- Auditing Profile: ${profile.name} ---`);
      const context = await browser.newContext({
        viewport: { width: profile.width, height: profile.height },
        isMobile: profile.isMobile,
        hasTouch: profile.isMobile,
        userAgent: profile.isMobile
          ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
          : 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      });

      const page = await context.newPage();

      // Listen to console and network
      page.on('console', msg => {
        const entry = { type: msg.type(), text: msg.text(), location: msg.location() };
        if (msg.type() === 'error' || msg.type() === 'warn') {
          report.consoleLogs.push({ profile: profile.name, ...entry });
          console.log(`  [Browser ${msg.type().toUpperCase()}] ${msg.text()}`);
        }
      });

      page.on('pageerror', err => {
        report.consoleLogs.push({ profile: profile.name, type: 'uncaught-error', text: err.message, stack: err.stack });
        console.error(`  [Browser Uncaught] ${err.message}`);
      });

      page.on('requestfailed', req => {
        report.networkErrors.push({
          profile: profile.name,
          url: req.url(),
          failure: req.failure()?.errorText || 'Failed'
        });
        console.error(`  [Network Fail] ${req.url()} - ${req.failure()?.errorText}`);
      });

      // 1. Visit Target (Shop by default)
      console.log(`  Navigating to ${targetUrl}...`);
      await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(3000); // Allow initial React hydration & video render

      // Take initial screenshot
      const initialShotPath = path.join(SCREENSHOTS_DIR, `${profile.name}-01-initial-home.png`);
      await page.screenshot({ path: initialShotPath, fullPage: true });
      report.screenshots.push({ name: `${profile.name}-01-initial-home`, path: initialShotPath });
      console.log(`  Captured: ${initialShotPath}`);

      // 2. Test Navigation to Portfolio
      console.log('  Testing navigation to #portfolio...');
      await page.evaluate(() => { window.location.hash = '#portfolio'; });
      await page.waitForTimeout(2000);
      const portfolioShotPath = path.join(SCREENSHOTS_DIR, `${profile.name}-02-portfolio.png`);
      await page.screenshot({ path: portfolioShotPath, fullPage: true });
      report.screenshots.push({ name: `${profile.name}-02-portfolio`, path: portfolioShotPath });
      console.log(`  Captured: ${portfolioShotPath}`);

      // 3. Test Navigation back to Shop
      console.log('  Testing navigation back to #shop...');
      await page.evaluate(() => { window.location.hash = '#shop'; });
      await page.waitForTimeout(1500);

      // 4. Test Scroll and Product Cards Interaction
      console.log('  Testing scroll down...');
      await page.evaluate(() => window.scrollBy({ top: 900, behavior: 'smooth' }));
      await page.waitForTimeout(2000);
      const scrollShotPath = path.join(SCREENSHOTS_DIR, `${profile.name}-03-scrolled.png`);
      await page.screenshot({ path: scrollShotPath });
      report.screenshots.push({ name: `${profile.name}-03-scrolled`, path: scrollShotPath });
      console.log(`  Captured: ${scrollShotPath}`);

      // 5. Test Admin / Backoffice URL
      console.log('  Testing navigation to #admin...');
      await page.evaluate(() => { window.location.hash = '#admin'; });
      await page.waitForTimeout(2000);
      const adminShotPath = path.join(SCREENSHOTS_DIR, `${profile.name}-04-admin-login.png`);
      await page.screenshot({ path: adminShotPath, fullPage: true });
      report.screenshots.push({ name: `${profile.name}-04-admin-login`, path: adminShotPath });
      console.log(`  Captured: ${adminShotPath}`);

      await context.close();
    }
  } finally {
    await browser.close();
  }

  const reportPath = path.join(OUTPUT_DIR, 'audit-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf-8');
  console.log(`\n[Audit] Done. Report saved to: ${reportPath}`);
  return report;
}

// Run if called directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const isHeadless = !process.argv.includes('--headful');
  const target = process.argv.find(arg => arg.startsWith('http')) || 'https://aramcreationsofficial1.netlify.app';
  runLiveAudit({ targetUrl: target, headless: isHeadless })
    .catch(err => {
      console.error('[Audit Fatal Error]', err);
      process.exit(1);
    });
}
