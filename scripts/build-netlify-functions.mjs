import { copyFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const source = join(root, "netlify", "functions");
const output = join(root, ".netlify", "functions-dist");

await mkdir(output, { recursive: true });
await copyFile(join(source, "api.ts"), join(output, "api.ts"));
await build({
  entryPoints: [join(source, "backoffice-ai.ts")],
  outfile: join(output, "backoffice-ai.mjs"),
  bundle: true,
  platform: "node",
  format: "esm",
  packages: "bundle",
  target: "node20",
  banner: {
    js: 'import { createRequire } from "node:module"; const require = createRequire(import.meta.url);',
  },
});

await build({
  entryPoints: [join(source, "orders.ts")], outfile: join(output, "orders.mjs"),
  bundle: true, platform: "node", format: "esm", packages: "bundle", target: "node20",
  banner: { js: 'import { createRequire } from "node:module"; const require = createRequire(import.meta.url);' },
});

console.log("Netlify Functions prepared in .netlify/functions-dist");
await build({
  entryPoints: [join(source, 'media.ts')], outfile: join(output, 'media.mjs'), bundle: true,
  platform: 'node', format: 'esm', packages: 'bundle', target: 'node20',
  banner: { js: 'import { createRequire } from "node:module"; const require = createRequire(import.meta.url);' },
});

for (const name of ['catalog-backups', 'catalog-backup-schedule', 'order-email-retry', 'order-email-test', 'wix-project']) {
  await build({ entryPoints: [join(source, `${name}.ts`)], outfile: join(output, `${name}.mjs`), bundle: true, platform: 'node', format: 'esm', packages: 'bundle', target: 'node20', banner: { js: 'import { createRequire } from "node:module"; const require = createRequire(import.meta.url);' } });
}
