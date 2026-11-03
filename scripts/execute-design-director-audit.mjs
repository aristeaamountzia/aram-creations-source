import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const DIST_DIR = path.resolve(ROOT_DIR, 'dist');
const OUTPUT_DIR = path.resolve(ROOT_DIR, 'audit-results');
const SCREENSHOTS_DIR = path.resolve(OUTPUT_DIR, 'screenshots', 'director');

if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

// Simple static file server with SPA fallback
function startServer(port = 4173) {
  const mimeTypes = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.woff2': 'font/woff2'
  };

  const server = http.createServer((req, res) => {
    let safeUrl = req.url.split('?')[0];
    let filePath = path.join(DIST_DIR, safeUrl === '/' ? 'index.html' : safeUrl);

    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      filePath = path.join(DIST_DIR, 'index.html');
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = mimeTypes[ext] || 'application/octet-stream';

    fs.readFile(filePath, (err, content) => {
      if (err) {
        res.writeHead(500);
        res.end(`Server Error: ${err.code}`);
      } else {
        res.writeHead(200, {
          'Content-Type': contentType,
          'Cache-Control': 'no-cache',
          'Access-Control-Allow-Origin': '*'
        });
        res.end(content);
      }
    });
  });

  return new Promise((resolve) => {
    server.listen(port, '127.0.0.1', () => {
      console.log(`[Local Server] Running on http://127.0.0.1:${port}`);
      resolve(server);
    });
  });
}

