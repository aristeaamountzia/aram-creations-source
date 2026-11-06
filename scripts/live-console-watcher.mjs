import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import readline from 'node:readline';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const APP_DIR = path.resolve(__dirname, '..');
const ROOT_DIR = path.resolve(APP_DIR, '..');

// Output directories (both project root and app folder for immediate visibility)
const APP_OUTPUT_DIR = path.resolve(APP_DIR, 'audit-results');
const ROOT_OUTPUT_DIR = path.resolve(ROOT_DIR, 'audit-results');

for (const dir of [APP_OUTPUT_DIR, ROOT_OUTPUT_DIR]) {
  try {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  } catch (err) {
    console.warn(`[Init] Warning creating output directory ${dir}:`, err.message);
  }
}

const LOG_FILES = Array.from(new Set([
  path.join(APP_OUTPUT_DIR, 'user-session-console.log'),
  path.join(ROOT_OUTPUT_DIR, 'user-session-console.log')
]));

const JSON_FILES = Array.from(new Set([
  path.join(APP_OUTPUT_DIR, 'user-session-console.json'),
  path.join(ROOT_OUTPUT_DIR, 'user-session-console.json')
]));

const AUTH_DIR = path.resolve(APP_DIR, '.auth');
const AUTH_STATE_FILE = path.join(AUTH_DIR, 'admin-state.json');

try {
  if (!fs.existsSync(AUTH_DIR)) fs.mkdirSync(AUTH_DIR, { recursive: true });
} catch {}

const MAX_STORED_EVENTS = 1000;

const sessionData = {
  startedAt: new Date().toISOString(),
  targetUrl: '',
  browserType: 'unknown',
  errors: [],
  warnings: [],
  corsBlocks: [],
  networkFailures: [],
  httpErrors: [],
  totalCounts: {
    errors: 0,
    warnings: 0,
    corsBlocks: 0,
    networkFailures: 0,
    httpErrors: 0
  }
};

function pushEvent(category, entry) {
  if (sessionData.totalCounts && sessionData.totalCounts[category] !== undefined) {
    sessionData.totalCounts[category]++;
  }
  sessionData[category].push(entry);
  if (sessionData[category].length > MAX_STORED_EVENTS) {
    sessionData[category].shift();
  }
}

const fallbackPaths = new Map();
function getResolvedFilePath(originalPath) {
  return fallbackPaths.get(originalPath) || originalPath;
}

function sleepSync(ms) {
  try {
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
  } catch {
    const end = Date.now() + ms;
    while (Date.now() < end) {}
  }
}

function safeWrite(filePath, content, append = false) {
  const targetPath = getResolvedFilePath(filePath);
  
  // Up to 3 attempts with brief pause to tolerate transient locks (antivirus, indexer)
  let attempts = 0;
  while (attempts < 3) {
    try {
      if (append) {
        fs.appendFileSync(targetPath, content, 'utf-8');
      } else {
        fs.writeFileSync(targetPath, content, 'utf-8');
      }
      return;
    } catch (err) {
      attempts++;
      if (attempts < 3) {
        sleepSync(30);
      }
    }
  }

  // If retries fail, latch onto a persistent timestamped fallback
  try {
    if (!fallbackPaths.has(filePath)) {
      fallbackPaths.set(filePath, filePath.replace(/(\.[a-z0-9]+)$/i, `-${Date.now()}$1`));
    }
    const altPath = fallbackPaths.get(filePath);
    if (append) {
      fs.appendFileSync(altPath, content, 'utf-8');
    } else {
      fs.writeFileSync(altPath, content, 'utf-8');
    }
  } catch {}
}

let jsonSaveTimeout = null;
let lastJsonSave = 0;
const JSON_SAVE_THROTTLE_MS = 1000;

function flushSessionJson() {
  if (jsonSaveTimeout) {
    clearTimeout(jsonSaveTimeout);
    jsonSaveTimeout = null;
  }
  sessionData.lastUpdatedAt = new Date().toISOString();
  const jsonContent = JSON.stringify(sessionData, null, 2);
  for (const jsonFile of JSON_FILES) {
    safeWrite(jsonFile, jsonContent, false);
  }
  lastJsonSave = Date.now();
}

