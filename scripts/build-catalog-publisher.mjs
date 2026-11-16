import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
await build({ entryPoints: [root + 'functions/catalog/index.ts'], outfile: root + 'functions/catalog/lib/index.js',
  bundle: true, platform: 'node', format: 'cjs', packages: 'external', target: 'node22' });