async function runVisualAudit() {
  const port = 4173;
  const server = await startServer(port);
  const baseUrl = `http://127.0.0.1:${port}`;

  console.log('================================================================');
  console.log('🎨 DESIGN DIRECTOR VISUAL & CODE AUDIT EXECUTION');
  console.log('================================================================\n');

  const auditResults = {
    timestamp: new Date().toISOString(),
    evaluations: {},
    ruleChecks: {},
    screenshots: []
  };

  const browser = await chromium.launch({
    channel: 'chrome',
    headless: true
  });

  try {
    const viewports = [
      { name: 'Desktop-1440', width: 1440, height: 900, isMobile: false },
      { name: 'Mobile-375', width: 375, height: 812, isMobile: true }
    ];

    for (const vp of viewports) {
      console.log(`\n--- Evaluating Viewport: ${vp.name} (${vp.width}x${vp.height}) ---`);
      const context = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
        isMobile: vp.isMobile,
        hasTouch: vp.isMobile
      });

      const page = await context.newPage();

      // 1. Visit #shop
      console.log('  [Shop] Loading #shop...');
      await page.goto(`${baseUrl}/#shop`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2500);

      // Inspect Hero in Shop
      const shopHeroMetrics = await page.evaluate(() => {
        const hero = document.querySelector('section, [class*="hero"], [data-testid="hero"]');
        const video = document.querySelector('video');
        const scrollIndicator = document.querySelector('[class*="scroll"], [class*="bounce"], [aria-label*="scroll" i], [aria-label*="κύλιση" i], svg[class*="chevron-down"]');
        return {
          heroFound: !!hero,
          heroRect: hero ? { width: hero.clientWidth, height: hero.clientHeight } : null,
          hasVideo: !!video,
          videoAspect: video ? `${video.clientWidth}x${video.clientHeight}` : null,
          hasScrollIndicator: !!scrollIndicator || !!document.querySelector('.animate-bounce')
        };
      });

      const shopShot = path.join(SCREENSHOTS_DIR, `${vp.name}-shop-hero.png`);
      await page.screenshot({ path: shopShot, fullPage: false });
      auditResults.screenshots.push({ viewport: vp.name, view: 'shop', file: shopShot });
      console.log(`  📸 Shop Screenshot captured: ${shopShot}`);

      // Scan for emojis in Shop rendered text
      const emojiScanShop = await page.evaluate(() => {
        const emojiRegex = /[\u{1F300}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
        const textNodes = [];
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        let node;
        while (node = walker.nextNode()) {
          const val = node.nodeValue?.trim();
          if (val && emojiRegex.test(val)) {
            textNodes.push(val);
          }
        }
        return textNodes;
      });

      // Check referrerPolicy on images
      const shopImgReferrers = await page.evaluate(() => {
        const imgs = Array.from(document.querySelectorAll('img'));
        const missing = imgs.filter(img => img.getAttribute('referrerpolicy') !== 'no-referrer');
        return {
          total: imgs.length,
          compliantCount: imgs.length - missing.length,
          nonCompliantSources: missing.map(i => i.src)
        };
      });

      // 2. Visit #portfolio via Header Navigation
      console.log('  [Portfolio] Clicking #nav-btn-portfolio...');
      await page.click('#nav-btn-portfolio');
      await page.waitForTimeout(3500);

      const portfolioHeroMetrics = await page.evaluate(() => {
        const hero = document.querySelector('.portfolio-hero') || document.querySelector('section');
        const video = hero ? hero.querySelector('video') : document.querySelector('video');
        const scrollIndicator = hero ? hero.querySelector('.animate-bounce') : document.querySelector('.animate-bounce');
        return {
          heroFound: !!hero,
          heroRect: hero ? { width: hero.clientWidth, height: hero.clientHeight } : null,
          hasVideo: !!video,
          videoAspect: video ? `${video.clientWidth}x${video.clientHeight}` : null,
          hasScrollIndicator: !!scrollIndicator
        };
      });

      const portfolioShot = path.join(SCREENSHOTS_DIR, `${vp.name}-portfolio-hero.png`);
      await page.screenshot({ path: portfolioShot, fullPage: false });
      auditResults.screenshots.push({ viewport: vp.name, view: 'portfolio', file: portfolioShot });
      console.log(`  📸 Portfolio Screenshot captured: ${portfolioShot}`);

      // 3. Visit #admin
      console.log('  [Admin] Triggering admin mode...');
      await page.evaluate(() => {
        window.location.hash = '#admin';
      });
      await page.waitForTimeout(2500);

      const adminElements = await page.evaluate(() => {
        const hasPasswordInput = !!document.querySelector('input[type="password"]');
        const hasEmailInput = !!document.querySelector('input[type="email"], input[name="email"]');
        const buttons = Array.from(document.querySelectorAll('button')).map(b => b.innerText.trim());
        return { hasPasswordInput, hasEmailInput, buttons };
      });

      const adminShot = path.join(SCREENSHOTS_DIR, `${vp.name}-admin-login.png`);
      await page.screenshot({ path: adminShot, fullPage: false });
      auditResults.screenshots.push({ viewport: vp.name, view: 'admin', file: adminShot });
      console.log(`  📸 Admin Screenshot captured: ${adminShot}`);

      auditResults.evaluations[vp.name] = {
        shopHero: shopHeroMetrics,
        portfolioHero: portfolioHeroMetrics,
        rawEmojisFound: emojiScanShop,
        imageReferrerCompliance: shopImgReferrers,
        adminState: adminElements
      };

      await context.close();
    }

    // Comparison analysis
    const dShop = auditResults.evaluations['Desktop-1440'].shopHero;
    const dPort = auditResults.evaluations['Desktop-1440'].portfolioHero;
    const parityPass = (dShop.hasVideo === dPort.hasVideo) && (dShop.hasScrollIndicator === dPort.hasScrollIndicator);

    auditResults.ruleChecks = {
      'Rule 3 (Shop & Portfolio Parity)': {
        pass: parityPass,
        shopHero: dShop,
        portfolioHero: dPort
      },
      'Rule 4 (Scroll Affordance)': {
        pass: dShop.hasScrollIndicator && dPort.hasScrollIndicator,
        details: 'Checked presence of animated bounce/scroll cue on Hero'
      },
      'Rule 8 (Image Resiliency & ReferrerPolicy)': {
        pass: auditResults.evaluations['Desktop-1440'].imageReferrerCompliance.nonCompliantSources.length === 0,
        details: auditResults.evaluations['Desktop-1440'].imageReferrerCompliance
      },
      'Rule 9 (Zero-Emoji Luxury UI)': {
        pass: auditResults.evaluations['Desktop-1440'].rawEmojisFound.length === 0,
        detectedEmojis: auditResults.evaluations['Desktop-1440'].rawEmojisFound
      }
    };

    console.log('\n================================================================');
    console.log('📊 AUDIT SUMMARY REPORT:');
    console.log(JSON.stringify(auditResults.ruleChecks, null, 2));
    console.log('================================================================');

    const reportFile = path.join(OUTPUT_DIR, 'director-audit-results.json');
    fs.writeFileSync(reportFile, JSON.stringify(auditResults, null, 2), 'utf8');
    console.log(`Report written to ${reportFile}`);

  } finally {
    await browser.close();
    server.close();
    console.log('[Local Server] Stopped.');
  }
}

runVisualAudit().catch(err => {
  console.error('[Audit Execution Error]', err);
  process.exit(1);
});
