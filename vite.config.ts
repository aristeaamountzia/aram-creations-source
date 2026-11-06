import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { defineConfig, type Plugin } from 'vite';
import { initialContent, searchPages, SITE_URL } from './src/lib/search-content';

function searchLandingPages(): Plugin {
  return {
    name: 'search-landing-pages',
    enforce: 'post',
    transformIndexHtml(html) {
      return html.replace('<div id="root"></div>', `<div id="root">${initialContent()}</div>`);
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

export default defineConfig(() => {
  return {
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