function saveSessionJson() {
  const now = Date.now();
  if (now - lastJsonSave > JSON_SAVE_THROTTLE_MS) {
    flushSessionJson();
  } else if (!jsonSaveTimeout) {
    jsonSaveTimeout = setTimeout(() => {
      flushSessionJson();
    }, JSON_SAVE_THROTTLE_MS);
  }
}

function initLogs() {
  const initHeader = `========================================================================\n` +
    `📡 ARAM CREATIONS — ΖΩΝΤΑΝΗ ΚΑΤΑΓΡΑΦΗ ΣΥΝΕΔΡΙΑΣ ΧΡΗΣΤΗ\n` +
    `📅 Έναρξη: ${new Date().toLocaleString('el-GR')}\n` +
    `🌐 Στόχος: ${sessionData.targetUrl || 'https://aramcreationsofficial.netlify.app#admin'}\n` +
    `========================================================================\n\n`;

  for (const logFile of LOG_FILES) {
    safeWrite(logFile, initHeader, false);
  }
  flushSessionJson();
}

function appendLog(line) {
  console.log(line);
  for (const logFile of LOG_FILES) {
    safeWrite(logFile, line + '\n', true);
  }
  saveSessionJson();
}

// Check if a message or error is CORS-related
function isCorsIssue(text) {
  if (!text) return false;
  const lower = String(text).toLowerCase();
  return (
    lower.includes('cors') ||
    lower.includes('access-control-allow-origin') ||
    lower.includes('access-control-allow-headers') ||
    lower.includes('access-control-allow-methods') ||
    lower.includes('access-control-expose-headers') ||
    lower.includes('blocked by cors policy') ||
    lower.includes('cross-origin') ||
    lower.includes('preflight') ||
    lower.includes('blocked_by_orb') ||
    lower.includes('same origin policy') ||
    lower.includes('disallows reading the remote resource')
  );
}

async function saveAuthState(ctx, browserInstance) {
  try {
    if (ctx && browserInstance && browserInstance.isConnected()) {
      if (!fs.existsSync(AUTH_DIR)) {
        fs.mkdirSync(AUTH_DIR, { recursive: true });
      }
      await ctx.storageState({ path: AUTH_STATE_FILE });
    }
  } catch {}
}

// Attach listeners to a page (handles multiple tabs / popups)
function setupPageMonitoring(page, pageIndex = 1, targetUrl = '') {
  const pageLabel = pageIndex === 1 ? '' : ` [Tab ${pageIndex}]`;

  page.on('load', () => {
    saveAuthState(page.context(), page.context().browser());
  });

  page.on('console', msg => {
    const time = new Date().toLocaleTimeString('el-GR');
    const type = msg.type();
    const text = msg.text();
    const loc = msg.location();
    const locStr = loc && loc.url ? ` (${path.basename(loc.url)}:${loc.lineNumber})` : '';

    if (isCorsIssue(text)) {
      const entry = { time, text, location: loc, type: 'cors' };
      pushEvent('corsBlocks', entry);
      appendLog(`[${time}] 🚫 [CORS BLOCKED]${pageLabel} ${text}${locStr}`);
    } else if (type === 'error') {
      const entry = { time, text, location: loc };
      pushEvent('errors', entry);
      appendLog(`[${time}] 🔴 [CONSOLE ERROR]${pageLabel} ${text}${locStr}`);
    } else if (type === 'warning') {
      if (text.includes('Download the React DevTools')) {
        return;
      }
      const entry = { time, text, location: loc };
      pushEvent('warnings', entry);
      appendLog(`[${time}] 🟡 [CONSOLE WARN]${pageLabel}  ${text}${locStr}`);
    }
  });

  page.on('pageerror', err => {
    const time = new Date().toLocaleTimeString('el-GR');
    const entry = { time, message: err.message, stack: err.stack };
    pushEvent('errors', entry);
    appendLog(`[${time}] 🔥 [PAGE CRASH / EXCEPTION]${pageLabel} ${err.message}`);
  });

  page.on('requestfailed', req => {
    const time = new Date().toLocaleTimeString('el-GR');
    const failure = req.failure();
    const errText = failure ? failure.errorText : 'Unknown failure';
    const url = req.url();
    const method = req.method();

    let isCors = isCorsIssue(errText);
    if (!isCors && errText === 'net::ERR_FAILED') {
      try {
        const rawPageUrl = page.url();
        const activeUrl = (rawPageUrl && rawPageUrl !== 'about:blank') ? rawPageUrl : targetUrl;
        const pageOrigin = new URL(activeUrl).origin;
        const reqOrigin = new URL(url).origin;
        if (pageOrigin !== 'null' && reqOrigin !== 'null' && pageOrigin !== reqOrigin) {
          isCors = true;
        }
      } catch {}
    }

    if (isCors) {
      const entry = { time, url, method, error: errText, type: 'cors' };
      pushEvent('corsBlocks', entry);
      appendLog(`[${time}] 🚫 [CORS / NET BLOCKED]${pageLabel} [${method}] ${url} ➔ ${errText}`);
    } else {
      const entry = { time, url, method, error: errText };
      pushEvent('networkFailures', entry);
      appendLog(`[${time}] ❌ [NETWORK FAILED]${pageLabel} [${method}] ${url} ➔ ${errText}`);
    }
  });

  page.on('response', res => {
    const status = res.status();
    if (status >= 400) {
      const time = new Date().toLocaleTimeString('el-GR');
      const entry = { time, url: res.url(), status, statusText: res.statusText() };
      pushEvent('httpErrors', entry);
      appendLog(`[${time}] ⚠️ [HTTP ${status}]${pageLabel} ${res.url()} (${res.statusText()})`);
    }
  });
}

