import { copyFile, mkdir, readdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

// Same-origin, versioned assets: no third-party CDN or cross-origin isolation needed.
const root = resolve(import.meta.dirname, '..');
const assets = resolve(root, 'public/codecs');
async function copyPackage(packageName, subdirectory, target, filenames) {
  const source = resolve(root, 'node_modules', packageName, subdirectory);
  const destination = resolve(assets, target);
  await mkdir(destination, { recursive: true });
  for (const name of filenames || (await readdir(source)).filter(name => name.endsWith('.js'))) {
    await copyFile(resolve(source, name), resolve(destination, name));
  }
}
await copyPackage('@ffmpeg/ffmpeg', 'dist/esm', 'ffmpeg-0.12.15');
await copyPackage('@ffmpeg/core', 'dist/esm', 'core-0.12.10', ['ffmpeg-core.js', 'ffmpeg-core.wasm']);
await copyPackage('libheif-js', 'libheif-wasm', 'heif-1.23.5', ['libheif-bundle.mjs', 'LICENSE']);
await writeFile(resolve(assets, 'NOTICE.txt'), [
  'FFmpeg.wasm wrapper 0.12.15: MIT; https://github.com/ffmpegwasm/ffmpeg.wasm',
  'FFmpeg core 0.12.10: GPL-2.0-or-later, including libx264; source/build instructions:',
  'https://github.com/ffmpegwasm/ffmpeg.wasm/tree/v0.12.10',
  'libheif-js 1.23.5: LGPL-3.0; license included in heif-1.23.5/LICENSE;',
  'https://github.com/catdad-experiments/libheif-js/tree/v1.23.5',
].join('\n'));
console.log('Prepared self-hosted image/video codecs.');
