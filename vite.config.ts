import { designStudioCss, normalizeVisualTheme, visualThemes } from './src/lib/design-studio';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { defineConfig, type Plugin } from 'vite';
import { initialContent, searchPage, searchStructuredData, SITE_URL } from './src/lib/search-content';
import { localeFromPath, publicPath, sectionFromPath, type PublicLocale, type PublicSection } from './src/lib/public-locale';
import { getBuildHeroSnapshot, fetchHeroSnapshot, setBuildHeroSnapshot } from './src/lib/hero-media';

const translatedPaths = [['portfolio', 'el'], ['shop', 'en'], ['portfolio', 'en']] as const;
const pathsWithoutSlashes = new Set<string>(translatedPaths.map(([section, locale]) => publicPath(locale, section).slice(0, -1)));

function searchMetadata(html: string, section: PublicSection, locale: PublicLocale) {
  const page = searchPage(section, locale);
  const alternateLinks = (['el', 'en', 'x-default'] as const).map(language =>
    `<link rel="alternate" hreflang="${language}" href="${SITE_URL}${publicPath(language === 'en' ? 'en' : 'el', section)}" />`).join('');
  return html
    .replace(/(<html lang=")[^"]+/, `$1${locale}`)
    .replace(/(<meta property="og:locale" content=")[^"]+/, `$1${locale === 'en' ? 'en_GB' : 'el_GR'}`)
    .replace(/<title>.*?<\/title>/, `<title>${page.title}</title>`)
    .replace(/(<meta (?:name="description"|property="og:description"|name="twitter:description") content=")[^"]*/g, `$1${page.description}`)
    .replace(/(<meta (?:property="og:title"|name="twitter:title") content=")[^"]*/g, `$1${page.title}`)
    .replace(/(<link rel="canonical" href=")[^"]*/, `$1${SITE_URL}${page.path}`)
    .replace(/(<meta property="og:url" content=")[^"]*/, `$1${SITE_URL}${page.path}`)
    .replace(/(<meta (?:property="og:image"|name="twitter:image") content=")[^"]*/g, `$1${SITE_URL}${page.image}`)
    .replace(/(<meta (?:property="og:image:alt"|name="twitter:image:alt") content=")[^"]*/g, `$1${page.imageAlt}`)
    .replace(/(<script id="aram-schema-jsonld" type="application\/ld\+json">)[\s\S]*?(<\/script>)/, (_, start, end) =>
      start + JSON.stringify(searchStructuredData(page, locale)) + end)
    .replace(/<link rel="alternate" hreflang="[^"]+" href="[^"]+"\s*\/>/g, '')
    .replace('</head>', alternateLinks + '</head>');
}

function searchLandingPages(): Plugin {
  return {
    name: 'search-landing-pages',
    enforce: 'post',
    configurePreviewServer(server) {
      // Netlify serves directory indexes for these URLs. Match that behavior in local previews.
      server.middlewares.use((request, response, next) => {
        const url = new URL(request.url || '/', 'http://localhost');
        if (!pathsWithoutSlashes.has(url.pathname)) return next();
        response.writeHead(308, { Location: url.pathname + '/' + url.search }).end();
      });
    },
    transformIndexHtml(html, context) {
      const path = context?.originalUrl?.split('?')[0] || '/';
      const locale = localeFromPath(path);
      const section = sectionFromPath(path);
      const baked = getBuildHeroSnapshot();
      const css = designStudioCss(baked.designStudio);
      // Apply the saved family before the HTML shell is painted, including returning visitors.
      const boot = `<style>:root{${Object.entries(css).map(([key, value]) => `${key}:${value}`).join(';').replace(/</g, '')}}</style><script>try{const t=JSON.parse(localStorage.getItem('aram_theme_cache')||'null');if(t&&${JSON.stringify(visualThemes)}.includes(t.visualTheme))document.documentElement.dataset.visualTheme=t.visualTheme;if(t&&t.designStudio)for(const [k,v] of Object.entries(t.designStudio)){if(typeof v==='string')document.documentElement.style.setProperty('--ds-'+k.replace(/[A-Z]/g,c=>'-'+c.toLowerCase()),v)}}catch{}</script>`;
      return searchMetadata(html, section, locale)
        .replace(`<html lang="${locale}">`, `<html lang="${locale}" data-visual-theme="${normalizeVisualTheme(baked.visualTheme)}">`)
        .replace('</head>', boot + '</head>')
        .replace('<div id="root"></div>', `<div id="root">${initialContent(section === 'portfolio', locale)}</div>`);
    },
    generateBundle(_, bundle) {
      const index = bundle['index.html'];
      if (!index || index.type !== 'asset') return;
      for (const [section, locale] of translatedPaths) {
        const html = searchMetadata(String(index.source), section, locale)
          .replace(initialContent(), initialContent(section === 'portfolio', locale));
        this.emitFile({ type: 'asset', fileName: publicPath(locale, section).slice(1) + 'index.html', source: html });
      }
    },
  };
}

export default defineConfig(async ({ command }) => {
  // Snapshot of the current hero settings, baked into the HTML shell and bundle so
  // first-time visitors see the real hero immediately (live data still updates it).
  const heroSnapshot = await fetchHeroSnapshot(command === 'build' ? (process.env.VITE_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID) : undefined);
  setBuildHeroSnapshot(heroSnapshot);
  return {
    define: {
      __ARAM_HERO_SNAPSHOT__: JSON.stringify(heroSnapshot),
    },
    plugins: [react(), tailwindcss(), searchLandingPages()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    build: {
      chunkSizeWarningLimit: 600,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('firebase')) {
                return 'vendor-firebase';
              }
              if (id.includes('lucide-react')) {
                return 'vendor-icons';
              }
              if (id.includes('motion')) {
                return 'vendor-motion';
              }
            }
          },
        },
      },
    },
    server: {
      port: 3000,
      host: '0.0.0.0',
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