// Fallback: Launch OS default browser if Playwright fails
function launchSystemBrowser(url) {
  console.log('[System Fallback] Άνοιγμα προεπιλεγμένου browser...');
  try {
    let proc;
    if (process.platform === 'win32') {
      proc = spawn('rundll32.exe', ['url.dll,FileProtocolHandler', url], { detached: true, stdio: 'ignore' });
    } else if (process.platform === 'darwin') {
      proc = spawn('open', [url], { detached: true, stdio: 'ignore' });
    } else {
      proc = spawn('xdg-open', [url], { detached: true, stdio: 'ignore' });
    }
    proc.unref();
  } catch (err) {
    console.error('[System Fallback] Σφάλμα εκκίνησης προεπιλεγμένου browser:', err.message);
  }
}

function resolveTargetUrl(args = []) {
  for (const rawArg of args) {
    if (!rawArg) continue;
    const arg = String(rawArg).trim().replace(/^["']|["']$/g, '');
    if (!arg || arg.startsWith('-')) continue;
    if (arg.startsWith('http://') || arg.startsWith('https://')) return arg;
    if (arg.startsWith('localhost') || arg.startsWith('127.0.0.1')) return `http://${arg}`;
    if (arg.includes('.netlify.app') || arg.includes('.com') || arg.includes('.gr') || arg.includes('.org') || arg.includes(':')) {
      return `https://${arg}`;
    }
  }
  return 'https://aramcreationsofficial.netlify.app#admin';
}

async function launchBrowserWithFallback() {
  const commonArgs = [
    '--start-maximized',
    '--disable-blink-features=AutomationControlled',
    '--no-default-browser-check',
    '--no-first-run',
    '--disable-search-engine-choice-screen'
  ];

  const localApp = process.env.LOCALAPPDATA || '';
  const progFiles = process.env['ProgramFiles'] || 'C:\\Program Files';
  const progFilesX86 = process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)';

  const launchCandidates = [
    { name: 'Google Chrome', channel: 'chrome' },
    { name: 'Microsoft Edge', channel: 'msedge' }
  ];

  const operaCandidate = [
    localApp && path.join(localApp, 'Programs', 'Opera', 'opera.exe'),
    localApp && path.join(localApp, 'Programs', 'Opera GX', 'opera.exe'),
    path.join(progFiles, 'Opera', 'opera.exe'),
    path.join(progFiles, 'Opera GX', 'opera.exe'),
    path.join(progFilesX86, 'Opera', 'opera.exe'),
    path.join(progFilesX86, 'Opera GX', 'opera.exe')
  ].find(p => p && fs.existsSync(p));
  if (operaCandidate) {
    launchCandidates.push({ name: 'Opera', executablePath: operaCandidate });
  }

  const braveCandidate = [
    path.join(progFiles, 'BraveSoftware', 'Brave-Browser', 'Application', 'brave.exe'),
    path.join(progFilesX86, 'BraveSoftware', 'Brave-Browser', 'Application', 'brave.exe'),
    localApp && path.join(localApp, 'BraveSoftware', 'Brave-Browser', 'Application', 'brave.exe')
  ].find(p => p && fs.existsSync(p));
  if (braveCandidate) {
    launchCandidates.push({ name: 'Brave', executablePath: braveCandidate });
  }

  const vivaldiCandidate = [
    localApp && path.join(localApp, 'Vivaldi', 'Application', 'vivaldi.exe'),
    path.join(progFiles, 'Vivaldi', 'Application', 'vivaldi.exe')
  ].find(p => p && fs.existsSync(p));
  if (vivaldiCandidate) {
    launchCandidates.push({ name: 'Vivaldi', executablePath: vivaldiCandidate });
  }

  launchCandidates.push({ name: 'Playwright Bundled Chromium', channel: undefined });

  let browser = null;
  let usedBrowser = 'unknown';

  for (const candidate of launchCandidates) {
    try {
      console.log(`[Browser Launch] Δοκιμή εκκίνησης: ${candidate.name}...`);
      const opts = {
        headless: false,
        args: commonArgs
      };
      if (candidate.executablePath) {
        opts.executablePath = candidate.executablePath;
      } else if (candidate.channel) {
        opts.channel = candidate.channel;
      }

      browser = await chromium.launch(opts);
      usedBrowser = candidate.name;
      console.log(`✅ Επιτυχής εκκίνηση με: ${candidate.name}`);
      break;
    } catch (err) {
      console.warn(`⚠️ Δεν ήταν δυνατή η εκκίνηση με ${candidate.name}: ${err.message}`);
    }
  }

  return { browser, usedBrowser };
}

async function main() {
  const targetUrl = resolveTargetUrl(process.argv.slice(2));
  sessionData.targetUrl = targetUrl;

  initLogs();

  console.log('========================================================================');
  console.log('👀 ARAM CREATIONS — LIVE CONSOLE WATCHER & ERROR RECORDER');
  console.log(`🌐 Στόχος: ${targetUrl}`);
  console.log('========================================================================');
  console.log('👉 Ο περιηγητής ανοίγει τώρα στην οθόνη σου!');
  console.log('👉 Περιηγήσου ελεύθερα, πάτα όποια κουμπιά θες στο Back Office.');
  console.log('👉 Καταγράφονται ζωντανά: Console Errors, Warnings, CORS & Failed Requests.');
  console.log('👉 Παρακολούθησε τα σφάλματα σε αυτό το παράθυρο σε πραγματικό χρόνο.');
  console.log('👉 Όταν ολοκληρώσεις: κλείσε τον browser ή πάτα "q" + Enter εδώ!\n');

  const contextOptions = {
    viewport: null, // Full natural window
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
  };

  if (fs.existsSync(AUTH_STATE_FILE)) {
    try {
      contextOptions.storageState = AUTH_STATE_FILE;
      console.log('[Auth] Φόρτωση αποθηκευμένου session state διαχειριστή...');
    } catch (err) {
      console.warn('[Auth] Προειδοποίηση ανάγνωσης auth state:', err.message);
    }
  }

  const { browser, usedBrowser } = await launchBrowserWithFallback();
  sessionData.browserType = usedBrowser;

  if (!browser) {
    throw new Error('Όλες οι μέθοδοι εκκίνησης περιηγητή (Chrome, Edge, Opera, Chromium) απέτυχαν.');
  }

  let context;
  try {
    context = await browser.newContext(contextOptions);
  } catch (err) {
    console.warn('[Auth] Αποτυχία εφαρμογής storageState, δημιουργία καθαρού context:', err.message);
    context = await browser.newContext({ viewport: null });
  }

  let tabCounter = 1;
  const initialPage = await context.newPage();
  setupPageMonitoring(initialPage, tabCounter, targetUrl);

  // Monitor any newly opened tabs/popups automatically
  context.on('page', newPage => {
    tabCounter++;
    setupPageMonitoring(newPage, tabCounter, targetUrl);
  });

  // Navigate to Target URL
  try {
    console.log(`[Navigation] Μετάβαση στο: ${targetUrl}`);
    await initialPage.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 35000 });
    console.log('✅ Η σελίδα φορτώθηκε επιτυχώς! Μπορείς να ξεκινήσεις τις δοκιμές.');
    await saveAuthState(context, browser);
    saveSessionJson();
  } catch (e) {
    appendLog(`[Navigation Warning] ${e.message}`);
  }

  // Periodic auth state persistence while browser is active
  const authInterval = setInterval(() => {
    saveAuthState(context, browser);
  }, 4000);

  let rl = null;

  // Handle termination and reporting
  let isCleaningUp = false;
  async function cleanupAndExit() {
    if (isCleaningUp) return;
    isCleaningUp = true;
    if (authInterval) clearInterval(authInterval);
    if (rl) rl.close();

    console.log('\n[Watcher] Αποθήκευση καταγραφής και κατάστασης συνεδρίας...');

    // Attempt to persist updated auth state if logged in
    await saveAuthState(context, browser);

    sessionData.endedAt = new Date().toISOString();
    flushSessionJson();

    const totalErr = sessionData.totalCounts ? sessionData.totalCounts.errors : sessionData.errors.length;
    const totalWarn = sessionData.totalCounts ? sessionData.totalCounts.warnings : sessionData.warnings.length;
    const totalCors = sessionData.totalCounts ? sessionData.totalCounts.corsBlocks : sessionData.corsBlocks.length;
    const totalNet = sessionData.totalCounts ? sessionData.totalCounts.networkFailures : sessionData.networkFailures.length;
    const totalHttp = sessionData.totalCounts ? sessionData.totalCounts.httpErrors : sessionData.httpErrors.length;

    console.log('\n========================================================================');
    console.log('🏁 Η ΚΑΤΑΓΡΑΦΗ ΤΗΣ ΣΥΝΕΔΡΙΑΣ ΣΟΥ ΟΛΟΚΛΗΡΩΘΗΚΕ');
    console.log(`🌐 Περιηγητής:               ${sessionData.browserType}`);
    console.log(`📊 Σύνολο Console Errors:     ${totalErr}`);
    console.log(`📊 Σύνολο Console Warnings:   ${totalWarn}`);
    console.log(`🚫 Σύνολο CORS Blocks:        ${totalCors}`);
    console.log(`❌ Σύνολο Network Failures:   ${totalNet}`);
    console.log(`⚠️ Σύνολο HTTP Errors (4xx/5xx): ${totalHttp}`);
    console.log(`📁 Αρχείο Log:                ${getResolvedFilePath(LOG_FILES[0])}`);
    console.log(`📁 Αρχείο JSON:               ${getResolvedFilePath(JSON_FILES[0])}`);
    console.log('========================================================================\n');

    try {
      if (browser && browser.isConnected()) {
        await browser.close();
      }
    } catch {}
    process.exit(0);
  }

  process.on('SIGINT', cleanupAndExit);
  process.on('SIGTERM', cleanupAndExit);

  // Setup readline for graceful quit from console by typing 'q' or 'exit' or Enter
  if (process.stdin.isTTY || process.env.ENABLE_STDIN_QUIT !== 'false') {
    rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    rl.on('line', line => {
      const cmd = line.trim().toLowerCase();
      if (cmd === 'q' || cmd === 'exit' || cmd === 'quit') {
        cleanupAndExit();
      }
    });
  }

  // Keep alive until either:
  // 1. User closes the browser window (browser disconnects)
  // 2. All pages in the context are closed
  await new Promise(resolve => {
    let checkInterval = null;
    let resolved = false;

    const finish = () => {
      if (resolved) return;
      resolved = true;
      if (checkInterval) clearInterval(checkInterval);
      resolve();
    };

    browser.on('disconnected', () => {
      console.log('\n[Watcher] Ο περιηγητής έκλεισε.');
      finish();
    });

    // Check periodically if all pages were closed
    checkInterval = setInterval(async () => {
      try {
        if (!browser.isConnected() || context.pages().length === 0) {
          finish();
        }
      } catch {
        finish();
      }
    }, 1000);
  });

  await cleanupAndExit();
}

main().catch(async err => {
  console.error('\n❌ Απροσδόκητο σφάλμα στο live console watcher:', err.message);
  appendLog(`[Fatal Error] ${err.message}\n${err.stack || ''}`);
  flushSessionJson();

  // If not invoked from START_CONSOLE_WATCHER.bat (which already routes to OPEN_ADMIN_BROWSER.bat),
  // open fallback browser directly so the user is never left stranded.
  if (!process.env.LAUNCHED_FROM_BAT) {
    try {
      launchSystemBrowser(resolveTargetUrl(process.argv.slice(2)));
    } catch {}
  }

  process.exit(1);
});
