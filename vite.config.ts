import { designStudioCss } from './src/lib/design-studio';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { defineConfig, type Plugin } from 'vite';
import { initialContent, searchPages, SITE_URL } from './src/lib/search-content';
import { getBuildHeroSnapshot, fetchHeroSnapshot, setBuildHeroSnapshot } from './src/lib/hero-media';

function searchLandingPages(): Plugin {
  return {
    name: 'search-landing-pages',
    enforce: 'post',
    transformIndexHtml(html) {
      const baked = getBuildHeroSnapshot();
      const css = designStudioCss(baked.designStudio);
      // Apply the saved family before the HTML shell is painted, including returning visitors.
      const boot = `<style>:root{${Object.entries(css).map(([key, value]) => `${key}:${value}`).join(';').replace(/</g, '')}}</style><script>try{const t=JSON.parse(localStorage.getItem('aram_theme_cache')||'null');if(t&&t.designStudio)for(const [k,v] of Object.entries(t.designStudio)){if(typeof v==='string')document.documentElement.style.setProperty('--ds-'+k.replace(/[A-Z]/g,c=>'-'+c.toLowerCase()),v)}}catch{}</script>`;
      return html.replace('</head>', boot + '</head>').replace('<div id="root"></div>', `<div id="root">${initialContent()}</div>`);
    },
    generateBundle(_, bundle) {
      const index = bundle['index.html'];
      if (!index || index.type !== 'asset') return;
      const page = searchPages.portfolio;
      const html = String(index.source)
        .replace(/<title>.*?<\/title>/, `<title>${page.title}</title>`)
        .replace(/(<meta (?:name="description"|property="og:description"|name="twitter:description") content=")[^"]*/g, `$1${page.description}`)
        .replace(/(<meta (?:property="og:title"|name="twitter:title") content=")[^"]*/g, `$1${page.title}`)
        .replace(/(<link rel="canonical" href=")[^"]*/, `$1${SITE_URL}${page.path}`)
        .replace(/(<meta property="og:url" content=")[^"]*/, `$1${SITE_URL}${page.path}`)
        .replace(initialContent(), initialContent(true));
      this.emitFile({ type: 'asset', fileName: 'portfolio/index.html', source: html });
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
